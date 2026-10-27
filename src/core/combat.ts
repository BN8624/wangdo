// 턴제 자동 전투(수집형). 내 편 다섯 대 적 웨이브. 라운드마다 살아 있는 모두가 속도 순으로 한 번씩 움직인다.
// 고유 기술은 쿨타임마다 쓸 수 있다. 자동이면 준비되는 대로 쓰고, 수동이면 누른 식객만 쓴다.
// 순수한 계산이라 같은 편성·같은 씨앗·같은 수동 입력이면 늘 같은 전투가 나온다. 화면은 step()이 내놓는 사건을 재생한다.
import { nextRandom } from './rng';
import { advantage, type Element, type Role } from '../data/roster';

/** strike 강타 · stun 기절 · guard 방어 · heal 치유 · weaken 약화 · rally 격려 */
export type SkillKind = 'strike' | 'stun' | 'guard' | 'heal' | 'weaken' | 'rally';

export interface BattleSkill {
  name: string;
  kind: SkillKind;
}

export const COMBAT = {
  /** 이 라운드를 넘기면 진다 */
  maxRounds: 30,
  /** 이 라운드 안에 이기면 별 셋 */
  starRounds: 15,
  /** 기술을 쓰고 다시 쓰기까지 차례 수, 처음 쓸 수 있는 차례 */
  skillCd: 3,
  firstSkillTurn: 2,
  foeSkillCd: 4,
  critMult: 1.5,
  advMult: 1.3,
  disadvMult: 0.8,
  spread: 0.05,
  /** 적이 방어 역할을 노리는 가중치 */
  tauntWeight: 3,
  /** 기술 피해 배율 */
  mult: { strike: 2.6, stun: 1.6, weaken: 0.9, rally: 1, guard: 0.6, heal: 0 } as Record<SkillKind, number>,
  /** 방어: 시전자 최대 체력 중 이만큼을 아군 모두에게 보호막으로 */
  shieldRatio: 0.15,
  /** 치유: 가장 다친 아군은 공격력의 heal배, 나머지는 healRest배 */
  heal: 2.2,
  healRest: 0.6,
  atkUp: 0.25,
  atkDown: 0.25,
  buffTurns: 2,
} as const;

export interface UnitInit {
  id: string;
  name: string;
  /** 그림 경로(art/…webp) */
  art: string;
  element: Element;
  role: Role;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  skill?: BattleSkill;
  /** 기술 피해 더하기(%), 속성 유리 배율 더하기 */
  skillBoost?: number;
  advBoost?: number;
  boss?: boolean;
  /** 우리 편: 첫 차례부터 기술을 쓴다(기본은 COMBAT.firstSkillTurn 차례) */
  skillNow?: boolean;
}

export interface CombatSetup {
  /** 내 편 다섯 칸(빈칸은 null) */
  allies: (UnitInit | null)[];
  /** 적 웨이브 */
  waves: UnitInit[][];
}

export interface Unit extends UnitInit {
  side: 0 | 1;
  slot: number;
  maxHp: number;
  /** 다음 기술까지 남은 차례(0이면 준비됨) */
  cd: number;
  shield: number;
  shieldTurns: number;
  atkUp: number;
  atkDown: number;
  stunned: boolean;
}

type Side = 0 | 1;

export type CombatEvent =
  | { t: 'wave'; n: number; of: number }
  | { t: 'round'; n: number }
  | { t: 'act'; side: Side; slot: number }
  | { t: 'skill'; side: Side; slot: number; name: string; kind: SkillKind }
  | { t: 'hit'; side: Side; slot: number; tside: Side; tslot: number; dmg: number; crit: boolean; adv: 1 | 0 | -1; hp: number; shield: number; skill: boolean }
  | { t: 'heal'; side: Side; slot: number; tslot: number; amount: number; hp: number }
  | { t: 'shield'; side: Side; slot: number; amount: number }
  | { t: 'buff'; side: Side; slots: number[]; kind: 'atkUp' | 'atkDown' | 'stun' }
  | { t: 'stunned'; side: Side; slot: number }
  | { t: 'down'; side: Side; slot: number }
  | { t: 'end'; won: boolean; rounds: number; deaths: number; stars: number };

export interface CombatResult {
  won: boolean;
  rounds: number;
  deaths: number;
  stars: number;
}

function makeUnit(init: UnitInit, side: Side, slot: number): Unit {
  return {
    ...init,
    side,
    slot,
    maxHp: Math.round(init.hp),
    hp: Math.round(init.hp),
    cd: side === 0 ? (init.skillNow ? 1 : COMBAT.firstSkillTurn) : COMBAT.foeSkillCd - 1,
    shield: 0,
    shieldTurns: 0,
    atkUp: 0,
    atkDown: 0,
    stunned: false,
  };
}

export class Combat {
  readonly allies: Unit[];
  foes: Unit[] = [];
  wave = -1;
  round = 0;
  done = false;
  result: CombatResult | null = null;
  private queue: Unit[] = [];
  private rng: number;
  private manual = new Set<number>();

  constructor(
    readonly setup: CombatSetup,
    seed: number,
    public auto = true,
  ) {
    this.rng = seed | 0;
    this.allies = setup.allies.flatMap((u, i) => (u ? [makeUnit(u, 0, i)] : []));
  }

  private roll(): number {
    const [r, next] = nextRandom(this.rng);
    this.rng = next;
    return r;
  }

  /** 수동: 이 식객이 다음 차례에 기술을 쓰게 한다 */
  queueSkill(slot: number) {
    this.manual.add(slot);
  }

  isQueued(slot: number) {
    return this.manual.has(slot);
  }

  skillReady(slot: number): boolean {
    const u = this.allies.find((a) => a.slot === slot);
    return !!u && u.hp > 0 && !!u.skill && u.cd === 0;
  }

  /** 앞으로 움직일 차례: 이번 라운드에 남은 순서, 모자라면 다음 라운드 순서(화면의 차례 표시용) */
  upcoming(n = 6): { side: Side; slot: number }[] {
    const order = (list: Unit[]) => [...list].sort((a, b) => b.spd - a.spd || a.side - b.side || a.slot - b.slot);
    const out = this.queue.filter((u) => u.hp > 0);
    if (out.length < n) out.push(...order([...this.alive(0), ...this.alive(1)]));
    return out.slice(0, n).map((u) => ({ side: u.side, slot: u.slot }));
  }

  private alive(side: Side) {
    return (side === 0 ? this.allies : this.foes).filter((u) => u.hp > 0);
  }

  private finish(won: boolean, out: CombatEvent[]) {
    const deaths = this.allies.filter((u) => u.hp <= 0).length;
    const stars = won ? 1 + (deaths === 0 ? 1 : 0) + (this.round <= COMBAT.starRounds ? 1 : 0) : 0;
    this.done = true;
    this.result = { won, rounds: this.round, deaths, stars };
    out.push({ t: 'end', won, rounds: this.round, deaths, stars });
  }

  /** 한 차례를 진행하고 생긴 사건을 돌려준다(웨이브·라운드 시작도 한 차례로 친다) */
  step(): CombatEvent[] {
    const out: CombatEvent[] = [];
    if (this.done) return out;
    if (this.alive(0).length === 0) {
      this.finish(false, out);
      return out;
    }
    if (this.alive(1).length === 0) {
      if (this.wave + 1 >= this.setup.waves.length) {
        this.finish(true, out);
        return out;
      }
      this.wave += 1;
      this.foes = this.setup.waves[this.wave].map((u, i) => makeUnit(u, 1, i));
      this.queue = [];
      out.push({ t: 'wave', n: this.wave + 1, of: this.setup.waves.length });
      return out;
    }
    if (this.queue.length === 0) {
      this.round += 1;
      if (this.round > COMBAT.maxRounds) {
        this.round = COMBAT.maxRounds;
        this.finish(false, out);
        return out;
      }
      this.queue = [...this.alive(0), ...this.alive(1)].sort((a, b) => b.spd - a.spd || a.side - b.side || a.slot - b.slot);
      out.push({ t: 'round', n: this.round });
      return out;
    }
    let u = this.queue.shift();
    while (u && u.hp <= 0) u = this.queue.shift();
    if (!u) return out;
    this.act(u, out);
    return out;
  }

  private act(u: Unit, out: CombatEvent[]) {
    out.push({ t: 'act', side: u.side, slot: u.slot });
    if (u.stunned) {
      u.stunned = false;
      out.push({ t: 'stunned', side: u.side, slot: u.slot });
      this.endTurn(u);
      return;
    }
    if (u.cd > 0) u.cd -= 1;
    const wants = u.side === 1 || this.auto || this.manual.has(u.slot);
    if (u.skill && u.cd === 0 && wants) {
      this.manual.delete(u.slot);
      u.cd = u.side === 0 ? COMBAT.skillCd : COMBAT.foeSkillCd;
      out.push({ t: 'skill', side: u.side, slot: u.slot, name: u.skill.name, kind: u.skill.kind });
      this.useSkill(u, u.skill.kind, out);
    } else {
      const target = this.pickTarget(u);
      if (target) this.hit(u, target, 1, false, out);
    }
    this.endTurn(u);
  }

  private endTurn(u: Unit) {
    if (u.atkUp > 0) u.atkUp -= 1;
    if (u.atkDown > 0) u.atkDown -= 1;
    if (u.shieldTurns > 0) {
      u.shieldTurns -= 1;
      if (u.shieldTurns === 0) u.shield = 0;
    }
  }

  /** 내 편은 상성이 유리한 적, 그다음 체력이 적은 적을 노린다. 적은 방어 역할을 더 자주 노린다 */
  private pickTarget(u: Unit): Unit | null {
    const enemies = this.alive(u.side === 0 ? 1 : 0);
    if (!enemies.length) return null;
    if (u.side === 0) {
      return [...enemies].sort((a, b) => advantage(u.element, b.element) - advantage(u.element, a.element) || a.hp / a.maxHp - b.hp / b.maxHp || a.slot - b.slot)[0];
    }
    const weights = enemies.map((e) => (e.role === 'defense' ? COMBAT.tauntWeight : 1));
    let r = this.roll() * weights.reduce((a, w) => a + w, 0);
    for (let i = 0; i < enemies.length; i++) {
      r -= weights[i];
      if (r <= 0) return enemies[i];
    }
    return enemies[enemies.length - 1];
  }

  private hit(u: Unit, t: Unit, mult: number, skill: boolean, out: CombatEvent[]) {
    const atk = u.atk * (1 + (u.atkUp > 0 ? COMBAT.atkUp : 0) - (u.atkDown > 0 ? COMBAT.atkDown : 0)) * (skill ? 1 + (u.skillBoost ?? 0) : 1);
    const adv = advantage(u.element, t.element);
    const advM = adv === 1 ? COMBAT.advMult + (u.advBoost ?? 0) : adv === -1 ? COMBAT.disadvMult : 1;
    const crit = this.roll() < u.crit;
    const spread = 1 - COMBAT.spread + this.roll() * COMBAT.spread * 2;
    let dmg = Math.max(1, Math.round(((mult * atk * atk) / (atk + t.def)) * advM * (crit ? COMBAT.critMult : 1) * spread));
    const absorbed = Math.min(t.shield, dmg);
    t.shield -= absorbed;
    dmg -= absorbed;
    t.hp = Math.max(0, t.hp - dmg);
    out.push({ t: 'hit', side: u.side, slot: u.slot, tside: t.side, tslot: t.slot, dmg: dmg + absorbed, crit, adv, hp: t.hp, shield: t.shield, skill });
    if (t.hp <= 0) out.push({ t: 'down', side: t.side, slot: t.slot });
  }

  private useSkill(u: Unit, kind: SkillKind, out: CombatEvent[]) {
    const mine = this.alive(u.side);
    const theirs = this.alive(u.side === 0 ? 1 : 0);
    switch (kind) {
      case 'strike':
      case 'stun': {
        const t = this.pickTarget(u);
        if (!t) return;
        this.hit(u, t, COMBAT.mult[kind], true, out);
        if (kind === 'stun' && t.hp > 0) {
          t.stunned = true;
          out.push({ t: 'buff', side: t.side, slots: [t.slot], kind: 'stun' });
        }
        return;
      }
      case 'weaken': {
        for (const t of theirs) {
          this.hit(u, t, COMBAT.mult.weaken, true, out);
          if (t.hp > 0) t.atkDown = COMBAT.buffTurns;
        }
        const left = theirs.filter((t) => t.hp > 0);
        if (left.length) out.push({ t: 'buff', side: left[0].side, slots: left.map((t) => t.slot), kind: 'atkDown' });
        return;
      }
      case 'rally': {
        for (const a of mine) a.atkUp = COMBAT.buffTurns + (a === u ? 1 : 0);
        out.push({ t: 'buff', side: u.side, slots: mine.map((a) => a.slot), kind: 'atkUp' });
        const t = this.pickTarget(u);
        if (t) this.hit(u, t, COMBAT.mult.rally, true, out);
        return;
      }
      case 'guard': {
        const amount = Math.round(u.maxHp * COMBAT.shieldRatio);
        for (const a of mine) {
          a.shield = Math.max(a.shield, amount);
          a.shieldTurns = COMBAT.buffTurns + (a === u ? 1 : 0);
        }
        out.push({ t: 'shield', side: u.side, slot: u.slot, amount });
        const t = this.pickTarget(u);
        if (t) this.hit(u, t, COMBAT.mult.guard, true, out);
        return;
      }
      case 'heal': {
        const sorted = [...mine].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.slot - b.slot);
        sorted.forEach((a, i) => {
          const amount = Math.round(u.atk * (i === 0 ? COMBAT.heal : COMBAT.healRest) * (1 + (u.skillBoost ?? 0)));
          const before = a.hp;
          a.hp = Math.min(a.maxHp, a.hp + amount);
          if (a.hp > before) out.push({ t: 'heal', side: u.side, slot: u.slot, tslot: a.slot, amount: a.hp - before, hp: a.hp });
        });
        return;
      }
    }
  }
}

/** 끝까지 자동으로 싸운 기록 */
export function runCombat(setup: CombatSetup, seed: number, auto = true): { events: CombatEvent[]; result: CombatResult } {
  const c = new Combat(setup, seed, auto);
  const events: CombatEvent[] = [];
  for (let guard = 0; guard < 5000 && !c.done; guard++) events.push(...c.step());
  return { events, result: c.result ?? { won: false, rounds: c.round, deaths: 0, stars: 0 } };
}
