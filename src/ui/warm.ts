// 곧 쓸 그림을 한가할 때 미리 받아 둔다. 처음 보는 전투나 이야기에서 그림이 늦게 뜨지 않게 한다.
import { nextStage, stageWaves } from '../core/campaign';
import type { GameState } from '../core/types';
import { ART } from '../data/art';

const done = new Set<string>();

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };

/** 한가할 때 fn을 부른다. 되돌려 주는 함수로 취소한다(한가 콜백과 타이머는 취소 방법이 다르다) */
function idle(fn: () => void): () => void {
  const w = window as IdleWindow;
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const h = w.requestIdleCallback(fn, { timeout: 4000 });
    return () => w.cancelIdleCallback!(h);
  }
  const t = window.setTimeout(fn, 1500);
  return () => clearTimeout(t);
}

/** 미리 받을 그림 목록: 데리고 있는 식객의 카드·전신, 다음 스테이지의 배경·상대 */
export function warmList(s: GameState): string[] {
  const list = Object.keys(s.yokai).flatMap((id) => [ART.card(id), ART.full(id)]);
  const st = nextStage(s);
  if (st) list.push(ART.battle(st.bg), ...stageWaves(st).flat().map((u) => u.art));
  return [...new Set(list)].filter((u) => !done.has(u));
}

/** 하나씩 천천히 받는다. 화면을 떠나면 멈춘다 */
export function warmArt(s: GameState): () => void {
  const queue = warmList(s);
  let stopped = false;
  let cancel = () => {};
  const next = () => {
    const url = queue.shift();
    if (!url || stopped) return;
    done.add(url);
    fetch(url, { priority: 'low' } as RequestInit)
      .catch(() => undefined)
      .finally(() => {
        if (!stopped) cancel = idle(next);
      });
  };
  const start = window.setTimeout(() => (cancel = idle(next)), 3000);
  return () => {
    stopped = true;
    clearTimeout(start);
    cancel();
  };
}
