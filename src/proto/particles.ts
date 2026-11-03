// 맵에 떠다니는 것: 낙엽, 굴 먼지, 굴뚝 연기(맵 좌표, 도트 크기 그대로)와 밤 반딧불(조명 위, 화면 좌표).
// 화면에 보이는 둘레에서만 만들고, 수가 넘치지 않게 맵마다 상한을 둔다.
import { Graphics } from 'pixi.js';
import type { MapDef } from './maps';

type Kind = 'leaf' | 'dust' | 'smoke' | 'firefly' | 'step' | 'glint';
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
  step: { perSec: 0, max: 24 },
  glint: { perSec: 0, max: 40 },
};

/** 풀숲: 풀밭 칸 가운데 이만큼에 바람에 흔들리는 풀 포기를 심는다 */
const TUFT_EVERY = 5;
const TUFT = { dark: 0x7f9a2c, mid: 0x94ad33, tip: 0xc8d65a };
const GLINT = 0xe6fbff;
/** 칸마다 정해진 난수(같은 칸은 늘 같은 값) */
const cellHash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

export class Particles {
  /** 맵 좌표 층(world에 넣는다) */
  readonly world = new Graphics();
  /** 바닥 층: 땅 위·사람 아래(풀 포기, 물 반짝임) */
  readonly floor = new Graphics();
  private cellsOf = '';
  private tufts: { x: number; y: number; h: number }[] = [];
  private water: { x: number; y: number }[] = [];
  /** 화면 좌표 층(조명 위에 넣는다) */
  readonly glow = new Graphics();
  private list: P[] = [];
  private last = 0;
  private map = '';
  private acc: Partial<Record<string, number>> = {};
  private lastStep: number[] = [];

  /** 발 디딜 때 발밑 먼지(맵 좌표). 흙은 흙빛, 풀밭은 풀잎 빛. who: 사람 번호(사람마다 너무 잦지 않게) */
  footstep(x: number, y: number, now: number, color = 0xc9a77a, who = 0) {
    if (now - (this.lastStep[who] ?? 0) < 150) return;
    this.lastStep[who] = now;
    if (this.list.filter((p) => p.kind === 'step').length >= RATE.step.max) return;
    for (const dir of [-1, 1])
      this.list.push({ kind: 'step', x: x + dir * 2, y, vx: dir * (3 + Math.random() * 3), vy: -2 - Math.random() * 2, age: 0, life: 0.4, seed: 0, color });
  }

  private spawn(kind: Kind, n: number, make: () => P) {
    const key = kind;
    this.acc[key] = (this.acc[key] ?? 0) + n;
    const have = this.list.filter((p) => p.kind === kind).length;
    while ((this.acc[key] ?? 0) >= 1) {
      this.acc[key]! -= 1;
      if (have < RATE[kind].max) this.list.push(make());
    }
  }

  /** 맵이 바뀌면 풀 포기 자리와 물 칸을 다시 고른다(집·나무·꽃 같은 장식 칸은 비운다) */
  private cells(def: MapDef) {
    if (this.cellsOf === def.id) return;
    this.cellsOf = def.id;
    const taken = new Set(def.deco.map((d) => `${d.x},${d.y}`));
    this.tufts = [];
    this.water = [];
    def.ground.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c === '~') this.water.push({ x, y });
        else if (c === '.' && !taken.has(`${x},${y}`) && !taken.has(`${x},${y + 1}`)) {
          const h = cellHash(x, y);
          if (h % TUFT_EVERY === 0) this.tufts.push({ x: x * T + 3 + ((h >>> 4) % 9), y: y * T + 8 + ((h >>> 8) % 7), h });
        }
      }),
    );
  }

  /** 바닥 층: 바람 결을 따라 흔들리는 풀 포기(사람이 지나가면 옆으로 눕는다), 물 위 반짝임. people: 사람들 발밑(도트) */
  floorUpdate(now: number, def: MapDef, view: { x: number; y: number; w: number; h: number }, people: { x: number; y: number }[]) {
    this.floor.clear();
    if (def.cave || def.tile !== T) return;
    this.cells(def);
    const t = now / 1000;
    const inView = (x: number, y: number, m: number) => x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;
    for (const f of this.tufts) {
      if (!inView(f.x, f.y, 8)) continue;
      // 바람이 왼쪽 위에서 오른쪽 아래로 물결처럼 지나간다
      const wave = Math.sin(t * 1.6 - f.x * 0.045 - f.y * 0.02 + (f.h % 7) * 0.15);
      let sway = wave > 0.55 ? 1 : wave < -0.75 ? -1 : 0;
      let low = 0;
      for (const p of people)
        if (Math.abs(p.x - f.x) < 9 && Math.abs(p.y - f.y) < 6) {
          sway = f.x >= p.x ? 2 : -2;
          low = 1;
        }
      const tall = 3 + (f.h % 2) - low;
      // 세 가닥: 가운데가 가장 길고, 끝으로 갈수록 바람 쪽으로 기운다
      ([[-2, tall - 1], [0, tall + 1], [2, tall]] as const).forEach(([dx, hgt], i) => {
        for (let k = 0; k < hgt; k++) {
          const lean = Math.round((sway * k) / hgt);
          const c = k === hgt - 1 ? TUFT.tip : k === 0 ? TUFT.dark : i === 1 ? TUFT.mid : TUFT.dark;
          this.floor.rect(f.x + dx + lean, f.y - k, 1, 1).fill(c);
        }
      });
    }
    // 물 반짝임: 보이는 물 칸 위에 짧은 흰 줄이 잠깐 떴다 진다
    const seen = this.water.filter((w) => inView(w.x * T, w.y * T, 0));
    const dt = this.lastGlint ? Math.min(0.1, (now - this.lastGlint) / 1000) : 0;
    this.lastGlint = now;
    if (seen.length) {
      this.glintAcc += seen.length * 0.35 * dt;
      while (this.glintAcc >= 1) {
        this.glintAcc -= 1;
        if (this.glints.length >= RATE.glint.max) break;
        const w = seen[Math.floor(Math.random() * seen.length)];
        this.glints.push({ x: w.x * T + 2 + Math.floor(Math.random() * 10), y: w.y * T + 2 + Math.floor(Math.random() * 12), age: 0, life: 0.8 + Math.random() * 0.8, len: 2 + Math.floor(Math.random() * 3) });
      }
    }
    for (const g of this.glints) g.age += dt;
    this.glints = this.glints.filter((g) => g.age < g.life);
    for (const g of this.glints) {
      const k = g.age / g.life;
      const a = Math.sin(Math.PI * k);
      const x = Math.round(g.x + k * 2);
      this.floor.rect(x, g.y, g.len, 1).fill({ color: GLINT, alpha: 0.75 * a });
      if (a > 0.7) this.floor.rect(x + Math.floor(g.len / 2), g.y - 1, 1, 1).fill({ color: GLINT, alpha: 0.5 * a });
    }
  }
  private glints: { x: number; y: number; age: number; life: number; len: number }[] = [];
  private glintAcc = 0;
  private lastGlint = 0;

  /** view: 지금 보이는 맵 영역(도트), toScreen: 맵 좌표 → 화면 픽셀 */
  update(now: number, def: MapDef, night: boolean, tile: number, view: { x: number; y: number; w: number; h: number }, scale: number, toScreen: (x: number, y: number) => [number, number]) {
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
          kind: 'smoke', x: s.x * tile + (rnd() - 0.5) * 2, y: s.y * tile, vx: 2 + rnd() * 2, vy: -7 - rnd() * 3, age: 0, life: 2.4 + rnd() * 1.2, seed: rnd() * 10, color: 0xe8e2d8,
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
    // 그린 지도(32px 칸)에서는 낱알도 두 배로
    const z = tile / T;
    for (const p of this.list) {
      const k = p.age / p.life;
      if (p.kind === 'leaf') {
        // 팔랑일 때 가로·세로가 번갈아 보인다
        const flat = Math.sin(t * 6 + p.seed) > 0;
        this.world.rect(Math.round(p.x), Math.round(p.y), (flat ? 2 : 1) * z, (flat ? 1 : 2) * z).fill({ color: p.color, alpha: k > 0.85 ? (1 - k) / 0.15 : 1 });
      } else if (p.kind === 'step') {
        this.world.rect(Math.round(p.x), Math.round(p.y), z, z).fill({ color: p.color, alpha: 0.8 * (1 - k) });
      } else if (p.kind === 'dust') {
        this.world.rect(Math.round(p.x), Math.round(p.y), z, z).fill({ color: p.color, alpha: 0.45 * Math.sin(Math.PI * k) });
      } else if (p.kind === 'smoke') {
        const size = (1 + Math.floor(k * 3)) * z;
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
