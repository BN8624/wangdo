// 로비의 "할 일" 한 줄. 지금 가장 도움이 되는 행동 하나를 고른다.
import { BALANCE as B } from '../data/balance';
import { YOKAI_BY_ID } from '../data/yokai';
import { nextStage, stagePower } from './campaign';
import { affordable, unseenScene } from './engine';
import { afkPending } from './idle';
import type { GameState } from './types';
import { teamPower } from './units';

export type HintTarget = 'home' | 'yokai' | 'camp' | 'gacha';

export interface Hint {
  text: string;
  target: HintTarget;
}

export function nextHint(s: GameState, now: number): Hint {
  if (s.wish.pending) return { text: '관아에 판결을 기다리는 상소가 있어요.', target: 'home' };
  if (afkPending(s, now).minutes >= 60) return { text: '방치 보상 상자가 찼어요. 눌러서 받아요.', target: 'home' };
  const ids = Object.keys(s.yokai);
  const scene = ids.find((id) => unseenScene(s, id));
  if (scene) return { text: `${YOKAI_BY_ID[scene].name}와(과)의 인연 이야기가 열렸어요.`, target: 'yokai' };
  if (s.res.jade >= B.pullCost * 10) return { text: '옥이 1,000개 모였어요. 열 번 모집을 해 보세요.', target: 'gacha' };
  const team = s.team.filter(Boolean);
  const star = team.find((id) => {
    const y = s.yokai[id];
    return y.stars < 6 && y.shards >= B.starCost[y.stars];
  });
  if (star) return { text: `${YOKAI_BY_ID[star].name}의 조각이 모였어요. 별을 올릴 수 있어요.`, target: 'yokai' };
  const st = nextStage(s);
  if (!st) return { text: '모든 장을 깼어요. 수련장에서 더 키우거나 인연을 쌓아요.', target: 'camp' };
  const power = teamPower(s);
  const need = stagePower(st);
  const low = team.sort((a, b) => s.yokai[a].level - s.yokai[b].level)[0];
  if (power < need * 0.9 && low && affordable(s, low, 1).levels > 0) return { text: `권장 전투력에 못 미쳐요. ${YOKAI_BY_ID[low].name}의 레벨을 올려요.`, target: 'yokai' };
  if (power < need * 0.9) return { text: `${st.label}의 권장 전투력이 높아요. 수련장에서 수련치를 모아요.`, target: 'camp' };
  return { text: `다음 출정 · ${st.label} 「${st.ep.title}」`, target: 'camp' };
}
