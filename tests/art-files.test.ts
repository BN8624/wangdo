// 게임이 가리키는 그림 파일이 모두 있는지: 출시 전에 빠진 그림을 잡는다.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ART, foeArtPath } from '../src/data/art';
import { BGS, ITEMS, SCENES } from '../src/core/story';
import { EPISODES } from '../src/data/story';
import { CHAPTERS, STAGES_PER_CHAPTER } from '../src/data/stages';
import { stageInfo } from '../src/core/engine';
import { YOKAI } from '../src/data/yokai';

const has = (path: string) => existsSync(`public/${path}`);

describe('그림 파일', () => {
  it('식객마다 카드·전신·인연 장면 그림이 있다', () => {
    const missing = YOKAI.flatMap((y) => [ART.card(y.id), ART.full(y.id), ART.cg(y.id, 3), ART.cg(y.id, 5)]).filter((p) => !has(p));
    expect(missing).toEqual([]);
  });

  it('이야기가 쓰는 배경·소품·이벤트 그림이 있다', () => {
    const used = new Set<string>();
    for (const ep of EPISODES)
      for (const sc of ep.scenes) {
        used.add(ART.bg(sc.bg));
        for (const l of sc.lines) {
          if (l.cg) used.add(ART.scene(l.cg));
          if (l.img) used.add(ART.item(l.img));
        }
      }
    const listed = [...BGS.map(ART.bg), ...ITEMS.map(ART.item), ...SCENES.map(ART.scene)];
    expect([...new Set([...used, ...listed])].filter((p) => !has(p))).toEqual([]);
  });

  it('토벌의 배경·상대 그림이 있다', () => {
    const missing: string[] = [];
    for (const c of CHAPTERS) if (!has(ART.battle(c.id))) missing.push(ART.battle(c.id));
    for (let i = 0; i < CHAPTERS.length * STAGES_PER_CHAPTER; i++) {
      const p = foeArtPath(stageInfo(i)!);
      if (!has(p)) missing.push(p);
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
