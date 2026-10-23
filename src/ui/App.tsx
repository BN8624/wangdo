import { useEffect, useMemo, useState } from 'react';
import { RESOURCE_KEYS, bestParty, partyChance, partyChances, promoteCheck, settle, stageInfo, talkReadyIn, unseenScene, type FightResult } from '../core/engine';
import { fmt } from '../core/format';
import type { HintTarget } from '../core/hints';
import type { ComboDef } from '../core/types';
import { HomeView } from './HomeView';
import { NavIcon, ResIcon } from './icons';
import {
  BondUpModal,
  ComboModal,
  FightModal,
  IntroModal,
  OfflineModal,
  PromoteModal,
  ReactModal,
  SceneViewer,
  TalkModal,
  WishModal,
} from './modals';
import { RecordView } from './RecordView';
import { StageView } from './StageView';
import { act, takeOfflineSummary, useGame, type OfflineSummary } from './store';
import { useToasts } from './toast';
import { YokaiSheet, YokaiView } from './YokaiView';

export type ModalRequest =
  | { kind: 'wish' }
  | { kind: 'promote'; rank: number; recruit: string | null }
  | { kind: 'fight'; result: Extract<FightResult, { ok: true }> }
  | { kind: 'offline'; summary: OfflineSummary }
  | { kind: 'intro' }
  | { kind: 'talk'; id: string }
  | { kind: 'react'; id: string; text: string; gained: number; levelUp: number; outing?: boolean }
  | { kind: 'bondup'; id: string; level: number }
  | { kind: 'scene'; id: string; level: number }
  | { kind: 'combo'; combo: ComboDef };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const open = (m: ModalRequest) => setQueue((q) => [...q, m]);
  const closeTop = () => setQueue((q) => q.slice(1));
  const go = (t: HintTarget) => setTab(t);
  const top = queue[0];

  const badges = useMemo(() => {
    const ids = Object.keys(view.yokai);
    const info = stageInfo(view.stage.index);
    return {
      home: promoteCheck(view).ok || view.wish.charges > 0,
      yokai: ids.some((id) => unseenScene(view, id) > 0 || talkReadyIn(view, id, now) === 0),
      stage: !!info && view.stamina.value > 0 && partyChance(partyChances(view, info, bestParty(view, info))) >= 0.5,
      record: false,
    } satisfies Record<Tab, boolean>;
    // 1초마다 다시 계산하지 않도록 분 단위로만 갱신한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, Math.floor(now / 60_000)]);

  return (
    <div className="app">
      <div className="res-bar">
        {RESOURCE_KEYS.map((k) => (
          <div className="chip" key={k}>
            <ResIcon kind={k} />
            {fmt(view.res[k])}
          </div>
        ))}
        <div className="chip">
          <ResIcon kind="stamina" />
          {view.stamina.value}
        </div>
      </div>

      {tab === 'home' && <HomeView view={view} now={now} open={open} go={go} />}
      {tab === 'yokai' && <YokaiView view={view} now={now} onOpen={setSheet} />}
      {tab === 'stage' && <StageView view={view} now={now} open={open} />}
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

      {sheet && !top && <YokaiSheet view={view} now={now} id={sheet} open={open} onClose={() => setSheet(null)} />}

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
      {top?.kind === 'fight' && <FightModal result={top.result} onClose={closeTop} />}
      {top?.kind === 'talk' && <TalkModal view={view} id={top.id} open={open} onClose={closeTop} />}
      {top?.kind === 'react' && <ReactModal {...top} open={open} onClose={closeTop} />}
      {top?.kind === 'bondup' && <BondUpModal id={top.id} level={top.level} open={open} onClose={closeTop} />}
      {top?.kind === 'scene' && <SceneViewer key={`${top.id}-${top.level}`} id={top.id} level={top.level} onClose={closeTop} />}
      {top?.kind === 'combo' && <ComboModal combo={top.combo} onClose={closeTop} />}

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
