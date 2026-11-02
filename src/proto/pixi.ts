// PixiJS 연결: 도트 시트(draw.ts가 불러 둔 그림)에서 잘라 낸 텍스처를 만들어 둔다. 확대는 늘 최근접(도트가 번지지 않게)
import { Rectangle, Texture, TextureSource, TextureStyle } from 'pixi.js';
import { MONS, TILES, type MonName, type TileName } from './atlas';
import { CHARS32, type CharName } from './atlas32';
import { CC, T, sheet } from './draw';
import type { Dir } from './types';

TextureStyle.defaultOptions.scaleMode = 'nearest';

type Sheet = Parameters<typeof sheet>[0];
const sources = new Map<string, TextureSource>();
const cache = new Map<string, Texture>();

function sourceOf(s: Sheet | HTMLCanvasElement, key: string) {
  let src = sources.get(key);
  if (!src) {
    src = TextureSource.from(typeof s === 'string' ? sheet(s) : s);
    src.scaleMode = 'nearest';
    sources.set(key, src);
  }
  return src;
}

/** 시트의 한 조각 */
export function cut(s: Sheet, x: number, y: number, w: number, h: number): Texture {
  const key = `${s}:${x},${y},${w},${h}`;
  let t = cache.get(key);
  if (!t) {
    t = new Texture({ source: sourceOf(s, s), frame: new Rectangle(x, y, w, h) });
    cache.set(key, t);
  }
  return t;
}

/** 미리 구운 맵 같은 캔버스 한 장 */
export function canvasTexture(key: string, cv: HTMLCanvasElement): Texture {
  let t = cache.get(`canvas:${key}`);
  if (!t) {
    t = new Texture({ source: sourceOf(cv, `canvas:${key}`) });
    cache.set(`canvas:${key}`, t);
  }
  return t;
}

/** 걷는 캐릭터 한 칸(32×32). 그릴 때는 발밑 칸에서 CHAR_DX, CHAR_DY만큼 옮긴다 */
export const charTex = (c: CharName, dir: Dir, row: number) => cut('chars', CHARS32[c][0] + dir * CC, CHARS32[c][1] + row * CC, CC, CC);

/** 몬스터 한 칸(16×16), 대장은 50×50 다섯 장 */
export function monTex(m: MonName, dir: Dir, frame: number): Texture {
  // 새로 그린 짐승·도깨비불은 캐릭터 시트(32×32)에 있다: 줄 0~3을 차례로
  const c = (CHARS32 as Record<string, readonly [number, number]>)[m];
  if (c) return cut('chars', c[0] + dir * CC, c[1] + (frame % 4) * CC, CC, CC);
  const r = MONS[m];
  if (r[2] > 64) return cut('mons', r[0] + (frame % 5) * 50, r[1], 50, 50);
  return cut('mons', r[0] + dir * T, r[1] + (frame % 4) * T, T, T);
}

export const tileTex = (name: TileName) => {
  const r = TILES[name];
  return cut('tiles', r[0], r[1], r[2], r[3]);
};

/** 도트 캐릭터 이름 → SD 그림(public/proto/sd/<이름>.webp). 대화창·파티 목록의 얼굴에 쓴다 */
export const SD_OF: Partial<Record<string, string>> = {
  me: 'me',
  baekseol: 'baekseol',
  muyeong: 'muyeong',
  sodam: 'sodam',
  thug: 'meoseum',
  ajeon: 'ajeon',
  worker: 'villager',
  worker2: 'fishmonger',
  innkeeper: 'innkeeper',
  chaeryeong: 'chaeryeong',
  yunseo: 'yunseo',
  namjihu: 'namjihu',
  doksa: 'doksa',
  meoksoe: 'meoksoe',
  cheolgom: 'cheolgom',
  songdaegam: 'songdaegam',
  widow: 'widow',
  keeper: 'keeper',
  mokso: 'mokso',
  bandit: 'bandit',
  bandit2: 'bandit',
  pickpocket: 'pickpocket',
  soldier: 'soldier',
  assassin: 'assassin',
};
