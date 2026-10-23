// npm run story:next — Codex(ChatGPT 구독 로그인)가 설정집과 지난 줄거리를 읽고 다음 화를 쓴다.
// 결과는 content/story/s<부>/s<부>e<화>.json에 저장되고 content/story/summary.md에 요약이 한 줄 붙는다.
// 형식 검사를 통과하지 못하면 저장하지 않는다.

import { execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sortEpisodes, validateEpisode } from '../src/core/story';
import type { Episode } from '../src/core/types';

const ROOT = resolve(import.meta.dirname, '..');
const STORY = join(ROOT, 'content/story');
const CODEX = process.env.CODEX_BIN ?? 'codex';
const note = process.argv.slice(2).join(' ');

const episodes: Episode[] = sortEpisodes(
  readdirSync(STORY, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => readdirSync(join(STORY, d.name)).filter((f) => f.endsWith('.json')).map((f) => join(STORY, d.name, f)))
    .map((f) => JSON.parse(readFileSync(f, 'utf8')) as Episode),
);
const last = episodes.at(-1);
if (!last) throw new Error('첫 화가 없습니다.');
const heroines = JSON.parse(readFileSync(join(ROOT, 'content/heroines.json'), 'utf8')) as { id: string; name: string; voice?: string }[];
const ids = new Set(heroines.map((h) => h.id));

const work = mkdtempSync(join(tmpdir(), 'story-'));
copyFileSync(join(ROOT, 'docs/DESIGN.md'), join(work, 'DESIGN.md'));
copyFileSync(join(ROOT, 'docs/STORY_BIBLE.md'), join(work, 'STORY_BIBLE.md'));
copyFileSync(join(ROOT, 'content/story/summary.md'), join(work, 'summary.md'));
copyFileSync(join(ROOT, 'content/heroines.json'), join(work, 'heroines.json'));
writeFileSync(join(work, 'last.json'), JSON.stringify(last, null, 2));

const nextSame = `s${last.season}e${String(last.no + 1).padStart(2, '0')}`;
const nextSeason = `s${last.season + 1}e01`;
const brief = `「왕도」의 다음 화를 쓰세요. DESIGN.md(형식·톤 규칙), STORY_BIBLE.md(설정집), summary.md(지난 줄거리), last.json(바로 앞 화), heroines.json(식객)을 먼저 읽으세요.
- 앞 화에서 자연스럽게 이어지게 쓰고, 설정집의 부별 줄거리와 떡밥을 따르세요. 이야기는 끝내지 말고 다음 화로 이어질 갈등을 남기세요.
- 이번 부의 줄거리가 끝났다면 다음 부 첫 화(${nextSeason})를, 아니면 ${nextSame}를 쓰세요. unlock.after는 "${last.id}"이고, rank·power·stage는 앞 화보다 같거나 조금 높게.
- 결과는 이 폴더에 next.json(화 파일 하나)과 summary-line.txt("- <id> <제목>: 두세 문장 요약" 한 줄)로만 저장하세요. 코드는 쓰지 마세요.
${note ? `- 작가 메모: ${note}` : ''}`;

try {
  execFileSync(CODEX, ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', work, '--', brief], {
    stdio: ['ignore', 'ignore', 'inherit'],
    timeout: 20 * 60_000,
  });
  const ep = JSON.parse(readFileSync(join(work, 'next.json'), 'utf8')) as Episode;
  const errs = validateEpisode(ep, ids);
  if (episodes.some((e) => e.id === ep.id)) errs.push(`이미 있는 화예요: ${ep.id}`);
  if (errs.length) {
    console.error('형식 검사 실패:\n' + errs.join('\n'));
    process.exit(1);
  }
  const dir = join(STORY, `s${ep.season}`);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${ep.id}.json`);
  writeFileSync(out, JSON.stringify(ep, null, 2) + '\n');
  const line = existsSync(join(work, 'summary-line.txt')) ? readFileSync(join(work, 'summary-line.txt'), 'utf8').trim() : `- ${ep.id} ${ep.title}: ${ep.summary}`;
  appendFileSync(join(STORY, 'summary.md'), `\n${line}`);
  execFileSync('npx', ['tsx', join(ROOT, 'scripts/story-index.ts')], { stdio: 'inherit' });
  console.log(`새 화 저장: ${out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
