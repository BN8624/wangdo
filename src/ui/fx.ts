// 전투 효과: 캔버스 입자(속성별 불씨·물방울·잎·빛·그림자), 베기 궤적, 충격파. 그림 파일 없이 그린다.
// 숫자·흔들림·번쩍임처럼 DOM이 나은 효과는 BattleView가 Web Animations로 직접 건다.
import type { Element } from '../data/roster';

type Kind = 'spark' | 'dot' | 'leaf' | 'drop' | 'star' | 'smoke' | 'ring' | 'slash' | 'arrow' | 'comet';

interface P {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  g: number;
  drag: number;
  /** 혜성: 출발점과 도착점 */
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
  /** 베기: 각도·길이·굵기 */
  angle?: number;
  len?: number;
  width?: number;
}

export const PALETTE: Record<Element | 'none' | 'heal' | 'shield' | 'blood' | 'gold', string[]> = {
  fire: ['#fff3c4', '#ffd36b', '#ff9a3c', '#ff5a2a'],
  water: ['#ffffff', '#bfe9ff', '#5fb8ff', '#2f7fe0'],
  wood: ['#f3ffd8', '#c8f08a', '#7fcf5a', '#3f9a4a'],
  light: ['#ffffff', '#fff8d0', '#ffe27a', '#ffd24a'],
  dark: ['#e6d4ff', '#b38cf0', '#7a4fc8', '#3a2070'],
  none: ['#ffffff', '#ffe9c2', '#ffb36b'],
  heal: ['#f0fff0', '#b8f5c0', '#6fdc8c', '#3fb86a'],
  shield: ['#ffffff', '#cfe6ff', '#8ec2ff', '#4f8de0'],
  blood: ['#ffd0c8', '#ff7a6a', '#e0403a', '#a02020'],
  gold: ['#fffbe0', '#ffe9a0', '#f2c66d', '#d39a35'],
};

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** 속성마다 입자 모양 */
const SHAPE: Record<Element, Kind> = { fire: 'dot', water: 'drop', wood: 'leaf', light: 'star', dark: 'smoke' };

export class FxCanvas {
  private ctx: CanvasRenderingContext2D;
  private ps: P[] = [];
  private raf = 0;
  private last = 0;
  private w = 0;
  private h = 0;
  /** 배속: 입자 수명도 이만큼 빨리 흐른다 */
  speed = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private add(p: Partial<P> & Pick<P, 'kind' | 'x' | 'y' | 'color'>) {
    this.ps.push({ vx: 0, vy: 0, life: 0, max: 600, size: 4, rot: Math.random() * Math.PI * 2, vr: 0, g: 0, drag: 0.92, ...p });
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  /** 맞은 자리에서 터지는 입자 */
  burst(x: number, y: number, el: Element | 'none', count = 18, power = 1) {
    const pal = PALETTE[el];
    const shape = el === 'none' ? 'spark' : SHAPE[el];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (2 + Math.random() * 5) * power;
      this.add({
        kind: i % 3 === 0 ? 'spark' : shape,
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (el === 'fire' ? 1.5 : 0),
        max: 380 + Math.random() * 420,
        size: (shape === 'smoke' ? 8 : 3) + Math.random() * 4 * power,
        color: pick(pal),
        vr: (Math.random() - 0.5) * 0.3,
        g: el === 'water' ? 0.18 : el === 'fire' ? -0.06 : el === 'wood' ? 0.04 : 0,
        drag: shape === 'smoke' ? 0.9 : 0.93,
      });
    }
  }

  /** 충격파 고리 */
  ring(x: number, y: number, color: string, size = 60, width = 6) {
    this.add({ kind: 'ring', x, y, color, size, width, max: 420 });
  }

  /** 베기 궤적. big이면 굵고 길게 */
  slash(x: number, y: number, el: Element | 'none', big = false, angle = -0.6 + (Math.random() - 0.5) * 0.5) {
    const pal = PALETTE[el];
    this.add({ kind: 'slash', x, y, color: pal[Math.min(2, pal.length - 1)], angle, len: big ? 260 : 150, width: big ? 26 : 13, max: big ? 420 : 300 });
  }

  /** 공격하는 쪽에서 맞는 쪽으로 날아가는 빛줄기 */
  comet(x0: number, y0: number, x1: number, y1: number, el: Element | 'none', ms = 200) {
    const pal = PALETTE[el];
    this.add({ kind: 'comet', x: x0, y: y0, x0, y0, x1, y1, color: pal[Math.min(2, pal.length - 1)], size: 7, max: ms });
  }

  /** 적이 내 편을 할퀴는 세 줄 */
  claw(x: number, y: number) {
    for (let i = -1; i <= 1; i++) this.add({ kind: 'slash', x: x + i * 16, y: y + i * 6, color: '#ff7a6a', angle: 1.05, len: 90, width: 8, max: 280 });
  }

  /** 아래에서 위로 떠오르는 입자(치유·격려) */
  rise(x: number, y: number, pal: string[], count = 14, kind: Kind = 'star', spreadX = 40) {
    for (let i = 0; i < count; i++) {
      this.add({
        kind,
        x: x + (Math.random() - 0.5) * spreadX * 2,
        y: y + Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -1.2 - Math.random() * 2.2,
        max: 700 + Math.random() * 500,
        size: 3 + Math.random() * 4,
        color: pick(pal),
        drag: 0.985,
      });
    }
  }

  /** 머리 위를 도는 별(기절) */
  stars(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      this.add({ kind: 'star', x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 9, vx: -Math.sin(a) * 1.4, vy: Math.cos(a) * 0.4, max: 900, size: 6, color: '#ffe27a', drag: 1 });
    }
  }

  clear() {
    this.ps = [];
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.clear();
  }

  private loop = (now: number) => {
    const dt = Math.min(50, now - this.last) * this.speed;
    this.last = now;
    const k = dt / 16.7;
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    const alive: P[] = [];
    for (const p of this.ps) {
      p.life += dt;
      if (p.life >= p.max) continue;
      alive.push(p);
      const t = p.life / p.max;
      if (p.kind === 'comet') {
        const e = 1 - Math.pow(1 - t, 2);
        const px = p.x;
        const py = p.y;
        p.x = p.x0! + (p.x1! - p.x0!) * e;
        p.y = p.y0! + (p.y1! - p.y0!) * e;
        // 지나간 자리에 불티를 남긴다
        if (Math.random() < 0.9) this.ps.push({ kind: 'dot', x: px, y: py, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, life: 0, max: 260, size: 2 + Math.random() * 2, color: p.color, rot: 0, vr: 0, g: 0, drag: 0.9 });
      } else if (p.kind !== 'ring' && p.kind !== 'slash') {
        p.vx *= Math.pow(p.drag, k);
        p.vy = p.vy * Math.pow(p.drag, k) + p.g * k;
        p.x += p.vx * k;
        p.y += p.vy * k;
        p.rot += p.vr * k;
      }
      this.draw(p, t);
    }
    this.ps = alive;
    this.raf = alive.length ? requestAnimationFrame(this.loop) : 0;
    if (!alive.length) c.clearRect(0, 0, this.w, this.h);
  };

  private draw(p: P, t: number) {
    const c = this.ctx;
    const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    c.save();
    c.globalAlpha = Math.max(0, fade);
    c.globalCompositeOperation = p.kind === 'smoke' ? 'source-over' : 'lighter';
    c.fillStyle = p.color;
    c.strokeStyle = p.color;
    switch (p.kind) {
      case 'spark': {
        c.lineWidth = Math.max(1, p.size * 0.6);
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        c.stroke();
        break;
      }
      case 'dot': {
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.3, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case 'drop': {
        c.translate(p.x, p.y);
        c.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
        c.beginPath();
        c.ellipse(0, 0, p.size * 0.6, p.size * 1.4, 0, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case 'leaf': {
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.beginPath();
        c.ellipse(0, 0, p.size * 1.5, p.size * 0.6, 0, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case 'star': {
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        const r = p.size;
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const rr = i % 2 ? r * 0.3 : r;
          const a = (i / 8) * Math.PI * 2;
          c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        c.closePath();
        c.fill();
        break;
      }
      case 'smoke': {
        const r = p.size * (1 + t * 2.5);
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(20,10,40,0)');
        c.globalAlpha = Math.max(0, fade) * 0.7;
        c.fillStyle = g;
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case 'ring': {
        c.lineWidth = (p.width ?? 6) * (1 - t);
        c.beginPath();
        c.arc(p.x, p.y, p.size * (0.3 + t * 1.2), 0, Math.PI * 2);
        c.stroke();
        break;
      }
      case 'slash': {
        // 앞 절반 동안 궤적이 그어지고, 뒤 절반 동안 사라진다
        const len = p.len ?? 150;
        const head = Math.min(1, t * 2.2);
        const tail = Math.max(0, t * 2.2 - 1);
        c.translate(p.x, p.y);
        c.rotate(p.angle ?? 0);
        c.globalAlpha = 1 - tail;
        const x0 = -len / 2 + len * tail;
        const x1 = -len / 2 + len * head;
        const w = p.width ?? 12;
        const grad = c.createLinearGradient(x0, 0, x1, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.6, p.color);
        grad.addColorStop(1, '#ffffff');
        c.fillStyle = grad;
        c.beginPath();
        c.moveTo(x0, 0);
        c.quadraticCurveTo((x0 + x1) / 2, -w, x1, 0);
        c.quadraticCurveTo((x0 + x1) / 2, -w * 0.25, x0, 0);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.9)';
        c.beginPath();
        c.moveTo(x0, 0);
        c.quadraticCurveTo((x0 + x1) / 2, -w * 0.55, x1, 0);
        c.quadraticCurveTo((x0 + x1) / 2, -w * 0.35, x0, 0);
        c.fill();
        break;
      }
      case 'comet': {
        c.globalAlpha = 1;
        const ang = Math.atan2(p.y1! - p.y0!, p.x1! - p.x0!);
        c.translate(p.x, p.y);
        c.rotate(ang);
        const g = c.createLinearGradient(-70, 0, 8, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.7, p.color);
        g.addColorStop(1, '#fff');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-70, 0);
        c.quadraticCurveTo(-20, -p.size, 8, 0);
        c.quadraticCurveTo(-20, p.size, -70, 0);
        c.fill();
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(4, 0, p.size * 0.6, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
        break;
      }
      case 'arrow': {
        c.translate(p.x, p.y);
        const s = p.size * 2;
        c.beginPath();
        c.moveTo(0, -s);
        c.lineTo(s * 0.8, 0);
        c.lineTo(s * 0.3, 0);
        c.lineTo(s * 0.3, s);
        c.lineTo(-s * 0.3, s);
        c.lineTo(-s * 0.3, 0);
        c.lineTo(-s * 0.8, 0);
        c.closePath();
        c.fill();
        break;
      }
    }
    c.restore();
  }
}
