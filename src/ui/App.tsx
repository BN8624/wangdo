import { useEffect, useMemo, useState } from 'react';
import { STAGES } from '../core/campaign';
import { RESOURCE_KEYS, settle, unseenScene } from '../core/engine';
import { fmt } from '../core/format';
import { advanceGuide, guideStep } from '../core/guide';
import type { HintTarget } from '../core/hints';
import { afkPending } from '../core/idle';
import { starCost, teamPower } from '../core/units';
import { BALANCE as B } from '../data/balance';
import { rankDef } from '../data/ranks';
import { useNewVersion } from './update';
import { HomeView, RankSheet } from './HomeView';
import { YokaiSheet, YokaiView } from './YokaiView';
import { CampaignView } from './CampaignView';
import { GachaView } from './GachaView';
import { RecordView } from './RecordView';
import { StageFlow, TrainFlow } from './StageFlow';
import { StoryList } from './StoryView';
import { IconSymbols, LineIcon, NavIcon, RES_LABEL, ResIcon } from './icons';
import { AfkModal, BondUpModal, RankModal, ReactModal, SceneViewer, TalkModal, WishModal } from './modals';
import { act, useGame } from './store';
import { pushToast, useToasts } from './toast';
import { GuideBar, rewardText } from './Guide';
import { AdultGate, adultConfirmed } from './Backup';
import { warmArt } from './warm';
import { setMood } from './sound';

export type ModalRequest =
  | { kind: 'wish' }
  | { kind: 'afk' }
  | { kind: 'rank'; ranks: number[] }
  | { kind: 'rankinfo' }
  | { kind: 'stage'; id: string }
  | { kind: 'train'; tier: number }
  | { kind: 'story' }
  | { kind: 'talk'; id: string }
  | { kind: 'react'; id: string; text: string; gained: number; levelUp: number; outing?: boolean }
  | { kind: 'bondup'; id: string; level: number }
  | { kind: 'scene'; id: string; level: number };

type Tab = 'home' | 'yokai' | 'camp' | 'gacha' | 'record';

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: '로비' },
  { id: 'yokai', label: '식객' },
  { id: 'camp', label: '출정' },
  { id: 'gacha', label: '모집' },
  { id: 'record', label: '기록' },
];

export function App() {
  const { state, now } = useGame();
  const newVersion = useNewVersion();
  const view = useMemo(() => settle(state, now), [state, now]);
  const [tab, setTab] = useState<Tab>('home');
  const [queue, setQueue] = useState<ModalRequest[]>([]);
  const [sheet, setSheet] = useState<string | null>(null);
  const [adult, setAdult] = useState(adultConfirmed);
  const toasts = useToasts();

  useEffect(() => {
    const first: ModalRequest[] = [];
    if (!state.introSeen) {
      // 처음이면 1-1의 이야기와 첫 전투부터
      act((s) => [{ ...s, introSeen: true }, null]);
      first.push({ kind: 'stage', id: STAGES[0].id });
    } else if (afkPending(state, Date.now()).minutes >= 30) first.push({ kind: 'afk' });
    if (state.wish.pending) first.push({ kind: 'wish' });
    if (first.length) setQueue(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  // 곧 쓸 그림(식객 카드·전신, 다음 스테이지 상대)을 한가할 때 미리 받아 둔다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => warmArt(state), [Object.keys(state.camp.stars).length, Object.keys(state.yokai).length]);

  const open = (m: ModalRequest) => setQueue((q) => [...q, m]);
  const closeTop = () => setQueue((q) => q.slice(1));
  const go = (t: HintTarget) => setTab(t);
  const top = queue[0];
  const step = guideStep(state);

  // 배경음: 출정·수련은 StageFlow가 직접 고른다. 이야기·인연 장면은 잔잔하게, 나머지는 궁궐 가락
  useEffect(() => {
    if (top?.kind === 'stage' || top?.kind === 'train') return;
    setMood(!adult ? 'off' : top?.kind === 'story' || top?.kind === 'scene' ? 'story' : 'home');
  }, [adult, top?.kind]);

  // 안내 단계의 할 일을 해냈으면 다음 단계로 넘긴다.
  useEffect(() => {
    if (!step?.done?.(state)) return;
    const done = act((s) => advanceGuide(s));
    if (done) pushToast({ text: `안내 완료! ${rewardText(done)}` });
  }, [state, step]);

  const minute = Math.floor(now / 60_000);
  const badges = useMemo(() => {
    const ids = Object.keys(view.yokai);
    return {
      home: view.wish.charges > 0 || !!view.wish.pending || afkPending(view, now).minutes >= 60,
      yokai: ids.some((id) => unseenScene(view, id) > 0 || (view.yokai[id].shards >= (starCost(view.yokai[id].stars) ?? Infinity))),
      camp: false,
      gacha: view.res.jade >= B.pullCost * 10,
      record: false,
    } satisfies Record<Tab, boolean>;
    // 1초마다 다시 계산하지 않도록 분 단위로만 갱신한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, minute]);

  if (!adult) return <AdultGate onPass={() => setAdult(true)} />;

  return (
    <div className={`app ${step ? 'guiding' : ''}`}>
      <IconSymbols />
      {newVersion && (
        <button className="update-bar" onClick={() => location.reload()}>
          새 버전이 나왔어요 · 눌러서 새로고침
        </button>
      )}
      <header className="topbar" data-guide="res">
        <button className="rank-btn" onClick={() => open({ kind: 'rankinfo' })}>
          <span className="emb">
            <LineIcon name="crown" size={22} />
          </span>
          <span className="rk">
            <small>{rankDef(view.rank).title}</small>
            <b>전투력 {fmt(teamPower(view))}</b>
          </span>
        </button>
        <div className="pills">
          {RESOURCE_KEYS.map((k) => (
            <span className="pill" key={k} aria-label={RES_LABEL[k]}>
              <ResIcon kind={k} size={16} />
              {fmt(view.res[k])}
            </span>
          ))}
        </div>
      </header>

      {tab === 'home' && <HomeView view={view} now={now} open={open} go={go} onHeroine={setSheet} />}
      {tab === 'yokai' && <YokaiView view={view} onOpen={setSheet} />}
      {tab === 'camp' && <CampaignView view={view} open={open} />}
      {tab === 'gacha' && <GachaView view={view} />}
      {tab === 'record' && <RecordView view={view} now={now} />}

      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} data-guide={`tab-${t.id}`} onClick={() => setTab(t.id)}>
            <NavIcon name={t.id} />
            {t.label}
            {badges[t.id] && tab !== t.id && <span className="badge" />}
          </button>
        ))}
      </nav>

      {sheet && !top && <YokaiSheet view={view} id={sheet} open={open} onClose={() => setSheet(null)} />}

      {top?.kind === 'stage' && <StageFlow key={top.id} id={top.id} open={open} onClose={closeTop} />}
      {top?.kind === 'train' && <TrainFlow tier={top.tier} open={open} onClose={closeTop} />}
      {top?.kind === 'story' && <StoryList view={view} onClose={closeTop} />}
      {top?.kind === 'afk' && <AfkModal view={view} now={now} onClose={closeTop} />}
      {top?.kind === 'rank' && <RankModal ranks={top.ranks} onClose={closeTop} />}
      {top?.kind === 'rankinfo' && <RankSheet view={view} onClose={closeTop} />}
      {top?.kind === 'wish' && <WishModal view={view} onClose={closeTop} />}
      {top?.kind === 'talk' && <TalkModal view={view} id={top.id} open={open} onClose={closeTop} />}
      {top?.kind === 'react' && <ReactModal {...top} open={open} onClose={closeTop} />}
      {top?.kind === 'bondup' && <BondUpModal id={top.id} level={top.level} open={open} onClose={closeTop} />}
      {top?.kind === 'scene' && <SceneViewer key={`${top.id}-${top.level}`} id={top.id} level={top.level} onClose={closeTop} />}

      {step && !top && <GuideBar step={step} index={state.guide} tab={tab} />}

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
