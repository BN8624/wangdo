// 도트 그리기: 그림 불러오기, 맵 미리 굽기, 캐릭터·몬스터 한 칸 그리기
import { CHARS, FACES, FX, MONS, TILES, type CharName, type FaceName, type MonName, type Rect, type TileName } from './atlas';
import { MAPS, grid, type MapId } from './maps';
import type { Dir } from './types';

export const T = 16;
/** 캐릭터 한 칸 높이(머리 위 여백 4) */
export const CH = 20;

const SRC = { tiles: 'proto/tiles.png', chars: 'proto/chars.png', mons: 'proto/mons.png', faces: 'proto/faces.png', fx: 'proto/fx.png' };
type Sheet = keyof typeof SRC;
const imgs: Partial<Record<Sheet, HTMLImageElement>> = {};

export function loadArt(): Promise<void> {
  return Promise.all(
    (Object.keys(SRC) as Sheet[]).map(
      (k) =>
        new Promise<void>((res, rej) => {
          const im = new Image();
          im.onload = () => {
            imgs[k] = im;
            res();
          };
          im.onerror = () => rej(new Error(`그림을 못 불러왔어요: ${SRC[k]}`));
          im.src = SRC[k];
        }),
    ),
  ).then(() => undefined);
}

export const sheet = (s: Sheet) => imgs[s]!;

function blit(ctx: CanvasRenderingContext2D, s: Sheet, r: Rect, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, scale = 1, flip = false) {
  const im = imgs[s];
  if (!im) return;
  if (flip) {
    ctx.save();
    ctx.translate(dx + sw * scale, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(im, r[0] + sx, r[1] + sy, sw, sh, 0, 0, sw * scale, sh * scale);
    ctx.restore();
  } else ctx.drawImage(im, r[0] + sx, r[1] + sy, sw, sh, dx, dy, sw * scale, sh * scale);
}

export function drawTile(ctx: CanvasRenderingContext2D, name: TileName, dx: number, dy: number, scale = 1) {
  const r = TILES[name];
  blit(ctx, 'tiles', r, 0, 0, r[2], r[3], dx, dy, scale);
}

/** 걷는 캐릭터 한 칸. row 0~3 걷기, 4 공격. (dx, dy)는 발밑 칸의 왼쪽 위 */
export function drawChar(ctx: CanvasRenderingContext2D, c: CharName, dir: Dir, row: number, dx: number, dy: number, scale = 1) {
  blit(ctx, 'chars', CHARS[c], dir * T, row * CH, T, CH, dx, dy - (CH - T) * scale, scale);
}

/** 몬스터 한 칸(64×64 시트: 열 = 방향, 줄 = 걸음). 대장은 50×50 다섯 장 */
export function drawMon(ctx: CanvasRenderingContext2D, m: MonName, dir: Dir, frame: number, dx: number, dy: number, scale = 1) {
  const r = MONS[m];
  if (r[2] > 64) {
    const f = frame % 5;
    // 발밑 칸 가운데에 맞춘다
    blit(ctx, 'mons', r, f * 50, 0, 50, 50, dx + (T / 2 - 25) * scale, dy + (T - 50) * scale, scale);
    return;
  }
  blit(ctx, 'mons', r, dir * T, (frame % 4) * T, T, T, dx, dy, scale);
}

export function drawFace(ctx: CanvasRenderingContext2D, f: FaceName, dx: number, dy: number, scale = 1) {
  const r = FACES[f];
  blit(ctx, 'faces', r, 0, 0, r[2], r[3], dx, dy, scale);
}

export function drawFx(ctx: CanvasRenderingContext2D, name: keyof typeof FX, frame: number, dx: number, dy: number, scale = 1) {
  blit(ctx, 'fx', FX[name], (frame % 4) * 32, 0, 32, 32, dx, dy, scale);
}

const hash = (x: number, y: number) => (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0;

function grassAt(x: number, y: number): TileName {
  const v = hash(x, y) % 24;
  return v < 17 ? 'grass' : (['grass2', 'grass3', 'grass4', 'grass5', 'grass6', 'grass7', 'grass2'] as TileName[])[v - 17];
}

/** 이웃 네 방향의 흙길 여부로 고르는 흙길 타일 */
function dirtAt(isDirt: (x: number, y: number) => boolean, x: number, y: number): TileName {
  const n = isDirt(x, y - 1);
  const e = isDirt(x + 1, y);
  const s = isDirt(x, y + 1);
  const w = isDirt(x - 1, y);
  const key = `${n ? 'N' : ''}${e ? 'E' : ''}${s ? 'S' : ''}${w ? 'W' : ''}`;
  const table: Record<string, TileName> = {
    '': 'd_one',
    N: 'd_vb',
    S: 'd_vt',
    NS: 'd_vm',
    E: 'd_hl',
    W: 'd_hr',
    EW: 'd_hm',
    ES: 'd_tl',
    SW: 'd_tr',
    NE: 'd_bl',
    NW: 'd_br',
    ESW: 'd_t',
    NEW: 'd_b',
    NES: 'd_l',
    NSW: 'd_r',
    NESW: hash(x, y) % 9 === 0 ? 'd_c3' : 'd_c',
  };
  return table[key];
}

const mapCache = new Map<MapId, HTMLCanvasElement>();

/** 땅·소품·도장을 16px 그대로 한 장에 굽는다(사람·상자는 매 프레임 따로) */
export function mapCanvas(id: MapId): HTMLCanvasElement {
  const hit = mapCache.get(id);
  if (hit) return hit;
  const g = grid(id);
  const cv = document.createElement('canvas');
  cv.width = g.w * T;
  cv.height = g.h * T;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const cell = (x: number, y: number) => (x < 0 || y < 0 || x >= g.w || y >= g.h ? null : g.ground[y][x]);
  const isDirt = (x: number, y: number) => {
    const c = cell(x, y);
    return c === null ? cell(Math.max(0, Math.min(g.w - 1, x)), Math.max(0, Math.min(g.h - 1, y))) === ':' : c === ':';
  };
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = g.ground[y][x];
      const dx = x * T;
      const dy = y * T;
      if (c === ' ') {
        ctx.fillStyle = '#0d0b10';
        ctx.fillRect(dx, dy, T, T);
      } else if (c === '#') {
        ctx.fillStyle = '#1a1620';
        ctx.fillRect(dx, dy, T, T);
        drawTile(ctx, cell(x, y + 1) === '#' || cell(x, y + 1) === null ? 'wall' : 'wall_foot', dx, dy);
      } else if (c === '_') {
        drawTile(ctx, 'cave', dx, dy);
      } else {
        drawTile(ctx, grassAt(x, y), dx, dy);
        if (c === ':') drawTile(ctx, dirtAt(isDirt, x, y), dx, dy);
      }
    }
  // deco 층: tiles.png의 16×16 칸을 그대로
  for (const d of MAPS[id].deco) blit(ctx, 'tiles', [0, 0, 0, 0], d.sx, d.sy, T, T, d.x * T, d.y * T);
  mapCache.set(id, cv);
  return cv;
}

export const isCave = (id: MapId) => !!MAPS[id].cave;
