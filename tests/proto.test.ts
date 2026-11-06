// 시제품(자동 진행 도트 RPG): 맵·대본·진행기·밸런스
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MONS, TILES } from '../src/proto/atlas';
import { CHARS32 } from '../src/proto/atlas32';
import { FOES, ITEMS, MEMBER_NAME } from '../src/proto/data';
import { MAPS, grid, walkable, type MapId } from '../src/proto/maps';
import { battleSetup, bondTier, giveExp, overwhelms } from '../src/proto/party';
import { negoApply, negoOptions, type NegoBeat } from '../src/proto/nego';
import type { MemberId } from '../src/proto/types';
import { SCRIPT_SIG, buy, ep4Start, labelAt, migrate, newGame, nextSide, revive, step, trialStart, visibleLines, type Game, type Input } from '../src/proto/runner';
import { SCRIPT } from '../src/proto/story';
import { QUESTS } from '../src/proto/quests';
import { DEX } from '../src/proto/dex';
import { CUTIN_MS } from '../src/proto/Battle';

/** 받아내기: 계획한 빚 가운데 이 장면에 있는 것만, 없으면 첫째 빚 */
function collectIds(g: Game, wanted: string[]) {
  const b = SCRIPT[g.pc];
  if (b.t !== 'collect') return wanted;
  const ids = b.debts.map((d) => d.id).filter((id) => wanted.includes(id));
  return ids.length ? ids : [b.debts[0].id];
}

interface Plan {
  picks?: Record<string, number>;
  /** 들를 곳(visit id)마다 고를 차례. 없으면 남은 것 가운데 첫째 */
  visits?: Record<string, number[]>;
  collect: string[];
  /** 이 식객에게 마음을 쏟는다: 선택은 그 식객 정이 가장 오르는 쪽, 오두막의 하루는 그 식객부터 */
  favor?: MemberId;
  /** 의뢰판에서 앞의 것(first)부터, 뒤의 것(last)부터, 안 받기(none, 기본) */
  board?: 'first' | 'last' | 'none' | number;
}

const SHORT: Partial<Record<MemberId, string>> = { baekseol: 'bs', muyeong: 'mu', sodam: 'sd' };

/** 선택을 정해 두고 끝까지 자동으로 진행한다 */
function playthrough(plan: Plan) {
  let r = step(newGame());
  let battles = 0;
  let losses = 0;
  for (let guard = 0; r.fx.k !== 'end'; guard++) {
    if (guard > 3000) throw new Error('끝나지 않아요');
    const { g, fx } = r;
    let input: Input = { k: 'ok' };
    if (fx.k === 'choice') {
      const b = SCRIPT[g.pc];
      if (b.t === 'visit') {
        // 남은 선택지 안에서의 번호
        const fav = plan.favor && SHORT[plan.favor] ? b.options.findIndex((o) => o.label.endsWith(`_${SHORT[plan.favor!]}`)) : -1;
        const want = plan.visits?.[b.id]?.[(g.picked[b.id] ?? []).length] ?? (fav >= 0 ? fav : 0);
        const done = g.picked[b.id] ?? [];
        const left = b.options.map((_, i) => i).filter((i) => !done.includes(i));
        input = { k: 'pick', i: Math.max(0, left.indexOf(want)) };
      } else if (b.t === 'board') {
        const n = fx.options.length - 1;
        input = { k: 'pick', i: typeof plan.board === 'number' ? Math.min(plan.board, n - 1) : plan.board === 'first' ? 0 : plan.board === 'last' ? n - 1 : n };
      } else if (b.t === 'choice') {
        const best = plan.favor ? b.options.reduce((m, o, i) => ((o.bond?.[plan.favor!] ?? 0) > (b.options[m].bond?.[plan.favor!] ?? 0) ? i : m), 0) : 0;
        input = { k: 'pick', i: plan.picks?.[b.id] ?? best };
      }
    } else if (fx.k === 'collect') input = { k: 'collect', ids: collectIds(g, plan.collect) };
    // 선물은 장신구가 빈 사람에게(없으면 첫째)
    else if (fx.k === 'gift') {
      const empty = g.party.findIndex((m) => !(fx.item?.slot === 'charm' ? m.charm : m.weapon));
      input = { k: 'pick', i: !fx.item ? 0 : empty >= 0 ? empty : g.party.length - 1 };
    }
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
        for (const c of row) expect('.:_# ~=').toContain(c);
      }
      for (const d of def.deco) expect(d.x < def.w && d.y < def.h, `${id} 장식 ${d.x},${d.y}`).toBe(true);
      for (const l of def.lights) expect(l.x >= 0 && l.y >= 0 && l.x <= def.w && l.y <= def.h && l.radius > 0, `${id} 불빛 ${l.name}`).toBe(true);
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
        if (a.char) expect(CHARS32).toHaveProperty(a.char);
        if (a.mon) expect(MONS).toHaveProperty(a.mon);
      }
    for (const f of Object.values(FOES)) for (const u of f.waves.flat()) expect(u.char ? CHARS32 : MONS).toHaveProperty((u.char ?? u.mon)!);
    for (const def of Object.values(MAPS)) for (const c of def.chests) if (c.item) expect(ITEMS).toHaveProperty(c.item);
    // 장식 칸이 tiles.png 안에 있다(시트 크기는 그림 좌표표에서)
    const sheetH = Math.max(...Object.values(TILES).map((r) => r[1] + r[3]));
    for (const def of Object.values(MAPS)) for (const d of def.deco) expect(d.sx < 256 && d.sy + 16 <= sheetH, `${def.id} ${d.sx},${d.sy}`).toBe(true);
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
            const r = playthrough({ picks: { road, assault }, visits: { village: v }, collect: c });
            expect(r.g.done, `${v} ${c}`).toBe(true);
            expect(r.losses, `${v} ${c}`).toBe(0);
            expect(r.g.party.map((m) => m.id)).toEqual(['me', 'baekseol', 'muyeong', 'sodam']);
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

// 4화(우렁각시): 숨을 자리·붙잡는 법·받아낼 것·치수·관직 선택이 갈리고, 소담이 합류한다
describe('오두막의 하루·곁이야기', () => {
  /** 기본 선택으로 진행해 4화 뒤 오두막의 하루 고르기 앞에 세운다 */
  const atDay4 = () => {
    let r = step(newGame());
    for (let i = 0; i < 5000; i++) {
      const b = SCRIPT[r.g.pc];
      if (b.t === 'visit' && b.id === 'day4') return r;
      const input: Input = r.fx.k === 'collect' && b.t === 'collect' ? { k: 'collect', ids: [b.debts[0].id] } : r.fx.k === 'choice' || r.fx.k === 'gift' ? { k: 'pick', i: 0 } : r.fx.k === 'defeat' ? { k: 'train' } : { k: 'ok' };
      r = step(r.g, input);
    }
    throw new Error('오두막의 하루에 닿지 못했어요');
  };
  /** 고른 뒤 다음 선택까지 */
  const nextChoice = (g: Game, input: Input) => {
    let r = step(g, input);
    for (let i = 0; i < 200 && r.fx.k !== 'choice'; i++) r = step(r.g, { k: 'ok' });
    return r;
  };

  it('곁이야기는 순서대로, 정과 진행이 닿아야 열린다', () => {
    const r = atDay4();
    const g = { ...r.g, flags: r.g.flags.filter((f) => !/^(bs|mu|sd)\d_done$/.test(f)) };
    expect(nextSide({ ...g, bond: { baekseol: 5 } }, 'baekseol')).toBeNull();
    expect(nextSide({ ...g, bond: { baekseol: 99 } }, 'baekseol')?.label).toBe('side_bs_1');
    expect(nextSide({ ...g, bond: { baekseol: 99 }, flags: [...g.flags, 'bs1_done'] }, 'baekseol')?.label).toBe('side_bs_2');
    // 셋째 편은 5화 뒤 오두막의 하루(day5)를 지나야
    expect(nextSide({ ...g, bond: { baekseol: 99 }, flags: [...g.flags, 'bs1_done', 'bs2_done'] }, 'baekseol')).toBeNull();
    expect(nextSide({ ...g, bond: { baekseol: 99 }, flags: [...g.flags, 'bs1_done', 'bs2_done', 'day5'] }, 'baekseol')?.label).toBe('side_bs_3');
  });

  it('정이 모자라면 곁이야기 대신 그날의 짧은 이야기만 나온다', () => {
    const r = atDay4();
    const c = nextChoice({ ...r.g, bond: { ...r.g.bond, baekseol: 5 } }, { k: 'pick', i: 0 });
    expect(SCRIPT[c.g.pc]).toMatchObject({ t: 'choice', id: 'd4_bs_small' });
  });

  for (const who of ['baekseol', 'muyeong', 'sodam'] as const)
    it(`${MEMBER_NAME[who]}에게 마음을 쏟으면 곁이야기 세 편을 다 보고, 지지 않고 끝까지 간다`, () => {
      const r = playthrough({ favor: who, collect: ['wages'] });
      const s = SHORT[who];
      expect(r.g.done).toBe(true);
      expect(r.losses).toBe(0);
      expect(r.g.flags).toEqual(expect.arrayContaining([`${s}1_done`, `${s}2_done`, `${s}3_done`]));
    });

  it('오두막의 하루에서 장터·수련·마을 일만 골라도 끝까지 간다', () => {
    const extras: Record<string, number[]> = {};
    for (const b of SCRIPT) if (b.t === 'visit' && /^day\d+$/.test(b.id)) extras[b.id] = b.options.map((o, i) => (/_(market|train|work)$/.test(o.label) ? i : -1)).filter((i) => i >= 0);
    const r = playthrough({ visits: extras, collect: ['wages'] });
    expect(r.g.done).toBe(true);
    expect(r.losses).toBe(0);
    expect(r.g.flags).toEqual(expect.arrayContaining(['day2', 'day3', 'day4', 'day5', 'day6', 'day7', 'day8', 'day9', 'day10']));
  });

  it('마을 의뢰 스물여섯이 모두 이어지고, 받아도 지지 않고 끝까지 간다', () => {
    const boardAll: Record<string, number[]> = {};
    for (const b of SCRIPT) if (b.t === 'visit' && /^day\d+$/.test(b.id)) boardAll[b.id] = [b.options.findIndex((o) => /_board$/.test(o.label))];
    const seen = new Set<string>();
    for (const board of ['first', 'last', 1] as const) {
      const r = playthrough({ visits: boardAll, board, collect: ['wages'] });
      expect(r.g.done).toBe(true);
      expect(r.losses).toBe(0);
      for (const f of r.g.flags) if (QUESTS.some((q) => f === `q_${q.id}`)) seen.add(f);
    }
    expect([...seen].sort()).toEqual(QUESTS.map((q) => `q_${q.id}`).sort());
  });

  it('도감: 대본에 나오는 사람·적 이름이 모두 도감 어딘가에 있고, 끝까지 가면 대부분 열린다', () => {
    const names = new Set<string>();
    for (const m of JSON.stringify(SCRIPT).matchAll(/"who":"npc:([^"]+)"/g)) names.add(m[1]);
    for (const b of SCRIPT) if (b.t === 'nego') names.add(b.who);
    for (const g of Object.values(FOES)) for (const w of g.waves) for (const u of w) names.add(u.name);
    const keys = new Set(DEX.flatMap((e) => e.keys));
    expect([...names].filter((x) => !keys.has(x))).toEqual([]);
    const r = playthrough({ collect: ['wages'] });
    const seen = new Set(r.g.seen ?? []);
    const open = DEX.filter((e) => (e.member && r.g.party.some((m) => m.id === e.member)) || e.keys.some((k) => seen.has(k)));
    expect(open.length).toBeGreaterThanOrEqual(DEX.length - 2);
  });

  it('대본이 바뀐 저장은 같은 목표의 첫머리(지도 옮김)부터 이어 간다', () => {
    const r = atDay4();
    const moved = migrate({ ...r.g, sig: 'old', pc: r.g.pc + 3, stack: [1, 2] });
    expect(SCRIPT[moved.pc].t).toBe('map');
    expect(moved.stack).toEqual([]);
    expect(migrate({ ...r.g, sig: SCRIPT_SIG })).toEqual({ ...r.g, sig: SCRIPT_SIG });
  });
});

describe('11화 보강', () => {
  for (const pick of [0, 1, 2])
    it(`첫 결재를 ${['흑운채 심리', '장부 내걸기', '이름 문의서'][pick]}로 해도 창고 불·자객전을 지나 끝까지 간다`, () => {
      const r = playthrough({ picks: { first11: pick, soot11: pick % 2, wound11: pick % 2 }, collect: ['wages'] });
      expect(r.losses).toBe(0);
      expect(r.g.flags).toContain(['first_heukun', 'first_ledger', 'first_name'][pick]);
      expect(r.g.flags).toContain(pick % 2 ? 'soot_scolded' : 'soot_wiped');
      expect(r.g.flags).toContain(pick % 2 ? 'mu_asked_why' : 'mu_bandaged');
    });
});

describe('4화', () => {
  for (const pick of [0, 1])
    it(`선택을 모두 ${pick ? '둘째' : '첫째'}로 골라도 지지 않고 끝까지 가고 깃발이 남는다`, () => {
      const r = playthrough({ picks: { suspect: pick, hide: pick, catch: pick, measure: pick, office: pick, tactic4: pick }, visits: { market4: [pick] }, collect: ['wages'] });
      expect(r.g.done).toBe(true);
      expect(r.losses).toBe(0);
      expect(r.g.flags).toEqual(
        expect.arrayContaining(pick ? ['hid_muyeong', 'caught_rough', 'measured_back', 'took_office_ledger', 'clue_tab'] : ['hid_baekseol', 'caught_gently', 'measured', 'took_office', 'clue_well']),
      );
      // 협상은 이기든 지든 결과가 깃발로 남고 이야기는 이어진다
      expect(r.g.flags.some((f) => f === 'boss_paid_full' || f === 'boss_paid_part')).toBe(true);
    });

  it('소담이 있으면 장터 값을 한 할 깎는다', () => {
    const g = newGame();
    const withSodam = buy({ ...g, coin: 100, party: [...g.party, { id: 'sodam', level: 1, exp: 0 }] }, 'oakclub', 'me');
    expect(withSodam.coin).toBe(100 - Math.floor(ITEMS.oakclub.price * 0.9));
  });

  it('데려간 식객이 없으면 그 식객의 잡담은 나오지 않는다', () => {
    const g = newGame();
    const lines = visibleLines(g, [{ who: 'sodam', text: '소담 잡담', with: 'sodam' }, { who: 'me', text: '혼잣말' }]);
    expect(lines.map((l) => l.text)).toEqual(['혼잣말']);
  });
});

describe('5화', () => {
  for (const pick of [0, 1, 2])
    it(`백설에게 ${['장부를 뒤집자', '이름을 받아 오겠다', '듣기만 한다'][pick]}고 해도 끝까지 가고 깃발이 남는다`, () => {
      // 들르기: 1화 둘, 4화 하나, 5화 둘(과부댁·주막 / 주막·아낙 / 과부댁·아낙)
      const v5 = [[0, 1], [1, 2], [0, 2]][pick];
      const r = playthrough({ picks: { name5: pick }, visits: { market5: v5 }, collect: ['wages'] });
      expect(r.g.done).toBe(true);
      expect(r.losses).toBe(0);
      expect(r.g.flags).toContain(['bs_vow_ledger', 'bs_vow_name', 'bs_vow_listen'][pick]);
      expect(r.g.flags).toEqual(expect.arrayContaining([['clue_heir', 'clue_twelve'], ['clue_twelve', 'clue_list'], ['clue_heir', 'clue_list']][pick]));
      expect(r.g.flags.some((f) => f === 'chae_sealed' || f === 'chae_unsealed')).toBe(true);
    });

  it('송채령에겐 홀림·위협이 잘 안 먹히고, 장부와 단서로 꺾는다', () => {
    const chae = SCRIPT.find((b) => b.t === 'nego' && b.id === 'chaeryeong') as NegoBeat;
    const st = { id: chae.id, left: chae.resolve, turn: 0, used: [] as string[] };
    expect(negoApply(chae, st, 'charm').st.left).toBeGreaterThan(negoApply(chae, st, 'bat').st.left - 5);
    let bat = st;
    for (let i = 0; i < chae.turns; i++) bat = negoApply(chae, bat, 'bat').st;
    expect(bat.left).toBeGreaterThan(0);
    let mix = st;
    for (const p of ['ledger', 'clue_heir', 'clue_twelve']) mix = negoApply(chae, mix, p).st;
    expect(mix.left).toBe(0);
  });

  it('백설에게 진 빚이 있으면 그날 밤 그 빚을 받으러 온다', () => {
    const night = SCRIPT.flatMap((b) => (b.t === 'talk' ? b.lines : [])).filter((l) => l.if === 'bs_debt' || l.unless === 'bs_debt');
    const g = newGame();
    const owed = visibleLines({ ...g, flags: ['bs_debt'] }, night).map((l) => l.text);
    const free = visibleLines(g, night).map((l) => l.text);
    expect(owed.some((t) => t.includes('그 빚, 오늘 받을게요'))).toBe(true);
    expect(free.some((t) => t.includes('그 빚, 오늘 받을게요'))).toBe(false);
  });
});

describe('6화', () => {
  for (const pick of [0, 1, 2])
    it(`입회인·작전을 ${pick + 1}번째로 골라도 약해진 나와 함께 이기고 끝까지 간다`, () => {
      const r = playthrough({ picks: { inspect6: pick % 2, witness6: pick, tactic6: pick, warm6: pick % 2 }, collect: ['wages'] });
      expect(r.g.done).toBe(true);
      expect(r.losses).toBe(0);
      expect(r.g.flags).toContain(['wit_widow', 'wit_tab', 'wit_sodam'][pick]);
      expect(r.g.flags.some((f) => f === 'steward_talked' || f === 'steward_silent')).toBe(true);
      expect(r.g.log).toContain('창고 문을 여는 데 엽전 열세 닢과 기력을 치렀다');
    });

  it('기력이 빠진 사람은 체력과 공격이 깎인다', () => {
    const party = newGame().party;
    const base = battleSetup(party, FOES.oilmen, ['me']).allies[0]!;
    const weak = battleSetup(party, FOES.oilmen, ['me'], [], undefined, ['me']).allies[0]!;
    expect(weak.hp).toBeLessThan(base.hp);
    expect(weak.atk).toBeLessThan(base.atk);
  });

  it('엽전을 치르는 비트는 있는 만큼만 깎는다', () => {
    const i = SCRIPT.findIndex((b) => b.t === 'pay');
    const r = step({ ...newGame(), pc: i, coin: 5 });
    expect(r.g.coin).toBe(0);
  });
});

describe('7화', () => {
  for (const pick of [0, 1])
    it(`거적 밑에서 ${pick ? '똑똑히 보고' : '꼼짝 않고'} 증인에게 ${pick ? '약속만' : '품삯까지'} 해도 끝까지 간다`, () => {
      const r = playthrough({ picks: { peek7: pick, witness7: pick, tactic7: 1 }, collect: ['wages'] });
      expect(r.g.done).toBe(true);
      expect(r.g.flags).toContain(pick ? 'peeked' : 'hid_still');
      expect(r.g.flags).toContain(pick ? 'witness_shaky' : 'witness_safe');
      expect(r.g.flags.some((f) => f === 'jihu_fair' || f === 'jihu_promised')).toBe(true);
    });

  it('독사 대장전은 작전에 따라 결과가 갈릴 만큼 세다', () => {
    const results = [0, 1, 2].map((t) => playthrough({ picks: { tactic7: t }, collect: ['wages'] }).losses);
    // 적어도 한 작전은 한 번에 이긴다
    expect(Math.min(...results)).toBe(0);
  });
});

describe('8화', () => {
  for (const pick of [0, 1, 2])
    it(`무영의 고백에 ${['나눠 적겠다', '반을 지겠다', '왜 이제야'][pick]}고 해도 끝까지 간다`, () => {
      const r = playthrough({ picks: { mu8: pick, tea8: pick % 2 }, collect: ['wages'] });
      expect(r.g.done).toBe(true);
      expect(r.g.flags).toContain(['mu_fair', 'mu_share', 'mu_hurt'][pick]);
      expect(r.g.flags.some((f) => f === 'meok_sealed' || f === 'meok_copy')).toBe(true);
    });

  it('철곰은 버티기만 해서는 못 이기고, 몰아치면 이긴다', () => {
    const push = playthrough({ picks: { tactic8: 0 }, collect: ['wages'] });
    const safe = playthrough({ picks: { tactic8: 1 }, collect: ['wages'] });
    expect(push.losses).toBe(0);
    expect(safe.losses).toBeGreaterThan(0);
    expect(safe.g.done).toBe(true); // 지면 다시 하기로 이어 갈 수 있다
  });
});

describe('9화', () => {
  for (const pick of [0, 1])
    it(`채령에게 ${pick ? '백설의 담보를' : '장부를'} 묻고 끝까지 간다`, () => {
      const r = playthrough({ picks: { ask9: pick, count9: pick }, collect: ['wages'] });
      expect(r.g.done).toBe(true);
      expect(r.losses).toBe(0);
      expect(r.g.flags).toContain(pick ? 'bs_name_hint' : 'asked_ledger');
      expect(r.g.flags).toContain(pick ? 'rested_bs' : 'counted_alone');
      expect(r.g.flags.some((f) => f === 'butler_named' || f === 'private_silent')).toBe(true);
    });

  it('이름 칸이 빈 빚은 방망이로도 받아내지 못한다(금 가는 연출)', () => {
    const cut = SCRIPT.find((b) => b.t === 'cutscene' && b.lines.some((l) => l.includes('이름 칸이 비어')));
    expect(cut).toMatchObject({ broken: true });
  });
});

describe('10화', () => {
  for (const pick of [0, 1, 2])
    it(`잔치에서 ${['떡', '차', '빈 잔'][pick]}부터 골라도 끝까지 간다`, () => {
      const r = playthrough({ picks: { feast10: pick, stand10: pick % 2 }, collect: ['wages'] });
      expect(r.g.done).toBe(true);
      expect(r.losses).toBe(0);
      expect(r.g.flags).toContain(['feast_sodam', 'feast_mu', 'feast_bs'][pick]);
      expect(r.g.flags.some((f) => f === 'hearing_full' || f === 'hearing_part')).toBe(true);
    });

  /** 단서 없이 수단만으로 낼 수 있는 가장 센 조합(욕심껏 고르기) */
  const best = (b: NegoBeat, flags: string[]) => {
    let st = { id: b.id, left: b.resolve, turn: 0, used: [] as string[] };
    const c = { flags, party: ['me', 'baekseol', 'muyeong', 'sodam'] as MemberId[], skills: ['me', 'baekseol', 'muyeong', 'sodam'] as MemberId[] };
    for (let i = 0; i < b.turns && st.left > 0; i++) {
      const opts = negoOptions(b, st, c).filter((o) => !o.disabled);
      let pick = opts[0].id;
      let left = Infinity;
      for (const o of opts) {
        const l = negoApply(b, st, o.id).st.left;
        if (l < left) [left, pick] = [l, o.id];
      }
      st = negoApply(b, st, pick).st;
    }
    return st.left;
  };

  it('공개 심리는 수단만으로는 못 이기고, 모은 증거가 있어야 이긴다', () => {
    const hearing = SCRIPT.find((b) => b.t === 'nego' && b.id === 'hearing') as NegoBeat;
    expect(best(hearing, ['clue_ledger'])).toBeGreaterThan(0);
    expect(best(hearing, ['clue_ledger', 'meok_sealed', 'witness_safe'])).toBe(0);
  });

  it('같은 수단을 다시 쓰면 약해진다', () => {
    const hearing = SCRIPT.find((b) => b.t === 'nego' && b.id === 'hearing') as NegoBeat;
    const st = { id: hearing.id, left: hearing.resolve, turn: 0, used: [] as string[] };
    const once = negoApply(hearing, st, 'ledger');
    const twice = negoApply(hearing, once.st, 'ledger');
    expect(once.st.left - twice.st.left).toBeLessThan(hearing.resolve - once.st.left);
  });
});

describe('11화(1부 끝)', () => {
  for (const pick of [0, 1])
    it(`관복 고름에서 ${pick ? '물러서도' : '손을 잡아도'} 1부 끝까지 간다`, () => {
      const r = playthrough({ picks: { robe11: pick, tactic11: pick }, collect: ['wages'] });
      expect(r.g.done).toBe(true);
      expect(r.losses).toBe(0);
      expect(r.g.flags).toContain(pick ? 'robe_stepback' : 'robe_held');
      expect(r.g.flags.some((f) => f === 'song_shaken' || f === 'song_smiling')).toBe(true);
    });

  it('1부 마지막 줄이 있다', () => {
    const end = SCRIPT.findIndex((b) => b.t === 'end');
    const last = SCRIPT.slice(0, end).flatMap((b) => (b.t === 'talk' ? b.lines : [])).at(-1);
    expect(last?.text).toContain('1부');
  });
});

describe('3화 다듬기', () => {
  const nego = (id: string) => SCRIPT.find((b) => b.t === 'nego' && b.id === id) as NegoBeat;
  const run = (b: NegoBeat, picks: string[]) => picks.reduce((st, p) => negoApply(b, st, p).st, { id: b.id, left: b.resolve, turn: 0, used: [] as string[] });

  it('통행세 패거리는 말로 비켜 세울 수 있고, 방망이만으로는 안 된다', () => {
    const b = nego('toll2');
    expect(run(b, ['bat', 'bat', 'bat']).left).toBeGreaterThan(0);
    expect(run(b, ['charm', 'coin']).left).toBe(0);
  });

  it('두목에게는 졸개들의 하소연이 단서가 된다', () => {
    const b = nego('mokso');
    expect(run(b, ['bat', 'charm', 'bat', 'charm']).left).toBeGreaterThan(0);
    expect(run(b, ['threat', 'toll2_talked', 'charm']).left).toBe(0);
  });

  it('두목전 직전에 작전을 고른다(두 갈래 모두)', () => {
    for (const id of ['tactic3', 'tactic3s']) {
      const i = SCRIPT.findIndex((b) => b.t === 'choice' && b.id === id);
      expect(SCRIPT[i + 1]).toMatchObject({ t: 'battle' });
      expect((SCRIPT[i + 1] as { foe: string }).foe).toMatch(/^boss/);
    }
  });
});

describe('정과 엽전', () => {
  it('정이 단계를 넘으면 알리고, 그 단계만큼 전투에서 세진다', () => {
    const party = newGame().party;
    const base = battleSetup(party, FOES.meoNight, ['me']).allies[0]!;
    // 주인공은 정이 없지만, 정 값만큼 버프가 붙는지 같은 계산을 확인한다
    const lover = battleSetup(party, FOES.meoNight, ['me'], [], undefined, [], { me: 80 }).allies[0]!;
    expect(lover.hp).toBeGreaterThan(base.hp);
    expect(bondTier(19)).toBe(0);
    expect(bondTier(45)).toBe(2);
    expect(bondTier(80)).toBe(3);
  });

  it('정이 깊을 때만 나오는 대사가 있다', () => {
    const lines = SCRIPT.flatMap((b) => (b.t === 'talk' ? b.lines : [])).filter((l) => l.bond);
    expect(lines.length).toBeGreaterThanOrEqual(6);
    const g = newGame();
    expect(visibleLines({ ...g, bond: { baekseol: 10 } }, lines).length).toBeLessThan(visibleLines({ ...g, bond: { baekseol: 99, sodam: 99, muyeong: 99 } }, lines).length);
  });

  it('엽전 쥐여 주기는 엽전과 평판이 들고, 모자라면 못 쓴다', () => {
    const fish = SCRIPT.find((b) => b.t === 'nego' && b.id === 'fish') as NegoBeat;
    const st = { id: fish.id, left: fish.resolve, turn: 0, used: [] as string[] };
    const ctx = (coin: number) => ({ flags: [], party: ['me', 'baekseol', 'muyeong'] as MemberId[], skills: ['me', 'baekseol', 'muyeong'] as MemberId[], coin });
    expect(negoOptions(fish, st, ctx(10)).find((o) => o.id === 'coin')?.disabled).toBeTruthy();
    expect(negoOptions(fish, st, ctx(100)).find((o) => o.id === 'coin')?.disabled).toBeFalsy();
    const r = negoApply(fish, st, 'coin');
    expect(r.coin).toBe(60);
    expect(r.rep).toBe(-1);
    // 공개 심리에서는 돈을 꺼낼 수 없다
    const hearing = SCRIPT.find((b) => b.t === 'nego' && b.id === 'hearing') as NegoBeat;
    expect(negoOptions(hearing, { ...st, id: 'hearing', left: hearing.resolve }, ctx(999)).map((o) => o.id)).not.toContain('coin');
  });

  it('화가 지나면 장터 물건이 바뀐다', () => {
    const shops = SCRIPT.filter((b) => b.t === 'shop').map((b) => (b.t === 'shop' ? (b.items ?? []).join(',') : ''));
    expect(new Set(shops).size).toBeGreaterThanOrEqual(4);
  });
});

describe('협상 판과 작전', () => {
  const ctx = (flags: string[] = []) => ({ flags, party: ['me', 'baekseol', 'muyeong', 'sodam'] as MemberId[], skills: ['me', 'baekseol', 'muyeong', 'sodam'] as MemberId[] });
  const boss = SCRIPT.find((b) => b.t === 'nego' && b.id === 'meo_boss') as NegoBeat;

  it('수단마다 세기와 대가가 다르고, 상대마다 잘 먹히는 게 다르다', () => {
    const st = { id: boss.id, left: boss.resolve, turn: 0, used: [] };
    const threat = negoApply(boss, st, 'threat');
    const charm = negoApply(boss, st, 'charm');
    expect(threat.st.left).toBeLessThan(charm.st.left); // 머슴 대장에겐 위협이 홀림보다 잘 먹힌다
    expect(threat.rep).toBe(-1);
    expect(charm.bsDebt).toBe(1);
  });

  it('단서와 장부는 있어야 쓰고, 단서는 한 번만', () => {
    const st = { id: boss.id, left: boss.resolve, turn: 0, used: [] };
    expect(negoOptions(boss, st, ctx()).map((o) => o.id)).not.toContain('ledger');
    expect(negoOptions(boss, st, ctx(['clue_ledger', 'clue_note'])).map((o) => o.id)).toEqual(expect.arrayContaining(['ledger', 'clue_note']));
    const used = negoApply(boss, st, 'clue_note').st;
    expect(negoOptions(boss, used, ctx(['clue_note'])).map((o) => o.id)).not.toContain('clue_note');
  });

  it('방망이만으로는 못 꺾고, 수단을 섞으면 꺾는다', () => {
    let st = { id: boss.id, left: boss.resolve, turn: 0, used: [] as string[] };
    for (let i = 0; i < boss.turns; i++) st = negoApply(boss, st, 'bat').st;
    expect(st.left).toBeGreaterThan(0);
    st = { id: boss.id, left: boss.resolve, turn: 0, used: [] };
    for (const p of ['ledger', 'threat', 'clue_note']) st = negoApply(boss, st, p).st;
    expect(st.left).toBe(0);
  });

  it('작전이 능력치를 바꾼다', () => {
    const party = newGame().party;
    const base = battleSetup(party, FOES.meoNight, ['me']).allies[0]!;
    const push = battleSetup(party, FOES.meoNight, ['me'], [], 'push').allies[0]!;
    const safe = battleSetup(party, FOES.meoNight, ['me'], [], 'safe').allies[0]!;
    const skill = battleSetup(party, FOES.meoNight, ['me'], [], 'skill').allies[0]!;
    expect(push.atk).toBeGreaterThan(base.atk);
    expect(safe.hp).toBeGreaterThan(base.hp);
    expect(skill.skillNow).toBe(true);
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
        const decide = fx.k === 'choice' || fx.k === 'collect' || fx.k === 'shop' || fx.k === 'gift' || fx.k === 'nego';
        if (decide) {
          worst = Math.max(worst, since);
          since = 0;
        } else since += ms(fx);
        const b = SCRIPT[r.g.pc];
        const input: Input =
          fx.k === 'collect' ? { k: 'collect', ids: collectIds(r.g, ['wages']) } : fx.k === 'choice' ? { k: 'pick', i: b.t === 'choice' && b.id === 'road' ? road : 0 } : fx.k === 'gift' ? { k: 'pick', i: 0 } : { k: 'ok' };
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
      const input: Input = r.fx.k === 'collect' ? { k: 'collect', ids: collectIds(r.g, ['wages']) } : r.fx.k === 'choice' || r.fx.k === 'gift' ? { k: 'pick', i: 0 } : { k: 'ok' };
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

  it('끝까지 가면 넷 다 기술을 얻는다', () => {
    const r = playthrough({ collect: ['wages'] });
    expect([...r.g.skills].sort()).toEqual(['baekseol', 'me', 'muyeong', 'sodam']);
  });

  it('4화 시험판은 4화 첫머리에서 시작하고 끝까지 간다', () => {
    const g = trialStart();
    let r = step(g);
    expect(r.fx).toMatchObject({ k: 'warp', map: 'village' });
    r = step(r.g, { k: 'ok' });
    expect(r.g.map).toBe('village');
    expect(r.g.party.map((m) => m.id)).toEqual(['me', 'baekseol', 'muyeong']);
    for (let i = 0; i < 2000 && r.fx.k !== 'end'; i++) {
      const b = SCRIPT[r.g.pc];
      r = step(r.g, r.fx.k === 'collect' && b.t === 'collect' ? { k: 'collect', ids: [b.debts[0].id] } : r.fx.k === 'choice' || r.fx.k === 'gift' ? { k: 'pick', i: 0 } : r.fx.k === 'defeat' ? { k: 'train' } : { k: 'ok' });
    }
    expect(r.fx.k).toBe('end');
  });

  it('3화까지 끝낸 저장은 새로 붙은 4화부터 이어 간다', () => {
    const first4 = ep4Start();
    expect(SCRIPT[first4]).toMatchObject({ t: 'map', map: 'village', at: '오두막' });
    // 예전 저장: 끝(end)에 닿아 done인데, 그 자리에 이제 4화 첫 비트가 있다
    const old: Game = { ...newGame(), pc: first4 - 1, done: true };
    const g = revive(old);
    expect(g.done).toBe(false);
    expect(step(g).fx.k).not.toBe('end');
    // 진짜 끝에 닿은 저장은 그대로 끝
    const end = SCRIPT.findIndex((b) => b.t === 'end');
    expect(revive({ ...newGame(), pc: end, done: true }).done).toBe(true);
  });

  it('저장한 상태를 그대로 불러와 같은 곳부터 이어 간다', () => {
    const g = before('beast');
    const copy = JSON.parse(JSON.stringify(g)) as Game;
    expect(JSON.stringify(step(copy).fx)).toBe(JSON.stringify(step(g).fx));
  });
});
