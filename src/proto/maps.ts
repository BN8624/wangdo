// 시제품 맵. 글자 한 칸이 16×16 타일 한 칸이다.
//  땅: . 풀 · : 흙길 · _ 동굴 바닥 · # 동굴 벽 · (빈칸) 어둠
//  도장(대문자, 왼쪽 위 칸에 적고 나머지 칸은 . 으로 비워 둔다):
//    P 소나무 R 둥근 나무 D 마른 나무 O 늙은 나무 S 그루터기 B 바위 (2×2)
//    H·G 초가 K 기와집 W 흙벽 창고 M 장터 노점 (4×3) · J 주막 (3×3)
//  한 칸 소품(소문자): b·v 덤불 l 잎 f·r·w 꽃 c 토끼풀 o·q·n 돌 j·k 장독 x 궤짝 y 자루 h 굴 구멍
//  막히는 칸: 도장 전부, 덤불·돌·장독·궤짝·자루, 동굴 벽, 어둠
import type { TileName } from './atlas';
import type { Actor, Dir, Pt } from './types';

export type MapId = 'backhill' | 'village' | 'pass' | 'cave1' | 'cave2';

export interface ChestDef {
  id: string;
  at: Pt;
  item?: string;
  coin?: number;
}

export interface MapDef {
  id: MapId;
  name: string;
  rows: string[];
  /** 굴처럼 바닥이 기본으로 동굴인 맵 */
  cave?: boolean;
  actors: (Actor & { hidden?: boolean })[];
  chests: ChestDef[];
  bgm: 'story' | 'home' | 'battle';
}

export const STAMP: Record<string, { tile: TileName; w: number; h: number }> = {
  P: { tile: 'tree_pine', w: 2, h: 2 },
  R: { tile: 'tree_round', w: 2, h: 2 },
  D: { tile: 'tree_dead', w: 2, h: 2 },
  O: { tile: 'tree_root', w: 2, h: 2 },
  S: { tile: 'stump', w: 2, h: 2 },
  B: { tile: 'boulder', w: 2, h: 2 },
  H: { tile: 'house_a', w: 4, h: 3 },
  G: { tile: 'house_b', w: 4, h: 3 },
  K: { tile: 'house_tile', w: 4, h: 3 },
  W: { tile: 'house_thatch', w: 4, h: 3 },
  M: { tile: 'stall', w: 4, h: 3 },
  J: { tile: 'jumak', w: 3, h: 3 },
};

export const PROP: Record<string, { tile: TileName; solid: boolean }> = {
  b: { tile: 'bush', solid: true },
  v: { tile: 'bush2', solid: true },
  l: { tile: 'leafy', solid: false },
  f: { tile: 'flower_y', solid: false },
  r: { tile: 'flower_r', solid: false },
  w: { tile: 'flower_w', solid: false },
  c: { tile: 'clover', solid: false },
  o: { tile: 'rock', solid: true },
  q: { tile: 'rock2', solid: true },
  n: { tile: 'stone', solid: true },
  j: { tile: 'jar', solid: true },
  k: { tile: 'jar_red', solid: true },
  x: { tile: 'crate', solid: true },
  y: { tile: 'sack', solid: true },
  h: { tile: 'hole', solid: false },
};

const a = (id: string, at: [number, number], dir: Dir, look: Pick<Actor, 'char' | 'mon'>, hidden = false) => ({
  id,
  at: { x: at[0], y: at[1] },
  dir,
  ...look,
  hidden,
});

export const MAPS: Record<MapId, MapDef> = {
  backhill: {
    id: 'backhill',
    name: '달골 뒷산',
    bgm: 'story',
    rows: [
      'P.P.P.P.P.P.P.',
      '..............',
      'P.D.....O...P.',
      '..............',
      'P.b.c.:::.f.P.',
      '....l.:::.....',
      'P.f...:::.b.P.',
      '......:::..l..',
      'P.R...::...R..',
      '......::......',
      'P.c...::.w..P.',
      '......::......',
      'P.P...::..P.P.',
      '......::......',
      'P.b..:::..f.P.',
      '.....:::......',
      'P.R..::...R.P.',
      '.....::.......',
      'P.l..::.c...P.',
      '.....::.......',
      'P.P..::...P.P.',
      '.....::.......',
      'P.f..::..b..P.',
      '.....::.......',
    ],
    actors: [
      a('baekseol_bh', [10, 5], 2, { char: 'baekseol' }, true),
      a('racoon1', [6, 15], 1, { mon: 'racoon' }, true),
      a('racoon2', [7, 15], 1, { mon: 'racoon' }, true),
    ],
    chests: [],
  },
  village: {
    id: 'village',
    name: '달골',
    bgm: 'home',
    rows: [
      'P.P.P.P..::.P.P.P.P.',
      '.........::.........',
      'P........::.......P.',
      '..K......::...W.....',
      '.........::.........',
      '.........::.........',
      '...::::::::::::::...',
      'b........::........b',
      '.f.......::......c..',
      '..H......::...M.....',
      '.........::.........',
      '.........::.........',
      '....::::::::::::....',
      'P........::.......P.',
      '.........::.........',
      '..J......::...G.....',
      '.........::.........',
      '......kj.::.........',
      '...::::::::::::::...',
      'b........::........b',
      'P........::.......P.',
      '..f......::.....w...',
      'P.R......::....R.P..',
      '.........::.........',
      'P.P.P.P..::..P.P.P..',
      '.........::.........',
    ],
    actors: [
      a('innkeeper', [5, 19], 2, { char: 'innkeeper' }),
      a('widow', [6, 13], 0, { char: 'widow' }),
      a('worker', [12, 8], 0, { char: 'worker' }),
      a('worker2', [13, 8], 2, { char: 'worker2' }),
      a('keeper', [12, 19], 3, { char: 'keeper' }, true),
      a('thug1', [11, 18], 3, { char: 'thug' }, true),
      a('thug2', [11, 20], 3, { char: 'thug' }, true),
      // 2화(백설 화): 장터 파락호, 주막 술꾼, 밤 도깨비불
      a('parak1', [13, 13], 1, { char: 'thug' }, true),
      a('parak2', [16, 13], 1, { char: 'thug' }, true),
      a('parak3', [17, 13], 1, { char: 'thug' }, true),
      a('drunk1', [2, 19], 1, { mon: 'gob' }, true),
      a('drunk2', [4, 19], 1, { mon: 'gob2' }, true),
      a('wisp1', [13, 20], 1, { mon: 'wisp' }, true),
      a('wisp2', [16, 20], 1, { mon: 'wisp' }, true),
      a('wisp3', [17, 20], 1, { mon: 'wisp' }, true),
    ],
    chests: [],
  },
  pass: {
    id: 'pass',
    name: '고갯길',
    bgm: 'story',
    rows: [
      'P.P.P.P.h.P.P.P.P.',
      '........:.........',
      'B.......::......B.',
      '........::........',
      'P.o.....::....o.P.',
      '........::........',
      '...::::::::::::...',
      '...::::::::::::...',
      '...::........::...',
      'P..::.P.P.P..::.P.',
      '...::........::...',
      'P..::.P.P.P..::.P.',
      '...::........::...',
      'P..::.P.P.P..::.P.',
      '...::........::...',
      '...::........::...',
      '...::..w..w..::...',
      '...::........::...',
      '...::::::::::::...',
      '........::........',
      'P.P.....::.....P..',
      '........::........',
      'b.......::.......b',
      '........::........',
      'P.R.....::...R..P.',
      '........::........',
      '..f.....::....c...',
      '........::........',
      'P.P.....::.....P..',
      '........::........',
    ],
    actors: [
      a('toll_a', [3, 15], 0, { mon: 'gob' }),
      a('toll_b', [4, 12], 0, { mon: 'gob2' }),
      a('toll_c', [3, 9], 0, { mon: 'gob' }),
      a('toll_r', [13, 12], 0, { mon: 'gob2' }),
      a('muyeong_far', [15, 15], 2, { char: 'muyeong' }, true),
      a('muyeong', [8, 5], 0, { char: 'muyeong' }, true),
    ],
    chests: [
      { id: 'pass_left', at: { x: 5, y: 14 }, item: 'flail' },
      { id: 'pass_right', at: { x: 15, y: 10 }, item: 'norigae', coin: 30 },
    ],
  },
  cave1: {
    id: 'cave1',
    name: '산적굴',
    bgm: 'battle',
    cave: true,
    rows: [
      '################',
      '######_h_#######',
      '######___#######',
      '##_________#####',
      '##_x______k_####',
      '##___####____###',
      '##___####____###',
      '##___####____###',
      '##_____________#',
      '##_________y___#',
      '#####____#######',
      '#####____#######',
      '###________#####',
      '###_j______#####',
      '#####____#######',
      '#####____#######',
      '#####____#######',
      '################',
    ],
    actors: [
      a('bat1', [6, 10], 0, { mon: 'bat' }),
      a('bat2', [7, 10], 0, { mon: 'bat' }),
    ],
    chests: [{ id: 'cave_chest', at: { x: 13, y: 9 }, coin: 60 }],
  },
  cave2: {
    id: 'cave2',
    name: '산적굴 깊은 곳',
    bgm: 'battle',
    cave: true,
    rows: [
      '################',
      '####________####',
      '###__________###',
      '###___k__j___###',
      '###__________###',
      '####________####',
      '######____######',
      '######____######',
      '##____________##',
      '##__x________y##',
      '##____________##',
      '######____######',
      '######____######',
      '######____######',
      '######_h__######',
      '################',
    ],
    actors: [
      a('sentry1', [7, 9], 0, { mon: 'gob' }),
      a('sentry2', [8, 9], 0, { mon: 'gob2' }),
      a('boss', [7, 2], 0, { mon: 'boss_gob' }),
      a('keeper2', [10, 2], 0, { char: 'keeper' }),
      a('guard1', [6, 4], 0, { mon: 'gob2' }),
      a('guard2', [9, 4], 0, { mon: 'gob' }),
      a('muyeong_c', [9, 6], 2, { char: 'muyeong' }, true),
    ],
    chests: [],
  },
};

export interface Grid {
  w: number;
  h: number;
  /** 땅 글자(. : _ # 빈칸) */
  ground: string[][];
  solid: boolean[][];
  /** 도장(왼쪽 위 칸 기준) */
  stamps: { tile: TileName; x: number; y: number; w: number; h: number }[];
  props: { tile: TileName; x: number; y: number }[];
}

const cache = new Map<MapId, Grid>();

/** 글자 맵을 땅·막힘·도장·소품으로 푼다 */
export function grid(id: MapId): Grid {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = MAPS[id];
  const h = def.rows.length;
  const w = def.rows[0].length;
  const base = def.cave ? '_' : '.';
  const ground = def.rows.map((r) => [...r].map((c) => (c === '.' || c === ':' || c === '_' || c === '#' || c === ' ' ? c : base)));
  const solid = def.rows.map((r) => [...r].map((c) => c === '#' || c === ' '));
  const stamps: Grid['stamps'] = [];
  const props: Grid['props'] = [];
  def.rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const st = STAMP[c];
      if (st) {
        stamps.push({ tile: st.tile, x, y, w: st.w, h: st.h });
        for (let dy = 0; dy < st.h; dy++) for (let dx = 0; dx < st.w; dx++) if (solid[y + dy]) solid[y + dy][x + dx] = true;
      }
      const pr = PROP[c];
      if (pr) {
        props.push({ tile: pr.tile, x, y });
        if (pr.solid) solid[y][x] = true;
      }
    }),
  );
  for (const ch of def.chests) solid[ch.at.y][ch.at.x] = true;
  const g = { w, h, ground, solid, stamps, props };
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
