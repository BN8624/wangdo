// 턴제 전투 화면. 사선 띠로 나눈 대결 구도: 오른쪽 위에 적, 왼쪽 아래에 지금 나선 식객이 크게 서고, 맨 아래 내 편 다섯 패널.
// 한 번의 공격 = 패널이 번쩍(예비) → 식객이 한마디 → 기운이 대상에게 날아가 커지며 꽂힘 → 접촉 순간 대상이 단색 실루엣으로
// 번쩍(치명타는 붉게)·렌즈 고리·조각·큰 숫자 → 반동. 고유 기술은 컷인 뒤 같은 흐름을 크게. 자동·수동, 1~3배속, 건너뛰기.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { COMBAT, Combat, type CombatEvent, type CombatResult, type CombatSetup, type SkillKind, type Unit } from '../core/combat';
import { fmt } from '../core/format';
import type { StageReward } from '../core/campaign';
import { ART, ENEMY_FIGURES } from '../data/art';
import { ALLY_LINES } from '../data/battle-lines';
import { ITEM_BY_ID } from '../data/items';
import { ELEMENT_COLOR, ELEMENT_LABEL, type Element as Elem } from '../data/roster';
import { YOKAI_BY_ID } from '../data/yokai';
import { FxCanvas, PALETTE } from './fx';
import { Art } from './Portrait';
import { ResIcon } from './icons';
import { play } from './sound';
import { buzz } from './toast';

export interface BattleOutcome {
  won: boolean;
  stars: number;
  first?: boolean;
  reward?: Partial<StageReward>;
  ranks?: number[];
}

const SPEED_KEY = 'wangdo.speed';
const AUTO_KEY = 'wangdo.auto';
const load = (k: string, d: string) => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};
const save = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // 저장 못 해도 괜찮다
  }
};

const K = (side: 0 | 1, slot: number) => `${side}:${slot}`;

interface Disp {
  hp: number;
  max: number;
  down: boolean;
}

interface Spot {
  x: number;
  /** 발 높이(아래에서 %) */
  feet: number;
  /** 그림 높이(전투 화면 높이의 %) */
  h: number;
  z: number;
}

/** 적 배치: 오른쪽 위 무대. 대장은 앞 가운데 크게, 나머지는 앞줄·뒷줄로 */
function arrange(foes: Unit[]): Spot[] {
  const F = (x: number): Spot => ({ x, feet: 42, h: 28, z: 3 });
  const B = (x: number): Spot => ({ x, feet: 54, h: 22, z: 2 });
  const far = (x: number): Spot => ({ x, feet: 61, h: 18, z: 1 });
  const boss = foes.findIndex((u) => u.boss);
  if (boss >= 0) {
    const others = foes.length - 1;
    const rest = others <= 0 ? [] : others === 1 ? [B(90)] : others === 2 ? [B(46), B(92)] : [B(44), B(93), far(80), far(58)];
    let k = 0;
    return foes.map((_, i) => (i === boss ? { x: 70, feet: 38, h: 42, z: 4 } : rest[k++] ?? B(72)));
  }
  const layouts: Spot[][] = [[], [F(70)], [F(58), F(86)], [B(74), F(56), F(88)], [B(62), B(90), F(54), F(80)], [B(50), B(72), B(93), F(60), F(85)]];
  return layouts[Math.min(5, foes.length)];
}

// 전장용 전신은 별도 원화다. 아직 준비되지 않은 적은 기존 초상을 계속 쓴다.
// 전신은 머리부터 발까지라 같은 칸에 넣으면 허벅지까지 그린 초상보다 머리·몸이 1.45배쯤 작다.
// 그래서 칸을 그만큼 키우고 발을 조금 내려, 한 웨이브에 섞여도 크기가 맞고 맞는 순간도 크게 보이게 한다.
const FULL_SCALE = 1.45;
const FULL_DROP = 0.3;

function EnemyFigure({ unit, spot, down, acting, bodyRef, children }: {
  unit: Unit;
  spot: Spot;
  down: boolean;
  acting: boolean;
  bodyRef: (el: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  // 전투의 '대장' 여부와 원화 종류는 다를 수 있다(수련장·이야기 재사용).
  const source = /^art\/(boss|grunt)\/([a-z0-9-]+)\.webp$/.exec(unit.art);
  const full = !!source && ENEMY_FIGURES.has(`${source[1]}/${source[2]}`);
  const art = full ? ART.enemy(source[1] as 'boss' | 'grunt', source[2]) : unit.art;
  const height = full ? spot.h * FULL_SCALE : spot.h;
  const bottom = full ? spot.feet - spot.h * FULL_DROP : spot.feet;

  return (
    <div
      className={`bf-foe ${full ? 'full' : 'portrait'} ${down ? 'dead' : ''} ${acting ? 'acting' : ''} ${unit.boss ? 'boss' : ''}`}
      style={{ left: `${spot.x}%`, bottom: `${bottom}%`, height: `${height}%`, zIndex: spot.z }}
      data-cx={spot.x}
      data-cy={100 - bottom - height * (full ? 0.62 : 0.55)}
    >
      <div className="bf-shadow" />
      <div className="bf-body" ref={bodyRef}>
        <Art className="bf-sprite" src={art} alt={unit.name} fallback={<div className="bf-sprite-fb">{unit.name}</div>} />
        <i className="bf-sil" style={{ WebkitMaskImage: `url(${art})`, maskImage: `url(${art})` }} />
      </div>
      {children}
    </div>
  );
}

/** 식객이 공격할 때 하는 말(돌아가며) */
const lineOf = (id: string, n: number) => {
  const l = ALLY_LINES[id]?.attack ?? [];
  return l.length ? l[n % l.length] : '';
};

const SKILL_TINT: Record<SkillKind, string> = { strike: '#e0603c', stun: '#9a6ad0', weaken: '#5b4a8a', rally: '#d9a72a', guard: '#3f87c9', heal: '#3fb86a' };

/** 맞는 순간 세상이 멈추는 시간(ms, 1배속 기준). 배속을 올려도 다른 동작보다 덜 줄어든다. 무게 0 보통 · 1 묵직 · 2 일격 */
const HOLD = [90, 150, 210];
/** 한 대에 최대 체력의 이만큼 이상 깎으면 묵직한 한 방으로 친다(별을 많이 올린 식객일수록 자주 나온다) */
const CHUNK_HEAVY = 0.4;

export function BattleView({
  setup,
  seed,
  title,
  bg,
  onFinish,
  onClose,
  onNext,
  onRetry,
  nextLabel = '다음 스테이지 ›',
}: {
  setup: CombatSetup;
  seed: number;
  title: string;
  bg: string;
  /** 전투가 끝나면 결과를 반영하고 보여 줄 보상을 돌려준다 */
  onFinish: (r: CombatResult) => BattleOutcome;
  onClose: () => void;
  /** 이기면 다음 스테이지로 */
  onNext?: () => void;
  /** 지면 편성으로 돌아가기 */
  onRetry?: () => void;
  nextLabel?: string;
}) {
  const [auto, setAuto] = useState(() => load(AUTO_KEY, '1') === '1');
  const [speed, setSpeed] = useState(() => Number(load(SPEED_KEY, '2')) || 2);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const combat = useMemo(() => new Combat(setup, seed, auto), [setup, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const disp = useRef<Record<string, Disp>>({});
  const [foes, setFoes] = useState<Unit[]>([]);
  const [, setTick] = useState(0);
  const redraw = () => setTick((n) => n + 1);
  const [round, setRound] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const [cutin, setCutin] = useState<{ id: string; name: string; kind: SkillKind; el: Elem } | null>(null);
  const [foeSkill, setFoeSkill] = useState<{ name: string; who: string; art: string } | null>(null);
  const [banner, setBanner] = useState<{ big: string; small?: string; boss?: boolean } | null>(null);
  const [dim, setDim] = useState(false);
  const [ending, setEnding] = useState<'win' | 'lose' | null>(null);
  const [outcome, setOutcome] = useState<BattleOutcome | null>(null);
  /** 왼쪽 아래에 크게 서 있는 식객(마지막으로 나선 식객) */
  const [lead, setLeadState] = useState<string>(() => setup.allies.find(Boolean)?.id ?? '');
  // 재생 중인 비동기 흐름이 늘 최신 값을 읽도록 ref에도 둔다
  const leadId = useRef(lead);
  const setLead = (id: string) => {
    leadId.current = id;
    setLeadState(id);
  };
  const [bubble, setBubble] = useState<{ text: string; n: number } | null>(null);
  /** 지금 맞고 있는 적(위에 큰 체력 막대로 보여 한 대에 얼마나 깎이는지 보이게) */
  const [tgtSlot, setTgtSlot] = useState<number | null>(null);
  const said = useRef(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);
  const redRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const leadRef = useRef<HTMLDivElement | null>(null);
  const fx = useRef<FxCanvas | null>(null);
  const run = useRef({ cancelled: false });
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const damage = useRef<Record<number, number>>({});
  const result = useRef<BattleOutcome | null>(null);

  // 내 편 체력 표시
  if (!Object.keys(disp.current).length) for (const u of combat.allies) disp.current[K(0, u.slot)] = { hp: u.hp, max: u.maxHp, down: false };

  useEffect(() => {
    combat.auto = auto;
    save(AUTO_KEY, auto ? '1' : '0');
  }, [auto, combat]);
  useEffect(() => {
    save(SPEED_KEY, String(speed));
    if (fx.current) fx.current.speed = speed;
  }, [speed]);

  // ───── 연출 도우미 ─────
  // sleep은 배속만큼 줄고, beat(맞는 순간의 멈춤·실루엣·숫자)는 덜 준다. 배속을 올려도 접촉의 무게는 남긴다
  const dur = (ms: number) => ms / speedRef.current;
  const beatDur = (ms: number) => ms / Math.sqrt(speedRef.current);
  const wait = (ms: number) =>
    new Promise<void>((done) => {
      const t = setTimeout(() => {
        timers.current.delete(t);
        done();
      }, ms);
      timers.current.add(t);
    });
  const sleep = (ms: number) => wait(dur(ms));
  const beat = (ms: number) => wait(beatDur(ms));
  const reg = (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };
  const pos = (key: string, part: 'head' | 'mid' | 'feet' = 'mid') => {
    const el = nodes.current.get(key);
    const root = rootRef.current;
    if (!el || !root) return { x: 200, y: 300 };
    const r = el.getBoundingClientRect();
    const R = root.getBoundingClientRect();
    const foe = key.startsWith('1:');
    // 전신 적은 발까지 담겨 머리·몸통이 칸의 더 위쪽에 있다
    const full = foe && !!el.parentElement?.classList.contains('full');
    const fy = part === 'head' ? (full ? 0.13 : foe ? 0.2 : 0.12) : part === 'feet' ? 0.92 : full ? 0.36 : 0.42;
    return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height * fy };
  };
  /** 실제 시간(ms)으로 거는 애니메이션 */
  const anim = (el: Element | HTMLElement | null | undefined, frames: Keyframe[], ms: number, opts: KeyframeAnimationOptions = {}) => {
    if (el && 'animate' in el) (el as HTMLElement).animate(frames, { duration: ms, easing: 'ease-out', ...opts });
  };
  const animate = (el: Element | HTMLElement | null | undefined, frames: Keyframe[], ms: number, opts: KeyframeAnimationOptions = {}) => anim(el, frames, dur(ms), opts);
  /** 지금 모습에서 to로 옮겨 그 자세를 유지한다(앞서 건 자세는 거둔다) */
  const poseTo = (el: HTMLElement | null | undefined, to: Keyframe, ms: number, easing = 'ease-out') => {
    if (!el) return;
    const cs = getComputedStyle(el);
    const from: Keyframe = { transform: cs.transform, filter: cs.filter };
    for (const a of el.getAnimations()) if (!('animationName' in a)) a.cancel();
    el.animate([from, { transform: 'none', filter: 'none', ...to }], { duration: dur(ms), easing, fill: 'forwards' });
  };
  /** 카메라: 장면을 at 지점(장면 너비·높이의 %)이 가운데 쪽으로 오게 s배로 당긴다. at이 없으면 제자리 */
  const camTo = (s: number, at: { x: number; y: number } | null, ms: number, easing = 'cubic-bezier(.3,0,.2,1)') => {
    const el = sceneRef.current;
    if (!el) return;
    const W = el.offsetWidth;
    const H = el.offsetHeight;
    let tx = 0;
    let ty = 0;
    if (at) {
      const px = (at.x / 100) * W;
      const py = (at.y / 100) * H;
      // 대상을 적 무대 가운데(62%, 34%) 쪽으로 끌어오되, 배경 가장자리가 드러나지 않게 막는다(배경은 좌우로 16%씩 더 깔려 있다)
      const fx = px + (W * 0.62 - px) * 0.45;
      const fy = py + (H * 0.34 - py) * 0.45;
      tx = Math.min(0.16 * s * W, Math.max(W - 1.16 * s * W, fx - s * px));
      ty = Math.min(0, Math.max(H * (1 - s), fy - s * py));
    } else s = 1;
    poseTo(el, { transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s})` }, ms, easing);
  };
  /** 행동하는 동안 keys의 적만 맨 앞에 밝게 두고 나머지는 어둡게 한다. 빈 배열이면 풀기 */
  const spotlight = (keys: string[]) => {
    const root = rootRef.current;
    if (!root) return;
    root.toggleAttribute('data-focus', keys.length > 0);
    for (const el of root.querySelectorAll('[data-tgt]')) el.removeAttribute('data-tgt');
    for (const k of keys) nodes.current.get(k)?.closest('.bf-foe')?.setAttribute('data-tgt', '');
  };
  /** 대상들의 가운데(장면 기준 %) */
  const focus = (keys: string[]) => {
    const pts = keys.map((k) => nodes.current.get(k)?.closest<HTMLElement>('[data-cx]')?.dataset).filter((d): d is DOMStringMap => !!d);
    if (!pts.length) return null;
    return { x: pts.reduce((a, d) => a + Number(d.cx), 0) / pts.length, y: pts.reduce((a, d) => a + Number(d.cy), 0) / pts.length };
  };
  const shake = (p: number) => {
    const f: Keyframe[] = [{ transform: 'translate(0,0)' }];
    for (let i = 0; i < 5; i++) f.push({ transform: `translate(${(i % 2 ? -1 : 1) * p * (1 - i / 5)}px, ${(i % 2 ? 1 : -1) * p * 0.5 * (1 - i / 5)}px)` });
    f.push({ transform: 'translate(0,0)' });
    anim(fieldRef.current, f, beatDur(320), { easing: 'linear' });
  };
  const flash = (red = false, a = 0.5) => animate(red ? redRef.current : whiteRef.current, [{ opacity: 0 }, { opacity: a, offset: 0.15 }, { opacity: 0 }], red ? 420 : 260);
  /** 접촉 순간: 대상 전체를 단색 실루엣으로 덮었다가(hold) 옅어지며 원래 모습이 비친다 */
  const silhouette = (el: HTMLElement | null | undefined, color: string, hold = 70) => {
    const sil = el?.querySelector<HTMLElement>('.bf-sil');
    if (!sil) return;
    sil.style.background = color;
    const ms = hold + 300;
    anim(sil, [{ opacity: 1 }, { opacity: 1, offset: hold / ms }, { opacity: 0 }], beatDur(ms), { easing: 'linear' });
  };
  /** 접촉 직전 대상 둘레에 맺히는 렌즈 고리: pre 뒤(맞는 순간)에 가장 크고, 곧 퍼지며 사라진다 */
  const lens = (key: string, size: number, tint: string, pre: number) => {
    const layer = layerRef.current;
    if (!layer) return;
    const p = pos(key, 'mid');
    const d = document.createElement('div');
    d.className = 'bf-lens';
    Object.assign(d.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${size}px`, height: `${size}px` });
    d.style.setProperty('--tint', tint);
    layer.appendChild(d);
    const a = dur(pre);
    const b = beatDur(280);
    d.animate([{ transform: 'translate(-50%,-50%) scale(.62)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: a / (a + b) }, { transform: 'translate(-50%,-50%) scale(1.16)', opacity: 0 }], { duration: a + b, easing: 'cubic-bezier(.3,.6,.3,1)' });
    const t = setTimeout(() => {
      d.remove();
      timers.current.delete(t);
    }, a + b + 20);
    timers.current.add(t);
  };
  /** 숫자. slam이면 그 배율로 크게 박혔다가 곧 제 크기로 줄어든다 */
  const number = (key: string, text: string, kind: string, label?: string, slam = 0) => {
    const layer = layerRef.current;
    if (!layer) return;
    const p = pos(key, 'head');
    const d = document.createElement('div');
    d.className = `bf-num ${kind} ${slam ? 'slam' : ''}`;
    const W = rootRef.current?.clientWidth ?? 390;
    d.style.left = `${Math.min(W - 56, Math.max(56, p.x + (Math.random() - 0.5) * (slam ? 10 : 24)))}px`;
    d.style.top = `${p.y}px`;
    const ms = slam ? beatDur(1000) : dur(1150);
    d.style.setProperty('--d', `${ms}ms`);
    if (slam) d.style.setProperty('--big', String(slam));
    if (label) {
      const s = document.createElement('small');
      s.textContent = label;
      d.appendChild(s);
    }
    d.appendChild(document.createTextNode(text));
    layer.appendChild(d);
    const t = setTimeout(() => {
      d.remove();
      timers.current.delete(t);
    }, ms + 50);
    timers.current.add(t);
  };
  const unitOf = (side: 0 | 1, slot: number): Unit | undefined => (side === 0 ? combat.allies : combat.foes).find((u) => u.slot === slot);

  // ───── 사건 재생 ─────
  const playWave = async (e: Extract<CombatEvent, { t: 'wave' }>) => {
    const list = combat.foes.map((u) => ({ ...u }));
    for (const u of list) disp.current[K(1, u.slot)] = { hp: u.hp, max: u.maxHp, down: false };
    setFoes(list);
    const boss = list.find((u) => u.boss);
    setBanner(boss ? { big: '대장 등장', small: boss.name, boss: true } : { big: `WAVE ${e.n}`, small: e.of > 1 ? `${e.n} / ${e.of}` : undefined });
    play(boss ? 'promote' : 'stamp');
    await sleep(boss ? 700 : 450);
    if (boss) {
      shake(10);
      buzz(30);
    }
    await sleep(boss ? 900 : 650);
    setBanner(null);
  };

  const playCutin = async (u: Unit, e: Extract<CombatEvent, { t: 'skill' }>) => {
    if (u.side === 0) {
      setDim(true);
      setCutin({ id: u.id, name: e.name, kind: e.kind, el: u.element });
      play('skill');
      buzz(20);
      await sleep(1050);
      setCutin(null);
    } else {
      setFoeSkill({ name: e.name, who: u.name, art: u.art });
      animate(nodes.current.get(K(1, u.slot)), [{ filter: 'drop-shadow(0 0 0 #f44)' }, { filter: 'drop-shadow(0 0 18px #ff3b2f) brightness(1.3)', offset: 0.5 }, { filter: 'drop-shadow(0 0 0 #f44)' }], 650);
      await sleep(650);
      setFoeSkill(null);
    }
  };

  /** 한 대의 무게: 0 보통 · 1 묵직(치명타·강타·기절, 또는 최대 체력의 40% 이상) · 2 일격(절반 넘게 깎으며 쓰러뜨림) */
  const weightOf = (h: Extract<CombatEvent, { t: 'hit' }>, kind: SkillKind | null) => {
    const chunk = h.dmg / Math.max(1, unitOf(h.tside, h.tslot)?.maxHp ?? 1);
    if (h.hp <= 0 && chunk >= 0.5) return 2;
    return h.crit || kind === 'strike' || kind === 'stun' || chunk >= CHUNK_HEAVY ? 1 : 0;
  };

  /** 접촉 한 프레임: 실루엣·베기·조각·밀려남·숫자를 한꺼번에 낸다. 멈춤(hold)은 부르는 쪽이 건다 */
  const impact = (h: Extract<CombatEvent, { t: 'hit' }>, atk: Unit | undefined, kind: SkillKind | null, solo: boolean, loud: boolean) => {
    const tk = K(h.tside, h.tslot);
    const el = atk?.element ?? 'fire';
    const p = pos(tk, 'mid');
    const big = kind === 'strike' || kind === 'stun';
    const w = weightOf(h, kind);
    const heavy = w > 0;
    const ko = w === 2;
    const hold = HOLD[w];
    const node = nodes.current.get(tk);
    // 맞는 순간 밀려난 자세로 바로 튀어 멈춰 있다가, 멈춤이 끝나면 돌아온다
    const kick = (target: HTMLElement | null | undefined, pose: string, back = 380) => {
      const a = beatDur(hold);
      const b = dur(back);
      anim(target, [{ transform: pose }, { transform: pose, offset: a / (a + b) }, { transform: 'translate(-2px, 1px)', offset: 0.85 }, { transform: 'none' }], a + b, { easing: 'ease-out' });
    };
    if (h.tside === 1) {
      silhouette(node, h.crit ? '#e0302a' : '#ffffff', hold + (ko ? 120 : 40));
      fx.current?.slash(p.x, p.y, el, heavy);
      if (big || ko) fx.current?.slash(p.x, p.y, el, true, 0.7);
      fx.current?.burst(p.x, p.y, el, ko ? 30 : heavy ? 20 : 12, ko ? 1.7 : heavy ? 1.3 : 0.9);
      fx.current?.shards(p.x, p.y, ko ? 20 : heavy ? 12 : 7, h.crit ? '#ffb0a8' : ko ? '#fff1c4' : '#e8f2ff', ko ? 2 : heavy ? 1.5 : 1.1);
      kick(node, `translate(${ko ? 26 : heavy ? 18 : 10}px, -6px) rotate(${ko ? 5 : heavy ? 3 : 1.5}deg)`);
    } else {
      kick(node, 'translate(-8px, 5px) rotate(-2deg)', 320);
      animate(node?.querySelector('.bf-hurt'), [{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], 460);
      // 지금 크게 서 있는 식객이 맞으면 그 그림도 붉게 덮였다가 밀려난다
      if (atk && unitOf(0, h.tslot)?.id === leadId.current) {
        silhouette(leadRef.current, '#e0302a', hold);
        kick(leadRef.current, 'translate(-16px, 8px) rotate(-2deg)', 420);
      }
      fx.current?.claw(p.x, p.y - 10);
      fx.current?.shards(p.x, p.y, 6, '#ffb0a8', 1);
      flash(true, h.crit ? 0.7 : 0.45);
    }
    if (heavy || h.tside === 0) shake(ko ? 9 : heavy ? 7 : 4);
    if (loud) play(h.tside === 0 ? 'hurt' : h.crit ? 'crit' : heavy ? 'heavy' : 'hit');
    const foe = h.tside === 1;
    const label = ko && foe ? '일격' : h.crit ? '치명타' : h.adv === 1 ? '상성 유리' : h.adv === -1 ? '상성 불리' : undefined;
    const slam = !foe ? 2 : solo ? [2.8, 3.4, 4][w] : 1.9 + 0.3 * w;
    number(tk, fmt(h.dmg), `${foe ? 'dmg' : 'hurt'} ${h.crit ? 'crit' : ''} ${h.adv === 1 ? 'adv' : h.adv === -1 ? 'weak' : ''} ${heavy ? 'big' : ''} ${ko && foe ? 'ko' : ''}`, label, slam);
    if (h.side === 0) damage.current[h.slot] = (damage.current[h.slot] ?? 0) + h.dmg;
    const d = disp.current[tk];
    if (d) d.hp = h.hp;
  };

  const die = async (side: 0 | 1, slot: number) => {
    const k = K(side, slot);
    const p = pos(k, 'mid');
    if (side === 1) {
      fx.current?.burst(p.x, p.y, 'dark', 26, 1.2);
      animate(
        nodes.current.get(k),
        [{ opacity: 1, filter: 'none', transform: 'none' }, { filter: 'brightness(2.6) sepia(1) hue-rotate(-30deg)', offset: 0.2 }, { opacity: 0, filter: 'grayscale(1) brightness(.3)', transform: 'translateY(5%) scale(.95)' }],
        700,
        { fill: 'forwards' },
      );
    }
    await sleep(side === 1 ? 500 : 250);
    const d = disp.current[k];
    if (d) d.down = true;
    redraw();
  };

  // 한 번의 행동: ① 예비 동작 → ② 겨누기(카메라가 대상에게) → ③ 내지르기(렌즈 고리) → ④ 접촉과 멈춤 → ⑤ 여운 → ⑥ 한 박자 쉼
  const playAction = async (act: Extract<CombatEvent, { t: 'act' }>, rest: CombatEvent[]) => {
    const key = K(act.side, act.slot);
    const u = unitOf(act.side, act.slot);
    setActing(key);
    redraw();
    if (rest.some((e) => e.t === 'stunned')) {
      const p = pos(key, 'head');
      fx.current?.stars(p.x, p.y);
      number(key, '기절', 'status');
      await sleep(650);
      setActing(null);
      return;
    }
    const sk = rest.find((e): e is Extract<CombatEvent, { t: 'skill' }> => e.t === 'skill');
    const kind = sk?.kind ?? null;
    if (sk && u) await playCutin(u, sk);
    if (run.current.cancelled) return;
    const hits = rest.filter((e): e is Extract<CombatEvent, { t: 'hit' }> => e.t === 'hit');
    const targets = [...new Set(hits.map((h) => K(h.tside, h.tslot)))];
    const weight = Math.max(0, ...hits.map((h) => weightOf(h, kind)));
    const heavy = weight > 0;
    const node = nodes.current.get(key);
    const mine = act.side === 0;

    // ① 예비 동작: 내 편은 패널이 하얗게 두 번 번쩍이고 그 식객이 왼쪽 아래에 크게 서서 한마디 한다.
    //    적은 붉게 달아오르며 몸을 움츠리고, 카메라가 그 적에게 조금 다가간다
    let talking = false;
    if (mine && u) {
      animate(node?.querySelector('.bf-strobe'), [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0, offset: 0.4 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], 300, { easing: 'linear' });
      animate(node, [{ transform: 'none' }, { transform: 'translateY(-12px)', offset: 0.4 }, { transform: 'none' }], 300);
      if (leadId.current !== u.id) setLead(u.id);
      // 기술은 컷인이 말을 대신한다. 3배속에서는 생략
      if (!sk && hits.length && speedRef.current < 3) {
        setBubble({ text: lineOf(u.id, said.current), n: said.current++ });
        talking = true;
        await beat(420);
      } else await sleep(240);
    } else if (hits.length) {
      spotlight([key]);
      camTo(1.1, focus([key]), 300);
      poseTo(node, { transform: 'scale(.95) translateY(-2%)', filter: 'drop-shadow(0 0 14px #ff3b2f) brightness(1.15)' }, 300);
      await sleep(300);
    } else {
      animate(node, [{ filter: 'none' }, { filter: 'drop-shadow(0 0 16px #ff3b2f) brightness(1.2)', offset: 0.45 }, { filter: 'none' }], 460);
      await sleep(240);
    }

    // 내 편을 향한 기술 효과(치유·방어·격려)
    const heals = rest.filter((e): e is Extract<CombatEvent, { t: 'heal' }> => e.t === 'heal');
    for (const h of heals) {
      const k = K(0, h.tslot);
      const p = pos(k, 'mid');
      fx.current?.rise(p.x, p.y + 30, PALETTE.heal, 18, 'star', 30);
      number(k, `+${fmt(h.amount)}`, 'heal');
      const d = disp.current[k];
      if (d) d.hp = h.hp;
    }
    if (heals.length) {
      play('heal');
      redraw();
      await sleep(250);
    }
    if (rest.some((e) => e.t === 'shield')) {
      for (const a of combat.allies) {
        if (disp.current[K(0, a.slot)]?.down) continue;
        const k = K(0, a.slot);
        const p = pos(k, 'mid');
        fx.current?.ring(p.x, p.y, '#8ec2ff', 70, 8);
        fx.current?.rise(p.x, p.y + 30, PALETTE.shield, 8, 'dot', 26);
        animate(nodes.current.get(k)?.querySelector('.bf-shine'), [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], 700);
      }
      play('heal');
      await sleep(250);
    }
    const buffs = rest.filter((e): e is Extract<CombatEvent, { t: 'buff' }> => e.t === 'buff');
    for (const b of buffs.filter((x) => x.kind === 'atkUp')) {
      for (const s of b.slots) {
        const k = K(b.side, s);
        const p = pos(k, 'mid');
        fx.current?.rise(p.x, p.y + 30, PALETTE.gold, 10, 'arrow', 28);
        animate(nodes.current.get(k)?.querySelector('.bf-shine'), [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], 700);
      }
      number(K(b.side, b.slots[0]), '공격↑', 'status');
      await sleep(220);
    }

    if (hits.length) {
      const LUNGE = 90;
      if (mine) {
        // ② 겨누기: 카메라가 맞을 적에게 다가가고, 식객은 몸을 뒤로 당긴다
        spotlight(targets);
        if (targets.length === 1 && hits[0].tside === 1) setTgtSlot(hits[0].tslot);
        camTo(targets.length > 1 ? 1.1 : sk ? 1.34 : 1.24, focus(targets), 300);
        poseTo(leadRef.current, { transform: 'translate(-12px, 8px) scale(.98)' }, 300, 'cubic-bezier(.3,0,.3,1)');
        await sleep(300);
        if (talking) setBubble(null);
        // ③ 내지르기: 식객이 앞으로 튀어 나가고, 대상 둘레에 렌즈 고리가 맺힌다
        for (const k of targets) {
          const w = nodes.current.get(k)?.getBoundingClientRect().width ?? 120;
          lens(k, Math.max(170, w * (heavy ? 1.5 : 1.25)), heavy ? 'rgba(255,120,110,.8)' : 'rgba(255,255,255,.75)', LUNGE);
        }
        poseTo(leadRef.current, { transform: 'translate(24px, -14px) scale(1.045)' }, LUNGE, 'cubic-bezier(.6,0,1,.6)');
      } else {
        // 적이 화면 쪽으로 덮쳐 온다
        poseTo(node, { transform: 'scale(1.3) translateY(14%)', filter: 'drop-shadow(0 0 22px #ff3b2f) brightness(1.3)' }, LUNGE, 'cubic-bezier(.6,0,1,.6)');
      }
      play('whoosh');
      await sleep(LUNGE);
      if (run.current.cancelled) return;
      // ④ 접촉: 모든 대상이 같은 순간에 맞고, 세상이 잠깐 멈춘다(입자도 제자리에 섰다가 풀리면 흩어진다)
      if (fx.current) fx.current.frozen = true;
      hits.forEach((h, i) => impact(h, u, kind, hits.length === 1, i === 0));
      redraw();
      await beat(HOLD[weight]);
      if (fx.current) fx.current.frozen = false;
      // ⑤ 여운: 공격한 쪽이 제자리로
      if (mine) poseTo(leadRef.current, { transform: 'none' }, 460, 'cubic-bezier(.2,.7,.3,1)');
      else poseTo(node, { transform: 'none', filter: 'none' }, 380, 'cubic-bezier(.2,.7,.3,1)');
    }
    for (const b of buffs.filter((x) => x.kind !== 'atkUp')) {
      await sleep(120);
      for (const s of b.slots) {
        const k = K(b.side, s);
        const p = pos(k, 'head');
        if (b.kind === 'stun') {
          fx.current?.stars(p.x, p.y);
          number(k, '기절!', 'status');
        } else {
          fx.current?.burst(p.x, p.y + 40, 'dark', 10, 0.6);
          number(k, '공격↓', 'status down');
        }
      }
    }
    const downs = rest.filter((e): e is Extract<CombatEvent, { t: 'down' }> => e.t === 'down');
    await sleep(hits.length ? 360 : 200);
    if (downs.length) await Promise.all(downs.map((d) => die(d.side, d.slot)));
    // ⑥ 카메라가 물러나고 한 박자 쉰다
    spotlight([]);
    setTgtSlot(null);
    camTo(1, null, 460);
    await sleep(sk ? 380 : 260);
    setDim(false);
    setActing(null);
  };

  const playStep = async (events: CombatEvent[]) => {
    for (let i = 0; i < events.length; i++) {
      if (run.current.cancelled) return;
      const e = events[i];
      if (e.t === 'round') setRound(e.n);
      else if (e.t === 'wave') await playWave(e);
      else if (e.t === 'act') {
        let j = i + 1;
        while (j < events.length && !['act', 'round', 'wave', 'end'].includes(events[j].t)) j++;
        await playAction(e, events.slice(i + 1, j));
        i = j - 1;
      }
    }
  };

  const conclude = () => {
    if (result.current || !combat.result) return result.current;
    result.current = onFinish(combat.result);
    return result.current;
  };

  const playEnding = async () => {
    const o = conclude();
    if (!o) return;
    camTo(1, null, 300);
    spotlight([]);
    setActing(null);
    setEnding(o.won ? 'win' : 'lose');
    play(o.won ? 'win' : 'lose');
    buzz(o.won ? 40 : 20);
    if (o.won) {
      flash(false, 0.8);
      const R = rootRef.current?.getBoundingClientRect();
      if (R) fx.current?.rise(R.width / 2, R.height * 0.45, PALETTE.gold, 40, 'star', R.width / 2.5);
    }
    await sleep(1300);
    setOutcome(o);
  };

  useEffect(() => {
    const r = { cancelled: false };
    run.current = r;
    if (canvasRef.current) {
      fx.current = new FxCanvas(canvasRef.current);
      fx.current.speed = speedRef.current;
      fx.current.setAmbient(true);
    }
    const onResize = () => fx.current?.resize();
    window.addEventListener('resize', onResize);
    (async () => {
      await sleep(350);
      while (!combat.done && !r.cancelled) {
        const events = combat.step();
        await playStep(events);
      }
      if (!r.cancelled) await playEnding();
    })();
    const pending = timers.current;
    return () => {
      r.cancelled = true;
      for (const t of pending) clearTimeout(t);
      pending.clear();
      fx.current?.stop();
      window.removeEventListener('resize', onResize);
    };
  }, [combat]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => {
    run.current.cancelled = true;
    for (const t of timers.current) clearTimeout(t);
    timers.current.clear();
    fx.current?.clear();
    if (fx.current) fx.current.frozen = false;
    spotlight([]);
    layerRef.current?.replaceChildren();
    for (const el of [sceneRef.current, leadRef.current]) for (const a of el?.getAnimations() ?? []) if (!('animationName' in a)) a.cancel();
    for (let i = 0; i < 5000 && !combat.done; i++) {
      for (const e of combat.step()) if (e.t === 'hit' && e.side === 0) damage.current[e.slot] = (damage.current[e.slot] ?? 0) + e.dmg;
    }
    for (const u of combat.allies) disp.current[K(0, u.slot)] = { hp: u.hp, max: u.maxHp, down: u.hp <= 0 };
    for (const u of combat.foes) disp.current[K(1, u.slot)] = { hp: u.hp, max: u.maxHp, down: u.hp <= 0 };
    setFoes(combat.foes.map((u) => ({ ...u })));
    setRound(combat.round);
    setCutin(null);
    setFoeSkill(null);
    setBanner(null);
    setBubble(null);
    setTgtSlot(null);
    setDim(false);
    setActing(null);
    const o = conclude();
    if (o) {
      setEnding(o.won ? 'win' : 'lose');
      play(o.won ? 'win' : 'lose');
      setOutcome(o);
    }
  };

  const mvp = useMemo(() => {
    if (!outcome) return null;
    const best = Object.entries(damage.current).sort((a, b) => b[1] - a[1])[0];
    return (best ? combat.allies.find((a) => a.slot === Number(best[0])) : combat.allies[0]) ?? null;
  }, [outcome, combat]);

  const spots = useMemo(() => arrange(foes), [foes]);
  const boss = foes.find((u) => u.boss);
  const bossDisp = boss ? disp.current[K(1, boss.slot)] : null;
  const tgt = !boss && tgtSlot !== null ? foes.find((u) => u.slot === tgtSlot) : undefined;
  const tgtDisp = tgt ? disp.current[K(1, tgt.slot)] : null;
  const order = combat.done ? [] : combat.upcoming(6);
  const waveNo = Math.max(1, combat.wave + 1);

  return (
    <div className={`bf ${ending ? `end-${ending}` : ''}`} data-region={bg} role="dialog" aria-label={`${title} 전투`} ref={rootRef} style={{ ['--spd' as string]: speed }}>
      <div className="bf-scene" ref={sceneRef}>
        <div className="bf-field" ref={fieldRef}>
          <Art className="bf-bg" src={ART.battle(bg)} fallback={<div className="bf-bg" />} />
          <div className="bf-atmosphere" />
          <div className="bf-fog" />
          <i className="bf-band b1" />
          <i className="bf-band b2" />
          <i className="bf-band b3" />
          {foes.map((u, i) => {
            const s = spots[i] ?? { x: 50, feet: 30, h: 30, z: 1 };
            const d = disp.current[K(1, u.slot)];
            const live = unitOf(1, u.slot);
            return (
              <EnemyFigure
                key={u.id}
                unit={u}
                spot={s}
                down={!!d?.down}
                acting={acting === K(1, u.slot)}
                bodyRef={reg(K(1, u.slot))}
              >
                {!u.boss && d && !d.down && (
                  <div className="bf-tag">
                    <i style={{ background: ELEMENT_COLOR[u.element] }} />
                    <div className="bf-hp">
                      <b className="lag" style={{ width: `${(d.hp / d.max) * 100}%` }} />
                      <b style={{ width: `${(d.hp / d.max) * 100}%` }} />
                    </div>
                    {live?.stunned && <em>기절</em>}
                    {!!live?.atkDown && <em className="down">공↓</em>}
                  </div>
                )}
              </EnemyFigure>
            );
          })}
        </div>
      </div>

      {lead && (
        <div className="bf-lead" ref={(el) => { leadRef.current = el; reg('lead')(el); }}>
          <div className="bf-lead-in" key={lead}>
            <Art className="bf-lead-art" src={ART.full(lead)} alt={YOKAI_BY_ID[lead]?.name} fallback={null} />
            <i className="bf-sil" style={{ WebkitMaskImage: `url(${ART.full(lead)})`, maskImage: `url(${ART.full(lead)})` }} />
          </div>
        </div>
      )}
      {bubble && (
        <div className="bf-bubble" key={bubble.n}>
          <b>{YOKAI_BY_ID[lead]?.name}</b>
          {bubble.text}
        </div>
      )}
      <div className={`bf-dim ${dim ? 'on' : ''}`} />
      <canvas className="bf-canvas" ref={canvasRef} />
      <div className="bf-layer" ref={layerRef} />
      <div className="bf-flash white" ref={whiteRef} />
      <div className="bf-flash red" ref={redRef} />

      <div className="bf-hud">
        <div className="bf-title">
          <b>{title}</b>
          <span>
            WAVE {waveNo}/{setup.waves.length} · {round}라운드
          </span>
        </div>
        <div className="bf-ctrl">
          <button className={auto ? 'on' : ''} onClick={() => setAuto((a) => !a)} aria-pressed={auto}>
            자동
          </button>
          <button onClick={() => setSpeed((v) => (v >= 3 ? 1 : v + 1))} aria-label="배속">
            ×{speed}
          </button>
          {!outcome && (
            <button onClick={skip} aria-label="건너뛰기">
              ▶▶
            </button>
          )}
        </div>
      </div>
      {boss && bossDisp && !bossDisp.down && (
        <div className="bf-bossbar">
          <span>
            <i style={{ background: ELEMENT_COLOR[boss.element] }} />
            {boss.name}
          </span>
          <div className="bf-hp big">
            <b className="lag" style={{ width: `${(bossDisp.hp / bossDisp.max) * 100}%` }} />
            <b style={{ width: `${(bossDisp.hp / bossDisp.max) * 100}%` }} />
          </div>
        </div>
      )}
      {tgt && tgtDisp && !tgtDisp.down && (
        <div className="bf-bossbar tgt" key={tgt.id}>
          <span>
            <i style={{ background: ELEMENT_COLOR[tgt.element] }} />
            {tgt.name}
          </span>
          <div className="bf-hp big">
            <b className="lag" style={{ width: `${(tgtDisp.hp / tgtDisp.max) * 100}%` }} />
            <b style={{ width: `${(tgtDisp.hp / tgtDisp.max) * 100}%` }} />
          </div>
        </div>
      )}
      {order.length > 0 && !ending && (
        <div className="bf-order" aria-label="차례">
          {order.map((o, i) => {
            const u = unitOf(o.side, o.slot);
            if (!u) return null;
            return (
              <span key={`${o.side}${o.slot}${i}`} className={`s${o.side} ${i === 0 ? 'next' : ''}`}>
                <Art src={o.side === 0 ? ART.card(u.id) : u.art} alt={u.name} fallback={<i />} />
              </span>
            );
          })}
        </div>
      )}

      <div className="bf-allies">
        {setup.allies.map((init, i) => {
          if (!init) return <div key={i} className="bf-ally empty" />;
          const u = unitOf(0, i)!;
          const d = disp.current[K(0, i)];
          const ready = !!u.skill && u.cd === 0 && !d?.down;
          const queued = combat.isQueued(i);
          const gauge = u.skill ? Math.min(1, (COMBAT.skillCd - u.cd) / COMBAT.skillCd) : 0;
          return (
            <button
              key={i}
              ref={reg(K(0, i))}
              className={`bf-ally ${d?.down ? 'down' : ''} ${acting === K(0, i) ? 'acting' : ''} ${ready ? 'ready' : ''} ${queued ? 'queued' : ''}`}
              style={{ ['--el' as string]: ELEMENT_COLOR[u.element] }}
              disabled={auto || !ready || !!ending}
              onClick={() => {
                combat.queueSkill(i);
                buzz(15);
                redraw();
              }}
            >
              <span className="bf-ally-art">
                <Art src={ART.full(u.id)} alt={u.name} fallback={<span className="bf-sprite-fb">{u.name}</span>} />
              </span>
              <span className="bf-hurt" />
              <span className="bf-shine" />
              <span className="bf-strobe" />
              {u.shield > 0 && !d?.down && <em className="bf-st sh">{fmt(u.shield)}</em>}
              {u.atkUp > 0 && !d?.down && <em className="bf-st up">공↑</em>}
              {ready && <em className="bf-ready">{auto ? '기술' : queued ? '대기' : '누르기'}</em>}
              <span className="bf-bars">
                <span className="bf-hp mine">
                  <b className="lag" style={{ width: `${((d?.hp ?? 0) / (d?.max ?? 1)) * 100}%` }} />
                  <b style={{ width: `${((d?.hp ?? 0) / (d?.max ?? 1)) * 100}%` }} />
                </span>
                <span className="bf-sp">
                  <b style={{ width: `${gauge * 100}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {banner && (
        <div className={`bf-banner ${banner.boss ? 'boss' : ''}`} key={banner.big + (banner.small ?? '')}>
          <b>{banner.big}</b>
          {banner.small && <span>{banner.small}</span>}
        </div>
      )}
      {foeSkill && (
        <div className="bf-foeskill">
          <Art src={foeSkill.art} alt="" fallback={null} />
          <span>
            <small>{foeSkill.who}</small>
            <b>{foeSkill.name}</b>
          </span>
        </div>
      )}
      {cutin && (
        <div className="bf-cutin" style={{ ['--el' as string]: ELEMENT_COLOR[cutin.el], ['--tint' as string]: SKILL_TINT[cutin.kind] }}>
          <div className="bf-cutin-band">
            <i className="bf-lines" />
            <Art className="bf-cutin-art" src={ART.full(cutin.id)} alt="" fallback={null} />
            <div className="bf-cutin-text">
              <small>
                {YOKAI_BY_ID[cutin.id]?.name} · {ELEMENT_LABEL[cutin.el]}
              </small>
              <b>{cutin.name}</b>
            </div>
          </div>
          <div className="bf-cutin-line">「{ALLY_LINES[cutin.id]?.skill}」</div>
        </div>
      )}
      {ending && !outcome && (
        <div className={`bf-endmark ${ending}`}>
          <b>{ending === 'win' ? '승리' : '패배'}</b>
        </div>
      )}

      {outcome && (
        <div className={`bf-result ${outcome.won ? 'win' : 'lose'}`}>
          {mvp && outcome.won && <Art className="bf-mvp" src={ART.full(mvp.id)} fallback={null} />}
          <div className="bf-result-card">
            <div className={`bf-seal ${outcome.won ? 'win' : 'lose'}`}>{outcome.won ? '승리' : '패배'}</div>
            {outcome.won && (
              <div className="bf-stars" aria-label={`별 ${outcome.stars}개`}>
                {[1, 2, 3].map((n) => (
                  <span key={n} className={n <= outcome.stars ? 'on' : ''} style={{ animationDelay: `${0.15 + n * 0.18}s` }}>
                    ★
                  </span>
                ))}
              </div>
            )}
            {outcome.won ? <RewardList outcome={outcome} /> : <p className="bf-lose">같은 편성·같은 식객 상태면 결과도 같아요. 레벨·별·장비를 올리거나 편성을 바꿔 다시 도전해요.</p>}
            {mvp && outcome.won && (
              <p className="bf-mvp-line">
                MVP <b>{mvp.name}</b> · {ALLY_LINES[mvp.id]?.attack[0]}
              </p>
            )}
            <div className="bf-actions">
              <button className="btn" onClick={onClose}>
                확인
              </button>
              {outcome.won && onNext && (
                <button className="btn hong" onClick={onNext}>
                  {nextLabel}
                </button>
              )}
              {!outcome.won && onRetry && (
                <button className="btn hong" onClick={onRetry}>
                  편성 바꾸기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RewardList({ outcome }: { outcome: BattleOutcome }) {
  const r = outcome.reward ?? {};
  const items = [
    r.jade ? { k: 'jade' as const, n: r.jade } : null,
    r.coin ? { k: 'coin' as const, n: r.coin } : null,
    r.exp ? { k: 'exp' as const, n: r.exp } : null,
    r.fame ? { k: 'fame' as const, n: r.fame } : null,
  ].filter(Boolean) as { k: 'jade' | 'coin' | 'exp' | 'fame'; n: number }[];
  return (
    <div className="bf-rewards">
      {outcome.first && <small>첫 클리어 보상</small>}
      <div>
        {items.map((x) => (
          <span key={x.k}>
            <ResIcon kind={x.k} size={18} />+{fmt(x.n)}
          </span>
        ))}
        {!!r.memory && <span>기억 조각 +{r.memory}</span>}
        {r.items?.map((id) => <span key={id}>〈{ITEM_BY_ID[id]?.name}〉</span>)}
      </div>
      {!!r.recruits?.length && <p className="bf-note">합류: {r.recruits.map((id) => YOKAI_BY_ID[id]?.name).join(', ')}</p>}
      {!!Object.keys(r.shards ?? {}).length && (
        <p className="bf-note">
          {Object.entries(r.shards ?? {})
            .map(([id, n]) => `${YOKAI_BY_ID[id]?.name} 조각 +${n}`)
            .join(', ')}
        </p>
      )}
      {!items.length && !outcome.first && <small>이미 깬 스테이지예요. 별을 더 따면 옥을 받아요.</small>}
      {!!outcome.ranks?.length && <p className="bf-note">관직이 올랐어요!</p>}
    </div>
  );
}
