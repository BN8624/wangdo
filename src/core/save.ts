// 저장·불러오기. 저장 형식이 바뀌면 version을 올리고 옛 형식을 바꾸는 길을 둔다.
// v2(모험 지도·일터 시절) → v3(수집형): 식객·인연·장비는 그대로, 별은 등급만큼, 본 화는 그 장을 별 하나로 깬 것으로, 옥 3,000 선물.

import { YOKAI_BY_ID } from '../data/yokai';
import { STAGES, catchUpMeets } from './campaign';
import { newGame } from './engine';
import { levelCap, startStars } from './units';
import type { GameState, YokaiState } from './types';

export const SAVE_KEY = 'wangdo.save';
/** 옛 저장을 옮겨 올 때 주는 옥 */
export const MIGRATION_JADE = 3000;

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : d);

function cleanYokai(id: string, y: Partial<YokaiState> & { exp?: number }): YokaiState {
  const stars = Math.min(6, Math.max(startStars(id), num(y.stars, startStars(id))));
  return {
    level: Math.min(levelCap(stars), Math.max(1, Math.round(num(y.level, 1)))),
    stars,
    shards: num(y.shards, 0),
    bond: num(y.bond, 0),
    talkAt: num(y.talkAt, 0),
    outingAt: num(y.outingAt, 0),
    seen: num(y.seen, 0),
    talks: num(y.talks, 0),
    gear: { ...(y.gear ?? {}) },
  };
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
  const data = raw as Record<string, any>;
  if (data.version !== 2 && data.version !== 3) return null;
  if (typeof data.rank !== 'number' || !data.res || !data.yokai) return null;
  const old = data.version === 2;

  const base = newGame(now);
  const owned = Object.entries(data.yokai as Record<string, Partial<YokaiState>>).filter(([id]) => YOKAI_BY_ID[id]);
  const yokai = owned.length ? Object.fromEntries(owned.map(([id, y]) => [id, cleanYokai(id, y)])) : base.yokai;
  const done: string[] = Array.isArray(data.story?.done) ? data.story.done : [];
  const stars: Record<string, number> = { ...(data.camp?.stars ?? {}) };
  if (old) for (const st of STAGES) if (done.includes(st.ep.id)) stars[st.id] = Math.max(stars[st.id] ?? 0, 1);
  let team: string[] = Array.isArray(data.team) ? data.team.map((id: unknown) => (typeof id === 'string' && yokai[id] ? id : '')) : [];
  if (!team.some(Boolean)) team = Object.keys(yokai).slice(0, 5);
  while (team.length < 5) team.push('');
  const res = data.res ?? {};
  const state: GameState = {
    ...base,
    version: 3,
    createdAt: num(data.createdAt, base.createdAt),
    lastSettled: num(data.lastSettled, now),
    rank: old ? 0 : num(data.rank, 0),
    res: {
      coin: num(res.coin, base.res.coin),
      jade: num(res.jade, 0) + (old ? MIGRATION_JADE : 0),
      exp: num(res.exp, 0) + (old ? num(res.grain, 0) : 0),
      fame: num(res.fame, 0),
    },
    yokai,
    team: team.slice(0, 5),
    gifts: { ...(data.gifts ?? {}) },
    wish: { ...base.wish, ...(data.wish ?? {}) },
    rng: num(data.rng, base.rng) | 0,
    totals: { ...base.totals, ...(data.totals ?? {}) },
    introSeen: !!data.introSeen,
    guide: old ? 99 : num(data.guide, 0),
    story: { done, flags: Array.isArray(data.story?.flags) ? data.story.flags : [], watched: Array.isArray(data.story?.watched) ? data.story.watched : [] },
    camp: { stars },
    gacha: { ...base.gacha, ...(data.gacha ?? {}) },
    afk: { since: num(data.afk?.since, now) },
    inventory: Object.fromEntries(Object.entries(data.inventory ?? {}).filter(([, n]) => typeof n === 'number' && n > 0)) as Record<string, number>,
    favorite: data.favorite && yokai[data.favorite] ? data.favorite : Object.keys(yokai)[0],
  };
  catchUpMeets(state);
  return state;
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
