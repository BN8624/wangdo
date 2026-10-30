// 시제품 맵: Tiled(https://www.mapeditor.org)로 그린 src/proto/maps/<id>.tmj를 읽는다. 한 칸이 16×16이다.
//  층: terrain(땅: 풀·흙길·동굴 바닥·동굴 벽·어둠. 실제 그림은 이웃을 보고 코드가 고른다)
//      deco(집·나무·소품. tiles.png를 16칸 격자로 쓴 deco.tsj, 막히는 칸은 타일 속성 solid,
//           나무·지붕 윗줄처럼 지나가는 사람을 덮는 칸은 above)
//      objects(점 오브젝트. type: actor 사람·짐승 / chest 상자 / point 대본이 쓰는 이름 지점 / light 등잔·횃불 / smoke 굴뚝 연기)
//  그린 지도(B안): 맨 아래 imagelayer 'paint'에 그림 한 장, 칸은 32px. terrain은 걷는 칸(풀)과 막힌 칸(벽)의 뜻만 쓰고 그리지 않는다
//  맵 속성: name(화면에 띄울 이름), bgm, cave(동굴 맵), ambient(떠다니는 것: leaves 낙엽·dust 먼지·none)
import type { Actor, Dir, Pt } from './types';
import terrainTsj from './maps/terrain.tsj?raw';
import decoTsj from './maps/deco.tsj?raw';
import backhill from './maps/backhill.tmj?raw';
import village from './maps/village.tmj?raw';
import pass from './maps/pass.tmj?raw';
import cave1 from './maps/cave1.tmj?raw';
import cave2 from './maps/cave2.tmj?raw';
import villageP from './maps/village_p.tmj?raw';

export type MapId = 'backhill' | 'village' | 'pass' | 'cave1' | 'cave2' | 'village_p';
const RAW: Record<MapId, string> = { backhill, village, pass, cave1, cave2, village_p: villageP };

export interface ChestDef {
  id: string;
  at: Pt;
  item?: string;
  coin?: number;
}

/** deco 층의 한 칸: tiles.png에서 (sx, sy)의 16×16 */
export interface DecoCell {
  x: number;
  y: number;
  sx: number;
  sy: number;
  solid: boolean;
  /** 사람 위에 그린다(그 뒤로 지나가면 가려진다) */
  above: boolean;
}

/** 밤·동굴에서 어둠을 밝히는 불빛 종류 */
export type LightKind = 'lamp' | 'torch' | 'wisp' | 'foxfire' | 'lantern';

/** 맵에 놓인 불빛. x·y는 칸 단위(소수 가능), radius도 칸 */
export interface LightDef {
  name: string;
  x: number;
  y: number;
  radius: number;
  kind: LightKind;
}

export interface MapDef {
  id: MapId;
  name: string;
  w: number;
  h: number;
  /** 한 칸 크기(픽셀). 도트 맵 16, 그린 지도 32 */
  tile: number;
  /** 그린 지도 그림(public 기준 경로). 있으면 땅·장식 대신 이 그림을 깔고, 사람은 SD로 그린다 */
  image?: string;
  /** 땅 글자: . 풀 · : 흙길 · _ 동굴 바닥 · # 동굴 벽 · (빈칸) 어둠 */
  ground: string[][];
  deco: DecoCell[];
  /** 굴처럼 바닥이 기본으로 동굴인 맵 */
  cave?: boolean;
  actors: (Actor & { hidden?: boolean; light?: LightKind })[];
  chests: ChestDef[];
  lights: LightDef[];
  /** 굴뚝 연기가 오르는 자리(칸 단위) */
  smoke: Pt[];
  /** 떠다니는 것. 밤의 반딧불은 바깥 맵 어디에나 */
  ambient: 'leaves' | 'dust' | 'none';
  /** 대본이 쓰는 이름 지점 */
  points: Record<string, Pt>;
  bgm: 'story' | 'home' | 'battle';
}

interface TiledProp {
  name: string;
  value: string | number | boolean;
}
interface TiledTileset {
  columns: number;
  tilecount: number;
  tiles?: { id: number; properties?: TiledProp[] }[];
}
interface TiledObject {
  name: string;
  type: string;
  x: number;
  y: number;
  properties?: TiledProp[];
}
interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  properties?: TiledProp[];
  tilesets: { firstgid: number; source: string }[];
  layers: ({ type: 'tilelayer'; name: string; data: number[] } | { type: 'objectgroup'; name: string; objects: TiledObject[] } | { type: 'imagelayer'; name: string; image: string })[];
}

const propsOf = (list: TiledProp[] = []) => Object.fromEntries(list.map((p) => [p.name, p.value]));
const TILESETS: Record<string, TiledTileset> = { 'terrain.tsj': JSON.parse(terrainTsj), 'deco.tsj': JSON.parse(decoTsj) };
const tileProps = (ts: TiledTileset, id: number) => propsOf(ts.tiles?.find((t) => t.id === id)?.properties);
/** Tiled가 gid 위쪽 비트에 담는 뒤집기 표시 */
const GID_MASK = 0x1fffffff;

/** Tiled 맵 한 장을 MapDef로 */
export function parseTiled(id: MapId, raw: string): MapDef {
  const m = JSON.parse(raw) as TiledMap;
  const sets = m.tilesets.map((t) => ({ firstgid: t.firstgid, name: t.source, ts: TILESETS[t.source] })).sort((a, b) => b.firstgid - a.firstgid);
  const lookup = (gid: number) => {
    const g = gid & GID_MASK;
    const set = sets.find((s) => g >= s.firstgid);
    if (!set?.ts) throw new Error(`${id}: 모르는 타일 ${gid}`);
    return { set: set.name, ts: set.ts, local: g - set.firstgid };
  };
  const layer = (name: string) => {
    const l = m.layers.find((x) => x.name === name);
    if (!l) throw new Error(`${id}: ${name} 층이 없어요`);
    return l;
  };
  const props = propsOf(m.properties);
  const C = m.tilewidth || 16;
  const paint = m.layers.find((l) => l.type === 'imagelayer') as { image: string } | undefined;
  const terrain = layer('terrain');
  const deco = layer('deco');
  const objs = layer('objects');
  if (terrain.type !== 'tilelayer' || deco.type !== 'tilelayer' || objs.type !== 'objectgroup') throw new Error(`${id}: 층 종류가 달라요`);
  const ground: string[][] = [];
  for (let y = 0; y < m.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < m.width; x++) {
      const t = lookup(terrain.data[y * m.width + x]);
      row.push(String(tileProps(t.ts, t.local).ground ?? (props.cave ? '_' : '.')));
    }
    ground.push(row);
  }
  const cells: DecoCell[] = [];
  deco.data.forEach((gid, i) => {
    if (!gid) return;
    const t = lookup(gid);
    cells.push({ x: i % m.width, y: Math.floor(i / m.width), sx: (t.local % t.ts.columns) * 16, sy: Math.floor(t.local / t.ts.columns) * 16, solid: !!tileProps(t.ts, t.local).solid, above: !!tileProps(t.ts, t.local).above });
  });
  const cell = (o: TiledObject): Pt => ({ x: Math.floor(o.x / C), y: Math.floor(o.y / C) });
  const actors: MapDef['actors'] = [];
  const chests: ChestDef[] = [];
  const points: Record<string, Pt> = {};
  const lights: LightDef[] = [];
  const smoke: Pt[] = [];
  for (const o of objs.objects) {
    const p = propsOf(o.properties);
    if (o.type === 'actor')
      actors.push({
        id: o.name,
        at: cell(o),
        dir: Number(p.dir ?? 0) as Dir,
        ...(p.char ? { char: p.char as Actor['char'] } : { mon: p.mon as Actor['mon'] }),
        hidden: !!p.hidden,
        ...(p.light ? { light: p.light as LightKind } : {}),
      });
    else if (o.type === 'light') lights.push({ name: o.name, x: o.x / C, y: o.y / C, radius: Number(p.radius ?? 2.5), kind: (p.kind ?? 'lamp') as LightKind });
    else if (o.type === 'chest') chests.push({ id: o.name, at: cell(o), ...(p.item ? { item: String(p.item) } : {}), ...(p.coin ? { coin: Number(p.coin) } : {}) });
    else if (o.type === 'point') points[o.name] = cell(o);
    else if (o.type === 'smoke') smoke.push({ x: o.x / C, y: o.y / C });
  }
  return { id, name: String(props.name ?? id), bgm: (props.bgm ?? 'story') as MapDef['bgm'], cave: !!props.cave, w: m.width, h: m.height, tile: C, ...(paint ? { image: paint.image.replace(/^(\.\.\/)+public\//, '') } : {}), ground, deco: cells, actors, chests, lights, smoke, ambient: (props.ambient ?? 'none') as MapDef['ambient'], points };
}

export const MAPS = Object.fromEntries((Object.keys(RAW) as MapId[]).map((id) => [id, parseTiled(id, RAW[id])])) as Record<MapId, MapDef>;

/** 이름 지점(또는 [x, y])을 좌표로 */
export function pointOf(map: MapId, at: string | [number, number]): Pt {
  if (typeof at !== 'string') return { x: at[0], y: at[1] };
  const p = MAPS[map].points[at];
  if (!p) throw new Error(`${map}에 '${at}' 지점이 없어요`);
  return p;
}

export interface Grid {
  w: number;
  h: number;
  /** 땅 글자(. : _ # 빈칸) */
  ground: string[][];
  solid: boolean[][];
}

const cache = new Map<MapId, Grid>();

/** 맵을 땅·막힘으로 푼다 */
export function grid(id: MapId): Grid {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = MAPS[id];
  const solid = def.ground.map((r) => r.map((c) => c === '#' || c === ' '));
  for (const d of def.deco) if (d.solid) solid[d.y][d.x] = true;
  for (const ch of def.chests) solid[ch.at.y][ch.at.x] = true;
  const g = { w: def.w, h: def.h, ground: def.ground, solid };
  cache.set(id, g);
  return g;
}

export const inside = (g: Grid, p: Pt) => p.x >= 0 && p.y >= 0 && p.x < g.w && p.y < g.h;

/** 걸어서 갈 수 있는 칸인가(사람·짐승이 서 있는 칸은 따로 막는다) */
export const walkable = (g: Grid, p: Pt) => inside(g, p) && !g.solid[p.y][p.x];

const DIRS: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** 가장 짧은 길(시작 칸 제외, 도착 칸 포함). 못 가면 null */
export function findPath(g: Grid, from: Pt, to: Pt, blocked: (p: Pt) => boolean = () => false): Pt[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  if (!walkable(g, to)) return null;
  const key = (p: Pt) => p.y * g.w + p.x;
  const prev = new Map<number, number>();
  const seen = new Set([key(from)]);
  const queue: Pt[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = { x: cur.x + dx, y: cur.y + dy };
      const k = key(nx);
      if (seen.has(k) || !walkable(g, nx)) continue;
      if (blocked(nx) && !(nx.x === to.x && nx.y === to.y)) continue;
      seen.add(k);
      prev.set(k, key(cur));
      if (nx.x === to.x && nx.y === to.y) {
        const path: Pt[] = [];
        let c = k;
        while (c !== key(from)) {
          path.unshift({ x: c % g.w, y: Math.floor(c / g.w) });
          c = prev.get(c)!;
        }
        return path;
      }
      queue.push(nx);
    }
  }
  return null;
}

/** 한 칸 옮긴 방향 */
export function dirTo(from: Pt, to: Pt): Dir {
  if (to.x > from.x) return 3;
  if (to.x < from.x) return 2;
  if (to.y < from.y) return 1;
  return 0;
}
