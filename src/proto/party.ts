// 시제품 파티: 레벨·장비로 전투 능력치를 만들고, 경험치를 나눈다
import { foeUnit, levelMult } from '../core/units';
import type { BattleSkill, CombatSetup, UnitInit } from '../core/combat';
import { BALANCE as B } from '../data/balance';
import { SKILLS } from '../data/skills';
import { elementOf, roleOf, type Element, type Role } from '../data/roster';
import { ITEMS, MEMBER_NAME } from './data';
import type { FoeDef, FoeGroup, Member, MemberId } from './types';

/** 주인공은 방망이로 상대의 기를 꺾는다 */
const ME_SKILL: BattleSkill = { name: '빚 독촉', kind: 'weaken' };

const ROLE: Record<MemberId, Role> = { me: 'support', baekseol: roleOf('baekseol'), muyeong: roleOf('muyeong') };
const ELEMENT: Record<MemberId, Element> = { me: 'light', baekseol: elementOf('baekseol'), muyeong: elementOf('muyeong') };

/** 다음 레벨까지 경험치(RPG_DESIGN.md) */
export const expToNext = (level: number) => Math.round(10 * Math.pow(level, 1.6) + 20);
/** 적 하나를 쓰러뜨리면 주는 경험치. 대장은 세 배 */
export const foeExp = (f: FoeDef) => Math.round((8 * Math.pow(f.level, 1.25) + 10) * (f.kind === 'boss' ? 3 : f.kind === 'elite' ? 1.6 : 1));
export const groupExp = (g: FoeGroup) => g.waves.flat().reduce((s, f) => s + foeExp(f), 0);
export const groupCoin = (g: FoeGroup) => g.waves.flat().reduce((s, f) => s + Math.round(4 + f.level * 2 * (f.kind === 'boss' ? 4 : 1)), 0);

export function memberStats(m: Member) {
  const base = B.roleBase[ROLE[m.id]];
  const lv = levelMult(m.level);
  const gear = [m.weapon, m.charm].map((id) => (id ? ITEMS[id] : undefined));
  const pct = (k: 'atk' | 'hp' | 'def') => 1 + gear.reduce((s, it) => s + (it?.[k] ?? 0), 0) / 100;
  const spd = gear.reduce((s, it) => s + (it?.spd ?? 0), 0);
  return {
    hp: Math.round(base.hp * lv * pct('hp')),
    atk: Math.round(base.atk * lv * pct('atk')),
    def: Math.round(base.def * lv * pct('def')),
    spd: base.spd + spd,
    crit: base.crit,
  };
}

export function heroUnit(m: Member): UnitInit {
  const st = memberStats(m);
  return {
    id: m.id,
    name: MEMBER_NAME[m.id],
    art: m.id,
    element: ELEMENT[m.id],
    role: ROLE[m.id],
    ...st,
    skill: m.id === 'me' ? ME_SKILL : SKILLS[m.id],
  };
}

export function foeUnits(g: FoeGroup): UnitInit[][] {
  return g.waves.map((wave) =>
    wave.map((f, i) =>
      foeUnit({
        id: `${f.mon ?? f.char}-${i}`,
        name: f.name,
        art: (f.mon ?? f.char)!,
        level: f.level,
        role: f.role,
        element: f.element,
        kind: f.kind,
        power: f.power ?? 1,
      }),
    ),
  );
}

export function battleSetup(party: Member[], g: FoeGroup): CombatSetup {
  const allies: (UnitInit | null)[] = party.map(heroUnit);
  while (allies.length < 5) allies.push(null);
  return { allies, waves: foeUnits(g) };
}

/** 파티가 이 무리보다 한참 세면(가장 낮은 레벨이 가장 센 적보다 3 이상 높으면) 싸우지 않고 이긴다 */
export const overwhelms = (party: Member[], g: FoeGroup) =>
  !g.boss && Math.min(...party.map((m) => m.level)) >= Math.max(...g.waves.flat().map((f) => f.level)) + 3;

/** 경험치를 모두에게 주고 레벨을 올린다. 오른 식객 목록을 돌려준다 */
export function giveExp(party: Member[], exp: number): { party: Member[]; ups: { id: MemberId; level: number }[] } {
  const ups: { id: MemberId; level: number }[] = [];
  const next = party.map((m) => {
    let { level, exp: e } = m;
    e += exp;
    while (e >= expToNext(level)) {
      e -= expToNext(level);
      level++;
    }
    if (level > m.level) ups.push({ id: m.id, level });
    return { ...m, level, exp: e };
  });
  return { party: next, ups };
}
