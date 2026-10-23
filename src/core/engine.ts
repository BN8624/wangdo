// 게임 규칙. 모든 함수는 순수 함수다: 상태와 현재 시각을 받아 새 상태를 돌려주고, 입력 상태는 건드리지 않는다.
// 시간은 항상 인자로 받는다(Date.now()를 직접 부르지 않는다). 그래야 테스트와 시뮬레이션이 결정론적이다.

import { BALANCE as B } from '../data/balance';
import { MAX_RANK, RANKS } from '../data/ranks';
import { CHAPTERS, STAGES_PER_CHAPTER, TOTAL_STAGES } from '../data/stages';
import { WISHES, WISH_BY_ID } from '../data/wishes';
import { STARTERS, YOKAI, YOKAI_BY_ID } from '../data/yokai';
import { nextRandom } from './rng';
import type {
  GameState,
  RankDef,
  StageInfo,
  StatKey,
  Stats,
  StoredKey,
  WishDef,
  WishReward,
  YokaiDef,
} from './types';

export const MINUTE = 60_000;
export const STORED_KEYS: StoredKey[] = ['coin', 'grain', 'hands'];
export const STAT_KEYS: StatKey[] = ['might', 'wit', 'craft', 'charm'];

/** 어떤 능력치가 어떤 자원을 만드는지 */
export const PRODUCER: Record<StoredKey, StatKey> = { coin: 'wit', grain: 'craft', hands: 'might' };

export type Fail<R extends string> = { ok: false; reason: R };

export function newGame(now: number, seed: number = now): GameState {
  return {
    version: 1,
    createdAt: now,
    lastSettled: now,
    rank: 0,
    res: { ...B.start },
    store: { coin: 0, grain: 0, hands: 0 },
    yokai: Object.fromEntries(STARTERS.map((id) => [id, { level: 1 }])),
    wish: { charges: B.wishBaseCharges, lastRegen: now, pending: null, recent: [] },
    stage: { index: 0, damage: 0 },
    rng: seed | 0,
    totals: { wishes: 0, feasts: 0, stages: 0, collected: 0 },
    introSeen: false,
  };
}

const clone = (s: GameState): GameState => structuredClone(s);

// ───────────────────────── 파생 값 ─────────────────────────

export function yokaiStats(def: YokaiDef, level: number): Stats {
  const out = {} as Stats;
  for (const k of STAT_KEYS) out[k] = Math.floor(def.base[k] + def.growth[k] * (level - 1));
  return out;
}

export function ownedYokai(s: GameState): { def: YokaiDef; level: number }[] {
  return YOKAI.filter((d) => s.yokai[d.id]).map((def) => ({ def, level: s.yokai[def.id].level }));
}

export function totalStats(s: GameState): Stats {
  const sum: Stats = { might: 0, wit: 0, craft: 0, charm: 0 };
  for (const { def, level } of ownedYokai(s)) {
    const st = yokaiStats(def, level);
    for (const k of STAT_KEYS) sum[k] += st[k];
  }
  return sum;
}

/** 위세 = 모든 식객 능력치의 합 */
export function power(s: GameState): number {
  const t = totalStats(s);
  return t.might + t.wit + t.craft + t.charm;
}

export const rankMultiplier = (rank: number) => 1 + rank * B.rankProdBonus;

export function ratesPerMinute(s: GameState): Record<StoredKey, number> {
  const t = totalStats(s);
  const m = rankMultiplier(s.rank);
  return {
    coin: t[PRODUCER.coin] * B.perStatPerMinute.coin * m,
    grain: t[PRODUCER.grain] * B.perStatPerMinute.grain * m,
    hands: t[PRODUCER.hands] * B.perStatPerMinute.hands * m,
  };
}

export function storageCaps(s: GameState): Record<StoredKey, number> {
  const r = ratesPerMinute(s);
  return {
    coin: Math.floor(r.coin * B.storageMinutes),
    grain: Math.floor(r.grain * B.storageMinutes),
    hands: Math.floor(r.hands * B.storageMinutes),
  };
}

export const levelCap = (rank: number) => B.levelCapBase + rank * B.levelCapPerRank;

/** level → level+1 비용(엽전) */
export function levelCost(def: YokaiDef, level: number): number {
  return Math.round(B.levelCostBase * B.gradeCostMult[def.grade] * Math.pow(level, B.levelCostExp));
}

export const wishMaxCharges = (rank: number) => B.wishBaseCharges + Math.floor(rank / B.wishChargeEveryRanks);

export const feastCost = (rank: number) => Math.round(B.feastGrainBase * Math.pow(B.feastGrainGrowth, rank));

export function feastFame(s: GameState): number {
  const charm = totalStats(s).charm;
  return Math.max(1, Math.round(charm * B.feastFamePerCharm * (1 + s.rank * B.feastFameRankBonus)));
}

export function nextRank(s: GameState): RankDef | null {
  return s.rank >= MAX_RANK ? null : RANKS[s.rank + 1];
}

export function stageInfo(index: number): StageInfo | null {
  if (index < 0 || index >= TOTAL_STAGES) return null;
  const chapterIndex = Math.floor(index / STAGES_PER_CHAPTER);
  const chapter = CHAPTERS[chapterIndex];
  const number = (index % STAGES_PER_CHAPTER) + 1;
  const isBoss = number === STAGES_PER_CHAPTER;
  const bossMult = isBoss ? B.bossRewardMult : 1;
  return {
    index,
    chapter,
    chapterIndex,
    number,
    isBoss,
    foe: isBoss ? chapter.boss.name : chapter.foes[number - 1],
    hp: Math.round(B.stageHpBase * Math.pow(B.stageHpGrowth, index) * (isBoss ? B.bossHpMult : 1)),
    fame: Math.round(B.stageFameBase * Math.pow(B.stageFameGrowth, index) * bossMult),
    coin: Math.round(B.stageCoinBase * Math.pow(B.stageCoinGrowth, index) * bossMult),
  };
}

/** 일손 한 명이 해결하는 소동의 양 */
export const forcePerHand = (s: GameState) => totalStats(s).might / B.forcePerHand;

export function handsNeeded(s: GameState): number | null {
  const info = stageInfo(s.stage.index);
  if (!info) return null;
  const per = forcePerHand(s);
  if (per <= 0) return Infinity;
  return Math.ceil((info.hp - s.stage.damage) / per);
}

// ───────────────────────── 시간 정산 ─────────────────────────

/** 마지막 정산 이후 흐른 시간만큼 창고와 뚝딱 횟수를 채운다. */
export function settle(s: GameState, now: number): GameState {
  const next = clone(s);
  settleInPlace(next, now);
  return next;
}

function settleInPlace(s: GameState, now: number): void {
  // 시계가 뒤로 갔으면 아무것도 주지 않고 기준 시각만 맞춘다.
  if (now < s.lastSettled) {
    s.lastSettled = now;
    s.wish.lastRegen = Math.min(s.wish.lastRegen, now);
    return;
  }
  const minutes = (now - s.lastSettled) / MINUTE;
  const rates = ratesPerMinute(s);
  const caps = storageCaps(s);
  for (const k of STORED_KEYS) {
    const filled = Math.min(caps[k], s.store[k] + rates[k] * minutes);
    s.store[k] = Math.max(s.store[k], filled);
  }
  s.lastSettled = now;

  const max = wishMaxCharges(s.rank);
  const regen = B.wishRegenMinutes * MINUTE;
  if (s.wish.charges >= max) {
    s.wish.lastRegen = now;
  } else {
    const gained = Math.floor((now - s.wish.lastRegen) / regen);
    s.wish.charges = Math.min(max, s.wish.charges + gained);
    s.wish.lastRegen = s.wish.charges >= max ? now : s.wish.lastRegen + gained * regen;
  }
}

/** 다음 뚝딱 충전까지 남은 시간(ms). 가득 찼으면 null */
export function wishRegenRemaining(s: GameState, now: number): number | null {
  if (s.wish.charges >= wishMaxCharges(s.rank)) return null;
  const regen = B.wishRegenMinutes * MINUTE;
  return Math.max(0, regen - ((now - s.wish.lastRegen) % regen));
}

// ───────────────────────── 행동 ─────────────────────────

export interface Collected {
  ok: true;
  amounts: Record<StoredKey, number>;
}

export function collect(s: GameState, now: number, keys: StoredKey[] = STORED_KEYS): [GameState, Collected] {
  const next = clone(s);
  settleInPlace(next, now);
  const amounts = { coin: 0, grain: 0, hands: 0 };
  for (const k of keys) {
    const whole = Math.floor(next.store[k]);
    amounts[k] = whole;
    next.res[k] += whole;
    next.store[k] -= whole;
    next.totals.collected += whole;
  }
  return [next, { ok: true, amounts }];
}

export type LevelUpResult =
  | { ok: true; levels: number; spent: number }
  | Fail<'not-owned' | 'max-level' | 'no-coin'>;

/** count번(가능한 만큼) 레벨을 올린다. */
export function levelUp(s: GameState, now: number, id: string, count = 1): [GameState, LevelUpResult] {
  const def = YOKAI_BY_ID[id];
  if (!def || !s.yokai[id]) return [s, { ok: false, reason: 'not-owned' }];
  const cap = levelCap(s.rank);
  if (s.yokai[id].level >= cap) return [s, { ok: false, reason: 'max-level' }];
  if (s.res.coin < levelCost(def, s.yokai[id].level)) return [s, { ok: false, reason: 'no-coin' }];

  // 생산량이 바뀌기 전에 지금까지 쌓인 몫을 먼저 정산한다.
  const next = clone(s);
  settleInPlace(next, now);
  let levels = 0;
  let spent = 0;
  const y = next.yokai[id];
  while (levels < count && y.level < cap) {
    const cost = levelCost(def, y.level);
    if (next.res.coin < cost) break;
    next.res.coin -= cost;
    spent += cost;
    y.level += 1;
    levels += 1;
  }
  return [next, { ok: true, levels, spent }];
}

/** 지금 엽전으로 몇 레벨까지 올릴 수 있는지와 그 비용 */
export function affordableLevels(s: GameState, id: string, count: number): { levels: number; cost: number } {
  const def = YOKAI_BY_ID[id];
  if (!def || !s.yokai[id]) return { levels: 0, cost: 0 };
  const cap = levelCap(s.rank);
  let level = s.yokai[id].level;
  let coin = s.res.coin;
  let cost = 0;
  let levels = 0;
  while (levels < count && level < cap) {
    const c = levelCost(def, level);
    if (coin < c) break;
    coin -= c;
    cost += c;
    level += 1;
    levels += 1;
  }
  return { levels, cost };
}

export type FeastResult = { ok: true; fame: number; grain: number } | Fail<'no-grain'>;

export function feast(s: GameState, now: number): [GameState, FeastResult] {
  const cost = feastCost(s.rank);
  if (s.res.grain < cost) return [s, { ok: false, reason: 'no-grain' }];
  const next = clone(s);
  settleInPlace(next, now);
  const fame = feastFame(next);
  next.res.grain -= cost;
  next.res.fame += fame;
  next.totals.feasts += 1;
  return [next, { ok: true, fame, grain: cost }];
}

export type PromoteResult =
  | { ok: true; rank: number; recruit: string | null }
  | Fail<'max-rank' | 'need-power' | 'need-fame'>;

export function promoteCheck(s: GameState): PromoteResult | { ok: true } {
  const target = nextRank(s);
  if (!target) return { ok: false, reason: 'max-rank' };
  if (power(s) < target.powerReq) return { ok: false, reason: 'need-power' };
  if (s.res.fame < target.fameCost) return { ok: false, reason: 'need-fame' };
  return { ok: true };
}

export function promote(s: GameState, now: number): [GameState, PromoteResult] {
  const check = promoteCheck(s);
  if (!check.ok) return [s, check];
  const target = RANKS[s.rank + 1];
  const next = clone(s);
  settleInPlace(next, now);
  next.res.fame -= target.fameCost;
  next.rank += 1;
  let recruit: string | null = null;
  if (target.recruit && !next.yokai[target.recruit]) {
    next.yokai[target.recruit] = { level: 1 };
    recruit = target.recruit;
  }
  return [next, { ok: true, rank: next.rank, recruit }];
}

// ───────────────────────── 뚝딱(소원) ─────────────────────────

export type UseWishResult = { ok: true; wish: WishDef } | Fail<'no-charge'>;

export function useWish(s: GameState, now: number): [GameState, UseWishResult] {
  if (s.wish.pending) return [s, { ok: true, wish: WISH_BY_ID[s.wish.pending.id] }];
  const next = clone(s);
  settleInPlace(next, now);
  if (next.wish.charges <= 0) return [s, { ok: false, reason: 'no-charge' }];

  const eligible = WISHES.filter((w) => w.minRank <= next.rank);
  const fresh = eligible.filter((w) => !next.wish.recent.includes(w.id));
  const pool = fresh.length > 0 ? fresh : eligible;
  const [r, rng] = nextRandom(next.rng);
  const wish = pool[Math.floor(r * pool.length)];

  if (next.wish.charges >= wishMaxCharges(next.rank)) next.wish.lastRegen = now;
  next.wish.charges -= 1;
  next.rng = rng;
  next.wish.pending = { id: wish.id };
  next.wish.recent = [wish.id, ...next.wish.recent].slice(0, 8);
  next.totals.wishes += 1;
  return [next, { ok: true, wish }];
}

export function wishRewardAmount(s: GameState, reward: WishReward): number {
  if (reward.kind === 'fame') {
    const target = nextRank(s) ?? RANKS[MAX_RANK];
    return Math.max(1, Math.ceil((target.fameCost * reward.pct * B.wishRewardScale) / 100));
  }
  const rate = ratesPerMinute(s)[reward.kind];
  return Math.max(B.wishMinReward, Math.round(rate * reward.minutes * B.wishRewardScale));
}

export type ChooseWishResult = { ok: true; kind: WishReward['kind']; amount: number } | Fail<'no-pending'>;

export function chooseWish(s: GameState, now: number, choice: 0 | 1): [GameState, ChooseWishResult] {
  if (!s.wish.pending) return [s, { ok: false, reason: 'no-pending' }];
  const next = clone(s);
  settleInPlace(next, now);
  const wish = WISH_BY_ID[next.wish.pending!.id];
  const reward = wish.choices[choice].reward;
  const amount = wishRewardAmount(next, reward);
  next.res[reward.kind] += amount;
  next.wish.pending = null;
  return [next, { ok: true, kind: reward.kind, amount }];
}

// ───────────────────────── 소동 해결 ─────────────────────────

export type StageResult =
  | {
      ok: true;
      cleared: boolean;
      stage: StageInfo;
      handsUsed: number;
      /** 이번에 줄인 소동의 양 */
      damage: number;
      fame: number;
      coin: number;
      recruit: string | null;
    }
  | Fail<'all-clear' | 'no-hands' | 'no-might'>;

export function challengeStage(s: GameState, now: number): [GameState, StageResult] {
  const info = stageInfo(s.stage.index);
  if (!info) return [s, { ok: false, reason: 'all-clear' }];
  const per = forcePerHand(s);
  if (per <= 0) return [s, { ok: false, reason: 'no-might' }];
  if (s.res.hands < 1) return [s, { ok: false, reason: 'no-hands' }];

  const next = clone(s);
  settleInPlace(next, now);
  const remaining = info.hp - next.stage.damage;
  const needed = Math.ceil(remaining / per);

  if (next.res.hands >= needed) {
    next.res.hands -= needed;
    next.stage = { index: info.index + 1, damage: 0 };
    next.res.fame += info.fame;
    next.res.coin += info.coin;
    next.totals.stages += 1;
    let recruit: string | null = null;
    if (info.isBoss && !next.yokai[info.chapter.boss.yokai]) {
      next.yokai[info.chapter.boss.yokai] = { level: 1 };
      recruit = info.chapter.boss.yokai;
    }
    return [next, { ok: true, cleared: true, stage: info, handsUsed: needed, damage: remaining, fame: info.fame, coin: info.coin, recruit }];
  }

  const used = Math.floor(next.res.hands);
  const damage = used * per;
  next.res.hands -= used;
  next.stage.damage += damage;
  return [next, { ok: true, cleared: false, stage: info, handsUsed: used, damage, fame: 0, coin: 0, recruit: null }];
}

export function markIntroSeen(s: GameState): GameState {
  return { ...s, introSeen: true };
}
