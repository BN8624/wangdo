// 모험 탭: 지도(지역) → 지역 길(이야기·마을·필드·던전·사연·만남) → 노드 화면(상점·수련·던전 층·사연 장면).
// 길은 이야기를 따라 열린다. 기다려야 열리는 것은 없다.
import { useState } from 'react';
import {
  advFight,
  dungeonEncounter,
  dungeonPlace,
  fieldEncounter,
  pathSteps,
  questEncounter,
  reenterDungeon,
  regionOpen,
  regionProgress,
  stepState,
  type PathStep,
} from '../core/adventure';
import { bestParty, buyItem, equip, statsOf, type LevelUp, type Won } from '../core/engine';
import { fmt } from '../core/format';
import type { GameState, StatKey, StoryLine } from '../core/types';
import { ART } from '../data/art';
import { ITEM_BY_ID, itemEffect, type ItemDef } from '../data/items';
import { EPISODE_BY_ID } from '../data/story';
import { NODE_BY_ID, PART_NAMES, REGIONS, type DungeonDef, type FieldDef, type NodeDef, type QuestDef, type RegionDef, type Req, type TownDef } from '../data/world';
import { STAT_LABEL, YOKAI_BY_ID } from '../data/yokai';
import { FoePrep } from './FoePrep';
import { Art } from './Portrait';
import { NovelFrame } from './StoryView';
import { LineIcon, ResIcon } from './icons';
import { act } from './store';
import { buzz, pushToast } from './toast';
import { play } from './sound';
import { track } from './analytics';
import type { ModalRequest } from './App';

const REGION_KEY = 'wangdo.region';

/** 지금 이어 갈 칸이 있는 첫 지역 */
function currentRegion(s: GameState): string | null {
  const open = REGIONS.filter((r) => regionOpen(s, r.id));
  return (open.find((r) => pathSteps(r.id).some((st) => stepState(s, st) === 'open')) ?? open[open.length - 1])?.id ?? null;
}

function loadRegion(s: GameState): string | null {
  try {
    const id = localStorage.getItem(REGION_KEY);
    if (id && REGIONS.some((r) => r.id === id) && regionOpen(s, id)) return id;
  } catch {
    // 저장소를 못 쓰면 지금 지역으로 연다
  }
  return currentRegion(s);
}

function saveRegion(id: string | null) {
  try {
    if (id) localStorage.setItem(REGION_KEY, id);
    else localStorage.removeItem(REGION_KEY);
  } catch {
    // 기억 못 해도 괜찮다
  }
}

export function AdventureView({ view, open }: { view: GameState; open: (m: ModalRequest) => void }) {
  const [region, setRegion] = useState<string | null>(() => loadRegion(view));
  const [node, setNode] = useState<string | null>(null);
  const pickRegion = (id: string | null) => {
    setRegion(id);
    saveRegion(id);
    setNode(null);
    window.scrollTo(0, 0);
  };
  const pickNode = (id: string | null) => {
    setNode(id);
    window.scrollTo(0, 0);
  };
  const r = REGIONS.find((x) => x.id === region);
  const n = node ? NODE_BY_ID[node] : null;
  if (r && n) return <NodePanel view={view} region={r} node={n} open={open} onBack={() => pickNode(null)} />;
  if (r) return <RegionPath view={view} region={r} open={open} onNode={pickNode} onBack={() => pickRegion(null)} />;
  return <RegionList view={view} onPick={pickRegion} />;
}

// ───────────────────────── 지도 ─────────────────────────

function RegionList({ view, onPick }: { view: GameState; onPick: (id: string) => void }) {
  const now = currentRegion(view);
  const parts = [...new Set(REGIONS.map((r) => r.part))];
  return (
    <div className="view">
      <div className="adv-map">
        <Art src={ART.bg('map')} alt="" fallback={null} />
        <div className="lbl">
          <b>해랑국 지도</b>
          <span>이야기를 따라가면 길이 열려요</span>
        </div>
      </div>
      {parts.map((part) => (
        <section key={part}>
          <h2 className="adv-part">
            {part}부 · {PART_NAMES[part]}
          </h2>
          {REGIONS.filter((r) => r.part === part).map((r) => {
            const opened = regionOpen(view, r.id);
            const p = regionProgress(view, r.id);
            return (
              <button key={r.id} className={`adv-region ${opened ? '' : 'locked'} ${r.id === now ? 'now' : ''}`} disabled={!opened} onClick={() => onPick(r.id)}>
                <span className="adv-region-top">
                  <b>{r.name}</b>
                  <small>{p.done >= p.total ? '모두 끝냄' : r.id === now ? '지금 여기' : `${p.done}/${p.total}`}</small>
                </span>
                <span className="adv-region-desc">{opened ? r.desc : '앞 지역의 이야기를 이어 가면 열려요'}</span>
                <span className="bar">
                  <i style={{ width: `${(p.done / Math.max(1, p.total)) * 100}%` }} />
                </span>
              </button>
            );
          })}
        </section>
      ))}
      <div style={{ height: 16 }} />
    </div>
  );
}

// ───────────────────────── 지역 길 ─────────────────────────

/** 조건 중 아직 못 채운 것 하나를 글로 */
function reqText(s: GameState, r: Req): string {
  if (r.ep && !s.story.done.includes(r.ep)) {
    const ep = EPISODE_BY_ID[r.ep];
    return ep ? `${ep.season}부 ${ep.no}화 「${ep.title}」를 보면 열려요` : '앞 이야기를 보면 열려요';
  }
  if (r.node && !s.adv.cleared.includes(r.node)) return `「${NODE_BY_ID[r.node]?.name ?? r.node}」을(를) 끝내면 열려요`;
  if (r.owned && !s.yokai[r.owned]) return `${YOKAI_BY_ID[r.owned]?.name ?? ''}이(가) 합류하면 열려요`;
  return '';
}

const KIND_ICON = { ep: 'book', town: 'shop', field: 'grass', dungeon: 'gate', quest: 'letter', meet: 'heart' } as const;

function stepLook(s: GameState, st: PathStep): { icon: string; tag: string; name: string; sub: string; lock: string } {
  if (st.kind === 'ep') {
    const ep = EPISODE_BY_ID[st.id];
    const done = s.story.done.includes(ep.id);
    const total = ep.battles?.length ?? 0;
    const lock = ep.unlock.node && !s.adv.cleared.includes(ep.unlock.node) ? reqText(s, { node: ep.unlock.node }) : reqText(s, { ep: ep.unlock.after });
    return {
      icon: KIND_ICON.ep,
      tag: `이야기 · ${ep.season}부 ${ep.no}화`,
      name: ep.title,
      sub: done ? '본 이야기 · 다시 보기' : s.story.at?.ep === ep.id ? '보던 곳부터 이어 보기' : total ? `전투 ${total}판이 끼어 있어요` : '이야기',
      lock,
    };
  }
  const n = st.node;
  const lock = reqText(s, n.req);
  if (n.kind === 'town') return { icon: KIND_ICON.town, tag: '마을', name: n.name, sub: `상점 · 장비 ${n.shop.length}가지`, lock };
  if (n.kind === 'field') return { icon: KIND_ICON.field, tag: `필드 · Lv ${n.levels[0]}–${n.levels[1]}`, name: n.name, sub: `몇 번이고 싸워 수련 · ${fmt(s.adv.floors[`f:${n.id}`] ?? 0)}번 싸움`, lock };
  if (n.kind === 'dungeon') {
    const { floor } = dungeonPlace(s, n);
    const lv = `Lv ${n.floors[0].level}–${n.floors[n.floors.length - 1].level}`;
    const done = s.adv.cleared.includes(n.id);
    return { icon: KIND_ICON.dungeon, tag: `던전 · ${lv}`, name: n.name, sub: done ? '돌파 · 다시 돌 수 있어요' : `${n.floors.length}층 중 ${floor}층 돌파 · 대장 ${n.boss.name}`, lock };
  }
  const who = YOKAI_BY_ID[n.heroine]?.name ?? '';
  const done = s.adv.cleared.includes(n.id);
  const lv = `Lv ${n.battles[0].level}${n.battles.length > 1 ? `–${n.battles[n.battles.length - 1].level}` : ''}`;
  return n.recruit
    ? { icon: KIND_ICON.meet, tag: `만남 · ${lv}`, name: n.name, sub: done ? `${who} 합류 · 다시 보기` : `새 식객을 만나요`, lock }
    : { icon: KIND_ICON.quest, tag: `${who}의 사연 · ${lv}`, name: n.name, sub: done ? '끝낸 사연 · 다시 보기' : '전용 장신구를 얻어요', lock };
}

function RegionPath({ view, region, open, onNode, onBack }: { view: GameState; region: RegionDef; open: (m: ModalRequest) => void; onNode: (id: string) => void; onBack: () => void }) {
  const steps = pathSteps(region.id);
  const next = steps.findIndex((st) => stepState(view, st) === 'open');
  const p = regionProgress(view, region.id);
  return (
    <div className="view">
      <div className="adv-head">
        <button className="adv-back" onClick={onBack}>
          ‹ 지도
        </button>
        <b>{region.name}</b>
        <span>{region.desc}</span>
        <small>
          {region.part}부 · {p.done}/{p.total}
        </small>
      </div>
      <ol className="adv-path">
        {steps.map((st, i) => {
          const state = stepState(view, st);
          const look = stepLook(view, st);
          return (
            <li key={i} className={`adv-step ${state} ${i === next ? 'next' : ''}`}>
              <button
                disabled={state === 'locked'}
                data-guide={st.kind === 'node' ? `node-${st.node.id}` : `ep-${st.id}`}
                onClick={() => (st.kind === 'ep' ? open({ kind: 'story', episode: st.id }) : onNode(st.node.id))}
              >
                <span className="adv-ico">
                  <LineIcon name={look.icon} size={24} />
                </span>
                <span className="adv-txt">
                  <small>{look.tag}</small>
                  <b>{look.name}</b>
                  <em>{state === 'locked' ? look.lock : look.sub}</em>
                </span>
                {state === 'done' && (st.kind === 'ep' || (st.node.kind !== 'town' && st.node.kind !== 'field')) && <span className="adv-check">✓</span>}
                {i === next && <span className="adv-next">다음</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <div style={{ height: 16 }} />
    </div>
  );
}

// ───────────────────────── 노드 화면 ─────────────────────────

function NodePanel({ view, region, node, open, onBack }: { view: GameState; region: RegionDef; node: NodeDef; open: (m: ModalRequest) => void; onBack: () => void }) {
  const fight = (party: string[]) => {
    const r = act((s, t) => advFight(s, t, node.id, party));
    if (!r.ok) return pushToast({ text: r.reason === 'all-clear' ? '여기는 모두 끝냈어요' : '나설 식객을 모두 골라 주세요', warn: true });
    buzz(30);
    track(`adv/${node.id}/${r.won ? 'win' : 'lose'}`);
    open({ kind: 'fight', result: r });
  };
  return (
    <div className="view">
      <div className="adv-head">
        <button className="adv-back" onClick={onBack}>
          ‹ {region.name}
        </button>
        <b>{node.name}</b>
        <span>{node.desc}</span>
      </div>
      {node.kind === 'town' && <TownPanel view={view} town={node} />}
      {node.kind === 'field' && <FieldPanel view={view} field={node} onFight={fight} />}
      {node.kind === 'dungeon' && <DungeonPanel view={view} dungeon={node} onFight={fight} />}
      {node.kind === 'quest' && <QuestPanel key={node.id} view={view} quest={node} onFight={fight} />}
      <div style={{ height: 16 }} />
    </div>
  );
}

// 마을 상점 -------------------------------------------------------------

/** 이 장비가 가장 잘 맞는 능력치(무기의 주 능력치) */
const mainStat = (item: ItemDef): StatKey | null =>
  item.stats ? ((Object.entries(item.stats) as [StatKey, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) : null;

function TownPanel({ view, town }: { view: GameState; town: TownDef }) {
  const [bought, setBought] = useState<string | null>(null);
  const items = town.shop.map((id) => ITEM_BY_ID[id]).filter(Boolean);
  const worn = (id: string) => Object.values(view.yokai).filter((y) => y.gear.weapon === id || y.gear.trinket === id).length;

  const buy = (item: ItemDef) => {
    const r = act((s, t) => buyItem(s, t, item.id));
    if (!r.ok) return pushToast({ text: '엽전이 모자라요', warn: true });
    buzz(20);
    play('levelup');
    setBought(item.id);
  };

  return (
    <div className="card">
      <div className="shop-head">
        <b>상점</b>
        <span>
          <ResIcon kind="coin" size={16} /> {fmt(view.res.coin)}
        </span>
      </div>
      {items.map((item) => {
        const have = (view.inventory[item.id] ?? 0) + worn(item.id);
        return (
          <div key={item.id} className="shop-item">
            <div className="shop-txt">
              <small>
                {item.slot === 'weapon' ? '무기' : '장신구'} · {item.tier}단계{have ? ` · 가진 것 ${have}` : ''}
              </small>
              <b>{item.name}</b>
              <span>{itemEffect(item)}</span>
            </div>
            <button className="btn hwang" disabled={view.res.coin < (item.price ?? Infinity)} onClick={() => buy(item)}>
              사기<span>{fmt(item.price ?? 0)}</span>
            </button>
            {bought === item.id && <EquipNow view={view} item={item} onDone={() => setBought(null)} />}
          </div>
        );
      })}
      <div className="cap-note">산 장비는 바로 끼거나, 식객 화면의 「능력·레벨」에서 끼워요.</div>
    </div>
  );
}

/** 산 장비를 누구에게 끼울지 */
function EquipNow({ view, item, onDone }: { view: GameState; item: ItemDef; onDone: () => void }) {
  const stat = mainStat(item);
  const ids = Object.keys(view.yokai).sort((a, b) => (stat ? statsOf(view, b)[stat] - statsOf(view, a)[stat] : view.yokai[b].level - view.yokai[a].level));
  const wear = (id: string) => {
    const r = act((s, t) => equip(s, t, id, item.slot, item.id));
    if (r.ok) {
      buzz(15);
      pushToast({ text: `${YOKAI_BY_ID[id].name}이(가) 〈${item.name}〉을(를) 꼈어요` });
      onDone();
    }
  };
  if (!(view.inventory[item.id] > 0)) return null;
  return (
    <div className="equip-now">
      <small>바로 끼기{stat ? ` · ${STAT_LABEL[stat]} 높은 순` : ''}</small>
      <div>
        {ids.map((id) => {
          const cur = view.yokai[id].gear[item.slot];
          return (
            <button key={id} onClick={() => wear(id)}>
              <b>{YOKAI_BY_ID[id].name}</b>
              <span>{cur ? ITEM_BY_ID[cur]?.name : '비어 있음'}</span>
            </button>
          );
        })}
        <button className="later" onClick={onDone}>
          나중에
        </button>
      </div>
    </div>
  );
}

// 필드 ------------------------------------------------------------------

interface Batch {
  wins: number;
  losses: number;
  exp: number;
  coin: number;
  ups: LevelUp[];
}

function FieldPanel({ view, field, onFight }: { view: GameState; field: FieldDef; onFight: (party: string[]) => void }) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const info = fieldEncounter(view, field);
  const count = view.adv.floors[`f:${field.id}`] ?? 0;

  // 연속 수련: 판마다 추천 편성으로 다섯 판을 바로 치른다(전투 장면은 건너뛴다)
  const runBatch = () => {
    const r = act((s, t) => {
      let cur = s;
      const results: Won[] = [];
      for (let i = 0; i < 5; i++) {
        const [next, res] = advFight(cur, t, field.id, bestParty(cur, fieldEncounter(cur, field)));
        if (!res.ok) break;
        cur = next;
        results.push(res);
      }
      return [cur, results] as [GameState, Won[]];
    });
    const ups = new Map<string, LevelUp>();
    for (const res of r) for (const u of res.ups ?? []) ups.set(u.id, { id: u.id, from: ups.get(u.id)?.from ?? u.from, to: u.to });
    buzz(30);
    if (ups.size) play('levelup');
    track(`adv/${field.id}/batch`);
    setBatch({
      wins: r.filter((x) => x.won).length,
      losses: r.filter((x) => !x.won).length,
      exp: r.reduce((a, x) => a + (x.exp ?? 0), 0),
      coin: r.reduce((a, x) => a + x.coin, 0),
      ups: [...ups.values()],
    });
  };

  return (
    <>
      <div className="adv-scene">
        <Art src={ART.battle(field.bg)} alt="" fallback={null} />
        <span>
          필드 · 상대 Lv {field.levels[0]}–{field.levels[1]} · 지금까지 {fmt(count)}번 싸움
        </span>
      </div>
      {batch && (
        <div className="card batch">
          <b>
            연속 수련 · {batch.wins}승 {batch.losses}패
          </b>
          <span>
            경험치 +{fmt(batch.exp)} · 엽전 +{fmt(batch.coin)}
          </span>
          {batch.ups.length > 0 && (
            <span className="levelups">
              {batch.ups.map((u) => (
                <em key={u.id}>
                  {YOKAI_BY_ID[u.id]?.name} Lv {u.from}→{u.to}
                </em>
              ))}
            </span>
          )}
        </div>
      )}
      <div className="card">
        <FoePrep arena={view} info={info} label={`수련 · ${fmt(count + 1)}번째 상대`} note={<div className="bprep-guest">필드 상대는 지치지 않아요. 원하는 만큼 싸워요.</div>} onGo={onFight}>
          <button className="btn cheong" onClick={runBatch}>
            연속 5번
          </button>
        </FoePrep>
      </div>
    </>
  );
}

// 던전 ------------------------------------------------------------------

function DungeonPanel({ view, dungeon, onFight }: { view: GameState; dungeon: DungeonDef; onFight: (party: string[]) => void }) {
  const { floor, battle } = dungeonPlace(view, dungeon);
  const info = dungeonEncounter(view, dungeon);
  const cleared = view.adv.cleared.includes(dungeon.id);
  const last = dungeon.floors.length - 1;
  return (
    <>
      <div className="adv-scene">
        <Art src={ART.battle(dungeon.bg)} alt="" fallback={null} />
        <span>
          던전 · {dungeon.floors.length}층 · 대장 {dungeon.boss.name}
        </span>
      </div>
      <ol className="floors">
        {dungeon.floors.map((fl, i) => {
          const done = i < floor;
          const here = i === floor;
          const chestTaken = view.adv.chests.includes(`${dungeon.id}@${i}`);
          return (
            <li key={i} className={done ? 'done' : here ? 'here' : 'todo'}>
              <span className="fl-no">{i === last ? '대장' : `${i + 1}층`}</span>
              <span className="fl-name">
                {fl.name}
                <small>
                  Lv {fl.level}
                  {i !== last && ` · ${here ? `${battle}/${fl.battles}판` : `${fl.battles}판`}`}
                </small>
              </span>
              {fl.chest && (
                <span className={`fl-chest ${chestTaken ? 'taken' : ''}`} title={chestTaken ? '연 보물상자' : '보물상자'}>
                  <LineIcon name="chest" size={20} />
                </span>
              )}
              {done && <span className="fl-done">✓</span>}
            </li>
          );
        })}
      </ol>
      {info ? (
        <div className="card">
          <FoePrep
            arena={view}
            info={info}
            label={floor === last ? `${dungeon.name} · 대장 층` : `${floor + 1}층 ${dungeon.floors[floor].name} · ${battle + 1}/${dungeon.floors[floor].battles}`}
            note={floor === last && dungeon.boss.drop && !cleared ? <div className="bprep-guest">이기면 〈{ITEM_BY_ID[dungeon.boss.drop]?.name}〉</div> : undefined}
            onGo={onFight}
          />
        </div>
      ) : (
        <div className="card adv-clear">
          <b>「{dungeon.name}」을(를) 돌파했어요</b>
          <span>다시 들어가면 층을 처음부터 돌아요. 보물상자와 대장 장비는 처음 한 번만 나와요.</span>
          <button className="btn cheong wide" onClick={() => act((s) => [reenterDungeon(s, dungeon.id), null])}>
            다시 들어가기
          </button>
        </div>
      )}
    </>
  );
}

// 사연·만남 ---------------------------------------------------------------

function QuestPanel({ view, quest, onFight }: { view: GameState; quest: QuestDef; onFight: (party: string[]) => void }) {
  const done = view.adv.cleared.includes(quest.id);
  const n = view.adv.floors[quest.id] ?? 0;
  const [reading, setReading] = useState(() => !done && n === 0 && !view.adv.losses[`${quest.id}.0`]);
  const [index, setIndex] = useState(0);
  const info = questEncounter(view, quest);
  const her = YOKAI_BY_ID[quest.heroine];
  const lines: StoryLine[] = quest.lines.map((l) => ({ who: l.who === 'her' ? quest.heroine : l.who, text: l.text }));

  if (reading) {
    return (
      <NovelFrame
        title={quest.name}
        bg={ART.bg(quest.bg)}
        cast={[quest.heroine]}
        line={lines[index]}
        onNext={() => (index + 1 < lines.length ? setIndex(index + 1) : (setReading(false), setIndex(0)))}
        onClose={() => (setReading(false), setIndex(0))}
      />
    );
  }

  return (
    <>
      <div className="adv-scene quest">
        <Art src={ART.bg(quest.bg)} alt="" fallback={null} />
        <span>
          {quest.recruit ? '만남' : `${her?.name}의 사연`} · 전투 {quest.battles.length}판
        </span>
      </div>
      <button className="btn wide" onClick={() => setReading(true)}>
        장면 {done || n > 0 ? '다시 보기' : '보기'}
      </button>
      {info ? (
        <div className="card" style={{ marginTop: 10 }}>
          <FoePrep
            arena={view}
            info={info}
            label={`${quest.name} · ${n + 1}/${quest.battles.length}`}
            note={
              n === quest.battles.length - 1 ? (
                <div className="bprep-guest">{quest.recruit ? `이기면 ${her?.name}이(가) 합류해요` : quest.reward ? `이기면 〈${ITEM_BY_ID[quest.reward]?.name}〉` : ''}</div>
              ) : undefined
            }
            onGo={onFight}
          />
        </div>
      ) : (
        <div className="card adv-clear">
          <b>{quest.recruit ? `${her?.name}이(가) 함께하고 있어요` : '끝낸 사연이에요'}</b>
          {quest.reward && <span>보답: 〈{ITEM_BY_ID[quest.reward]?.name}〉 · {itemEffect(ITEM_BY_ID[quest.reward])}</span>}
        </div>
      )}
    </>
  );
}
