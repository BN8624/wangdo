import { describe, expect, it } from 'vitest';
import { nextHint } from '../src/core/hints';
import {
  autoTeam,
  chooseWish,
  equip,
  fightStage,
  fightTrain,
  giftPrice,
  giveGift,
  levelUp,
  newGame,
  outing,
  rankFame,
  rankUp,
  setTeam,
  starUp,
  talk,
  useWish,
  buyItem,
  markSceneSeen,
  unseenScene,
  bondLevel,
  tradeMemory,
} from '../src/core/engine';
import { STAGES, STAGE_BY_ID, applyStage, battleSeed, nextStage, stageOpen, stageSetup } from '../src/core/campaign';
import { runCombat } from '../src/core/combat';
import { pull } from '../src/core/gacha';
import { afkPending, claimAfk, trainOpen } from '../src/core/idle';
import { GUIDE, advanceGuide } from '../src/core/guide';
import { MIGRATION_JADE, deserialize, exportCode, importCode, serialize } from '../src/core/save';
import { heroStats, levelCap, teamPower } from '../src/core/units';
import { BALANCE } from '../src/data/balance';
import { ITEM_BY_ID } from '../src/data/items';
import { BOND_LEVELS } from '../src/data/village';
import { YOKAI, YOKAI_BY_ID } from '../src/data/yokai';
import type { GameState } from '../src/core/types';

const T0 = Date.UTC(2026, 0, 1, 9);
const MIN = 60_000;

/** 식객 다섯을 가진 게임 */
function squad(level = 1): GameState {
  let s = newGame(T0, 1);
  for (const id of ['muyeong', 'sodam', 'haeryun', 'bari']) s.yokai[id] = { level, stars: YOKAI_BY_ID[id].grade, shards: 0, bond: 0, talkAt: 0, outingAt: 0, seen: 0, talks: 0, gear: {} };
  s.yokai.baekseol.level = level;
  s = setTeam(s, autoTeam(s));
  return s;
}

describe('시작', () => {
  it('백설 혼자 편성 첫 칸에 서고, 옥으로 바로 모집할 수 있다', () => {
    const s = newGame(T0, 1);
    expect(Object.keys(s.yokai)).toEqual(['baekseol']);
    expect(s.team).toEqual(['baekseol', '', '', '', '']);
    expect(s.res.jade).toBeGreaterThanOrEqual(BALANCE.pullCost * 10);
  });
});

describe('성장', () => {
  it('수련치와 엽전으로 레벨을 올리고, 별에 따른 상한을 넘지 못한다', () => {
    const s = squad();
    s.res.exp = 1e9;
    s.res.coin = 1e9;
    const before = heroStats('muyeong', s.yokai.muyeong).atk;
    const [a, r] = levelUp(s, 'muyeong', 5);
    expect(r).toMatchObject({ ok: true, levels: 5 });
    expect(heroStats('muyeong', a.yokai.muyeong).atk).toBeGreaterThan(before);
    const [b] = levelUp(a, 'muyeong', 999);
    expect(b.yokai.muyeong.level).toBe(levelCap(b.yokai.muyeong.stars));
    expect(levelUp(b, 'muyeong', 1)[1]).toEqual({ ok: false, reason: 'cap' });
  });

  it('별은 조각으로 올리고, 모자라면 기억 조각으로 채운다', () => {
    const s = squad();
    s.yokai.sodam.shards = 15;
    expect(starUp(s, 'sodam')[1]).toEqual({ ok: false, reason: 'no-shards' });
    s.inventory.memory = 10;
    const [a, r] = starUp(s, 'sodam');
    expect(r).toMatchObject({ ok: true, stars: 2, used: 15, memory: 5 });
    expect(a.inventory.memory).toBe(5);
    expect(levelCap(2)).toBeGreaterThan(levelCap(1));
  });

  it('장비를 끼면 능력치가 오르고, 빼면 소지품으로 돌아온다', () => {
    const s = squad();
    s.res.coin = 1e6;
    const [a] = buyItem(s, 'oak-club');
    const [b] = equip(a, 'muyeong', 'weapon', 'oak-club');
    expect(heroStats('muyeong', b.yokai.muyeong).atk).toBeGreaterThan(heroStats('muyeong', a.yokai.muyeong).atk);
    expect(equip(b, 'muyeong', 'weapon', null)[0].inventory['oak-club']).toBe(1);
    expect(equip(a, 'muyeong', 'trinket', 'oak-club')[1]).toEqual({ ok: false, reason: 'wrong-slot' });
    expect(ITEM_BY_ID['oak-club'].price).toBeGreaterThan(0);
  });

  it('짝꿍이 같은 편성에 있으면 공격력이 오른다', () => {
    const s = squad();
    s.yokai.seorin = { level: 1, stars: 1, shards: 0, bond: 0, talkAt: 0, outingAt: 0, seen: 0, talks: 0, gear: {} };
    const alone = heroStats('muyeong', s.yokai.muyeong, ['muyeong']).atk;
    const pair = heroStats('muyeong', s.yokai.muyeong, ['muyeong', 'seorin']).atk;
    expect(pair).toBeGreaterThan(alone);
  });
});

describe('모집', () => {
  it('옥을 쓰고, 첫 열 번은 SSR 하나가 확정이며 열 번이면 SR 이상이 하나는 나온다', () => {
    const s = newGame(T0, 3);
    const [a, r] = pull(s, 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(a.res.jade).toBe(s.res.jade - BALANCE.pullCost * 10);
    expect(r.results.some((x) => x.rarity === 3)).toBe(true);
    for (let seed = 1; seed < 30; seed++) {
      const g = { ...newGame(T0, seed), gacha: { pulls: 10, pity: 0, firstTen: true } };
      g.res.jade = 1e6;
      const [, rr] = pull(g, 10);
      expect(rr.ok && rr.results.some((x) => x.rarity >= 2)).toBe(true);
    }
  });

  it('60번째 안에 SSR이 없으면 60번째는 SSR이고, 중복은 조각이 된다', () => {
    let s: GameState = { ...newGame(T0, 11), gacha: { pulls: 0, pity: BALANCE.pity - 1, firstTen: true } };
    s.res.jade = 1e6;
    const [a, r] = pull(s, 1);
    expect(r.ok && r.results[0].rarity).toBe(3);
    expect(a.gacha.pity).toBe(0);
    s = a;
    let dupe = false;
    for (let i = 0; i < 20 && !dupe; i++) {
      const [n, rr] = pull(s, 10);
      s = n;
      if (rr.ok && rr.results.some((x) => !x.isNew && x.shards > 0)) dupe = true;
    }
    expect(dupe).toBe(true);
  });

  it('옥이 모자라면 모집할 수 없다', () => {
    const s = newGame(T0, 1);
    s.res.jade = 50;
    expect(pull(s, 1)[1]).toEqual({ ok: false, reason: 'no-jade' });
  });
});

describe('캠페인', () => {
  it('1-1은 백설 혼자서도 반드시 이긴다', () => {
    for (const seed of [1, 2, 3]) {
      const s = newGame(T0, seed);
      const { outcome } = fightStage(s, STAGES[0]);
      expect(outcome.won).toBe(true);
    }
  });

  it('스테이지는 앞 스테이지를 깨야 열리고, 첫 클리어에 옥·엽전·수련치·명성을 준다', () => {
    const s = squad(30);
    expect(stageOpen(s, STAGES[1])).toBe(false);
    const { state, outcome } = fightStage(s, STAGES[0]);
    expect(outcome.won && outcome.first).toBe(true);
    expect(state.res.jade).toBeGreaterThan(s.res.jade);
    expect(state.res.exp).toBeGreaterThan(s.res.exp);
    expect(stageOpen(state, STAGES[1])).toBe(true);
    expect(nextStage(state)).toBe(STAGES[1]);
    // 다시 깨면 별을 더 딸 때만 옥을 준다
    const again = fightStage(state, STAGES[0]);
    expect(again.outcome.first).toBe(false);
    expect(again.state.res.exp).toBe(state.res.exp);
  });

  it('장의 마지막 스테이지를 깨면 그 화를 본 것으로 치고, 화의 식객이 합류한다(이미 있으면 조각)', () => {
    let s = squad(40);
    for (const st of STAGES.filter((x) => x.chapter <= 1)) {
      const r = fightStage(s, st);
      expect(r.outcome.won, st.label).toBe(true);
      s = r.state;
    }
    expect(s.story.done).toEqual(['s1e01', 's1e02']);
    expect(s.yokai.muyeong.shards).toBe(BALANCE.storyDupeShards);
    expect(s.inventory.memory).toBe(BALANCE.chapterMemory * 2);
  });

  it('지면 아무것도 얻지 못하고, 같은 조건으로 다시 싸우면 결과도 같다', () => {
    const s = squad(1);
    const st = STAGE_BY_ID['s2e08-6'];
    const team = s.team;
    const a = runCombat(stageSetup(s, st, team), battleSeed(s, st.id, team));
    const b = runCombat(stageSetup(s, st, team), battleSeed(s, st.id, team));
    expect(a).toEqual(b);
    const { state, outcome } = fightStage(s, st);
    expect(outcome.won).toBe(false);
    expect(state.res).toEqual(s.res);
  });

  it('장마다 스테이지 여섯, 레벨은 뒤로 갈수록 오른다', () => {
    expect(STAGES.length).toBe(26 * BALANCE.stagesPerChapter);
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i].level, STAGES[i].label).toBeGreaterThanOrEqual(STAGES[i - 1].level - 3);
    expect(STAGES[STAGES.length - 1].level).toBe(BALANCE.finalLevel);
  });
});

describe('방치 보상과 수련장', () => {
  it('자리를 비운 시간만큼(최대 12시간) 쌓이고, 받으면 다시 센다', () => {
    const s = squad(10);
    const one = afkPending(s, T0 + 60 * MIN);
    expect(one.coin).toBeGreaterThan(0);
    expect(one.jade).toBe(6);
    const cap = afkPending(s, T0 + 48 * 60 * MIN);
    expect(cap.minutes).toBe(BALANCE.afkCapMinutes);
    const [a, got] = claimAfk(s, T0 + 60 * MIN);
    expect(a.res.coin).toBe(s.res.coin + got.coin);
    expect(afkPending(a, T0 + 60 * MIN).minutes).toBe(0);
  });

  it('수련장은 이기면 수련치를 주고, 캠페인을 밀어야 높은 난이도가 열린다', () => {
    const s = squad(30);
    expect(trainOpen(s, 0)).toBe(true);
    expect(trainOpen(s, 8)).toBe(false);
    const { state, outcome } = fightTrain(s, 0);
    expect(outcome.won).toBe(true);
    expect(state.res.exp).toBeGreaterThan(s.res.exp);
  });
});

describe('관직', () => {
  it('명성이 차면 관직이 저절로 오르고 옥을 준다', () => {
    const s = newGame(T0, 1);
    s.res.fame = rankFame(3);
    const jade = s.res.jade;
    expect(rankUp(s)).toEqual([1, 2, 3]);
    expect(s.rank).toBe(3);
    expect(s.res.jade).toBeGreaterThan(jade);
  });
});

describe('인연', () => {
  it('대화는 언제든 하고 처음 듣는 대화만 호감도를 올린다', () => {
    let s = squad();
    const [a, r] = talk(s, T0, 'muyeong', 8);
    expect(r.ok && r.gained).toBe(8 * BALANCE.talkMult);
    for (let i = 0; i < BALANCE.talkTopics; i++) s = talk(s, T0, 'muyeong', 8)[0];
    expect(talk(s, T0, 'muyeong', 8)[1]).toMatchObject({ ok: true, gained: 0 });
    expect(a.totals.talks).toBe(1);
  });

  it('좋아하는 선물은 더 기뻐하고, 없으면 엽전으로 사서 준다', () => {
    const s = squad();
    s.res.coin = 10_000;
    const liked = YOKAI_BY_ID.muyeong.likes[0];
    const [a, r] = giveGift(s, 'muyeong', liked);
    expect(r.ok && r.liked && r.bought).toBe(true);
    expect(a.res.coin).toBe(s.res.coin - giftPrice(liked, 0));
    const [, o] = outing(a, T0, 'muyeong');
    expect(o.ok).toBe(true);
  });

  it('인연 단계가 오르면 인연 이야기가 열리고, 본 장면은 다시 알리지 않는다', () => {
    const s = squad();
    s.yokai.muyeong.bond = BOND_LEVELS[1].need;
    expect(bondLevel(s.yokai.muyeong.bond)).toBe(1);
    expect(unseenScene(s, 'muyeong')).toBe(1);
    expect(unseenScene(markSceneSeen(s, 'muyeong', 1), 'muyeong')).toBe(0);
  });
});

describe('정무', () => {
  it('상소는 이겨서 쌓이고, 판결하면 보상을 받는다', () => {
    let s = squad(30);
    for (let i = 0; i < BALANCE.wishBaseCharges; i++) s = chooseWish(useWish(s)[0], 0)[0];
    expect(useWish(s)[1]).toEqual({ ok: false, reason: 'no-charge' });
    for (let i = 0; i < BALANCE.winsPerPetition; i++) s = fightTrain(s, 0, s.team, i).state;
    expect(s.wish.charges).toBe(1);
  });
});

describe('저장', () => {
  it('저장하고 불러오면 같은 상태다', () => {
    const s = squad(5);
    expect(deserialize(serialize(s), T0)).toEqual(s);
    expect(importCode(exportCode(s), T0)).toEqual(s);
  });

  it('깨진 저장은 거부한다', () => {
    expect(deserialize('{', T0)).toBeNull();
    expect(deserialize('{"version":1}', T0)).toBeNull();
    expect(importCode('!!!', T0)).toBeNull();
  });

  it('옛 저장(모험 지도 시절)은 식객·인연을 그대로 옮기고, 본 화의 장을 깬 것으로 치며 옥을 선물한다', () => {
    const old = {
      version: 2,
      rank: 5,
      res: { coin: 500, grain: 300, fame: 40 },
      yokai: { baekseol: { level: 30, bond: 200, talkAt: 0, outingAt: 0, seen: 2, talks: 3, exp: 10, gear: {} }, muyeong: { level: 99, bond: 0, gear: {} }, nobody: { level: 3 } },
      story: { done: ['s1e01', 's1e02'], flags: ['x'], won: [], losses: {} },
      favorite: 'baekseol',
      work: {},
      adv: {},
    };
    const s = deserialize(JSON.stringify(old), T0)!;
    expect(s.version).toBe(3);
    expect(Object.keys(s.yokai).sort()).toEqual(['baekseol', 'muyeong']);
    expect(s.yokai.baekseol).toMatchObject({ level: 30, bond: 200, stars: YOKAI_BY_ID.baekseol.grade });
    expect(s.yokai.muyeong.level).toBe(levelCap(s.yokai.muyeong.stars));
    expect(s.camp.stars['s1e02-6']).toBe(1);
    expect(s.res.jade).toBe(MIGRATION_JADE);
    expect(s.res.exp).toBe(300);
    expect(s.team.filter(Boolean).length).toBe(2);
  });
});

describe('안내와 할 일', () => {
  it('할 일을 해내야 다음 단계로 가고, 보상을 받는다', () => {
    let s = newGame(T0, 1);
    expect(advanceGuide(s)[1]).toBeNull();
    [s] = advanceGuide(s, true);
    expect(s.guide).toBe(1);
    s = fightStage(s, STAGES[0]).state;
    const jade = s.res.jade;
    [s] = advanceGuide(s);
    expect(s.guide).toBe(2);
    expect(s.res.jade).toBe(jade + (GUIDE[1].reward?.jade ?? 0));
  });

  it('옥이 모이면 모집을, 권장 전투력에 못 미치면 레벨업을 권한다', () => {
    const s = newGame(T0, 1);
    s.wish.charges = 0;
    expect(nextHint(s, T0).target).toBe('gacha');
    const t = squad(1);
    t.res.jade = 0;
    t.wish.charges = 0;
    t.res.exp = 1e6;
    t.res.coin = 1e6;
    t.camp.stars = Object.fromEntries(STAGES.slice(0, 40).map((x) => [x.id, 3]));
    expect(teamPower(t)).toBeGreaterThan(0);
    expect(nextHint(t, T0).target).toBe('yokai');
  });
});

describe('식객 명부', () => {
  it('모든 식객은 등급만큼의 별로 시작한다', () => {
    for (const y of YOKAI) expect(newGame(T0).yokai[y.id]?.stars ?? y.grade).toBe(y.grade);
  });
});

describe('운에 기대지 않는 진행', () => {
  it('옥을 기억 조각으로 바꾸고, 옥이 모자라면 바꾸지 않는다', () => {
    const s = newGame(0);
    s.res.jade = BALANCE.memoryTrade.jade * 3;
    const [a, r] = tradeMemory(s, 2);
    expect(r).toEqual({ ok: true, memory: BALANCE.memoryTrade.memory * 2 });
    expect(a.res.jade).toBe(BALANCE.memoryTrade.jade);
    expect(a.inventory.memory).toBe(BALANCE.memoryTrade.memory * 2);
    const [b, r2] = tradeMemory(a, 2);
    expect(r2.ok).toBe(false);
    expect(b).toBe(a);
  });

  it('뽑기로만 얻던 식객도 만남 스테이지를 처음 깨면 합류하고, 이미 있으면 조각을 받는다', () => {
    const meets = STAGES.filter((st) => st.meet).map((st) => st.meet!.heroine);
    expect(meets.sort()).toEqual(['bulsae', 'danhui', 'seorin']);
    const st = STAGES.find((x) => x.meet?.heroine === 'seorin')!;
    const s = newGame(0);
    const win = { won: true, rounds: 3, deaths: 0, stars: 3 };
    const { reward } = applyStage(s, st, s.team, win);
    expect(reward.recruits).toEqual(['seorin']);
    expect(s.yokai.seorin).toBeDefined();
    const s2 = newGame(0);
    s2.yokai.seorin = { ...s.yokai.seorin, shards: 0 };
    const r2 = applyStage(s2, st, s2.team, win).reward;
    expect(r2.recruits).toEqual([]);
    expect(s2.yokai.seorin.shards).toBe(BALANCE.storyDupeShards);
  });

  it('만남이 생기기 전에 그 스테이지를 지나간 저장은 불러올 때 그 식객이 합류해 있다', () => {
    const s = newGame(0);
    const st = STAGES.find((x) => x.meet?.heroine === 'danhui')!;
    s.camp.stars[st.id] = 2;
    delete s.yokai.danhui;
    const loaded = deserialize(serialize(s), 0)!;
    expect(loaded.yokai.danhui).toBeDefined();
    expect(loaded.camp.stars[st.id]).toBe(2);
  });
});

