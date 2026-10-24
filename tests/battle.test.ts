// 토벌 자동 전투: 같은 씨앗이면 같은 전투, 기록이 규칙에 맞는지, 강할수록 잘 이기는지
import { describe, expect, it } from 'vitest';
import { BATTLE, battleOdds, runBattle, type BattleSetup } from '../src/core/battle';

const setup = (ratio: number): BattleSetup => ({
  allies: [85, 100, 115].map((v, i) => ({ id: `a${i}`, stat: 'might' as const, power: v * ratio })),
  foe: { name: '산적', values: [85, 100, 115] },
});

describe('토벌 자동 전투', () => {
  it('같은 씨앗이면 늘 같은 전투가 나온다', () => {
    expect(runBattle(setup(1), 42)).toEqual(runBattle(setup(1), 42));
  });

  it('기록이 규칙에 맞는다: 체력은 0 아래로 내려가지 않고, 이기면 상대 체력이 0이다', () => {
    for (let seed = 1; seed < 60; seed++) {
      const log = runBattle(setup(0.7 + (seed % 7) * 0.12), seed);
      expect(log.rounds).toBeLessThanOrEqual(BATTLE.maxRounds);
      const hits = log.events.filter((e) => e.t === 'hit');
      for (const e of hits) if (e.t === 'hit') expect(e.hp).toBeGreaterThanOrEqual(0);
      const lastFoeHit = [...hits].reverse().find((e) => e.t === 'hit' && e.target < 0);
      if (log.won) expect(lastFoeHit && lastFoeHit.t === 'hit' ? lastFoeHit.hp : -1).toBe(0);
      // 쓰러진 식객은 다시 공격하지 않는다
      const down = new Set<number>();
      for (const e of log.events) {
        if (e.t === 'down') down.add(e.target);
        if ((e.t === 'hit' || e.t === 'miss') && e.by >= 0) expect(down.has(e.by)).toBe(false);
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
});
