// 모의 플레이. 쉬지 않고 계속 하는 사람이 이야기를 따라 모험을 넘는다고 보고 걸린 시간을 잰다.
// 밸런스(상대 세기·경험치·상점 값)를 바꾸면 `npm run simulate`로 이 결과를 확인한다.
//
// 사람의 시간: 전투 한 판을 보는 데 1분, 연속 수련은 한 판에 0.3분, 이야기 한 화 5분, 사연 장면 2분,
// 대화 0.5분, 상소·승급·연회·장보기는 잠깐. 그동안 일터는 계속 돌아간다.
// 사람처럼: 이길 만하면 싸우고, 버거우면 지칠 때까지 부딪쳐 보다가, 그래도 안 되면 필드에서 키운 뒤 다시 온다.

import {
  MINUTE,
  STAT_KEYS,
  buyItem,
  chooseWish,
  equip,
  feast,
  feastCost,
  hasAptitude,
  hasNewTalk,
  newGame,
  partyPlan,
  promote,
  settle,
  slotsPerWorkplace,
  statsOf,
  talk,
  useWish,
} from './engine';
import { BALANCE as B } from '../data/balance';
import { ITEM_BY_ID, type ItemDef, type Slot } from '../data/items';
import { EPISODES } from '../data/story';
import { NODES, REGIONS, type NodeDef } from '../data/world';
import { WORKPLACES } from '../data/village';
import { WISH_BY_ID } from '../data/wishes';
import { YOKAI_BY_ID } from '../data/yokai';
import { advFight, bestField, dungeonEncounter, fieldEncounter, nodeDone, nodeOpen, pathSteps, questEncounter } from './adventure';
import { mercyOf, nextStoryBattle, storyBattleInfo, storyFight, withGuests } from './campaign';
import { completeEpisode, isUnlocked, nextEpisode } from './story';
import type { GameState, StageInfo, WorkplaceId } from './types';

/** 사람이 쓰는 시간(분) */
export const TIME = { battle: 1, train: 0.3, episode: 5, scene: 2, talk: 0.5, quick: 0.2 };

export interface RunReport {
  /** 화를 마친 때(분) */
  episodeAt: Record<string, number>;
  /** 던전·사연·만남을 끝낸 때(분) */
  nodeAt: Record<string, number>;
  /** 화를 마칠 때 평균 레벨 */
  levelAt: Record<string, number>;
  battles: { story: number; dungeon: number; quest: number; field: number; losses: number };
  minutes: number;
  /** 끝까지 못 갔으면 막힌 곳 */
  stuck: string | null;
  /** 싸운 판마다: 상대 레벨, 우리 평균 레벨, 이길 확률, 종류 */
  fights: { level: number; avg: number; chance: number; kind: string; won: boolean; t: number }[];
  /** 화를 마칠 때 엽전 */
  coinAt: Record<string, number>;
  /** 화를 마칠 때의 상태(밸런스 맞추기용) */
  snapshots: Record<string, GameState>;
  final: GameState;
}

/** 일터 배치: 칸마다 그 일터 능력치(적성 포함)가 가장 높은 식객을 넣는다. 엽전 일터를 먼저 채운다. */
function arrange(s: GameState, now: number): GameState {
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

const avg = (s: GameState) => {
  const ys = Object.values(s.yokai);
  return ys.reduce((a, y) => a + y.level, 0) / Math.max(1, ys.length);
};

/** 장비 점수: 단계가 높을수록, 무기는 특기 능력치가 맞으면, 장신구는 주인이 끼면 더 좋다 */
function gearScore(item: ItemDef | undefined, id: string): number {
  if (!item) return 0;
  if (item.slot === 'trinket') return item.tier + (item.owner === id ? 1.5 : 0);
  const main = Object.entries(item.stats ?? {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0];
  return item.tier + (main === YOKAI_BY_ID[id].specialty ? 0.5 : 0);
}

/** 레벨 높은 식객부터 더 좋은 장비를 끼운다. 가진 게 없으면 열린 마을에서 산다(엽전이 남는 만큼만) */
function gearUp(s: GameState, now: number): GameState {
  const sold = NODES.filter((n) => n.kind === 'town' && nodeOpen(s, n)).flatMap((n) => (n.kind === 'town' ? n.shop : []));
  const ids = Object.keys(s.yokai).sort((a, b) => s.yokai[b].level - s.yokai[a].level);
  for (const id of ids.slice(0, 6)) {
    for (const slot of ['weapon', 'trinket'] as Slot[]) {
      const cur = gearScore(ITEM_BY_ID[s.yokai[id].gear[slot] ?? ''], id);
      const have = Object.keys(s.inventory)
        .filter((k) => s.inventory[k] > 0 && ITEM_BY_ID[k]?.slot === slot)
        .sort((a, b) => gearScore(ITEM_BY_ID[b], id) - gearScore(ITEM_BY_ID[a], id))[0];
      if (have && gearScore(ITEM_BY_ID[have], id) > cur) {
        s = equip(s, now, id, slot, have)[0];
        continue;
      }
      const buy = sold
        .map((k) => ITEM_BY_ID[k])
        .filter((it) => it.slot === slot && it.price !== undefined && it.price <= s.res.coin && gearScore(it, id) > cur)
        .sort((a, b) => gearScore(b, id) - gearScore(a, id))[0];
      if (buy) {
        const [after, r] = buyItem(s, now, buy.id);
        if (r.ok) s = equip(after, now, id, slot, buy.id)[0];
      }
    }
  }
  return s;
}

type Target = { kind: 'story' | 'node'; info: StageInfo; arena: GameState; losses: number; node?: NodeDef };

/** 지금 싸울 수 있는 것들을 지도의 길 순서대로: 열린 이야기 전투, 열렸지만 안 끝낸 던전·사연·만남 */
function targets(s: GameState): Target[] {
  const out: Target[] = [];
  const ep = nextEpisode(s, EPISODES);
  for (const region of REGIONS)
    for (const st of pathSteps(region.id)) {
      if (st.kind === 'ep') {
        if (!ep || st.id !== ep.id || !isUnlocked(s, ep)) continue;
        const n = nextStoryBattle(s, ep);
        if (n === null) continue;
        out.push({ kind: 'story', info: storyBattleInfo(s, ep, n), arena: withGuests(s, ep, n), losses: s.story.losses[`${ep.id}#${n}`] ?? 0 });
        continue;
      }
      const node = st.node;
      if ((node.kind !== 'dungeon' && node.kind !== 'quest') || !nodeOpen(s, node) || nodeDone(s, node)) continue;
      const info = node.kind === 'dungeon' ? dungeonEncounter(s, node) : questEncounter(s, node);
      if (!info) continue;
      out.push({ kind: 'node', node, info, arena: s, losses: info.mercy !== undefined ? Math.round((1 - info.mercy) / B.storyMercyStep) : 0 });
    }
  return out;
}

const allDone = (s: GameState) =>
  EPISODES.every((e) => s.story.done.includes(e.id)) && NODES.every((n) => (n.kind !== 'dungeon' && n.kind !== 'quest') || nodeDone(s, n));

export function simulateRun(maxMinutes = 30 * 60, seed = 7): RunReport {
  const start = Date.UTC(2026, 0, 1, 9, 0, 0);
  let t = 0;
  const at = () => start + Math.round(t * MINUTE);
  let s = arrange(newGame(start, seed), start);
  const report: RunReport = { episodeAt: {}, nodeAt: {}, levelAt: {}, battles: { story: 0, dungeon: 0, quest: 0, field: 0, losses: 0 }, minutes: 0, stuck: null, final: s, fights: [], coinAt: {}, snapshots: {} };
  const seenScene = new Set<string>();
  let trainStreak = 0;

  while (t < maxMinutes && !allDone(s)) {
    // 정무·승급·연회·대화는 생기는 대로 처리한다
    if (s.wish.pending) {
      const wish = WISH_BY_ID[s.wish.pending.id];
      const pick = Math.max(0, wish.choices.findIndex((c) => c.reward.kind === 'exp' || c.reward.kind === 'coin')) as 0 | 1;
      s = chooseWish(s, at(), pick)[0];
      t += TIME.quick;
      continue;
    }
    if (s.wish.charges > 0) {
      s = useWish(s, at())[0];
      continue;
    }
    const [promoted, pr] = promote(s, at());
    if (pr.ok) {
      s = arrange(promoted, at());
      t += TIME.quick;
      continue;
    }
    if (s.res.grain >= feastCost(s.rank)) {
      s = feast(s, at())[0];
      t += TIME.quick;
      continue;
    }
    const talker = Object.keys(s.yokai).find((id) => hasNewTalk(s, id));
    if (talker) {
      s = talk(s, at(), talker, 8)[0];
      t += TIME.talk;
      continue;
    }
    s = gearUp(s, at());

    // 이야기 화: 전투가 안 남았으면 마친다
    const ep = nextEpisode(s, EPISODES);
    if (ep && isUnlocked(s, ep) && nextStoryBattle(s, ep) === null) {
      s = arrange(completeEpisode(s, ep, ep.scenes.map((sc) => (sc.choice ? 0 : null)))[0], at());
      t += TIME.episode;
      report.episodeAt[ep.id] = t;
      report.levelAt[ep.id] = Math.round(avg(s) * 10) / 10;
      report.coinAt[ep.id] = Math.round(s.res.coin);
      report.snapshots[ep.id] = s;
      continue;
    }

    // 이길 만한 것부터(지칠 때까지는 부딪쳐 본다)
    let fought = false;
    for (const tg of targets(s)) {
      const { party, chance } = partyPlan(tg.arena, tg.info);
      const tired = tg.info.mercy !== undefined && mercyOf(tg.losses) > B.storyMercyFloor;
      if (chance < 0.3 && !(tired && chance >= 0.08)) continue;
      const log = { level: tg.info.level ?? 0, avg: avg(s), chance, kind: tg.kind === 'story' ? 'story' : tg.node!.kind === 'dungeon' ? (tg.info.isBoss ? 'boss' : 'dungeon') : 'quest', t };
      if (tg.kind === 'story') {
        const e = nextEpisode(s, EPISODES)!;
        const [after, r] = storyFight(s, at(), e, nextStoryBattle(s, e)!, party);
        if (!r.ok) continue;
        s = after;
        report.battles.story++;
        if (!r.won) report.battles.losses++;
        report.fights.push({ ...log, won: r.won });
      } else {
        const node = tg.node!;
        if (node.kind === 'quest' && !seenScene.has(node.id)) {
          seenScene.add(node.id);
          t += TIME.scene;
        }
        const [after, r] = advFight(s, at(), node.id, party);
        if (!r.ok) continue;
        s = after;
        report.battles[node.kind === 'dungeon' ? 'dungeon' : 'quest']++;
        if (!r.won) report.battles.losses++;
        report.fights.push({ ...log, won: r.won });
        if (r.recruit) s = arrange(s, at());
        if (r.cleared) report.nodeAt[r.cleared] = t + TIME.battle;
      }
      t += TIME.battle;
      fought = true;
      break;
    }
    if (fought) {
      trainStreak = 0;
      continue;
    }

    // 버거우면 필드에서 수련(연속 수련으로 빠르게)
    const field = bestField(s);
    if (!field) break;
    const info = fieldEncounter(s, field);
    const plan = partyPlan(s, info);
    const [after, r] = advFight(s, at(), field.id, plan.party);
    if (!r.ok) break;
    report.fights.push({ level: info.level ?? 0, avg: avg(s), chance: plan.chance, kind: 'field', won: r.won, t });
    s = after;
    report.battles.field++;
    if (!r.won) report.battles.losses++;
    t += TIME.train;
    if (++trainStreak > 400) {
      report.stuck = targets(s)[0]?.info.foe ?? '알 수 없음';
      break;
    }
  }
  if (!allDone(s) && !report.stuck) report.stuck = `${Math.round(t)}분에 시간 초과`;
  report.minutes = t;
  report.final = s;
  return report;
}

/** 보고용: 능력치 합 */
export const statSum = (s: GameState, id: string) => STAT_KEYS.reduce((a, k) => a + statsOf(s, id)[k], 0);
