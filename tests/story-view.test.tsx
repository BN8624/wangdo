// 화면 조각을 정적으로 그려 본다: 컷신·이야기 다시 보기·편성·출정 목록·모집·식객
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CHAPTER_COUNT, STAGES, chapterStages, stagePower, stageWaves } from '../src/core/campaign';
import { newGame } from '../src/core/engine';
import { EPISODES } from '../src/data/story';
import { YOKAI_BY_ID } from '../src/data/yokai';
import { CampaignView } from '../src/ui/CampaignView';
import { GachaView } from '../src/ui/GachaView';
import { Formation } from '../src/ui/StageFlow';
import { CutscenePlayer, NovelFrame, StoryList, chapterParts } from '../src/ui/StoryView';
import { YokaiSheet, YokaiView } from '../src/ui/YokaiView';

const noop = () => {};

describe('컷신', () => {
  it('장마다 앞뒤 컷신을 이으면 그 화의 장면과 전투 전후 대화가 빠짐없이 한 번씩 나온다', () => {
    for (let c = 0; c < CHAPTER_COUNT; c++) {
      const ep = EPISODES[c];
      const scenes: number[] = [];
      let lines = 0;
      for (const { stage, order } of chapterParts(c)) {
        const cut = order === 'pre' ? stage.pre : stage.post;
        if (cut.scenes) for (let i = cut.scenes[0]; i <= cut.scenes[1]; i++) scenes.push(i);
        lines += cut.lines?.length ?? 0;
      }
      expect(scenes, ep.id).toEqual(ep.scenes.map((_, i) => i));
      const want = (ep.battles ?? []).reduce((a, b) => a + (b.intro?.length ?? 0) + (b.outro?.length ?? 0), 0);
      expect(lines, ep.id).toBe(want);
    }
  });

  it('1-1 앞 컷신은 첫 화의 첫 대사로 시작하고 건너뛸 수 있다', () => {
    const st = STAGES[0];
    const html = renderToStaticMarkup(<CutscenePlayer view={newGame(0)} parts={[{ stage: st, order: 'pre' }]} apply onDone={noop} />);
    expect(html).toContain(EPISODES[0].scenes[0].lines[0].text);
    expect(html).toContain('건너뛰기');
  });

  it('대장 스테이지 뒤 컷신은 전투 뒤 대화부터 시작한다', () => {
    const boss = chapterStages(0).find((st) => st.boss)!;
    expect(boss.post.lines?.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(<CutscenePlayer view={newGame(0)} parts={[{ stage: boss, order: 'post' }]} apply onDone={noop} />);
    expect(html).toContain(boss.post.lines![0].text);
  });

  it.each([
    ['me', '나'],
    ['npc:송 대감', '송 대감'],
    ['baekseol', YOKAI_BY_ID.baekseol.name],
  ])('%s 화자의 이름표를 표시한다', (who, name) => {
    const html = renderToStaticMarkup(<NovelFrame title="이야기" bg="art/bg/night.webp" cast={['baekseol']} line={{ who, text: '대사' }} onNext={noop} />);
    expect(html).toContain(`class="vn-name">${name}`);
    expect(html).toContain('art/full/baekseol.webp');
  });

  it('지문에는 이름표를 표시하지 않는다', () => {
    const html = renderToStaticMarkup(<NovelFrame title="이야기" bg="art/bg/night.webp" cast={[]} line={{ who: 'narration', text: '밤이 깊었다.' }} onNext={noop} />);
    expect(html).not.toContain('vn-name');
    expect(html).toContain('밤이 깊었다.');
  });

  it('이야기 다시 보기는 끝까지 깬 장만 열린다', () => {
    const view = newGame(0);
    view.story.done.push(EPISODES[0].id);
    const html = renderToStaticMarkup(<StoryList view={view} onClose={noop} />);
    expect(html).toContain(EPISODES[0].title);
    expect(html).toContain('2장을 끝까지 깨면 열려요');
    expect(html).not.toContain(EPISODES[1].title);
  });
});

describe('출정 화면', () => {
  it('출정 목록은 장의 스테이지 여섯을 보여 주고, 아직 못 가는 스테이지는 막는다', () => {
    const html = renderToStaticMarkup(<CampaignView view={newGame(0)} open={noop} />);
    for (const st of chapterStages(0)) expect(html).toContain(`data-guide="stage-${st.id}"`);
    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(5);
    expect(html).toContain('cp-node now');
  });

  it('편성 화면은 다섯 칸·권장 전투력·자동 편성·출동을 보여 준다', () => {
    const st = STAGES[1];
    const html = renderToStaticMarkup(<Formation view={newGame(0)} kicker={st.label} title="시험" bg={st.bg} waves={stageWaves(st)} need={stagePower(st)} reward={null} onGo={noop} onClose={noop} />);
    expect(html.match(/class="fm-slot[ "]/g)).toHaveLength(5);
    expect(html).toContain('data-guide="auto-team"');
    expect(html).toContain('data-guide="go"');
    expect(html).toContain('권장');
  });
});

describe('모집·식객 화면', () => {
  it('모집 화면은 열 번 모집과 첫 열 번 SSR 확정을 알린다', () => {
    const html = renderToStaticMarkup(<GachaView view={newGame(0)} />);
    expect(html).toContain('data-guide="pull10"');
    expect(html).toContain('첫 열 번 모집은 새 SSR 하나 확정');
  });

  it('식객 목록은 가진 식객을 먼저, 없는 식객은 만나는 길과 함께 보여 준다', () => {
    const html = renderToStaticMarkup(<YokaiView view={newGame(0)} onOpen={noop} />);
    expect(html.indexOf(YOKAI_BY_ID.baekseol.name)).toBeLessThan(html.indexOf('yc locked'));
    expect(html).toContain('2장 합류');
  });

  it('식객 창은 레벨업·별 올리기·기술을 보여 준다', () => {
    const html = renderToStaticMarkup(<YokaiSheet view={newGame(0)} id="baekseol" open={noop} onClose={noop} />);
    expect(html).toContain('data-guide="levelup"');
    expect(html).toContain('별 올리기');
    expect(html).toContain('고유 기술');
  });
});
