// 맵에 떠다니는 것: 낙엽, 굴 먼지, 굴뚝 연기(맵 좌표, 도트 크기 그대로)와 밤 반딧불(조명 위, 화면 좌표).
// 화면에 보이는 둘레에서만 만들고, 수가 넘치지 않게 맵마다 상한을 둔다.
import { Graphics } from 'pixi.js';
import type { MapDef } from './maps';

type Kind = 'leaf' | 'dust' | 'smoke' | 'firefly';
interface P {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  seed: number;
  color: number;
}

const T = 16;
const LEAF_COLORS = [0xd9a441, 0xc8692e, 0x9fb34a, 0xb8843a];
/** 1초에 몇 개, 화면에 최대 몇 개 */
const RATE: Record<Kind, { perSec: number; max: number }> = {
  leaf: { perSec: 3.2, max: 24 },
  dust: { perSec: 3, max: 26 },
  smoke: { perSec: 2.2, max: 40 },
  firefly: { perSec: 2.4, max: 18 },
};

export class Particles {
  /** 맵 좌표 층(world에 넣는다) */
  readonly world = new Graphics();
  /** 화면 좌표 층(조명 위에 넣는다) */
  readonly glow = new Graphics();
  private list: P[] = [];
  private last = 0;
  private map = '';
  private acc: Partial<Record<string, number>> = {};

  private spawn(kind: Kind, n: number, make: () => P) {
    const key = kind;
    this.acc[key] = (this.acc[key] ?? 0) + n;
    const have = this.list.filter((p) => p.kind === kind).length;
    while ((this.acc[key] ?? 0) >= 1) {
      this.acc[key]! -= 1;
      if (have < RATE[kind].max) this.list.push(make());
    }
  }

  /** view: 지금 보이는 맵 영역(도트), toScreen: 맵 좌표 → 화면 픽셀 */
  update(now: number, def: MapDef, night: boolean, view: { x: number; y: number; w: number; h: number }, scale: number, toScreen: (x: number, y: number) => [number, number]) {
    if (this.map !== def.id) {
      this.map = def.id;
      this.list = [];
    }
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    const rnd = Math.random;
    const area = (view.w * view.h) / (T * T * 200);
    if (def.ambient === 'leaves' && !night)
      this.spawn('leaf', RATE.leaf.perSec * dt * area, () => ({
        kind: 'leaf', x: view.x + rnd() * view.w, y: view.y - 4, vx: 4 + rnd() * 6, vy: 9 + rnd() * 6, age: 0, life: 6 + rnd() * 4, seed: rnd() * 10, color: LEAF_COLORS[Math.floor(rnd() * LEAF_COLORS.length)],
      }));
    if (def.ambient === 'dust')
      this.spawn('dust', RATE.dust.perSec * dt * area, () => ({
        kind: 'dust', x: view.x + rnd() * view.w, y: view.y + rnd() * view.h, vx: -2 + rnd() * 4, vy: -1.5 - rnd() * 2, age: 0, life: 3 + rnd() * 3, seed: rnd() * 10, color: 0xcfc3a8,
      }));
    if (!night)
      for (const s of def.smoke)
        this.spawn('smoke', 0.9 * dt, () => ({
          kind: 'smoke', x: s.x * T + (rnd() - 0.5) * 2, y: s.y * T, vx: 2 + rnd() * 2, vy: -7 - rnd() * 3, age: 0, life: 2.4 + rnd() * 1.2, seed: rnd() * 10, color: 0xe8e2d8,
        }));
    if (night && !def.cave)
      this.spawn('firefly', RATE.firefly.perSec * dt * area, () => ({
        kind: 'firefly', x: view.x + rnd() * view.w, y: view.y + rnd() * view.h, vx: 0, vy: 0, age: 0, life: 4 + rnd() * 3, seed: rnd() * 10, color: 0xd8ff8a,
      }));

    const t = now / 1000;
    for (const p of this.list) {
      p.age += dt;
      if (p.kind === 'leaf') p.x += (p.vx + Math.sin(t * 2.3 + p.seed) * 8) * dt;
      else if (p.kind === 'firefly') p.x += Math.sin(t * 0.9 + p.seed) * 6 * dt;
      else p.x += p.vx * dt;
      p.y += (p.kind === 'firefly' ? Math.cos(t * 1.3 + p.seed * 2) * 5 : p.vy) * dt;
    }
    this.list = this.list.filter((p) => p.age < p.life);

    this.world.clear();
    this.glow.clear();
    for (const p of this.list) {
      const k = p.age / p.life;
      if (p.kind === 'leaf') {
        // 팔랑일 때 가로·세로가 번갈아 보인다
        const flat = Math.sin(t * 6 + p.seed) > 0;
        this.world.rect(Math.round(p.x), Math.round(p.y), flat ? 2 : 1, flat ? 1 : 2).fill({ color: p.color, alpha: k > 0.85 ? (1 - k) / 0.15 : 1 });
      } else if (p.kind === 'dust') {
        this.world.rect(Math.round(p.x), Math.round(p.y), 1, 1).fill({ color: p.color, alpha: 0.45 * Math.sin(Math.PI * k) });
      } else if (p.kind === 'smoke') {
        const size = 1 + Math.floor(k * 3);
        this.world.rect(Math.round(p.x), Math.round(p.y), size, size).fill({ color: p.color, alpha: 0.4 * (1 - k) });
      } else {
        const on = 0.5 + 0.5 * Math.sin(t * 3.1 + p.seed * 5);
        const a = Math.sin(Math.PI * k) * on;
        const [sx, sy] = toScreen(p.x, p.y);
        this.glow.circle(sx, sy, scale * 2.2).fill({ color: p.color, alpha: 0.18 * a });
        this.glow.rect(Math.round(sx - scale / 2), Math.round(sy - scale / 2), scale, scale).fill({ color: 0xf4ffc8, alpha: 0.9 * a });
      }
    }
  }
}
