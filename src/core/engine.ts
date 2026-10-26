// 게임 규칙. 모든 함수는 순수 함수다: 상태와 현재 시각을 받아 새 상태를 돌려주고, 입력 상태는 건드리지 않는다.
// 시간은 항상 인자로 받는다(Date.now()를 직접 부르지 않는다). 그래야 테스트와 시뮬레이션이 결정론적이다.
// 전투는 combat.ts, 캠페인은 campaign.ts, 모집은 gacha.ts, 방치 보상·수련장은 idle.ts, 능력치는 units.ts.

import { BALANCE as B } from '../data/balance';
import { rankDef } from '../data/ranks';
import { GIFTS, GIFT_BY_ID } from '../data/village';
import { WISHES, WISH_BY_ID } from '../data/wishes';
import { ITEM_BY_ID, type Slot } from '../data/items';
import { STARTERS, YOKAI_BY_ID } from '../data/yokai';
import { nextRandom } from './rng';
import { bondLevel } from './bond';
import { runCombat, type CombatResult } from './combat';
import { applyStage, battleSeed, stageSetup, type StageDef, type StageReward } from './campaign';
import { afkRates, applyTrain, trainReward, trainSetup } from './idle';
import { heroPower, levelCap, levelCoinCost, levelExpCost, startStars, starCost } from './units';
import type { GameState, RankDef, ResourceKey, WishDef, WishReward, YokaiState } from './types';

export { bondLevel } from './bond';

export const MINUTE = 60_000;
export const RESOURCE_KEYS: ResourceKey[] = ['coin', 'jade', 'exp'];

export type Fail<R extends string> = { ok: false; reason: R };

export const freshYokai = (id: string): YokaiState => ({ level: 1, stars: startStars(id), shards: 0, bond: 0, talkAt: 0, outingAt: 0, seen: 0, talks: 0, gear: {} });

export function newGame(now: number, seed: number = now): GameState {
  return {
    version: 3,
    createdAt: now,
    lastSettled: now,
    rank: 0,
    res: { ...B.start },
    yokai: Object.fromEntries(STARTERS.map((id) => [id, freshYokai(id)])),
    team: [STARTERS[0] ?? '', '', '', '', ''],
    gifts: {},
    wish: { charges: B.wishBaseCharges, lastRegen: now, pending: null, recent: [] },
    rng: seed | 0,
    totals: { wishes: 0, wins: 0, losses: 0, talks: 0, gifts: 0, pulls: 0, stages: 0 },
    introSeen: false,
    guide: 0,
    story: { done: [], flags: [], watched: [] },
    camp: { stars: {} },
    gacha: { pulls: 0, pity: 0, firstTen: false },
    afk: { since: now },
    inventory: {},
    favorite: STARTERS[0] ?? '',
  };
}

const clone = (s: GameState): GameState => structuredClone(s);

function roll(s: GameState): number {
  const [r, next] = nextRandom(s.rng);
  s.rng = next;
  return r;
}

/** 화면에 보여 줄 상태(지금은 시각만 맞춘다. 방치 보상은 상자를 열 때 받는다) */
export function settle(s: GameState, now: number): GameState {
  if (s.lastSettled === now) return s;
  return { ...s, lastSettled: Math.max(s.lastSettled, now) };
}

// ───────────────────────── 관직(계정 레벨) ─────────────────────────

/** 관직 r에 오르는 누적 명성 */
export const rankFame = (r: number) => Math.round(B.rankFameBase * Math.pow(Math.max(0, r), B.rankFameExp));
export const nextRank = (s: GameState): RankDef => rankDef(s.rank + 1);

/** 명성이 찼으면 관직을 올리고 옥을 준다(제자리에서 고친다). 오른 관직 목록을 돌려준다 */
export function rankUp(s: GameState): number[] {
  const ups: number[] = [];
  while (s.res.fame >= rankFame(s.rank + 1)) {
    s.rank += 1;
    s.res.jade += B.rankJade + 20 * s.rank;
    ups.push(s.rank);
  }
  return ups;
}

// ───────────────────────── 성장 ─────────────────────────

export type LevelResult = { ok: true; levels: number; exp: number; coin: number } | Fail<'not-owned' | 'cap' | 'no-exp' | 'no-coin'>;

/** 수련치·엽전으로 레벨을 올린다(최대 times번, 상한까지) */
export function levelUp(s: GameState, id: string, times = 1): [GameState, LevelResult] {
  const y = s.yokai[id];
  if (!y) return [s, { ok: false, reason: 'not-owned' }];
  const cap = levelCap(y.stars);
  if (y.level >= cap) return [s, { ok: false, reason: 'cap' }];
  if (s.res.exp < levelExpCost(y.level)) return [s, { ok: false, reason: 'no-exp' }];
  if (s.res.coin < levelCoinCost(y.level)) return [s, { ok: false, reason: 'no-coin' }];
  const next = clone(s);
  const ny = next.yokai[id];
  let levels = 0;
  let exp = 0;
  let coin = 0;
  while (levels < times && ny.level < cap) {
    const e = levelExpCost(ny.level);
    const c = levelCoinCost(ny.level);
    if (next.res.exp < e || next.res.coin < c) break;
    next.res.exp -= e;
    next.res.coin -= c;
    exp += e;
    coin += c;
    ny.level += 1;
    levels += 1;
  }
  return [next, { ok: true, levels, exp, coin }];
}

/** 지금 가진 재화로 몇 레벨 올릴 수 있는지와 그 비용 */
export function affordable(s: GameState, id: string, times: number): { levels: number; exp: number; coin: number } {
  const y = s.yokai[id];
  if (!y) return { levels: 0, exp: 0, coin: 0 };
  let level = y.level;
  let exp = 0;
  let coin = 0;
  let levels = 0;
  const cap = levelCap(y.stars);
  while (levels < times && level < cap) {
    const e = levelExpCost(level);
    const c = levelCoinCost(level);
    if (s.res.exp < exp + e || s.res.coin < coin + c) break;
    exp += e;
    coin += c;
    level += 1;
    levels += 1;
  }
  return { levels, exp, coin };
}

export type StarResult = { ok: true; stars: number; used: number; memory: number } | Fail<'not-owned' | 'max' | 'no-shards'>;

/** 조각으로 별을 올린다. 모자라면 기억 조각(아무 식객에게나 쓰는 조각)으로 채운다 */
export function starUp(s: GameState, id: string): [GameState, StarResult] {
  const y = s.yokai[id];
  if (!y) return [s, { ok: false, reason: 'not-owned' }];
  const cost = starCost(y.stars);
  if (cost === null) return [s, { ok: false, reason: 'max' }];
  const memory = s.inventory.memory ?? 0;
  if (y.shards + memory < cost) return [s, { ok: false, reason: 'no-shards' }];
  const next = clone(s);
  const ny = next.yokai[id];
  const own = Math.min(ny.shards, cost);
  const mem = cost - own;
  ny.shards -= own;
  if (mem > 0) {
    next.inventory.memory = memory - mem;
    if (next.inventory.memory <= 0) delete next.inventory.memory;
  }
  ny.stars += 1;
  return [next, { ok: true, stars: ny.stars, used: own, memory: mem }];
}

// ───────────────────────── 편성 ─────────────────────────

export function setTeam(s: GameState, team: string[]): GameState {
  const clean = team.slice(0, 5).map((id) => (id && s.yokai[id] ? id : ''));
  const seen = new Set<string>();
  const unique = clean.map((id) => (id && !seen.has(id) ? (seen.add(id), id) : ''));
  while (unique.length < 5) unique.push('');
  return { ...s, team: unique };
}

/** 전투력이 높은 순으로 다섯 */
export function autoTeam(s: GameState): string[] {
  const ids = Object.keys(s.yokai).sort((a, b) => heroPower(s, b, []) - heroPower(s, a, []));
  const team = ids.slice(0, 5);
  while (team.length < 5) team.push('');
  return team;
}

// ───────────────────────── 전투 ─────────────────────────

export interface StageOutcome {
  won: boolean;
  first: boolean;
  stars: number;
  reward: StageReward;
  ranks: number[];
}

/** 치른 캠페인 전투의 결과를 반영한다(화면이 전투를 재생한 뒤 부른다) */
export function finishStage(s: GameState, st: StageDef, team: string[], result: CombatResult): [GameState, StageOutcome] {
  const next = clone(s);
  const { first, stars, reward } = applyStage(next, st, team, result);
  const ranks = rankUp(next);
  return [next, { won: result.won, first, stars, reward, ranks }];
}

/** 자동으로 끝까지 싸워 결과까지 반영한다(모의 플레이·테스트용) */
export function fightStage(s: GameState, st: StageDef, team: string[] = s.team) {
  const { events, result } = runCombat(stageSetup(s, st, team), battleSeed(s, st.id, team));
  const [next, outcome] = finishStage(s, st, team, result);
  return { state: next, outcome, events, result };
}

export function finishTrain(s: GameState, tier: number, team: string[], result: CombatResult): [GameState, { won: boolean; reward: ReturnType<typeof trainReward> | null; ranks: number[] }] {
  const next = clone(s);
  const reward = applyTrain(next, tier, team, result);
  return [next, { won: result.won, reward, ranks: rankUp(next) }];
}

export function fightTrain(s: GameState, tier: number, team: string[] = s.team, salt = 0) {
  const { events, result } = runCombat(trainSetup(s, tier, team), battleSeed(s, `train${tier}#${salt}`, team));
  const [next, outcome] = finishTrain(s, tier, team, result);
  return { state: next, outcome, events, result };
}

// ───────────────────────── 장비 ─────────────────────────

export type BuyResult = { ok: true; item: string } | Fail<'no-item' | 'not-sold' | 'no-coin'>;

export function buyItem(s: GameState, itemId: string): [GameState, BuyResult] {
  const item = ITEM_BY_ID[itemId];
  if (!item) return [s, { ok: false, reason: 'no-item' }];
  if (!item.price) return [s, { ok: false, reason: 'not-sold' }];
  if (s.res.coin < item.price) return [s, { ok: false, reason: 'no-coin' }];
  const next = clone(s);
  next.res.coin -= item.price;
  next.inventory[itemId] = (next.inventory[itemId] ?? 0) + 1;
  return [next, { ok: true, item: itemId }];
}

export type EquipResult = { ok: true } | Fail<'not-owned' | 'no-item' | 'wrong-slot'>;

/** 장비를 낀다(itemId가 null이면 뺀다). 끼던 것은 소지품으로 돌아간다 */
export function equip(s: GameState, id: string, slot: Slot, itemId: string | null): [GameState, EquipResult] {
  if (!s.yokai[id]) return [s, { ok: false, reason: 'not-owned' }];
  if (itemId) {
    const item = ITEM_BY_ID[itemId];
    if (!item) return [s, { ok: false, reason: 'no-item' }];
    if (item.slot !== slot) return [s, { ok: false, reason: 'wrong-slot' }];
    if (!(s.inventory[itemId] > 0)) return [s, { ok: false, reason: 'no-item' }];
  }
  const next = clone(s);
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
  const d = [1, 4, 8].includes(delta) ? delta : 1;
  const fresh = hasNewTalk(next, id);
  next.yokai[id].talkAt = now;
  next.yokai[id].talks += 1;
  next.totals.talks += 1;
  return [next, addBond(next, id, fresh ? d * B.talkMult : 0)];
}

/** 선물. 가진 게 없으면 그 자리에서 사서 준다. */
export function giveGift(s: GameState, id: string, giftId: string): [GameState, (BondResult & { liked: boolean; bought: boolean }) | Fail<'not-owned' | 'no-coin'>] {
  if (!s.yokai[id] || !GIFT_BY_ID[giftId]) return [s, { ok: false, reason: 'not-owned' }];
  const owned = (s.gifts[giftId] ?? 0) > 0;
  const price = giftPrice(giftId, s.rank);
  if (!owned && s.res.coin < price) return [s, { ok: false, reason: 'no-coin' }];
  const next = clone(s);
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
  next.res.coin -= price;
  next.yokai[id].outingAt = now;
  return [next, addBond(next, id, B.outingBond)];
}

/** 아직 안 본 인연 장면 단계(없으면 0) */
export function unseenScene(s: GameState, id: string): number {
  const y = s.yokai[id];
  return y && bondLevel(y.bond) > y.seen ? y.seen + 1 : 0;
}

export function setFavorite(s: GameState, id: string): GameState {
  return s.yokai[id] ? { ...s, favorite: id } : s;
}

export function markSceneSeen(s: GameState, id: string, level: number): GameState {
  const next = clone(s);
  next.yokai[id].seen = Math.max(next.yokai[id].seen, level);
  return next;
}

/** 본 컷신을 기록한다 */
export function markWatched(s: GameState, key: string): GameState {
  if (s.story.watched.includes(key)) return s;
  return { ...s, story: { ...s.story, watched: [...s.story.watched, key] } };
}

/** 이야기 선택지를 고른다: 깃발·인연·재화를 바로 반영한다 */
export function choose(s: GameState, effects: { bond?: Record<string, number>; flags?: string[]; res?: Partial<Record<string, number>> } | undefined): GameState {
  if (!effects) return s;
  const next = clone(s);
  for (const [id, amount] of Object.entries(effects.bond ?? {})) if (next.yokai[id]) next.yokai[id].bond += amount;
  for (const f of effects.flags ?? []) if (!next.story.flags.includes(f)) next.story.flags.push(f);
  for (const [k, v] of Object.entries(effects.res ?? {})) {
    const key = k === 'grain' ? 'exp' : k;
    if (key in next.res) next.res[key as ResourceKey] += v ?? 0;
  }
  rankUp(next);
  return next;
}

// ───────────────────────── 정무(상소) ─────────────────────────

export type UseWishResult = { ok: true; wish: WishDef } | Fail<'no-charge'>;

export function useWish(s: GameState): [GameState, UseWishResult] {
  if (s.wish.pending) return [s, { ok: true, wish: WISH_BY_ID[s.wish.pending.id] }];
  if (s.wish.charges <= 0) return [s, { ok: false, reason: 'no-charge' }];
  const next = clone(s);
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

/** 보상 미리보기 수치. coin·grain은 방치 보상 몇 분어치(grain은 수련치), exp는 수련장 몇 판어치 수련치 */
export function wishRewardAmount(s: GameState, reward: WishReward): number {
  const rates = afkRates(s);
  switch (reward.kind) {
    case 'fame': {
      const need = rankFame(s.rank + 1) - rankFame(s.rank);
      return Math.max(1, Math.ceil((need * reward.pct * B.wishRewardScale) / 100));
    }
    case 'exp':
      return trainReward(0).exp * reward.amount * Math.max(1, s.rank);
    case 'gift':
      return 1;
    case 'coin':
      return Math.max(B.wishMinReward, Math.round(rates.coin * reward.minutes * B.wishRewardScale * 4));
    case 'grain':
      return Math.max(B.wishMinReward, Math.round(rates.exp * reward.minutes * B.wishRewardScale * 4));
  }
}

export type ChooseWishResult = { ok: true; kind: 'coin' | 'exp' | 'fame' | 'gift'; amount: number; gift?: string } | Fail<'no-pending'>;

export function chooseWish(s: GameState, choice: 0 | 1): [GameState, ChooseWishResult] {
  if (!s.wish.pending) return [s, { ok: false, reason: 'no-pending' }];
  const next = clone(s);
  const reward = WISH_BY_ID[s.wish.pending.id].choices[choice].reward;
  const amount = wishRewardAmount(next, reward);
  next.wish.pending = null;
  if (reward.kind === 'gift') {
    const gift = GIFTS[Math.floor(roll(next) * GIFTS.length)].id;
    next.gifts[gift] = (next.gifts[gift] ?? 0) + 1;
    return [next, { ok: true, kind: 'gift', amount, gift }];
  }
  const kind = reward.kind === 'grain' || reward.kind === 'exp' ? 'exp' : reward.kind;
  next.res[kind] += amount;
  rankUp(next);
  return [next, { ok: true, kind, amount }];
}
