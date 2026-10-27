// 자동 진행기: 대본(비트 목록)을 차례로 읽어 화면이 할 일(Effect)을 내놓는다.
// 순수 함수다. 화면은 Effect를 보여 준 뒤 결과(Input)를 넣어 step을 다시 부른다.
// 비트의 결과는 Input을 받을 때 상태에 반영하므로, 저장을 불러오면 지금 비트부터 그대로 다시 시작한다.
import { runCombat, type CombatEvent, type CombatResult, type CombatSetup } from '../core/combat';
import { FOES, ITEMS } from './data';
import { MAPS, dirTo, findPath, grid, walkable, type MapId } from './maps';
import { battleSetup, giveExp, groupCoin, groupExp, overwhelms } from './party';
import { SCRIPT } from './story';
import type { Dir, FoeGroup, ItemDef, Line, Member, MemberId, Pt } from './types';

export interface ChoiceOpt {
  text: string;
  desc?: string;
  reply?: Line[];
  flag?: string;
  bond?: Partial<Record<MemberId, number>>;
  coin?: number;
  goto?: string;
  /** 끝 화면 요약에 남길 한 줄 */
  log?: string;
}

export interface Debt {
  id: string;
  text: string;
  amount: number;
  flag: string;
  log: string;
  coin?: number;
  reply: Line[];
}

export type Beat =
  | { t: 'map'; map: MapId; at: [number, number]; dir: Dir }
  | { t: 'walk'; to: [number, number]; face?: Dir; say?: Line[] }
  | { t: 'face'; dir: Dir }
  | { t: 'talk'; lines: Line[] }
  | { t: 'goal'; text: string }
  | { t: 'choice'; id: string; prompt: string; options: ChoiceOpt[]; party?: boolean }
  | { t: 'visit'; id: string; prompt: string; pick: number; options: { text: string; desc: string; label: string }[] }
  | { t: 'label'; name: string }
  | { t: 'goto'; label: string }
  | { t: 'ret' }
  | { t: 'if'; flag: string; goto: string; not?: boolean }
  | { t: 'battle'; foe: string; hide?: string[] }
  | { t: 'chest'; id: string }
  | { t: 'give'; item: string; from: string }
  | { t: 'shop' }
  | { t: 'join'; who: MemberId }
  /** 이야기 속에서 기술을 얻는다. 다음 전투에서는 첫 차례부터 쓴다 */
  | { t: 'skill'; who: MemberId; text: string }
  | { t: 'rest'; train: string }
  | { t: 'night'; on: boolean }
  | { t: 'show'; ids: string[] }
  | { t: 'hide'; ids: string[] }
  | { t: 'place'; id: string; at: [number, number]; dir: Dir }
  | { t: 'cutscene'; id: 'debt'; lines: string[] }
  | { t: 'collect'; cap: number; prompt: string; debts: Debt[] }
  | { t: 'flag'; set: string }
  | { t: 'coin'; n: number }
  | { t: 'end' };

export interface Check {
  pc: number;
  map: MapId;
  pos: Pt;
  dir: Dir;
  night: boolean;
  train: string;
}

export interface Game {
  v: 2;
  pc: number;
  stack: number[];
  map: MapId;
  pos: Pt;
  dir: Dir;
  /** 따라오는 식객 자리(바로 뒤부터) */
  trail: Pt[];
  party: Member[];
  /** 이야기에서 얻은 기술 */
  skills: MemberId[];
  /** 얻고 아직 전투에서 안 쓴 기술(다음 전투 첫 차례에 쓴다) */
  fresh: MemberId[];
  coin: number;
  flags: string[];
  bond: Partial<Record<MemberId, number>>;
  opened: string[];
  shown: string[];
  hidden: string[];
  placed: Record<string, { at: Pt; dir: Dir }>;
  night: boolean;
  goal: string;
  picked: Record<string, number[]>;
  log: string[];
  check: Check | null;
  wins: number;
  /** 고른 뒤 보여 줄 대사 */
  reply: Line[] | null;
  /** 졌을 때: 쉼터로 돌아온 뒤 수련할지 고르는 중 */
  defeat: boolean;
  done: boolean;
}

export interface Reward {
  exp: number;
  coin: number;
  ups: { id: MemberId; level: number }[];
}

export type Effect =
  | { k: 'warp'; map: MapId }
  | { k: 'walk'; from: Pt; path: Pt[]; say: Line[] }
  | { k: 'talk'; lines: Line[] }
  | { k: 'choice'; prompt: string; options: { text: string; desc?: string }[]; party?: boolean }
  | { k: 'battle'; group: FoeGroup; setup: CombatSetup; events: CombatEvent[]; result: CombatResult; reward: Reward | null }
  | { k: 'swift'; group: FoeGroup; reward: Reward }
  | { k: 'defeat' }
  | { k: 'gift'; title: string; item?: ItemDef; coin: number }
  | { k: 'shop' }
  | { k: 'join'; who: MemberId }
  | { k: 'skill'; who: MemberId; text: string }
  | { k: 'cutscene'; id: 'debt'; lines: string[] }
  | { k: 'collect'; cap: number; prompt: string; debts: { id: string; text: string; amount: number }[] }
  | { k: 'end' };

export type Input = { k: 'ok' } | { k: 'pick'; i: number } | { k: 'collect'; ids: string[] } | { k: 'train' } | { k: 'retry' };

export const SAVE_KEY = 'wangdo.proto';

export function newGame(): Game {
  return {
    v: 2,
    pc: 0,
    stack: [],
    map: 'backhill',
    pos: { x: 5, y: 23 },
    dir: 1,
    trail: [],
    party: [{ id: 'me', level: 1, exp: 0 }],
    skills: [],
    fresh: [],
    coin: 40,
    flags: [],
    bond: {},
    opened: [],
    shown: [],
    hidden: [],
    placed: {},
    night: false,
    goal: '',
    picked: {},
    log: [],
    check: null,
    wins: 0,
    reply: null,
    defeat: false,
    done: false,
  };
}

const LABELS = new Map<string, number>();
SCRIPT.forEach((b, i) => {
  if (b.t === 'label') LABELS.set(b.name, i);
});
export const labelAt = (name: string) => {
  const i = LABELS.get(name);
  if (i === undefined) throw new Error(`없는 이름표: ${name}`);
  return i;
};

const P = (p: [number, number]): Pt => ({ x: p[0], y: p[1] });
const has = (g: Game, f: string) => g.flags.includes(f);
export const visibleLines = (g: Game, lines: Line[]) => lines.filter((l) => (!l.if || has(g, l.if)) && (!l.unless || !has(g, l.unless)));

/** 지금 맵에 서 있는 사람·짐승(숨김·옮김 반영) */
export function actorsOn(g: Game, map: MapId = g.map) {
  return MAPS[map].actors
    .filter((a) => (a.hidden ? g.shown.includes(a.id) : true) && !g.hidden.includes(a.id))
    .map((a) => ({ ...a, ...(g.placed[a.id] ?? {}) }));
}

function blockedBy(g: Game) {
  const cells = new Set(actorsOn(g).map((a) => `${a.at.x},${a.at.y}`));
  return (p: Pt) => cells.has(`${p.x},${p.y}`);
}

/** 맵에 들어설 때 식객들을 뒤에 세운다 */
function behind(map: MapId, at: Pt, dir: Dir, n: number): Pt[] {
  const gr = grid(map);
  const back: Record<Dir, [number, number]> = { 0: [0, -1], 1: [0, 1], 2: [1, 0], 3: [-1, 0] };
  const out: Pt[] = [];
  let cur = at;
  for (let i = 0; i < n; i++) {
    const nx = { x: cur.x + back[dir][0], y: cur.y + back[dir][1] };
    if (walkable(gr, nx)) cur = nx;
    out.push(cur);
  }
  return out;
}

const seedOf = (g: Game) => (g.wins * 7919 + g.pc * 104729 + g.party.reduce((s, m) => s + m.level * 31, 0) + 12345) >>> 0;

function reward(g: Game, group: FoeGroup): Reward {
  const exp = groupExp(group);
  const { ups } = giveExp(g.party, exp);
  return { exp, coin: groupCoin(group), ups };
}

function applyReward(g: Game, r: Reward): Game {
  return { ...g, party: giveExp(g.party, r.exp).party, coin: g.coin + r.coin };
}

/** 장비를 끼운다(그 칸에 있던 것은 버린다) */
export function equip(g: Game, item: string, who: MemberId): Game {
  const it = ITEMS[item];
  return { ...g, party: g.party.map((m) => (m.id === who ? { ...m, [it.slot]: item } : m)) };
}

/** 장터에서 산다 */
export function buy(g: Game, item: string, who: MemberId): Game {
  const it = ITEMS[item];
  if (g.coin < it.price) return g;
  return equip({ ...g, coin: g.coin - it.price }, item, who);
}

/** 근처에서 세 판 수련: 이긴 판마다 경험치 */
function train(g: Game): { g: Game; text: string } {
  const group = FOES[g.check?.train ?? 'beast'];
  let cur = g;
  let exp = 0;
  let won = 0;
  for (let i = 0; i < 3; i++) {
    const { result } = runCombat(battleSetup(cur.party, group, cur.skills), seedOf(cur) + i * 17, true);
    if (result.won) {
      won++;
      exp += groupExp(group);
      cur = { ...cur, party: giveExp(cur.party, groupExp(group)).party };
    }
  }
  const ups = cur.party.filter((m, i) => m.level > g.party[i].level).map((m) => `${m.id === 'me' ? '나' : m.id === 'baekseol' ? '백설' : '무영'} Lv${m.level}`);
  return { g: cur, text: `근처에서 세 판 수련했다. ${won}판 이겨 경험치 +${exp}${ups.length ? ` · ${ups.join(', ')}` : ''}` };
}

/** 지금 비트에 Input을 반영하고 다음 Effect까지 진행한다 */
export function step(game: Game, input?: Input): { g: Game; fx: Effect } {
  let g = game;
  if (input) g = resolve(g, input);
  for (let guard = 0; guard < 500; guard++) {
    if (g.done) return { g, fx: { k: 'end' } };
    if (g.defeat) return { g, fx: { k: 'defeat' } };
    if (g.reply?.length) return { g, fx: { k: 'talk', lines: g.reply } };
    const b = SCRIPT[g.pc];
    if (!b) return { g: { ...g, done: true }, fx: { k: 'end' } };
    switch (b.t) {
      case 'label':
        g = { ...g, pc: g.pc + 1 };
        continue;
      case 'goto':
        g = { ...g, pc: labelAt(b.label) };
        continue;
      case 'if':
        g = { ...g, pc: has(g, b.flag) !== !!b.not ? labelAt(b.goto) : g.pc + 1 };
        continue;
      case 'ret': {
        const stack = [...g.stack];
        const back = stack.pop();
        if (back === undefined) throw new Error('돌아갈 곳이 없는 ret');
        g = { ...g, stack, pc: back };
        continue;
      }
      case 'goal':
        g = { ...g, goal: b.text, pc: g.pc + 1 };
        continue;
      case 'flag':
        g = { ...g, flags: has(g, b.set) ? g.flags : [...g.flags, b.set], pc: g.pc + 1 };
        continue;
      case 'night':
        g = { ...g, night: b.on, pc: g.pc + 1 };
        continue;
      case 'coin':
        g = { ...g, coin: g.coin + b.n, pc: g.pc + 1 };
        continue;
      case 'show':
        g = { ...g, shown: [...new Set([...g.shown, ...b.ids])], hidden: g.hidden.filter((h) => !b.ids.includes(h)), pc: g.pc + 1 };
        continue;
      case 'hide':
        g = { ...g, hidden: [...new Set([...g.hidden, ...b.ids])], pc: g.pc + 1 };
        continue;
      case 'place':
        g = { ...g, placed: { ...g.placed, [b.id]: { at: P(b.at), dir: b.dir } }, pc: g.pc + 1 };
        continue;
      case 'face':
        g = { ...g, dir: b.dir, pc: g.pc + 1 };
        continue;
      case 'rest':
        g = { ...g, check: { pc: g.pc + 1, map: g.map, pos: g.pos, dir: g.dir, night: g.night, train: b.train }, pc: g.pc + 1 };
        continue;
      case 'map':
        return { g, fx: { k: 'warp', map: b.map } };
      case 'walk': {
        const path = findPath(grid(g.map), g.pos, P(b.to), blockedBy(g));
        if (!path) throw new Error(`${g.map}에서 (${g.pos.x},${g.pos.y}) → (${b.to[0]},${b.to[1]}) 길이 없어요 [pc ${g.pc}]`);
        return { g, fx: { k: 'walk', from: g.pos, path, say: visibleLines(g, b.say ?? []) } };
      }
      case 'talk': {
        const lines = visibleLines(g, b.lines);
        if (!lines.length) {
          g = { ...g, pc: g.pc + 1 };
          continue;
        }
        return { g, fx: { k: 'talk', lines } };
      }
      case 'choice':
        return { g, fx: { k: 'choice', prompt: b.prompt, options: b.options.map((o) => ({ text: o.text, desc: o.desc })), party: b.party } };
      case 'visit': {
        const done = g.picked[b.id] ?? [];
        if (done.length >= b.pick) {
          g = { ...g, pc: g.pc + 1 };
          continue;
        }
        const left = b.options.filter((_, i) => !done.includes(i));
        return { g, fx: { k: 'choice', prompt: b.prompt, options: left.map((o) => ({ text: o.text, desc: o.desc })) } };
      }
      case 'battle': {
        const group = FOES[b.foe];
        if (overwhelms(g.party, group)) return { g, fx: { k: 'swift', group, reward: reward(g, group) } };
        const setup = battleSetup(g.party, group, g.skills, g.fresh);
        const { events, result } = runCombat(setup, seedOf(g), true);
        return { g, fx: { k: 'battle', group, setup, events, result, reward: result.won ? reward(g, group) : null } };
      }
      case 'chest': {
        if (g.opened.includes(b.id)) {
          g = { ...g, pc: g.pc + 1 };
          continue;
        }
        const ch = MAPS[g.map].chests.find((c) => c.id === b.id);
        if (!ch) throw new Error(`없는 상자: ${b.id}`);
        return { g, fx: { k: 'gift', title: '상자를 열었다', item: ch.item ? ITEMS[ch.item] : undefined, coin: ch.coin ?? 0 } };
      }
      case 'give':
        return { g, fx: { k: 'gift', title: b.from, item: ITEMS[b.item], coin: 0 } };
      case 'shop':
        return { g, fx: { k: 'shop' } };
      case 'join':
        if (g.party.some((m) => m.id === b.who)) {
          g = { ...g, pc: g.pc + 1 };
          continue;
        }
        return { g, fx: { k: 'join', who: b.who } };
      case 'skill':
        if (g.skills.includes(b.who)) {
          g = { ...g, pc: g.pc + 1 };
          continue;
        }
        return { g, fx: { k: 'skill', who: b.who, text: b.text } };
      case 'cutscene':
        return { g, fx: { k: 'cutscene', id: b.id, lines: b.lines } };
      case 'collect':
        return { g, fx: { k: 'collect', cap: b.cap, prompt: b.prompt, debts: b.debts.map(({ id, text, amount }) => ({ id, text, amount })) } };
      case 'end':
        return { g: { ...g, done: true }, fx: { k: 'end' } };
    }
  }
  throw new Error('진행이 멈추지 않아요');
}

function resolve(game: Game, input: Input): Game {
  let g = game;
  if (g.defeat) {
    g = { ...g, defeat: false };
    if (input.k === 'train') {
      const t = train(g);
      return { ...t.g, reply: [{ who: 'narration', text: t.text }] };
    }
    return g;
  }
  if (g.reply?.length) return { ...g, reply: null };
  const b = SCRIPT[g.pc];
  const next = { ...g, pc: g.pc + 1 };
  switch (b.t) {
    case 'map': {
      const at = P(b.at);
      return { ...next, map: b.map, pos: at, dir: b.dir, trail: behind(b.map, at, b.dir, 3) };
    }
    case 'walk': {
      const path = findPath(grid(g.map), g.pos, P(b.to), blockedBy(g)) ?? [];
      const seq = [...g.trail].reverse().concat([g.pos], path);
      const end = seq[seq.length - 1];
      const prev = seq.length > 1 ? seq[seq.length - 2] : end;
      const dir = b.face ?? (path.length ? dirTo(prev, end) : g.dir);
      return { ...next, pos: end, dir, trail: seq.slice(0, -1).reverse().slice(0, 3) };
    }
    case 'choice': {
      const i = input.k === 'pick' ? input.i : 0;
      const o = b.options[i];
      const bond = { ...g.bond };
      for (const [k, v] of Object.entries(o.bond ?? {})) bond[k as MemberId] = (bond[k as MemberId] ?? 0) + (v ?? 0);
      return {
        ...next,
        pc: o.goto ? labelAt(o.goto) : g.pc + 1,
        flags: o.flag && !has(g, o.flag) ? [...g.flags, o.flag] : g.flags,
        bond,
        coin: g.coin + (o.coin ?? 0),
        log: o.log ? [...g.log, o.log] : g.log,
        reply: o.reply ? visibleLines(g, o.reply) : null,
      };
    }
    case 'visit': {
      const done = g.picked[b.id] ?? [];
      const left = b.options.map((_, i) => i).filter((i) => !done.includes(i));
      const idx = left[input.k === 'pick' ? input.i : 0];
      return { ...g, picked: { ...g.picked, [b.id]: [...done, idx] }, stack: [...g.stack, g.pc], pc: labelAt(b.options[idx].label) };
    }
    case 'battle': {
      const group = FOES[b.foe];
      const hide = (x: Game) => ({ ...x, hidden: [...new Set([...x.hidden, ...(b.hide ?? [])])] });
      if (overwhelms(g.party, group)) return hide(applyReward({ ...next, wins: g.wins + 1 }, reward(g, group)));
      const { result } = runCombat(battleSetup(g.party, group, g.skills, g.fresh), seedOf(g), true);
      if (result.won) return hide(applyReward({ ...next, wins: g.wins + 1, fresh: [] }, reward(g, group)));
      // 지면 마지막 쉼터로. 얻은 경험치는 남는다
      const c = g.check;
      if (!c) return { ...g, defeat: true, wins: g.wins + 1 };
      return { ...g, pc: c.pc, map: c.map, pos: c.pos, dir: c.dir, night: c.night, trail: behind(c.map, c.pos, c.dir, 3), defeat: true, wins: g.wins + 1, stack: [] };
    }
    case 'chest': {
      const ch = MAPS[g.map].chests.find((c) => c.id === b.id)!;
      let out: Game = { ...next, opened: [...g.opened, b.id], coin: g.coin + (ch.coin ?? 0) };
      if (ch.item) out = equip(out, ch.item, g.party[input.k === 'pick' ? input.i : 0].id);
      return out;
    }
    case 'give':
      return equip(next, b.item, g.party[input.k === 'pick' ? input.i : 0].id);
    case 'skill':
      return { ...next, skills: [...g.skills, b.who], fresh: [...g.fresh, b.who] };
    case 'join': {
      const avg = Math.max(1, Math.round(g.party.reduce((s, m) => s + m.level, 0) / g.party.length));
      return { ...next, party: [...g.party, { id: b.who, level: avg, exp: 0 }] };
    }
    case 'collect': {
      const ids = input.k === 'collect' ? input.ids : [];
      const picked = b.debts.filter((d) => ids.includes(d.id));
      const total = picked.reduce((s, d) => s + d.amount, 0);
      if (total > b.cap || !picked.length) throw new Error('그릇을 넘었거나 아무것도 고르지 않았어요');
      let out: Game = { ...next };
      for (const d of picked) out = { ...out, flags: [...out.flags, d.flag], log: [...out.log, d.log], coin: out.coin + (d.coin ?? 0) };
      return { ...out, reply: picked.flatMap((d) => d.reply) };
    }
    case 'end':
      return { ...g, done: true };
    default:
      return next;
  }
}

export function save(g: Game) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(g));
  } catch {
    /* 저장이 막혀도 이번 판은 이어진다 */
  }
}

export function load(): Game | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Game;
    return g.v === 2 ? g : null;
  } catch {
    return null;
  }
}
