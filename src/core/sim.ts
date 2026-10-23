// 진행 속도 시뮬레이션. "부지런한 플레이어"가 정해진 시간마다 접속해 욕심껏 플레이한다고 가정하고
// 칭호·소동이 언제 열리는지 기록한다. 밸런스를 바꾸면 이 결과로 확인한다.

import {
  MINUTE,
  challengeStage,
  chooseWish,
  collect,
  feast,
  feastCost,
  handsNeeded,
  levelCap,
  levelCost,
  levelUp,
  nextRank,
  newGame,
  ownedYokai,
  power,
  promote,
  promoteCheck,
  useWish,
  yokaiStats,
} from './engine';
import { RANKS } from '../data/ranks';
import { WISH_BY_ID } from '../data/wishes';
import { STAT_KEYS } from './engine';
import type { GameState } from './types';

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
  /** rankReachedAt[r] = r번째 칭호에 오른 시각(시간 단위, 시작 기준) */
  rankReachedAt: (number | null)[];
  /** 각 장의 대장을 달랜 시각(시간) */
  bossClearedAt: (number | null)[];
  /** blockedBy[r] = 칭호 r에서 승급을 못 한 접속 횟수(위세 부족 / 명성 부족) */
  blockedBy: { power: number; fame: number }[];
  final: GameState;
}

/** 한 번 접속했을 때 할 수 있는 걸 다 한다. */
export function playSession(s: GameState, now: number): GameState {
  [s] = collect(s, now);
  for (let guard = 0; guard < 10_000; guard++) {
    const before = s;
    s = step(s, now);
    if (s === before) break;
  }
  return s;
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

  const [afterPromote, promoteRes] = promote(s, now);
  if (promoteRes.ok) return afterPromote;

  const need = handsNeeded(s);
  if (need !== null && s.res.hands >= Math.min(need, 1)) {
    const [afterStage, stageRes] = challengeStage(s, now);
    if (stageRes.ok) return afterStage;
  }

  if (s.res.grain >= feastCost(s.rank)) return feast(s, now)[0];

  // 엽전은 '위세 1당 비용'이 가장 싼 식객부터 올린다.
  let best: { id: string; value: number } | null = null;
  for (const { def, level } of ownedYokai(s)) {
    if (level >= levelCap(s.rank)) continue;
    const cost = levelCost(def, level);
    if (cost > s.res.coin) continue;
    const a = yokaiStats(def, level);
    const b = yokaiStats(def, level + 1);
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
    if (!check.ok && check.reason === 'need-power') blockedBy[s.rank].power++;
    if (!check.ok && check.reason === 'need-fame') blockedBy[s.rank].fame++;
    const h = (now - start) / HOUR;
    for (let r = rankReachedAt.length; r <= s.rank; r++) rankReachedAt[r] = h;
    const bosses = Math.floor(s.stage.index / 8);
    for (let b = bossClearedAt.length; b < bosses; b++) bossClearedAt[b] = h;
  };

  // 첫 접속: 1분마다 확인하며 연속 플레이
  for (let m = 0; m <= profile.firstSessionMinutes; m++) {
    const now = start + m * MINUTE;
    s = playSession(s, now);
    record(now);
  }
  // 이후: 매일 정해진 시각에 접속
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
