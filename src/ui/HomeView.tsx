// 로비: 대표 식객을 크게 세우고, 방치 보상 상자·다음 출정·할 일 한 줄을 둔다.
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
import { RARITY_LABEL } from '../data/roster';
import { themeOf } from '../data/themes';
import { YOKAI_BY_ID } from '../data/yokai';
import { LineIcon } from './icons';
import { Art } from './Portrait';
import { act } from './store';
import { stageName } from './StageFlow';
import { BackupSheet } from './Backup';
import { backupDue, lastBackupAt, snoozeBackup } from './backup';
import type { ModalRequest } from './App';

interface Props {
  view: GameState;
  now: number;
  open: (m: ModalRequest) => void;
  go: (t: HintTarget) => void;
  onHeroine: (id: string) => void;
}

export function HomeView({ view, now, open, go, onHeroine }: Props) {
  const [taps, setTaps] = useState(0);
  const [line, setLine] = useState<string | null>(null);
  const [backup, setBackup] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  useEffect(() => {
    if (!line) return;
    const t = setTimeout(() => setLine(null), 5000);
    return () => clearTimeout(t);
  }, [line, taps]);
  const step = guideStep(view);
  const def = YOKAI_BY_ID[view.favorite] ?? YOKAI_BY_ID[Object.keys(view.yokai)[0]];
  const hint = nextHint(view, now);
  const talks = bondContent(def.id).talks;
  const afk = afkPending(view, now);
  const frontier = nextStage(view);
  const poke = () => {
    setTaps((n) => n + 1);
    setLine(talks.length ? talks[taps % talks.length].line : null);
  };
  const doWish = () => {
    const r = act(useWish);
    if (r.ok) open({ kind: 'wish' });
  };
  const followHint = () => {
    if (hint.target !== 'home') return go(hint.target);
    if (view.wish.pending) open({ kind: 'wish' });
    else open({ kind: 'afk' });
  };

  return (
    <div className="view home">
      <div className="home-menu">
        <button className="menu-icon" data-guide="ttuk" disabled={!view.wish.pending && view.wish.charges <= 0} onClick={doWish}>
          <LineIcon name="flag" size={24} />
          <span>정무</span>
          {(view.wish.pending || view.wish.charges > 0) && <i className="badge">{view.wish.pending ? '!' : view.wish.charges}</i>}
        </button>
        <button className="menu-icon" data-guide="story" onClick={() => open({ kind: 'story' })}>
          <LineIcon name="scroll" size={24} />
          <span>이야기</span>
        </button>
        <button className="menu-icon" onClick={() => open({ kind: 'rankinfo' })}>
          <LineIcon name="crown" size={24} />
          <span>관직</span>
        </button>
        <button className="menu-icon" onClick={() => setBackup(true)}>
          <LineIcon name="book" size={24} />
          <span>백업</span>
        </button>
      </div>

      <div className="heroine card-stage">
        <button className="heroine-art" aria-label={`${def.name}에게 말 걸기`} onClick={poke}>
          <Art className="heroine-card" src={ART.card(def.id)} alt={def.name} fallback={<div className="portrait-fallback">{def.name}</div>} />
        </button>
        <div className="nameplate">
          <small style={{ background: themeOf(def.id) }}>
            {RARITY_LABEL[def.grade]} · {def.kind}
          </small>
          <b>{def.name}</b>
        </div>
        <button className={`afk-btn ${afk.minutes >= 60 ? 'ready' : ''}`} data-guide="afk" onClick={() => open({ kind: 'afk' })}>
          <LineIcon name="chest" size={34} />
          <span>{afk.minutes >= B.afkCapMinutes ? '가득 참' : fmtDuration(afk.minutes * 60_000)}</span>
          <i style={{ width: `${Math.min(100, (afk.minutes / B.afkCapMinutes) * 100)}%` }} />
        </button>
        {line && (
          <div className="say" role="status">
            <b>{def.name}</b>
            <span>{line}</span>
            <button onClick={() => onHeroine(def.id)}>대화하기 ›</button>
          </div>
        )}
        {!line && !step && !snoozed && backupDue(view, now) && (
          <div className="backup-nudge" role="status">
            <span>
              <b>진행을 백업해 두세요</b>
              <small>{lastBackupAt() ? `마지막 백업 ${Math.floor((now - lastBackupAt()) / 86_400_000)}일 전` : '저장은 이 기기에만 있어요'}</small>
            </span>
            <button className="go" onClick={() => setBackup(true)}>
              백업
            </button>
            <button
              className="later"
              onClick={() => {
                snoozeBackup();
                setSnoozed(true);
              }}
            >
              나중에
            </button>
          </div>
        )}
      </div>

      {frontier ? (
        <button className="home-go" onClick={() => open({ kind: 'stage', id: frontier.id })}>
          <small>출정</small>
          <b>
            {frontier.label} {stageName(frontier)}
          </b>
          <em>›</em>
        </button>
      ) : (
        <button className="home-go" onClick={() => go('camp')}>
          <small>출정</small>
          <b>모든 장을 깼어요 · 수련장</b>
          <em>›</em>
        </button>
      )}
      {!step && (
        <button className="quest" onClick={followHint}>
          <b>할 일</b>
          <span>{hint.text}</span>
          <em>가기 ›</em>
        </button>
      )}
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
