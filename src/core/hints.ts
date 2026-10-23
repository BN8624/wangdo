// 고을 화면의 "다음 할 일" 한 줄. 지금 가장 도움이 되는 행동 하나를 고른다.
import { bestParty, feastCost, nextRank, partyChance, partyChances, power, promoteCheck, slotsPerWorkplace, stageInfo, talkReadyIn, unseenScene } from './engine';
import { fmt } from './format';
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
  if (s.wish.pending) return { text: '소원을 들고 온 손님이 기다리고 있어요.', target: 'home' };
  if (promoteCheck(s).ok) return { text: '승급할 수 있어요! 칭호를 올려 보세요.', target: 'home' };
  const ids = Object.keys(s.yokai);
  const scene = ids.find((id) => unseenScene(s, id));
  if (scene) return { text: `${YOKAI_BY_ID[scene].name}와(과)의 새 이야기가 열렸어요.`, target: 'yokai' };
  const busy = new Set(WORKPLACES.flatMap((w) => s.work[w.id]));
  const freeSlot = WORKPLACES.some((w) => s.work[w.id].length < slotsPerWorkplace(s.rank));
  if (freeSlot && ids.some((id) => !busy.has(id))) return { text: '쉬고 있는 식객이 있어요. 빈 일터에 보내 보세요.', target: 'home' };
  if (s.wish.charges > 0) return { text: '방망이를 두드려 보세요. 누가 찾아올까요?', target: 'home' };
  const talker = ids.find((id) => talkReadyIn(s, id, now) === 0);
  if (talker) return { text: `${YOKAI_BY_ID[talker].name}이(가) 이야기하고 싶어 해요.`, target: 'yokai' };
  const info = stageInfo(s.stage.index);
  if (info && s.stamina.value >= 1 && partyChance(partyChances(s, info, bestParty(s, info))) >= 0.5) {
    return { text: '해볼 만한 소동이 있어요. 식객들과 출동해요!', target: 'stage' };
  }
  const target = nextRank(s);
  if (target && s.res.grain >= feastCost(s.rank) && s.res.fame < target.fameCost) {
    return { text: '곡식이 넉넉해요. 잔치를 열면 명성도 오르고 다들 기뻐해요.', target: 'home' };
  }
  if (target && power(s) < target.powerReq) {
    return { text: `위세가 ${fmt(target.powerReq - power(s))} 모자라요. 식객 레벨을 올려 보세요.`, target: 'yokai' };
  }
  if (target && s.res.fame < target.fameCost) {
    return { text: `명성이 ${fmt(target.fameCost - s.res.fame)} 모자라요. 주막·잔치·소동으로 모아요.`, target: 'home' };
  }
  return { text: '식객들이 일하는 동안 잠시 쉬어 가요. 자리를 비워도 계속 들어와요.', target: 'home' };
}
