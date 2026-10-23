// npm run art:prompts — 손으로 그림을 뽑을 때 쓸 프롬프트 목록을 docs/ART_PROMPTS.md로 만든다.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ART_STYLE, portraitPath, portraitPrompt } from '../src/data/art';
import { GRADE_LABEL, YOKAI } from '../src/data/yokai';

const lines = [
  '# 요괴 초상화 프롬프트',
  '',
  '`npm run art:prompts`로 자동 생성되는 파일입니다. 직접 고치지 말고 `src/data/art.ts`, `src/data/yokai.ts`를 고치세요.',
  '',
  '- 비율: 세로 2:3 (예: 1024×1536)',
  `- 저장 위치: \`public/${portraitPath('<id>')}\``,
  '- 첫 그림(두두)이 마음에 들면, 나머지는 그 그림을 참고 이미지로 함께 넣어 "같은 화풍으로" 그리면 통일감이 생깁니다.',
  '',
  '## 공통 화풍',
  '',
  '```',
  ART_STYLE,
  '```',
  '',
];
for (const y of YOKAI) {
  lines.push(`## ${y.name} · ${y.kind} (${GRADE_LABEL[y.grade]}) — \`${y.id}\``, '', '```', portraitPrompt(y), '```', '');
}
writeFileSync(resolve(import.meta.dirname, '../docs/ART_PROMPTS.md'), lines.join('\n'));
console.log('docs/ART_PROMPTS.md 생성 완료');
