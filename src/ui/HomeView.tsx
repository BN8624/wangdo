// 로비: 배경 위에 대표 식객을 전신으로 크게 세우고, 왼쪽에 작은 둥근 버튼, 아래에 방치 보상 상자와 출정 버튼만 둔다.
// 할 일 안내는 대표 식객의 말풍선으로 한다.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { nextStage } from '../core/campaign';
import { rankFame, useWish } from '../core/engine';
import { fmt, fmtDuration } from '../core/format';
import { nextHint, type HintTarget } from '../core/hints';
import { afkPending } from '../core/idle';
import { guideStep } from '../core/guide';
import type { GameState } from '../core/types';
import { BALANCE as B } from '../data/balance';
import { ART } from '../data/art';
import { bondContent } from '../data/bond-content';
import { rankDef } from '../data/ranks';
import { YOKAI_BY_ID } from '../data/yokai';
import { LineIcon } from './icons';
import { Art } from './Portrait';
import { act } from './store';
import { stageName } from './StageFlow';
import { BackupSheet } from './Backup';
import { backupDue } from './backup';
import type { ModalRequest } from './App';

interface Props {
  view: GameState;
  now: number;
  open: (m: ModalRequest) => void;
  go: (t: HintTarget) => void;
  onHeroine: (id: string) => void;
}

export function HomeView({ view, now, open, go, onHeroine }: Props) {
  const step = guideStep(view);
  const hint = nextHint(view, now);
  // 들어오면 할 일을 한마디로 알려 주고, 누를 때마다 인연 대사를 한다
  const [say, setSay] = useState<{ text: string; hint: boolean } | null>(() => (!step && hint.target !== 'camp' ? { text: hint.text, hint: true } : null));
  const [taps, setTaps] = useState(0);
  const [backup, setBackup] = useState(false);
  useEffect(() => {
    if (!say) return;
    const t = setTimeout(() => setSay(null), 6000);
    return () => clearTimeout(t);
  }, [say]);

  const def = YOKAI_BY_ID[view.favorite] ?? YOKAI_BY_ID[Object.keys(view.yokai)[0]];
  const talks = bondContent(def.id).talks;
  const afk = afkPending(view, now);
  const frontier = nextStage(view);
  const wishOn = !!view.wish.pending || view.wish.charges > 0;

  const poke = () => {
    setTaps((n) => n + 1);
    if (talks.length) setSay({ text: talks[taps % talks.length].line, hint: false });
  };
  const followHint = () => {
    setSay(null);
    if (hint.target !== 'home') return go(hint.target);
    if (view.wish.pending) open({ kind: 'wish' });
    else open({ kind: 'afk' });
  };
  const doWish = () => {
    const r = act(useWish);
    if (r.ok) open({ kind: 'wish' });
  };

  return (
    <div className="view lb">
      <Art className="lb-bg" src={ART.bg('palace')} fallback={<div className="lb-bg" />} />
      <button className="lb-hero" aria-label={`${def.name}에게 말 걸기`} onClick={poke}>
        <Art key={def.id} src={ART.full(def.id)} alt={def.name} fallback={<span className="portrait-fallback">{def.name}</span>} />
      </button>

      {say && !(say.hint && say.text !== hint.text) && (
        <div className="lb-say" role="status">
          <b>{def.name}</b>
          <span>{say.text}</span>
          {say.hint ? <button onClick={followHint}>가기 ›</button> : <button onClick={() => onHeroine(def.id)}>대화 ›</button>}
        </div>
      )}

      <div className="lb-side">
        <button className="lb-icon" data-guide="ttuk" disabled={!wishOn} onClick={doWish}>
          <span>
            <LineIcon name="flag" size={22} />
            {wishOn && <i className="dot" />}
          </span>
          정무
        </button>
        <button className="lb-icon" data-guide="story" onClick={() => open({ kind: 'story' })}>
          <span>
            <LineIcon name="scroll" size={22} />
          </span>
          이야기
        </button>
        <button className="lb-icon" onClick={() => open({ kind: 'rankinfo' })}>
          <span>
            <LineIcon name="crown" size={22} />
          </span>
          관직
        </button>
        <button className="lb-icon" onClick={() => setBackup(true)}>
          <span>
            <LineIcon name="book" size={22} />
            {backupDue(view, now) && <i className="dot" />}
          </span>
          백업
        </button>
      </div>

      <div className="lb-bottom">
        <button className={`lb-chest ${afk.minutes >= 60 ? 'ready' : ''}`} data-guide="afk" onClick={() => open({ kind: 'afk' })}>
          <LineIcon name="chest" size={30} />
          <span>{afk.minutes >= B.afkCapMinutes ? '가득 참' : fmtDuration(afk.minutes * 60_000)}</span>
          <i style={{ width: `${Math.min(100, (afk.minutes / B.afkCapMinutes) * 100)}%` }} />
        </button>
        <button className="lb-go" onClick={() => (frontier ? open({ kind: 'stage', id: frontier.id }) : go('camp'))}>
          <b>출정</b>
          <small>{frontier ? `${frontier.label} ${stageName(frontier)}` : '모든 장을 깼어요'}</small>
        </button>
      </div>
      {backup && <BackupSheet view={view} now={now} onClose={() => setBackup(false)} />}
    </div>
  );
}

/** 관직 창: 다음 관직까지 명성 */
export function RankSheet({ view, onClose }: { view: GameState; onClose: () => void }) {
  const from = rankFame(view.rank);
  const to = rankFame(view.rank + 1);
  const have = view.res.fame;
  const next = rankDef(view.rank + 1);
  return createPortal(
    <>
      <div className="dim" onClick={onClose} />
      <div className="modal rank-modal" role="dialog" aria-label="관직">
        <div className="title">{rankDef(view.rank).title}</div>
        <div className="sub">{rankDef(view.rank).flavor}</div>
        <div className="soft">
          다음 관직 · <b>{next.title}</b> · 오르면 옥 +{fmt(B.rankJade + 20 * (view.rank + 1))}
        </div>
        <div className="bar-row">
          <span className="lbl">명성</span>
          <div className="bar">
            <i style={{ width: `${Math.min(100, ((have - from) / Math.max(1, to - from)) * 100)}%`, background: 'var(--seal)' }} />
          </div>
          <span className="num">
            {fmt(have)} / {fmt(to)}
          </span>
        </div>
        <div className="soft small-note">명성은 스테이지 첫 클리어·수련장·방치 보상·정무로 쌓이고, 차면 관직이 저절로 올라요.</div>
        <div className="actions">
          <button className="btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
