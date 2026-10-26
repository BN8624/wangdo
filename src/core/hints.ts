// 고을 화면의 "다음 할 일" 한 줄. 지금 가장 도움이 되는 행동 하나를 고른다.
import { feastCost, hasNewTalk, nextRank, partyPlan, power, promoteCheck, slotsPerWorkplace, unseenScene } from './engine';
import { fmt } from './format';
import { isUnlocked, nextEpisode } from './story';
import { nextStoryBattle, storyBattleInfo, withGuests } from './campaign';
import { bestField, dungeonEncounter, nextAdventure, questEncounter } from './adventure';
import { EPISODES } from '../data/story';
import { WORKPLACES } from '../data/village';
import { YOKAI_BY_ID } from '../data/yokai';
import type { GameState } from './types';

export type HintTarget = 'home' | 'yokai' | 'adv' | 'story';

export interface Hint {
  text: string;
  target: HintTarget;
}

/** s는 정산(settle)이 끝난 상태여야 한다. */
export function nextHint(s: GameState): Hint {
  if (s.wish.pending) return { text: '관아에 판결을 기다리는 상소가 있어요.', target: 'home' };
  if (promoteCheck(s).ok) return { text: '승급할 수 있어요! 왼쪽 위 관직을 눌러 보세요.', target: 'home' };
  const ids = Object.keys(s.yokai);
  const scene = ids.find((id) => unseenScene(s, id));
  if (scene) return { text: `${YOKAI_BY_ID[scene].name}와(과)의 새 이야기가 열렸어요.`, target: 'yokai' };
  const busy = new Set(WORKPLACES.flatMap((w) => s.work[w.id]));
  const freeSlot = WORKPLACES.some((w) => s.work[w.id].length < slotsPerWorkplace(s.rank));
  if (freeSlot && ids.some((id) => !busy.has(id))) return { text: '쉬고 있는 식객이 있어요. 빈 일터에 보내 보세요.', target: 'home' };
  const story = storyHint(s);
  if (story) return story;
  if (s.wish.charges > 0) return { text: '관아에 상소가 올라와 있어요.', target: 'home' };
  const adv = advHint(s);
  if (adv) return adv;
  const talker = ids.find((id) => hasNewTalk(s, id));
  if (talker) return { text: `${YOKAI_BY_ID[talker].name}에게 아직 못 들은 이야기가 있어요.`, target: 'yokai' };
  const target = nextRank(s);
  if (target && s.res.grain >= feastCost(s.rank) && s.res.fame < target.fameCost) {
    return { text: '곡식이 넉넉해요. 정자에서 연회를 열면 명성이 올라요.', target: 'home' };
  }
  const goal = powerGoal(s);
  if (goal) return { text: `${goal.label}까지 권세 ${fmt(goal.gap)} 남았어요. ${levelAdvice(s)}`, target: 'yokai' };
  if (target && s.res.fame < target.fameCost) {
    return { text: `명성이 ${fmt(target.fameCost - s.res.fame)} 모자라요. 주막·연회·전투로 모아요.`, target: 'home' };
  }
  return { text: '식객들이 일하는 동안 잠시 쉬어 가요. 자리를 비워도 계속 들어와요.', target: 'home' };
}

/** 다음 관직까지 모자란 권세(이야기는 권세로 막지 않는다) */
function powerGoal(s: GameState): { label: string; gap: number } | null {
  const target = nextRank(s);
  const pw = power(s);
  return target && pw < target.powerReq ? { label: `${target.title} 승급`, gap: target.powerReq - pw } : null;
}

/** 이야기가 다음 할 일: 다음 화를 보거나, 화 안에서 기다리는 전투를 치른다 */
function storyHint(s: GameState): Hint | null {
  const ep = nextEpisode(s, EPISODES);
  // 앞 던전을 돌파해야 열리는 화면 모험이 다음 할 일이다
  if (!ep || !isUnlocked(s, ep)) return null;
  const n = s.story.at?.ep === ep.id ? nextStoryBattle(s, ep) : null;
  if (n === null) return { text: `이야기를 이어 가요 · ${ep.season}부 ${ep.no}화 「${ep.title}」`, target: 'story' };
  const info = storyBattleInfo(s, ep, n);
  const chance = partyPlan(withGuests(s, ep, n), info).chance;
  if (chance >= 0.35) return { text: `${info.foe}와(과)의 전투가 기다려요 · 이길 확률 ${Math.round(chance * 100)}%`, target: 'story' };
  return { text: `${info.foe}이(가) 버거워요. ${levelAdvice(s)}`, target: 'adv' };
}

/** 모험이 다음 할 일: 열린 던전·사연·만남 */
function advHint(s: GameState): Hint | null {
  const node = nextAdventure(s);
  if (!node) return null;
  const info = node.kind === 'dungeon' ? dungeonEncounter(s, node) : node.kind === 'quest' ? questEncounter(s, node) : null;
  if (!info) return null;
  const chance = partyPlan(s, info).chance;
  const what = node.kind === 'dungeon' ? '던전' : node.kind === 'quest' && node.recruit ? '만남' : '사연';
  if (chance >= 0.35) return { text: `모험 · ${what} 「${node.name}」이(가) 기다려요 · 이길 확률 ${Math.round(chance * 100)}%`, target: 'adv' };
  return { text: `「${node.name}」의 ${info.foe}이(가) 버거워요. ${levelAdvice(s)}`, target: 'adv' };
}

/** 식객이 약할 때: 지금 레벨에 맞는 수련 필드를 권한다 */
function levelAdvice(s: GameState): string {
  const field = bestField(s);
  return field ? `모험 탭 「${field.name}」에서 수련하면 레벨이 올라요.` : '모험에서 싸워 경험치를 모아요.';
}
