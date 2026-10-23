// 게임 규칙. 모든 함수는 순수 함수다: 상태와 현재 시각을 받아 새 상태를 돌려주고, 입력 상태는 건드리지 않는다.
// 시간은 항상 인자로 받는다(Date.now()를 직접 부르지 않는다). 그래야 테스트와 시뮬레이션이 결정론적이다.

import { BALANCE as B } from '../data/balance';
import { MAX_RANK, RANKS } from '../data/ranks';
import { CHAPTERS, STAGES_PER_CHAPTER, TOTAL_STAGES } from '../data/stages';
import { BOND_LEVELS, COMBOS, GIFTS, GIFT_BY_ID, WORKPLACES } from '../data/village';
import { WISHES, WISH_BY_ID } from '../data/wishes';
import { STARTERS, YOKAI, YOKAI_BY_ID } from '../data/yokai';
import { nextRandom } from './rng';
import type {
  ComboDef,
  GameState,
  RankDef,
  ResourceKey,
  StageInfo,
  StatKey,
  Stats,
  WishDef,
  WishReward,
  WorkplaceDef,
  WorkplaceId,
  YokaiDef,
  YokaiState,
} from './types';

export const MINUTE = 60_000;
export const RESOURCE_KEYS: ResourceKey[] = ['coin', 'grain', 'fame'];
export const STAT_KEYS: StatKey[] = ['might', 'wit', 'craft', 'charm'];

export type Fail<R extends string> = { ok: false; reason: R };

const freshYokai = (): YokaiState => ({ level: 1, bond: 0, talkAt: 0, outingAt: 0, seen: 0, talks: 0 });

export function newGame(now: number, seed: number = now): GameState {
  return {
    version: 2,
    createdAt: now,
    lastSettled: now,
    rank: 0,
    res: { ...B.start },
    stamina: { value: B.staminaMax, lastRegen: now },
    yokai: Object.fromEntries(STARTERS.map((id) => [id, freshYokai()])),
    work: { market: ['bangul'], woodyard: ['dudu'], field: ['sora'], tavern: [] },
    gifts: {},
    wish: { charges: B.wishBaseCharges, lastRegen: now, pending: null, recent: [] },
    stage: { index: 0 },
    combosSeen: [],
    rng: seed | 0,
    totals: { wishes: 0, feasts: 0, wins: 0, losses: 0, talks: 0, gifts: 0, earned: 0 },
    introSeen: false,
  };
}

const clone = (s: GameState): GameState => structuredClone(s);

function roll(s: GameState): number {
  const [r, next] = nextRandom(s.rng);
  s.rng = next;
  return r;
}

// ───────────────────────── 식객 능력치 ─────────────────────────

export function bondLevel(points: number): number {
  let lv = 0;
  for (let i = 0; i < BOND_LEVELS.length; i++) if (points >= BOND_LEVELS[i].need) lv = i;
  return lv;
}

export function yokaiStats(def: YokaiDef, level: number, bond = 0): Stats {
  const mult = 1 + bondLevel(bond) * B.bondStatBonus;
  const out = {} as Stats;
  for (const k of STAT_KEYS) out[k] = Math.floor((def.base[k] + def.growth[k] * (level - 1)) * mult);
  return out;
}

export function statsOf(s: GameState, id: string): Stats {
  const y = s.yokai[id];
  return yokaiStats(YOKAI_BY_ID[id], y.level, y.bond);
}

export function ownedYokai(s: GameState): { def: YokaiDef; state: YokaiState }[] {
  return YOKAI.filter((d) => s.yokai[d.id]).map((def) => ({ def, state: s.yokai[def.id] }));
}

export function totalStats(s: GameState): Stats {
  const sum: Stats = { might: 0, wit: 0, craft: 0, charm: 0 };
  for (const { def } of ownedYokai(s)) {
    const st = statsOf(s, def.id);
    for (const k of STAT_KEYS) sum[k] += st[k];
  }
  return sum;
}

/** 위세 = 모든 식객 능력치의 합 */
export function power(s: GameState): number {
  const t = totalStats(s);
  return t.might + t.wit + t.craft + t.charm;
}

export const levelCap = (rank: number) => B.levelCapBase + rank * B.levelCapPerRank;

/** level → level+1 비용(엽전) */
export function levelCost(def: YokaiDef, level: number): number {
  return Math.round(B.levelCostBase * B.gradeCostMult[def.grade] * Math.pow(level, B.levelCostExp));
}

// ───────────────────────── 일터 ─────────────────────────

export const rankMultiplier = (rank: number) => 1 + rank * B.rankProdBonus;

export const slotsPerWorkplace = (rank: number) => 1 + B.slotRanks.filter((r) => rank >= r).length;

/** 일터에 함께 있는 짝꿍 */
export function activeCombos(ids: string[]): ComboDef[] {
  return COMBOS.filter((c) => ids.includes(c.pair[0]) && ids.includes(c.pair[1]));
}

export const hasAptitude = (def: YokaiDef, wp: WorkplaceDef) => def.specialty === wp.stat;

/** 일터 하나의 분당 생산량 */
export function workplaceRate(s: GameState, wp: WorkplaceDef): number {
  const ids = s.work[wp.id];
  let sum = 0;
  for (const id of ids) {
    const def = YOKAI_BY_ID[id];
    sum += statsOf(s, id)[wp.stat] * (hasAptitude(def, wp) ? B.aptitudeMult : 1);
  }
  const combo = 1 + activeCombos(ids).length * B.comboBonus;
  return sum * wp.perStat * combo * rankMultiplier(s.rank);
}

export function ratesPerMinute(s: GameState): Record<ResourceKey, number> {
  const out: Record<ResourceKey, number> = { coin: 0, grain: 0, fame: 0 };
  for (const wp of WORKPLACES) out[wp.produces] += workplaceRate(s, wp);
  return out;
}

export function workplaceOf(s: GameState, id: string): WorkplaceId | null {
  for (const wp of WORKPLACES) if (s.work[wp.id].includes(id)) return wp.id;
  return null;
}

export type AssignResult = { ok: true; newCombos: ComboDef[] } | Fail<'not-owned' | 'full'>;

/** 식객을 일터에 보낸다. wp가 null이면 쉬게 한다. */
export function assign(s: GameState, now: number, id: string, wp: WorkplaceId | null): [GameState, AssignResult] {
  if (!s.yokai[id]) return [s, { ok: false, reason: 'not-owned' }];
  if (wp && workplaceOf(s, id) !== wp && s.work[wp].length >= slotsPerWorkplace(s.rank)) {
    return [s, { ok: false, reason: 'full' }];
  }
  const next = clone(s);
  settleInPlace(next, now);
  for (const w of WORKPLACES) next.work[w.id] = next.work[w.id].filter((x) => x !== id);
  let newCombos: ComboDef[] = [];
  if (wp) {
    next.work[wp].push(id);
    newCombos = activeCombos(next.work[wp]).filter((c) => !next.combosSeen.includes(c.id));
    next.combosSeen.push(...newCombos.map((c) => c.id));
  }
  return [next, { ok: true, newCombos }];
}

// ───────────────────────── 시간 정산 ─────────────────────────

export function settle(s: GameState, now: number): GameState {
  const next = clone(s);
  settleInPlace(next, now);
  return next;
}

function regen(value: number, max: number, last: number, every: number, now: number): [number, number] {
  if (value >= max) return [value, now];
  const gained = Math.floor((now - last) / every);
  const v = Math.min(max, value + gained);
  return [v, v >= max ? now : last + gained * every];
}

function settleInPlace(s: GameState, now: number): void {
  // 시계가 뒤로 갔으면 아무것도 주지 않고 기준 시각만 맞춘다.
  if (now < s.lastSettled) {
    s.lastSettled = now;
    s.wish.lastRegen = Math.min(s.wish.lastRegen, now);
    s.stamina.lastRegen = Math.min(s.stamina.lastRegen, now);
    return;
  }
  const minutes = Math.min((now - s.lastSettled) / MINUTE, B.offlineCapMinutes);
  const rates = ratesPerMinute(s);
  for (const k of RESOURCE_KEYS) {
    s.res[k] += rates[k] * minutes;
    if (k !== 'fame') s.totals.earned += rates[k] * minutes;
  }
  s.lastSettled = now;
  [s.wish.charges, s.wish.lastRegen] = regen(s.wish.charges, wishMaxCharges(s.rank), s.wish.lastRegen, B.wishRegenMinutes * MINUTE, now);
  [s.stamina.value, s.stamina.lastRegen] = regen(s.stamina.value, B.staminaMax, s.stamina.lastRegen, B.staminaRegenMinutes * MINUTE, now);
}

/** 다음 충전까지 남은 시간(ms). 가득 찼으면 null */
function regenRemaining(value: number, max: number, last: number, every: number, now: number): number | null {
  if (value >= max) return null;
  return Math.max(0, every - ((now - last) % every));
}
export const wishRegenRemaining = (s: GameState, now: number) =>
  regenRemaining(s.wish.charges, wishMaxCharges(s.rank), s.wish.lastRegen, B.wishRegenMinutes * MINUTE, now);
export const staminaRegenRemaining = (s: GameState, now: number) =>
  regenRemaining(s.stamina.value, B.staminaMax, s.stamina.lastRegen, B.staminaRegenMinutes * MINUTE, now);

// ───────────────────────── 레벨업 ─────────────────────────

export type LevelUpResult = { ok: true; levels: number; spent: number } | Fail<'not-owned' | 'max-level' | 'no-coin'>;

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

// ───────────────────────── 인연 ─────────────────────────

export type BondResult = { ok: true; gained: number; from: number; to: number };

function addBond(s: GameState, id: string, amount: number): BondResult {
  const y = s.yokai[id];
  const from = bondLevel(y.bond);
  y.bond += amount;
  return { ok: true, gained: amount, from, to: bondLevel(y.bond) };
}

export const talkReadyIn = (s: GameState, id: string, now: number) =>
  Math.max(0, s.yokai[id].talkAt + B.talkCooldownMinutes * MINUTE - now);
export const outingReadyIn = (s: GameState, id: string, now: number) =>
  Math.max(0, s.yokai[id].outingAt + B.outingCooldownMinutes * MINUTE - now);
export const priceAt = (base: number, rank: number) => Math.round(base * Math.pow(B.priceGrowth, rank));
export const giftPrice = (giftId: string, rank: number) => priceAt(GIFT_BY_ID[giftId].cost, rank);
export const outingPrice = (rank: number) => priceAt(B.outingCost, rank);

/** 대화. delta는 고른 대답의 점수(1·4·8) */
export function talk(s: GameState, now: number, id: string, delta: number): [GameState, BondResult | Fail<'not-owned' | 'cooldown'>] {
  if (!s.yokai[id]) return [s, { ok: false, reason: 'not-owned' }];
  if (talkReadyIn(s, id, now) > 0) return [s, { ok: false, reason: 'cooldown' }];
  const next = clone(s);
  settleInPlace(next, now);
  const d = [1, 4, 8].includes(delta) ? delta : 1;
  next.yokai[id].talkAt = now;
  next.yokai[id].talks += 1;
  next.totals.talks += 1;
  return [next, addBond(next, id, d * B.talkMult)];
}

/** 선물. 가진 게 없으면 그 자리에서 사서 준다. */
export function giveGift(
  s: GameState,
  now: number,
  id: string,
  giftId: string,
): [GameState, (BondResult & { liked: boolean; bought: boolean }) | Fail<'not-owned' | 'no-coin'>] {
  if (!s.yokai[id] || !GIFT_BY_ID[giftId]) return [s, { ok: false, reason: 'not-owned' }];
  const owned = (s.gifts[giftId] ?? 0) > 0;
  const price = giftPrice(giftId, s.rank);
  if (!owned && s.res.coin < price) return [s, { ok: false, reason: 'no-coin' }];
  const next = clone(s);
  settleInPlace(next, now);
  if (owned) next.gifts[giftId] -= 1;
  else next.res.coin -= price;
  const liked = YOKAI_BY_ID[id].likes.includes(giftId);
  next.totals.gifts += 1;
  return [next, { ...addBond(next, id, liked ? B.giftBond.liked : B.giftBond.normal), liked, bought: !owned }];
}

export function outing(s: GameState, now: number, id: string): [GameState, BondResult | Fail<'not-owned' | 'cooldown' | 'no-coin'>] {
  if (!s.yokai[id]) return [s, { ok: false, reason: 'not-owned' }];
  if (outingReadyIn(s, id, now) > 0) return [s, { ok: false, reason: 'cooldown' }];
  const price = outingPrice(s.rank);
  if (s.res.coin < price) return [s, { ok: false, reason: 'no-coin' }];
  const next = clone(s);
  settleInPlace(next, now);
  next.res.coin -= price;
  next.yokai[id].outingAt = now;
  return [next, addBond(next, id, B.outingBond)];
}

/** 아직 안 본 이야기 장면 단계(없으면 0) */
export function unseenScene(s: GameState, id: string): number {
  const y = s.yokai[id];
  return y && bondLevel(y.bond) > y.seen ? y.seen + 1 : 0;
}

export function markSceneSeen(s: GameState, id: string, level: number): GameState {
  const next = clone(s);
  next.yokai[id].seen = Math.max(next.yokai[id].seen, level);
  return next;
}

// ───────────────────────── 잔치·승급 ─────────────────────────

export const wishMaxCharges = (rank: number) => B.wishBaseCharges + Math.floor(rank / B.wishChargeEveryRanks);
export const feastCost = (rank: number) => Math.round(B.feastGrainBase * Math.pow(B.feastGrainGrowth, rank));

export function feastFame(s: GameState): number {
  return Math.max(1, Math.round(totalStats(s).charm * B.feastFamePerCharm * (1 + s.rank * B.feastFameRankBonus)));
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
  for (const id of Object.keys(next.yokai)) next.yokai[id].bond += B.feastBond;
  next.totals.feasts += 1;
  return [next, { ok: true, fame, grain: cost }];
}

export function nextRank(s: GameState): RankDef | null {
  return s.rank >= MAX_RANK ? null : RANKS[s.rank + 1];
}

export type PromoteResult = { ok: true; rank: number; recruit: string | null } | Fail<'max-rank' | 'need-power' | 'need-fame'>;

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
    next.yokai[target.recruit] = freshYokai();
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
  const wish = pool[Math.floor(roll(next) * pool.length)];
  if (next.wish.charges >= wishMaxCharges(next.rank)) next.wish.lastRegen = now;
  next.wish.charges -= 1;
  next.wish.pending = { id: wish.id };
  next.wish.recent = [wish.id, ...next.wish.recent].slice(0, 8);
  next.totals.wishes += 1;
  return [next, { ok: true, wish }];
}

/** 보상 미리보기 수치(선물은 1개) */
export function wishRewardAmount(s: GameState, reward: WishReward): number {
  switch (reward.kind) {
    case 'fame': {
      const target = nextRank(s) ?? RANKS[MAX_RANK];
      return Math.max(1, Math.ceil((target.fameCost * reward.pct * B.wishRewardScale) / 100));
    }
    case 'stamina':
      return reward.amount;
    case 'gift':
      return 1;
    default: {
      const rate = ratesPerMinute(s)[reward.kind];
      return Math.max(B.wishMinReward, Math.round(rate * reward.minutes * B.wishRewardScale));
    }
  }
}

export type ChooseWishResult = { ok: true; kind: WishReward['kind']; amount: number; gift?: string } | Fail<'no-pending'>;

export function chooseWish(s: GameState, now: number, choice: 0 | 1): [GameState, ChooseWishResult] {
  if (!s.wish.pending) return [s, { ok: false, reason: 'no-pending' }];
  const next = clone(s);
  settleInPlace(next, now);
  const reward = WISH_BY_ID[next.wish.pending!.id].choices[choice].reward;
  const amount = wishRewardAmount(next, reward);
  next.wish.pending = null;
  if (reward.kind === 'stamina') {
    next.stamina.value += amount;
    return [next, { ok: true, kind: 'stamina', amount }];
  }
  if (reward.kind === 'gift') {
    const gift = GIFTS[Math.floor(roll(next) * GIFTS.length)].id;
    next.gifts[gift] = (next.gifts[gift] ?? 0) + 1;
    return [next, { ok: true, kind: 'gift', amount, gift }];
  }
  next.res[reward.kind] += amount;
  return [next, { ok: true, kind: reward.kind, amount }];
}

// ───────────────────────── 소동(겨루기) ─────────────────────────

export function stageInfo(index: number): StageInfo | null {
  if (index < 0 || index >= TOTAL_STAGES) return null;
  const chapterIndex = Math.floor(index / STAGES_PER_CHAPTER);
  const chapter = CHAPTERS[chapterIndex];
  const number = (index % STAGES_PER_CHAPTER) + 1;
  const isBoss = number === STAGES_PER_CHAPTER;
  const rewardMult = isBoss ? B.bossRewardMult : 1;

  // 판마다 다른 능력치를 겨룬다. 순번으로 정해지므로 언제나 같은 구성이다.
  let seed = index * 7919 + 13;
  const pick = () => {
    const [r, n] = nextRandom(seed);
    seed = n;
    return r;
  };
  const stats = [...STAT_KEYS];
  if (isBoss) {
    const sp = YOKAI_BY_ID[chapter.boss.yokai].specialty;
    stats.splice(stats.indexOf(sp), 1);
    stats.unshift(sp);
  } else {
    for (let i = stats.length - 1; i > 0; i--) {
      const j = Math.floor(pick() * (i + 1));
      [stats[i], stats[j]] = [stats[j], stats[i]];
    }
  }
  const factors = isBoss ? [1.15, 1, 0.9] : [0.85, 1, 1.15].sort(() => pick() - 0.5);
  const base = B.foeBase * Math.pow(B.foeGrowth, index) * (isBoss ? B.bossMult : 1);
  return {
    index,
    chapter,
    chapterIndex,
    number,
    isBoss,
    foe: isBoss ? chapter.boss.name : chapter.foes[number - 1],
    rounds: stats.slice(0, 3).map((stat, i) => ({ stat, value: Math.round(base * factors[i]) })),
    fame: Math.round(B.stageFameBase * Math.pow(B.stageFameGrowth, index) * rewardMult),
    coin: Math.round(B.stageCoinBase * Math.pow(B.stageCoinGrowth, index) * rewardMult),
  };
}

export function winChance(mine: number, foe: number): number {
  if (mine <= 0) return 0;
  const r = Math.pow(mine / foe, B.winSharpness);
  return r / (r + 1);
}

/** 세 판 중 두 판 이상 이길 확률 */
export function partyChance(ps: number[]): number {
  const [a, b, c] = ps;
  return a * b + a * c + b * c - 2 * a * b * c;
}

export function partyChances(s: GameState, info: StageInfo, party: string[]): number[] {
  return info.rounds.map((r, i) => (party[i] && s.yokai[party[i]] ? winChance(statsOf(s, party[i])[r.stat], r.value) : 0));
}

/** 이길 확률이 가장 높은 편성 */
export function bestParty(s: GameState, info: StageInfo): string[] {
  const ids = Object.keys(s.yokai);
  // 식객마다 판별 승률을 먼저 계산해 두고 조합만 비교한다.
  const p = ids.map((id) => {
    const st = statsOf(s, id);
    return info.rounds.map((r) => winChance(st[r.stat], r.value));
  });
  let best = [0, 1, 2];
  let bestP = -1;
  for (let a = 0; a < ids.length; a++)
    for (let b = 0; b < ids.length; b++)
      for (let c = 0; c < ids.length; c++) {
        if (a === b || a === c || b === c) continue;
        const chance = partyChance([p[a][0], p[b][1], p[c][2]]);
        if (chance > bestP) {
          bestP = chance;
          best = [a, b, c];
        }
      }
  return best.map((i) => ids[i]).filter(Boolean);
}

export interface RoundResult {
  stat: StatKey;
  id: string;
  mine: number;
  foe: number;
  chance: number;
  won: boolean;
}

export type FightResult =
  | { ok: true; won: boolean; stage: StageInfo; rounds: RoundResult[]; fame: number; coin: number; gift: string | null; recruit: string | null }
  | Fail<'all-clear' | 'no-stamina' | 'bad-party'>;

export function fight(s: GameState, now: number, party: string[]): [GameState, FightResult] {
  const info = stageInfo(s.stage.index);
  if (!info) return [s, { ok: false, reason: 'all-clear' }];
  if (party.length !== 3 || new Set(party).size !== 3 || party.some((id) => !s.yokai[id])) {
    return [s, { ok: false, reason: 'bad-party' }];
  }
  const next = clone(s);
  settleInPlace(next, now);
  if (next.stamina.value < 1) return [s, { ok: false, reason: 'no-stamina' }];
  if (next.stamina.value >= B.staminaMax) next.stamina.lastRegen = now;
  next.stamina.value -= 1;

  const rounds: RoundResult[] = info.rounds.map((r, i) => {
    const mine = statsOf(next, party[i])[r.stat];
    const chance = winChance(mine, r.value);
    return { stat: r.stat, id: party[i], mine, foe: r.value, chance, won: roll(next) < chance };
  });
  const won = rounds.filter((r) => r.won).length >= 2;
  if (!won) {
    next.totals.losses += 1;
    return [next, { ok: true, won, stage: info, rounds, fame: 0, coin: 0, gift: null, recruit: null }];
  }
  next.stage.index += 1;
  next.res.fame += info.fame;
  next.res.coin += info.coin;
  next.totals.wins += 1;
  const gift = GIFTS[Math.floor(roll(next) * GIFTS.length)].id;
  next.gifts[gift] = (next.gifts[gift] ?? 0) + 1;
  let recruit: string | null = null;
  if (info.isBoss && !next.yokai[info.chapter.boss.yokai]) {
    next.yokai[info.chapter.boss.yokai] = freshYokai();
    recruit = info.chapter.boss.yokai;
  }
  return [next, { ok: true, won, stage: info, rounds, fame: info.fame, coin: info.coin, gift, recruit }];
}
