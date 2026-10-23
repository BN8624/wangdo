// 저장·불러오기. 저장 형식이 바뀌면 version을 올리고 migrate()에 변환을 추가한다.

import { newGame } from './engine';
import type { GameState, YokaiState } from './types';

const FRESH: YokaiState = { level: 1, bond: 0, talkAt: 0, outingAt: 0, seen: 0, talks: 0 };

export const SAVE_KEY = 'wangdo.save';

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

/** 문자열을 상태로 되돌린다. 알 수 없는 형식이면 null */
export function deserialize(text: string, now: number): GameState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<GameState>;
  if (data.version !== 2) return null;
  if (typeof data.rank !== 'number' || !data.res || !data.yokai) return null;

  // 나중에 필드가 늘어나도 예전 저장이 깨지지 않도록 기본값 위에 덮어쓴다.
  const base = newGame(now);
  return {
    ...base,
    ...data,
    res: { ...base.res, ...data.res },
    stamina: { ...base.stamina, ...data.stamina },
    work: { ...base.work, ...data.work },
    gifts: { ...data.gifts },
    yokai: Object.fromEntries(
      Object.entries(data.yokai).map(([id, y]) => [id, { ...FRESH, ...(y as Partial<YokaiState>) }]),
    ),
    wish: { ...base.wish, ...data.wish },
    stage: { ...base.stage, ...data.stage },
    combosSeen: data.combosSeen ?? [],
    guide: data.guide ?? 0,
    story: { done: data.story?.done ?? [], flags: data.story?.flags ?? [] },
    totals: { ...base.totals, ...data.totals },
  } as GameState;
}

/** 공유·백업용 텍스트 코드(base64) */
export function exportCode(s: GameState): string {
  const bytes = new TextEncoder().encode(serialize(s));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importCode(code: string, now: number): GameState | null {
  try {
    const bin = atob(code.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return deserialize(new TextDecoder().decode(bytes), now);
  } catch {
    return null;
  }
}
