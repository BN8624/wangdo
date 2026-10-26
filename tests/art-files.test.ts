// 게임이 가리키는 그림 파일이 모두 있는지: 출시 전에 빠진 그림을 잡는다.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ART } from '../src/data/art';
import { BGS, ITEMS, SCENES } from '../src/core/story';
import { EPISODES } from '../src/data/story';
import { STAGES, stageWaves } from '../src/core/campaign';
import { trainWaves, TRAIN_LEVELS } from '../src/core/idle';
import { YOKAI } from '../src/data/yokai';
import { NODES } from '../src/data/world';

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

  it('캠페인·수련장의 전투 배경과 적 그림이 있다', () => {
    const missing: string[] = [];
    for (const st of STAGES) {
      if (!has(ART.battle(st.bg))) missing.push(ART.battle(st.bg));
      for (const u of stageWaves(st).flat()) if (!has(u.art)) missing.push(u.art);
    }
    for (let t = 0; t < TRAIN_LEVELS.length; t++) for (const u of trainWaves(t).flat()) if (!has(u.art)) missing.push(u.art);
    expect([...new Set(missing)]).toEqual([]);
  });

  it('모험의 전투 배경·상대·장면 배경 그림이 있다', () => {
    const used = new Set<string>([ART.bg('map')]);
    for (const n of NODES) {
      if (n.kind === 'field') {
        used.add(ART.battle(n.bg));
        for (const f of n.foes) used.add(`art/${f.art}.webp`);
      }
      if (n.kind === 'dungeon') {
        used.add(ART.battle(n.bg));
        for (const f of [...n.pool, n.boss]) used.add(`art/${f.art}.webp`);
      }
      if (n.kind === 'quest') {
        used.add(ART.bg(n.bg));
        for (const f of n.battles) used.add(`art/${f.art}.webp`);
      }
    }
    expect([...used].filter((p) => !has(p))).toEqual([]);
  });
});
