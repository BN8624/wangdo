import { describe, expect, it } from 'vitest';
import { nextHint } from '../src/core/hints';
import {
  MINUTE,
  assign,
  bestParty,
  bondLevel,
  chooseWish,
  feast,
  feastCost,
  expToNext,
  grantExp,
  giftPrice,
  giveGift,
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
  winChance,
  buyItem,
  equip,
  workplaceRate,
  freshYokai,
} from '../src/core/engine';
import { GUIDE, advanceGuide } from '../src/core/guide';
import { advFight, dungeonEncounter, fieldEncounter, questEncounter, reenterDungeon } from '../src/core/adventure';
import { NODE_BY_ID, type DungeonDef, type FieldDef, type QuestDef } from '../src/data/world';
import { ITEM_BY_ID } from '../src/data/items';
import { deserialize, exportCode, importCode, serialize } from '../src/core/save';
import { BALANCE } from '../src/data/balance';
import { RANKS } from '../src/data/ranks';
import { BOND_LEVELS, WORKPLACE_BY_ID } from '../src/data/village';
import { YOKAI_BY_ID } from '../src/data/yokai';

const T0 = Date.UTC(2026, 0, 1, 9);

/** 식객 넷을 적성 일터에 보낸 새 게임 */
function game() {
  const s = newGame(T0, 1);
  for (const id of ['muyeong', 'sodam', 'geumyeong']) s.yokai[id] = freshYokai();
  s.work = { market: ['geumyeong'], woodyard: ['muyeong'], field: ['sodam'], tavern: ['baekseol'] };
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
    expect(workplaceRate(s, market)).toBeCloseTo(statsOf(s, 'geumyeong').wit * BALANCE.aptitudeMult * market.perStat);
    const [resting] = assign(s, T0, 'geumyeong', null);
    const [sora] = assign(assign(resting, T0, 'sodam', null)[0], T0, 'sodam', 'market');
    expect(workplaceRate(sora, market)).toBeCloseTo(statsOf(s, 'sodam').wit * market.perStat);
  });

  it('칸이 차면 더 보낼 수 없고, 칭호가 오르면 칸이 늘어난다', () => {
    const s = game();
    expect(assign(s, T0, 'muyeong', 'market')[1]).toEqual({ ok: false, reason: 'full' });
    expect(slotsPerWorkplace(BALANCE.slotRanks[0])).toBe(2);
  });

  it('짝꿍을 같은 일터에 두면 처음 한 번 이야기가 나온다', () => {
    const s = game();
    s.rank = 2;
    s.yokai.seorin = freshYokai();
    const [a, r] = assign(s, T0, 'seorin', 'woodyard');
    expect(r.ok && r.newCombos.map((c) => c.id)).toEqual(['blades']);
    const [, r2] = assign(assign(a, T0, 'seorin', null)[0], T0, 'seorin', 'woodyard');
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

describe('경험치와 장비', () => {
  it('경험치가 차면 레벨이 오르고 남은 경험치는 이어진다', () => {
    const s = game();
    const before = power(s);
    const up = grantExp(s, 'muyeong', expToNext(1) + expToNext(2) + 5);
    expect(up).toEqual({ id: 'muyeong', from: 1, to: 3 });
    expect(s.yokai.muyeong.exp).toBe(5);
    expect(power(s)).toBeGreaterThan(before);
  });

  it('상점에서 산 장비를 끼면 능력치가 오르고, 빼면 소지품으로 돌아온다', () => {
    const s = game();
    s.res.coin = 100_000;
    const [a, r] = buyItem(s, T0, 'oak-club');
    expect(r.ok).toBe(true);
    expect(a.res.coin).toBe(s.res.coin - ITEM_BY_ID['oak-club'].price!);
    const [b] = equip(a, T0, 'muyeong', 'weapon', 'oak-club');
    expect(statsOf(b, 'muyeong').might).toBeGreaterThan(statsOf(a, 'muyeong').might);
    expect(b.inventory['oak-club']).toBeUndefined();
    const [c] = equip(b, T0, 'muyeong', 'weapon', null);
    expect(c.inventory['oak-club']).toBe(1);
    expect(equip(a, T0, 'muyeong', 'trinket', 'oak-club')[1]).toEqual({ ok: false, reason: 'wrong-slot' });
  });
});

describe('인연', () => {
  it('대화는 기다릴 필요 없이 언제든 하고, 처음 듣는 대화만 호감도를 올린다', () => {
    let s = game();
    const [a, r] = talk(s, T0, 'muyeong', 8);
    expect(r.ok && r.gained).toBe(8 * BALANCE.talkMult);
    expect(talk(a, T0, 'muyeong', 4)[1]).toMatchObject({ ok: true, gained: 4 * BALANCE.talkMult });
    for (let i = 0; i < BALANCE.talkTopics; i++) s = talk(s, T0, 'muyeong', 8)[0];
    expect(talk(s, T0, 'muyeong', 8)[1]).toMatchObject({ ok: true, gained: 0 });
  });

  it('좋아하는 선물은 더 기뻐하고, 없으면 엽전으로 사서 준다', () => {
    const s = game();
    s.res.coin = 10_000;
    const liked = YOKAI_BY_ID.muyeong.likes[0];
    const [a, r] = giveGift(s, T0, 'muyeong', liked);
    expect(r.ok && r.liked && r.bought).toBe(true);
    expect(a.res.coin).toBe(s.res.coin - giftPrice(liked, 0));
    expect(a.yokai.muyeong.bond).toBe(BALANCE.giftBond.liked);
    a.gifts.brush = 1;
    const [b, r2] = giveGift(a, T0, 'muyeong', 'brush');
    expect(r2.ok && !r2.liked && !r2.bought).toBe(true);
    expect(b.gifts.brush).toBe(0);
    expect(b.res.coin).toBe(a.res.coin);
  });

  it('호감도 단계가 오르면 능력치가 오르고 새 이야기가 열린다', () => {
    const s = game();
    s.res.coin = 1e6;
    const before = statsOf(s, 'sodam').politics;
    const [a, r] = outing(s, T0, 'sodam');
    expect(r.ok && r.to).toBe(bondLevel(BALANCE.outingBond));
    a.yokai.sodam.bond = BOND_LEVELS[3].need;
    expect(statsOf(a, 'sodam').politics).toBeGreaterThan(before);
    expect(unseenScene(a, 'sodam')).toBe(1);
    expect(unseenScene(markSceneSeen(a, 'sodam', 1), 'sodam')).toBe(2);
  });
});

describe('잔치와 승급', () => {
  it('잔치는 곡식을 내고 명성과 모두의 호감도를 준다', () => {
    const s = game();
    s.res.grain = feastCost(0);
    const [next, r] = feast(s, T0);
    expect(r.ok).toBe(true);
    expect(next.res.fame).toBeGreaterThan(s.res.fame);
    expect(next.yokai.sodam.bond).toBe(BALANCE.feastBond);
  });

  it('위세와 명성이 모두 차야 승급하고, 명성을 쓴다', () => {
    const s = newGame(T0, 1);
    s.rank = 1;
    s.res.fame = RANKS[2].fameCost;
    expect(promote(s, T0)[1]).toEqual({ ok: false, reason: 'need-power' });
    s.yokai.baekseol.level = 20;
    const [next, r] = promote(s, T0);
    expect(r).toEqual({ ok: true, rank: 2, recruit: null });
    expect(next.res.fame).toBe(0);
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

  it('상소는 기다려서가 아니라 싸워 이겨서 쌓인다', () => {
    let s = game();
    for (let i = 0; i < BALANCE.wishBaseCharges; i++) s = chooseWish(useWish(s, T0)[0], T0, 0)[0];
    expect(useWish(s, T0)[1]).toEqual({ ok: false, reason: 'no-charge' });
    expect(settle(s, T0 + 24 * 60 * MINUTE).wish.charges).toBe(0);
    for (const id of Object.keys(s.yokai)) s.yokai[id].level = 30;
    const field = NODE_BY_ID['backhill-field'] as FieldDef;
    s.story.done.push('s1e01');
    let wins = 0;
    for (let i = 0; i < 20 && wins < BALANCE.winsPerPetition; i++) {
      const [next, r] = advFight(s, T0, field.id, bestParty(s, fieldEncounter(s, field)));
      s = next;
      if (r.ok && r.won) wins++;
    }
    expect(s.wish.charges).toBe(1);
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
    for (const p of [['muyeong', 'geumyeong', 'sodam'], ['sodam', 'muyeong', 'geumyeong']]) {
      expect(best).toBeGreaterThanOrEqual(partyChance(partyChances(s, info, p)));
    }
  });

});

describe('모험', () => {
  function strong() {
    const s = game();
    for (const id of Object.keys(s.yokai)) s.yokai[id].level = 40;
    s.story.done.push('s1e01', 's1e02');
    return s;
  }

  it('필드는 몇 번이고 싸울 수 있고, 싸울 때마다 다음 상대가 바뀐다', () => {
    let s = strong();
    const field = NODE_BY_ID['backhill-field'] as FieldDef;
    const first = fieldEncounter(s, field);
    const [next, r] = advFight(s, T0, field.id, bestParty(s, first));
    expect(r.ok && r.won).toBe(true);
    s = next;
    expect(s.adv.floors['f:backhill-field']).toBe(1);
    expect(fieldEncounter(s, field).index).not.toBe(first.index);
    expect(advFight(s, T0, field.id, ['muyeong', 'muyeong', 'sodam'])[1]).toEqual({ ok: false, reason: 'bad-party' });
  });

  it('던전은 층마다 싸워 내려가고, 보물상자를 열고, 대장을 이기면 돌파한다', () => {
    let s = strong();
    const cave = NODE_BY_ID['bandit-cave'] as DungeonDef;
    const coin = s.res.coin;
    let chests = 0;
    for (let guard = 0; guard < 40 && dungeonEncounter(s, cave); guard++) {
      const [next, r] = advFight(s, T0, cave.id, bestParty(s, dungeonEncounter(s, cave)!));
      if (r.ok && r.chest) chests++;
      s = next;
    }
    expect(s.adv.cleared).toContain('bandit-cave');
    expect(chests).toBe(cave.floors.filter((f) => f.chest).length);
    expect(s.inventory[cave.boss.drop!]).toBe(1);
    expect(s.res.coin).toBeGreaterThan(coin);
    // 다시 들어가면 처음부터, 보물상자와 대장 장비는 다시 안 나온다
    s = reenterDungeon(s, cave.id);
    expect(dungeonEncounter(s, cave)).not.toBeNull();
    for (let guard = 0; guard < 40 && dungeonEncounter(s, cave); guard++) s = advFight(s, T0, cave.id, bestParty(s, dungeonEncounter(s, cave)!))[0];
    expect(s.inventory[cave.boss.drop!]).toBe(1);
  });

  it('던전에서 지면 상대가 지친다', () => {
    const s = game();
    s.story.done.push('s2e08');
    const cave = NODE_BY_ID['underworld-gate'] as DungeonDef;
    const before = dungeonEncounter(s, cave)!;
    const [next, r] = advFight(s, T0, cave.id, bestParty(s, before));
    expect(r.ok && !r.won).toBe(true);
    const after = dungeonEncounter(next, cave)!;
    expect(after.rounds[0].value).toBeLessThan(before.rounds[0].value);
  });

  it('만남을 끝내면 그 식객이 합류한다', () => {
    let s = strong();
    s.adv.cleared.push('bandit-cave');
    const meet = NODE_BY_ID['m:seorin'] as QuestDef;
    expect(s.yokai.seorin).toBeUndefined();
    for (let guard = 0; guard < 10 && questEncounter(s, meet); guard++) s = advFight(s, T0, meet.id, bestParty(s, questEncounter(s, meet)!))[0];
    expect(s.yokai.seorin?.level).toBeGreaterThan(1);
  });

  it('질 때도 경험치와 엽전의 일부는 받는다', () => {
    const s = game();
    s.story.done.push('s2e08');
    const cave = NODE_BY_ID['underworld-gate'] as DungeonDef;
    const before = s.res.coin;
    const [after, r] = advFight(s, T0, cave.id, bestParty(s, dungeonEncounter(s, cave)!));
    expect(r.ok && !r.won).toBe(true);
    if (!r.ok) return;
    expect(r.coin).toBe(Math.round(r.stage.coin * BALANCE.loseRewardRatio));
    expect(after.res.coin).toBeCloseTo(before + r.coin);
    expect(r.exp).toBeGreaterThan(0);
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

  it('어긋난 저장은 바로잡는다: 없는 식객은 버리고, 일터에는 데리고 있는 식객만 한 번씩', () => {
    const s = newGame(T0, 9);
    const raw = JSON.parse(serialize(s));
    raw.yokai.nobody = { level: 3 };
    raw.work = { market: ['baekseol', 'nobody', 'baekseol'], tavern: ['danhui'], moon: ['baekseol'] };
    raw.res.coin = -50;
    raw.favorite = 'nobody';
    const fixed = deserialize(JSON.stringify(raw), T0)!;
    expect(fixed.yokai.nobody).toBeUndefined();
    expect(fixed.work.market).toEqual(['baekseol']);
    expect(fixed.work.tavern).toEqual([]);
    expect(Object.keys(fixed.work).sort()).toEqual(Object.keys(s.work).sort());
    expect(fixed.res.coin).toBe(0);
    expect(fixed.yokai[fixed.favorite]).toBeDefined();
  });
});

describe('안내', () => {
  it('할 일을 해내야 다음 단계로 가고, 보상을 받는다', () => {
    let s = newGame(T0, 1);
    expect(advanceGuide(s)[1]).toBeNull();
    [s] = advanceGuide(s, true);
    expect(s.guide).toBe(1);
    expect(advanceGuide(s, true)[1]).toBeNull();
    s.story.done.push('s1e01');
    const coin = s.res.coin;
    [s] = advanceGuide(s);
    expect(s.guide).toBe(2);
    expect(s.res.coin).toBe(coin + (GUIDE[1].reward?.coin ?? 0));
  });
});

describe('할 일 안내', () => {
  it('앞 던전을 돌파해야 열리는 화면, 그 던전으로 안내한다', () => {
    const now = 1_000_000_000;
    const s = newGame(now, 3);
    for (const id of ['muyeong', 'sodam']) s.yokai[id] = freshYokai();
    s.work = { market: ['baekseol'], woodyard: ['muyeong'], field: ['sodam'], tavern: [] };
    s.story.done = ['s1e01', 's1e02'];
    s.wish.charges = 0;
    for (const id of Object.keys(s.yokai)) s.yokai[id].talks = 99;
    s.res = { coin: 0, grain: 0, fame: 0 };
    const hint = nextHint(s);
    expect(hint.target).toBe('adv');
    expect(hint.text).toContain('고갯길 산적굴');
  });
});

describe('저장 지키기', () => {
  it('하루 넘게 했는데 백업한 적이 없으면 백업을 권한다', async () => {
    const { backupDue } = await import('../src/ui/backup');
    const now = 10 * 86_400_000;
    expect(backupDue(newGame(now - 3_600_000, 1), now)).toBe(false);
    expect(backupDue(newGame(now - 2 * 86_400_000, 1), now)).toBe(true);
  });
});
