// content/story/<부>/<화>.json 목록으로 src/data/story-index.ts를 만든다.
// dev·build·test 전에 자동으로 돌기 때문에, 새 화 파일은 넣기만 하면 된다.
import { readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const STORY = join(ROOT, 'content/story');
const files = readdirSync(STORY, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => readdirSync(join(STORY, d.name)).filter((f) => f.endsWith('.json')).map((f) => `${d.name}/${f}`))
  .sort();

const lines = [
  '// 자동 생성 파일(scripts/story-index.ts). 직접 고치지 말 것.',
  "import type { Episode } from '../core/types';",
  ...files.map((f, i) => `import e${i} from '../../content/story/${f}';`),
  '',
  `export const EPISODE_FILES = [${files.map((_, i) => `e${i}`).join(', ')}] as Episode[];`,
  '',
];
writeFileSync(join(ROOT, 'src/data/story-index.ts'), lines.join('\n'));
console.log(`이야기 ${files.length}화 목록을 만들었어요.`);
