// 맵 화면: 미리 구운 맵 위에 사람·짐승·상자·파티를 그리고, 걷기 Effect를 움직임으로 보여 준다
import { useEffect, useMemo, useRef } from 'react';
import type { CharName } from './atlas';
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { Lighting, type Lamp } from './light';
import { CH, T, aboveCanvas, isCave, mapCanvas } from './draw';
import { canvasTexture, charTex, monTex, tileTex } from './pixi';
import { MAPS, dirTo, grid } from './maps';
import { actorsOn, type Effect, type Game } from './runner';
import type { Dir, Line, Pt } from './types';

/** 화면 1픽셀(CSS)당 도트 크기 */
const ZOOM = 3;
const TILE_MS = 250;
const LINE_MS = 1900;

interface Walk {
  track: Pt[];
  base: number;
  steps: number;
  start: number;
  tileMs: number;
  lines: Line[];
  lineMs: number;
  total: number;
  done: boolean;
}

/** 밤·동굴의 하늘빛: base는 어디나, dark는 불빛이 뚫는 어둠 */
const SKY = {
  day: { base: 0, dark: 0, color: 0 },
  night: { base: 0.3, dark: 0.62, color: 0x0b0e2a },
  cave: { base: 0.12, dark: 0.84, color: 0x08060c },
};
/** 사람이 든 불빛 반지름(칸) */
const CARRY = { night: 2.8, cave: 4.5, torch: 2.6, wisp: 1.8, foxfire: 1.5 };

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function along(track: Pt[], i: number): { p: Pt; dir: Dir | null } {
  if (i <= 0) return { p: track[0], dir: null };
  const k = Math.min(Math.floor(i), track.length - 1);
  if (k >= track.length - 1) return { p: track[track.length - 1], dir: track.length > 1 ? dirTo(track[track.length - 2], track[track.length - 1]) : null };
  return { p: lerp(track[k], track[k + 1], i - k), dir: dirTo(track[k], track[k + 1]) };
}

export function Field({ g, fx, speed, onWalked }: { g: Game; fx: Effect | null; speed: number; onWalked: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const walk = useRef<Walk | null>(null);
  const live = useRef({ g, speed, onWalked });
  live.current = { g, speed, onWalked };
  const actors = useMemo(() => actorsOn(g), [g]);
  const actorsRef = useRef(actors);
  actorsRef.current = actors;

  // 걷기 시작
  useEffect(() => {
    if (fx?.k !== 'walk') {
      walk.current = null;
      return;
    }
    const cur = live.current.g;
    const track = [...cur.trail].reverse().concat([fx.from], fx.path);
    const tileMs = TILE_MS / speed;
    const lineMs = LINE_MS / speed;
    walk.current = {
      track,
      base: cur.trail.length,
      steps: fx.path.length,
      start: performance.now(),
      tileMs,
      lines: fx.say,
      lineMs,
      total: Math.max(fx.path.length * tileMs, fx.say.length * lineMs) + 120,
      done: false,
    };
    // speed는 걷는 도중 바뀌어도 이번 걸음에는 반영하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx]);

  // PixiJS 무대. 한 번 만들고, 매 프레임 사람·카메라만 고친다
  useEffect(() => {
    const box = wrap.current;
    if (!box) return;
    let raf = 0;
    let dead = false;
    const app = new Application();
    const world = new Container({ sortableChildren: true });
    const mapSprite = new Sprite();
    mapSprite.zIndex = -1e6;
    // 발밑 그림자: 맵 위, 사람 아래
    const shadows = new Graphics();
    shadows.zIndex = -5e5;
    // 나무·지붕 윗줄: 사람 위
    const aboveSprite = new Sprite();
    aboveSprite.zIndex = 1e9;
    world.addChild(mapSprite, shadows, aboveSprite);
    const screen = new Container();
    const sprites = new Map<string, Sprite>();
    let shownMap = '';
    // 밤·동굴 조명
    const lighting = new Lighting();
    screen.addChild(lighting.view);

    const spriteOf = (key: string) => {
      let sp = sprites.get(key);
      if (!sp) {
        sp = new Sprite();
        sprites.set(key, sp);
        world.addChild(sp);
      }
      return sp;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.round(box.clientWidth * dpr);
      const chh = Math.round(box.clientHeight * dpr);
      if (!cw || !chh) return;
      if (app.renderer.width !== cw || app.renderer.height !== chh) app.renderer.resize(cw, chh);
      const s = Math.max(1, Math.round(ZOOM * dpr));
      const { g: game } = live.current;
      const gr = grid(game.map);

      // 파티 자리
      const members = game.party.map((m) => m.id as CharName);
      const pos: { p: Pt; dir: Dir; moving: boolean }[] = [];
      let lineIdx = -1;
      const w = walk.current;
      if (w) {
        const el = now - w.start;
        const t = Math.min(w.steps, el / w.tileMs);
        members.forEach((_, k) => {
          const a = along(w.track, w.base + t - k);
          const moving = t < w.steps && w.base + t - k > 0;
          pos.push({ p: a.p, dir: a.dir ?? (k === 0 ? game.dir : pos[k - 1]?.dir ?? game.dir), moving });
        });
        lineIdx = Math.floor(el / w.lineMs);
        if (lineIdx >= w.lines.length) lineIdx = -1;
        if (el >= w.total && !w.done) {
          w.done = true;
          live.current.onWalked();
        }
      } else {
        members.forEach((_, k) => {
          if (k === 0) pos.push({ p: game.pos, dir: game.dir, moving: false });
          else {
            const p = game.trail[k - 1] ?? game.pos;
            const ahead = k === 1 ? game.pos : (game.trail[k - 2] ?? game.pos);
            pos.push({ p, dir: p.x === ahead.x && p.y === ahead.y ? game.dir : dirTo(p, ahead), moving: false });
          }
        });
      }

      // 카메라: 이끄는 사람을 가운데보다 조금 위에
      const vw = cw / s;
      const vh = chh / s;
      const mw = gr.w * T;
      const mh = gr.h * T;
      const lead = pos[0].p;
      const fitX = (target: number) => (mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, target - vw / 2)));
      // 세로: 아래 판(대화·선택)에 가리지 않게 이끄는 사람을 화면 위쪽 38% 높이에 둔다. 맵 아래 끝을 넘어가면 어둠으로 채운다
      const fitY = (target: number) => Math.max(Math.min(0, mh - vh), Math.min(mh - vh * 0.72, target - vh * 0.38));
      const camX = Math.round(fitX(lead.x * T + T / 2) * s) / s;
      const camY = Math.round(fitY(lead.y * T + T / 2) * s) / s;
      world.scale.set(s);
      world.position.set(-camX * s, -camY * s);

      if (shownMap !== game.map) {
        shownMap = game.map;
        mapSprite.texture = canvasTexture(game.map, mapCanvas(game.map));
        aboveSprite.texture = canvasTexture(`${game.map}:above`, aboveCanvas(game.map));
      }

      // 사람·짐승·상자·파티: 발밑 y 순서(zIndex)로
      const seen = new Set<string>();
      shadows.clear();
      /** 발밑 칸(x, y: 도트 좌표, 칸 왼쪽 위)에 납작한 그림자 */
      const shadow = (x: number, y: number, rx = 5) => shadows.ellipse(x + T / 2, y + T - 1.5, rx, 2).fill({ color: 0x000000, alpha: 0.28 });
      const put = (key: string, tex: Texture, x: number, y: number, z: number) => {
        const sp = spriteOf(key);
        sp.texture = tex;
        sp.position.set(x, y);
        sp.zIndex = z;
        sp.visible = true;
        seen.add(key);
      };
      const order = (y: number) => y * 1000;
      for (const ch of MAPS[game.map].chests) put(`chest:${ch.id}`, tileTex(game.opened.includes(ch.id) ? 'chest_open' : 'chest'), ch.at.x * T, ch.at.y * T, order(ch.at.y));
      const f = Math.floor(now / 260);
      for (const a of actorsRef.current) {
        if (a.char) {
          shadow(a.at.x * T, a.at.y * T);
          put(`actor:${a.id}`, charTex(a.char, a.dir, 0), a.at.x * T, a.at.y * T - (CH - T), order(a.at.y));
        } else if (a.mon) {
          const tex = monTex(a.mon, a.dir, f);
          // 대장(50×50)은 발밑 칸 가운데에 맞춘다
          const big = tex.frame.width > T;
          // 도깨비불은 떠 있으니 그림자 없이
          if (a.mon !== 'wisp') shadow(a.at.x * T, a.at.y * T, big ? 14 : 5);
          put(`actor:${a.id}`, tex, a.at.x * T + (big ? T / 2 - 25 : 0), a.at.y * T + (big ? T - 50 : 0), order(a.at.y));
        }
      }
      pos.forEach((q, k) => {
        const row = q.moving ? Math.floor((now / (TILE_MS / 2 / live.current.speed)) % 4) : 0;
        shadow(q.p.x * T, q.p.y * T);
        put(`party:${k}`, charTex(members[k], q.dir, row), q.p.x * T, q.p.y * T - (CH - T), order(q.p.y + 0.01 * (members.length - k)));
      });
      for (const [key, sp] of sprites) if (!seen.has(key)) sp.visible = false;

      // 밤·동굴 조명: 맵의 등잔, 횃불 든 사람·도깨비불, 이끄는 사람의 등불, 여우불을 되찾은 백설
      const cave = isCave(game.map);
      const sky = cave ? SKY.cave : game.night ? SKY.night : SKY.day;
      const lamps: Lamp[] = [];
      if (sky.dark) {
        const sx = (wx: number) => (wx - camX) * s;
        const sy = (wy: number) => (wy - camY) * s;
        MAPS[game.map].lights.forEach((l, i) => lamps.push({ x: sx(l.x * T), y: sy(l.y * T), r: l.radius * T * s, kind: l.kind, seed: i * 1.7 }));
        actorsRef.current.forEach((a, i) => {
          if (a.light) lamps.push({ x: sx(a.at.x * T + T / 2), y: sy(a.at.y * T + T / 4), r: CARRY[a.light === 'wisp' ? 'wisp' : 'torch'] * T * s, kind: a.light, seed: 10 + i * 2.3 });
        });
        lamps.push({ x: sx(lead.x * T + T / 2), y: sy(lead.y * T + T / 2), r: (cave ? CARRY.cave : CARRY.night) * T * s, kind: 'lantern', seed: 99 });
        const bs = members.indexOf('baekseol');
        if (bs >= 0 && game.skills.includes('baekseol')) {
          const q = pos[bs].p;
          lamps.push({ x: sx(q.x * T + T / 2), y: sy(q.y * T), r: CARRY.foxfire * T * s, kind: 'foxfire', seed: 42 });
        }
      }
      lighting.update(app.renderer, cw, chh, now, sky, lamps);

      app.render();

      // 걷는 동안의 말풍선
      const b = bubble.current;
      if (b) {
        if (w && lineIdx >= 0) {
          const line = w.lines[lineIdx];
          const who = members.indexOf(line.who as CharName);
          const q = pos[who >= 0 ? who : 0].p;
          const x = ((q.x * T + T / 2 - camX) * s) / dpr;
          const y = ((q.y * T - (CH - T) - camY) * s) / dpr;
          if (b.dataset.i !== String(lineIdx)) {
            b.dataset.i = String(lineIdx);
            b.textContent = line.text;
          }
          b.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
          b.style.opacity = '1';
        } else {
          b.style.opacity = '0';
          b.dataset.i = '';
        }
      }
    };

    app
      .init({ background: '#0d0b10', antialias: false, resolution: 1, autoStart: false, width: 1, height: 1, preference: 'webgl' })
      .then(() => {
        if (dead) {
          app.destroy(true, { children: true });
          return;
        }
        app.stage.addChild(world, screen);
        app.canvas.className = 'field-canvas';
        box.prepend(app.canvas);
        raf = requestAnimationFrame(frame);
      });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      if (app.renderer) app.destroy(true, { children: true });
    };
  }, []);

  return (
    <div className="field" ref={wrap}>
      <div className="bubble" ref={bubble} />
    </div>
  );
}
