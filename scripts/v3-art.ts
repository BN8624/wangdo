// v3 식객 일러스트 만들기: Codex(GPT 이미지 생성)에 기준 그림(art/ref)을 첨부하고,
// docs/ART_REFERENCE.md의 공통 화풍 + 사람 설명 + 이번 장면을 그대로 붙여 한 장씩 그린다.
//   npx tsx scripts/v3-art.ts <id> [<id> ...]     (id는 아래 V3_ART)
//   npx tsx scripts/v3-art.ts --list
// 결과는 out 경로에 webp로 저장한다. 같은 경로에 이미 있으면 덮어쓴다.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

type Who = '백설' | '무영' | '소담';
const REF: Record<Who, string> = { 백설: 'art/ref/baekseol.webp', 무영: 'art/ref/muyeong.webp', 소담: 'art/ref/sodam.webp' };

export interface V3Art {
  id: string;
  who: Who[];
  /** '이번 장면' 또는 '이번 그림' 줄 */
  scene: string;
  out: string;
  /** 대화창 전신·컷인처럼 투명 배경 */
  transparent?: boolean;
  width: number;
  height: number;
}

const SCENE = { width: 900, height: 1350 };

export const V3_ART: V3Art[] = [
  {
    id: 'e1-foxfire',
    who: ['백설'],
    ...SCENE,
    out: 'public/proto/scene/e1-foxfire.webp',
    scene:
      "[이번 장면] 1화 밤, 초가 오두막 안. 발길질에 문짝이 뜯겨 나간 문간에 횃불 불빛과 몽둥이 든 사내들의 그림자. 바닥에는 방금 방망이가 받아낸 엽전들이 굴러다닌다. 백설은 이불 위에서 몸을 반쯤 일으킨 채, 제 손끝에 화르르 피어난 푸른 여우불 한 송이를 놀란 눈으로 내려다본다. 기쁨과 놀라움이 섞인 얼굴, 꼬리 끝이 곤두섬. 앞쪽에 빨간 술이 달린 시커먼 방망이를 쥔 '나'의 손. 1인칭 시점, 세로 2:3.",
  },
  {
    id: 'e2-market',
    who: ['백설'],
    ...SCENE,
    out: 'public/proto/scene/e2-market.webp',
    scene:
      "[이번 장면] 2화 아침, 시골 장터. 떡판 앞에 쪼그려 앉은 백설이 인절미를 입에 문 채 '나'를 올려다보며 장난스럽게 웃는다. 입가에 콩고물. 한 손바닥 위에서 엽전이 나뭇잎으로 도로 바뀌며 팔랑 떨어진다. 뒤로 짚신·몽둥이를 건 노점, 차일, 장 보는 사람들은 흐릿하게. 밝은 아침 햇살. 앞쪽에 '나'의 베옷 소매와 엽전을 쥔 손. 1인칭 시점, 세로 2:3.",
  },
  {
    id: 'e2-mirror',
    who: ['백설'],
    ...SCENE,
    out: 'public/proto/scene/e2-mirror.webp',
    scene:
      "[이번 장면] 2화 밤, 초가 방 안 등잔불 아래. 거울 구도가 물리적으로 맞아야 한다. 백설은 '나'에게 등을 돌리고 앉아 두 손으로 금테 손거울을 얼굴 앞에 들고 들여다본다. '나'는 그녀 바로 뒤에서 어깨 너머로 거울을 본다. 그래서 그림 앞쪽에는 백설의 뒷모습(은백색 긴 머리, 드러난 하얀 어깨와 등, 여우 귀 뒷면)과 아주 살짝 돌린 옆얼굴 윤곽만 보이고, 그녀의 정면 얼굴은 오직 거울 속에만 비친다. 거울 속 백설은 웃으려다 실패한 쓸쓸한 얼굴로, 거울을 통해 뒤에 선 '나'와 눈이 마주친다. 거울 속 얼굴 바로 아래에 먹빛 붓자국 같은 희미한 빈 줄 한 줄이 떠 있다(이름 자리가 비어 있다는 표시, 읽을 수 있는 글자는 쓰지 않는다). 하얀 어깨가 작게 떨리고, 꼬리 아홉 개가 방바닥에 힘없이 늘어진다. 따뜻하지만 쓸쓸한 등잔빛. 그림 아래 가장자리에 그녀 어깨로 다가가는 '나'의 손과 베옷 소매. 1인칭 시점, 세로 2:3.",
  },
  {
    id: 'e3-firstcup',
    who: ['백설', '무영'],
    ...SCENE,
    out: 'public/proto/scene/e3-firstcup.webp',
    scene:
      "[이번 장면] 3화 밤, 고개 아래 주막. 낮은 술상 하나에 술병 하나. 무영이 오른쪽, 백설이 왼쪽에 바짝 붙어 앉아 '나'를 본다. 백설은 \"첫 잔은 누구 거예요?\" 하며 잔을 내밀고 웃고, 무영은 빈 잔을 쥔 채 귀 끝이 붉다. 등잔불. 앞쪽에 술병을 든 '나'의 손. 1인칭 시점, 세로 2:3.",
  },
  {
    id: 'cutin-baekseol',
    who: ['백설'],
    width: 1200,
    height: 800,
    transparent: true,
    out: 'public/proto/cutin/baekseol.webp',
    scene:
      '[이번 그림] 기술 컷인용 상반신. 투명 배경, 가로 3:2. 허리 위만, 화면 왼쪽에 치우쳐 오른쪽을 향해 몸을 비튼 역동적인 자세. 손바닥 위에 푸른 여우불이 화르르 타오르고, 호박색 눈이 빛나며 자신만만하게 웃는다. 꼬리 몇 개가 뒤로 퍼진다. 1인칭 시점 규칙은 이 그림에는 적용하지 않는다.',
  },
  {
    id: 'cutin-muyeong',
    who: ['무영'],
    width: 1200,
    height: 800,
    transparent: true,
    out: 'public/proto/cutin/muyeong.webp',
    scene:
      '[이번 그림] 기술 컷인용 상반신. 투명 배경, 가로 3:2. 허리 위만, 화면 왼쪽에 치우쳐 쇠방망이를 머리 위로 치켜들어 내려치기 직전. 금빛 눈이 매섭게 빛나고 이를 악문 단호한 표정. 1인칭 시점 규칙은 이 그림에는 적용하지 않는다.',
  },
];

/** ART_REFERENCE.md의 코드 블록: [공통 화풍, 백설, 무영, 소담, ...] */
function referenceBlocks() {
  const md = readFileSync(join(ROOT, 'docs/ART_REFERENCE.md'), 'utf8');
  const blocks = [...md.matchAll(/```\n([\s\S]*?)```/g)].map((m) => m[1].trim());
  const style = blocks.find((b) => b.startsWith('첨부한 기준 그림과 같은 화가가'));
  const person = (who: Who) => blocks.find((b) => b.startsWith(`[${who}]`));
  if (!style) throw new Error('ART_REFERENCE.md에서 공통 화풍을 못 찾았어요');
  return { style, person };
}

export function v3Prompt(a: V3Art): string {
  const { style, person } = referenceBlocks();
  const people = a.who.map((w) => {
    const p = person(w);
    if (!p) throw new Error(`ART_REFERENCE.md에 ${w} 설명이 없어요`);
    return p;
  });
  return [style, ...people, a.scene].join('\n\n');
}

function instructions(a: V3Art): string {
  return [
    `Use your built-in image generation tool to create exactly one image, ${a.width}x${a.height} aspect (${a.width > a.height ? 'landscape' : 'portrait'}).`,
    ...a.who.map((w, i) => `Reference ${i + 1}: the character ${w}. Preserve this character's face, hair, costume, colors and accessories, and match its art style exactly.`),
    `PROMPT (Korean):\n${v3Prompt(a)}`,
    a.transparent ? 'Output must have a real transparent alpha background, not a checkerboard or painted background.' : 'Output must use an opaque background.',
    'No text, letters, signatures, watermarks or borders anywhere in the image.',
    'Save exactly one generated image as out.png in the current working directory. Do not write code or create other files.',
  ].join('\n\n');
}

const magick = (...args: string[]) => execFileSync('convert', args, { encoding: 'utf8' });

function draw(a: V3Art) {
  const work = mkdtempSync(join(tmpdir(), `v3art-${a.id}-`));
  try {
    execFileSync(
      process.env.CODEX_BIN ?? 'codex',
      ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', work, ...a.who.flatMap((w) => ['-i', join(ROOT, REF[w])]), '--', instructions(a)],
      { stdio: ['ignore', 'ignore', 'inherit'], timeout: 15 * 60_000 },
    );
    const png = join(work, 'out.png');
    if (!existsSync(png)) throw new Error('Codex가 out.png를 만들지 않았어요');
    const [w, h] = magick(png, '-format', '%w %h', 'info:').trim().split(/\s+/).map(Number);
    if (Math.abs(w / h / (a.width / a.height) - 1) > 0.05) throw new Error(`구도가 달라요: ${w}×${h}`);
    if (a.transparent && magick(png, '-format', '%[opaque]', 'info:').trim().toLowerCase() !== 'false') throw new Error('투명 배경이 아니에요');
    const out = join(ROOT, a.out);
    mkdirSync(dirname(out), { recursive: true });
    const pending = `${out}.tmp.webp`;
    magick(png, '-background', 'none', '-resize', `${a.width}x${a.height}^`, '-gravity', 'center', '-extent', `${a.width}x${a.height}`, '-define', 'webp:alpha-quality=100', '-quality', '84', pending);
    renameSync(pending, out);
    console.log(`${a.id} → ${a.out} (${w}×${h})`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('v3-art.ts')) {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '--list') {
    for (const a of V3_ART) console.log(`${a.id}\t${a.out}`);
  } else {
    let failed = 0;
    for (const id of args) {
      const a = V3_ART.find((x) => x.id === id);
      if (!a) throw new Error(`없는 그림: ${id}`);
      try {
        draw(a);
      } catch (e) {
        failed++;
        console.error(`${id} 실패: ${(e as Error).message}`);
      }
    }
    process.exit(failed ? 1 : 0);
  }
}
