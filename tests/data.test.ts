// 데이터끼리 맞물리는 규칙. 수치를 바꾸다 게임이 막히는 일을 막는다.
import { describe, expect, it } from 'vitest';
import { simulateRun } from '../src/core/sim';
import { NODES, NODE_BY_ID, REGIONS } from '../src/data/world';
import { ITEM_BY_ID } from '../src/data/items';
import { ART_ASSETS } from '../src/data/art';
import { RANKS } from '../src/data/ranks';
import { CHAPTERS, STAGES_PER_CHAPTER } from '../src/data/stages';
import { WISHES } from '../src/data/wishes';
import { EPISODES, EPISODE_BY_ID } from '../src/data/story';
import { episodeRecruits, validateEpisode } from '../src/core/story';
import { STARTERS, YOKAI, YOKAI_BY_ID } from '../src/data/yokai';

describe('데이터 무결성', () => {
  it('id가 겹치지 않는다', () => {
    expect(new Set(YOKAI.map((y) => y.id)).size).toBe(YOKAI.length);
    expect(new Set(WISHES.map((w) => w.id)).size).toBe(WISHES.length);
  });

  it('이야기·만남·관직으로 합류하는 식객이 모두 있고, 겹쳐서 합류하지 않으며, 모두 합류할 길이 있다', () => {
    const byRank = RANKS.flatMap((r) => (r.recruit ? [r.recruit] : []));
    const byStory = EPISODES.flatMap(episodeRecruits);
    const byMeet = NODES.flatMap((n) => (n.kind === 'quest' && n.recruit ? [n.heroine] : []));
    const all = [...byRank, ...byStory, ...byMeet];
    for (const id of all) expect(YOKAI_BY_ID[id], id).toBeDefined();
    expect(new Set(all).size).toBe(all.length);
    for (const y of YOKAI) expect(STARTERS.includes(y.id) || all.includes(y.id), y.id).toBe(true);
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

  it('칭호 조건은 점점 커진다', () => {
    for (let r = 2; r < RANKS.length; r++) {
      expect(RANKS[r].powerReq).toBeGreaterThan(RANKS[r - 1].powerReq);
      expect(RANKS[r].fameCost).toBeGreaterThan(RANKS[r - 1].fameCost);
    }
  });

});

describe('진행 속도', { timeout: 120_000 }, () => {
  it('쉬지 않고 하면 1·2부의 모든 이야기·던전·사연을 막힘 없이 몇 시간에 걸쳐 끝낸다', () => {
    const r = simulateRun();
    expect(r.stuck).toBeNull();
    for (const ep of EPISODES) expect(r.episodeAt[ep.id], ep.id).toBeDefined();
    expect(r.minutes).toBeGreaterThan(4 * 60);
    expect(r.minutes).toBeLessThan(12 * 60);
    // 전투는 대체로 이길 만하지만 쉽지만은 않다
    const fixed = r.fights.filter((f) => f.kind !== 'field');
    const winRate = fixed.filter((f) => f.won).length / fixed.length;
    expect(winRate).toBeGreaterThan(0.6);
    expect(winRate).toBeLessThan(0.95);
  });
});
