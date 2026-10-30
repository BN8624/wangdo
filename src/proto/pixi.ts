// PixiJS 연결: 도트 시트(draw.ts가 불러 둔 그림)에서 잘라 낸 텍스처를 만들어 둔다. 확대는 늘 최근접(도트가 번지지 않게)
import { Assets, Rectangle, Texture, TextureSource, TextureStyle } from 'pixi.js';
import { CHARS, MONS, TILES, type CharName, type MonName, type TileName } from './atlas';
import { CH, T, sheet } from './draw';
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

/** 걷는 캐릭터 한 칸(16×20). 그릴 때는 발밑 칸보다 4px 위에 둔다 */
export const charTex = (c: CharName, dir: Dir, row: number) => cut('chars', CHARS[c][0] + dir * T, CHARS[c][1] + row * CH, T, CH);

/** 몬스터 한 칸(16×16), 대장은 50×50 다섯 장 */
export function monTex(m: MonName, dir: Dir, frame: number): Texture {
  const r = MONS[m];
  if (r[2] > 64) return cut('mons', r[0] + (frame % 5) * 50, r[1], 50, 50);
  return cut('mons', r[0] + dir * T, r[1] + (frame % 4) * T, T, T);
}

export const tileTex = (name: TileName) => {
  const r = TILES[name];
  return cut('tiles', r[0], r[1], r[2], r[3]);
};

// ── 그린 지도(B안): SD 캐릭터와 지도 그림 ──
/** 도트 캐릭터 이름 → SD 그림(public/proto/sd/<이름>.webp) */
export const SD_OF: Partial<Record<string, string>> = { me: 'me', baekseol: 'baekseol', muyeong: 'muyeong', sodam: 'sodam', thug: 'meoseum', ajeon: 'ajeon' };
const sdCache = new Map<string, Texture | null>();
/** SD 텍스처. 처음 부르면 받기 시작하고 null, 받은 뒤엔 텍스처 */
export function sdTexture(name: string): Texture | null {
  if (!sdCache.has(name)) {
    sdCache.set(name, null);
    Assets.load<Texture>(`proto/sd/${name}.webp`).then((t) => sdCache.set(name, smooth(t)), () => undefined);
  }
  return sdCache.get(name) ?? null;
}
const paintCache = new Map<string, Promise<Texture>>();
export function paintTexture(src: string) {
  let p = paintCache.get(src);
  if (!p) paintCache.set(src, (p = Assets.load<Texture>(src).then(smooth)));
  return p;
}

/** 그림(SD·지도)은 도트와 달리 부드럽게 줄이고 키운다 */
function smooth(t: Texture) {
  t.source.scaleMode = 'linear';
  t.source.autoGenerateMipmaps = true;
  t.source.update();
  return t;
}
