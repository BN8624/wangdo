import raw from '../../content/petitions.json';
import type { WishDef } from '../core/types';

// 정무: 관아에 올라오는 상소. 판결 두 가지 중 하나를 고르면 보상을 받는다.
// 글은 content/petitions.json에 있다. minutes = 지금 생산량 기준 몇 분어치, pct = 다음 승급 명성의 %,
// stamina = 기력, gift = 무작위 선물 하나.
export const WISHES = raw as WishDef[];

export const WISH_BY_ID: Record<string, WishDef> = Object.fromEntries(WISHES.map((w) => [w.id, w]));
