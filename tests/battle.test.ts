// 토벌 자동 전투: 같은 씨앗이면 같은 전투, 기록이 규칙에 맞는지, 강할수록 잘 이기는지, 고유 기술이 제대로 걸리는지
import { describe, expect, it } from 'vitest';
import { BATTLE, battleOdds, isSkillTurn, runBattle, type BattleSetup, type SkillKind } from '../src/core/battle';
import { SKILLS } from '../src/data/skills';
import { ALLY_LINES, FOE_LINE_CHAPTERS, foeLines } from '../src/data/battle-lines';
import { CHAPTERS } from '../src/data/stages';
import { YOKAI } from '../src/data/yokai';
import { battleChance, bestParty, freshYokai, newGame, stageInfo, statsOf } from '../src/core/engine';

const setup = (ratio: number, kinds: SkillKind[] = ['strike', 'heal', 'stun']): BattleSetup => ({
  allies: [85, 100, 115].map((v, i) => ({ id: `a${i}`, stat: 'might' as const, power: v * ratio, skill: { name: `기술${i}`, kind: kinds[i] } })),
  foe: { name: '산적', values: [85, 100, 115] },
});
const ALL_KINDS: SkillKind[][] = [
  ['strike', 'heal', 'stun'],
  ['guard', 'weaken', 'rally'],
  ['heal', 'heal', 'rally'],
  ['stun', 'guard', 'strike'],
];

describe('토벌 자동 전투', () => {
  it('같은 씨앗이면 늘 같은 전투가 나온다', () => {
    expect(runBattle(setup(1), 42)).toEqual(runBattle(setup(1), 42));
  });

  it('기록이 규칙에 맞는다: 체력은 0~최대 사이, 이기면 상대 체력이 0, 쓰러진 식객은 움직이지 않는다', () => {
    for (const kinds of ALL_KINDS) {
      for (let seed = 1; seed < 40; seed++) {
        const log = runBattle(setup(0.7 + (seed % 7) * 0.12, kinds), seed);
        expect(log.rounds).toBeLessThanOrEqual(BATTLE.maxRounds);
        for (const e of log.events) {
          if (e.t === 'hit') expect(e.hp).toBeGreaterThanOrEqual(0);
          if (e.t === 'heal') expect(e.hp).toBeLessThanOrEqual(log.allies[e.target].maxHp);
        }
        const lastFoeHit = [...log.events].reverse().find((e) => e.t === 'hit' && e.target < 0);
        if (log.won) expect(lastFoeHit && lastFoeHit.t === 'hit' ? lastFoeHit.hp : -1).toBe(0);
        const down = new Set<number>();
        for (const e of log.events) {
          if (e.t === 'down') down.add(e.target);
          if ((e.t === 'hit' || e.t === 'miss' || e.t === 'skill') && e.by >= 0) expect(down.has(e.by)).toBe(false);
          if (e.t === 'heal') expect(down.has(e.target)).toBe(false);
        }
      }
    }
  });

  it('식객은 세 번에 한 번 기술을 쓰고, 한 라운드에 기술은 하나뿐이다', () => {
    const turnsOf = (slot: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => isSkillTurn(n, slot));
    expect(turnsOf(0)).toEqual([2, 5, 8]);
    expect(turnsOf(1)).toEqual([3, 6, 9]);
    expect(turnsOf(2)).toEqual([4, 7]);
    for (let seed = 1; seed < 20; seed++) {
      const log = runBattle(setup(0.9), seed);
      const turns = [0, 0, 0];
      for (const e of log.events) {
        // 차례 하나 = 기술 외침 또는 기술이 아닌 평범한 공격·빗나감
        const normal = (e.t === 'hit' || e.t === 'miss') && e.by >= 0 && !(e.t === 'hit' && e.skill);
        if (e.t === 'skill' || normal) expect(isSkillTurn(++turns[e.by], e.by)).toBe(e.t === 'skill');
      }
      let skillsThisRound = 0;
      for (const e of log.events) {
        if (e.t === 'round') skillsThisRound = 0;
        if (e.t === 'skill') expect(++skillsThisRound).toBe(1);
      }
    }
  });

  it('기절한 상대는 다음 차례를 쉬고, 걸린 효과는 켜진 만큼 꺼진다', () => {
    for (let seed = 1; seed < 40; seed++) {
      const log = runBattle(setup(1, ['stun', 'guard', 'weaken']), seed);
      let stunned = false;
      const on: Record<string, boolean> = {};
      for (const e of log.events) {
        if (e.t === 'status') {
          expect(on[`${e.side}-${e.status}`] ?? false).toBe(!e.on);
          on[`${e.side}-${e.status}`] = e.on;
          if (e.status === 'stun' && e.on) stunned = true;
        }
        if (e.t === 'skip') {
          expect(stunned).toBe(true);
          stunned = false;
        }
        // 기절한 상대는 공격하지 않는다
        if ((e.t === 'hit' || e.t === 'miss') && e.by < 0) expect(stunned).toBe(false);
      }
    }
  });

  it('강할수록 잘 이긴다', () => {
    const weak = battleOdds(setup(0.8));
    const even = battleOdds(setup(1));
    const strong = battleOdds(setup(1.3));
    expect(weak).toBeLessThan(even);
    expect(even).toBeLessThan(strong);
    expect(even).toBeGreaterThan(0.3);
    expect(even).toBeLessThan(0.75);
    expect(strong).toBeGreaterThan(0.85);
  });

  it('식객 모두 고유 기술이 있다', () => {
    for (const y of YOKAI) expect(SKILLS[y.id], y.id).toBeDefined();
  });

  it('식객 모두 토벌 대사가 있고, 장마다 상대 대사가 있다', () => {
    for (const y of YOKAI) {
      expect(ALLY_LINES[y.id]?.attack.length, y.id).toBeGreaterThan(0);
      expect(ALLY_LINES[y.id]?.skill, y.id).toBeTruthy();
    }
    expect([...FOE_LINE_CHAPTERS].sort()).toEqual(CHAPTERS.map((c) => c.id).sort());
    for (const c of CHAPTERS) {
      expect(foeLines(c.id, false).length).toBeGreaterThan(0);
      expect(foeLines(c.id, true)[0]).toBe(c.boss.line);
    }
  });

  it('추천 편성은 칸마다 능력치만 가장 높은 식객을 고른 편성보다 못하지 않다', () => {
    const s = newGame(0, 3);
    for (const y of YOKAI) {
      s.yokai[y.id] = freshYokai();
      s.yokai[y.id].level = 20 + ((y.id.length * 3) % 15);
    }
    for (const idx of [10, 20, 30]) {
      const info = stageInfo(idx)!;
      const greedy: string[] = [];
      for (const r of info.rounds) {
        const pick = Object.keys(s.yokai)
          .filter((id) => !greedy.includes(id))
          .sort((a, b) => statsOf(s, b)[r.stat] - statsOf(s, a)[r.stat])[0];
        greedy.push(pick);
      }
      const best = bestParty(s, info);
      expect(new Set(best).size).toBe(3);
      expect(battleChance(s, info, best)).toBeGreaterThanOrEqual(battleChance(s, info, greedy) - 0.05);
    }
  });
});
