// 소리: 음원 파일 없이 브라우저에서 합성한다(무료, 용량 0).
// 가야금 같은 퉁김 소리는 카플러스-스트롱(잡음을 짧은 줄에 돌려 감쇠시키는 방식)으로 만들고,
// 배경음은 평조 오음계 위를 천천히 걷는 가락을 그때그때 지어낸다. 첫 터치 뒤에만 소리가 난다(모바일 자동 재생 제한).

export type Sfx = 'hit' | 'crit' | 'skill' | 'heal' | 'stamp' | 'win' | 'lose' | 'chime' | 'coin' | 'levelup' | 'promote';
export type BgmMood = 'home' | 'story' | 'battle' | 'off';

const KEY = 'wangdo.sound';
interface Settings {
  bgm: boolean;
  sfx: boolean;
}

function load(): Settings {
  try {
    return { bgm: true, sfx: true, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { bgm: true, sfx: true };
  }
}

let settings = load();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let mood: BgmMood = 'off';
const listeners = new Set<() => void>();

export const soundSettings = () => settings;
export function onSoundChange(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function setSound(next: Partial<Settings>) {
  settings = { ...settings, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* 저장이 막혀도 이번 접속에는 적용된다 */
  }
  if (bgmGain && ctx) bgmGain.gain.setTargetAtTime(settings.bgm ? BGM_VOLUME : 0, ctx.currentTime, 0.4);
  listeners.forEach((l) => l());
}

const BGM_VOLUME = 0.4;
const SFX_VOLUME = 0.5;

/** 첫 터치 때 오디오를 깨운다 */
export function initSound() {
  const wake = () => {
    ensure();
    ctx?.resume().catch(() => undefined);
  };
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('keydown', wake);
  // 화면을 떠나면 잠들어 배터리를 아낀다
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => undefined);
    else ctx.resume().catch(() => undefined);
  });
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  // 큰 소리가 겹쳐도 찢어지지 않게 살짝 눌러 준다
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  bgmGain = ctx.createGain();
  bgmGain.gain.value = settings.bgm ? BGM_VOLUME : 0;
  bgmGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = SFX_VOLUME;
  sfxGain.connect(master);
  startScheduler();
  return ctx;
}

// ───────────── 재료: 퉁김·종·북·잡음 ─────────────

const plucks = new Map<number, AudioBuffer>();

/** 카플러스-스트롱 퉁김 소리(주파수마다 한 번 만들어 둔다) */
function pluckBuffer(c: AudioContext, freq: number): AudioBuffer {
  const key = Math.round(freq);
  const hit = plucks.get(key);
  if (hit) return hit;
  const sr = c.sampleRate;
  const len = Math.floor(sr * 2.4);
  const buf = c.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const n = Math.max(2, Math.round(sr / freq));
  const ring = new Float32Array(n);
  for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
  // 가야금처럼 밝게 시작해 부드럽게 사그라지도록
  const decay = 0.996;
  let p = 0;
  for (let i = 0; i < len; i++) {
    const a = ring[p];
    const b = ring[(p + 1) % n];
    const v = (a + b) * 0.5 * decay;
    ring[p] = v;
    out[i] = a;
    p = (p + 1) % n;
  }
  plucks.set(key, buf);
  return buf;
}

function pluck(c: AudioContext, dest: AudioNode, freq: number, at: number, vol = 0.5, bend = 0) {
  const src = c.createBufferSource();
  src.buffer = pluckBuffer(c, freq);
  // 농현: 줄을 눌러 음을 살짝 끌어올린다
  if (bend) {
    src.playbackRate.setValueAtTime(1, at + 0.12);
    src.playbackRate.linearRampToValueAtTime(1 + bend, at + 0.45);
    src.playbackRate.linearRampToValueAtTime(1, at + 0.9);
  }
  const g = c.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0008, at + 2.2);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  src.connect(lp).connect(g).connect(dest);
  src.start(at);
  src.stop(at + 2.4);
}

function tone(c: AudioContext, dest: AudioNode, freq: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine', to?: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + dur + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext, dest: AudioNode, at: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, q = 0.8) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(at);
  src.stop(at + dur + 0.05);
}

/** 징: 맞물리지 않는 배음 몇 개가 길게 운다 */
function gong(c: AudioContext, dest: AudioNode, base: number, at: number, vol: number) {
  [1, 2.32, 4.1, 5.8].forEach((m, i) => tone(c, dest, base * m, at, 2.6 - i * 0.4, vol / (i + 1.4)));
  tone(c, dest, base * 0.5, at, 1.8, vol * 0.5);
}

/** 북: 낮은 울림 + 가죽 소리 */
function drum(c: AudioContext, dest: AudioNode, at: number, vol: number, pitch = 90) {
  tone(c, dest, pitch, at, 0.45, vol, 'sine', pitch * 0.55);
  noise(c, dest, at, 0.08, vol * 0.35, 'lowpass', 900);
}

// 평조 오음계(솔 라 도 레 미)를 몇 옥타브에 걸쳐
const SCALE = [196, 220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784];

// ───────────── 효과음 ─────────────

export function play(name: Sfx) {
  if (!settings.sfx) return;
  const c = ensure();
  if (!c || !sfxGain || c.state !== 'running') return;
  const t = c.currentTime + 0.01;
  const d = sfxGain;
  switch (name) {
    case 'hit':
      drum(c, d, t, 0.5, 120);
      break;
    case 'crit':
      drum(c, d, t, 0.7, 95);
      noise(c, d, t, 0.12, 0.25, 'highpass', 2500);
      break;
    case 'skill':
      noise(c, d, t, 0.5, 0.18, 'bandpass', 1400, 0.6);
      gong(c, d, 146.8, t + 0.12, 0.32);
      break;
    case 'heal':
      [5, 6, 7, 9].forEach((k, i) => pluck(c, d, SCALE[k], t + i * 0.09, 0.32));
      break;
    case 'stamp':
      drum(c, d, t, 0.55, 70);
      noise(c, d, t + 0.02, 0.15, 0.15, 'highpass', 3500);
      break;
    case 'win':
      [2, 4, 5, 7, 9].forEach((k, i) => pluck(c, d, SCALE[k], t + i * 0.11, 0.38));
      gong(c, d, 196, t + 0.6, 0.18);
      break;
    case 'lose':
      [7, 5, 4, 2].forEach((k, i) => pluck(c, d, SCALE[k] * 0.94, t + i * 0.18, 0.3));
      break;
    case 'chime':
      pluck(c, d, SCALE[7], t, 0.3);
      pluck(c, d, SCALE[9], t + 0.12, 0.26);
      break;
    case 'coin':
      tone(c, d, 1975, t, 0.18, 0.12, 'triangle');
      tone(c, d, 2637, t + 0.06, 0.22, 0.1, 'triangle');
      break;
    case 'levelup':
      pluck(c, d, SCALE[4], t, 0.34);
      pluck(c, d, SCALE[6], t + 0.08, 0.34);
      pluck(c, d, SCALE[9], t + 0.16, 0.3);
      break;
    case 'promote':
      gong(c, d, 196, t, 0.3);
      [4, 5, 7, 9, 10].forEach((k, i) => pluck(c, d, SCALE[k], t + 0.3 + i * 0.12, 0.34));
      break;
  }
}

// ───────────── 배경음: 그때그때 지어내는 가락 ─────────────

export function setMood(next: BgmMood) {
  mood = next;
}

let nextAt = 0;
let step = 0;
let pos = 4;
let timer = 0;

function startScheduler() {
  if (timer) return;
  timer = window.setInterval(schedule, 200);
}

/** 앞으로 1초 동안 울릴 소리를 미리 걸어 둔다 */
function schedule() {
  const c = ctx;
  if (!c || !bgmGain || c.state !== 'running' || mood === 'off') return;
  const now = c.currentTime;
  if (nextAt < now) nextAt = now + 0.1;
  const beat = mood === 'battle' ? 0.32 : mood === 'story' ? 0.75 : 0.6;
  while (nextAt < now + 1) {
    const t = nextAt;
    if (mood === 'battle') battleBeat(c, bgmGain, t);
    else calmBeat(c, bgmGain, t, mood === 'story');
    step += 1;
    nextAt += beat;
  }
}

/** 걸음마다 한 칸씩, 가끔 크게 뛰며 오음계를 걷는다 */
function walk(range: [number, number]): number {
  const r = Math.random();
  const move = r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.85 ? 2 : -2;
  pos = Math.min(range[1], Math.max(range[0], pos + move));
  return SCALE[pos];
}

function calmBeat(c: AudioContext, dest: AudioNode, t: number, soft: boolean) {
  const bar = step % 8;
  // 마디 머리에 낮은 줄을 울려 바탕을 깐다
  if (bar === 0) pluck(c, dest, SCALE[0] / 2, t, soft ? 0.2 : 0.28);
  if (bar === 4) pluck(c, dest, SCALE[2] / 2, t, soft ? 0.16 : 0.22);
  // 가락은 쉬어 가며
  const rest = soft ? 0.5 : 0.35;
  if (Math.random() > rest) {
    const f = walk([2, 9]);
    pluck(c, dest, f, t, soft ? 0.22 : 0.3, Math.random() < 0.25 ? 0.03 : 0);
  }
  if (!soft && bar === 6 && Math.random() < 0.4) drum(c, dest, t, 0.12, 80);
}

function battleBeat(c: AudioContext, dest: AudioNode, t: number) {
  const bar = step % 12;
  // 굿거리풍 북 장단: 덩 . 기덕 쿵 . 덕
  if (bar === 0 || bar === 6) drum(c, dest, t, 0.42, 85);
  if (bar === 3 || bar === 9) drum(c, dest, t, 0.22, 140);
  if (bar === 4 || bar === 10) noise(c, dest, t, 0.05, 0.12, 'highpass', 3000);
  if (bar % 3 === 0 && Math.random() < 0.75) pluck(c, dest, walk([3, 10]), t, 0.26);
  if (bar === 0 && step % 48 === 0) gong(c, dest, 98, t, 0.1);
}
