// 모집(뽑기). 옥으로 한 번 또는 열 번. 현금 결제는 없다.
// 확률: SSR 4% · SR 20% · R 76%. 60번째 안에 SSR이 없으면 60번째는 SSR. 열 번 모집은 SR 이상 하나 확정, 첫 열 번은 SSR 하나 확정.
import { BALANCE as B } from '../data/balance';
import { YOKAI } from '../data/yokai';
import { nextRandom } from './rng';
import type { GameState } from './types';
import { startStars } from './units';

export interface PullResult {
  id: string;
  rarity: 1 | 2 | 3;
  isNew: boolean;
  /** 중복이면 받은 조각 */
  shards: number;
}

export type PullOutcome = { ok: true; results: PullResult[] } | { ok: false; reason: 'no-jade' };

export const pullCost = (count: number) => count * B.pullCost;

const POOL: Record<1 | 2 | 3, string[]> = {
  1: YOKAI.filter((y) => y.grade === 1).map((y) => y.id),
  2: YOKAI.filter((y) => y.grade === 2).map((y) => y.id),
  3: YOKAI.filter((y) => y.grade === 3).map((y) => y.id),
};

/** 모집한다. count는 1 또는 10 */
export function pull(s: GameState, count: 1 | 10): [GameState, PullOutcome] {
  const cost = pullCost(count);
  if (s.res.jade < cost) return [s, { ok: false, reason: 'no-jade' }];
  const next = structuredClone(s);
  next.res.jade -= cost;
  let rng = next.rng;
  const roll = () => {
    const [r, n] = nextRandom(rng);
    rng = n;
    return r;
  };
  const rarities: (1 | 2 | 3)[] = [];
  let pity = next.gacha.pity;
  for (let i = 0; i < count; i++) {
    pity += 1;
    const r = roll();
    let rarity: 1 | 2 | 3 = pity >= B.pity || r < B.rates.ssr ? 3 : r < B.rates.ssr + B.rates.sr ? 2 : 1;
    if (rarity === 3) pity = 0;
    rarities.push(rarity);
  }
  /** 첫 열 번 모집의 확정 SSR은 아직 없는 식객으로 */
  let freshSsr = -1;
  if (count === 10) {
    if (!next.gacha.firstTen) {
      if (!rarities.includes(3)) rarities[9] = 3;
      freshSsr = rarities.indexOf(3);
      pity = rarities.length - 1 - rarities.lastIndexOf(3);
    } else if (rarities.every((r) => r < 2)) rarities[9] = 2;
    next.gacha.firstTen = true;
  }
  const results: PullResult[] = rarities.map((rarity, i) => {
    const unowned = POOL[3].filter((id) => !next.yokai[id]);
    const pool = i === freshSsr && unowned.length ? unowned : POOL[rarity].length ? POOL[rarity] : POOL[1];
    const id = pool[Math.floor(roll() * pool.length)];
    if (!next.yokai[id]) {
      next.yokai[id] = { level: 1, stars: startStars(id), shards: 0, bond: 0, talkAt: 0, outingAt: 0, seen: 0, talks: 0, gear: {} };
      return { id, rarity, isNew: true, shards: 0 };
    }
    const shards = B.dupeShards[rarity];
    next.yokai[id].shards += shards;
    return { id, rarity, isNew: false, shards };
  });
  next.rng = rng;
  next.gacha = { ...next.gacha, pulls: next.gacha.pulls + count, pity };
  next.totals = { ...next.totals, pulls: next.totals.pulls + count };
  return [next, { ok: true, results }];
}
