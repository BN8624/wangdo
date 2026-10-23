import { useEffect, useMemo, useState } from 'react';
import { RESOURCE_KEYS, handsNeeded, promoteCheck, settle, type StageResult } from '../core/engine';
import { fmt } from '../core/format';
import type { HintTarget } from '../core/hints';
import { HomeView } from './HomeView';
import { NavIcon, ResIcon } from './icons';
import { IntroModal, OfflineModal, PromoteModal, StageResultModal, WishModal } from './modals';
import { RecordView } from './RecordView';
import { StageView } from './StageView';
import { act, takeOfflineSummary, useGame, type OfflineSummary } from './store';
import { useToasts } from './toast';
import { YokaiSheet, YokaiView } from './YokaiView';

export type ModalRequest =
  | { kind: 'wish' }
  | { kind: 'promote'; rank: number; recruit: string | null }
  | { kind: 'stage'; result: Extract<StageResult, { ok: true }> }
  | { kind: 'offline'; summary: OfflineSummary }
  | { kind: 'intro' };

type Tab = 'home' | 'yokai' | 'stage' | 'record';

const TABS: { id: Tab; label: string; icon: 'home' | 'yokai' | 'stage' | 'record' }[] = [
  { id: 'home', label: '고을', icon: 'home' },
  { id: 'yokai', label: '식객', icon: 'yokai' },
  { id: 'stage', label: '소동', icon: 'stage' },
  { id: 'record', label: '기록', icon: 'record' },
];

export function App() {
  const { state, now } = useGame();
  // 화면에는 지금 시각까지 정산한 상태를 보여 준다(저장된 상태는 행동할 때만 바뀐다).
  const view = useMemo(() => settle(state, now), [state, now]);
  const [tab, setTab] = useState<Tab>('home');
  const [queue, setQueue] = useState<ModalRequest[]>([]);
  const [sheet, setSheet] = useState<string | null>(null);
  const toasts = useToasts();

  useEffect(() => {
    const first: ModalRequest[] = [];
    if (!state.introSeen) first.push({ kind: 'intro' });
    const offline = takeOfflineSummary();
    if (offline) first.push({ kind: 'offline', summary: offline });
    if (state.wish.pending) first.push({ kind: 'wish' });
    if (first.length) setQueue(first);
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const open = (m: ModalRequest) => setQueue((q) => [...q, m]);
  const closeTop = () => setQueue((q) => q.slice(1));
  const go = (t: HintTarget) => setTab(t);
  const top = queue[0];

  const need = handsNeeded(view);
  const badges: Record<Tab, boolean> = {
    home: promoteCheck(view).ok || view.wish.charges > 0,
    yokai: false,
    stage: need !== null && view.res.hands >= need,
    record: false,
  };

  return (
    <div className="app">
      <div className="res-bar">
        {RESOURCE_KEYS.map((k) => (
          <div className="chip" key={k}>
            <ResIcon kind={k} />
            {fmt(view.res[k])}
          </div>
        ))}
      </div>

      {tab === 'home' && <HomeView view={view} now={now} open={open} go={go} />}
      {tab === 'yokai' && <YokaiView view={view} onOpen={setSheet} />}
      {tab === 'stage' && <StageView view={view} open={open} />}
      {tab === 'record' && <RecordView view={view} now={now} />}

      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <NavIcon name={t.icon} />
            {t.label}
            {badges[t.id] && tab !== t.id && <span className="badge" />}
          </button>
        ))}
      </nav>

      {sheet && <YokaiSheet view={view} id={sheet} onClose={() => setSheet(null)} />}

      {top?.kind === 'intro' && (
        <IntroModal
          onClose={() => {
            act((s) => [{ ...s, introSeen: true }, null]);
            closeTop();
          }}
        />
      )}
      {top?.kind === 'offline' && <OfflineModal summary={top.summary} onClose={closeTop} />}
      {top?.kind === 'wish' && <WishModal view={view} onClose={closeTop} />}
      {top?.kind === 'promote' && <PromoteModal rank={top.rank} recruit={top.recruit} onClose={closeTop} />}
      {top?.kind === 'stage' && <StageResultModal result={top.result} onClose={closeTop} />}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.warn ? 'warn' : ''}`}>
            {t.res && <ResIcon kind={t.res} size={16} />}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
