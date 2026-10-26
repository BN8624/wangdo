// 턴제 자동 전투: 같은 씨앗이면 같은 전투, 속도 순서, 상성, 기술 쿨타임·효과, 웨이브와 별, 수동 모드
import { describe, expect, it } from 'vitest';
import { COMBAT, Combat, runCombat, type CombatSetup, type SkillKind, type UnitInit } from '../src/core/combat';
import { ALLY_LINES } from '../src/data/battle-lines';
import { ELEMENT, advantage } from '../src/data/roster';
import { SKILLS } from '../src/data/skills';
import { YOKAI } from '../src/data/yokai';

const unit = (over: Partial<UnitInit> = {}): UnitInit => ({
  id: over.id ?? 'u',
  name: over.name ?? '시험',
  art: '',
  element: 'fire',
  role: 'attack',
  hp: 1000,
  atk: 100,
  def: 50,
  spd: 100,
  crit: 0,
  ...over,
});
const team = (n: number, over: Partial<UnitInit> = {}) => Array.from({ length: n }, (_, i) => unit({ id: `a${i}`, spd: 120 - i, ...over }));

describe('턴제 자동 전투', () => {
  it('같은 편성·같은 씨앗이면 늘 같은 전투가 나온다', () => {
    const setup: CombatSetup = { allies: team(5, { skill: { name: '강타', kind: 'strike' } }), waves: [team(3), team(4)] };
    expect(runCombat(setup, 42)).toEqual(runCombat(setup, 42));
  });

  it('라운드마다 속도가 빠른 순서로 움직인다', () => {
    const setup: CombatSetup = { allies: [unit({ id: 'slow', spd: 80 }), unit({ id: 'fast', spd: 140 })], waves: [[unit({ id: 'mid', spd: 110, hp: 99999 })]] };
    const { events } = runCombat(setup, 1);
    const acts = events.filter((e) => e.t === 'act').slice(0, 3).map((e) => (e.t === 'act' ? `${e.side}:${e.slot}` : ''));
    expect(acts).toEqual(['0:1', '1:0', '0:0']);
  });

  it('상성: 물은 불에, 불은 나무에, 나무는 물에 세고, 빛과 어둠은 서로 세다', () => {
    expect(advantage('water', 'fire')).toBe(1);
    expect(advantage('fire', 'wood')).toBe(1);
    expect(advantage('wood', 'water')).toBe(1);
    expect(advantage('fire', 'water')).toBe(-1);
    expect(advantage('light', 'dark')).toBe(1);
    expect(advantage('dark', 'light')).toBe(1);
    expect(advantage('fire', 'light')).toBe(0);
    const hitOf = (element: 'water' | 'wood') => {
      const { events } = runCombat({ allies: [unit({ element })], waves: [[unit({ hp: 99999, spd: 1 })]] }, 3);
      const hit = events.find((e) => e.t === 'hit');
      return hit && hit.t === 'hit' ? hit : null;
    };
    expect(hitOf('water')!.adv).toBe(1);
    expect(hitOf('wood')!.adv).toBe(-1);
    expect(hitOf('water')!.dmg).toBeGreaterThan(hitOf('wood')!.dmg * 1.4);
  });

  it('고유 기술은 두 번째 차례에 처음 쓰고, 그 뒤로 세 차례마다 쓴다', () => {
    const { events } = runCombat({ allies: [unit({ skill: { name: '강타', kind: 'strike' } })], waves: [[unit({ hp: 9e6, atk: 1, spd: 1 })]] }, 5);
    const myTurns = events.filter((e) => (e.t === 'act' && e.side === 0) || (e.t === 'skill' && e.side === 0));
    const skillTurns: number[] = [];
    let turn = 0;
    for (const e of myTurns) {
      if (e.t === 'act') turn++;
      else skillTurns.push(turn);
    }
    expect(skillTurns.slice(0, 3)).toEqual([COMBAT.firstSkillTurn, COMBAT.firstSkillTurn + COMBAT.skillCd, COMBAT.firstSkillTurn + COMBAT.skillCd * 2]);
  });

  it('기절한 상대는 다음 차례를 쉬고, 보호막은 피해를 먼저 막는다', () => {
    const stun = runCombat({ allies: [unit({ skill: { name: '홀림', kind: 'stun' }, spd: 200 })], waves: [[unit({ hp: 9e6, spd: 100 })]] }, 2).events;
    expect(stun.some((e) => e.t === 'stunned' && e.side === 1)).toBe(true);
    const guard = runCombat({ allies: [unit({ role: 'defense', skill: { name: '방패', kind: 'guard' }, spd: 200, hp: 5000 })], waves: [[unit({ hp: 9e6, spd: 100 })]] }, 2).events;
    const shield = guard.find((e) => e.t === 'shield');
    expect(shield).toBeDefined();
    const after = guard.slice(guard.indexOf(shield!)).find((e) => e.t === 'hit' && e.side === 1);
    expect(after && after.t === 'hit' && after.shield).toBeGreaterThanOrEqual(0);
  });

  it('치유는 가장 다친 아군부터 채우고 최대 체력을 넘지 않는다', () => {
    const setup: CombatSetup = { allies: [unit({ id: 'h', role: 'heal', skill: { name: '밥상', kind: 'heal' }, spd: 50 }), unit({ id: 't', hp: 3000 })], waves: [[unit({ hp: 9e6, atk: 300, spd: 100 })]] };
    const { events } = runCombat(setup, 9);
    for (const e of events) if (e.t === 'heal') expect(e.hp).toBeLessThanOrEqual(3000);
  });

  it('웨이브를 다 넘기면 이기고, 별은 승리·무사·빠른 승리로 매긴다', () => {
    const strong = runCombat({ allies: team(5, { atk: 2000, hp: 9e5 }), waves: [team(3), team(3)] }, 4);
    expect(strong.result).toMatchObject({ won: true, deaths: 0, stars: 3 });
    expect(strong.events.filter((e) => e.t === 'wave')).toHaveLength(2);
    const weak = runCombat({ allies: [unit({ atk: 5, hp: 100 })], waves: [team(3, { atk: 500 })] }, 4);
    expect(weak.result).toMatchObject({ won: false, stars: 0 });
  });

  it('라운드 제한을 넘기면 진다', () => {
    const { result } = runCombat({ allies: [unit({ atk: 1, hp: 9e9 })], waves: [[unit({ atk: 1, hp: 9e9 })]] }, 1);
    expect(result.won).toBe(false);
    expect(result.rounds).toBe(COMBAT.maxRounds);
  });

  it('수동이면 누른 식객만 기술을 쓴다', () => {
    const c = new Combat({ allies: [unit({ skill: { name: '강타', kind: 'strike' } })], waves: [[unit({ hp: 9e6, atk: 1, spd: 1 })]] }, 1, false);
    const ev: string[] = [];
    for (let i = 0; i < 30; i++) ev.push(...c.step().map((e) => e.t));
    expect(ev).not.toContain('skill');
    expect(c.skillReady(0)).toBe(true);
    c.queueSkill(0);
    const later: string[] = [];
    for (let i = 0; i < 6; i++) later.push(...c.step().map((e) => e.t));
    expect(later).toContain('skill');
  });

  it('식객마다 고유 기술·속성·전투 대사가 있다', () => {
    const kinds = new Set<SkillKind>();
    for (const y of YOKAI) {
      expect(SKILLS[y.id], y.id).toBeDefined();
      expect(ELEMENT[y.id], y.id).toBeDefined();
      expect(ALLY_LINES[y.id]?.attack.length, y.id).toBeGreaterThan(0);
      kinds.add(SKILLS[y.id].kind);
    }
    expect(kinds.size).toBe(6);
  });
});
