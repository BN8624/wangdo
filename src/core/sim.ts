// 진행 속도 시뮬레이션. "부지런한 플레이어"가 정해진 시간마다 접속해 욕심껏 플레이한다고 가정하고
// 칭호·소동이 언제 열리는지 기록한다. 밸런스를 바꾸면 이 결과로 확인한다.

import {
  MINUTE,
  settle,
  partyPlan,
  chooseWish,
  feast,
  feastCost,
  fight,
  giftPrice,
  giveGift,
  hasAptitude,
  levelCap,
  levelCost,
  levelUp,
  newGame,
  nextRank,
  outing,
  outingPrice,
  ownedYokai,
  power,
  promote,
  promoteCheck,
  slotsPerWorkplace,
  stageInfo,
  statsOf,
  talk,
  talkReadyIn,
  outingReadyIn,
  useWish,
  STAT_KEYS,
  yokaiStats,
} from './engine';
import { RANKS } from '../data/ranks';
import { EPISODES } from '../data/story';
import { completeEpisode, isUnlocked, nextEpisode } from './story';
import { WORKPLACES } from '../data/village';
import { WISH_BY_ID } from '../data/wishes';
import { YOKAI_BY_ID } from '../data/yokai';
import type { GameState, WorkplaceId } from './types';

const HOUR = 60 * MINUTE;

export interface PlayProfile {
  name: string;
  /** 첫 접속에서 연속으로 플레이하는 시간(분) */
  firstSessionMinutes: number;
  /** 하루 중 접속하는 시각(시) */
  checkInHours: number[];
}

export const PROFILES: Record<string, PlayProfile> = {
  engaged: { name: '부지런', firstSessionMinutes: 30, checkInHours: [9, 11, 13, 15, 17, 19, 21, 23] },
  casual: { name: '가끔', firstSessionMinutes: 15, checkInHours: [9, 13, 21] },
};

export interface SimReport {
  profile: string;
  rankReachedAt: (number | null)[];
  bossClearedAt: (number | null)[];
  blockedBy: { power: number; fame: number }[];
  final: GameState;
}

/** 일터 배치: 칸마다 그 일터 능력치(적성 포함)가 가장 높은 식객을 넣는다. 엽전 일터를 먼저 채운다. */
function arrange(s: GameState, now: number): GameState {
  // 정산을 한 번 해 두고, 배치는 사본을 직접 고친다(시뮬레이션 속도를 위해).
  const next = settle(s, now);
  const order: WorkplaceId[] = ['market', 'woodyard', 'tavern', 'field'];
  const work: Record<WorkplaceId, string[]> = { market: [], woodyard: [], field: [], tavern: [] };
  const free = new Set(Object.keys(next.yokai));
  const stats = Object.fromEntries([...free].map((id) => [id, statsOf(next, id)]));
  for (let slot = 0; slot < slotsPerWorkplace(next.rank); slot++) {
    for (const wpId of order) {
      const wp = WORKPLACES.find((w) => w.id === wpId)!;
      let best: string | null = null;
      let bestV = -1;
      for (const id of free) {
        const v = stats[id][wp.stat] * (hasAptitude(YOKAI_BY_ID[id], wp) ? 1.5 : 1);
        if (v > bestV) [best, bestV] = [id, v];
      }
      if (best) {
        work[wpId].push(best);
        free.delete(best);
      }
    }
  }
  next.work = work;
  return next;
}

/** 한 번 접속했을 때 할 수 있는 걸 다 한다. */
export function playSession(s: GameState, now: number): GameState {
  for (const id of Object.keys(s.yokai)) if (talkReadyIn(s, id, now) === 0) s = talk(s, now, id, 8)[0];
  for (let guard = 0; guard < 10_000; guard++) {
    const before = s;
    s = step(s, now);
    if (s === before) break;
  }
  return arrange(s, now);
}

function step(s: GameState, now: number): GameState {
  if (s.wish.pending) {
    const wish = WISH_BY_ID[s.wish.pending.id];
    const fameIdx = wish.choices.findIndex((c) => c.reward.kind === 'fame');
    const target = nextRank(s);
    const wantFame = target && power(s) >= target.powerReq * 0.7 && s.res.fame < target.fameCost;
    const pick = (wantFame && fameIdx >= 0 ? fameIdx : fameIdx === 0 ? 1 : 0) as 0 | 1;
    return chooseWish(s, now, pick)[0];
  }
  const [afterWish, wishRes] = useWish(s, now);
  if (wishRes.ok) return afterWish;

  const ep = nextEpisode(s, EPISODES);
  if (ep && isUnlocked(s, ep)) return arrange(completeEpisode(s, ep, ep.scenes.map((sc) => (sc.choice ? 0 : null)))[0], now);

  const [afterPromote, promoteRes] = promote(s, now);
  if (promoteRes.ok) return arrange(afterPromote, now);

  const info = stageInfo(s.stage.index);
  if (info && s.stamina.value >= 1) {
    const { party, chance } = partyPlan(s, info);
    if (chance >= 0.45) {
      const [after, r] = fight(s, now, party);
      if (r.ok) return arrange(after, now);
    }
  }

  if (s.res.grain >= feastCost(s.rank)) return feast(s, now)[0];

  // 선물·나들이: 엽전이 넉넉할 때만(레벨업 비용의 몇 배)
  const cheapestLevel = Math.min(
    ...ownedYokai(s)
      .filter((o) => o.state.level < levelCap(s.rank))
      .map((o) => levelCost(o.def, o.state.level)),
    Infinity,
  );
  for (const { def } of ownedYokai(s)) {
    if (outingReadyIn(s, def.id, now) === 0 && s.res.coin > outingPrice(s.rank) * 10 && s.res.coin > cheapestLevel * 6) {
      return outing(s, now, def.id)[0];
    }
  }
  for (const { def } of ownedYokai(s)) {
    const g = def.likes[0];
    if (s.res.coin > giftPrice(g, s.rank) * 20 && s.res.coin > cheapestLevel * 10) return giveGift(s, now, def.id, g)[0];
  }

  // 엽전은 '위세 1당 비용'이 가장 싼 식객부터 올린다.
  let best: { id: string; value: number } | null = null;
  for (const { def, state } of ownedYokai(s)) {
    if (state.level >= levelCap(s.rank)) continue;
    const cost = levelCost(def, state.level);
    if (cost > s.res.coin) continue;
    const a = yokaiStats(def, state.level, state.bond);
    const b = yokaiStats(def, state.level + 1, state.bond);
    const gain = STAT_KEYS.reduce((sum, k) => sum + b[k] - a[k], 0);
    const value = cost / Math.max(gain, 0.5);
    if (!best || value < best.value) best = { id: def.id, value };
  }
  if (best) return levelUp(s, now, best.id, 1)[0];
  return s;
}

export function simulate(profile: PlayProfile, days: number, seed = 7): SimReport {
  const start = Date.UTC(2026, 0, 1, 9, 0, 0);
  let s = newGame(start, seed);
  const rankReachedAt: (number | null)[] = [0];
  const bossClearedAt: (number | null)[] = [];
  const blockedBy = RANKS.map(() => ({ power: 0, fame: 0 }));
  const record = (now: number) => {
    const check = promoteCheck(s);
    const b = (blockedBy[s.rank] ??= { power: 0, fame: 0 });
    if (!check.ok && check.reason === 'need-power') b.power++;
    if (!check.ok && check.reason === 'need-fame') b.fame++;
    const h = (now - start) / HOUR;
    for (let r = rankReachedAt.length; r <= s.rank; r++) rankReachedAt[r] = h;
    const bosses = Math.floor(s.stage.index / 8);
    for (let b = bossClearedAt.length; b < bosses; b++) bossClearedAt[b] = h;
  };

  for (let m = 0; m <= profile.firstSessionMinutes; m++) {
    const now = start + m * MINUTE;
    s = playSession(s, now);
    record(now);
  }
  for (let d = 0; d < days; d++) {
    for (const hour of profile.checkInHours) {
      const now = start + d * 24 * HOUR + (hour - 9) * HOUR;
      if (now <= start + profile.firstSessionMinutes * MINUTE) continue;
      s = playSession(s, now);
      record(now);
    }
  }
  return { profile: profile.name, rankReachedAt, bossClearedAt, blockedBy, final: s };
}
