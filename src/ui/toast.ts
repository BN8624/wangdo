// 화면 위로 잠깐 떠오르는 알림("+1,234 엽전" 같은 것).
import { useSyncExternalStore } from 'react';
import type { IconKind } from './icons';

export interface Toast {
  id: number;
  text: string;
  res?: IconKind;
  warn?: boolean;
}

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function pushToast(t: Omit<Toast, 'id'>) {
  const toast = { ...t, id: ++seq };
  toasts = [...toasts.slice(-3), toast];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== toast.id);
    emit();
  }, 1800);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
  );
}

/** 짧은 진동(지원하는 기기만) */
export function buzz(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // 무시
  }
}
