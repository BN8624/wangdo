// 인연 단계 계산(여러 모듈이 함께 쓴다)
import { BOND_LEVELS } from '../data/village';

export function bondLevel(points: number): number {
  let lv = 0;
  for (let i = 0; i < BOND_LEVELS.length; i++) if (points >= BOND_LEVELS[i].need) lv = i;
  return lv;
}
