// 자동 전투. 식객 셋이 차례로 공격하고 상대가 반격한다. 순수 함수라 같은 씨앗이면 늘 같은 전투가 나온다.
// 식객은 세 번에 한 번 고유 기술을 쓴다. 첫 기술은 순번마다 한 차례씩 늦춰 한 라운드에 기술이 몰리지 않게 한다.
// 화면은 이 기록(events)을 순서대로 재생만 한다.
import { nextRandom } from './rng';
import type { StatKey } from './types';

export const BATTLE = {
  /** 이 라운드 안에 쓰러뜨리지 못하면 진다 */
  maxRounds: 10,
  /** 상대 체력 = 겨룰 능력치 합 × foeHp */
  foeHp: 7.6,
  /** 식객 체력 = 맡은 능력치 × allyHp */
  allyHp: 4.2,
  /** 상대 한 번 공격 = 겨룰 능력치 평균 × foeAtk */
  foeAtk: 2.45,
  /** 전투마다 컨디션이 이만큼(±) 흔들린다 */
  condition: 0.6,
  /** 한 번 공격의 흔들림(±) */
  spread: 0.12,
  critChance: 0.12,
  critMult: 1.6,
  missChance: 0.06,
  /** 고유 기술: 첫째 식객은 이 번째 차례에 처음 쓰고(뒤 식객은 한 차례씩 늦게), 그 뒤로 이만큼마다 다시 쓴다 */
  skillFirst: 2,
  skillEvery: 3,
  /** 방어: 다음 공격 한 번의 피해 배율 */
  guardCut: 0.5,
  /** 약화: 상대 공격 배율과 이어지는 차례 수 */
  weakCut: 0.65,
  weakTurns: 2,
  /** 격려: 이어지는 식객 공격 몇 번의 피해 배율 */
  rallyBoost: 1.5,
  rallyHits: 3,
  /** 치유: 가장 다친 식객의 최대 체력 중 이만큼을 채운다 */
  healRatio: 0.35,
  /** 상대의 약점과 같은 종류의 기술이면 그 기술의 타격이 이만큼 세진다 */
  weakHit: 1.7,
} as const;

/** strike 강타 · stun 기절 · guard 방어 · heal 치유 · weaken 약화 · rally 격려 */
export type SkillKind = 'strike' | 'stun' | 'guard' | 'heal' | 'weaken' | 'rally';
export type Status = 'stun' | 'weak' | 'guard' | 'rally';

/** 기술을 쓸 때 함께 들어가는 공격의 배율 */
export const SKILL_DAMAGE: Record<SkillKind, number> = { strike: 2.4, stun: 1.2, guard: 0.8, heal: 0.5, weaken: 1, rally: 1 };

export interface BattleSkill {
  name: string;
  kind: SkillKind;
}

/** 장비·기술 단계에서 오는 보정: 체력 %, 기술 피해 %, 치명타 확률 더하기, 약점 배율 더하기 */
export interface BattleMods {
  hp?: number;
  skill?: number;
  crit?: number;
  weak?: number;
}

export interface BattleAlly {
  id: string;
  stat: StatKey;
  /** 맡은 능력치(공격력) */
  power: number;
  maxHp: number;
  skill?: BattleSkill;
  mods?: BattleMods;
}

export interface BattleFoe {
  name: string;
  maxHp: number;
}

export type BattleEvent =
  | { t: 'round'; n: number }
  /** 식객이 고유 기술을 외친다. 뒤이어 그 효과(hit·heal·status)가 나온다 */
  | { t: 'skill'; by: number; name: string; kind: SkillKind }
  /** by·target: 0~2는 식객 순번, -1은 상대 */
  | { t: 'hit'; by: number; target: number; dmg: number; crit: boolean; hp: number; skill?: boolean; weak?: boolean }
  | { t: 'miss'; by: number; target: number }
  | { t: 'heal'; target: number; amount: number; hp: number }
  /** side: 상대(foe)에게 걸리는지, 식객 모두(party)에게 걸리는지 */
  | { t: 'status'; side: 'foe' | 'party'; status: Status; on: boolean }
  /** 기절한 상대가 이번 차례를 쉰다 */
  | { t: 'skip' }
  | { t: 'down'; target: number };

export interface BattleLog {
  allies: BattleAlly[];
  foe: BattleFoe;
  events: BattleEvent[];
  won: boolean;
  rounds: number;
}

export interface BattleSetup {
  allies: { id: string; stat: StatKey; power: number; skill?: BattleSkill; mods?: BattleMods }[];
  /** weak: 이 종류의 기술에 약하다 */
  foe: { name: string; values: number[]; weak?: SkillKind };
}

/** slot번째 식객(0부터)이 자기 n번째 차례(1부터)에 고유 기술을 쓰는지 */
export const firstSkillTurn = (slot: number) => BATTLE.skillFirst + slot;
export const isSkillTurn = (n: number, slot = 0) => n >= firstSkillTurn(slot) && (n - firstSkillTurn(slot)) % BATTLE.skillEvery === 0;

export function runBattle(setup: BattleSetup, seed: number): BattleLog {
  let rng = seed | 0;
  const rand = () => {
    const [r, n] = nextRandom(rng);
    rng = n;
    return r;
  };
  const swing = (amount: number) => 1 + (rand() * 2 - 1) * amount;

  const allies: BattleAlly[] = setup.allies.map((a) => ({ ...a, maxHp: Math.max(1, Math.round(a.power * BATTLE.allyHp * (1 + (a.mods?.hp ?? 0)))) }));
  const sum = setup.foe.values.reduce((x, y) => x + y, 0);
  const foe: BattleFoe = { name: setup.foe.name, maxHp: Math.max(1, Math.round(sum * BATTLE.foeHp)) };
  const foeAtk = (sum / Math.max(1, setup.foe.values.length)) * BATTLE.foeAtk;

  const cond = allies.map(() => swing(BATTLE.condition));
  const foeCond = swing(BATTLE.condition);
  const hp = allies.map((a) => a.maxHp);
  const turns = allies.map(() => 0);
  let foeHp = foe.maxHp;
  const events: BattleEvent[] = [];
  let round = 0;
  // 걸려 있는 효과
  let stunned = false;
  let weakLeft = 0;
  let guarded = false;
  let rallyLeft = 0;

  const strike = (base: number, critBonus = 0) => {
    const crit = rand() < BATTLE.critChance + critBonus;
    return { dmg: Math.max(1, Math.round(base * swing(BATTLE.spread) * (crit ? BATTLE.critMult : 1))), crit };
  };
  const setStatus = (side: 'foe' | 'party', status: Status, on: boolean) => events.push({ t: 'status', side, status, on });
  /** 식객 i가 상대를 친다. 격려가 걸려 있으면 세게 친다 */
  const allyHit = (i: number, mult: number, skill: boolean, weak = false) => {
    let base = allies[i].power * cond[i] * mult;
    const rallied = rallyLeft > 0;
    if (rallied) base *= BATTLE.rallyBoost;
    const { dmg, crit } = strike(base, allies[i].mods?.crit ?? 0);
    foeHp = Math.max(0, foeHp - dmg);
    events.push({ t: 'hit', by: i, target: -1, dmg, crit, hp: foeHp, ...(skill ? { skill: true } : {}), ...(weak ? { weak: true } : {}) });
    if (rallied && --rallyLeft === 0) setStatus('party', 'rally', false);
    if (foeHp === 0) events.push({ t: 'down', target: -1 });
  };

  const useSkill = (i: number, skill: BattleSkill) => {
    events.push({ t: 'skill', by: i, name: skill.name, kind: skill.kind });
    const weak = setup.foe.weak === skill.kind;
    const mods = allies[i].mods;
    allyHit(i, SKILL_DAMAGE[skill.kind] * (1 + (mods?.skill ?? 0)) * (weak ? BATTLE.weakHit + (mods?.weak ?? 0) : 1), true, weak);
    if (foeHp <= 0) return;
    if (skill.kind === 'stun' && !stunned) {
      stunned = true;
      setStatus('foe', 'stun', true);
    } else if (skill.kind === 'weaken') {
      if (weakLeft === 0) setStatus('foe', 'weak', true);
      weakLeft = BATTLE.weakTurns;
    } else if (skill.kind === 'guard' && !guarded) {
      guarded = true;
      setStatus('party', 'guard', true);
    } else if (skill.kind === 'rally') {
      if (rallyLeft === 0) setStatus('party', 'rally', true);
      rallyLeft = BATTLE.rallyHits;
    } else if (skill.kind === 'heal') {
      // 살아 있는 식객 중 체력 비율이 가장 낮은 이를 채운다
      let target = -1;
      for (let k = 0; k < allies.length; k++) {
        if (hp[k] <= 0 || hp[k] >= allies[k].maxHp) continue;
        if (target < 0 || hp[k] / allies[k].maxHp < hp[target] / allies[target].maxHp) target = k;
      }
      if (target >= 0) {
        const amount = Math.min(allies[target].maxHp - hp[target], Math.round(allies[target].maxHp * BATTLE.healRatio));
        hp[target] += amount;
        events.push({ t: 'heal', target, amount, hp: hp[target] });
      }
    }
  };

  while (round < BATTLE.maxRounds && foeHp > 0 && hp.some((h) => h > 0)) {
    round += 1;
    events.push({ t: 'round', n: round });
    for (let i = 0; i < allies.length && foeHp > 0; i++) {
      if (hp[i] <= 0) continue;
      turns[i] += 1;
      const skill = allies[i].skill;
      if (skill && isSkillTurn(turns[i], i)) {
        useSkill(i, skill);
        continue;
      }
      if (rand() < BATTLE.missChance) {
        events.push({ t: 'miss', by: i, target: -1 });
        continue;
      }
      allyHit(i, 1, false);
    }
    if (foeHp <= 0) break;

    if (stunned) {
      stunned = false;
      events.push({ t: 'skip' });
      setStatus('foe', 'stun', false);
      continue;
    }
    const alive = hp.map((h, i) => (h > 0 ? i : -1)).filter((i) => i >= 0);
    const target = alive[Math.floor(rand() * alive.length)];
    const missed = rand() < BATTLE.missChance;
    if (missed) events.push({ t: 'miss', by: -1, target });
    else {
      const { dmg, crit } = strike(foeAtk * foeCond * (weakLeft > 0 ? BATTLE.weakCut : 1) * (guarded ? BATTLE.guardCut : 1));
      hp[target] = Math.max(0, hp[target] - dmg);
      events.push({ t: 'hit', by: -1, target, dmg, crit, hp: hp[target] });
      if (hp[target] === 0) events.push({ t: 'down', target });
      if (guarded) {
        guarded = false;
        setStatus('party', 'guard', false);
      }
    }
    if (weakLeft > 0) {
      weakLeft -= 1;
      if (weakLeft === 0) setStatus('foe', 'weak', false);
    }
  }

  return { allies, foe, events, won: foeHp <= 0, rounds: round };
}

/** 같은 편성으로 여러 번 싸워 본 승률(씨앗이 고정이라 늘 같은 값) */
export function battleOdds(setup: BattleSetup, runs = 80): number {
  let wins = 0;
  for (let i = 0; i < runs; i++) if (runBattle(setup, 1000 + i * 7919).won) wins++;
  return wins / runs;
}
