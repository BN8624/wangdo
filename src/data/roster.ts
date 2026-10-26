// 수집형 전투에 쓰는 식객 정보: 속성·역할·이름표. 능력치 계산은 src/core/units.ts.
import type { SkillKind } from '../core/combat';
import { SKILLS } from './skills';

export type Element = 'fire' | 'water' | 'wood' | 'light' | 'dark';
export type Role = 'attack' | 'defense' | 'heal' | 'support';

export const ELEMENT_LABEL: Record<Element, string> = { fire: '불', water: '물', wood: '나무', light: '빛', dark: '어둠' };
export const ELEMENT_COLOR: Record<Element, string> = { fire: '#e0603c', water: '#3f87c9', wood: '#4f9a52', light: '#d9a72a', dark: '#7a59a8' };
export const ROLE_LABEL: Record<Role, string> = { attack: '공격', defense: '방어', heal: '회복', support: '지원' };
export const RARITY_LABEL: Record<number, string> = { 1: 'R', 2: 'SR', 3: 'SSR' };

/** 식객마다 속성(설화 속 정체에서 골랐다) */
export const ELEMENT: Record<string, Element> = {
  baekseol: 'fire',
  bulsae: 'fire',
  oryeon: 'fire',
  sodam: 'water',
  yeonhwa: 'water',
  haejin: 'water',
  muyeong: 'wood',
  seorin: 'wood',
  danhui: 'wood',
  beori: 'wood',
  haeryun: 'light',
  cheongyeon: 'light',
  bari: 'light',
  geumyeong: 'dark',
  wolha: 'dark',
  yunseul: 'dark',
};

/** 역할은 고유 기술로 정한다 */
export const ROLE_OF_SKILL: Record<SkillKind, Role> = { strike: 'attack', stun: 'attack', guard: 'defense', heal: 'heal', weaken: 'support', rally: 'support' };

export const roleOf = (id: string): Role => ROLE_OF_SKILL[SKILLS[id]?.kind ?? 'strike'];
export const elementOf = (id: string): Element => ELEMENT[id] ?? 'fire';

/** 속성 상성: 물 > 불 > 나무 > 물, 빛 ↔ 어둠. 1 유리 · -1 불리 · 0 보통 */
export function advantage(attacker: Element, target: Element): 1 | 0 | -1 {
  const beats: Partial<Record<Element, Element>> = { water: 'fire', fire: 'wood', wood: 'water' };
  if (beats[attacker] === target) return 1;
  if (beats[target] === attacker) return -1;
  if ((attacker === 'light' && target === 'dark') || (attacker === 'dark' && target === 'light')) return 1;
  return 0;
}
