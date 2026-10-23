import { describe, expect, it } from 'vitest';
import {
  MINUTE,
  assign,
  bestParty,
  bondLevel,
  chooseWish,
  feast,
  feastCost,
  fight,
  giftPrice,
  giveGift,
  levelCap,
  levelCost,
  levelUp,
  newGame,
  outing,
  partyChance,
  partyChances,
  power,
  promote,
  ratesPerMinute,
  settle,
  slotsPerWorkplace,
  stageInfo,
  statsOf,
  talk,
  unseenScene,
  markSceneSeen,
  useWish,
  wishMaxCharges,
  winChance,
  workplaceRate,
} from '../src/core/engine';
import { GUIDE, advanceGuide } from '../src/core/guide';
import { deserialize, exportCode, importCode, serialize } from '../src/core/save';
import { BALANCE } from '../src/data/balance';
import { RANKS } from '../src/data/ranks';
import { STAGES_PER_CHAPTER } from '../src/data/stages';
import { BOND_LEVELS, WORKPLACE_BY_ID } from '../src/data/village';
import { YOKAI_BY_ID } from '../src/data/yokai';

const T0 = Date.UTC(2026, 0, 1, 9);

/** 시작 식객 셋을 적성 일터에 보낸 새 게임 */
function game() {
  const s = newGame(T0, 1);
  s.work = { market: ['bangul'], woodyard: ['dudu'], field: ['sora'], tavern: [] };
  return s;
}

describe('일터와 생산', () => {
  it('배치된 식객만큼 자원이 저절로 들어오고, 자리를 비운 시간은 상한까지만 센다', () => {
    const s = game();
    const rate = ratesPerMinute(s);
    expect(rate.coin).toBeGreaterThan(0);
    expect(settle(s, T0 + 10 * MINUTE).res.coin).toBeCloseTo(s.res.coin + rate.coin * 10);
    const capped = settle(s, T0 + 100 * 60 * MINUTE).res.coin;
    expect(capped).toBeCloseTo(s.res.coin + rate.coin * BALANCE.offlineCapMinutes);
  });

  it('적성이 맞는 일터에서 더 많이 만든다', () => {
    const s = game();
    const market = WORKPLACE_BY_ID.market;
    expect(workplaceRate(s, market)).toBeCloseTo(statsOf(s, 'bangul').wit * BALANCE.aptitudeMult * market.perStat);
    const [resting] = assign(s, T0, 'bangul', null);
    const [sora] = assign(assign(resting, T0, 'sora', null)[0], T0, 'sora', 'market');
    expect(workplaceRate(sora, market)).toBeCloseTo(statsOf(s, 'sora').wit * market.perStat);
  });

  it('칸이 차면 더 보낼 수 없고, 칭호가 오르면 칸이 늘어난다', () => {
    const s = game();
    expect(assign(s, T0, 'dudu', 'market')[1]).toEqual({ ok: false, reason: 'full' });
    expect(slotsPerWorkplace(BALANCE.slotRanks[0])).toBe(2);
  });

  it('짝꿍을 같은 일터에 두면 처음 한 번 이야기가 나온다', () => {
    const s = game();
    s.rank = 2;
    s.yokai.kkulkkeok = { level: 1, bond: 0, talkAt: 0, outingAt: 0, seen: 0, talks: 0 };
    const [a, r] = assign(s, T0, 'kkulkkeok', 'woodyard');
    expect(r.ok && r.newCombos.map((c) => c.id)).toEqual(['strong']);
    const [, r2] = assign(assign(a, T0, 'kkulkkeok', null)[0], T0, 'kkulkkeok', 'woodyard');
    expect(r2.ok && r2.newCombos).toEqual([]);
  });

  it('시계가 뒤로 가면 아무것도 주지 않는다', () => {
    const s = settle(game(), T0 + 10 * MINUTE);
    expect(settle(s, T0).res).toEqual(s.res);
  });

  it('정산은 입력 상태를 바꾸지 않는다', () => {
    const s = game();
    const snapshot = serialize(s);
    settle(s, T0 + 60 * MINUTE);
    expect(serialize(s)).toBe(snapshot);
  });
});

describe('식객 레벨업', () => {
  it('엽전을 내고 능력치가 오르며, 칭호 상한을 넘지 못한다', () => {
    const s = game();
    const cost = levelCost(YOKAI_BY_ID.dudu, 1);
    const [next, r] = levelUp(s, T0, 'dudu', 1);
    expect(r).toEqual({ ok: true, levels: 1, spent: cost });
    expect(power(next)).toBeGreaterThan(power(s));
    next.res.coin = 1e12;
    expect(levelUp(next, T0, 'dudu', 999)[0].yokai.dudu.level).toBe(levelCap(0));
  });
});

describe('인연', () => {
  it('대화는 대답 점수만큼 호감도를 올리고, 한동안 다시 할 수 없다', () => {
    const s = game();
    const [a, r] = talk(s, T0, 'dudu', 8);
    expect(r.ok && r.gained).toBe(8 * BALANCE.talkMult);
    expect(talk(a, T0 + MINUTE, 'dudu', 8)[1]).toEqual({ ok: false, reason: 'cooldown' });
    expect(talk(a, T0 + BALANCE.talkCooldownMinutes * MINUTE, 'dudu', 8)[1].ok).toBe(true);
  });

  it('좋아하는 선물은 더 기뻐하고, 없으면 엽전으로 사서 준다', () => {
    const s = game();
    s.res.coin = 10_000;
    const liked = YOKAI_BY_ID.dudu.likes[0];
    const [a, r] = giveGift(s, T0, 'dudu', liked);
    expect(r.ok && r.liked && r.bought).toBe(true);
    expect(a.res.coin).toBe(s.res.coin - giftPrice(liked, 0));
    expect(a.yokai.dudu.bond).toBe(BALANCE.giftBond.liked);
    a.gifts.brush = 1;
    const [b, r2] = giveGift(a, T0, 'dudu', 'brush');
    expect(r2.ok && !r2.liked && !r2.bought).toBe(true);
    expect(b.gifts.brush).toBe(0);
    expect(b.res.coin).toBe(a.res.coin);
  });

  it('호감도 단계가 오르면 능력치가 오르고 새 이야기가 열린다', () => {
    const s = game();
    s.res.coin = 1e6;
    const before = statsOf(s, 'sora').politics;
    const [a, r] = outing(s, T0, 'sora');
    expect(r.ok && r.to).toBe(bondLevel(BALANCE.outingBond));
    a.yokai.sora.bond = BOND_LEVELS[3].need;
    expect(statsOf(a, 'sora').politics).toBeGreaterThan(before);
    expect(unseenScene(a, 'sora')).toBe(1);
    expect(unseenScene(markSceneSeen(a, 'sora', 1), 'sora')).toBe(2);
  });
});

describe('잔치와 승급', () => {
  it('잔치는 곡식을 내고 명성과 모두의 호감도를 준다', () => {
    const s = game();
    s.res.grain = feastCost(0);
    const [next, r] = feast(s, T0);
    expect(r.ok).toBe(true);
    expect(next.res.fame).toBeGreaterThan(s.res.fame);
    expect(next.yokai.sora.bond).toBe(BALANCE.feastBond);
  });

  it('위세와 명성이 모두 차야 승급하고, 칭호 식객이 합류한다', () => {
    const s = game();
    s.rank = 1;
    s.res.fame = RANKS[2].fameCost;
    expect(promote(s, T0)[1]).toEqual({ ok: false, reason: 'need-power' });
    for (const id of ['dudu', 'bangul', 'sora']) s.yokai[id].level = 20;
    const [next, r] = promote(s, T0);
    expect(r).toEqual({ ok: true, rank: 2, recruit: RANKS[2].recruit });
    expect(next.yokai[RANKS[2].recruit!].level).toBe(1);
  });
});

describe('뚝딱 소원', () => {
  it('횟수를 쓰고 소원을 하나 받는다. 새로고침해도 같은 소원이다', () => {
    const s = game();
    const [a, r] = useWish(s, T0);
    const [again, r2] = useWish(a, T0);
    expect(again.wish.charges).toBe(s.wish.charges - 1);
    expect(r.ok && r2.ok && r2.wish.id === r.wish.id).toBe(true);
    const [b, c] = chooseWish(a, T0, 0);
    expect(c.ok).toBe(true);
    expect(b.wish.pending).toBeNull();
  });

  it('횟수는 일정 시간마다 최대치까지 다시 찬다', () => {
    let s = game();
    for (let i = 0; i < wishMaxCharges(0); i++) s = chooseWish(useWish(s, T0)[0], T0, 0)[0];
    expect(useWish(s, T0)[1]).toEqual({ ok: false, reason: 'no-charge' });
    expect(settle(s, T0 + BALANCE.wishRegenMinutes * MINUTE).wish.charges).toBe(1);
  });
});

describe('소동 겨루기', () => {
  it('판마다 다른 능력치를 겨루고, 순번이 같으면 늘 같은 구성이다', () => {
    const a = stageInfo(5)!;
    expect(new Set(a.rounds.map((r) => r.stat)).size).toBe(3);
    expect(stageInfo(5)).toEqual(a);
    expect(winChance(10, 10)).toBeCloseTo(0.5);
    expect(winChance(20, 10)).toBeGreaterThan(0.9);
  });

  it('추천 편성은 아무렇게나 고른 편성보다 낫다', () => {
    const s = game();
    const info = stageInfo(0)!;
    const best = partyChance(partyChances(s, info, bestParty(s, info)));
    for (const p of [['dudu', 'bangul', 'sora'], ['sora', 'dudu', 'bangul']]) {
      expect(best).toBeGreaterThanOrEqual(partyChance(partyChances(s, info, p)));
    }
  });

  it('기력을 쓰고, 이기면 다음 소동으로 넘어가 보상을 받는다', () => {
    const s = game();
    for (const id of ['dudu', 'bangul', 'sora']) s.yokai[id].level = 10;
    const info = stageInfo(0)!;
    const [next, r] = fight(s, T0, bestParty(s, info));
    expect(next.stamina.value).toBe(BALANCE.staminaMax - 1);
    expect(r.ok && r.won).toBe(true);
    expect(next.stage.index).toBe(1);
    expect(fight(s, T0, ['dudu', 'dudu', 'sora'])[1]).toEqual({ ok: false, reason: 'bad-party' });
  });

  it('기력이 없으면 출동할 수 없다', () => {
    const s = game();
    s.stamina.value = 0;
    expect(fight(s, T0, ['dudu', 'bangul', 'sora'])[1]).toEqual({ ok: false, reason: 'no-stamina' });
  });

  it('장의 대장을 이기면 식객으로 합류한다', () => {
    const s = game();
    s.stage.index = STAGES_PER_CHAPTER - 1;
    for (const id of ['dudu', 'bangul', 'sora']) s.yokai[id].level = 200;
    const [next, r] = fight(s, T0, bestParty(s, stageInfo(s.stage.index)!));
    expect(r.ok && r.recruit).toBe('kkulkkeok');
    expect(next.yokai.kkulkkeok.level).toBe(1);
  });
});

describe('저장', () => {
  it('저장하고 불러오면 같은 상태다', () => {
    const s = settle(newGame(T0, 9), T0 + 5 * MINUTE);
    expect(deserialize(serialize(s), T0)).toEqual(s);
    expect(importCode(exportCode(s), T0)).toEqual(s);
  });

  it('깨진 저장은 거부한다', () => {
    expect(deserialize('{', T0)).toBeNull();
    expect(deserialize('{"version":1}', T0)).toBeNull();
    expect(importCode('!!!', T0)).toBeNull();
  });
});

describe('안내', () => {
  it('할 일을 해내야 다음 단계로 가고, 보상을 받는다', () => {
    let s = newGame(T0, 1);
    expect(advanceGuide(s)[1]).toBeNull();
    [s] = advanceGuide(s, true);
    expect(s.guide).toBe(1);
    expect(advanceGuide(s, true)[1]).toBeNull();
    [s] = assign(s, T0, 'bangul', 'market');
    const coin = s.res.coin;
    [s] = advanceGuide(s);
    expect(s.guide).toBe(2);
    expect(s.res.coin).toBe(coin + (GUIDE[1].reward?.coin ?? 0));
  });
});
