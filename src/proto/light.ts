// 밤·동굴 조명: 화면을 어둠으로 덮고 불빛 자리만 둥글게 뚫은 뒤, 그 위에 불빛 색을 은은하게 더한다.
// 어둠은 따로 그려 둔 판(RenderTexture)에 '지우기'로 구멍을 내야 아래 맵까지 지워지지 않는다.
import { Container, Graphics, RenderTexture, Sprite, type Renderer, type Texture } from 'pixi.js';
import type { LightKind } from './maps';
import { canvasTexture } from './pixi';

/** 화면 위 불빛 하나. 좌표·반지름은 화면 픽셀 */
export interface Lamp {
  x: number;
  y: number;
  r: number;
  kind: LightKind;
  /** 깜빡임 결이 서로 다르게 */
  seed: number;
}

/** 종류별 색과 세기, 일렁임 */
const LOOK: Record<LightKind, { color: number; glow: number; flicker: number; pulse: number }> = {
  lamp: { color: 0xffb35c, glow: 0.2, flicker: 0.05, pulse: 0 },
  torch: { color: 0xff8a3a, glow: 0.3, flicker: 0.1, pulse: 0 },
  lantern: { color: 0xffd08a, glow: 0.08, flicker: 0.03, pulse: 0 },
  wisp: { color: 0x7fc8ff, glow: 0.45, flicker: 0, pulse: 0.12 },
  foxfire: { color: 0x6aa8ff, glow: 0.38, flicker: 0, pulse: 0.1 },
};

/** 가운데가 가장 진하고 가장자리로 갈수록 사라지는 흰 원 */
let soft: Texture | null = null;
function softTexture() {
  if (soft) return soft;
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  soft = canvasTexture('light-soft', cv);
  soft.source.scaleMode = 'linear';
  return soft;
}

export class Lighting {
  /** 화면에 올릴 층(어둠 판 + 불빛 색) */
  readonly view = new Container();
  private readonly dark = new Container();
  private readonly darkFill = new Graphics();
  private readonly holes = new Container();
  private readonly glows = new Container();
  private readonly darkSprite = new Sprite();
  /** 불빛 아래도 남는 옅은 밤빛(불빛 자리가 대낮처럼 보이지 않게) */
  private readonly base = new Graphics();
  private rt: RenderTexture | null = null;

  constructor() {
    this.dark.addChild(this.darkFill, this.holes);
    this.view.addChild(this.base, this.darkSprite, this.glows);
  }

  private pool(c: Container, n: number, mode: 'erase' | 'add') {
    while (c.children.length < n) {
      const s = new Sprite(softTexture());
      s.anchor.set(0.5);
      s.blendMode = mode;
      c.addChild(s);
    }
    c.children.forEach((s, i) => (s.visible = i < n));
    return c.children as Sprite[];
  }

  /** sky.base: 어디나 깔리는 옅은 밤빛, sky.dark: 불빛이 뚫는 어둠. 둘 다 0이면 끈다 */
  update(renderer: Renderer, w: number, h: number, now: number, sky: { base: number; dark: number; color: number }, lamps: Lamp[]) {
    const { base, dark: darkness, color } = sky;
    this.view.visible = base > 0 || darkness > 0;
    if (!this.view.visible) return;
    this.base.clear().rect(0, 0, w, h).fill({ color, alpha: base });
    if (!this.rt || this.rt.width !== w || this.rt.height !== h) {
      this.rt?.destroy(true);
      this.rt = RenderTexture.create({ width: w, height: h });
      this.darkSprite.texture = this.rt;
    }
    this.darkFill.clear().rect(0, 0, w, h).fill({ color, alpha: darkness });
    const holes = this.pool(this.holes, lamps.length, 'erase');
    const glows = this.pool(this.glows, lamps.length, 'add');
    lamps.forEach((l, i) => {
      const look = LOOK[l.kind];
      const t = now / 1000;
      const wobble = look.flicker * (Math.sin(t * 9.1 + l.seed) * 0.6 + Math.sin(t * 23.7 + l.seed * 3.1) * 0.4) + look.pulse * Math.sin(t * 2.2 + l.seed);
      const r = l.r * (1 + wobble);
      const hole = holes[i];
      hole.position.set(l.x, l.y);
      hole.width = hole.height = r * 2;
      const glow = glows[i];
      glow.position.set(l.x, l.y);
      glow.width = glow.height = r * 1.6;
      glow.tint = look.color;
      glow.alpha = look.glow * (1 + wobble);
    });
    renderer.render({ container: this.dark, target: this.rt, clear: true });
  }
}
