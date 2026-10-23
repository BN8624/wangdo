// 게임 상태 저장소. 화면은 useGame()으로 {state, now}를 읽고, act()로 엔진 함수를 실행한다.
import { useSyncExternalStore } from 'react';
import { newGame, settle, MINUTE, RESOURCE_KEYS } from '../core/engine';
import { SAVE_KEY, deserialize, serialize } from '../core/save';
import type { GameState, ResourceKey } from '../core/types';

export interface Snapshot {
  state: GameState;
  now: number;
}

export interface OfflineSummary {
  minutes: number;
  gained: Record<ResourceKey, number>;
}

const listeners = new Set<() => void>();
let snapshot: Snapshot;
let offline: OfflineSummary | null = null;

function readSave(now: number): GameState | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    return text ? deserialize(text, now) : null;
  } catch {
    return null;
  }
}

function writeSave(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, serialize(s));
  } catch {
    // 사생활 보호 모드 등에서 저장이 막혀도 게임은 계속된다.
  }
}

function emit() {
  for (const l of listeners) l();
}

export function initStore() {
  const now = Date.now();
  const saved = readSave(now);
  const state = saved ?? newGame(now, Math.floor(Math.random() * 2 ** 31));
  if (saved && now - saved.lastSettled > 5 * MINUTE) {
    const after = settle(saved, now);
    const gained = { coin: 0, grain: 0, fame: 0 };
    for (const k of RESOURCE_KEYS) gained[k] = Math.floor(after.res[k] - saved.res[k]);
    offline = { minutes: (now - saved.lastSettled) / MINUTE, gained };
  }
  snapshot = { state, now };
  writeSave(state);

  setInterval(() => {
    snapshot = { ...snapshot, now: Date.now() };
    emit();
  }, 1000);
  document.addEventListener('visibilitychange', () => {
    snapshot = { ...snapshot, now: Date.now() };
    emit();
  });
}

export function takeOfflineSummary(): OfflineSummary | null {
  const o = offline;
  offline = null;
  return o;
}

export function useGame(): Snapshot {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
}

/** 엔진 함수를 지금 시각으로 실행하고, 상태가 바뀌면 저장한다. */
export function act<R>(fn: (s: GameState, now: number) => [GameState, R]): R {
  const now = Date.now();
  const [next, result] = fn(snapshot.state, now);
  if (next !== snapshot.state) {
    snapshot = { state: next, now };
    writeSave(next);
    emit();
  }
  return result;
}

export function replaceState(next: GameState) {
  snapshot = { state: next, now: Date.now() };
  writeSave(next);
  emit();
}

export function resetGame() {
  replaceState(newGame(Date.now(), Math.floor(Math.random() * 2 ** 31)));
}
