// 고을 화면의 "다음 할 일" 한 줄. 지금 가장 도움이 되는 행동 하나를 고른다.
import { feastCost, levelCap, levelCost, nextRank, ownedYokai, partyPlan, power, promoteCheck, ratesPerMinute, slotsPerWorkplace, stageInfo, talkReadyIn, unseenScene } from './engine';
import { fmt } from './format';
import { nextEpisode } from './story';
import { EPISODES } from '../data/story';
import { WORKPLACES } from '../data/village';
import { YOKAI_BY_ID } from '../data/yokai';
import type { GameState } from './types';

export type HintTarget = 'home' | 'yokai' | 'stage';

export interface Hint {
  text: string;
  target: HintTarget;
}

/** s는 정산(settle)이 끝난 상태여야 한다. */
export function nextHint(s: GameState, now: number): Hint {
  if (s.wish.pending) return { text: '관아에 판결을 기다리는 상소가 있어요.', target: 'home' };
  if (promoteCheck(s).ok) return { text: '승급할 수 있어요! 왼쪽 위 관직을 눌러 보세요.', target: 'home' };
  const ids = Object.keys(s.yokai);
  const scene = ids.find((id) => unseenScene(s, id));
  if (scene) return { text: `${YOKAI_BY_ID[scene].name}와(과)의 새 이야기가 열렸어요.`, target: 'yokai' };
  const busy = new Set(WORKPLACES.flatMap((w) => s.work[w.id]));
  const freeSlot = WORKPLACES.some((w) => s.work[w.id].length < slotsPerWorkplace(s.rank));
  if (freeSlot && ids.some((id) => !busy.has(id))) return { text: '쉬고 있는 식객이 있어요. 빈 일터에 보내 보세요.', target: 'home' };
  if (s.wish.charges > 0) return { text: '관아에 상소가 올라와 있어요.', target: 'home' };
  const talker = ids.find((id) => talkReadyIn(s, id, now) === 0);
  if (talker) return { text: `${YOKAI_BY_ID[talker].name}이(가) 이야기하고 싶어 해요.`, target: 'yokai' };
  const info = stageInfo(s.stage.index);
  if (info && s.stamina.value >= 1 && partyPlan(s, info).chance >= 0.5) {
    return { text: '이길 만한 토벌이 있어요. 식객들과 출동해요!', target: 'stage' };
  }
  const target = nextRank(s);
  if (target && s.res.grain >= feastCost(s.rank) && s.res.fame < target.fameCost) {
    return { text: '곡식이 넉넉해요. 정자에서 연회를 열면 명성이 올라요.', target: 'home' };
  }
  const goal = powerGoal(s);
  if (goal) return { text: `${goal.label}까지 권세 ${fmt(goal.gap)} 남았어요. ${levelAdvice(s)}`, target: 'yokai' };
  if (target && s.res.fame < target.fameCost) {
    return { text: `명성이 ${fmt(target.fameCost - s.res.fame)} 모자라요. 주막·연회·토벌로 모아요.`, target: 'home' };
  }
  return { text: '식객들이 일하는 동안 잠시 쉬어 가요. 자리를 비워도 계속 들어와요.', target: 'home' };
}

/** 권세가 모자라 막힌 목표 중 가장 가까운 것: 다음 관직이나, 권세만 남은 다음 화 */
function powerGoal(s: GameState): { label: string; gap: number } | null {
  const pw = power(s);
  const goals: { label: string; gap: number }[] = [];
  const target = nextRank(s);
  if (target && pw < target.powerReq) goals.push({ label: `${target.title} 승급`, gap: target.powerReq - pw });
  const ep = nextEpisode(s, EPISODES);
  const u = ep?.unlock;
  if (ep && u && pw < (u.power ?? 0) && (!u.after || s.story.done.includes(u.after)) && s.rank >= (u.rank ?? 0) && s.stage.index >= (u.stage ?? 0)) {
    goals.push({ label: `${ep.no}화`, gap: u.power! - pw });
  }
  return goals.sort((a, b) => a.gap - b.gap)[0] ?? null;
}

/** 지금 레벨을 올릴 수 있는지, 아니면 엽전이 얼마나 더 있어야 하는지 */
function levelAdvice(s: GameState): string {
  const costs = ownedYokai(s)
    .filter((o) => o.state.level < levelCap(s.rank))
    .map((o) => levelCost(o.def, o.state.level));
  if (!costs.length) return '관직이 오르면 레벨 상한도 올라가요.';
  const cost = Math.min(...costs);
  if (s.res.coin >= cost) return '식객 레벨을 올려 보세요.';
  const lack = cost - s.res.coin;
  const rate = ratesPerMinute(s).coin;
  const minutes = rate > 0 ? Math.max(1, Math.ceil(lack / rate)) : null;
  return minutes ? `엽전이 모이면 레벨을 올릴 수 있어요 · 약 ${minutes}분` : '식객을 일터에 보내 엽전을 모아요.';
}
