// 맵 화면: 미리 구운 맵 위에 사람·짐승·상자·파티를 그리고, 걷기 Effect를 움직임으로 보여 준다
import { useEffect, useMemo, useRef } from 'react';
import type { CharName } from './atlas';
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { Lighting, type Lamp } from './light';
import { Particles } from './particles';
import { CH, aboveCanvas, isCave, mapCanvas } from './draw';
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

/** 서 있을 때 숨 쉬듯 1도트 오르내림(사람마다 박자를 어긋나게) */
/** 그린 지도: 화면 너비에 들어오는 지도 픽셀(이만큼 보이게 키운다) */
const PAINT_VIEW = 480;
/** SD 키(칸 단위) */
const SD_TALL = 3.4;
/** 도트 캐릭터 이름 → SD 그림(public/proto/sd/<이름>.webp) */
const SD_OF: Partial<Record<string, string>> = { me: 'me', baekseol: 'baekseol', muyeong: 'muyeong', sodam: 'sodam', thug: 'meoseum', ajeon: 'ajeon' };
const sdCache = new Map<string, Texture | null>();
/** SD 텍스처. 처음 부르면 받기 시작하고 null, 받은 뒤엔 텍스처 */
function sdTexture(name: string): Texture | null {
  if (!sdCache.has(name)) {
    sdCache.set(name, null);
    Assets.load<Texture>(`proto/sd/${name}.webp`).then((t) => sdCache.set(name, t), () => undefined);
  }
  return sdCache.get(name) ?? null;
}
const paintCache = new Map<string, Promise<Texture>>();
function paintTexture(src: string) {
  let p = paintCache.get(src);
  if (!p) paintCache.set(src, (p = Assets.load<Texture>(src)));
  return p;
}
/** 그린 지도에서 서 있을 때 자리(칸): 이끄는 사람은 조금 앞, 식객들은 옆으로 나란히 */
const IDLE_SPREAD: [number, number][] = [
  [0, 0.3],
  [-1.25, 0],
  [1.25, 0],
  [-2.45, -0.15],
];
/** SD가 마지막으로 본 좌우(1 오른쪽, -1 왼쪽) */
const facing = new Map<string, number>();

const breath = (now: number, seed: number) => (Math.floor(now / 650 + seed) % 2 === 0 ? 0 : 1);

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
    // 밤·동굴 조명, 그 위로 반딧불
    const lighting = new Lighting();
    const particles = new Particles();
    particles.world.zIndex = 1e9 + 1;
    world.addChild(particles.world);
    screen.addChild(lighting.view, particles.glow);

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
      const { g: game } = live.current;
      const gr = grid(game.map);
      const def = MAPS[game.map];
      // 칸 크기: 도트 맵 16, 그린 지도 32
      const T = def.tile;
      const painted = !!def.image;
      // 그린 지도는 화면 너비에 지도 PAINT_VIEW 픽셀이 들어오게(부드럽게), 도트 맵은 정수 배율로
      const s = painted ? cw / PAINT_VIEW : Math.max(1, Math.round(ZOOM * dpr));

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
        if (def.image) {
          mapSprite.texture = Texture.EMPTY;
          aboveSprite.texture = Texture.EMPTY;
          const want = game.map;
          paintTexture(def.image).then((t) => {
            if (shownMap === want) mapSprite.texture = t;
          });
        } else {
          mapSprite.texture = canvasTexture(game.map, mapCanvas(game.map));
          aboveSprite.texture = canvasTexture(`${game.map}:above`, aboveCanvas(game.map));
        }
      }

      // 사람·짐승·상자·파티: 발밑 y 순서(zIndex)로
      const seen = new Set<string>();
      shadows.clear();
      /** 발밑 칸(x, y: 도트 좌표, 칸 왼쪽 위)에 납작한 그림자 */
      const shadow = (x: number, y: number, rx = 5) =>
        shadows.ellipse(x + T / 2, y + T - 1.5 * (T / 16), painted ? T * 0.42 : rx, 2 * (T / 16)).fill({ color: 0x000000, alpha: 0.28 });
      const put = (key: string, tex: Texture, x: number, y: number, z: number) => {
        const sp = spriteOf(key);
        sp.texture = tex;
        sp.anchor.set(0);
        sp.scale.set(1);
        sp.position.set(x, y);
        sp.zIndex = z;
        sp.visible = true;
        seen.add(key);
      };
      /** 그린 지도: SD 캐릭터(발밑 칸 가운데에 발을 딛고 선다). 왼쪽으로 가면 뒤집고, 걸을 땐 통통 튄다 */
      const putSd = (key: string, name: string, cx: number, cy: number, dir: Dir, moving: boolean, z: number, bob: number) => {
        const tex = sdTexture(name);
        if (!tex) return false;
        const sp = spriteOf(key);
        if (dir === 2) facing.set(key, -1);
        else if (dir === 3) facing.set(key, 1);
        const flip = facing.get(key) ?? 1;
        const k = (SD_TALL * T) / tex.height;
        sp.texture = tex;
        sp.anchor.set(0.5, 1);
        sp.scale.set(k * flip, k);
        const hop = moving ? Math.abs(Math.sin(now / 95)) * T * 0.12 : bob;
        sp.position.set(cx * T + T / 2, cy * T + T - T * 0.08 - hop);
        sp.zIndex = z;
        sp.visible = true;
        seen.add(key);
        return true;
      };
      const order = (y: number) => y * 1000;
      for (const ch of MAPS[game.map].chests) put(`chest:${ch.id}`, tileTex(game.opened.includes(ch.id) ? 'chest_open' : 'chest'), ch.at.x * T, ch.at.y * T, order(ch.at.y));
      const f = Math.floor(now / 260);
      for (const a of actorsRef.current) {
        if (a.char && painted && SD_OF[a.char]) {
          shadow(a.at.x * T, a.at.y * T);
          putSd(`actor:${a.id}`, SD_OF[a.char]!, a.at.x, a.at.y, a.dir, false, order(a.at.y), breath(now, a.at.x * 3 + a.at.y));
        } else if (a.char) {
          shadow(a.at.x * T, a.at.y * T);
          put(`actor:${a.id}`, charTex(a.char, a.dir, 0), a.at.x * T, a.at.y * T - (CH - T) + breath(now, a.at.x * 3 + a.at.y), order(a.at.y));
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
        if (!painted || w) shadow(q.p.x * T, q.p.y * T);
        else shadow((lead.x + (IDLE_SPREAD[k]?.[0] ?? 0)) * T, (lead.y + (IDLE_SPREAD[k]?.[1] ?? 0)) * T);
        const z = order(q.p.y + 0.01 * (members.length - k));
        // 그린 지도에서 서 있을 땐 SD가 한자리에 겹치지 않게 이끄는 사람 둘레로 벌려 선다(걸을 땐 한 줄)
        const spread = painted && !w ? IDLE_SPREAD[k] ?? [0, 0] : [0, 0];
        const sx0 = painted && !w ? lead.x + spread[0] : q.p.x;
        const sy0 = painted && !w ? lead.y + spread[1] : q.p.y;
        if (!(painted && putSd(`party:${k}`, SD_OF[members[k]] ?? members[k], sx0, sy0, q.dir, q.moving, order(sy0 + 0.01 * (members.length - k)), q.moving ? 0 : breath(now, k * 2.7))))
          put(`party:${k}`, charTex(members[k], q.dir, row), q.p.x * T, q.p.y * T - (CH - T) + (q.moving ? 0 : breath(now, k * 2.7)), z);
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
      // 흙길을 걷는 동안 이끄는 사람 발밑에 먼지
      const lp = pos[0];
      const onDirt = gr.ground[Math.round(lp.p.y)]?.[Math.round(lp.p.x)] === ':';
      if (lp.moving && onDirt) particles.footstep(lp.p.x * T + T / 2, lp.p.y * T + T - 2, now);
      particles.update(now, MAPS[game.map], game.night, T, { x: camX, y: camY, w: vw, h: vh }, s, (x, y) => [(x - camX) * s, (y - camY) * s]);

      app.render();

      // 걷는 동안의 말풍선
      const b = bubble.current;
      if (b) {
        if (w && lineIdx >= 0) {
          const line = w.lines[lineIdx];
          const who = members.indexOf(line.who as CharName);
          const q = pos[who >= 0 ? who : 0].p;
          const x = ((q.x * T + T / 2 - camX) * s) / dpr;
          const y = ((q.y * T + (painted ? T - SD_TALL * T : -(CH - T)) - camY) * s) / dpr;
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
