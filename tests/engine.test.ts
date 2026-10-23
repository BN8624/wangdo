import { describe, expect, it } from 'vitest';
import {
  MINUTE,
  challengeStage,
  chooseWish,
  collect,
  feast,
  feastCost,
  handsNeeded,
  levelCap,
  levelCost,
  levelUp,
  newGame,
  power,
  promote,
  ratesPerMinute,
  settle,
  stageInfo,
  storageCaps,
  useWish,
  wishMaxCharges,
} from '../src/core/engine';
import { deserialize, exportCode, importCode, serialize } from '../src/core/save';
import { BALANCE } from '../src/data/balance';
import { RANKS } from '../src/data/ranks';
import { STAGES_PER_CHAPTER } from '../src/data/stages';
import { YOKAI_BY_ID } from '../src/data/yokai';

const T0 = Date.UTC(2026, 0, 1, 9);

describe('창고 정산', () => {
  it('시간이 지나면 생산량만큼 쌓이고 상한에서 멈춘다', () => {
    const s = newGame(T0, 1);
    const rate = ratesPerMinute(s);
    const after10 = settle(s, T0 + 10 * MINUTE);
    expect(after10.store.coin).toBeCloseTo(rate.coin * 10);
    const afterDay = settle(s, T0 + 24 * 60 * MINUTE);
    expect(afterDay.store.coin).toBe(storageCaps(s).coin);
  });

  it('시계가 뒤로 가면 아무것도 주지 않는다', () => {
    const s = settle(newGame(T0, 1), T0 + 10 * MINUTE);
    const back = settle(s, T0);
    expect(back.store).toEqual(s.store);
    expect(back.lastSettled).toBe(T0);
  });

  it('정산은 입력 상태를 바꾸지 않는다', () => {
    const s = newGame(T0, 1);
    const snapshot = serialize(s);
    settle(s, T0 + 60 * MINUTE);
    expect(serialize(s)).toBe(snapshot);
  });

  it('거두면 정수만 지갑으로 옮기고 소수점은 창고에 남긴다', () => {
    const s = newGame(T0, 1);
    const [next, r] = collect(s, T0 + 7 * MINUTE + 13_000);
    expect(next.res.coin).toBe(s.res.coin + r.amounts.coin);
    expect(next.store.coin).toBeGreaterThanOrEqual(0);
    expect(next.store.coin).toBeLessThan(1);
  });
});

describe('식객 레벨업', () => {
  it('엽전을 내고 능력치가 오른다', () => {
    const s = newGame(T0, 1);
    const before = power(s);
    const cost = levelCost(YOKAI_BY_ID.dudu, 1);
    const [next, r] = levelUp(s, T0, 'dudu', 1);
    expect(r).toEqual({ ok: true, levels: 1, spent: cost });
    expect(next.res.coin).toBe(s.res.coin - cost);
    expect(power(next)).toBeGreaterThan(before);
  });

  it('칭호에 따른 레벨 상한을 넘지 못한다', () => {
    const s = newGame(T0, 1);
    s.res.coin = 1e12;
    const [next] = levelUp(s, T0, 'dudu', 999);
    expect(next.yokai.dudu.level).toBe(levelCap(0));
    expect(levelUp(next, T0, 'dudu', 1)[1]).toEqual({ ok: false, reason: 'max-level' });
  });

  it('없는 식객은 올릴 수 없다', () => {
    expect(levelUp(newGame(T0, 1), T0, 'dalbi', 1)[1]).toEqual({ ok: false, reason: 'not-owned' });
  });

  it('레벨을 올리기 전까지 쌓인 몫은 예전 생산량으로 정산된다', () => {
    const s = newGame(T0, 1);
    const oldRate = ratesPerMinute(s).coin;
    const [next] = levelUp(s, T0 + 30 * MINUTE, 'bangul', 1);
    expect(next.store.coin).toBeCloseTo(oldRate * 30);
    expect(ratesPerMinute(next).coin).toBeGreaterThan(oldRate);
  });
});

describe('잔치와 승급', () => {
  it('잔치는 곡식을 내고 명성을 준다', () => {
    const s = newGame(T0, 1);
    s.res.grain = feastCost(0);
    const [next, r] = feast(s, T0);
    expect(r.ok).toBe(true);
    expect(next.res.grain).toBe(0);
    expect(next.res.fame).toBeGreaterThan(0);
    expect(feast(next, T0)[1]).toEqual({ ok: false, reason: 'no-grain' });
  });

  it('위세와 명성이 모두 차야 승급하고, 칭호 식객이 합류한다', () => {
    let s = newGame(T0, 1);
    s.rank = 1;
    s.res.fame = RANKS[2].fameCost;
    expect(promote(s, T0)[1]).toEqual({ ok: false, reason: 'need-power' });
    s.yokai.dudu.level = 20;
    s.yokai.bangul.level = 20;
    s.yokai.sora.level = 20;
    const [next, r] = promote(s, T0);
    expect(r).toEqual({ ok: true, rank: 2, recruit: RANKS[2].recruit });
    expect(next.res.fame).toBe(0);
    expect(next.yokai[RANKS[2].recruit!]).toEqual({ level: 1 });
    s = next;
  });
});

describe('뚝딱 소원', () => {
  it('횟수를 쓰고 소원을 하나 받는다. 새로고침해도 같은 소원이다', () => {
    const s = newGame(T0, 1);
    const [a, r] = useWish(s, T0);
    expect(r.ok).toBe(true);
    expect(a.wish.charges).toBe(s.wish.charges - 1);
    const [again, r2] = useWish(a, T0);
    expect(again.wish.charges).toBe(a.wish.charges);
    expect(r2.ok && r.ok && r2.wish.id).toBe(r.ok && r.wish.id);
  });

  it('선택하면 보상을 받고 대기 중인 소원이 사라진다', () => {
    const [a, r] = useWish(newGame(T0, 1), T0);
    if (!r.ok) throw new Error('wish');
    const [b, c] = chooseWish(a, T0, 0);
    expect(c.ok).toBe(true);
    expect(b.wish.pending).toBeNull();
    if (c.ok) expect(b.res[c.kind]).toBe(a.res[c.kind] + c.amount);
  });

  it('횟수는 일정 시간마다 최대치까지 다시 찬다', () => {
    let s = newGame(T0, 1);
    for (let i = 0; i < wishMaxCharges(0); i++) {
      s = useWish(s, T0)[0];
      s = chooseWish(s, T0, 0)[0];
    }
    expect(s.wish.charges).toBe(0);
    expect(useWish(s, T0)[1]).toEqual({ ok: false, reason: 'no-charge' });
    expect(settle(s, T0 + BALANCE.wishRegenMinutes * MINUTE).wish.charges).toBe(1);
    expect(settle(s, T0 + 100 * BALANCE.wishRegenMinutes * MINUTE).wish.charges).toBe(wishMaxCharges(0));
  });
});

describe('소동 해결', () => {
  it('일손이 모자라면 일부만 잠재우고 진행이 남는다', () => {
    const s = newGame(T0, 1);
    const need = handsNeeded(s)!;
    s.res.hands = Math.floor(need / 2);
    const [next, r] = challengeStage(s, T0);
    expect(r.ok && r.cleared).toBe(false);
    expect(next.res.hands).toBe(0);
    expect(next.stage.damage).toBeGreaterThan(0);
    expect(handsNeeded(next)!).toBeLessThan(need);
  });

  it('일손이 넉넉하면 해결하고 보상을 받는다', () => {
    const s = newGame(T0, 1);
    s.res.hands = 1e9;
    const [next, r] = challengeStage(s, T0);
    expect(r.ok && r.cleared).toBe(true);
    expect(next.stage).toEqual({ index: 1, damage: 0 });
    expect(next.res.fame).toBe(stageInfo(0)!.fame);
  });

  it('장의 대장을 달래면 식객으로 합류한다', () => {
    const s = newGame(T0, 1);
    s.stage.index = STAGES_PER_CHAPTER - 1;
    s.res.hands = 1e12;
    const [next, r] = challengeStage(s, T0);
    expect(r.ok && r.recruit).toBe('kkulkkeok');
    expect(next.yokai.kkulkkeok).toEqual({ level: 1 });
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
    expect(deserialize('{"version":99}', T0)).toBeNull();
    expect(importCode('!!!', T0)).toBeNull();
  });

  it('예전 저장에 새 필드가 없어도 기본값으로 채운다', () => {
    const s = newGame(T0, 1) as unknown as Record<string, unknown>;
    delete s.totals;
    const loaded = deserialize(JSON.stringify(s), T0)!;
    expect(loaded.totals).toEqual({ wishes: 0, feasts: 0, stages: 0, collected: 0 });
  });
});
