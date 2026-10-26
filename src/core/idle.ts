// 방치 보상 상자와 수련장.
// 방치 보상: 자리를 비운 동안(최대 12시간) 가장 멀리 깬 스테이지에 비례해 엽전·수련치·명성·옥·장비가 쌓인다.
// 수련장: 캠페인 진행에 따라 열리는 반복 전투. 이기면 수련치·엽전. 막혔을 때 키우는 곳이다.
import { BALANCE as B } from '../data/balance';
import { ITEMS } from '../data/items';
import { ELEMENT } from '../data/roster';
import type { CombatResult, CombatSetup, UnitInit } from './combat';
import { furthestStage } from './campaign';
import { nextRandom } from './rng';
import type { GameState } from './types';
import { foeUnit, heroUnit, wavePower } from './units';

export const MINUTE = 60_000;

/** 방치 보상을 계산하는 레벨: 가장 멀리 깬 스테이지 레벨(아직 없으면 1) */
export const afkLevel = (s: GameState) => furthestStage(s)?.level ?? 1;

export function afkRates(s: GameState) {
  const L = afkLevel(s);
  return {
    coin: B.afkCoin.base + B.afkCoin.perLevel * L,
    exp: B.afkExp.base + B.afkExp.perLevel * L,
    fame: B.afkFame.base + B.afkFame.perLevel * L,
  };
}

export interface AfkPending {
  minutes: number;
  coin: number;
  exp: number;
  fame: number;
  jade: number;
  gear: number;
}

export function afkPending(s: GameState, now: number): AfkPending {
  const minutes = Math.max(0, Math.min(B.afkCapMinutes, (now - s.afk.since) / MINUTE));
  const r = afkRates(s);
  return {
    minutes,
    coin: Math.floor(r.coin * minutes),
    exp: Math.floor(r.exp * minutes),
    fame: Math.floor(r.fame * minutes),
    jade: Math.floor(minutes / B.afkJadeEvery),
    gear: Math.floor(minutes / B.afkGearEvery),
  };
}

/** 그 레벨에 맞는 상점 장비 하나 */
function gearFor(level: number, r: number): string | null {
  const tier = Math.max(1, Math.min(9, Math.round(level / 8)));
  const pool = ITEMS.filter((i) => i.price && Math.abs(i.tier - tier) <= 1);
  return pool.length ? pool[Math.floor(r * pool.length)].id : null;
}

export function claimAfk(s: GameState, now: number): [GameState, AfkPending & { items: string[] }] {
  const p = afkPending(s, now);
  const next = structuredClone(s);
  next.res.coin += p.coin;
  next.res.exp += p.exp;
  next.res.fame += p.fame;
  next.res.jade += p.jade;
  const items: string[] = [];
  let rng = next.rng;
  for (let i = 0; i < p.gear; i++) {
    const [r, n] = nextRandom(rng);
    rng = n;
    const id = gearFor(afkLevel(s), r);
    if (id) {
      next.inventory[id] = (next.inventory[id] ?? 0) + 1;
      items.push(id);
    }
  }
  next.rng = rng;
  next.afk = { since: now };
  return [next, { ...p, items }];
}

// ───────────────────────── 수련장 ─────────────────────────

export const TRAIN_LEVELS = B.trainLevels;

/** 이 난이도가 열렸는지: 캠페인에서 그 레벨 근처까지 갔으면 */
export const trainOpen = (s: GameState, tier: number) => tier === 0 || afkLevel(s) >= TRAIN_LEVELS[tier] - 4;

const TRAIN_FOES = [
  { name: '허수아비 졸개', art: 'grunt/backhill', role: 'attack' as const },
  { name: '수련장 사범', art: 'grunt/north-3', role: 'defense' as const },
  { name: '훈련 도깨비', art: 'grunt/cave', role: 'attack' as const },
  { name: '약초 무녀', art: 'grunt/pleasure-2', role: 'heal' as const },
  { name: '깃발잡이', art: 'grunt/north', role: 'support' as const },
];
const ELEMENTS = [...new Set(Object.values(ELEMENT))];

export function trainWaves(tier: number): UnitInit[][] {
  const level = TRAIN_LEVELS[tier];
  const size = Math.min(5, 3 + Math.floor(tier / 4));
  return [0, 1].map((w) =>
    Array.from({ length: size }, (_, i) => {
      const f = TRAIN_FOES[(i + w + tier) % TRAIN_FOES.length];
      return foeUnit({
        id: `train${tier}:${w}:${i}`,
        name: f.name,
        art: `art/${f.art}.webp`,
        level,
        role: f.role,
        element: ELEMENTS[(i + tier * 2 + w) % ELEMENTS.length],
        kind: 'grunt',
        power: 1 + B.foeChapterGrowth * tier * 1.8,
        skill: i === 0,
      });
    }),
  );
}

export const trainPower = (tier: number) => wavePower(trainWaves(tier));

export function trainSetup(s: GameState, tier: number, team: string[]): CombatSetup {
  const ids = team.slice(0, 5);
  return { allies: ids.map((id) => (id && s.yokai[id] ? heroUnit(s, id, ids) : null)), waves: trainWaves(tier) };
}

export function trainReward(tier: number) {
  const L = TRAIN_LEVELS[tier];
  return {
    exp: Math.round(B.trainExp.base + B.trainExp.perLevel * L),
    coin: Math.round(B.trainCoin.base + B.trainCoin.perLevel * L),
    fame: Math.round(B.trainFame.base + B.trainFame.perLevel * L),
  };
}

/** 수련 결과를 반영한다(제자리에서 고친다). 지면 아무것도 없다 */
export function applyTrain(s: GameState, tier: number, team: string[], result: CombatResult) {
  if (!result.won) {
    s.totals.losses += 1;
    return null;
  }
  const r = trainReward(tier);
  s.res.exp += r.exp;
  s.res.coin += r.coin;
  s.res.fame += r.fame;
  s.totals.wins += 1;
  for (const id of team) if (id && s.yokai[id]) s.yokai[id].bond += 1;
  if (s.totals.wins % B.winsPerPetition === 0) s.wish = { ...s.wish, charges: s.wish.charges + 1 };
  return r;
}
