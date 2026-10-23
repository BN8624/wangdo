// npm run art:prompts — 손으로 그림을 뽑을 때 쓸 프롬프트 목록을 docs/ART_PROMPTS.md로 만든다.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ART_ASSETS, ASPECT, artPrompt } from '../src/data/art';

const lines = [
  '# 그림 프롬프트',
  '',
  '`npm run art:prompts`로 자동 생성되는 파일입니다. 직접 고치지 말고 `src/data/art.ts`를 고치세요.',
  '`art/style-anchor.webp`를 참고 이미지로 함께 넣으면 화풍이 맞춰집니다.',
  '',
];
for (const a of ART_ASSETS) {
  lines.push(`## \`${a.id}\` → \`public/${a.out}\` (${ASPECT[a.kind]})`, '', '```', artPrompt(a), '```', '');
}
writeFileSync(resolve(import.meta.dirname, '../docs/ART_PROMPTS.md'), lines.join('\n'));
console.log('docs/ART_PROMPTS.md 생성 완료');
