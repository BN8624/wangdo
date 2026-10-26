import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ART, ART_ASSETS, ART_SPECS, artPrompt } from '../src/data/art';
import { artInstructions, artReferences, main, parseArtOptions, planArtAsset, validateArtManifest } from '../scripts/gen-art';

const asset = (id: string) => {
  const found = ART_ASSETS.find((a) => a.id === id);
  if (!found) throw new Error(`테스트 대상이 없습니다: ${id}`);
  return found;
};

describe('아트 제작 명세', () => {
  it('배포 그림을 빠짐없이 관리하고 제작 명세 구조가 유효하다', () => {
    const managed = new Set(ART_ASSETS.map((a) => a.out));
    const files = readdirSync('public/art', { recursive: true }).map(String).filter((p) => p.endsWith('.webp'));
    expect(files.filter((p) => !managed.has(`art/${p}`))).toEqual([]);
    expect(validateArtManifest()).toEqual([]);
  });

  it('인연 CG는 세로 구도와 기존 900×1350 해상도를 함께 유지한다', () => {
    expect(ART_SPECS.cg).toEqual({ aspect: 'portrait', width: 900, height: 1350, transparent: false });
    expect(artPrompt(asset('cg-sodam-3'))).toContain('Tall vertical 2:3');
    expect(artPrompt(asset('cg-sodam-3'))).not.toContain('Wide romantic');
  });

  it('인연 그림은 식객별 실제 대본의 장소와 행동을 제작 지시에 포함한다', () => {
    expect(asset('cg-yunseul-3').subject).toContain('발끝을 물에 담갔다');
    expect(asset('cg-oryeon-5').subject).toContain('오늘은 셈하지 않을 거예요');
    expect(asset('cg-danhui-3').subject).toContain('감투');
  });

  it('화풍과 식객 동일성을 별도 참조하고 이벤트는 해당 등장인물을 참조한다', () => {
    expect(artReferences(asset('cg-sodam-3'))).toEqual([
      { role: 'style', path: 'public/art/card/baekseol.webp' },
      { role: 'identity', path: 'public/art/card/sodam.webp' },
    ]);
    expect(artReferences(asset('scene-s3e3-loom'))).toContainEqual({ role: 'identity', path: 'public/art/card/yunseul.webp' });
  });

  it('전장 전신은 초상과 별도 경로이며 기존 상대를 동일성 참조로 쓴다', () => {
    const full = asset('enemy-boss-ferry');
    expect(full.out).toBe(ART.enemy('boss', 'ferry'));
    expect(full.out).not.toBe(ART.boss('ferry'));
    expect(full.identity).toContain(`public/${ART.boss('ferry')}`);
    expect(artPrompt(full)).toContain('both feet');
    expect(ART_SPECS.enemy.transparent).toBe(true);
  });

  it('부분 편집에서는 기존 그림을 첫 참조로 주고 전체 재설계 프롬프트를 주지 않는다', () => {
    const a = asset('card-sodam');
    const refs = artReferences(a, true);
    expect(refs[0]).toEqual({ role: 'edit', path: `public/${a.out}` });
    const instruction = artInstructions(a, refs, '배경의 등불만 없애기');
    expect(instruction).toContain('배경의 등불만 없애기');
    expect(instruction).toContain('Keep all unmentioned');
    expect(instruction).not.toContain(a.subject);
  });

  it('잘못된 대상과 옵션은 조용히 성공하지 않고, 부분 편집은 명시한 대상만 바꾼다', () => {
    expect(() => parseArtOptions(['cg-no-such-character-3', '--dry-run'])).toThrow('알 수 없는 그림 ID');
    expect(() => parseArtOptions(['--froce'])).toThrow('알 수 없는 옵션');
    expect(() => parseArtOptions(['--edit', '배경만 변경'])).toThrow('대상 asset-id');
    expect(parseArtOptions(['card-sodam', '--edit', '배경만 변경', '--dry-run'])).toEqual({ ids: ['card-sodam'], force: true, edit: '배경만 변경', dryRun: true });
  });

  it.each(['boss-backhill', 'grunt-backhill', 'item-shell'])('첫 %s 생성은 아직 없는 자기 출력을 참조로 요구하지 않는다', (id) => {
    const a = asset(id);
    const own = `public/${a.out}`;
    const plan = planArtAsset(a, { force: false }, (path) => path !== own);
    expect(plan.action).toBe('generate');
    expect(plan.identity).toBe('first-design');
    expect(plan.references.some((ref) => ref.path === own)).toBe(false);
  });

  it('첫 기준 초상 자체를 만들 때는 별도 화풍 원본으로 부트스트랩한다', () => {
    const a = asset('boss-ferry');
    const own = `public/${a.out}`;
    const plan = planArtAsset(a, { force: false }, (path) => path !== own);
    expect(plan.references).toContainEqual({ role: 'style', path: 'art/style-heroine.png' });
    expect(plan.identity).toBe('first-design');
    expect(plan.notes.join(' ')).toContain('자기 화풍 참조');
  });

  it('카드와 전신이 모두 없는 새 식객은 최초 디자인임을 명시한다', () => {
    const a = asset('full-sodam');
    const missing = new Set(['public/art/full/sodam.webp', 'public/art/card/sodam.webp']);
    const plan = planArtAsset(a, { force: false }, (path) => !missing.has(path));
    expect(plan.identity).toBe('first-design');
    expect(plan.references).toHaveLength(1);
    expect(artInstructions(a, plan.references, undefined, plan.identity === 'first-design')).toContain('FIRST DESIGN: No existing identity image');
    expect(plan.notes.join(' ')).toContain('카드와 전신이 모두 없어');
  });

  it('다른 형식이 없어도 현재 식객 그림이 남아 있으면 그 동일성을 보존한다', () => {
    const a = asset('full-sodam');
    const plan = planArtAsset(a, { force: true }, (path) => path !== 'public/art/card/sodam.webp');
    expect(plan.identity).toBe('preserved');
    expect(plan.references).toContainEqual({ role: 'identity', path: 'public/art/full/sodam.webp' });
  });

  it('CG의 기존 식객 참조가 사라졌으면 최초 디자인으로 조용히 바꾸지 않는다', () => {
    expect(() => planArtAsset(asset('cg-sodam-3'), { force: true }, (path) => path !== 'public/art/card/sodam.webp')).toThrow('동일성 참조 파일이 없습니다');
  });

  it('선택한 배경은 무관한 식객·소품 파일이 없어도 dry-run할 수 있다', () => {
    const output: string[] = [];
    expect(() => main(['bg-village', '--dry-run'], { exists: (path) => path === 'art/style-scene.png', log: (line) => output.push(line) })).not.toThrow();
    expect(JSON.parse(output[0])).toMatchObject({ id: 'bg-village', action: 'generate', identity: 'not-required' });
  });

  it('이미 있는 선택 그림을 건너뛸 때는 누락된 참조를 요구하지 않지만 부분 편집 원본은 필수다', () => {
    const a = asset('card-sodam');
    expect(planArtAsset(a, { force: false }, (path) => path === `public/${a.out}`).action).toBe('skip');
    expect(() => planArtAsset(a, { force: true, edit: '배경만 정리' }, () => false)).toThrow('부분 편집할 기존 파일이 없습니다');
  });
});
