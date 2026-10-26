// 출정 탭: 장 지도(스테이지 여섯이 굽은 길 위에 놓인다)와 수련장. 스테이지를 누르면 StageFlow가 열린다.
import { useEffect, useMemo, useState } from 'react';
import { CHAPTER_COUNT, chapterOpen, chapterRecruits, chapterStages, chapterStars, nextStage, stageCleared, stageOpen, stagePower, stageStars } from '../core/campaign';
import { fmt } from '../core/format';
import { TRAIN_LEVELS, trainOpen, trainPower, trainReward } from '../core/idle';
import type { GameState } from '../core/types';
import { teamPower } from '../core/units';
import { ART } from '../data/art';
import { EPISODES } from '../data/story';
import { YOKAI_BY_ID } from '../data/yokai';
import { Art } from './Portrait';
import { LineIcon, ResIcon } from './icons';
import { stageName } from './StageFlow';
import type { ModalRequest } from './App';

/** 지도 위 스테이지 자리(가로 %, 세로 %): 아래에서 위로 굽이친다 */
const NODE_POS = [
  [24, 88],
  [64, 77],
  [28, 65],
  [66, 53],
  [26, 41],
  [60, 28],
];

export function CampaignView({ view, open }: { view: GameState; open: (m: ModalRequest) => void }) {
  const [mode, setMode] = useState<'story' | 'train'>('story');
  const frontier = nextStage(view);
  const [chapter, setChapter] = useState(frontier?.chapter ?? CHAPTER_COUNT - 1);
  // 새 장이 열리면 그 장으로 따라간다
  useEffect(() => {
    if (frontier) setChapter(frontier.chapter);
  }, [frontier?.chapter]); // eslint-disable-line react-hooks/exhaustive-deps
  const power = teamPower(view);

  return (
    <div className={`view cp ${mode}`}>
      <div className="cp-seg" role="tablist">
        <button className={mode === 'story' ? 'on' : ''} onClick={() => setMode('story')}>
          이야기
        </button>
        <button className={mode === 'train' ? 'on' : ''} data-guide="train" onClick={() => setMode('train')}>
          수련장
        </button>
      </div>
      {mode === 'story' ? <ChapterMap view={view} chapter={chapter} setChapter={setChapter} power={power} open={open} /> : <Training view={view} power={power} open={open} />}
    </div>
  );
}

function ChapterMap({ view, chapter, setChapter, power, open }: { view: GameState; chapter: number; setChapter: (n: number) => void; power: number; open: (m: ModalRequest) => void }) {
  const stages = chapterStages(chapter);
  const ep = EPISODES[chapter];
  const stars = chapterStars(view, chapter);
  const recruits = useMemo(() => chapterRecruits(chapter), [chapter]);
  const lastOpen = useMemo(() => {
    let n = 0;
    for (let c = 0; c < CHAPTER_COUNT; c++) if (chapterOpen(view, c)) n = c;
    return n;
  }, [view]);
  const path = NODE_POS.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <div className="cp-map">
      <Art key={stages[0].bg} className="cp-bg" src={ART.battle(stages[0].bg)} fallback={<div className="cp-bg" />} />
      <div className="cp-head">
        <button className="cp-arrow" aria-label="앞 장" disabled={chapter <= 0} onClick={() => setChapter(chapter - 1)}>
          ‹
        </button>
        <div className="cp-title">
          <small>
            {ep.season}부 · {chapter + 1}장 · ★ {stars}/18
          </small>
          <b>{ep.title}</b>
          {recruits.length > 0 && <span>{recruits.map((id) => `${YOKAI_BY_ID[id].name} ${view.yokai[id] ? '조각' : '합류'}`).join(' · ')}</span>}
        </div>
        <button className="cp-arrow" aria-label="다음 장" disabled={chapter >= lastOpen} onClick={() => setChapter(chapter + 1)}>
          ›
        </button>
      </div>
      <svg className="cp-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={path} />
      </svg>
      {stages.map((st, i) => {
        const [x, y] = NODE_POS[i];
        const isOpen = stageOpen(view, st);
        const cleared = stageCleared(view, st.id);
        const now = isOpen && !cleared;
        const need = stagePower(st);
        const s = stageStars(view, st.id);
        return (
          <button
            key={st.id}
            className={['cp-node', cleared && 'done', now && 'now', !isOpen && 'locked', st.boss && 'boss', st.meet && 'meet'].filter(Boolean).join(' ')}
            style={{ left: `${x}%`, top: `${y}%` }}
            data-guide={`stage-${st.id}`}
            disabled={!isOpen}
            onClick={() => open({ kind: 'stage', id: st.id })}
          >
            <span className="cp-dot">{st.boss ? <LineIcon name="crown" size={22} /> : st.k}</span>
            <span className="cp-label">
              <b>
                {st.label} {stageName(st)}
              </b>
              {cleared ? (
                <i className="cp-stars">
                  {'★'.repeat(s)}
                  <em>{'★'.repeat(3 - s)}</em>
                </i>
              ) : isOpen ? (
                <small className={power >= need ? 'ok' : power >= need * 0.85 ? 'close' : 'low'}>권장 {fmt(need)}</small>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Training({ view, power, open }: { view: GameState; power: number; open: (m: ModalRequest) => void }) {
  return (
    <div className="cp-train">
      <p className="cp-note">막히면 여기서 수련치와 엽전을 모아요. 몇 번이고 할 수 있어요.</p>
      {TRAIN_LEVELS.map((lv, tier) => {
        const isOpen = trainOpen(view, tier);
        const need = trainPower(tier);
        const r = trainReward(tier);
        return (
          <button key={tier} className={`cp-row ${isOpen ? '' : 'locked'}`} disabled={!isOpen} onClick={() => open({ kind: 'train', tier })}>
            <b>{tier + 1}단계</b>
            <span>
              {isOpen ? (
                <>
                  Lv {lv} · 권장 <em className={power >= need ? 'ok' : power >= need * 0.85 ? 'close' : 'low'}>{fmt(need)}</em>
                </>
              ) : (
                `Lv ${lv - 4} 스테이지를 깨면 열려요`
              )}
            </span>
            <span className="cp-rw">
              <ResIcon kind="exp" size={14} />
              {fmt(r.exp)}
              <ResIcon kind="coin" size={14} />
              {fmt(r.coin)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
