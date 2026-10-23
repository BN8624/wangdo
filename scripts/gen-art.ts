// npm run art:generate [-- 아이디... --force]
// ChatGPT 구독으로 로그인한 Codex CLI(`codex login --device-auth`)의 이미지 생성으로 요괴 초상화를 만든다.
// API 키는 필요 없다. 이미지 변환에 ImageMagick(`convert`)을 쓴다.
//
// 1) 화풍 기준 그림(art/style-anchor.webp)이 없으면 첫 캐릭터를 그려 기준으로 삼는다.
// 2) 나머지는 기준 그림을 첨부해 같은 화풍으로 그린다.
// 이미 있는 초상화는 건너뛴다(--force로 다시 그림). 결과: public/portraits/<id>.webp

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { portraitPath, portraitPrompt } from '../src/data/art';
import { YOKAI } from '../src/data/yokai';
import type { YokaiDef } from '../src/core/types';

const CODEX = process.env.CODEX_BIN ?? 'codex';
const ROOT = resolve(import.meta.dirname, '..');
const ANCHOR = resolve(ROOT, 'art/style-anchor.webp');

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

function instructions(def: YokaiDef, withReference: boolean): string {
  return [
    'Use your built-in image generation tool to create exactly one image in portrait orientation (2:3, 1024x1536).',
    withReference
      ? 'The attached image is the style reference. Match its art style exactly (brushwork, line weight, palette, lighting, background), but draw a completely different character as described below.'
      : '',
    'Save the generated image in the current working directory as out.png. Do not write code and do not create any other files.',
    '',
    'PROMPT:',
    portraitPrompt(def),
  ]
    .filter(Boolean)
    .join('\n');
}

/** Codex로 한 장 그리고 webp로 줄여 저장한다. */
function draw(def: YokaiDef, out: string, reference: string | null) {
  const work = mkdtempSync(join(tmpdir(), `art-${def.id}-`));
  try {
    const refArgs = reference ? ['-i', reference] : [];
    execFileSync(
      CODEX,
      ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', work, ...refArgs, '--', instructions(def, !!reference)],
      { stdio: ['ignore', 'ignore', 'inherit'], timeout: 10 * 60_000 },
    );
    const png = join(work, 'out.png');
    if (!existsSync(png)) throw new Error('Codex가 out.png를 만들지 않았습니다.');
    mkdirSync(dirname(out), { recursive: true });
    execFileSync('convert', [png, '-resize', '768x1152', '-quality', '82', out]);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const targets = YOKAI.filter((y) => only.length === 0 || only.includes(y.id));

if (!existsSync(ANCHOR)) {
  const first = YOKAI[0];
  const out = resolve(ROOT, 'public', portraitPath(first.id));
  console.log(`화풍 기준 그림 생성: ${first.name}`);
  draw(first, out, null);
  mkdirSync(dirname(ANCHOR), { recursive: true });
  copyFileSync(out, ANCHOR);
}

for (const def of targets) {
  const out = resolve(ROOT, 'public', portraitPath(def.id));
  if (existsSync(out) && !force) {
    console.log(`건너뜀(이미 있음): ${def.name}`);
    continue;
  }
  console.log(`그리는 중: ${def.name} (${def.kind})`);
  try {
    draw(def, out, ANCHOR);
  } catch (err) {
    console.error(`실패: ${def.name} — ${(err as Error).message}`);
  }
}
console.log('끝. public/portraits/를 확인하세요.');
