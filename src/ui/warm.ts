// 곧 쓸 그림을 한가할 때 미리 받아 둔다. 처음 보는 토벌이나 이야기에서 그림이 늦게 뜨지 않게 한다.
import { stageInfo } from '../core/engine';
import type { GameState } from '../core/types';
import { ART, foeArtPath } from '../data/art';

const done = new Set<string>();

function idle(fn: () => void): number {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  return w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 4000 }) : window.setTimeout(fn, 1500);
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
  let handle = 0;
  const next = () => {
    const url = queue.shift();
    if (!url || stopped) return;
    done.add(url);
    fetch(url, { priority: 'low' } as RequestInit)
      .catch(() => undefined)
      .finally(() => {
        if (!stopped) handle = idle(next);
      });
  };
  const start = window.setTimeout(() => (handle = idle(next)), 3000);
  return () => {
    stopped = true;
    clearTimeout(start);
    clearTimeout(handle);
  };
}
