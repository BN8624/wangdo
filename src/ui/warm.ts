// 곧 쓸 그림을 한가할 때 미리 받아 둔다. 처음 보는 토벌이나 이야기에서 그림이 늦게 뜨지 않게 한다.
import { stageInfo } from '../core/engine';
import type { GameState } from '../core/types';
import { ART, foeArtPath } from '../data/art';

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

/** 미리 받을 그림 목록: 데리고 있는 식객의 전신, 지금과 다음 토벌의 배경·상대 */
export function warmList(s: GameState): string[] {
  const list = Object.keys(s.yokai).map((id) => ART.full(id));
  for (const i of [s.stage.index, s.stage.index + 1]) {
    const info = stageInfo(i);
    if (!info) continue;
    list.push(ART.battle(info.chapter.id), foeArtPath(info));
  }
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
