// 게임 규칙. 모든 함수는 순수 함수다: 상태와 현재 시각을 받아 새 상태를 돌려주고, 입력 상태는 건드리지 않는다.
// 시간은 항상 인자로 받는다(Date.now()를 직접 부르지 않는다). 그래야 테스트와 시뮬레이션이 결정론적이다.

import { BALANCE as B } from '../data/balance';
import { rankDef } from '../data/ranks';
import { CHAPTERS, STAGES_PER_CHAPTER, TOTAL_STAGES } from '../data/stages';
import { BOND_LEVELS, COMBOS, GIFTS, GIFT_BY_ID, WORKPLACES } from '../data/village';
import { WISHES, WISH_BY_ID } from '../data/wishes';
import { SKILLS } from '../data/skills';
import { ITEM_BY_ID, type Slot } from '../data/items';
import { STARTERS, YOKAI, YOKAI_BY_ID } from '../data/yokai';
import { nextRandom } from './rng';
import { battleOdds, runBattle, type BattleLog, type BattleMods, type BattleSetup, type SkillKind } from './battle';
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
export const STAT_KEYS: StatKey[] = ['might', 'wit', 'politics', 'charm'];

export type Fail<R extends string> = { ok: false; reason: R };

export const freshYokai = (): YokaiState => ({ level: 1, bond: 0, talkAt: 0, outingAt: 0, seen: 0, talks: 0, exp: 0, gear: {} });

export function newGame(now: number, seed: number = now): GameState {
  return {
    version: 2,
    createdAt: now,
    lastSettled: now,
    rank: 0,
    res: { ...B.start },
    yokai: Object.fromEntries(STARTERS.map((id) => [id, freshYokai()])),
    work: { market: [], woodyard: [], field: [], tavern: [] },
    gifts: {},
    wish: { charges: B.wishBaseCharges, lastRegen: now, pending: null, recent: [] },
    stage: { index: 0 },
    combosSeen: [],
    rng: seed | 0,
    totals: { wishes: 0, feasts: 0, wins: 0, losses: 0, talks: 0, gifts: 0, earned: 0 },
    introSeen: false,
    guide: 0,
    story: { done: [], flags: [], won: [], losses: {} },
    inventory: {},
    adv: { cleared: [], floors: {}, chests: [], losses: {} },
    favorite: STARTERS[0] ?? '',
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

/** 낀 장비의 효과를 모은다. 개인 퀘스트 장신구는 그 주인이 끼면 1.5배 */
export interface GearEffects {
  flat: Partial<Stats>;
  pct: number;
  hp: number;
  skill: number;
  crit: number;
  weak: number;
  exp: number;
}

export function gearEffects(y: YokaiState | undefined, id: string): GearEffects {
  const g: GearEffects = { flat: {}, pct: 0, hp: 0, skill: 0, crit: 0, weak: 0, exp: 0 };
  for (const itemId of [y?.gear?.weapon, y?.gear?.trinket]) {
    const item = itemId ? ITEM_BY_ID[itemId] : undefined;
    if (!item) continue;
    const m = item.owner === id ? 1.5 : 1;
    for (const [k, v] of Object.entries(item.stats ?? {})) g.flat[k as StatKey] = (g.flat[k as StatKey] ?? 0) + (v ?? 0);
    g.pct += (item.pct ?? 0) * m;
    g.hp += (item.hp ?? 0) * m;
    g.skill += (item.skill ?? 0) * m;
    g.crit += (item.crit ?? 0) * m;
    g.weak += (item.weak ?? 0) * m;
    g.exp += (item.exp ?? 0) * m;
  }
  return g;
}

/** 실제 능력치: 레벨·인연에 장비를 더한다 */
export function statsOf(s: GameState, id: string): Stats {
  const y = s.yokai[id];
  const st = yokaiStats(YOKAI_BY_ID[id], y.level, y.bond);
  const g = gearEffects(y, id);
  for (const k of STAT_KEYS) st[k] = Math.floor((st[k] + (g.flat[k] ?? 0)) * (1 + g.pct));
  return st;
}

/** 기술 단계: 10·25·40레벨에 한 단계씩 오른다 */
export const skillTier = (level: number) => (level >= 40 ? 3 : level >= 25 ? 2 : level >= 10 ? 1 : 0);

/** 전투 보정: 장비 효과와 기술 단계 */
export function battleMods(s: GameState, id: string): BattleMods {
  const y = s.yokai[id];
  if (!y) return {};
  const g = gearEffects(y, id);
  return { hp: g.hp, skill: g.skill + skillTier(y.level) * B.skillTierBonus, crit: g.crit, weak: g.weak };
}

export function ownedYokai(s: GameState): { def: YokaiDef; state: YokaiState }[] {
  return YOKAI.filter((d) => s.yokai[d.id]).map((def) => ({ def, state: s.yokai[def.id] }));
}

export function totalStats(s: GameState): Stats {
  const sum: Stats = { might: 0, wit: 0, politics: 0, charm: 0 };
  for (const { def } of ownedYokai(s)) {
    const st = statsOf(s, def.id);
    for (const k of STAT_KEYS) sum[k] += st[k];
  }
  return sum;
}

/** 위세 = 모든 식객 능력치의 합 */
export function power(s: GameState): number {
  const t = totalStats(s);
  return t.might + t.wit + t.politics + t.charm;
}

export const MAX_LEVEL = 99;

/** 판마다 겨룰 능력치: 데리고 있는(나설 수 있는) 식객들의 특기 중에서 고르고, 모자라면 나머지 능력치로 채운다 */
export function roundStats(s: GameState, size: number, rand: () => number): StatKey[] {
  const shuffle = <T,>(xs: T[]) => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  };
  const specs = shuffle(STAT_KEYS.filter((k) => Object.keys(s.yokai).some((id) => YOKAI_BY_ID[id]?.specialty === k)));
  const rest = shuffle(STAT_KEYS.filter((k) => !specs.includes(k)));
  return [...specs, ...rest].slice(0, size);
}

/** 데리고 있는 식객의 평균 레벨(새로 합류하는 식객이 이 레벨로 온다) */
export function avgLevel(s: GameState): number {
  const owned = Object.values(s.yokai);
  return Math.max(1, Math.round(owned.reduce((a, y) => a + y.level, 0) / Math.max(1, owned.length)));
}

/** level → level+1에 필요한 경험치 */
export const expToNext = (level: number) => Math.round(B.expCurveBase * Math.pow(level, B.expCurveExp) + B.expCurveFlat);

/** 상대 레벨에 따른 한 판 경험치(대장은 더) */
export const battleExp = (foeLevel: number, boss = false) =>
  Math.round((B.expGainBase * Math.pow(Math.max(1, foeLevel), B.expGainExp) + B.expGainFlat) * (boss ? B.expBossMult : 1));

/** 상대 레벨에 따른 엽전·명성 보상 */
export const battleCoin = (foeLevel: number) => Math.round(B.battleCoinBase * Math.pow(Math.max(1, foeLevel), B.battleCoinExp) + B.battleCoinFlat);
export const battleFame = (foeLevel: number) => Math.round(B.battleFameBase * Math.pow(Math.max(1, foeLevel), B.battleFameExp) + 2);

export type FoeKind = 'field' | 'dungeon' | 'story' | 'boss';
/** 상대 레벨의 한 판 수치: 그 레벨 식객이 장비·인연을 갖췄을 때의 특기 능력치 × 종류 배율 */
export const foeValue = (level: number, kind: FoeKind) => (B.foeLevelBase + B.foeLevelGrowth * Math.max(1, level)) * B.foeKindMult[kind];

/** 경험치를 주고 레벨을 올린다(제자리에서 고친다). 레벨이 오른 식객 목록을 돌려준다 */
export function grantExp(s: GameState, id: string, amount: number): { id: string; from: number; to: number } | null {
  const y = s.yokai[id];
  if (!y || amount <= 0) return null;
  const from = y.level;
  y.exp = (y.exp ?? 0) + Math.round(amount * (1 + gearEffects(y, id).exp));
  while (y.level < MAX_LEVEL && y.exp >= expToNext(y.level)) {
    y.exp -= expToNext(y.level);
    y.level += 1;
  }
  if (y.level >= MAX_LEVEL) y.exp = 0;
  return y.level > from ? { id, from, to: y.level } : null;
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

function settleInPlace(s: GameState, now: number): void {
  // 시계가 뒤로 갔으면 아무것도 주지 않고 기준 시각만 맞춘다.
  if (now < s.lastSettled) {
    s.lastSettled = now;
    return;
  }
  const minutes = Math.min((now - s.lastSettled) / MINUTE, B.offlineCapMinutes);
  const rates = ratesPerMinute(s);
  for (const k of RESOURCE_KEYS) {
    s.res[k] += rates[k] * minutes;
    if (k !== 'fame') s.totals.earned += rates[k] * minutes;
  }
  s.lastSettled = now;
}

/** 다음 상소까지 더 이겨야 하는 판 수(상소는 기다려서가 아니라 싸워서 쌓인다) */
export const winsToPetition = (s: GameState) => B.winsPerPetition - (s.totals.wins % B.winsPerPetition);

// ───────────────────────── 장비·상점 ─────────────────────────

export type BuyResult = { ok: true; item: string } | Fail<'no-item' | 'not-sold' | 'no-coin'>;

/** 상점에서 장비를 산다 */
export function buyItem(s: GameState, now: number, itemId: string): [GameState, BuyResult] {
  const item = ITEM_BY_ID[itemId];
  if (!item) return [s, { ok: false, reason: 'no-item' }];
  if (!item.price) return [s, { ok: false, reason: 'not-sold' }];
  const next = clone(s);
  settleInPlace(next, now);
  if (next.res.coin < item.price) return [s, { ok: false, reason: 'no-coin' }];
  next.res.coin -= item.price;
  next.inventory[itemId] = (next.inventory[itemId] ?? 0) + 1;
  return [next, { ok: true, item: itemId }];
}

export type EquipResult = { ok: true } | Fail<'not-owned' | 'no-item' | 'wrong-slot'>;

/** 장비를 낀다(itemId가 null이면 뺀다). 끼던 것은 소지품으로 돌아간다 */
export function equip(s: GameState, now: number, id: string, slot: Slot, itemId: string | null): [GameState, EquipResult] {
  if (!s.yokai[id]) return [s, { ok: false, reason: 'not-owned' }];
  if (itemId) {
    const item = ITEM_BY_ID[itemId];
    if (!item) return [s, { ok: false, reason: 'no-item' }];
    if (item.slot !== slot) return [s, { ok: false, reason: 'wrong-slot' }];
    if (!(s.inventory[itemId] > 0)) return [s, { ok: false, reason: 'no-item' }];
  }
  // 일터 생산량이 바뀌므로 먼저 정산한다
  const next = clone(s);
  settleInPlace(next, now);
  const y = next.yokai[id];
  const old = y.gear[slot];
  if (old) next.inventory[old] = (next.inventory[old] ?? 0) + 1;
  if (itemId) {
    next.inventory[itemId] -= 1;
    if (next.inventory[itemId] <= 0) delete next.inventory[itemId];
    y.gear = { ...y.gear, [slot]: itemId };
  } else {
    const gear = { ...y.gear };
    delete gear[slot];
    y.gear = gear;
  }
  return [next, { ok: true }];
}

/** 장비 하나를 소지품에 넣는다(제자리에서 고친다) */
export function addItem(s: GameState, itemId: string, count = 1) {
  if (!ITEM_BY_ID[itemId]) return;
  s.inventory[itemId] = (s.inventory[itemId] ?? 0) + count;
}

// ───────────────────────── 인연 ─────────────────────────

export type BondResult = { ok: true; gained: number; from: number; to: number };

function addBond(s: GameState, id: string, amount: number): BondResult {
  const y = s.yokai[id];
  const from = bondLevel(y.bond);
  y.bond += amount;
  return { ok: true, gained: amount, from, to: bondLevel(y.bond) };
}

/** 아직 듣지 않은 대화가 남았는지(새 대화만 호감도를 올린다) */
export const hasNewTalk = (s: GameState, id: string) => (s.yokai[id]?.talks ?? 0) < B.talkTopics;
export const priceAt = (base: number, rank: number) => Math.round(base * Math.pow(B.priceGrowth, rank));
export const giftPrice = (giftId: string, rank: number) => priceAt(GIFT_BY_ID[giftId].cost, rank);
export const outingPrice = (rank: number) => priceAt(B.outingCost, rank);

/** 대화. delta는 고른 대답의 점수(1·4·8). 언제든 할 수 있고, 처음 듣는 대화만 호감도를 올린다 */
export function talk(s: GameState, now: number, id: string, delta: number): [GameState, BondResult | Fail<'not-owned'>] {
  if (!s.yokai[id]) return [s, { ok: false, reason: 'not-owned' }];
  const next = clone(s);
  settleInPlace(next, now);
  const d = [1, 4, 8].includes(delta) ? delta : 1;
  const fresh = hasNewTalk(next, id);
  next.yokai[id].talkAt = now;
  next.yokai[id].talks += 1;
  next.totals.talks += 1;
  return [next, addBond(next, id, fresh ? d * B.talkMult : 0)];
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

export function outing(s: GameState, now: number, id: string): [GameState, BondResult | Fail<'not-owned' | 'no-coin'>] {
  if (!s.yokai[id]) return [s, { ok: false, reason: 'not-owned' }];
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

/** 궁궐 화면에 세울 대표 식객을 바꾼다. */
export function setFavorite(s: GameState, id: string): GameState {
  return s.yokai[id] ? { ...s, favorite: id } : s;
}

export function markSceneSeen(s: GameState, id: string, level: number): GameState {
  const next = clone(s);
  next.yokai[id].seen = Math.max(next.yokai[id].seen, level);
  return next;
}

// ───────────────────────── 잔치·승급 ─────────────────────────

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
  return rankDef(s.rank + 1);
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
  const target = rankDef(s.rank + 1);
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
      const target = nextRank(s) ?? rankDef(s.rank);
      return Math.max(1, Math.ceil((target.fameCost * reward.pct * B.wishRewardScale) / 100));
    }
    case 'exp':
      return battleExp(avgLevel(s)) * reward.amount;
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
  if (reward.kind === 'exp') {
    for (const id of Object.keys(next.yokai)) grantExp(next, id, amount);
    return [next, { ok: true, kind: 'exp', amount }];
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

/** 졸개가 가질 수 있는 약점 기술 */
const WEAK_KINDS: SkillKind[] = ['strike', 'stun', 'guard', 'weaken', 'rally'];

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
    const sp = chapter.boss.stat;
    stats.splice(stats.indexOf(sp), 1);
    stats.unshift(sp);
  } else {
    for (let i = stats.length - 1; i > 0; i--) {
      const j = Math.floor(pick() * (i + 1));
      [stats[i], stats[j]] = [stats[j], stats[i]];
    }
  }
  const factors = isBoss ? [1.15, 1, 0.9] : [0.85, 1, 1.15].sort(() => pick() - 0.5);
  // 약점 기술: 대장은 장마다 정해 두고, 졸개는 순번으로 고른다(치유는 약점이 되지 않는다)
  const weak = isBoss ? chapter.boss.weak : WEAK_KINDS[Math.floor(pick() * WEAK_KINDS.length)];
  const base = B.foeBase * Math.pow(B.foeGrowth, index) * (isBoss ? B.bossMult : 1);
  return {
    index,
    chapter,
    chapterIndex,
    number,
    isBoss,
    foe: isBoss ? chapter.boss.name : chapter.foes[number - 1],
    rounds: stats.slice(0, 3).map((stat, i) => ({ stat, value: Math.round(base * factors[i]) })),
    weak,
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

/** 편성 순서대로 식객이 맡은 능력치로 상대와 싸운다 */
export function battleSetup(s: GameState, info: StageInfo, party: string[]): BattleSetup {
  return {
    allies: info.rounds.map((r, i) => ({
      id: party[i],
      stat: r.stat,
      power: party[i] && s.yokai[party[i]] ? statsOf(s, party[i])[r.stat] : 0,
      skill: SKILLS[party[i]],
      mods: battleMods(s, party[i]),
    })),
    foe: { name: info.foe, values: info.rounds.map((r) => r.value), weak: info.weak },
  };
}

/** 실제 전투를 여러 번 돌려 본 승률 */
export function battleChance(s: GameState, info: StageInfo, party: string[]): number {
  if (party.length !== info.rounds.length || party.some((id) => !s.yokai[id])) return 0;
  return battleOdds(battleSetup(s, info, party));
}

/** ids에서 서로 다른 n명을 골라 순서대로 늘어놓는 모든 경우(칸마다 후보가 다를 수 있다) */
function arrangements(cands: string[][]): string[][] {
  const out: string[][] = [];
  const walk = (i: number, acc: string[]) => {
    if (i === cands.length) return void out.push(acc);
    for (const id of cands[i]) if (!acc.includes(id)) walk(i + 1, [...acc, id]);
  };
  walk(0, []);
  return out;
}

/** 판마다 따로 이길 확률만 보고 고른 편성(식객이 많을 때 후보를 추리는 데 쓴다) */
function quickParty(s: GameState, info: StageInfo, ids: string[]): string[] {
  const p = Object.fromEntries(ids.map((id) => [id, info.rounds.map((r) => winChance(statsOf(s, id)[r.stat], r.value))]));
  let best: string[] = ids.slice(0, info.rounds.length);
  let bestP = -1;
  for (const party of arrangements(info.rounds.map(() => ids))) {
    const ps = party.map((id, i) => p[id][i]);
    // 세 판이면 두 판 이상, 그보다 적으면 모든 판을 이길 확률로 견준다
    const chance = ps.length === 3 ? partyChance(ps) : ps.reduce((a, b) => a * b, 1);
    if (chance > bestP) [bestP, best] = [chance, party];
  }
  return best;
}

/** 이길 확률이 가장 높은 편성. 칸마다 그 능력치가 높은 식객을 몇 명씩 추린 뒤, 고유 기술까지 넣은 실제 전투로 비교한다. */
export function bestParty(s: GameState, info: StageInfo): string[] {
  const ids = Object.keys(s.yokai);
  const n = info.rounds.length;
  if (ids.length < n) return quickParty(s, info, ids);
  const stats = Object.fromEntries(ids.map((id) => [id, statsOf(s, id)]));
  const picks = info.rounds.map((r) => [...ids].sort((a, b) => stats[b][r.stat] - stats[a][r.stat]).slice(0, B.partyPick));
  let best: string[] = [];
  let bestP = -1;
  let bestPower = -1;
  for (const party of arrangements(picks)) {
    const odds = battleOdds(battleSetup(s, info, party), B.partyRuns);
    const pow = party.reduce((sum, id, i) => sum + stats[id][info.rounds[i].stat], 0);
    if (odds > bestP || (odds === bestP && pow > bestPower)) {
      bestP = odds;
      bestPower = pow;
      best = party;
    }
  }
  return best.length === n ? best : quickParty(s, info, ids);
}

// 추천 편성 계산은 무거우므로(실제 전투를 여러 번 돌린다), 토벌과 식객 능력치가 같으면 앞서 계산한 결과를 다시 쓴다.
const plans = new Map<string, { party: string[]; chance: number }>();

/** 추천 편성과 그 편성의 승률. 화면 알림처럼 자주 묻는 곳에서 쓴다. */
export function partyPlan(s: GameState, info: StageInfo): { party: string[]; chance: number } {
  const key = `${info.index}|${info.rounds.map((r) => r.stat + r.value).join(',')}|${Object.keys(s.yokai)
    .map((id) => `${id}:${Object.values(statsOf(s, id)).join(',')}:${Object.values(battleMods(s, id)).join(',')}`)
    .join('|')}`;
  let plan = plans.get(key);
  if (!plan) {
    const party = bestParty(s, info);
    plan = { party, chance: battleChance(s, info, party) };
    if (plans.size > 2000) plans.clear();
    plans.set(key, plan);
  }
  return plan;
}

export type LevelUp = { id: string; from: number; to: number };

export type FightResult =
  | {
      ok: true;
      won: boolean;
      stage: StageInfo;
      battle: BattleLog;
      fame: number;
      coin: number;
      gift: string | null;
      recruit: string | null;
      /** 나선 식객 한 명이 받은 경험치, 레벨이 오른 식객, 얻은 장비 */
      exp?: number;
      ups?: LevelUp[];
      drops?: string[];
      /** 모험: 연 보물상자, 끝낸 던전·퀘스트, 퀘스트 보상 장비 */
      chest?: { item?: string; coin?: number };
      cleared?: string;
      reward?: string;
    }
  | Fail<'all-clear' | 'bad-party'>;

/** 치른 전투의 결과(이겼든 졌든) */
export type Won = Extract<FightResult, { ok: true }>;

/** 전투를 치르고 보상을 나눈다. next: 이미 정산한 사본(제자리에서 고친다), arena: 나설 식객(손님 포함)이 든 상태.
 *  나선 식객은 경험치를 다 받고 쉬던 식객은 일부를 받는다. 지면 경험치·엽전·명성의 일부만 받는다. */
export function playBattle(
  next: GameState,
  arena: GameState,
  info: StageInfo,
  party: string[],
  o: { boss?: boolean; drop?: string; giftChance?: number } = {},
): Won {
  const battle = runBattle(battleSetup(arena, info, party), Math.floor(roll(next) * 4294967296));
  const won = battle.won;
  const exp = Math.round(battleExp(info.level ?? 1, o.boss) * (won ? 1 : B.expLoseRatio));
  const ups: LevelUp[] = [];
  for (const id of Object.keys(next.yokai)) {
    const up = grantExp(next, id, exp * (party.includes(id) ? 1 : B.expBenchRatio));
    if (up) ups.push(up);
  }
  const fame = won ? info.fame : Math.round(info.fame * B.loseRewardRatio);
  const coin = won ? info.coin : Math.round(info.coin * B.loseRewardRatio);
  next.res.fame += fame;
  next.res.coin += coin;
  next.totals = { ...next.totals, [won ? 'wins' : 'losses']: next.totals[won ? 'wins' : 'losses'] + 1 };
  // 함께 싸운 식객은 정이 든다. 이길수록 상소가 쌓인다.
  for (const id of party) if (next.yokai[id]) next.yokai[id].bond += won ? B.battleBond : 1;
  if (won && next.totals.wins % B.winsPerPetition === 0) next.wish = { ...next.wish, charges: next.wish.charges + 1 };
  const drops: string[] = [];
  if (won && o.drop && ITEM_BY_ID[o.drop]) {
    addItem(next, o.drop);
    drops.push(o.drop);
  }
  let gift: string | null = null;
  if (won && roll(next) < (o.giftChance ?? 0)) {
    gift = GIFTS[Math.floor(roll(next) * GIFTS.length)].id;
    next.gifts[gift] = (next.gifts[gift] ?? 0) + 1;
  }
  return { ok: true, won, stage: info, battle, fame, coin, gift, recruit: null, exp, ups, drops };
}

