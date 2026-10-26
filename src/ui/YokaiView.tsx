import { useState } from 'react';
import {
  MAX_LEVEL,
  STAT_KEYS,
  setFavorite,
  bondLevel,
  equip,
  expToNext,
  giftPrice,
  giveGift,
  hasNewTalk,
  outing,
  outingPrice,
  ownedYokai,
  power,
  skillTier,
  statsOf,
  totalStats,
  unseenScene,
  workplaceOf,
} from '../core/engine';
import { fmt } from '../core/format';
import { ITEM_BY_ID, itemEffect, type Slot } from '../data/items';
import { NODE_BY_ID, REGIONS } from '../data/world';
import { bondContent } from '../data/bond-content';
import { RANKS } from '../data/ranks';
import { SKILL_LABEL, SKILLS, skillText } from '../data/skills';
import { BOND_LEVELS, GIFTS, WORKPLACE_BY_ID } from '../data/village';
import { GRADE_LABEL, STAT_LABEL, YOKAI, YOKAI_BY_ID } from '../data/yokai';
import type { GameState, StatKey } from '../core/types';
import { Portrait } from './Portrait';
import { LineIcon } from './icons';
import { act } from './store';
import { buzz, pushToast } from './toast';
import { play } from './sound';
import type { ModalRequest } from './App';

export const SPEC_COLOR: Record<StatKey, string> = { might: '#e2553f', wit: '#e08a1e', politics: '#4f9a3a', charm: '#d0577a' };

/** 아직 없는 식객이 언제 합류하는지 */
export function joinCondition(id: string): string {
  const join = YOKAI_BY_ID[id]?.join ?? '';
  const rank = RANKS.findIndex((r) => r.recruit === id);
  if (rank >= 0) return `관직 〈${RANKS[rank].title}〉`;
  if (join === 'recruit') return '모집';
  if (join.startsWith('meet:')) {
    const node = NODE_BY_ID[join.slice(5)];
    const region = REGIONS.find((r) => r.path.includes(join.slice(5)));
    return node ? `모험 · ${region?.name ?? ''} 「${node.name}」` : '모험에서 만남';
  }
  const m = join.match(/^story:s(\d+)(?:e(\d+))?/);
  if (m) return m[2] ? `${m[1]}부 ${Number(m[2])}화` : `${m[1]}부 이야기`;
  return '???';
}

function Hearts({ level }: { level: number }) {
  return (
    <span className="hearts" aria-label={`호감도 ${level}단계`}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i < level ? 'on' : ''}><LineIcon name={i < level ? 'heart-fill' : 'heart'} size={16}/></i>
      ))}
    </span>
  );
}

export function YokaiView({ view, onOpen }: { view: GameState; onOpen: (id: string) => void }) {
  const owned = ownedYokai(view);
  const t = totalStats(view);
  const ownedIds = new Set(owned.map((o) => o.def.id));
  const order = [...owned.map((o) => o.def), ...YOKAI.filter((d) => !ownedIds.has(d.id))];

  return (
    <div className="view">
      <div className="page-title">
        식객 <span>{owned.length} / {YOKAI.length}</span>
      </div>
      <div className="page-sub">
        권세 {fmt(power(view))} · {STAT_KEYS.map((k) => `${STAT_LABEL[k]} ${fmt(t[k])}`).join(' · ')}
      </div>
      <div className="grid">
        {order.map((def) => {
          const mine = view.yokai[def.id];
          if (!mine) {
            return (
              <div className="ycard locked" key={def.id}>
                <div className="pic">
                  <Portrait def={def} />
                </div>
                <div className="nm">{def.name}</div>
                <div className="kd">{joinCondition(def.id)}</div>
                <div className="lv">&nbsp;</div>
              </div>
            );
          }
          const news = unseenScene(view, def.id) > 0;
          const chat = hasNewTalk(view, def.id);
          return (
            <button className="ycard" key={def.id} data-guide={`ycard-${def.id}`} onClick={() => onOpen(def.id)}>
              <span className="stars">{'★'.repeat(def.grade)}</span>
              <span className="spec" style={{ background: SPEC_COLOR[def.specialty] }}>
                {STAT_LABEL[def.specialty]}
              </span>
              {(news || chat) && <span className="can-up">{news ? '새 이야기' : '말 걸기'}</span>}
              <div className="pic">
                <Portrait def={def} />
              </div>
              <div className="nm">{def.name}</div>
              <div className="kd">{def.kind}</div>
              <div className="kd">
                Lv <b>{mine.level}</b> · <Hearts level={bondLevel(mine.bond)} />
              </div>
              <div className="lv">{workplaceOf(view, def.id) ? WORKPLACE_BY_ID[workplaceOf(view, def.id)!].name : '쉬는 중'}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function YokaiSheet({ view, id, open, onClose }: { view: GameState; id: string; open: (m: ModalRequest) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'bond' | 'grow'>('bond');
  const [gifting, setGifting] = useState(false);
  const [picking, setPicking] = useState<Slot | null>(null);
  const def = YOKAI_BY_ID[id];
  const y = view.yokai[id];
  const st = statsOf(view, id);
  const lv = bondLevel(y.bond);
  const nextNeed = BOND_LEVELS[lv + 1]?.need;
  const need = expToNext(y.level);
  const newTalk = hasNewTalk(view, id);
  const content = bondContent(id);

  const wear = (slot: Slot, itemId: string | null) => {
    const r = act((s, t) => equip(s, t, id, slot, itemId));
    if (!r.ok) return;
    buzz(15);
    play('levelup');
    setPicking(null);
  };

  const gift = (giftId: string) => {
    const r = act((s, t) => giveGift(s, t, id, giftId));
    if (!r.ok) {
      pushToast({ text: '엽전이 모자라요', warn: true });
      return;
    }
    buzz(20);
    setGifting(false);
    open({ kind: 'react', id, text: r.liked ? content.gift.liked : content.gift.normal, gained: r.gained, levelUp: r.to > r.from ? r.to : 0 });
  };

  const goOuting = () => {
    const r = act((s, t) => outing(s, t, id));
    if (!r.ok) {
      if (r.reason === 'no-coin') pushToast({ text: '엽전이 모자라요', warn: true });
      return;
    }
    buzz(20);
    const line = content.outing[y.talks % Math.max(1, content.outing.length)];
    open({ kind: 'react', id, text: line, gained: r.gained, levelUp: r.to > r.from ? r.to : 0, outing: true });
  };

  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={`${def.name} 정보`}>
        <div className="grab" />
        <div className="sd-top">
          <div className="sd-pic">
            <Portrait def={def} />
          </div>
          <div>
            <div className="sd-name">
              {def.name} <span>Lv {y.level}</span>
            </div>
            <div className="sd-kind">
              {def.kind} · <span style={{ color: 'var(--hwang)' }}>{'★'.repeat(def.grade)}</span> {GRADE_LABEL[def.grade]}
            </div>
            <div className="sd-intro">{def.intro}</div>
          </div>
        </div>

        {SKILLS[id] && (
          <div className="sd-skill">
            <span className="sd-skill-tag">고유 기술 · {SKILL_LABEL[SKILLS[id].kind]}</span>
            <b>{SKILLS[id].name}</b>
            <p>{skillText(SKILLS[id].kind)}</p>
          </div>
        )}

        <button className="btn wide" disabled={view.favorite===id} onClick={()=>act(s=>[setFavorite(s,id),null])}>{view.favorite===id?'대표 식객':'대표로 세우기'}</button>
        <div className="tabs">
          <button className={tab === 'bond' ? 'on' : ''} onClick={() => setTab('bond')}>
            인연
          </button>
          <button className={tab === 'grow' ? 'on' : ''} data-guide="grow" onClick={() => setTab('grow')}>
            능력·레벨
          </button>
        </div>

        {tab === 'bond' ? (
          <>
            <div className="bond-head">
              <Hearts level={lv} />
              <b>{BOND_LEVELS[lv].name}</b>
              <span className="soft">능력치 +{lv * 8}%</span>
            </div>
            <div className="bar" style={{ height: 10 }}>
              <i
                style={{
                  width: `${nextNeed ? ((y.bond - BOND_LEVELS[lv].need) / (nextNeed - BOND_LEVELS[lv].need)) * 100 : 100}%`,
                  background: 'linear-gradient(90deg,#f29ca3,var(--hong))',
                }}
              />
            </div>
            <div className="soft" style={{ fontSize: 13, marginTop: 4 }}>
              {nextNeed ? `다음 단계 〈${BOND_LEVELS[lv + 1].name}〉까지 ${nextNeed - y.bond}` : '가장 깊은 인연이에요'}
            </div>
            <div className="bond-btns">
              <button className="btn hong" data-guide="talk" onClick={() => open({ kind: 'talk', id })}>
                대화<span>{newTalk ? '새 이야기' : '다시 듣기'}</span>
              </button>
              <button className="btn hwang" onClick={() => setGifting((g) => !g)}>
                선물<span>{gifting ? '닫기' : '고르기'}</span>
              </button>
              <button className="btn cheong" disabled={view.res.coin < outingPrice(view.rank)} onClick={goOuting}>
                나들이<span>엽전 {fmt(outingPrice(view.rank))}</span>
              </button>
            </div>
            {gifting && (
              <div className="gift-grid">
                {GIFTS.map((g) => {
                  const have = view.gifts[g.id] ?? 0;
                  const price = giftPrice(g.id, view.rank);
                  return (
                    <button key={g.id} className="gift" disabled={!have && view.res.coin < price} onClick={() => gift(g.id)}>
                      <b>{g.name}</b>
                      <span>{have ? `가진 것 ${have}개` : `엽전 ${fmt(price)}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="scene-list">
              {[1, 2, 3, 4, 5].map((n) => {
                const sc = content.scenes.find((x) => x.level === n);
                const unlocked = lv >= n;
                const fresh = unlocked && y.seen < n;
                return (
                  <button key={n} className={`scene-item ${unlocked ? '' : 'locked'}`} disabled={!unlocked || !sc} onClick={() => open({ kind: 'scene', id, level: n })}>
                    <span className="no">{n}</span>
                    <span className="ttl">{unlocked ? sc?.title ?? '준비 중' : `〈${BOND_LEVELS[n].name}〉이 되면 열려요`}</span>
                    {fresh && <em>NEW</em>}
                    {unlocked && (n === 3 || n === 5) && <small>그림</small>}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="stats4">
              {STAT_KEYS.map((k) => (
                <div key={k} className={k === def.specialty ? 'hi' : ''}>
                  {STAT_LABEL[k]}
                  <b>{fmt(st[k])}</b>
                  <small>+{def.growth[k]}/Lv</small>
                </div>
              ))}
            </div>
            <div className="exp-row">
              <span>
                Lv <b>{y.level}</b>
                {y.level < MAX_LEVEL && <small> · 다음 레벨까지 {fmt(need - y.exp)}</small>}
              </span>
              <span className="soft">기술 {skillTier(y.level) + 1}단계</span>
            </div>
            <div className="bar exp-bar">
              <i style={{ width: `${y.level >= MAX_LEVEL ? 100 : Math.min(100, (y.exp / need) * 100)}%` }} />
            </div>
            <div className="cap-note">경험치는 전투로 얻어요. 나서지 않은 식객도 조금씩 받아요 · 기술은 10·25·40레벨에 세져요</div>
            <div className="gear">
              {(['weapon', 'trinket'] as Slot[]).map((slot) => {
                const item = y.gear[slot] ? ITEM_BY_ID[y.gear[slot]!] : undefined;
                return (
                  <button key={slot} className={`gear-slot ${picking === slot ? 'on' : ''}`} onClick={() => setPicking((p) => (p === slot ? null : slot))}>
                    <small>{slot === 'weapon' ? '무기' : '장신구'}</small>
                    <b>{item?.name ?? '비어 있음'}</b>
                    <span>{item ? itemEffect(item) : '눌러서 끼기'}</span>
                  </button>
                );
              })}
            </div>
            {picking && <GearPicker view={view} id={id} slot={picking} onPick={(itemId) => wear(picking, itemId)} />}
          </>
        )}
      </div>
    </>
  );
}

/** 소지품에서 장비 고르기 */
function GearPicker({ view, id, slot, onPick }: { view: GameState; id: string; slot: Slot; onPick: (itemId: string | null) => void }) {
  const items = Object.entries(view.inventory)
    .filter(([itemId, n]) => n > 0 && ITEM_BY_ID[itemId]?.slot === slot)
    .map(([itemId, n]) => ({ item: ITEM_BY_ID[itemId], n }))
    .sort((a, b) => b.item.tier - a.item.tier);
  const worn = view.yokai[id].gear[slot];
  return (
    <div className="gear-pick">
      {items.length === 0 && <div className="soft">가진 {slot === 'weapon' ? '무기' : '장신구'}가 없어요. 마을 상점이나 던전 보물상자에서 얻어요.</div>}
      {items.map(({ item, n }) => (
        <button key={item.id} className="gear-item" onClick={() => onPick(item.id)}>
          <b>
            {item.name}
            {n > 1 && <small> ×{n}</small>}
            {item.owner === id && <em>전용</em>}
          </b>
          <span>{itemEffect(item)}</span>
        </button>
      ))}
      {worn && (
        <button className="gear-item off" onClick={() => onPick(null)}>
          <b>빼기</b>
          <span>{ITEM_BY_ID[worn]?.name}을(를) 소지품으로</span>
        </button>
      )}
    </div>
  );
}
