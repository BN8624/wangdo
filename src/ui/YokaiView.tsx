import { useState } from 'react';
import {
  STAT_KEYS,
  setFavorite,
  affordableLevels,
  bondLevel,
  giftPrice,
  giveGift,
  levelCap,
  levelCost,
  levelUp,
  outing,
  outingPrice,
  outingReadyIn,
  ownedYokai,
  power,
  statsOf,
  talkReadyIn,
  totalStats,
  unseenScene,
  workplaceOf,
} from '../core/engine';
import { fmt, fmtDuration } from '../core/format';
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

export function YokaiView({ view, now, onOpen }: { view: GameState; now: number; onOpen: (id: string) => void }) {
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
          const chat = talkReadyIn(view, def.id, now) === 0;
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

export function YokaiSheet({ view, now, id, open, onClose }: { view: GameState; now: number; id: string; open: (m: ModalRequest) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'bond' | 'grow'>('bond');
  const [gifting, setGifting] = useState(false);
  const def = YOKAI_BY_ID[id];
  const y = view.yokai[id];
  const st = statsOf(view, id);
  const lv = bondLevel(y.bond);
  const nextNeed = BOND_LEVELS[lv + 1]?.need;
  const cap = levelCap(view.rank);
  const one = y.level < cap ? levelCost(def, y.level) : null;
  const ten = affordableLevels(view, id, 10);
  const max = affordableLevels(view, id, 9999);
  const talkWait = talkReadyIn(view, id, now);
  const outWait = outingReadyIn(view, id, now);
  const content = bondContent(id);

  const up = (count: number) => {
    const r = act((s, t) => levelUp(s, t, id, count));
    if (r.ok) {
      buzz();
      play('levelup');
      pushToast({ text: `${def.name} Lv ${y.level + r.levels}!` });
    }
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
              <button className="btn hong" data-guide="talk" disabled={talkWait > 0} onClick={() => open({ kind: 'talk', id })}>
                대화<span>{talkWait > 0 ? fmtDuration(talkWait) : '말 걸기'}</span>
              </button>
              <button className="btn hwang" onClick={() => setGifting((g) => !g)}>
                선물<span>{gifting ? '닫기' : '고르기'}</span>
              </button>
              <button className="btn cheong" disabled={outWait > 0 || view.res.coin < outingPrice(view.rank)} onClick={goOuting}>
                나들이<span>{outWait > 0 ? fmtDuration(outWait) : `엽전 ${fmt(outingPrice(view.rank))}`}</span>
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
            <div className="lvbtns">
              <button className="btn hwang" data-guide="grow" disabled={one === null || view.res.coin < one} onClick={() => up(1)}>
                +1<span>{one === null ? '상한' : `엽전 ${fmt(one)}`}</span>
              </button>
              <button className="btn hwang" disabled={ten.levels === 0} onClick={() => up(10)}>
                +{ten.levels > 0 ? ten.levels : 10}
                <span>{ten.levels > 0 ? `엽전 ${fmt(ten.cost)}` : '엽전 부족'}</span>
              </button>
              <button className="btn hong" disabled={max.levels === 0} onClick={() => up(9999)}>
                최대<span>{max.levels > 0 ? `+${max.levels} · ${fmt(max.cost)}` : `Lv ${cap} 상한`}</span>
              </button>
            </div>
            <div className="cap-note">레벨 상한 {cap} · 칭호가 오르면 상한도 올라가요 · 좋아하는 선물: ???</div>
          </>
        )}
      </div>
    </>
  );
}
