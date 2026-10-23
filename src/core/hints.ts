// 고을 화면의 "다음 할 일" 한 줄. 지금 가장 도움이 되는 행동 하나를 고른다.
import {
  STORED_KEYS,
  feastCost,
  handsNeeded,
  nextRank,
  power,
  promoteCheck,
  storageCaps,
} from './engine';
import { fmt } from './format';
import type { GameState } from './types';

export type HintTarget = 'home' | 'yokai' | 'stage';

export interface Hint {
  text: string;
  target: HintTarget;
}

/** s는 정산(settle)이 끝난 상태여야 한다. */
export function nextHint(s: GameState): Hint {
  if (s.wish.pending) return { text: '소원을 들고 온 손님이 기다리고 있어요.', target: 'home' };
  if (promoteCheck(s).ok) return { text: '승급할 수 있어요! 칭호를 올려 보세요.', target: 'home' };

  const caps = storageCaps(s);
  if (STORED_KEYS.some((k) => caps[k] > 0 && s.store[k] >= caps[k] * 0.995)) {
    return { text: '창고가 가득 찼어요. 얼른 거둬들이세요!', target: 'home' };
  }
  if (s.wish.charges > 0) return { text: '방망이를 두드려 보세요. 누가 찾아올까요?', target: 'home' };

  const need = handsNeeded(s);
  if (need !== null && s.res.hands >= need) return { text: '일손이 넉넉해요. 소동을 해결하러 가요!', target: 'stage' };

  const target = nextRank(s);
  if (target && s.res.grain >= feastCost(s.rank) && s.res.fame < target.fameCost) {
    return { text: '곡식이 넉넉해요. 잔치를 열어 명성을 모아요.', target: 'home' };
  }
  if (target && power(s) < target.powerReq) {
    return { text: `위세가 ${fmt(target.powerReq - power(s))} 모자라요. 식객 레벨을 올려 보세요.`, target: 'yokai' };
  }
  if (target && s.res.fame < target.fameCost) {
    return { text: `명성이 ${fmt(target.fameCost - s.res.fame)} 모자라요. 잔치와 소원으로 모아요.`, target: 'home' };
  }
  if (need !== null && s.res.hands > 0) return { text: '모은 일손으로 소동을 조금씩 잠재울 수 있어요.', target: 'stage' };
  return { text: '창고가 차는 동안 잠시 쉬어 가요. 자리를 비워도 계속 쌓여요.', target: 'home' };
}
