// 턴제 전투 화면. 위쪽 전장에 적이 전신으로 서고, 아래에 내 편 다섯이 패널로 선다.
// combat.ts의 Combat을 한 차례씩 진행하며, 차례마다 돌진·도약·베기·피격·입자·숫자·흔들림으로 연출한다.
// 고유 기술은 화면을 어둡게 하고 전신 컷인을 띄운 뒤 기술마다 다른 효과를 낸다. 자동·수동, 1~3배속, 건너뛰기.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { COMBAT, Combat, type CombatEvent, type CombatResult, type CombatSetup, type SkillKind, type Unit } from '../core/combat';
import { fmt } from '../core/format';
import type { StageReward } from '../core/campaign';
import { ART } from '../data/art';
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

/** 적 배치: 대장은 앞 가운데 크게, 나머지는 앞줄·뒷줄로 */
function arrange(foes: Unit[]): Spot[] {
  const F = (x: number): Spot => ({ x, feet: 25, h: 30, z: 3 });
  const B = (x: number): Spot => ({ x, feet: 40, h: 25, z: 2 });
  const far = (x: number): Spot => ({ x, feet: 47, h: 21, z: 1 });
  const boss = foes.findIndex((u) => u.boss);
  if (boss >= 0) {
    const others = foes.length - 1;
    const rest = others <= 0 ? [] : others === 1 ? [B(80)] : others === 2 ? [B(15), B(85)] : [B(13), B(87), far(50), far(30)];
    let k = 0;
    return foes.map((_, i) => (i === boss ? { x: 50, feet: 23, h: 42, z: 4 } : rest[k++] ?? B(50)));
  }
  const layouts: Spot[][] = [[], [F(50)], [F(29), F(71)], [B(50), F(23), F(77)], [B(30), B(70), F(18), F(82)], [B(15), B(50), B(85), F(31), F(69)]];
  return layouts[Math.min(5, foes.length)];
}

// 전장용 전신은 별도 원화다. 아직 준비되지 않은 적은 기존 초상을 계속 쓴다.
const missingEnemyFigures = new Set<string>();

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
  const figure = source ? ART.enemy(source[1] as 'boss' | 'grunt', source[2]) : null;
  const [failedFigure, setFailedFigure] = useState<string | null>(null);
  const full = !!figure && !missingEnemyFigures.has(figure) && failedFigure !== figure;

  return (
    <div
      className={`bf-foe ${full ? 'full' : 'portrait'} ${down ? 'dead' : ''} ${acting ? 'acting' : ''} ${unit.boss ? 'boss' : ''}`}
      style={{ left: `${spot.x}%`, bottom: `${spot.feet}%`, height: `${spot.h * (full ? 1.16 : 1)}%`, zIndex: spot.z }}
    >
      <div className="bf-shadow" />
      <div className="bf-body" ref={bodyRef}>
        {full ? (
          <img
            className="bf-sprite"
            src={figure}
            alt={unit.name}
            draggable={false}
            onError={() => {
              missingEnemyFigures.add(figure);
              setFailedFigure(figure);
            }}
          />
        ) : (
          <Art className="bf-sprite" src={unit.art} alt={unit.name} fallback={<div className="bf-sprite-fb">{unit.name}</div>} />
        )}
      </div>
      {children}
    </div>
  );
}

const SKILL_TINT: Record<SkillKind, string> = { strike: '#e0603c', stun: '#9a6ad0', weaken: '#5b4a8a', rally: '#d9a72a', guard: '#3f87c9', heal: '#3fb86a' };

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

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);
  const redRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
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
  const sleep = (ms: number) =>
    new Promise<void>((done) => {
      const t = setTimeout(() => {
        timers.current.delete(t);
        done();
      }, ms / speedRef.current);
      timers.current.add(t);
    });
  const dur = (ms: number) => ms / speedRef.current;
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
    const fy = part === 'head' ? (foe ? 0.2 : 0.12) : part === 'feet' ? 0.92 : foe ? 0.42 : 0.42;
    return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height * fy };
  };
  const animate = (el: Element | HTMLElement | null | undefined, frames: Keyframe[], ms: number, opts: KeyframeAnimationOptions = {}) => {
    if (el && 'animate' in el) (el as HTMLElement).animate(frames, { duration: dur(ms), easing: 'ease-out', ...opts });
  };
  const shake = (p: number) => {
    const f: Keyframe[] = [{ transform: 'translate(0,0)' }];
    for (let i = 0; i < 5; i++) f.push({ transform: `translate(${(i % 2 ? -1 : 1) * p * (1 - i / 5)}px, ${(i % 2 ? 1 : -1) * p * 0.5 * (1 - i / 5)}px)` });
    f.push({ transform: 'translate(0,0)' });
    animate(fieldRef.current, f, 320, { easing: 'linear' });
  };
  const zoom = () => animate(sceneRef.current, [{ transform: 'scale(1)' }, { transform: 'scale(1.045)', offset: 0.25 }, { transform: 'scale(1)' }], 420);
  const flash = (red = false, a = 0.5) => animate(red ? redRef.current : whiteRef.current, [{ opacity: 0 }, { opacity: a, offset: 0.15 }, { opacity: 0 }], red ? 420 : 260);
  const number = (key: string, text: string, kind: string, label?: string) => {
    const layer = layerRef.current;
    if (!layer) return;
    const p = pos(key, 'head');
    const d = document.createElement('div');
    d.className = `bf-num ${kind}`;
    d.style.left = `${p.x + (Math.random() - 0.5) * 30}px`;
    d.style.top = `${p.y}px`;
    d.style.setProperty('--d', `${dur(1000)}ms`);
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
    }, dur(1050));
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

  const impact = (h: Extract<CombatEvent, { t: 'hit' }>, atk: Unit | undefined, kind: SkillKind | null) => {
    const tk = K(h.tside, h.tslot);
    const el = atk?.element ?? 'fire';
    const p = pos(tk, 'mid');
    const big = kind === 'strike' || kind === 'stun';
    if (h.tside === 1) {
      fx.current?.slash(p.x, p.y, el, big || h.crit);
      if (big) fx.current?.slash(p.x, p.y, el, true, 0.7);
      fx.current?.burst(p.x, p.y, el, big ? 34 : h.crit ? 26 : 16, big ? 1.5 : 1);
      fx.current?.ring(p.x, p.y, PALETTE[el][1], big ? 110 : 60, big ? 10 : 6);
      animate(
        nodes.current.get(tk),
        [{ filter: 'brightness(1)', transform: 'none' }, { filter: 'brightness(3) saturate(0)', transform: `translate(${big ? 14 : 7}px, -6px)`, offset: 0.12 }, { filter: 'brightness(1)', transform: 'translate(-4px, 2px)', offset: 0.5 }, { transform: 'none' }],
        420,
      );
    } else {
      fx.current?.claw(p.x, p.y - 10);
      fx.current?.burst(p.x, p.y, 'none', 10, 0.8);
      animate(nodes.current.get(tk), [{ transform: 'none' }, { transform: 'translate(-7px, 4px) rotate(-2deg)', offset: 0.2 }, { transform: 'translate(5px, 0) rotate(1deg)', offset: 0.5 }, { transform: 'none' }], 380);
      animate(nodes.current.get(tk)?.querySelector('.bf-hurt'), [{ opacity: 0 }, { opacity: 0.85, offset: 0.15 }, { opacity: 0 }], 420);
      flash(true, h.crit ? 0.8 : 0.45);
    }
    if (h.crit) {
      flash(false, 0.35);
      zoom();
    }
    shake(h.crit ? 12 : big ? 10 : h.tside === 0 ? 6 : 4);
    play(h.crit ? 'crit' : 'hit');
    const label = h.crit ? '치명!' : h.adv === 1 ? '상성 유리' : h.adv === -1 ? '상성 불리' : undefined;
    number(tk, fmt(h.dmg), `${h.tside === 0 ? 'hurt' : 'dmg'} ${h.crit ? 'crit' : ''} ${h.adv === 1 ? 'adv' : h.adv === -1 ? 'weak' : ''} ${big ? 'big' : ''}`, label);
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
    // 움직임: 내 편은 패널이 솟고, 적은 앞으로 덤벼든다
    const node = nodes.current.get(key);
    if (act.side === 0) animate(node, [{ transform: 'none' }, { transform: 'translateY(-18px) scale(1.06)', offset: 0.4 }, { transform: 'none' }], 320);
    else animate(node, [{ transform: 'none' }, { transform: 'translateY(9%) scale(1.13)', offset: 0.45 }, { transform: 'none' }], 440, { easing: 'cubic-bezier(.3,.1,.3,1)' });
    await sleep(act.side === 0 ? 170 : 220);

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

    // 타격: 내 편은 빛줄기가 날아가 꽂힌다
    const hits = rest.filter((e): e is Extract<CombatEvent, { t: 'hit' }> => e.t === 'hit');
    if (act.side === 0 && hits.length) {
      const from = pos(key, 'head');
      for (const h of hits) {
        const to = pos(K(h.tside, h.tslot), 'mid');
        fx.current?.comet(from.x, from.y, to.x, to.y, u?.element ?? 'none', dur(kind ? 240 : 190));
      }
      await sleep(kind ? 230 : 180);
    }
    for (let i = 0; i < hits.length; i++) {
      if (i > 0) await sleep(kind === 'weaken' ? 90 : 60);
      if (run.current.cancelled) return;
      impact(hits[i], u, kind);
      redraw();
      // 세게 맞으면 잠깐 멈춘다(타격감)
      if (hits[i].crit || kind === 'strike' || kind === 'stun') await sleep(90);
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
    if (downs.length) {
      await sleep(200);
      await Promise.all(downs.map((d) => die(d.side, d.slot)));
    }
    await sleep(sk ? 520 : hits.length ? 380 : 300);
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
    layerRef.current?.replaceChildren();
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
  const order = combat.done ? [] : combat.upcoming(6);
  const waveNo = Math.max(1, combat.wave + 1);

  return (
    <div className={`bf ${ending ? `end-${ending}` : ''}`} data-region={bg} role="dialog" aria-label={`${title} 전투`} ref={rootRef} style={{ ['--spd' as string]: speed }}>
      <div className="bf-scene" ref={sceneRef}>
        <div className="bf-field" ref={fieldRef}>
          <Art className="bf-bg" src={ART.battle(bg)} fallback={<div className="bf-bg" />} />
          <div className="bf-atmosphere" />
          <div className="bf-fog" />
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
