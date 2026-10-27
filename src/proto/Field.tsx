// 맵 화면: 미리 구운 맵 위에 사람·짐승·상자·파티를 그리고, 걷기 Effect를 움직임으로 보여 준다
import { useEffect, useMemo, useRef } from 'react';
import type { CharName } from './atlas';
import { CH, T, drawChar, drawMon, drawTile, isCave, mapCanvas } from './draw';
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

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function along(track: Pt[], i: number): { p: Pt; dir: Dir | null } {
  if (i <= 0) return { p: track[0], dir: null };
  const k = Math.min(Math.floor(i), track.length - 1);
  if (k >= track.length - 1) return { p: track[track.length - 1], dir: track.length > 1 ? dirTo(track[track.length - 2], track[track.length - 1]) : null };
  return { p: lerp(track[k], track[k + 1], i - k), dir: dirTo(track[k], track[k + 1]) };
}

export function Field({ g, fx, speed, onWalked }: { g: Game; fx: Effect | null; speed: number; onWalked: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
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

  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const canvas = cv.current;
      const box = wrap.current;
      if (!canvas || !box) return;
      const dpr = window.devicePixelRatio || 1;
      const cw = box.clientWidth;
      const chh = box.clientHeight;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(chh * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(chh * dpr);
      }
      const s = Math.max(1, Math.round(ZOOM * dpr));
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
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
      const vw = canvas.width / s;
      const vh = canvas.height / s;
      const mw = gr.w * T;
      const mh = gr.h * T;
      const lead = pos[0].p;
      const fitX = (target: number) => (mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, target - vw / 2)));
      // 세로: 아래 판(대화·선택)에 가리지 않게 이끄는 사람을 화면 위쪽 38% 높이에 둔다. 맵 아래 끝을 넘어가면 어둠으로 채운다
      const fitY = (target: number) => Math.max(Math.min(0, mh - vh), Math.min(mh - vh * 0.72, target - vh * 0.38));
      const camX = Math.round(fitX(lead.x * T + T / 2) * s) / s;
      const camY = Math.round(fitY(lead.y * T + T / 2) * s) / s;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0d0b10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s);
      ctx.drawImage(mapCanvas(game.map), 0, 0);

      // 사람·짐승·상자·파티를 발밑 y 순서로
      type Draw = { y: number; fn: () => void };
      const list: Draw[] = [];
      for (const ch of MAPS[game.map].chests) {
        list.push({ y: ch.at.y, fn: () => drawTile(ctx, game.opened.includes(ch.id) ? 'chest_open' : 'chest', ch.at.x * T, ch.at.y * T) });
      }
      for (const a of actorsRef.current) {
        const f = Math.floor(now / 260);
        list.push({
          y: a.at.y,
          fn: () => (a.char ? drawChar(ctx, a.char, a.dir, 0, a.at.x * T, a.at.y * T) : a.mon && drawMon(ctx, a.mon, a.dir, f, a.at.x * T, a.at.y * T)),
        });
      }
      pos.forEach((q, k) => {
        const row = q.moving ? Math.floor((now / (TILE_MS / 2 / live.current.speed)) % 4) : 0;
        list.push({ y: q.p.y + 0.01 * (members.length - k), fn: () => drawChar(ctx, members[k], q.dir, row, q.p.x * T, q.p.y * T) });
      });
      list.sort((a, b) => a.y - b.y).forEach((d) => d.fn());

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (isCave(game.map)) {
        const cx = (lead.x * T + T / 2 - camX) * s;
        const cy = (lead.y * T + T / 2 - camY) * s;
        const grad = ctx.createRadialGradient(cx, cy, 40 * s, cx, cy, 120 * s);
        grad.addColorStop(0, 'rgba(8,6,12,0)');
        grad.addColorStop(1, 'rgba(8,6,12,0.88)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (game.night) {
        ctx.fillStyle = 'rgba(20,26,70,0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

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
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="field" ref={wrap}>
      <canvas ref={cv} className="field-canvas" />
      <div className="bubble" ref={bubble} />
    </div>
  );
}
