// 시제품(자동 진행 도트 RPG): 맵·대본·진행기·밸런스
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHARS, MONS } from '../src/proto/atlas';
import { FOES, ITEMS } from '../src/proto/data';
import { MAPS, grid, walkable, type MapId } from '../src/proto/maps';
import { giveExp, overwhelms } from '../src/proto/party';
import { buy, labelAt, newGame, step, type Game, type Input } from '../src/proto/runner';
import { SCRIPT } from '../src/proto/story';
import { CUTIN_MS } from '../src/proto/Battle';

interface Plan {
  picks?: Record<string, number>;
  visits?: number[];
  collect: string[];
}

/** 선택을 정해 두고 끝까지 자동으로 진행한다 */
function playthrough(plan: Plan) {
  let r = step(newGame());
  let battles = 0;
  let losses = 0;
  let visitTurn = 0;
  for (let guard = 0; r.fx.k !== 'end'; guard++) {
    if (guard > 3000) throw new Error('끝나지 않아요');
    const { g, fx } = r;
    let input: Input = { k: 'ok' };
    if (fx.k === 'choice') {
      const b = SCRIPT[g.pc];
      if (b.t === 'visit') {
        // 남은 선택지 안에서의 번호
        const want = plan.visits?.[visitTurn++] ?? 0;
        const done = g.picked[b.id] ?? [];
        const left = b.options.map((_, i) => i).filter((i) => !done.includes(i));
        input = { k: 'pick', i: Math.max(0, left.indexOf(want)) };
      } else if (b.t === 'choice') input = { k: 'pick', i: plan.picks?.[b.id] ?? 0 };
    } else if (fx.k === 'collect') input = { k: 'collect', ids: plan.collect };
    else if (fx.k === 'gift') input = { k: 'pick', i: 0 };
    else if (fx.k === 'defeat') {
      losses++;
      input = { k: 'train' };
    } else if (fx.k === 'battle') battles++;
    r = step(g, input);
  }
  return { g: r.g, battles, losses };
}

describe('맵(Tiled)', () => {
  for (const id of Object.keys(MAPS) as MapId[]) {
    it(`${id}: 땅·장식 층이 맵 크기와 맞고, 사람·상자·지점이 설 수 있는 칸에 있다`, () => {
      const def = MAPS[id];
      expect(def.ground.length).toBe(def.h);
      for (const row of def.ground) {
        expect(row.length).toBe(def.w);
        for (const c of row) expect('.:_# ').toContain(c);
      }
      for (const d of def.deco) expect(d.x < def.w && d.y < def.h, `${id} 장식 ${d.x},${d.y}`).toBe(true);
      const g = grid(id);
      for (const a of def.actors) expect(walkable(g, a.at), `${id} ${a.id}`).toBe(true);
      for (const [name, p] of Object.entries(def.points)) expect(walkable(g, p), `${id} 지점 ${name}`).toBe(true);
      const decoAt = new Set(def.deco.map((d) => `${d.x},${d.y}`));
      for (const c of def.chests) {
        expect(decoAt.has(`${c.at.x},${c.at.y}`), `${id} ${c.id}는 장식 위에 있으면 안 된다`).toBe(false);
        expect(def.ground[c.at.y][c.at.x], `${id} ${c.id}`).toMatch(/[.:_]/);
      }
    });
  }

  it('맵이 쓰는 그림이 모두 그림 묶음에 있다', () => {
    for (const def of Object.values(MAPS))
      for (const a of def.actors) {
        if (a.char) expect(CHARS).toHaveProperty(a.char);
        if (a.mon) expect(MONS).toHaveProperty(a.mon);
      }
    for (const f of Object.values(FOES)) for (const u of f.waves.flat()) expect(u.char ? CHARS : MONS).toHaveProperty((u.char ?? u.mon)!);
    for (const def of Object.values(MAPS)) for (const c of def.chests) if (c.item) expect(ITEMS).toHaveProperty(c.item);
    for (const def of Object.values(MAPS)) for (const d of def.deco) expect(d.sx < 256 && d.sy < 176, `${def.id} ${d.sx},${d.sy}`).toBe(true);
  });

  it('대본이 쓰는 이름 지점이 그 맵에 모두 있다', () => {
    let map: MapId = 'backhill';
    for (const b of SCRIPT) {
      if (b.t === 'map') {
        map = b.map;
        if (typeof b.at === 'string') expect(MAPS[map].points, `${map} ${b.at}`).toHaveProperty([b.at]);
      }
      if ((b.t === 'walk' && typeof b.to === 'string') || (b.t === 'place' && typeof b.at === 'string')) {
        const name = b.t === 'walk' ? b.to : b.at;
        expect(Object.keys(MAPS[map].points), `${map} ${name}`).toContain(name);
      }
    }
  });
});

describe('대본', () => {
  it('이름표·대사·장비가 모두 맞고 한자가 없다', () => {
    for (const b of SCRIPT) {
      if (b.t === 'goto' || b.t === 'if') labelAt(b.t === 'goto' ? b.label : b.goto);
      if (b.t === 'choice') for (const o of b.options) if (o.goto) labelAt(o.goto);
      if (b.t === 'visit') for (const o of b.options) labelAt(o.label);
      if (b.t === 'battle') expect(FOES).toHaveProperty(b.foe);
      if (b.t === 'give') expect(ITEMS).toHaveProperty(b.item);
    }
    expect(JSON.stringify(SCRIPT)).not.toMatch(/[一-鿿]/);
    // 대사에 띄우는 물건 그림이 모두 있다
    const imgs = new Set(JSON.stringify(SCRIPT).match(/"img":"[^"]+"/g)?.map((m) => m.slice(7, -1)));
    expect(imgs.size).toBeGreaterThan(0);
    for (const n of imgs) expect(existsSync(`public/art/item/${n}.webp`), n).toBe(true);
    // 장면 그림도 모두 있다
    const scenes = new Set(JSON.stringify(SCRIPT).match(/"scene":"[^"]+"/g)?.map((m) => m.slice(9, -1)));
    expect(scenes.size).toBeGreaterThan(0);
    for (const n of scenes) expect(existsSync(`public/proto/scene/${n}.webp`), n).toBe(true);
  });

  const collects = [['wages', 'hens'], ['wages', 'gamble'], ['hens', 'gamble'], ['wages']];
  const visits = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];
  for (const road of [0, 1])
    for (const assault of [0, 1])
      it(`길 ${road ? '돌아가는 길' : '지름길'} · ${assault ? '보초 먼저' : '곧장'}: 들를 곳·받아내기 조합마다 지지 않고 끝까지 간다`, () => {
        for (const v of visits)
          for (const c of collects) {
            const r = playthrough({ picks: { road, assault }, visits: v, collect: c });
            expect(r.g.done, `${v} ${c}`).toBe(true);
            expect(r.losses, `${v} ${c}`).toBe(0);
            expect(r.g.party.map((m) => m.id)).toEqual(['me', 'baekseol', 'muyeong']);
          }
      });

  it('백설 거래·첫 잔 선택이 깃발과 기록으로 남는다', () => {
    const r = playthrough({ picks: { deal: 1, first_cup: 1 }, collect: ['wages', 'hens'] });
    expect(r.g.flags).toEqual(expect.arrayContaining(['asked_name', 'first_cup_baekseol', 'paid_wages', 'hens']));
    expect(r.g.log).toContain('첫 잔은 백설에게');
    expect(r.g.party[0].charm).toBe('amulet');
  });

  // 2화(백설 화): 고를 거리마다 백설의 반응이 갈린다
  for (const pick of [0, 1])
    it(`백설 화: 떡값·파락호·외상값·거울 선택을 모두 ${pick ? '둘째' : '첫째'}로 골라도 지지 않고 끝까지 가고 깃발이 남는다`, () => {
      const picks = { rice_cake: pick, rake: pick, tab: pick, mirror: pick };
      for (const road of [0, 1]) {
        const r = playthrough({ picks: { ...picks, road }, collect: ['wages'] });
        expect(r.g.done).toBe(true);
        expect(r.losses).toBe(0);
        expect(r.g.flags).toEqual(expect.arrayContaining(pick ? ['bs_haggled', 'left_to_bs', 'me_collected', 'bs_night_alone'] : ['paid_cake', 'stood_for_bs', 'bs_collected', 'bs_night_stay']));
      }
    });

  it('노름빚을 받아 주면 지름길 첫 패거리가 길을 비켜 준다', () => {
    const withGamble = playthrough({ picks: { road: 0 }, collect: ['hens', 'gamble'] });
    const without = playthrough({ picks: { road: 0 }, collect: ['wages', 'hens'] });
    expect(withGamble.battles).toBe(without.battles - 1);
  });
});

describe('지루하지 않게', () => {
  /** ×1 속도로 보여 주는 데 걸리는 시간(밀리초) 어림. 화면(Field·Battle·Panels)의 박자와 같게 */
  const DELAY: Record<string, number> = { wave: 700, skill: 650, hit: 430, heal: 380, shield: 320, buff: 380, stunned: 380, down: 320 };
  function ms(fx: ReturnType<typeof step>['fx']): number {
    switch (fx.k) {
      case 'walk':
        return Math.max(fx.path.length * 250, fx.say.length * 1900);
      case 'talk':
        return fx.lines.reduce((s, l) => s + 900 + l.text.length * 35, 0);
      case 'battle':
        return 2000 + fx.events.reduce((s, e) => s + (DELAY[e.t] ?? 0) + (e.t === 'skill' && e.side === 0 ? CUTIN_MS : 0), 0);
      case 'cutscene':
        return 1000 + fx.lines.length * 1100;
      default:
        return 1300;
    }
  }

  it('어느 길로 가도 고를 거리 사이가 ×1 속도로 3분을 넘지 않는다', () => {
    for (const road of [0, 1]) {
      let r = step(newGame());
      let since = 0;
      let worst = 0;
      for (let guard = 0; r.fx.k !== 'end' && guard < 3000; guard++) {
        const fx = r.fx;
        const decide = fx.k === 'choice' || fx.k === 'collect' || fx.k === 'shop' || fx.k === 'gift';
        if (decide) {
          worst = Math.max(worst, since);
          since = 0;
        } else since += ms(fx);
        const b = SCRIPT[r.g.pc];
        const input: Input =
          fx.k === 'collect' ? { k: 'collect', ids: ['wages'] } : fx.k === 'choice' ? { k: 'pick', i: b.t === 'choice' && b.id === 'road' ? road : 0 } : fx.k === 'gift' ? { k: 'pick', i: 0 } : { k: 'ok' };
        r = step(r.g, input);
      }
      expect(Math.max(worst, since), `길 ${road}`).toBeLessThan(180_000);
    }
  });
});

describe('진행기', () => {
  /** 대본에서 처음 나오는 그 적과의 전투 직전까지 간다 */
  function before(foe: string): Game {
    let r = step(newGame());
    for (let guard = 0; guard < 2000; guard++) {
      const b = SCRIPT[r.g.pc];
      if (b.t === 'battle' && b.foe === foe && (r.fx.k === 'battle' || r.fx.k === 'swift')) return r.g;
      const input: Input = r.fx.k === 'collect' ? { k: 'collect', ids: ['wages'] } : r.fx.k === 'choice' || r.fx.k === 'gift' ? { k: 'pick', i: 0 } : { k: 'ok' };
      r = step(r.g, input);
    }
    throw new Error(`${foe} 전투를 못 찾았어요`);
  }

  it('같은 상태면 전투 결과가 같다', () => {
    const g = before('keeper');
    const a = step(g);
    const b = step(g);
    expect(a.fx.k).toBe('battle');
    expect(JSON.stringify(a.fx)).toBe(JSON.stringify(b.fx));
  });

  it('파티가 세 레벨 이상 높으면 싸우지 않고 이기고, 대장은 예외다', () => {
    const party = newGame().party.map((m) => ({ ...m, level: 10 }));
    expect(overwhelms(party, FOES.toll1)).toBe(true);
    expect(overwhelms(party, FOES.keeper)).toBe(false);
    const g = before('toll1');
    const strong = { ...g, party: g.party.map((m) => ({ ...m, level: 12 })) };
    const r = step(strong);
    expect(r.fx.k).toBe('swift');
    const next = step(strong, { k: 'ok' });
    expect(next.g.pc).toBeGreaterThan(strong.pc);
  });

  it('지면 마지막 쉼터로 돌아가고, 경험치는 남으며, 수련으로 세진다', () => {
    const g = before('keeper');
    const weak: Game = { ...g, party: [{ id: 'me', level: 2, exp: 5 }] };
    const fought = step(weak);
    expect(fought.fx.k).toBe('battle');
    expect(fought.fx.k === 'battle' && fought.fx.result.won).toBe(false);
    const lost = step(weak, { k: 'ok' });
    expect(lost.fx.k).toBe('defeat');
    expect(lost.g.pc).toBe(weak.check!.pc);
    expect(lost.g.party[0].exp).toBe(5);
    const trained = step(lost.g, { k: 'train' });
    expect(trained.fx.k).toBe('talk');
    const before3 = trained.g.party.reduce((s, m) => s + m.level * 1000 + m.exp, 0);
    expect(before3).toBeGreaterThan(weak.party.reduce((s, m) => s + m.level * 1000 + m.exp, 0));
  });

  it('장터: 엽전이 모자라면 못 사고, 사면 그 칸에 낀다', () => {
    const g = newGame();
    const poor = buy({ ...g, coin: 10 }, 'oakclub', 'me');
    expect(poor.party[0].weapon).toBeUndefined();
    const rich = buy({ ...g, coin: 100 }, 'oakclub', 'me');
    expect(rich.coin).toBe(100 - ITEMS.oakclub.price);
    expect(rich.party[0].weapon).toBe('oakclub');
  });

  it('경험치가 차면 레벨이 오른다', () => {
    const { party, ups } = giveExp([{ id: 'me', level: 1, exp: 0 }], 30);
    expect(party[0].level).toBe(2);
    expect(ups).toEqual([{ id: 'me', level: 2 }]);
  });

  it('기술은 이야기에서 얻는다: 첫 전투는 기본 공격만, 백설은 창고지기전 첫 차례에 여우불', () => {
    const first = step(before('beast'));
    expect(first.fx.k).toBe('battle');
    if (first.fx.k !== 'battle') return;
    expect(first.fx.setup.allies.every((a) => !a?.skill)).toBe(true);
    expect(first.fx.events.some((e) => e.t === 'skill' && e.side === 0)).toBe(false);

    const kg = before('keeper');
    expect(kg.skills).toEqual(['baekseol']);
    const keeper = step(kg);
    if (keeper.fx.k !== 'battle') throw new Error('창고지기 전투가 아니에요');
    const bs = keeper.fx.setup.allies.findIndex((a) => a?.id === 'baekseol');
    const acts = keeper.fx.events.filter((e) => (e.t === 'act' || e.t === 'skill') && e.side === 0 && e.slot === bs);
    // 백설의 첫 차례 바로 다음 사건이 기술이다
    expect(acts[0].t).toBe('act');
    expect(acts[1]).toMatchObject({ t: 'skill', name: '여우불 홀림' });
    // 이기고 나면 '막 얻은 기술'은 비워진다
    expect(step(kg, { k: 'ok' }).g.fresh).toEqual([]);
  });

  it('끝까지 가면 셋 다 기술을 얻는다', () => {
    const r = playthrough({ collect: ['wages'] });
    expect([...r.g.skills].sort()).toEqual(['baekseol', 'me', 'muyeong']);
  });

  it('저장한 상태를 그대로 불러와 같은 곳부터 이어 간다', () => {
    const g = before('beast');
    const copy = JSON.parse(JSON.stringify(g)) as Game;
    expect(JSON.stringify(step(copy).fx)).toBe(JSON.stringify(step(g).fx));
  });
});
