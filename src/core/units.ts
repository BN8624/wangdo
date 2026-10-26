// 식객의 전투 능력치·전투력·성장 비용. 전투는 src/core/combat.ts, 수치는 src/data/balance.ts.
import { BALANCE as B } from '../data/balance';
import { ITEM_BY_ID } from '../data/items';
import { elementOf, roleOf, type Element, type Role } from '../data/roster';
import { SKILLS } from '../data/skills';
import { COMBOS } from '../data/village';
import { YOKAI_BY_ID } from '../data/yokai';
import type { UnitInit } from './combat';
import type { GameState, YokaiState } from './types';
import { bondLevel } from './bond';

export interface CombatStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  skillBoost: number;
  advBoost: number;
}

/** 이름으로 정해지는 0.9~1.1 사이 흔들림(식객마다 개성) */
function wobble(id: string, k: string): number {
  let h = 2166136261;
  for (const c of id + k) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 0.9 + ((h >>> 0) % 1000) / 1000 * 0.2;
}

export const levelMult = (level: number) => 1 + B.levelGrowth * (Math.max(1, level) - 1);
export const levelCap = (stars: number) => B.levelCap[Math.min(6, Math.max(1, stars))];
export const starCost = (stars: number) => (stars >= 6 ? null : B.starCost[stars]);
export const startStars = (id: string) => YOKAI_BY_ID[id]?.grade ?? 1;

/** 레벨 L → L+1 비용 */
export const levelExpCost = (level: number) => Math.round(B.expBase * Math.pow(level, B.expExp) + B.expFlat);
export const levelCoinCost = (level: number) => Math.round(B.coinBase * Math.pow(level, B.coinExp) + B.coinFlat);

/** 식객 하나의 능력치(레벨·별·인연·장비·짝꿍) */
export function heroStats(id: string, y: YokaiState, team: string[] = []): CombatStats {
  const role = roleOf(id);
  const base = B.roleBase[role];
  const m = levelMult(y.level) * B.starMult[Math.min(6, Math.max(1, y.stars))] * (1 + B.bondBonus * bondLevel(y.bond));
  const st: CombatStats = {
    hp: base.hp * wobble(id, 'hp') * m,
    atk: base.atk * wobble(id, 'atk') * m,
    def: base.def * wobble(id, 'def') * m,
    spd: Math.round(base.spd * (0.95 + (wobble(id, 'spd') - 0.9) * 0.5)),
    crit: base.crit,
    skillBoost: 0,
    advBoost: 0,
  };
  const weapon = y.gear.weapon ? ITEM_BY_ID[y.gear.weapon] : undefined;
  if (weapon) st.atk *= 1 + B.weaponAtk * weapon.tier;
  const trinket = y.gear.trinket ? ITEM_BY_ID[y.gear.trinket] : undefined;
  if (trinket) {
    const k = trinket.owner === id ? 1.5 : 1;
    const pct = (trinket.pct ?? 0) * k;
    st.hp *= 1 + pct + (trinket.hp ?? 0) * k;
    st.atk *= 1 + pct;
    st.def *= 1 + pct;
    st.crit += (trinket.crit ?? 0) * k;
    st.skillBoost += (trinket.skill ?? 0) * k;
    st.advBoost += (trinket.weak ?? 0) * k;
    st.spd += Math.round((trinket.exp ?? 0) * k * 40);
  }
  const combo = COMBOS.filter((c) => c.pair.includes(id) && c.pair.every((p) => team.includes(p))).length;
  st.atk *= 1 + B.comboAtk * combo;
  st.hp = Math.round(st.hp);
  st.atk = Math.round(st.atk);
  st.def = Math.round(st.def);
  return st;
}

/** 전투력 */
export const statPower = (st: { hp: number; atk: number; def: number; spd: number }) => Math.round(st.hp / 10 + st.atk * 2 + st.def * 1.5 + st.spd);

export function heroPower(s: GameState, id: string, team: string[] = s.team): number {
  const y = s.yokai[id];
  return y ? statPower(heroStats(id, y, team)) : 0;
}

/** 편성 전투력(빈칸은 0) */
export function teamPower(s: GameState, team: string[] = s.team): number {
  return team.reduce((sum, id) => sum + (id ? heroPower(s, id, team) : 0), 0);
}

export const artFull = (id: string) => `art/full/${id}.webp`;
export const artCard = (id: string) => `art/card/${id}.webp`;

/** 전투에 내보낼 식객 */
export function heroUnit(s: GameState, id: string, team: string[]): UnitInit {
  const st = heroStats(id, s.yokai[id], team);
  return {
    id,
    name: YOKAI_BY_ID[id].name,
    art: artCard(id),
    element: elementOf(id),
    role: roleOf(id),
    hp: st.hp,
    atk: st.atk,
    def: st.def,
    spd: st.spd,
    crit: st.crit,
    skill: SKILLS[id],
    skillBoost: st.skillBoost,
    advBoost: st.advBoost,
  };
}

const FOE_SKILL: Record<Role, { name: string; kind: 'strike' | 'guard' | 'heal' | 'weaken' }> = {
  attack: { name: '거친 일격', kind: 'strike' },
  defense: { name: '방패 세우기', kind: 'guard' },
  heal: { name: '약 바르기', kind: 'heal' },
  support: { name: '기 꺾기', kind: 'weaken' },
};

/** 적 하나. power는 장마다 오르는 배율(1 = 기본) */
export function foeUnit(o: {
  id: string;
  name: string;
  art: string;
  level: number;
  role: Role;
  element: Element;
  kind: 'grunt' | 'elite' | 'boss';
  power: number;
  skill?: boolean;
}): UnitInit {
  const base = B.roleBase[o.role];
  const k = B.foeKind[o.kind];
  const m = levelMult(o.level) * o.power;
  return {
    id: o.id,
    name: o.name,
    art: o.art,
    element: o.element,
    role: o.role,
    hp: Math.round(base.hp * k.hp * m),
    atk: Math.round(base.atk * k.atk * m),
    def: Math.round(base.def * k.def * m),
    spd: Math.round(base.spd * k.spd),
    crit: base.crit,
    skill: o.skill || o.kind !== 'grunt' ? FOE_SKILL[o.role] : undefined,
    boss: o.kind === 'boss',
  };
}

/** 적 무리의 전투력(권장 전투력 표시용): 가장 센 웨이브 기준 */
export function wavePower(waves: UnitInit[][]): number {
  return Math.max(0, ...waves.map((w) => w.reduce((sum, u) => sum + statPower(u), 0)));
}
