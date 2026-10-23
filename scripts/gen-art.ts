// npm run art:generate [-- 아이디... --force --quality=high]
// OpenAI 이미지 API로 요괴 초상화를 만든다. 필요한 것: 환경 변수 OPENAI_API_KEY, api.openai.com 접속 허용.
//
// 1) 첫 캐릭터(두두)를 그려 art/style-anchor.webp(화풍 기준 그림)로 저장한다.
// 2) 나머지는 기준 그림을 참고 이미지로 넘겨 같은 화풍으로 그린다.
// 이미 있는 초상화는 건너뛴다(--force로 다시 그림). 결과: public/portraits/<id>.webp

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { portraitPath, portraitPrompt, portraitPromptWithReference } from '../src/data/art';
import { YOKAI } from '../src/data/yokai';
import type { YokaiDef } from '../src/core/types';

const API = 'https://api.openai.com/v1';
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';
const ROOT = resolve(import.meta.dirname, '..');
const ANCHOR = resolve(ROOT, 'art/style-anchor.webp');

const args = process.argv.slice(2);
const force = args.includes('--force');
const quality = args.find((a) => a.startsWith('--quality='))?.split('=')[1] ?? 'medium';
const only = args.filter((a) => !a.startsWith('--'));

const COMMON = { model: MODEL, size: '1024x1536', quality, output_format: 'webp', output_compression: 85, n: 1 };

async function readImage(res: Response): Promise<Buffer> {
  const body = (await res.json()) as { data?: { b64_json?: string }[]; error?: { message: string } };
  if (!res.ok || !body.data?.[0]?.b64_json) {
    throw new Error(`OpenAI ${res.status}: ${body.error?.message ?? JSON.stringify(body).slice(0, 300)}`);
  }
  return Buffer.from(body.data[0].b64_json, 'base64');
}

async function generate(def: YokaiDef): Promise<Buffer> {
  const res = await fetch(`${API}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...COMMON, prompt: portraitPrompt(def) }),
  });
  return readImage(res);
}

async function generateWithReference(def: YokaiDef, reference: Buffer): Promise<Buffer> {
  const form = new FormData();
  for (const [k, v] of Object.entries(COMMON)) form.append(k, String(v));
  form.append('prompt', portraitPromptWithReference(def));
  form.append('image[]', new Blob([reference], { type: 'image/webp' }), 'style-anchor.webp');
  const res = await fetch(`${API}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  return readImage(res);
}

function save(path: string, data: Buffer) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

async function main() {
  if (!KEY) {
    console.error('OPENAI_API_KEY가 없습니다. 클라우드 환경 설정에 환경 변수로 넣고 새 세션에서 다시 실행하세요.');
    process.exit(1);
  }
  const targets = YOKAI.filter((y) => only.length === 0 || only.includes(y.id));
  const done = new Set<string>();

  if (!existsSync(ANCHOR) || (force && only.length === 0)) {
    const first = YOKAI[0];
    console.log(`화풍 기준 그림 생성: ${first.name}`);
    const img = await generate(first);
    save(ANCHOR, img);
    save(resolve(ROOT, 'public', portraitPath(first.id)), img);
    done.add(first.id);
  }
  const anchor = readFileSync(ANCHOR);

  for (const def of targets) {
    const out = resolve(ROOT, 'public', portraitPath(def.id));
    if (done.has(def.id)) continue;
    if (existsSync(out) && !force) {
      console.log(`건너뜀(이미 있음): ${def.name}`);
      continue;
    }
    console.log(`그리는 중: ${def.name} (${def.kind})`);
    try {
      save(out, await generateWithReference(def, anchor));
    } catch (err) {
      console.error(`실패: ${def.name} — ${(err as Error).message}`);
    }
  }
  console.log('끝. public/portraits/를 확인하세요.');
}

await main();
