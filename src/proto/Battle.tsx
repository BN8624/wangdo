// 자동 전투 화면(옆 보기: 우리 편 왼쪽, 적 오른쪽): 계산이 끝난 전투 사건(CombatEvent)을 차례로 재생한다
import { useEffect, useRef, useState } from 'react';
import type { CombatEvent, UnitInit } from '../core/combat';
import { play } from '../ui/sound';
import { FX, MONS, TILES, type MonName, type TileName } from './atlas';
import { CHARS32, type CharName } from './atlas32';
import { MEMBER_NAME } from './data';
import { CutIn } from './Panels';
import { Application, ColorMatrixFilter, Container, Graphics, Sprite, Text } from 'pixi.js';
import { CC, CHAR_DX, CHAR_DY, HEAD_DY, T, dirtAt, drawTile } from './draw';
import type { MapId } from './maps';
import { softTexture } from './light';
import { canvasTexture, charTex, cut as cutTex, monTex } from './pixi';
import type { Effect } from './runner';
import type { Dir, MemberId } from './types';

/** 무대 너비(도트 픽셀). 높이는 화면에 남는 만큼(H0 이상) 늘리고, 그림은 화면 너비에 맞춰 키운다.
 *  2026-11-02: 캐릭터가 크다고 해서 무대를 두 배로 넓히고 배율 K를 절반으로(도트 32px는 그대로) */
const W = 264;
const H0 = 240;
const H_MAX = 336;
const K = 2;
/** 글자(피해 숫자·'빚')는 예전 크기 그대로 */
const TK = 4;

interface U {
  init: UnitInit;
  side: 0 | 1;
  slot: number;
  hp: number;
  max: number;
  alive: boolean;
  x: number;
  y: number;
  lunge: number;
  lungeTo: { x: number; y: number } | null;
  /** 맞은 순간(공격이 닿는 때)과 밀려나는 방향·세기 */
  hitAt: number;
  push: number;
  /** 쓰러진 때: 잠깐 깜빡이다 가라앉으며 사라진다 */
  downAt: number;
}
/** 공격 동작: 뒤로 살짝 뺐다가(준비) 뛰어들어(돌진) 닿은 자리에 멈칫(타격 정지) 했다가 돌아온다 */
const WIND = 0.16;
const DASH = 0.4;
const HOLD = 0.55;
/** 맞은 쪽 반응 시간(×1 속도): 하얗게 번쩍, 밀려났다 돌아옴 */
const HURT_MS = 260;
const WHITE_MS = 90;
const DOWN_MS = 520;
type BurstKind = 'foxfire' | 'dust' | 'ink' | 'red' | 'hit' | 'heal';
interface Burst {
  kind: BurstKind;
  x: number;
  y: number;
  t: number;
  seed: number;
  /** 'hit' 불똥 색(때린 사람마다) */
  color?: number;
  big?: boolean;
}
/** 효과가 피었다 지는 시간(×1 속도) */
const BURST_MS: Record<BurstKind, number> = { foxfire: 700, dust: 600, ink: 1000, red: 450, hit: 300, heal: 900 };
/** 맨손 공격이 닿을 때 튀는 불똥 색: 우리 편은 사람마다, 적은 흰빛 */
const HIT_COLOR: Partial<Record<string, number>> = { me: 0xe0b070, baekseol: 0x9cc8ff, muyeong: 0xff8a3a, sodam: 0x7fe0c8 };

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
  const gap = n > 2 ? 40 : 52;
  const mid = Math.round(h * 0.58);
  const y = Math.round(mid + (slot - (n - 1) / 2) * gap);
  // 우리 편은 왼쪽에서 오른쪽을 보고, 적은 오른쪽에 선다
  if (side === 0) return { x: 52 + (slot % 2) * 22, y };
  // 대장은 보초들보다 앞(왼쪽)에 서서 겹치지 않게
  if (boss) return { x: 150, y: mid + 16 };
  return { x: 200 - (slot % 2) * 24, y };
}

/** 전투 배경: 바닥 타일, 위쪽 바위벽 또는 나무 줄, 위아래 그늘. 도트 크기 그대로 한 장에 굽는다 */
const bgCache = new Map<string, HTMLCanvasElement>();
/** 싸우는 곳: 마을·나루·고갯길·뒷산마다 무대 위·아래 가장자리를 그곳답게 꾸민다(가운데 싸우는 자리는 비운다) */
function battleBackground(ground: 'grass' | 'cave' | 'dirt', H: number, place: MapId | null = null, night = false) {
  const key = `${ground}:${H}:${place}:${night}`;
  const hit = bgCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // 늘 같은 배경이 나오게 무대마다 정해진 난수
  let seed = [...key].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  // 바닥: 같은 타일만 깔면 밋밋하니 무늬 있는 칸을 섞는다
  for (let y = 0; y < H; y += 16)
    for (let x = 0; x < W; x += 16) {
      const r = rnd();
      const t: TileName = ground === 'cave' ? 'cave' : ground === 'dirt' ? (r < 0.12 ? 'd_c3' : r < 0.2 ? 'd_c2' : 'd_c') : r < 0.55 ? 'grass' : pick(['grass2', 'grass3', 'grass4', 'grass5', 'grass6', 'grass7'] as TileName[]);
      drawTile(ctx, t, x, y);
    }
  const top = ground === 'cave' ? 48 : 46;
  const mid = Math.round(H * 0.58);
  /** 싸우는 자리(사람이 서는 띠)인지 */
  const busy = (x: number, y: number) => x > 30 && x < W - 40 && y > mid - 90 && y < mid + 70;
  // 작은 것(돌·풀·꽃): 바닥 전체에 흩뿌린다. 싸우는 자리엔 드문드문만
  const small: TileName[] =
    ground === 'cave'
      ? ['stone', 'rock', 'rock2']
      : place === 'pass'
        ? ['stone', 'stone', 'leafy', 'clover']
        : place === 'ferry'
          ? ['stone', 'clover', 'leafy', 'clover']
          : ground === 'dirt'
            ? ['leafy', 'leafy', 'clover', 'clover', 'bush2', 'stone']
            : ['flower_y', 'flower_r', 'flower_w', 'clover', 'clover', 'leafy'];
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd() * (W - 16));
    const y = top + Math.floor(rnd() * (H - top - 16));
    if (busy(x, y) && rnd() < 0.85) continue;
    drawTile(ctx, pick(small), x, y);
  }
  // 큰 것(바위·그루터기·덤불): 양옆과 아래 가장자리에만
  const big: TileName[] =
    ground === 'cave'
      ? ['boulder', 'rock', 'rock2']
      : place === 'village'
        ? ['straw', 'jar_red', 'straw', 'bush', 'stump']
        : place === 'ferry'
          ? ['stump', 'straw', 'bush2', 'bush']
          : place === 'pass'
            ? ['stump', 'tree_dead', 'bush2', 'stone']
            : ['stump', 'bush', 'bush', 'bush2'];
  for (let i = 0; i < 8; i++) {
    const side = rnd() < 0.5;
    const x = side ? (rnd() < 0.5 ? -10 + Math.floor(rnd() * 22) : W - 24 + Math.floor(rnd() * 16)) : Math.floor(rnd() * (W - 24));
    const y = side ? top + 10 + Math.floor(rnd() * (H - top - 40)) : H - 30 + Math.floor(rnd() * 14);
    drawTile(ctx, pick(big), x, y);
  }
  if (ground === 'cave') {
    for (let x = 0; x < W; x += 16) {
      drawTile(ctx, 'wall', x, 0);
      drawTile(ctx, 'wall', x, 16);
      drawTile(ctx, 'wall_foot', x, 32);
    }
  } else if (place === 'village') {
    // 위: 초가·기와집 지붕이 늘어선 골목, 집 사이는 돌담. 아래: 울타리와 덤불
    for (let x = 0; x < W; x += 16) drawTile(ctx, 'stonewall', x, 28);
    const houses: TileName[] = ['house_thatch', 'house_tile', 'house_thatch', 'jumak', 'house_thatch'];
    for (let i = 0, x = -18 + Math.floor(rnd() * 10); x < W; i++, x += 66 + Math.floor(rnd() * 12)) {
      const h = houses[i % houses.length];
      drawTile(ctx, h, x, 44 - TILES[h][3]);
    }
    drawTile(ctx, 'jar_red', 8, 46);
    drawTile(ctx, 'jar_red', 20, 50);
    drawTile(ctx, 'straw', W - 22, 48);
    drawTile(ctx, 'clothesline', W - 56, 26);
    for (let x = -6; x < W; x += 16) drawTile(ctx, 'fence', x, H - 22);
    for (let x = -4; x < W; x += 40) drawTile(ctx, pick(['bush', 'bush2'] as TileName[]), x + Math.floor(rnd() * 16), H - 14);
  } else if (place === 'ferry') {
    // 위: 강물(물가에서 위로 세 줄), 나루 판자와 매어 둔 배, 물가 갈대. 아래: 갈대와 덤불
    const rows = 3;
    const isWater = (_x: number, y: number) => y < rows;
    for (let y = 0; y < rows + 1; y++)
      for (let x = 0; x < Math.ceil(W / 16); x++) {
        if (y === rows) continue;
        drawTile(ctx, dirtAt(isWater, x, y, 'w'), x * 16, y * 16);
      }
    const px = 16 * Math.floor(W / 16 / 2 + 2);
    for (let y = 0; y < rows; y++) drawTile(ctx, 'pier', px, y * 16);
    drawTile(ctx, 'pier', px, rows * 16);
    drawTile(ctx, 'boat', px - 34, 14);
    drawTile(ctx, 'boat', 30, 4);
    for (let x = 0; x < W; x += 18) if (Math.abs(x - px) > 22 && rnd() < 0.45) drawTile(ctx, pick(['leafy', 'bush2', 'clover'] as TileName[]), x + Math.floor(rnd() * 6), rows * 16 + 2 + Math.floor(rnd() * 4));
    for (let x = -6; x < W; x += 26) drawTile(ctx, pick(['bush', 'bush2', 'bush2'] as TileName[]), x + Math.floor(rnd() * 8), H - 16 + Math.floor(rnd() * 4));
  } else if (place === 'pass') {
    // 위: 바위 벼랑 앞에 소나무·마른 나무. 아래: 그루터기와 덤불
    for (let x = 0; x < W; x += 16) {
      drawTile(ctx, 'wall', x, 0);
      drawTile(ctx, 'wall_foot', x, 16);
    }
    for (let x = -16; x < W; x += 34) drawTile(ctx, rnd() < 0.65 ? 'tree_pine' : 'tree_dead', x + Math.floor(rnd() * 12), 6 + Math.floor(rnd() * 8));
    for (let x = -10; x < W; x += 26) drawTile(ctx, pick(['stump', 'bush2', 'bush', 'tree_dead'] as TileName[]), x + Math.floor(rnd() * 10), H - 22 + Math.floor(rnd() * 8));
    drawTile(ctx, 'sotdae', W - 30, 22);
  } else {
    // 위: 나무 두 줄(뒷줄은 반쯤 가려지게), 덤불
    for (let x = -20; x < W; x += 26) drawTile(ctx, (x / 2) % 3 === 0 ? 'tree_round' : 'tree_pine', x, -14);
    for (let x = -8; x < W; x += 30) drawTile(ctx, (x / 2) % 3 === 0 ? 'tree_round' : 'tree_pine', x, 2);
    for (let x = 6; x < W; x += 34) drawTile(ctx, pick(['bush', 'bush2', 'leafy'] as TileName[]), x + Math.floor(rnd() * 10), 30 + Math.floor(rnd() * 6));
    // 아래: 화면 끝에 걸친 나무 줄로 테두리
    for (let x = -14; x < W; x += 28) drawTile(ctx, rnd() < 0.5 ? 'tree_round' : 'tree_pine', x + Math.floor(rnd() * 8), H - 18 + Math.floor(rnd() * 6));
  }
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(10,8,14,0.7)');
  grad.addColorStop(0.32, 'rgba(10,8,14,0.1)');
  grad.addColorStop(1, 'rgba(10,8,14,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if (night) {
    // 밤: 푸르스름하게 가라앉힌다
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#5a6a9e';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  bgCache.set(key, c);
  return c;
}

/** 사람(짐승·도깨비불은 같은 시트에 있어도 몬스터로 그린다: 떠 있게) */
const isChar = (art: string): art is CharName => art in CHARS32 && !(art in MONS);
/** 크게 그리는 대장: 몬스터 대장 그림, 또는 사람 도트를 BIG_K배로 그리는 흑운채 두목 */
const BIG_CHAR: string[] = ['mokso', 'cheolgom', 'meoksoe'];
const BIG_K = 1.25;
const isBig = (art: string) => art === 'boss_gob' || BIG_CHAR.includes(art);
const isMon = (art: string): art is MonName => art in MONS;

export function Battle({
  fx,
  speed,
  cutins,
  onSpeed,
  onDone,
  where = null,
  night = false,
}: {
  fx: Extract<Effect, { k: 'battle' }>;
  /** 싸우는 곳(맵)과 밤인지: 무대 배경을 그곳답게 */
  where?: MapId | null;
  night?: boolean;
  speed: number;
  cutins: boolean;
  onSpeed: (s: number) => void;
  onDone: () => void;
}) {
  const units = useRef<U[]>([]);
  const placeRef = useRef(where);
  const nightRef = useRef(night);
  placeRef.current = where;
  nightRef.current = night;
  const pops = useRef<Pop[]>([]);
  const fxAt = useRef<{ x: number; y: number; t: number } | null>(null);
  /** 화면 흔들림(도트 단위 세기, 끝나는 시각)과 치명타 번쩍임 */
  const shake = useRef({ mag: 0, from: 0, until: 0, flash: 0 });
  /** 기술 효과: 맞은 자리에서 잠깐 피었다 진다 */
  const bursts = useRef<Burst[]>([]);
  /** 방금 쓴 기술(다음 맞음·버프가 이 기술의 것) */
  const lastSkill = useRef<{ side: 0 | 1; kind: string; art: string } | null>(null);
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
        const boss = !!init.boss && isBig(init.art);
        return { init, side: 1 as const, slot, hp: init.hp, max: init.hp, alive: true, ...place(1, slot, list.length, boss, hRef.current), lunge: 0, lungeTo: null, hitAt: 0, push: 0, downAt: 0 };
      }),
    ];
  };

  if (!units.current.length) {
    const al = fx.setup.allies.filter((a): a is UnitInit => !!a);
    units.current = al.map((init, slot) => ({ init, side: 0 as const, slot, hp: init.hp, max: init.hp, alive: true, ...place(0, slot, al.length, false, hRef.current), lunge: 0, lungeTo: null, hitAt: 0, push: 0, downAt: 0 }));
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
        lastSkill.current = u ? { side: e.side, kind: e.kind, art: u.init.art } : null;
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
          // 공격이 닿는 때: 돌진이 끝나는 순간(멀리서 쏘는 쪽은 바로)
          const contact = a ? (BASE[2] / speedRef.current) * DASH : 0;
          if (a) {
            a.lunge = now;
            a.lungeTo = { x: t.x, y: t.y };
          }
          t.hitAt = now + contact;
          t.push = (t.side === 0 ? -1 : 1) * (e.crit ? 5 : e.skill ? 4 : 3);
          fxAt.current = { x: t.x - 8, y: t.y - 12, t: now + contact };
          // 흔들림: 치명타·기술일수록 세게
          const sk = e.skill ? lastSkill.current : null;
          const mag = sk?.kind === 'strike' && sk.side === 0 ? 3 : e.crit ? 2.5 : e.skill ? 1.6 : 0.8;
          shake.current = { mag, from: now + contact, until: now + contact + (e.crit || sk ? 260 : 140) / speedRef.current, flash: e.crit ? now + contact : shake.current.flash };
          if (!sk && a)
            bursts.current.push({ kind: 'hit', x: t.x + T / 2, y: t.y + T / 2 - 4, t: now + contact, seed: Math.random() * 10, color: HIT_COLOR[a.init.art] ?? 0xfff0d0, big: e.crit });
          if (sk) {
            const kind: BurstKind = sk.side === 1 ? 'red' : sk.art === 'baekseol' ? 'foxfire' : sk.kind === 'strike' ? 'dust' : 'red';
            bursts.current.push({ kind, x: t.x + T / 2, y: t.y + T / 2, t: now, seed: Math.random() * 10 });
          }
          setTimeout(() => {
            pop(t, String(e.dmg), e.crit ? '#ffe066' : '#ffffff', e.crit);
            play(e.crit ? 'crit' : e.skill ? 'heavy' : 'hit');
          }, contact);
        }
        break;
      }
      case 'heal': {
        const t = find(e.side, e.tslot);
        if (t) {
          t.hp = e.hp;
          if (!quiet) {
            pop(t, `+${e.amount}`, '#7fcf7a');
            // 우렁이 밥상: 김이 오르듯 따뜻한 빛 알갱이가 솟는다
            bursts.current.push({ kind: 'heal', x: t.x + T / 2, y: t.y + T / 2, t: now, seed: Math.random() * 10 });
            play('heal');
          }
        }
        break;
      }
      case 'shield':
        if (!quiet) pop(find(e.side, e.slot), '보호막', '#8fc4ff');
        break;
      case 'buff':
        if (!quiet) {
          for (const s of e.slots) pop(find(e.side, s), e.kind === 'atkUp' ? '공격↑' : e.kind === 'atkDown' ? '공격↓' : '기절', '#f2c66d');
          // 빚 독촉: 기가 꺾인 적마다 먹빛 '빚' 글자
          if (e.kind === 'atkDown' && lastSkill.current?.art === 'me')
            for (const s of e.slots) {
              const t = find(e.side, s);
              if (t) bursts.current.push({ kind: 'ink', x: t.x + T / 2, y: t.y - 22, t: now, seed: s });
            }
          // 여우불에 홀려 기절: 푸른 불꽃
          if (e.kind === 'stun' && lastSkill.current?.art === 'baekseol')
            for (const s of e.slots) {
              const t = find(e.side, s);
              if (t) bursts.current.push({ kind: 'foxfire', x: t.x + T / 2, y: t.y + T / 2, t: now, seed: s + 3 });
            }
        }
        break;
      case 'stunned':
        if (!quiet) pop(find(e.side, e.slot), '기절 중', '#c9bda6');
        break;
      case 'down': {
        const u = find(e.side, e.slot);
        if (u) {
          u.alive = false;
          u.hp = 0;
          u.downAt = quiet ? 0 : now;
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
      if (r.width > 0) setH(Math.max(H0, Math.min(H_MAX, Math.round((W * r.height) / r.width))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    for (const u of units.current) {
      const n = units.current.filter((x) => x.side === u.side).length;
      Object.assign(u, place(u.side, u.slot, n, isBig(u.init.art), h));
    }
  }, [h]);

  const skip = () => {
    while (idx.current < fx.events.length) apply(fx.events[idx.current++], true);
    setOver(true);
    setTick((t) => t + 1);
  };

  // 그리기(PixiJS): 배경은 한 장으로 굽고, 사람·체력·효과·숫자만 매 프레임 고친다
  useEffect(() => {
    const host = stage.current;
    if (!host) return;
    let raf = 0;
    let dead = false;
    const app = new Application();
    const world = new Container({ sortableChildren: true });
    world.scale.set(K);
    const bg = new Sprite();
    bg.zIndex = -1e6;
    const bars = new Graphics();
    bars.zIndex = 1e6;
    const cutFx = new Sprite();
    cutFx.zIndex = 1e6 + 1;
    // 발밑 그림자: 배경 위, 사람 아래
    const shadows = new Graphics();
    shadows.zIndex = -5e5;
    // 그린 지도 배경을 가라앉히는 막
    world.addChild(bg, shadows, bars, cutFx);
    // 기술 효과(맞은 자리의 불꽃·먼지)
    const fxLayer = new Container();
    fxLayer.zIndex = 1e6 + 2;
    const dustRings = new Graphics();
    fxLayer.addChild(dustRings);
    world.addChild(fxLayer);
    // 숫자는 확대하지 않은 화면 층에 그려야 번지지 않는다
    const texts = new Container();
    const flash = new Graphics();
    const inkTexts = new Map<Burst, Text>();
    const sprites = new Map<U, Sprite>();
    // 맞은 순간 몸 전체를 하얗게(투명한 곳은 그대로)
    const whiteFilter = new ColorMatrixFilter();
    whiteFilter.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];
    const popTexts = new Map<Pop, Text>();
    let bgKey = '';

    const glowPool: Sprite[] = [];
    const sparkPool: Graphics[] = [];
    const drawBursts = (now: number) => {
      const sp = speedRef.current;
      bursts.current = bursts.current.filter((b) => now - b.t < BURST_MS[b.kind] / sp);
      let g = 0;
      let p = 0;
      const glow = () => {
        let s = glowPool[g++];
        if (!s) {
          s = new Sprite(softTexture());
          s.anchor.set(0.5);
          s.blendMode = 'add';
          glowPool.push(s);
          fxLayer.addChild(s);
        }
        s.visible = true;
        return s;
      };
      const spark = () => {
        let s = sparkPool[p++];
        if (!s) {
          s = new Graphics().rect(-0.5, -0.5, 1, 1).fill(0xffffff);
          sparkPool.push(s);
          fxLayer.addChild(s);
        }
        s.visible = true;
        return s;
      };
      dustRings.clear();
      for (const b of bursts.current) {
        const k = (now - b.t) / (BURST_MS[b.kind] / sp);
        if (k < 0) continue;
        if (b.kind === 'hit') {
          // 맨손 공격: 닿은 자리에서 때린 사람 빛깔 불똥이 사방으로 튄다
          const n = b.big ? 10 : 6;
          const reach = b.big ? 14 : 9;
          for (let i = 0; i < n; i++) {
            const a = b.seed + (i / n) * Math.PI * 2;
            const q = spark();
            q.tint = i % 3 ? b.color ?? 0xffffff : 0xffffff;
            q.position.set(Math.round(b.x + Math.cos(a) * reach * Math.sqrt(k)), Math.round(b.y + Math.sin(a) * reach * 0.7 * Math.sqrt(k) + 4 * k * k));
            q.alpha = 1 - k * k;
          }
          if (k < 0.4) {
            const s = glow();
            s.tint = b.color ?? 0xffffff;
            s.position.set(b.x, b.y);
            s.width = s.height = (b.big ? 22 : 14) * (0.6 + k);
            s.alpha = 0.7 * (1 - k / 0.4);
          }
        } else if (b.kind === 'heal') {
          for (let i = 0; i < 7; i++) {
            const q = spark();
            const ph = (k * 1.4 + i / 7) % 1;
            q.tint = i % 2 ? 0xfff2b0 : 0x9ff0c0;
            q.position.set(Math.round(b.x - 8 + ((i * 37 + b.seed * 5) % 16) + Math.sin(ph * 6 + i) * 1.5), Math.round(b.y + 6 - ph * 22));
            q.alpha = Math.sin(Math.PI * ph) * (1 - k * 0.5);
          }
        } else if (b.kind === 'foxfire' || b.kind === 'red') {
          const s = glow();
          s.tint = b.kind === 'foxfire' ? 0x5aa0ff : 0xff4a3a;
          s.position.set(b.x, b.y);
          s.width = s.height = 10 + 26 * Math.sqrt(k);
          s.alpha = 0.9 * (1 - k);
          if (b.kind === 'foxfire')
            for (let i = 0; i < 6; i++) {
              const a = b.seed + i * 1.05;
              const q = spark();
              q.tint = i % 2 ? 0xbfe3ff : 0x6ab0ff;
              q.position.set(b.x + Math.cos(a) * 9 * k, b.y - 16 * k + Math.sin(a) * 4 * k);
              q.alpha = 1 - k;
            }
        } else if (b.kind === 'dust') {
          // 쇠방망이: 땅에 퍼지는 먼지 고리와 튀는 흙
          dustRings.ellipse(b.x, b.y + 6, 4 + 18 * k, 1.5 + 5 * k).stroke({ color: 0xc9a77a, width: 1.5, alpha: 0.9 * (1 - k) });
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + b.seed;
            const q = spark();
            q.tint = 0xb08a5a;
            q.position.set(b.x + Math.cos(a) * 16 * k, b.y + 6 + Math.sin(a) * 5 * k - 10 * k * (1 - k) * 2);
            q.alpha = 1 - k;
          }
        }
      }
      for (let i = g; i < glowPool.length; i++) glowPool[i].visible = false;
      for (let i = p; i < sparkPool.length; i++) sparkPool[i].visible = false;
      // 빚 독촉의 먹빛 '빚'
      for (const [b, t] of inkTexts)
        if (!bursts.current.includes(b)) {
          t.destroy();
          inkTexts.delete(b);
        }
      for (const b of bursts.current) {
        if (b.kind !== 'ink') continue;
        let t = inkTexts.get(b);
        if (!t) {
          t = new Text({ text: '빚', style: { fontFamily: '"Gowun Batang", serif', fontWeight: '700', fontSize: 12 * TK, fill: '#16121a', stroke: { color: '#e8c873', width: 1.5 * TK } } });
          t.anchor.set(0.5);
          inkTexts.set(b, t);
          texts.addChild(t);
        }
        const k = (now - b.t) / (BURST_MS.ink / sp);
        t.alpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        t.scale.set(1 + 0.25 * (1 - Math.min(1, k * 4)));
        t.position.set(b.x * K, (b.y - 12 * k) * K);
      }
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const H = hRef.current;
      if (app.renderer.width !== W * K || app.renderer.height !== H * K) app.renderer.resize(W * K, H * K);
      const key = `${fx.group.ground}:${H}:${placeRef.current}:${nightRef.current}`;
      if (bgKey !== key) {
        bgKey = key;
        bg.texture = canvasTexture(`battle:${key}`, battleBackground(fx.group.ground, H, placeRef.current, nightRef.current));
      }
      const lungeMs = BASE[2] / speedRef.current;
      // 흔들림: 끝날수록 잦아든다
      const sh = shake.current;
      const left = sh.until - now;
      const amp = left > 0 && now >= sh.from ? sh.mag * Math.min(1, left / (180 / speedRef.current)) : 0;
      world.position.set(Math.round((Math.random() * 2 - 1) * amp * K), Math.round((Math.random() * 2 - 1) * amp * K));
      const flashAge = now - sh.flash;
      flash.clear();
      if (flashAge >= 0 && flashAge < 120) flash.rect(0, 0, W * K, H * K).fill({ color: 0xffffff, alpha: 0.28 * (1 - flashAge / 120) });
      drawBursts(now);
      bars.clear();
      shadows.clear();
      for (const u of units.current) {
        let sp = sprites.get(u);
        if (!sp) {
          sp = new Sprite();
          sprites.set(u, sp);
          world.addChild(sp);
        }
        // 쓰러진 쪽: 두 번 하얗게 깜빡이고 가라앉으며 흐려진다
        const downAge = (now - u.downAt) * speedRef.current;
        const dying = !u.alive && u.downAt > 0 && downAge < DOWN_MS;
        sp.visible = u.alive || dying;
        if (!sp.visible) continue;
        let dx = 0;
        let dy = 0;
        const since = now - u.lunge;
        let pose = -1;
        if (u.lungeTo && since < lungeMs) {
          const s = since / lungeMs;
          const tx = (u.lungeTo.x - u.x) * 0.55;
          const ty = (u.lungeTo.y - u.y) * 0.55;
          const back = tx > 0 ? -1 : 1;
          if (s < WIND) {
            // 준비: 뒤로 2px, 몸을 1px 낮춘다
            const k = Math.sin((s / WIND) * Math.PI * 0.5);
            dx = back * 2 * k;
            dy = 1 * k;
            pose = 1;
          } else if (s < DASH) {
            // 돌진: 빠르게 들어가며 살짝 뛴다
            const k = (s - WIND) / (DASH - WIND);
            const e = 1 - (1 - k) * (1 - k);
            dx = back * 2 * (1 - e) + tx * e;
            dy = ty * e - Math.sin(k * Math.PI) * 3;
            pose = 4;
          } else if (s < HOLD) {
            // 타격 정지: 닿은 자리에서 멈칫
            dx = tx;
            dy = ty;
            pose = 4;
          } else {
            const k = (s - HOLD) / (1 - HOLD);
            const e = k * k * (3 - 2 * k);
            dx = tx * (1 - e);
            dy = ty * (1 - e);
            pose = 0;
          }
        }
        // 맞은 쪽: 공격 반대쪽으로 밀렸다가 돌아온다
        const hurt = (now - u.hitAt) * speedRef.current;
        const white = (hurt >= 0 && hurt < WHITE_MS) || (dying && (downAge < 70 || (downAge > 140 && downAge < 210)));
        if (hurt >= 0 && hurt < HURT_MS) {
          const k = hurt / HURT_MS;
          dx += u.push * (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75);
        }
        if (dying) dy += Math.round((downAge / DOWN_MS) * 3);
        const x = Math.round(u.x + dx);
        const y = Math.round(u.y + dy);
        const fade = dying ? Math.max(0, 1 - Math.max(0, downAge - 210) / (DOWN_MS - 210)) : 1;
        const dir: Dir = u.side === 0 ? 3 : 2;
        const art = u.init.art;
        sp.alpha = fade;
        sp.filters = white ? [whiteFilter] : null;
        // 날아다니는 것(도깨비불·박쥐)은 그림자 없이. 크게 그리는 대장은 그림자도 크게
        if (art !== 'wisp' && art !== 'bat') {
          const wide = isBig(art);
          shadows.ellipse(x + T / 2, y + T - 1 + (wide ? 2 : 0), wide ? 14 : 7, wide ? 3 : 2).fill({ color: 0x000000, alpha: 0.3 * fade });
        }
        sp.zIndex = u.y;
        sp.scale.set(1);
        sp.anchor.set(0);
        if (isChar(art)) {
          const big = BIG_CHAR.includes(art);
          sp.texture = charTex(art, dir, pose >= 0 ? pose : Math.floor(now / 400) % 2);
          // 두목은 1.25배(40×40), 발밑 칸 가운데 아래에 맞춘다
          if (big) {
            sp.scale.set(BIG_K);
            sp.position.set(x + T / 2 - (CC * BIG_K) / 2, y + T - CC * BIG_K);
          } else sp.position.set(x + CHAR_DX, y + CHAR_DY);
        } else if (isMon(art)) {
          const tex = monTex(art, dir, Math.floor(now / 220));
          const w = tex.frame.width;
          sp.texture = tex;
          const fly = art === 'wisp' || art === 'bat' ? Math.round(4 + Math.sin(now / 300 + u.slot) * 1.5) : 0;
          if (w === CC) sp.position.set(x + CHAR_DX, y + CHAR_DY - fly);
          else sp.position.set(x + (w > T ? T / 2 - 25 : 0), y + (w > T ? T - 50 : 0));
        }
        if (u.side === 1) {
          const big = isBig(art);
          const bw = big ? 30 : 16;
          const bx = big ? x - 7 : x;
          const by = BIG_CHAR.includes(art) ? y + T - CC * BIG_K - 2 : big ? y - 36 : y + HEAD_DY - 4;
          bars.rect(bx, by, bw, 2).fill(0x3a2a30);
          const left = Math.max(0, Math.round((bw * u.hp) / u.max));
          if (left) bars.rect(bx, by, left, 2).fill(0xe0574a);
        }
      }
      const f = fxAt.current;
      const k = f ? (now - f.t) / (60 / speedRef.current) : -1;
      cutFx.visible = !!f && k >= 0 && k < 4;
      if (f && cutFx.visible) {
        cutFx.texture = cutTex('fx', FX.cut[0] + Math.floor(k) * 32, FX.cut[1], 32, 32);
        cutFx.position.set(f.x, f.y);
      }
      pops.current = pops.current.filter((p) => now - p.t < 900);
      for (const [p, t] of popTexts)
        if (!pops.current.includes(p)) {
          t.destroy();
          popTexts.delete(p);
        }
      for (const p of pops.current) {
        let t = popTexts.get(p);
        if (!t) {
          t = new Text({
            text: p.text,
            style: { fontFamily: '"Gowun Batang", serif', fontSize: (p.big ? 9 : 7) * TK, fill: p.color, stroke: { color: 'rgba(0,0,0,0.8)', width: 2 * TK }, align: 'center' },
          });
          // 캔버스 글자처럼 가운데 정렬, 글자 바닥선이 그 자리에
          t.anchor.set(0.5, 0.8);
          popTexts.set(p, t);
          texts.addChild(t);
        }
        const age = (now - p.t) / 900;
        t.alpha = 1 - age * age;
        t.position.set(p.x * K, (p.y - age * 10) * K);
      }
      app.render();
    };

    app.init({ background: '#0d0b10', antialias: false, resolution: 1, autoStart: false, width: W * K, height: hRef.current * K, preference: 'webgl' }).then(() => {
      if (dead) {
        app.destroy(true, { children: true });
        return;
      }
      app.stage.addChild(world, texts, flash);
      host.prepend(app.canvas);
      raf = requestAnimationFrame(draw);
    });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      if (app.renderer) app.destroy(true, { children: true });
    };
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
