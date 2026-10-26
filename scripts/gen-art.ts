// npm run art:generate -- <asset-id...> [--dry-run] [--force] [--edit "바꿀 부분만"]
// 화풍과 캐릭터/소품 동일성 참조를 따로 전달한다. --edit는 기존 파일의 부분 편집이며 나머지는 유지한다.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANCHOR, ART_ASSETS, ART_SPECS, ASPECT, artPrompt, type ArtAsset } from '../src/data/art';

const ROOT = resolve(import.meta.dirname, '..');
const SIZE = { portrait: '2:3, 1024x1536', landscape: '3:2, 1536x1024', square: '1:1, 1024x1024' };

export interface ArtOptions {
  ids: string[];
  dryRun: boolean;
  force: boolean;
  edit?: string;
}

export function parseArtOptions(args: string[]): ArtOptions {
  const options: ArtOptions = { ids: [], dryRun: false, force: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--edit') {
      const text = args[++i];
      if (!text?.trim() || text.startsWith('--')) throw new Error('--edit 뒤에 바꿀 부분을 적으세요.');
      options.edit = text.trim();
      options.force = true;
    } else if (arg.startsWith('-')) throw new Error(`알 수 없는 옵션: ${arg}`);
    else options.ids.push(arg);
  }
  if (options.edit && options.ids.length === 0) throw new Error('부분 편집에는 대상 asset-id를 지정하세요.');
  const unknown = options.ids.filter((id) => !ART_ASSETS.some((a) => a.id === id));
  if (unknown.length) throw new Error(`알 수 없는 그림 ID: ${unknown.join(', ')}`);
  return options;
}

export interface ArtReference { role: 'edit' | 'style' | 'identity' | 'style-and-identity'; path: string }

/** ROOT 상대 경로. 누락된 identity를 조용히 버리면 얼굴이 달라지므로 실행 전에 실패시킨다. */
export function artReferences(a: ArtAsset, edit = false): ArtReference[] {
  const refs: ArtReference[] = [];
  if (edit) refs.push({ role: 'edit', path: `public/${a.out}` });
  refs.push({ role: 'style', path: ANCHOR[a.kind] });
  for (const path of a.identity ?? []) {
    const existing = refs.find((r) => r.path === path);
    if (!existing) refs.push({ role: 'identity', path });
    else if (existing.role === 'style') existing.role = 'style-and-identity';
  }
  return refs;
}

type ReferenceExists = (rootRelativePath: string) => boolean;
const referenceExists: ReferenceExists = (path) => existsSync(resolve(ROOT, path));
export interface ArtPlan {
  action: 'skip' | 'edit' | 'generate';
  references: ArtReference[];
  identity: 'preserved' | 'first-design' | 'not-required' | 'not-checked';
  notes: string[];
}

/** 선택한 실제 작업만 검사한다. 최초 제작의 자기 참조와 이미 존재하는 타인의 동일성 참조를 구별한다. */
export function planArtAsset(a: ArtAsset, options: Pick<ArtOptions, 'force' | 'edit'>, exists: ReferenceExists = referenceExists): ArtPlan {
  const own = `public/${a.out}`;
  const hasOutput = exists(own);
  if (options.edit && !hasOutput) throw new Error(`부분 편집할 기존 파일이 없습니다: ${a.id}`);
  if (hasOutput && !options.force && !options.edit) return { action: 'skip', references: artReferences(a), identity: 'not-checked', notes: [] };

  const notes: string[] = [];
  const character = /^(?:full|card)-(.+)$/.exec(a.id);
  const characterPaths = character ? [`public/art/full/${character[1]}.webp`, `public/art/card/${character[1]}.webp`] : [];
  const newCharacter = characterPaths.length > 0 && characterPaths.every((path) => !exists(path));
  let style = ANCHOR[a.kind];
  if (!exists(style)) {
    // 최초 기준 그림 자체를 만들 때만 기존 저장소의 별도 스타일 원본으로 부트스트랩한다.
    if (style !== own && !(newCharacter && characterPaths.includes(style))) throw new Error(`화풍 참조 파일이 없습니다: ${a.id} → ${style}`);
    const fallback = ['bg', 'battle', 'banner', 'foe', 'item'].includes(a.kind) ? 'art/style-scene.png' : 'art/style-heroine.png';
    if (!exists(fallback)) throw new Error(`최초 제작용 화풍 참조 파일이 없습니다: ${a.id} → ${fallback}`);
    notes.push(`최초 제작: 자기 화풍 참조 ${style} 대신 ${fallback} 사용`);
    style = fallback;
  }
  const refs: ArtReference[] = options.edit ? [{ role: 'edit', path: own }] : [];
  refs.push({ role: 'style', path: style });
  let hasIdentity = !!options.edit;
  const addIdentity = (path: string) => {
    const existing = refs.find((ref) => ref.path === path);
    if (!existing) refs.push({ role: 'identity', path });
    else if (existing.role === 'style') existing.role = 'style-and-identity';
    hasIdentity = true;
  };
  for (const path of a.identity ?? []) {
    if (exists(path)) addIdentity(path);
    else if (path === own) notes.push(`최초 제작: 아직 없는 자기 동일성 참조 ${path} 제외`);
    else if (characterPaths.includes(path) && hasOutput) {
      addIdentity(own);
      notes.push(`대체 동일성 참조: ${path} 없음, 기존 출력 ${own} 보존`);
    } else if (newCharacter && characterPaths.includes(path)) notes.push(`최초 식객 디자인: 카드와 전신이 모두 없어 ${path}의 동일성은 새로 확정`);
    else throw new Error(`동일성 참조 파일이 없습니다: ${a.id} → ${path}`);
  }
  const identity = hasIdentity ? 'preserved' : (a.identity?.length ? 'first-design' : 'not-required');
  return { action: options.edit ? 'edit' : 'generate', references: refs, identity, notes };
}

export function artInstructions(a: ArtAsset, refs: ArtReference[], edit?: string, firstDesign = false): string {
  return [
    `Use your built-in image generation tool to ${edit ? 'EDIT the first attached image' : 'create exactly one image'} (${SIZE[ASPECT[a.kind]]}).`,
    ...refs.map((ref, i) => `Reference ${i + 1} (${basename(ref.path)}): ${ref.role === 'edit' ? 'the exact existing image to edit; preserve everything except the requested changes' : ref.role === 'style' ? 'art style only: brushwork, shading, edge treatment and palette; do not copy a different character from it' : ref.role === 'style-and-identity' ? 'both the art style AND this character identity: preserve face, hair, signature costume, colors and accessories' : 'identity: preserve this character or prop, including face, hair, signature costume, colors and accessories'}.`),
    firstDesign ? 'FIRST DESIGN: No existing identity image is available for this new asset. The attached reference supplies STYLE ONLY. Establish a new identity from the subject specification; do not copy the style-reference character.' : '',
    edit
      ? `PARTIAL EDIT ONLY: ${edit}\nKeep all unmentioned faces, anatomy, pose, outfit, props, composition, lighting and background unchanged. Preserve existing transparency. Do not reinterpret or redraw the whole design.`
      : `PROMPT:\n${artPrompt(a)}`,
    `Output must use ${ART_SPECS[a.kind].transparent ? 'a real transparent alpha background, not a checkerboard or painted solid background' : 'an opaque background'}.`,
    `Save exactly one generated image as out.png in the current working directory. Do not write code or create other files. Source specification: ${a.source ?? 'src/data/art.ts'}.`,
  ].join('\n\n');
}

export function validateArtManifest(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const a of ART_ASSETS) {
    if (ids.has(a.id)) errors.push(`중복 ID: ${a.id}`);
    if (paths.has(a.out)) errors.push(`중복 출력: ${a.out}`);
    ids.add(a.id); paths.add(a.out);
    if (!a.subject?.trim()) errors.push(`설정이 비었습니다: ${a.id}`);
    if (!a.out.startsWith('art/') || a.out.includes('..')) errors.push(`출력 경로가 이상합니다: ${a.id}`);
    const spec = ART_SPECS[a.kind];
    const ratio = spec.width / spec.height;
    if (Math.abs(ratio - (spec.aspect === 'portrait' ? 2 / 3 : spec.aspect === 'landscape' ? 3 / 2 : 1)) > .001) errors.push(`구도/해상도 불일치: ${a.id}`);
    for (const ref of artReferences(a)) if (!ref.path || ref.path.startsWith('/') || ref.path.split('/').includes('..')) errors.push(`참조 경로가 이상합니다: ${a.id} → ${ref.path}`);
  }
  return errors;
}

const magick = (...args: string[]) => execFileSync('convert', args, { encoding: 'utf8' });

/** 잘못된 가로 그림·가짜 투명 배경은 덮어쓰기 전에 거절한다. 승인된 크기로만 납품한다. */
function finish(a: ArtAsset, png: string, out: string) {
  const spec = ART_SPECS[a.kind];
  const [width, height] = magick(png, '-format', '%w %h', 'info:').trim().split(/\s+/).map(Number);
  if (Math.abs((width / height) / (spec.width / spec.height) - 1) > .015) throw new Error(`생성 구도가 다릅니다: ${width}×${height}, 필요 ${spec.width}×${spec.height}`);
  if (spec.transparent && magick(png, '-format', '%[opaque]', 'info:').trim().toLowerCase() !== 'false') throw new Error('투명 배경이 아닙니다. 실제 alpha가 있는 PNG가 필요합니다.');
  mkdirSync(dirname(out), { recursive: true });
  const pending = join(dirname(out), `.${basename(out)}-${process.pid}.webp`);
  try {
    magick(png, '-resize', `${spec.width}x${spec.height}!`, '-define', 'webp:alpha-quality=100', '-quality', '82', pending);
    renameSync(pending, out);
  } finally {
    rmSync(pending, { force: true });
  }
}

function draw(a: ArtAsset, options: ArtOptions, plan: ArtPlan) {
  const out = resolve(ROOT, 'public', a.out);
  const refs = plan.references;
  for (const ref of refs) if (!existsSync(resolve(ROOT, ref.path))) throw new Error(`참조 파일이 없습니다: ${ref.path}`);
  const work = mkdtempSync(join(tmpdir(), `art-${a.id}-`));
  try {
    execFileSync(process.env.CODEX_BIN ?? 'codex', [
      'exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', work,
      ...refs.flatMap((ref) => ['-i', resolve(ROOT, ref.path)]), '--', artInstructions(a, refs, options.edit, plan.identity === 'first-design'),
    ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 10 * 60_000, maxBuffer: 64 * 1024 * 1024 });
    const png = join(work, 'out.png');
    if (!existsSync(png)) throw new Error('Codex가 out.png를 만들지 않았습니다.');
    finish(a, png, out);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export function main(args = process.argv.slice(2), io: { exists?: ReferenceExists; log?: (text: string) => void } = {}) {
  const options = parseArtOptions(args);
  const errors = validateArtManifest();
  if (errors.length) throw new Error(errors.join('\n'));
  const selected = ART_ASSETS.filter((a) => !options.ids.length || options.ids.includes(a.id));
  const log = io.log ?? console.log;
  let failed = 0;
  for (const a of selected) {
    const plan = planArtAsset(a, options, io.exists ?? referenceExists);
    if (options.dryRun) {
      const spec = ART_SPECS[a.kind];
      log(JSON.stringify({ id: a.id, ...plan, out: a.out, size: `${spec.width}x${spec.height}`, transparent: spec.transparent, source: a.source ?? 'src/data/art.ts' }));
      continue;
    }
    if (plan.action === 'skip') continue;
    for (const note of plan.notes) log(note);
    log(`그리는 중: ${a.id}${plan.identity === 'first-design' ? ' (최초 디자인, 화풍만 참조)' : ''}`);
    try { draw(a, options, plan); } catch (err) {
      failed++;
      console.error(`실패: ${a.id} — ${(err as Error).message.split('\n')[0]}`);
    }
  }
  if (!options.dryRun) log(failed ? `실패 ${failed}장. 기존 출력은 보존했습니다.` : '끝.');
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}
