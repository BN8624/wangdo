import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { newGame } from '../core/engine';
import { EPISODES } from '../data/story';
import { YOKAI_BY_ID } from '../data/yokai';
import { NovelFrame, StoryView } from './StoryView';

const noop = () => {};
describe('이야기 화면', () => {
  it('화 목록에 열림 조건과 다시 보기 상태를 표시한다', () => {
    const view = newGame(0);
    view.story.done.push(EPISODES[0].id);
    const html = renderToStaticMarkup(<StoryView view={view} open={noop} onClose={noop} />);
    expect(html).toContain('본 이야기 · 다시 보기');
    expect(html).toContain('disabled');
    expect(html).toContain(EPISODES[0].title);
  });
  it('첫 실행은 소개 창 대신 첫 화를 표시하고 중간에 닫지 않는다', () => {
    const html = renderToStaticMarkup(<StoryView view={newGame(0)} episode={EPISODES[0].id} open={noop} onClose={noop} />);
    expect(html).toContain(EPISODES[0].title);
    expect(html).toContain(EPISODES[0].scenes[0].lines[0].text);
    expect(html).not.toContain('vn-close');
  });
  it.each([
    ['me', '나'], ['npc:송 대감', '송 대감'], ['baekseol', YOKAI_BY_ID.baekseol.name],
  ])('%s 화자의 이름표를 표시한다', (who, name) => {
    const html = renderToStaticMarkup(<NovelFrame title="이야기" bg="art/bg/night.webp" cast={['baekseol']} line={{who,text:'대사'}} onNext={noop} />);
    expect(html).toContain(`class="vn-name">${name}`);
    expect(html).toContain('art/full/baekseol.webp');
  });
  it('지문에는 이름표를 표시하지 않는다', () => {
    const html = renderToStaticMarkup(<NovelFrame title="이야기" bg="art/bg/night.webp" cast={[]} line={{who:'narration',text:'밤이 깊었다.'}} onNext={noop} />);
    expect(html).not.toContain('vn-name');
    expect(html).toContain('밤이 깊었다.');
  });
});
