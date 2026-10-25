// 저장 지키기. 저장은 이 기기 브라우저에만 있어서, 아이폰 사파리처럼 오래 안 들어오면 지워질 수 있다.
// 브라우저에 오래 보관해 달라고 부탁하고, 며칠마다 백업을 권하고, 홈 화면 추가를 안내한다.
import { exportCode } from '../core/save';
import type { GameState } from '../core/types';

const BACKUP_KEY = 'wangdo.backupAt';
const SNOOZE_KEY = 'wangdo.backupSnooze';
const DAY = 86_400_000;
/** 마지막 백업이 이만큼 지나면 다시 권한다 */
const REMIND_DAYS = 3;

function readNum(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeNum(key: string, v: number) {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* 저장이 막혀 있으면 다음에 또 권할 뿐이다 */
  }
}

export const lastBackupAt = () => readNum(BACKUP_KEY);
export const markBackedUp = (now = Date.now()) => writeNum(BACKUP_KEY, now);
export const snoozeBackup = (now = Date.now()) => writeNum(SNOOZE_KEY, now + DAY);

/** 백업을 권할 때인지: 하루 넘게 했고, 백업한 지 며칠 지났고, 미뤄 둔 시간이 지났을 때 */
export function backupDue(s: GameState, now: number): boolean {
  if (now - s.createdAt < DAY) return false;
  if (now < readNum(SNOOZE_KEY)) return false;
  return now - lastBackupAt() > REMIND_DAYS * DAY;
}

/** 브라우저에 저장을 함부로 지우지 말아 달라고 부탁한다(지원하는 브라우저만, 조용히) */
export function askPersist() {
  navigator.storage?.persist?.().catch(() => undefined);
}

/** 홈 화면에서 앱처럼 연 상태인지 */
export function isStandalone(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function fileName(now: number) {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `wangdo-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.txt`;
}

/** 저장 코드를 파일로 내보낸다. 휴대폰은 공유 창(카톡·메모 등), 안 되면 내려받기 */
export async function saveToFile(s: GameState): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const now = Date.now();
  const file = new File([exportCode(s)], fileName(now), { type: 'text/plain' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: '왕도 저장 백업' });
      markBackedUp(now);
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  markBackedUp(now);
  return 'downloaded';
}

/** 안드로이드 크롬 등에서 '홈 화면에 추가' 창을 띄울 수 있게 이벤트를 붙잡아 둔다 */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let installEvent: InstallPrompt | null = null;
const installListeners = new Set<() => void>();

export function watchInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as InstallPrompt;
    installListeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    installListeners.forEach((l) => l());
  });
}

export const canInstall = () => !!installEvent;
export function onInstallChange(l: () => void) {
  installListeners.add(l);
  return () => {
    installListeners.delete(l);
  };
}

export async function promptInstall(): Promise<boolean> {
  if (!installEvent) return false;
  await installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  installListeners.forEach((l) => l());
  return outcome === 'accepted';
}
