import { useState } from 'react';
import {
  activeCombos,
  assign,
  feast,
  feastCost,
  feastFame,
  hasAptitude,
  nextRank,
  ownedYokai,
  power,
  promote,
  promoteCheck,
  slotsPerWorkplace,
  statsOf,
  useWish,
  wishMaxCharges,
  wishRegenRemaining,
  workplaceOf,
  workplaceRate,
} from '../core/engine';
import { fmt, fmtDuration, fmtRate } from '../core/format';
import { nextHint, type HintTarget } from '../core/hints';
import { RANKS } from '../data/ranks';
import { WORKPLACES, WORKPLACE_BY_ID } from '../data/village';
import { STAT_LABEL } from '../data/yokai';
import type { GameState, WorkplaceId } from '../core/types';
import { Club, ResIcon, VillageScene } from './icons';
import { Portrait } from './Portrait';
import { act } from './store';
import { buzz, pushToast } from './toast';
import type { ModalRequest } from './App';

interface Props {
  view: GameState;
  now: number;
  open: (m: ModalRequest) => void;
  go: (t: HintTarget) => void;
}

export function HomeView({ view, now, open, go }: Props) {
  const [swing, setSwing] = useState(0);
  const [picking, setPicking] = useState<WorkplaceId | null>(null);
  const target = nextRank(view);
  const pw = power(view);
  const canPromote = promoteCheck(view).ok;
  const maxCharges = wishMaxCharges(view.rank);
  const regen = wishRegenRemaining(view, now);
  const cost = feastCost(view.rank);
  const hint = nextHint(view, now);
  const day = Math.floor((now - view.createdAt) / 86_400_000) + 1;
  const slots = slotsPerWorkplace(view.rank);

  const doWish = () => {
    const r = act(useWish);
    if (!r.ok) return;
    buzz(20);
    setSwing((n) => n + 1);
    setTimeout(() => open({ kind: 'wish' }), view.wish.pending ? 0 : 380);
  };

  const doFeast = () => {
    const r = act(feast);
    if (r.ok) {
      buzz();
      pushToast({ text: `잔치 성공! 명성 +${fmt(r.fame)} · 모두 기뻐해요`, res: 'fame' });
    }
  };

  const doPromote = () => {
    const r = act(promote);
    if (r.ok) {
      buzz(40);
      open({ kind: 'promote', rank: r.rank, recruit: r.recruit });
    }
  };

  return (
    <div className="view">
      <div className="scene">
        <VillageScene rank={view.rank} />
        <div className="banner">달골 · {day}일째</div>
      </div>

      <div className="card rank-card">
        <div className="rank-top">
          <div className="rank-title">
            <small>칭호</small>
            {RANKS[view.rank].title}
          </div>
          <div className="next">{target ? <>다음 ▸ <b>{target.title}</b></> : '최고 칭호'}</div>
        </div>
        {target && (
          <>
            <Progress label="위세" have={pw} need={target.powerReq} color="var(--cheong)" />
            <Progress label="명성" have={view.res.fame} need={target.fameCost} color="var(--hwang)" />
            {canPromote && (
              <button className="btn hong wide glow promote" onClick={doPromote}>
                〈{target.title}〉(으)로 승급!
              </button>
            )}
          </>
        )}
      </div>

      <div className="section-head">
        <b>일터</b>
        <span>식객을 보내면 저절로 벌어 와요 · 칸 {slots}개씩</span>
      </div>
      <div className="works">
        {WORKPLACES.map((wp) => {
          const ids = view.work[wp.id];
          const combos = activeCombos(ids);
          return (
            <button key={wp.id} className="work" onClick={() => setPicking(wp.id)}>
              <div className="work-top">
                <b>{wp.name}</b>
                <span className="work-rate">
                  <ResIcon kind={wp.produces} size={16} />
                  {wp.produces === 'fame' ? fmtRate(workplaceRate(view, wp) * 60) : fmtRate(workplaceRate(view, wp))}
                  <small>/{wp.produces === 'fame' ? '시간' : '분'}</small>
                </span>
              </div>
              <div className="work-sub">
                {STAT_LABEL[wp.stat]} → {wp.produces === 'coin' ? '엽전' : wp.produces === 'grain' ? '곡식' : '명성'}
                {combos.length > 0 && <em> · 짝꿍 +{combos.length * 20}%</em>}
              </div>
              <div className="work-slots">
                {Array.from({ length: slots }, (_, i) => (
                  <div key={i} className={`slot ${ids[i] ? '' : 'empty'}`}>
                    {ids[i] ? <Portrait def={ownedYokai(view).find((o) => o.def.id === ids[i])!.def} /> : '+'}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="big-actions">
        <button key={swing} className={`ttuk ${swing ? 'swing' : ''}`} disabled={!view.wish.pending && view.wish.charges <= 0} onClick={doWish}>
          <div className="t1">금 나와라 뚝딱!</div>
          <div className="t2">{view.wish.pending ? '손님이 기다리고 있어요' : '누군가 소원을 들고 찾아와요'}</div>
          <div className="dots">
            {Array.from({ length: maxCharges }, (_, i) => (
              <b key={i} className={i < view.wish.charges ? '' : 'off'} />
            ))}
          </div>
          <div className="timer">{regen === null ? '가득 찼어요' : `다음 충전 ${fmtDuration(regen)}`}</div>
          <Club />
        </button>
        <div className="feast">
          <div className="t1">잔치 열기</div>
          <div className="t2">
            곡식 {fmt(cost)} → 명성 +{fmt(feastFame(view))}
            <br />
            식객 모두 호감도 ↑
          </div>
          <button className="btn hong" disabled={view.res.grain < cost} onClick={doFeast}>
            {view.res.grain < cost ? '곡식 부족' : '잔치!'}
          </button>
        </div>
      </div>

      <button className="hint" onClick={() => go(hint.target)}>
        <b>다음 할 일 ·</b> {hint.text}
      </button>
      <div style={{ height: 16 }} />

      {picking && <WorkSheet view={view} wp={picking} open={open} onClose={() => setPicking(null)} />}
    </div>
  );
}

function Progress({ label, have, need, color }: { label: string; have: number; need: number; color: string }) {
  const ok = have >= need;
  return (
    <div className="bar-row">
      <span className="lbl">{label}</span>
      <div className="bar">
        <i style={{ width: `${Math.min(100, (have / need) * 100)}%`, background: color }} />
      </div>
      <span className={`num ${ok ? 'ok' : ''}`}>
        {fmt(have)} / {fmt(need)}
        {ok ? ' ✓' : ''}
      </span>
    </div>
  );
}

/** 일터에 보낼 식객 고르기 */
function WorkSheet({ view, wp: wpId, open, onClose }: { view: GameState; wp: WorkplaceId; open: (m: ModalRequest) => void; onClose: () => void }) {
  const wp = WORKPLACE_BY_ID[wpId];
  const full = view.work[wpId].length >= slotsPerWorkplace(view.rank);
  const list = ownedYokai(view)
    .map(({ def }) => ({ def, value: statsOf(view, def.id)[wp.stat] * (hasAptitude(def, wp) ? 1.5 : 1), at: workplaceOf(view, def.id) }))
    .sort((a, b) => b.value - a.value);

  const send = (id: string, to: WorkplaceId | null) => {
    const r = act((s, now) => assign(s, now, id, to));
    if (!r.ok) {
      if (r.reason === 'full') pushToast({ text: '칸이 가득 찼어요. 먼저 한 명을 쉬게 하세요', warn: true });
      return;
    }
    buzz();
    for (const c of r.newCombos) open({ kind: 'combo', combo: c });
  };

  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={`${wp.name} 배치`}>
        <div className="grab" />
        <div className="sheet-title">
          {wp.name} <span>{wp.flavor}</span>
        </div>
        <div className="pick-list">
          {list.map(({ def, at }) => {
            const here = at === wpId;
            return (
              <div key={def.id} className={`pick ${here ? 'here' : ''}`}>
                <div className="pick-pic">
                  <Portrait def={def} />
                </div>
                <div className="pick-info">
                  <b>{def.name}</b>
                  <span>
                    {STAT_LABEL[wp.stat]} {fmt(statsOf(view, def.id)[wp.stat])}
                    {hasAptitude(def, wp) && <em> 적성 ×1.5</em>}
                  </span>
                  <small>{at ? `${WORKPLACE_BY_ID[at].name}에서 일하는 중` : '쉬는 중'}</small>
                </div>
                {here ? (
                  <button className="btn cheong small" onClick={() => send(def.id, null)}>
                    쉬게 하기
                  </button>
                ) : (
                  <button className="btn hwang small" disabled={full} onClick={() => send(def.id, wpId)}>
                    보내기
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
