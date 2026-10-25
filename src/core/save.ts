// 저장·불러오기. 저장 형식이 바뀌면 version을 올리고 migrate()에 변환을 추가한다.

import { WORKPLACES } from '../data/village';
import { YOKAI_BY_ID } from '../data/yokai';
import { newGame } from './engine';
import type { GameState, WorkplaceId, YokaiState } from './types';

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
  // 명부에 없는 식객은 버리고, 일터에는 데리고 있는 식객만 한 번씩 남긴다(어긋난 저장으로 화면이 멈추지 않게).
  const owned = Object.entries(data.yokai).filter(([id]) => YOKAI_BY_ID[id]);
  const yokai = owned.length ? Object.fromEntries(owned.map(([id, y]) => [id, { ...FRESH, ...(y as Partial<YokaiState>) }])) : base.yokai;
  const placed = new Set<string>();
  const work = Object.fromEntries(
    WORKPLACES.map((w) => {
      const list = (data.work?.[w.id as WorkplaceId] ?? []).filter((id) => {
        if (!yokai[id] || placed.has(id)) return false;
        placed.add(id);
        return true;
      });
      return [w.id, list];
    }),
  ) as GameState['work'];
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : d);
  return {
    ...base,
    ...data,
    res: { coin: num(data.res.coin, base.res.coin), grain: num(data.res.grain, base.res.grain), fame: num(data.res.fame, base.res.fame) },
    stamina: { ...base.stamina, ...data.stamina },
    work,
    gifts: { ...data.gifts },
    yokai,
    wish: { ...base.wish, ...data.wish },
    stage: { ...base.stage, ...data.stage },
    combosSeen: data.combosSeen ?? [],
    guide: data.guide ?? 0,
    story: { done: data.story?.done ?? [], flags: data.story?.flags ?? [] },
    favorite: data.favorite && yokai[data.favorite] ? data.favorite : Object.keys(yokai)[0],
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
