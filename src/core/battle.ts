// 토벌 자동 전투. 식객 셋이 차례로 공격하고 상대가 반격한다. 순수 함수라 같은 씨앗이면 늘 같은 전투가 나온다.
// 화면은 이 기록(events)을 순서대로 재생만 한다.
import { nextRandom } from './rng';
import type { StatKey } from './types';

export const BATTLE = {
  /** 이 라운드 안에 쓰러뜨리지 못하면 진다 */
  maxRounds: 10,
  /** 상대 체력 = 겨룰 능력치 합 × foeHp */
  foeHp: 6.8,
  /** 식객 체력 = 맡은 능력치 × allyHp */
  allyHp: 4.2,
  /** 상대 한 번 공격 = 겨룰 능력치 평균 × foeAtk */
  foeAtk: 1.8,
  /** 전투마다 컨디션이 이만큼(±) 흔들린다 */
  condition: 0.6,
  /** 한 번 공격의 흔들림(±) */
  spread: 0.12,
  critChance: 0.12,
  critMult: 1.6,
  missChance: 0.06,
} as const;

export interface BattleAlly {
  id: string;
  stat: StatKey;
  /** 맡은 능력치(공격력) */
  power: number;
  maxHp: number;
}

export interface BattleFoe {
  name: string;
  maxHp: number;
}

export type BattleEvent =
  | { t: 'round'; n: number }
  /** by·target: 0~2는 식객 순번, -1은 상대 */
  | { t: 'hit'; by: number; target: number; dmg: number; crit: boolean; hp: number }
  | { t: 'miss'; by: number; target: number }
  | { t: 'down'; target: number };

export interface BattleLog {
  allies: BattleAlly[];
  foe: BattleFoe;
  events: BattleEvent[];
  won: boolean;
  rounds: number;
}

export interface BattleSetup {
  allies: { id: string; stat: StatKey; power: number }[];
  foe: { name: string; values: number[] };
}

export function runBattle(setup: BattleSetup, seed: number): BattleLog {
  let rng = seed | 0;
  const rand = () => {
    const [r, n] = nextRandom(rng);
    rng = n;
    return r;
  };
  const swing = (amount: number) => 1 + (rand() * 2 - 1) * amount;

  const allies: BattleAlly[] = setup.allies.map((a) => ({ ...a, maxHp: Math.max(1, Math.round(a.power * BATTLE.allyHp)) }));
  const sum = setup.foe.values.reduce((x, y) => x + y, 0);
  const foe: BattleFoe = { name: setup.foe.name, maxHp: Math.max(1, Math.round(sum * BATTLE.foeHp)) };
  const foeAtk = (sum / Math.max(1, setup.foe.values.length)) * BATTLE.foeAtk;

  const cond = allies.map(() => swing(BATTLE.condition));
  const foeCond = swing(BATTLE.condition);
  const hp = allies.map((a) => a.maxHp);
  let foeHp = foe.maxHp;
  const events: BattleEvent[] = [];
  let round = 0;

  const strike = (base: number) => {
    const crit = rand() < BATTLE.critChance;
    return { dmg: Math.max(1, Math.round(base * swing(BATTLE.spread) * (crit ? BATTLE.critMult : 1))), crit };
  };

  while (round < BATTLE.maxRounds && foeHp > 0 && hp.some((h) => h > 0)) {
    round += 1;
    events.push({ t: 'round', n: round });
    for (let i = 0; i < allies.length && foeHp > 0; i++) {
      if (hp[i] <= 0) continue;
      if (rand() < BATTLE.missChance) {
        events.push({ t: 'miss', by: i, target: -1 });
        continue;
      }
      const { dmg, crit } = strike(allies[i].power * cond[i]);
      foeHp = Math.max(0, foeHp - dmg);
      events.push({ t: 'hit', by: i, target: -1, dmg, crit, hp: foeHp });
      if (foeHp === 0) events.push({ t: 'down', target: -1 });
    }
    if (foeHp <= 0) break;
    const alive = hp.map((h, i) => (h > 0 ? i : -1)).filter((i) => i >= 0);
    const target = alive[Math.floor(rand() * alive.length)];
    if (rand() < BATTLE.missChance) {
      events.push({ t: 'miss', by: -1, target });
      continue;
    }
    const { dmg, crit } = strike(foeAtk * foeCond);
    hp[target] = Math.max(0, hp[target] - dmg);
    events.push({ t: 'hit', by: -1, target, dmg, crit, hp: hp[target] });
    if (hp[target] === 0) events.push({ t: 'down', target });
  }

  return { allies, foe, events, won: foeHp <= 0, rounds: round };
}

/** 같은 편성으로 여러 번 싸워 본 승률(씨앗이 고정이라 늘 같은 값) */
export function battleOdds(setup: BattleSetup, runs = 80): number {
  let wins = 0;
  for (let i = 0; i < runs; i++) if (runBattle(setup, 1000 + i * 7919).won) wins++;
  return wins / runs;
}
