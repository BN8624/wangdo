// 데이터끼리 맞물리는 규칙. 수치를 바꾸다 게임이 막히는 일을 막는다.
import { describe, expect, it } from 'vitest';
import { STAT_KEYS, levelCap, yokaiStats } from '../src/core/engine';
import { PROFILES, simulate } from '../src/core/sim';
import { ART_ASSETS } from '../src/data/art';
import { RANKS } from '../src/data/ranks';
import { CHAPTERS, STAGES_PER_CHAPTER } from '../src/data/stages';
import { WISHES } from '../src/data/wishes';
import { STARTERS, YOKAI, YOKAI_BY_ID } from '../src/data/yokai';

describe('데이터 무결성', () => {
  it('id가 겹치지 않는다', () => {
    expect(new Set(YOKAI.map((y) => y.id)).size).toBe(YOKAI.length);
    expect(new Set(WISHES.map((w) => w.id)).size).toBe(WISHES.length);
  });

  it('칭호와 장 대장이 가리키는 식객이 모두 있고, 모든 식객은 합류 경로가 하나뿐이다', () => {
    const sources = [...STARTERS, ...RANKS.flatMap((r) => (r.recruit ? [r.recruit] : [])), ...CHAPTERS.map((c) => c.boss.yokai)];
    for (const id of sources) expect(YOKAI_BY_ID[id], id).toBeDefined();
    expect(new Set(sources).size).toBe(sources.length);
    expect(new Set(sources)).toEqual(new Set(YOKAI.map((y) => y.id)));
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

  it('칭호 식객만 데리고도 레벨 상한 안에서 다음 칭호의 위세를 채울 수 있다', () => {
    const roster = [...STARTERS];
    for (let r = 0; r < RANKS.length - 1; r++) {
      if (RANKS[r].recruit) roster.push(RANKS[r].recruit!);
      const atCap = roster.reduce((sum, id) => {
        const st = yokaiStats(YOKAI_BY_ID[id], levelCap(r), 0);
        return sum + STAT_KEYS.reduce((a, k) => a + st[k], 0);
      }, 0);
      expect(RANKS[r + 1].powerReq, `${RANKS[r + 1].title}`).toBeLessThanOrEqual(atCap * 0.8);
    }
  });
});

describe('진행 속도', { timeout: 60_000 }, () => {
  it('부지런한 플레이: 첫날 촌장, 1~3주 안에 도깨비 대왕', () => {
    const r = simulate(PROFILES.engaged, 21);
    expect(r.rankReachedAt[5]!).toBeLessThan(24);
    const last = r.rankReachedAt[RANKS.length - 1];
    expect(last).not.toBeNull();
    expect(last!).toBeGreaterThan(7 * 24);
    expect(last!).toBeLessThan(21 * 24);
  });

  it('가끔 하는 플레이도 3주 안에 끝까지 갈 수 있다', () => {
    const r = simulate(PROFILES.casual, 21);
    expect(r.rankReachedAt[RANKS.length - 1]).not.toBeNull();
  });
});
