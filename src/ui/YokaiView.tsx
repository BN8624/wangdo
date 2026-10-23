import {
  STAT_KEYS,
  affordableLevels,
  levelCap,
  levelCost,
  levelUp,
  ownedYokai,
  power,
  totalStats,
  yokaiStats,
} from '../core/engine';
import { fmt } from '../core/format';
import { RANKS } from '../data/ranks';
import { CHAPTERS } from '../data/stages';
import { GRADE_LABEL, STAT_LABEL, STARTERS, YOKAI, YOKAI_BY_ID } from '../data/yokai';
import type { GameState, StatKey, YokaiDef } from '../core/types';
import { Portrait } from './Portrait';
import { act } from './store';
import { buzz, pushToast } from './toast';

export const SPEC_COLOR: Record<StatKey, string> = {
  might: '#e2553f',
  wit: '#e08a1e',
  craft: '#4f9a3a',
  charm: '#d0577a',
};

const SPEC_RESOURCE: Record<StatKey, string> = { might: '일손', wit: '엽전', craft: '곡식', charm: '잔치' };

/** 아직 없는 식객이 언제 합류하는지 */
export function joinCondition(id: string): string {
  if (STARTERS.includes(id)) return '처음부터 함께';
  const rank = RANKS.findIndex((r) => r.recruit === id);
  if (rank >= 0) return `칭호 〈${RANKS[rank].title}〉`;
  const ch = CHAPTERS.find((c) => c.boss.yokai === id);
  if (ch) return `${ch.title.split(' · ')[0]} 대장`;
  return '???';
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
        위세 {fmt(power(view))} · {STAT_KEYS.map((k) => `${STAT_LABEL[k]} ${fmt(t[k])}`).join(' · ')}
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
                <div className="nm">???</div>
                <div className="kd">{joinCondition(def.id)}</div>
                <div className="lv">&nbsp;</div>
              </div>
            );
          }
          const canUp = mine.level < levelCap(view.rank) && view.res.coin >= levelCost(def, mine.level);
          return (
            <button className="ycard" key={def.id} onClick={() => onOpen(def.id)}>
              <span className="stars">{'★'.repeat(def.grade)}</span>
              <span className="spec" style={{ background: SPEC_COLOR[def.specialty] }}>
                {STAT_LABEL[def.specialty]}
              </span>
              {canUp && <span className="can-up">↑</span>}
              <div className="pic">
                <Portrait def={def} />
              </div>
              <div className="nm">{def.name}</div>
              <div className="kd">{def.kind}</div>
              <div className="lv">
                Lv <b>{mine.level}</b>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function YokaiSheet({ view, id, onClose }: { view: GameState; id: string; onClose: () => void }) {
  const def: YokaiDef = YOKAI_BY_ID[id];
  const level = view.yokai[id]?.level ?? 1;
  const st = yokaiStats(def, level);
  const cap = levelCap(view.rank);
  const one = level < cap ? levelCost(def, level) : null;
  const ten = affordableLevels(view, id, 10);
  const max = affordableLevels(view, id, 9999);

  const up = (count: number) => {
    const r = act((s, now) => levelUp(s, now, id, count));
    if (r.ok) {
      buzz();
      pushToast({ text: `${def.name} Lv ${level + r.levels}!` });
    } else if (r.reason === 'no-coin') {
      pushToast({ text: '엽전이 모자라요', warn: true });
    }
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
              {def.name} <span>Lv {level}</span>
            </div>
            <div className="sd-kind">
              {def.kind} · <span style={{ color: 'var(--hwang)' }}>{'★'.repeat(def.grade)}</span> {GRADE_LABEL[def.grade]}
            </div>
            <div className="sd-intro">{def.intro}</div>
          </div>
        </div>
        <div className="stats4">
          {STAT_KEYS.map((k) => (
            <div key={k} className={k === def.specialty ? 'hi' : ''}>
              {STAT_LABEL[k]}
              {k === def.specialty ? ` · ${SPEC_RESOURCE[k]}` : ''}
              <b>{fmt(st[k])}</b>
              <small>+{def.growth[k]}/Lv</small>
            </div>
          ))}
        </div>
        <div className="lvbtns">
          <button className="btn hwang" disabled={one === null || view.res.coin < one} onClick={() => up(1)}>
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
        <div className="cap-note">
          레벨 상한 {cap} · 칭호가 오르면 상한도 올라가요
        </div>
      </div>
    </>
  );
}
