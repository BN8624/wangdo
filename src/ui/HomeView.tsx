import { useState } from 'react';
import {
  PRODUCER,
  STORED_KEYS,
  collect,
  feast,
  feastCost,
  feastFame,
  nextRank,
  power,
  promote,
  promoteCheck,
  ratesPerMinute,
  storageCaps,
  useWish,
  wishMaxCharges,
  wishRegenRemaining,
} from '../core/engine';
import { fmt, fmtDuration, fmtRate } from '../core/format';
import { nextHint, type HintTarget } from '../core/hints';
import { RANKS } from '../data/ranks';
import { STAT_LABEL } from '../data/yokai';
import type { GameState, StoredKey } from '../core/types';
import { Club, RES_LABEL, VillageScene } from './icons';
import { act } from './store';
import { buzz, pushToast } from './toast';
import type { ModalRequest } from './App';

const STORE_INFO: Record<StoredKey, { work: string; btn: string; color: string }> = {
  coin: { work: '장사', btn: 'hwang', color: 'var(--hwang)' },
  grain: { work: '농사', btn: 'cheong', color: 'var(--yeon)' },
  hands: { work: '모집', btn: 'nam', color: 'var(--nam)' },
};

interface Props {
  view: GameState;
  now: number;
  open: (m: ModalRequest) => void;
  go: (t: HintTarget) => void;
}

export function HomeView({ view, now, open, go }: Props) {
  const [swing, setSwing] = useState(0);
  const rates = ratesPerMinute(view);
  const caps = storageCaps(view);
  const target = nextRank(view);
  const pw = power(view);
  const canPromote = promoteCheck(view).ok;
  const maxCharges = wishMaxCharges(view.rank);
  const regen = wishRegenRemaining(view, now);
  const cost = feastCost(view.rank);
  const fameGain = feastFame(view);
  const hint = nextHint(view);
  const day = Math.floor((now - view.createdAt) / 86_400_000) + 1;

  const doCollect = (k: StoredKey) => {
    const r = act((s, t) => collect(s, t, [k]));
    if (r.amounts[k] > 0) {
      buzz();
      pushToast({ text: `+${fmt(r.amounts[k])} ${RES_LABEL[k]}`, res: k });
    }
  };

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
      pushToast({ text: `잔치 성공! 명성 +${fmt(r.fame)}`, res: 'fame' });
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
          {target ? (
            <div className="next">
              다음 ▸ <b>{target.title}</b>
            </div>
          ) : (
            <div className="next">최고 칭호</div>
          )}
        </div>
        {target && (
          <>
            <div className="bar-row">
              <span className="lbl">위세</span>
              <div className="bar">
                <i style={{ width: `${Math.min(100, (pw / target.powerReq) * 100)}%`, background: 'var(--cheong)' }} />
              </div>
              <span className={`num ${pw >= target.powerReq ? 'ok' : ''}`}>
                {fmt(pw)} / {fmt(target.powerReq)}
                {pw >= target.powerReq ? ' ✓' : ''}
              </span>
            </div>
            <div className="bar-row">
              <span className="lbl">명성</span>
              <div className="bar">
                <i style={{ width: `${Math.min(100, (view.res.fame / target.fameCost) * 100)}%`, background: 'var(--hwang)' }} />
              </div>
              <span className={`num ${view.res.fame >= target.fameCost ? 'ok' : ''}`}>
                {fmt(view.res.fame)} / {fmt(target.fameCost)}
                {view.res.fame >= target.fameCost ? ' ✓' : ''}
              </span>
            </div>
            {canPromote && (
              <button className="btn hong wide glow promote" onClick={doPromote}>
                〈{target.title}〉(으)로 승급!
              </button>
            )}
          </>
        )}
      </div>

      <div className="stores">
        {STORED_KEYS.map((k) => {
          const amount = Math.floor(view.store[k]);
          const full = caps[k] > 0 && view.store[k] >= caps[k] * 0.995;
          const info = STORE_INFO[k];
          return (
            <div className="store" key={k}>
              {full && <span className="full-tag">가득!</span>}
              <div className="t">
                {info.work} · {RES_LABEL[k]}
              </div>
              <div className="v">{fmt(amount)}</div>
              <div className="bar">
                <i style={{ width: `${caps[k] > 0 ? Math.min(100, (view.store[k] / caps[k]) * 100) : 0}%`, background: info.color }} />
              </div>
              <div className="rate">
                분당 {fmtRate(rates[k])} · {STAT_LABEL[PRODUCER[k]]}
              </div>
              <button className={`btn ${info.btn}`} disabled={amount < 1} onClick={() => doCollect(k)}>
                거두기
              </button>
            </div>
          );
        })}
      </div>

      <div className="big-actions">
        <button
          key={swing}
          className={`ttuk ${swing ? 'swing' : ''}`}
          disabled={!view.wish.pending && view.wish.charges <= 0}
          onClick={doWish}
        >
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
            곡식 {fmt(cost)} → 명성 +{fmt(fameGain)}
            <br />
            매력이 높을수록 ↑
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
    </div>
  );
}
