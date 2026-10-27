// 자동 전투 화면(옆 보기: 우리 편 왼쪽, 적 오른쪽): 계산이 끝난 전투 사건(CombatEvent)을 차례로 재생한다
import { useEffect, useRef, useState } from 'react';
import type { CombatEvent, UnitInit } from '../core/combat';
import { play } from '../ui/sound';
import { CHARS, MONS, type CharName, type MonName, type TileName } from './atlas';
import { MEMBER_NAME } from './data';
import { CutIn } from './Panels';
import { drawChar, drawFx, drawMon, drawTile } from './draw';
import type { Effect } from './runner';
import type { Dir, MemberId } from './types';

/** 무대 너비(도트 픽셀). 높이는 화면에 남는 만큼(H0 이상) 늘리고, 그림은 화면 너비에 맞춰 키운다 */
const W = 132;
const H0 = 120;
const K = 4;

interface U {
  init: UnitInit;
  side: 0 | 1;
  slot: number;
  hp: number;
  max: number;
  alive: boolean;
  x: number;
  y: number;
  flash: number;
  lunge: number;
  lungeTo: { x: number; y: number } | null;
}
interface Pop {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  big: boolean;
}

const BASE: Record<number, number> = { 1: 900, 2: 450, 4: 225 };
const DELAY: Partial<Record<CombatEvent['t'], number>> = { wave: 700, skill: 650, hit: 430, heal: 380, shield: 320, buff: 380, stunned: 380, down: 320 };
/** 우리 편 기술 컷인을 보여 주면 그만큼 더 기다린다 */
export const CUTIN_MS = 450;

function place(side: 0 | 1, slot: number, n: number, boss: boolean, h: number) {
  const gap = n > 2 ? 24 : 30;
  const mid = Math.round(h * 0.58);
  const y = Math.round(mid + (slot - (n - 1) / 2) * gap);
  // 우리 편은 왼쪽에서 오른쪽을 보고, 적은 오른쪽에 선다
  if (side === 0) return { x: 14 + (slot % 2) * 12, y };
  if (boss) return { x: 84, y: mid + 22 };
  return { x: 100 - (slot % 2) * 14, y };
}

const isChar = (art: string): art is CharName => art in CHARS;
const isMon = (art: string): art is MonName => art in MONS;

export function Battle({ fx, speed, cutins, onSpeed, onDone }: { fx: Extract<Effect, { k: 'battle' }>; speed: number; cutins: boolean; onSpeed: (s: number) => void; onDone: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const units = useRef<U[]>([]);
  const pops = useRef<Pop[]>([]);
  const fxAt = useRef<{ x: number; y: number; t: number } | null>(null);
  const [tick, setTick] = useState(0);
  const [banner, setBanner] = useState('');
  const [cut, setCut] = useState<{ who: MemberId; name: string; n: number } | null>(null);
  const cutinsRef = useRef(cutins);
  cutinsRef.current = cutins;
  const [round, setRound] = useState(1);
  const [wave, setWave] = useState({ n: 1, of: fx.setup.waves.length });
  const [over, setOver] = useState(false);
  const idx = useRef(0);
  const actor = useRef<U | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const stage = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(H0);
  const hRef = useRef(H0);
  hRef.current = h;

  const allies = () => units.current.filter((u) => u.side === 0);
  const foeWave = (n: number) => {
    const list = fx.setup.waves[n - 1] ?? [];
    units.current = [
      ...allies(),
      ...list.map((init, slot) => {
        const boss = !!init.boss && init.art === 'boss_gob';
        return { init, side: 1 as const, slot, hp: init.hp, max: init.hp, alive: true, ...place(1, slot, list.length, boss, hRef.current), flash: 0, lunge: 0, lungeTo: null };
      }),
    ];
  };

  if (!units.current.length) {
    const al = fx.setup.allies.filter((a): a is UnitInit => !!a);
    units.current = al.map((init, slot) => ({ init, side: 0 as const, slot, hp: init.hp, max: init.hp, alive: true, ...place(0, slot, al.length, false, hRef.current), flash: 0, lunge: 0, lungeTo: null }));
    foeWave(1);
  }

  const find = (side: number, slot: number) => units.current.find((u) => u.side === side && u.slot === slot);
  const pop = (u: U | undefined, text: string, color: string, big = false) => {
    if (u) pops.current.push({ x: u.x + 8, y: u.y - 6, text, color, t: performance.now(), big });
  };

  /** 사건 하나를 상태에 반영한다. quiet면 소리·연출 없이(건너뛰기) */
  const apply = (e: CombatEvent, quiet: boolean) => {
    const now = performance.now();
    switch (e.t) {
      case 'wave':
        if (e.n > 1) foeWave(e.n);
        setWave({ n: e.n, of: e.of });
        if (!quiet && e.of > 1) setBanner(`${e.n} / ${e.of} 무리`);
        break;
      case 'round':
        setRound(e.n);
        break;
      case 'act':
        actor.current = find(e.side, e.slot) ?? null;
        break;
      case 'skill': {
        const u = find(e.side, e.slot);
        if (!quiet) {
          if (e.side === 0 && cutinsRef.current && u) setCut({ who: u.init.id as MemberId, name: e.name, n: performance.now() });
          else setBanner(`${u?.init.name ?? ''} · ${e.name}`);
          play('skill');
        }
        break;
      }
      case 'hit': {
        const a = find(e.side, e.slot);
        const t = find(e.tside, e.tslot);
        if (!t) break;
        t.hp = e.hp;
        if (!quiet) {
          if (a) {
            a.lunge = now;
            a.lungeTo = { x: t.x, y: t.y };
          }
          t.flash = now + 120;
          fxAt.current = { x: t.x - 8, y: t.y - 12, t: now + 120 };
          setTimeout(() => {
            pop(t, String(e.dmg), e.crit ? '#ffe066' : '#ffffff', e.crit);
          }, 120 / speedRef.current);
          play(e.crit ? 'crit' : e.skill ? 'heavy' : 'hit');
        }
        break;
      }
      case 'heal': {
        const t = find(e.side, e.tslot);
        if (t) {
          t.hp = e.hp;
          if (!quiet) {
            pop(t, `+${e.amount}`, '#7fcf7a');
            play('heal');
          }
        }
        break;
      }
      case 'shield':
        if (!quiet) pop(find(e.side, e.slot), '보호막', '#8fc4ff');
        break;
      case 'buff':
        if (!quiet) for (const s of e.slots) pop(find(e.side, s), e.kind === 'atkUp' ? '공격↑' : e.kind === 'atkDown' ? '공격↓' : '기절', '#f2c66d');
        break;
      case 'stunned':
        if (!quiet) pop(find(e.side, e.slot), '기절 중', '#c9bda6');
        break;
      case 'down': {
        const u = find(e.side, e.slot);
        if (u) {
          u.alive = false;
          u.hp = 0;
        }
        break;
      }
      case 'end':
        setOver(true);
        if (!quiet) play(e.won ? 'win' : 'lose');
        break;
    }
  };

  // 사건 재생
  useEffect(() => {
    if (over) return;
    let timer = 0;
    const run = () => {
      const e = fx.events[idx.current];
      if (!e) {
        setOver(true);
        return;
      }
      idx.current++;
      apply(e, false);
      setTick((t) => t + 1);
      const d = ((DELAY[e.t] ?? 0) + (e.t === 'skill' && e.side === 0 && cutinsRef.current ? CUTIN_MS : 0)) / speedRef.current;
      timer = window.setTimeout(run, d);
    };
    timer = window.setTimeout(run, 500 / speedRef.current);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx, over]);

  useEffect(() => {
    if (!cut) return;
    const t = setTimeout(() => setCut(null), (650 + CUTIN_MS) / speedRef.current);
    return () => clearTimeout(t);
  }, [cut]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(''), 900 / speedRef.current);
    return () => clearTimeout(t);
  }, [banner]);

  // 무대 높이를 화면에 맞추고, 바뀌면 자리를 다시 잡는다
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setH(Math.max(H0, Math.min(168, Math.round((W * r.height) / r.width))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    for (const u of units.current) {
      const n = units.current.filter((x) => x.side === u.side).length;
      Object.assign(u, place(u.side, u.slot, n, u.init.art === 'boss_gob', h));
    }
  }, [h]);

  const skip = () => {
    while (idx.current < fx.events.length) apply(fx.events[idx.current++], true);
    setOver(true);
    setTick((t) => t + 1);
  };

  // 그리기
  useEffect(() => {
    let raf = 0;
    const floor: TileName = fx.group.ground === 'cave' ? 'cave' : fx.group.ground === 'dirt' ? 'd_c' : 'grass';
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const c = cv.current;
      if (!c) return;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(K, 0, 0, K, 0, 0);
      const H = hRef.current;
      for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) drawTile(ctx, floor, x, y);
      // 위쪽 배경: 굴이면 바위벽, 아니면 나무 줄
      if (fx.group.ground === 'cave') {
        for (let x = 0; x < W; x += 16) {
          drawTile(ctx, 'wall', x, 0);
          drawTile(ctx, 'wall', x, 16);
          drawTile(ctx, 'wall_foot', x, 32);
        }
      } else {
        for (let x = -8; x < W; x += 30) drawTile(ctx, (x / 2) % 3 === 0 ? 'tree_round' : 'tree_pine', x, 0);
        for (let x = 6; x < W; x += 44) drawTile(ctx, 'bush', x, 30);
      }
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(10,8,14,0.7)');
      grad.addColorStop(0.32, 'rgba(10,8,14,0.1)');
      grad.addColorStop(1, 'rgba(10,8,14,0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      const lungeMs = BASE[2] / speedRef.current;
      const list = [...units.current].sort((a, b) => a.y - b.y);
      for (const u of list) {
        if (!u.alive) continue;
        let dx = 0;
        let dy = 0;
        const since = now - u.lunge;
        if (u.lungeTo && since < lungeMs) {
          const k = since < lungeMs * 0.4 ? since / (lungeMs * 0.4) : 1 - (since - lungeMs * 0.4) / (lungeMs * 0.6);
          dx = (u.lungeTo.x - u.x) * 0.55 * k;
          dy = (u.lungeTo.y - u.y) * 0.55 * k;
        }
        const x = Math.round(u.x + dx);
        const y = Math.round(u.y + dy);
        const dir: Dir = u.side === 0 ? 3 : 2;
        const art = u.init.art;
        const flashing = u.flash > now - 140 && u.flash < now + 20;
        if (flashing) ctx.globalAlpha = 0.45;
        if (isChar(art)) drawChar(ctx, art, dir, since < lungeMs ? 4 : Math.floor(now / 400) % 2, x, y);
        else if (isMon(art)) drawMon(ctx, art, dir, Math.floor(now / 220), x, y);
        ctx.globalAlpha = 1;
        if (u.side === 1) {
          const bw = art === 'boss_gob' ? 30 : 14;
          const bx = art === 'boss_gob' ? x - 7 : x + 1;
          const by = art === 'boss_gob' ? y - 36 : y - 7;
          ctx.fillStyle = '#3a2a30';
          ctx.fillRect(bx, by, bw, 2);
          ctx.fillStyle = '#e0574a';
          ctx.fillRect(bx, by, Math.max(0, Math.round((bw * u.hp) / u.max)), 2);
        }
      }
      const f = fxAt.current;
      if (f) {
        const k = (now - f.t) / (60 / speedRef.current);
        if (k >= 0 && k < 4) drawFx(ctx, 'cut', Math.floor(k), f.x, f.y);
      }
      ctx.textAlign = 'center';
      pops.current = pops.current.filter((p) => now - p.t < 900);
      for (const p of pops.current) {
        const age = (now - p.t) / 900;
        ctx.font = `${p.big ? 9 : 7}px "Gowun Batang", serif`;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.globalAlpha = 1 - age * age;
        ctx.strokeText(p.text, p.x, p.y - age * 10);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y - age * 10);
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [fx]);

  const party = allies();
  const r = fx.reward;
  void tick;
  return (
    <div className="battle">
      <div className="battle-top">
        <b>{fx.group.name}</b>
        <span className="gear">
          {wave.of > 1 ? `${wave.n}/${wave.of} 무리 · ` : ''}
          {round}라운드
        </span>
      </div>
      <div className="stage" ref={stage}>
        <canvas ref={cv} width={W * K} height={h * K} />
        <div className="banner">{banner && <span>{banner}</span>}</div>
        {cut && <CutIn key={cut.n} who={cut.who} name={cut.name} />}
      </div>
      <div className="roster">
        {party.map((u) => (
          <div key={u.slot} className={`unit-row ${u.alive ? '' : 'down'}`}>
            <span>{MEMBER_NAME[u.init.id as MemberId] ?? u.init.name}</span>
            <div className="bar">
              <i style={{ width: `${(100 * u.hp) / u.max}%` }} />
            </div>
            <span className="num">
              {u.hp}/{u.max}
            </span>
          </div>
        ))}
      </div>
      {over ? (
        <div className="sheet">
          <p className="prompt" style={{ textAlign: 'center' }}>
            {fx.result.won ? '이겼다!' : '쓰러졌다……'}
          </p>
          {fx.result.won && r ? (
            <p style={{ textAlign: 'center', margin: '0 0 10px', lineHeight: 1.7 }}>
              경험치 +{r.exp} · <span className="coin">엽전 +{r.coin}</span>
              {r.ups.map((u) => (
                <span key={u.id} style={{ display: 'block', color: 'var(--gold)' }}>
                  {MEMBER_NAME[u.id]} 레벨 업! Lv{u.level}
                </span>
              ))}
            </p>
          ) : (
            <p className="gear" style={{ textAlign: 'center', margin: '0 0 10px' }}>
              마지막 쉼터로 돌아간다.
            </p>
          )}
          <button
            className="opt primary"
            style={{ width: '100%' }}
            onClick={() => {
              if (r?.ups.length) play('levelup');
              onDone();
            }}
          >
            계속
          </button>
        </div>
      ) : (
        <div className="battle-ctl">
          {[1, 2, 4].map((s) => (
            <button key={s} className={`toggle ${speed === s ? 'on' : ''}`} onClick={() => onSpeed(s)}>
              ×{s}
            </button>
          ))}
          <button className="toggle" onClick={skip}>
            건너뛰기
          </button>
        </div>
      )}
    </div>
  );
}
