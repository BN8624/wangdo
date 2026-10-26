// 데이터끼리 맞물리는 규칙. 수치를 바꾸다 게임이 막히는 일을 막는다.
import { describe, expect, it } from 'vitest';
import { simulateRun } from '../src/core/sim';
import { rankFame } from '../src/core/engine';
import { NODES, NODE_BY_ID, REGIONS } from '../src/data/world';
import { ITEM_BY_ID } from '../src/data/items';
import { ART_ASSETS } from '../src/data/art';
import { CHAPTERS, STAGES_PER_CHAPTER } from '../src/data/stages';
import { STAGES, stageWaves } from '../src/core/campaign';
import { ELEMENT, roleOf } from '../src/data/roster';
import { SKILLS } from '../src/data/skills';
import { WISHES } from '../src/data/wishes';
import { EPISODES, EPISODE_BY_ID } from '../src/data/story';
import { episodeRecruits, validateEpisode } from '../src/core/story';
import { STARTERS, YOKAI, YOKAI_BY_ID } from '../src/data/yokai';

describe('데이터 무결성', () => {
  it('id가 겹치지 않는다', () => {
    expect(new Set(YOKAI.map((y) => y.id)).size).toBe(YOKAI.length);
    expect(new Set(WISHES.map((w) => w.id)).size).toBe(WISHES.length);
  });

  it('이야기로 합류하는 식객이 모두 있고 겹치지 않으며, 모든 식객이 뽑기·이야기로 얻을 수 있다', () => {
    const byStory = EPISODES.flatMap(episodeRecruits);
    for (const id of byStory) expect(YOKAI_BY_ID[id], id).toBeDefined();
    expect(new Set(byStory).size).toBe(byStory.length);
    for (const g of [1, 2, 3]) expect(YOKAI.some((y) => y.grade === g), `등급 ${g}`).toBe(true);
    expect(STARTERS.length).toBeGreaterThan(0);
  });

  it('식객마다 속성·역할·고유 기술이 있다', () => {
    for (const y of YOKAI) {
      expect(ELEMENT[y.id], y.id).toBeDefined();
      expect(SKILLS[y.id], y.id).toBeDefined();
      expect(roleOf(y.id), y.id).toBeTruthy();
    }
  });

  it('스테이지마다 적 웨이브가 있고, 장마다 마지막은 대장이다', () => {
    for (const st of STAGES) {
      const waves = stageWaves(st);
      expect(waves.length, st.label).toBeGreaterThan(0);
      for (const w of waves) expect(w.length, st.label).toBeGreaterThan(0);
      if (st.boss && st.chapter > 0) expect(waves[waves.length - 1].some((u) => u.boss), st.label).toBe(true);
    }
  });

  it('지도: 길의 모든 칸이 있고, 조건이 가리키는 화·노드·식객·장비가 모두 있다', () => {
    for (const r of REGIONS)
      for (const p of r.path) expect(p.startsWith('ep:') ? EPISODE_BY_ID[p.slice(3)] : NODE_BY_ID[p], `${r.id}:${p}`).toBeDefined();
    const onPath = new Set(REGIONS.flatMap((r) => r.path));
    for (const n of NODES) {
      expect(onPath.has(n.id), `${n.id}는 지도 위에 없다`).toBe(true);
      if (n.req.ep) expect(EPISODE_BY_ID[n.req.ep], n.id).toBeDefined();
      if (n.req.node) expect(NODE_BY_ID[n.req.node], n.id).toBeDefined();
      if (n.req.owned) expect(YOKAI_BY_ID[n.req.owned], n.id).toBeDefined();
      if (n.kind === 'town') for (const i of n.shop) expect(ITEM_BY_ID[i]?.price, `${n.id}:${i}`).toBeGreaterThan(0);
      if (n.kind === 'dungeon') {
        if (n.boss.drop) expect(ITEM_BY_ID[n.boss.drop], n.id).toBeDefined();
        for (const f of n.floors) if (f.chest?.item) expect(ITEM_BY_ID[f.chest.item], `${n.id}:${f.name}`).toBeDefined();
      }
      if (n.kind === 'quest' && n.reward) expect(ITEM_BY_ID[n.reward], n.id).toBeDefined();
    }
    for (const ep of EPISODES) if (ep.unlock.node) expect(NODE_BY_ID[ep.unlock.node], ep.id).toBeDefined();
  });

  it('모든 이야기 화가 형식 검사를 통과하고, 앞 화가 실제로 있다', () => {
    const ids = new Set(YOKAI.map((y) => y.id));
    for (const ep of EPISODES) {
      expect(validateEpisode(ep, ids), ep.id).toEqual([]);
      if (ep.unlock.after) expect(EPISODE_BY_ID[ep.unlock.after], ep.id).toBeDefined();
    }
  });

  it('모든 그림에 프롬프트가 있고 저장 경로가 겹치지 않는다', () => {
    for (const a of ART_ASSETS) expect(a.subject, a.id).toBeTruthy();
    expect(new Set(ART_ASSETS.map((a) => a.out)).size).toBe(ART_ASSETS.length);
  });

  it('장마다 대장 앞 말썽꾼 이름이 다 있다', () => {
    for (const c of CHAPTERS) expect(c.foes.length).toBe(STAGES_PER_CHAPTER - 1);
  });

  it('관직에 필요한 명성은 점점 커진다', () => {
    for (let r = 1; r < 20; r++) expect(rankFame(r + 1)).toBeGreaterThan(rankFame(r));
  });

});

describe('진행 속도', { timeout: 240_000 }, () => {
  it('쉬지 않고 하면 모든 장을 막힘 없이 몇 시간에 걸쳐 깨고, 막힐 때 수련장에서 키운다', () => {
    const r = simulateRun();
    expect(r.stuck).toBeNull();
    for (const ep of EPISODES) expect(r.chapterAt[ep.id], ep.id).toBeDefined();
    expect(r.minutes).toBeGreaterThan(4 * 60);
    expect(r.minutes).toBeLessThan(16 * 60);
    expect(r.battles.train).toBeGreaterThan(0);
    expect(r.pulls).toBeGreaterThan(50);
  });

  it('모집을 한 번도 하지 않아도(옥은 기억 조각으로) 모든 장을 깨고, 열여섯 식객을 모두 만난다', () => {
    const r = simulateRun(40 * 60, 7, { gacha: false });
    expect(r.stuck).toBeNull();
    expect(r.pulls).toBe(0);
    for (const ep of EPISODES) expect(r.chapterAt[ep.id], ep.id).toBeDefined();
    expect(r.minutes).toBeLessThan(16 * 60);
    expect(Object.keys(r.final.yokai).sort()).toEqual(YOKAI.map((y) => y.id).sort());
  });
});
