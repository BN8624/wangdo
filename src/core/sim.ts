// 모의 플레이(수집형). 쉬지 않고 하는 사람이 캠페인을 밀어 나가며 모집·성장·수련을 하는 데 걸리는 시간을 잰다.
// 밸런스(적 세기·보상·비용)를 바꾸면 `npm run simulate`로 이 결과를 확인한다.
//
// 사람의 시간: 전투 한 판 = 0.4분 + 라운드당 0.06분(2배속으로 본다고 친다), 장 하나의 컷신 4분, 모집 0.3분.
// 사람처럼: 다음 스테이지를 자동 편성으로 붙어 보고, 지면 같은 조건으로 다시 붙지 않고 수련장에서 키운 뒤 다시 온다.
// 옥이 1,000 모이면 열 번 모집, 조각이 차면 별 올리기, 수련치·엽전은 편성의 가장 낮은 레벨부터.

import { BALANCE as B } from '../data/balance';
import { ITEM_BY_ID, type Slot } from '../data/items';
import { EPISODES } from '../data/story';
import { STAGES, battleSeed, nextStage, stageSetup, stagePower, type StageDef } from './campaign';
import { runCombat } from './combat';
import { autoTeam, chooseWish, finishStage, finishTrain, equip, levelUp, newGame, rankUp, setTeam, starUp, tradeMemory, useWish } from './engine';
import { pull } from './gacha';
import { claimAfk, trainOpen, trainSetup, TRAIN_LEVELS } from './idle';
import type { GameState } from './types';
import { levelCap, teamPower } from './units';

const MINUTE = 60_000;

export interface RunReport {
  /** 장을 다 깬 때(분) */
  chapterAt: Record<string, number>;
  /** 장을 깰 때 편성 전투력·평균 레벨 */
  powerAt: Record<string, number>;
  levelAt: Record<string, number>;
  battles: { stage: number; train: number; losses: number };
  pulls: number;
  ssr: number;
  minutes: number;
  stuck: string | null;
  final: GameState;
}

const battleMinutes = (rounds: number) => 0.4 + rounds * 0.06;

/** 편성 다섯을 고르게 키운다: 가장 낮은 레벨부터 한 레벨씩 */
function levelTeam(s: GameState): GameState {
  for (let guard = 0; guard < 2000; guard++) {
    const ids = s.team.filter(Boolean).filter((id) => s.yokai[id].level < levelCap(s.yokai[id].stars));
    if (!ids.length) return s;
    const id = ids.sort((a, b) => s.yokai[a].level - s.yokai[b].level)[0];
    const [next, r] = levelUp(s, id, 1);
    if (!r.ok || r.levels === 0) return s;
    s = next;
  }
  return s;
}

function starTeam(s: GameState): GameState {
  for (const id of Object.keys(s.yokai)) {
    for (let guard = 0; guard < 6; guard++) {
      const useMemory = s.team.includes(id);
      const y = s.yokai[id];
      const cost = B.starCost[y.stars];
      if (y.stars >= 6 || (!useMemory && y.shards < cost)) break;
      const [next, r] = starUp(s, id);
      if (!r.ok) break;
      s = next;
    }
  }
  return s;
}

const gearScore = (id: string | undefined) => (id ? ITEM_BY_ID[id]?.tier ?? 0 : 0);

function gearTeam(s: GameState): GameState {
  for (const id of s.team.filter(Boolean)) {
    for (const slot of ['weapon', 'trinket'] as Slot[]) {
      const best = Object.keys(s.inventory)
        .filter((k) => s.inventory[k] > 0 && ITEM_BY_ID[k]?.slot === slot)
        .sort((a, b) => gearScore(b) - gearScore(a))[0];
      if (best && gearScore(best) > gearScore(s.yokai[id].gear[slot])) s = equip(s, id, slot, best)[0];
    }
  }
  return s;
}

/** gacha: false면 모집을 한 번도 하지 않고 옥을 모두 기억 조각으로 바꾼다(운에 기대지 않는 길도 끝까지 가는지) */
export function simulateRun(maxMinutes = 40 * 60, seed = 7, opts: { gacha?: boolean } = {}): RunReport {
  const start = Date.UTC(2026, 0, 1, 9, 0, 0);
  let t = 0;
  const at = () => start + Math.round(t * MINUTE);
  let s = newGame(start, seed);
  const report: RunReport = { chapterAt: {}, powerAt: {}, levelAt: {}, battles: { stage: 0, train: 0, losses: 0 }, pulls: 0, ssr: 0, minutes: 0, stuck: null, final: s };
  const lost = new Set<number>();
  let lastAfk = 0;
  let trainStreak = 0;
  let tier = 0;

  while (t < maxMinutes) {
    const st = nextStage(s);
    if (!st) break;
    if (t - lastAfk >= 30) {
      s = claimAfk(s, at())[0];
      rankUp(s);
      lastAfk = t;
    }
    if (s.wish.pending) {
      s = chooseWish(s, 0)[0];
      continue;
    }
    if (s.wish.charges > 0) {
      s = useWish(s)[0];
      continue;
    }
    if (opts.gacha === false) {
      const n = Math.floor(s.res.jade / B.memoryTrade.jade);
      if (n > 0) s = tradeMemory(s, n)[0];
    }
    while (opts.gacha !== false && s.res.jade >= B.pullCost * 10) {
      const [next, r] = pull(s, 10);
      if (!r.ok) break;
      s = next;
      report.pulls += 10;
      report.ssr += r.results.filter((x) => x.rarity === 3).length;
      t += 0.3;
    }
    s = setTeam(s, autoTeam(s));
    s = starTeam(s);
    s = levelTeam(s);
    s = gearTeam(s);

    if (st.k === 1 && !s.story.watched.includes(st.ep.id)) {
      s = { ...s, story: { ...s.story, watched: [...s.story.watched, st.ep.id] } };
      t += 4;
    }
    const team = s.team;
    const seedKey = battleSeed(s, st.id, team);
    if (!lost.has(seedKey)) {
      const { result } = runCombat(stageSetup(s, st, team), seedKey);
      const [next] = finishStage(s, st, team, result);
      s = next;
      t += battleMinutes(result.rounds);
      report.battles.stage++;
      if (result.won) {
        trainStreak = 0;
        if (st.boss) {
          report.chapterAt[st.ep.id] = t;
          report.powerAt[st.ep.id] = teamPower(s);
          const lv = s.team.filter(Boolean).map((id) => s.yokai[id].level);
          report.levelAt[st.ep.id] = Math.round((lv.reduce((a, x) => a + x, 0) / Math.max(1, lv.length)) * 10) / 10;
        }
        continue;
      }
      report.battles.losses++;
      lost.add(seedKey);
    }

    // 막히면 수련장: 이길 수 있는 가장 높은 난이도
    while (tier + 1 < TRAIN_LEVELS.length && trainOpen(s, tier + 1)) tier++;
    let won = false;
    for (let tt = tier; tt >= 0 && !won; tt--) {
      const { result } = runCombat(trainSetup(s, tt, team), battleSeed(s, `train${tt}#${report.battles.train}`, team));
      const [next] = finishTrain(s, tt, team, result);
      s = next;
      t += battleMinutes(result.rounds);
      report.battles.train++;
      won = result.won;
      if (!won) report.battles.losses++;
    }
    if (++trainStreak > 600) {
      report.stuck = `${st.label} ${st.ep.title} (권장 ${stagePower(st)}, 편성 ${teamPower(s)})`;
      break;
    }
  }
  if (!report.stuck && nextStage(s)) report.stuck = `${Math.round(t)}분에 시간 초과 · ${nextStage(s)!.label}`;
  report.minutes = t;
  report.final = s;
  return report;
}

export const chapterTitle = (epId: string) => {
  const i = EPISODES.findIndex((e) => e.id === epId);
  const st = STAGES.find((x: StageDef) => x.ep.id === epId);
  return `${i + 1}장 ${st?.ep.title ?? epId}`;
};
