// 식객 탭: 가진 식객 목록(전투력 순)과 식객 창(성장: 레벨·별·장비·기술 / 인연: 대화·선물·나들이·인연 이야기).
import { useState } from 'react';
import { affordable, bondLevel, equip, giftPrice, giveGift, hasNewTalk, levelUp, outing, outingPrice, setFavorite, starUp, unseenScene } from '../core/engine';
import { fmt } from '../core/format';
import type { GameState } from '../core/types';
import { heroPower, heroStats, levelCap, levelCoinCost, levelExpCost, starCost } from '../core/units';
import { BALANCE as B } from '../data/balance';
import { ART } from '../data/art';
import { ITEM_BY_ID, itemEffect, type Slot } from '../data/items';
import { bondContent } from '../data/bond-content';
import { ELEMENT_COLOR, ELEMENT_LABEL, RARITY_LABEL, ROLE_LABEL, elementOf, roleOf, type Element } from '../data/roster';
import { SKILL_LABEL, SKILLS, skillText } from '../data/skills';
import { EPISODES } from '../data/story';
import { BOND_LEVELS, COMBOS, GIFTS } from '../data/village';
import { YOKAI, YOKAI_BY_ID } from '../data/yokai';
import { Art, Portrait } from './Portrait';
import { LineIcon, ResIcon } from './icons';
import { act } from './store';
import { buzz, pushToast } from './toast';
import { play } from './sound';
import type { ModalRequest } from './App';

/** 아직 없는 식객을 만나는 길 */
export function joinCondition(id: string): string {
  const join = YOKAI_BY_ID[id]?.join ?? '';
  const m = join.match(/^story:(s\d+e\d+)/);
  const chapter = m ? EPISODES.findIndex((e) => e.id === m[1]) : -1;
  return chapter >= 0 ? `모집 · ${chapter + 1}장 합류` : '모집';
}

function Hearts({ level }: { level: number }) {
  return (
    <span className="hearts" aria-label={`호감도 ${level}단계`}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i < level ? 'on' : ''}>
          <LineIcon name={i < level ? 'heart-fill' : 'heart'} size={16} />
        </i>
      ))}
    </span>
  );
}

const starReady = (s: GameState, id: string) => {
  const y = s.yokai[id];
  const cost = y ? starCost(y.stars) : null;
  return !!y && cost !== null && y.shards >= cost;
};

export function YokaiView({ view, onOpen }: { view: GameState; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<Element | 'all'>('all');
  const owned = Object.keys(view.yokai).sort((a, b) => heroPower(view, b, []) - heroPower(view, a, []));
  const locked = YOKAI.filter((d) => !view.yokai[d.id]).sort((a, b) => b.grade - a.grade);
  const show = (id: string) => filter === 'all' || elementOf(id) === filter;
  const first = owned[0];

  return (
    <div className="view">
      <div className="page-title">
        식객{' '}
        <span>
          {owned.length} / {YOKAI.length}
        </span>
      </div>
      <div className="yk-filter">
        {(['all', 'fire', 'water', 'wood', 'light', 'dark'] as const).map((e) => (
          <button key={e} className={filter === e ? 'on' : ''} onClick={() => setFilter(e)} style={e !== 'all' ? { color: ELEMENT_COLOR[e] } : undefined}>
            {e === 'all' ? '전체' : ELEMENT_LABEL[e]}
          </button>
        ))}
      </div>
      <div className="grid">
        {owned.filter(show).map((id) => {
          const def = YOKAI_BY_ID[id];
          const y = view.yokai[id];
          const badge = unseenScene(view, id) > 0 ? '새 이야기' : starReady(view, id) ? '★ 올리기' : null;
          const guide = [id === first ? 'levelup' : '', id === 'baekseol' ? 'talk' : ''].filter(Boolean).join(' ');
          return (
            <button className={`ycard r${def.grade}`} key={id} data-guide={guide || undefined} onClick={() => onOpen(id)}>
              <em className={`rar r${def.grade}`}>{RARITY_LABEL[def.grade]}</em>
              <i className="yc-el" style={{ background: ELEMENT_COLOR[elementOf(id)] }} title={ELEMENT_LABEL[elementOf(id)]} />
              {badge && <span className="can-up">{badge}</span>}
              <div className="pic">
                <Portrait def={def} />
              </div>
              <div className="nm">{def.name}</div>
              <div className="yc-stars">{'★'.repeat(y.stars)}</div>
              <div className="kd">
                Lv <b>{y.level}</b> · {ROLE_LABEL[roleOf(id)]}
              </div>
              <div className="lv">전투력 {fmt(heroPower(view, id, []))}</div>
            </button>
          );
        })}
        {locked
          .filter((d) => show(d.id))
          .map((def) => (
            <div className="ycard locked" key={def.id}>
              <em className={`rar r${def.grade}`}>{RARITY_LABEL[def.grade]}</em>
              <div className="pic">
                <Portrait def={def} />
              </div>
              <div className="nm">{def.name}</div>
              <div className="kd">{joinCondition(def.id)}</div>
              <div className="lv">&nbsp;</div>
            </div>
          ))}
      </div>
    </div>
  );
}

export function YokaiSheet({ view, id, open, onClose }: { view: GameState; id: string; open: (m: ModalRequest) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'grow' | 'bond'>('grow');
  const def = YOKAI_BY_ID[id];
  const y = view.yokai[id];
  if (!def || !y) return null;
  const el = elementOf(id);
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet yk-sheet" role="dialog" aria-label={`${def.name} 정보`}>
        <div className="grab" />
        <div className="yk-top">
          <div className={`yk-art r${def.grade}`}>
            <Art src={ART.card(id)} alt={def.name} fallback={<Portrait def={def} />} />
          </div>
          <div className="yk-id">
            <div className="yk-tags">
              <em className={`rar r${def.grade}`}>{RARITY_LABEL[def.grade]}</em>
              <span style={{ background: ELEMENT_COLOR[el] }}>{ELEMENT_LABEL[el]}</span>
              <span>{ROLE_LABEL[roleOf(id)]}</span>
            </div>
            <div className="sd-name">{def.name}</div>
            <div className="sd-kind">{def.kind}</div>
            <div className="yk-stars">{'★'.repeat(y.stars)}<i>{'★'.repeat(6 - y.stars)}</i></div>
            <div className="yk-pow">
              전투력 <b>{fmt(heroPower(view, id, []))}</b>
            </div>
            <button className="link-btn" disabled={view.favorite === id} onClick={() => act((s) => [setFavorite(s, id), null])}>
              {view.favorite === id ? '로비 대표 식객' : '로비 대표로 세우기'}
            </button>
          </div>
        </div>
        <div className="tabs">
          <button className={tab === 'grow' ? 'on' : ''} onClick={() => setTab('grow')}>
            성장
          </button>
          <button className={tab === 'bond' ? 'on' : ''} data-guide="talk" onClick={() => setTab('bond')}>
            인연{(unseenScene(view, id) > 0 || hasNewTalk(view, id)) && <i className="dot" />}
          </button>
        </div>
        {tab === 'grow' ? <GrowTab view={view} id={id} /> : <BondTab view={view} id={id} open={open} />}
      </div>
    </>
  );
}

function GrowTab({ view, id }: { view: GameState; id: string }) {
  const [picking, setPicking] = useState<Slot | null>(null);
  const def = YOKAI_BY_ID[id];
  const y = view.yokai[id];
  const st = heroStats(id, y, view.team.includes(id) ? view.team : []);
  const cap = levelCap(y.stars);
  const atCap = y.level >= cap;
  const cost = starCost(y.stars);
  const memory = view.inventory.memory ?? 0;
  const canStar = cost !== null && y.shards + memory >= cost;
  const skill = SKILLS[id];
  const combos = COMBOS.filter((c) => c.pair.includes(id));

  const up = (times: number) => {
    const r = act((s) => levelUp(s, id, times));
    if (!r.ok) {
      const why = { cap: '레벨 상한이에요. 별을 올리면 상한이 올라가요', 'no-exp': '수련치가 모자라요. 수련장·방치 보상으로 모아요', 'no-coin': '엽전이 모자라요', 'not-owned': '' }[r.reason];
      if (why) pushToast({ text: why, warn: true });
      return;
    }
    play('levelup');
    buzz(15);
  };
  const star = () => {
    const r = act((s) => starUp(s, id));
    if (!r.ok) return pushToast({ text: '조각이 모자라요', warn: true });
    play('promote');
    buzz(30);
    pushToast({ text: `${def.name} ★${r.stars} · 레벨 상한 ${levelCap(r.stars)}${r.memory ? ` · 기억 조각 ${r.memory}개 사용` : ''}` });
  };
  const wear = (slot: Slot, itemId: string | null) => {
    const r = act((s) => equip(s, id, slot, itemId));
    if (!r.ok) return;
    buzz(15);
    play('levelup');
    setPicking(null);
  };

  const opts = [
    { n: 1, label: '+1' },
    { n: 10, label: '+10' },
    { n: 999, label: '최대' },
  ].map((o) => ({ ...o, a: affordable(view, id, o.n) }));

  return (
    <>
      <div className="yk-stats">
        <div>
          체력<b>{fmt(st.hp)}</b>
        </div>
        <div>
          공격<b>{fmt(st.atk)}</b>
        </div>
        <div>
          방어<b>{fmt(st.def)}</b>
        </div>
        <div>
          속도<b>{fmt(st.spd)}</b>
        </div>
        <div>
          치명<b>{Math.round(st.crit * 100)}%</b>
        </div>
      </div>

      <div className="yk-block">
        <div className="exp-row">
          <span>
            Lv <b>{y.level}</b> <small>/ {cap}</small>
          </span>
          <span className="soft">
            {atCap ? (
              '별을 올리면 상한이 올라가요'
            ) : (
              <>
                다음 <ResIcon kind="exp" size={14} />
                {fmt(levelExpCost(y.level))} <ResIcon kind="coin" size={14} />
                {fmt(levelCoinCost(y.level))}
              </>
            )}
          </span>
        </div>
        <div className="bar exp-bar">
          <i style={{ width: `${(y.level / cap) * 100}%` }} />
        </div>
        <div className="yk-lvbtns">
          {opts.map((o) => (
            <button key={o.n} className={`btn ${o.n === 1 ? 'hong' : ''}`} data-guide={o.n === 1 ? 'levelup' : undefined} disabled={atCap || o.a.levels === 0} onClick={() => up(o.n)}>
              {o.label}
              <span>{o.a.levels > 0 ? `Lv ${y.level + o.a.levels}` : atCap ? '상한' : '모자람'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="yk-block">
        <div className="exp-row">
          <span>
            별 <b>★{y.stars}</b>
            {cost !== null && <small> → ★{y.stars + 1} (상한 Lv {levelCap(y.stars + 1)})</small>}
          </span>
          <span className="soft">{cost === null ? '가장 높은 별' : `조각 ${y.shards} / ${cost}`}</span>
        </div>
        {cost !== null && (
          <>
            <div className="bar exp-bar star">
              <i style={{ width: `${Math.min(100, (y.shards / cost) * 100)}%` }} />
            </div>
            <div className="yk-starrow">
              <small>
                조각은 모집에서 겹치거나 이야기에서 얻어요.
                {memory > 0 && ` 기억 조각 ${memory}개는 누구에게나 쓸 수 있어요.`}
              </small>
              <button className={`btn small ${canStar ? 'hong' : ''}`} disabled={!canStar} onClick={star}>
                별 올리기
              </button>
            </div>
          </>
        )}
      </div>

      {skill && (
        <div className="sd-skill">
          <span className="sd-skill-tag">고유 기술 · {SKILL_LABEL[skill.kind]}</span>
          <b>{skill.name}</b>
          <p>{skillText(skill.kind)}</p>
        </div>
      )}
      {combos.length > 0 && (
        <div className="yk-combo soft">
          짝꿍: {combos.map((c) => `${YOKAI_BY_ID[c.pair.find((p) => p !== id)!]?.name}(${c.title})`).join(', ')} · 함께 편성하면 공격력 +{Math.round(B.comboAtk * 100)}%
        </div>
      )}

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
  );
}

function BondTab({ view, id, open }: { view: GameState; id: string; open: (m: ModalRequest) => void }) {
  const [gifting, setGifting] = useState(false);
  const y = view.yokai[id];
  const lv = bondLevel(y.bond);
  const nextNeed = BOND_LEVELS[lv + 1]?.need;
  const newTalk = hasNewTalk(view, id);
  const content = bondContent(id);

  const gift = (giftId: string) => {
    const r = act((s) => giveGift(s, id, giftId));
    if (!r.ok) return pushToast({ text: '엽전이 모자라요', warn: true });
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
      <div className="bond-head">
        <Hearts level={lv} />
        <b>{BOND_LEVELS[lv].name}</b>
        <span className="soft">능력치 +{Math.round(lv * B.bondBonus * 100)}%</span>
      </div>
      <div className="bar" style={{ height: 10 }}>
        <i style={{ width: `${nextNeed ? ((y.bond - BOND_LEVELS[lv].need) / (nextNeed - BOND_LEVELS[lv].need)) * 100 : 100}%`, background: 'linear-gradient(90deg,#f29ca3,var(--hong))' }} />
      </div>
      <div className="soft" style={{ fontSize: 13, marginTop: 4 }}>
        {nextNeed ? `다음 단계 〈${BOND_LEVELS[lv + 1].name}〉까지 ${nextNeed - y.bond} · 함께 출정해도 조금씩 올라요` : '가장 깊은 인연이에요'}
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
      {items.length === 0 && <div className="soft">가진 {slot === 'weapon' ? '무기' : '장신구'}가 없어요. 로비의 방치 보상 상자에서 두 시간마다 하나씩 나와요.</div>}
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
