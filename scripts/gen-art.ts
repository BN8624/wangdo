// npm run art:generate [-- 아이디... --force]
// ChatGPT 구독으로 로그인한 Codex CLI(`codex login --device-auth`)의 이미지 생성으로 src/data/art.ts의 그림을 그린다.
// API 키는 필요 없다. 이미지 변환에 ImageMagick(`convert`)을 쓴다.
// 화풍 기준 그림(art/style-anchor.webp)을 첨부해 모든 그림의 화풍을 맞춘다. 이미 있는 그림은 건너뛴다.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { ANCHOR, ART_ASSETS, ASPECT, artPrompt, type ArtAsset } from '../src/data/art';

const CODEX = process.env.CODEX_BIN ?? 'codex';
const ROOT = resolve(import.meta.dirname, '..');

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

const SIZE = { portrait: '2:3, 1024x1536', landscape: '3:2, 1536x1024', square: '1:1, 1024x1024' };

function instructions(a: ArtAsset, withReference: boolean): string {
  return [
    `Use your built-in image generation tool to create exactly one image (${SIZE[ASPECT[a.kind]]}).`,
    withReference
      ? 'The attached image is only a style reference. Match its art style exactly (brushwork, line weight, palette, paper texture), but do not include the character from it; draw only the subject described below.'
      : '',
    'Save the generated image in the current working directory as out.png. Do not write code and do not create any other files.',
    '',
    'PROMPT:',
    artPrompt(a),
  ]
    .filter(Boolean)
    .join('\n');
}

const magick = (...a: string[]) => execFileSync('convert', a);

/** 종류별로 크기를 줄이고 형식을 맞춘다(투명 배경은 그대로 둔다). */
function finish(a: ArtAsset, png: string, out: string) {
  mkdirSync(dirname(out), { recursive: true });
  const size = { full: '800x1200', card: '768x1152', cg: '1200x800', bg: '900x1350', banner: '1200x800', foe: '640x640' }[a.kind];
  magick(png, '-resize', size, '-quality', '82', out);
}

function draw(a: ArtAsset, out: string, reference: string | null) {
  const work = mkdtempSync(join(tmpdir(), `art-${a.id}-`));
  try {
    const refArgs = reference ? ['-i', reference] : [];
    execFileSync(
      CODEX,
      ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', work, ...refArgs, '--', instructions(a, !!reference)],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 10 * 60_000, maxBuffer: 64 * 1024 * 1024 },
    );
    const png = join(work, 'out.png');
    if (!existsSync(png)) throw new Error('Codex가 out.png를 만들지 않았습니다.');
    finish(a, png, out);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const targets = ART_ASSETS.filter((a) => only.length === 0 || only.includes(a.id));

let failed = 0;
for (const a of targets) {
  const out = resolve(ROOT, 'public', a.out);
  if (existsSync(out) && !force) continue;
  console.log(`그리는 중: ${a.id}`);
  try {
    draw(a, out, resolve(ROOT, ANCHOR[a.kind]));
  } catch (err) {
    failed++;
    console.error(`실패: ${a.id} — ${(err as Error).message.split('\n')[0]}`);
  }
}
console.log(failed ? `끝. 실패 ${failed}장 — 다시 실행하면 빠진 것만 그립니다.` : '끝.');
