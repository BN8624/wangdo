// 서 있는 그림 한 장을 그물망(격자)으로 나눠 부위별로 살짝 움직인다(Live2D를 흉내 낸 숨쉬기).
// 발과 치맛단은 고정하고, 가슴은 부풀고, 어깨와 머리는 오르내리고, 몸 바깥쪽(머리카락·꼬리·옷자락)은 바람에 흔들린다.
// WebGL이 없거나 움직임 줄이기 설정이면 그냥 그림을 보여 준다.
import { useEffect, useRef, useState } from 'react';
import type { Rig } from '../data/rigs';

const VS = `
attribute vec2 a_uv;
uniform float u_t;
uniform vec4 u_rect;
uniform vec4 u_rig;
varying vec2 v_uv;
void main() {
  vec2 uv = a_uv;
  float cx = u_rig.x, chest = u_rig.y, waist = u_rig.z, halfw = u_rig.w;
  float b = 0.5 - 0.5 * cos(6.2831853 * u_t / 3.6);
  float lift = 1.0 - smoothstep(chest, waist, uv.y);
  float chestBand = exp(-pow((uv.y - chest) / 0.07, 2.0));
  float body = exp(-pow((uv.x - cx) / (halfw * 1.4), 2.0));
  float dy = -(0.008 * lift + 0.006 * chestBand * body) * b;
  float dx = (uv.x - cx) * 0.05 * chestBand * body * b;
  float outer = smoothstep(halfw, halfw + 0.22, abs(uv.x - cx));
  float ground = 1.0 - smoothstep(0.7, 0.88, uv.y);
  dx += 0.007 * sin(6.2831853 * u_t / 5.3 + uv.y * 4.5) * outer * ground;
  dy += 0.003 * sin(6.2831853 * u_t / 4.1 + uv.x * 3.0) * outer * ground;
  v_uv = uv;
  gl_Position = vec4(u_rect.x + (uv.x + dx) * u_rect.z, u_rect.y - (uv.y + dy) * u_rect.w, 0.0, 1.0);
}`;

const FS = `
precision mediump float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() { gl_FragColor = texture2D(u_tex, v_uv); }`;

const COLS = 36;
const ROWS = 54;

function shader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export function LiveArt({ src, rig, alt, className }: { src: string; rig: Rig; alt: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const gl = el.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) {
      setFallback(true);
      return;
    }
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(prog);

    // 격자: 꼭짓점은 그림 좌표(0~1), 삼각형 두 개씩
    const uv = new Float32Array((COLS + 1) * (ROWS + 1) * 2);
    for (let r = 0, i = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) { uv[i++] = c / COLS; uv[i++] = r / ROWS; }
    const idx = new Uint16Array(COLS * ROWS * 6);
    for (let r = 0, i = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const a = r * (COLS + 1) + c, b = a + 1, d = a + COLS + 1, e = d + 1;
        idx.set([a, d, b, b, d, e], i);
        i += 6;
      }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_uv');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    const uT = gl.getUniformLocation(prog, 'u_t');
    const uRect = gl.getUniformLocation(prog, 'u_rect');
    gl.uniform4f(gl.getUniformLocation(prog, 'u_rig'), rig.cx, rig.chest, rig.waist, rig.halfw);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let aspect = 2 / 3;
    let ready = false;
    let frame = 0;
    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(el.clientWidth * dpr), h = Math.round(el.clientHeight * dpr);
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (ready && w && h) {
        // 컨테이너 안에 비율을 지켜 아래 가운데에 맞춘다(object-fit: contain + bottom)
        const ih = Math.min(h, w / aspect), iw = ih * aspect;
        gl.uniform4f(uRect, -1 + (w - iw) / w, 1 - (2 * (h - ih)) / h, (2 * iw) / w, (2 * ih) / h);
        gl.uniform1f(uT, still ? 0 : now / 1000);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      }
      if (!still) frame = requestAnimationFrame(draw);
    };

    const img = new Image();
    img.onload = () => {
      aspect = img.naturalWidth / img.naturalHeight;
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      ready = true;
      if (still) draw(0);
    };
    img.onerror = () => setFallback(true);
    img.src = src;
    frame = requestAnimationFrame(draw);
    const onResize = () => still && draw(0);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [src, rig.cx, rig.chest, rig.waist, rig.halfw]);

  if (fallback) return <img className={className} src={src} alt={alt} />;
  return <canvas ref={canvas} className={className} role="img" aria-label={alt} />;
}
