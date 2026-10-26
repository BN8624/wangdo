// 출정 탭: 이야기 캠페인(장 → 스테이지 여섯)과 수련장. 스테이지를 누르면 StageFlow가 열린다.
import { useEffect, useMemo, useState } from 'react';
import { CHAPTER_COUNT, chapterOpen, chapterStages, chapterStars, nextStage, stageCleared, stageOpen, stagePower, stageStars } from '../core/campaign';
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
    <div className="view camp">
      <div className="camp-tabs tabs">
        <button className={mode === 'story' ? 'on' : ''} onClick={() => setMode('story')}>
          이야기
        </button>
        <button className={mode === 'train' ? 'on' : ''} data-guide="train" onClick={() => setMode('train')}>
          수련장
        </button>
      </div>
      {mode === 'story' ? <Chapter view={view} chapter={chapter} setChapter={setChapter} power={power} open={open} /> : <Training view={view} power={power} open={open} />}
    </div>
  );
}

function Chapter({ view, chapter, setChapter, power, open }: { view: GameState; chapter: number; setChapter: (n: number) => void; power: number; open: (m: ModalRequest) => void }) {
  const stages = chapterStages(chapter);
  const ep = EPISODES[chapter];
  const stars = chapterStars(view, chapter);
  const unlocked = chapterOpen(view, chapter);
  const recruits = useMemo(() => {
    const r = ep.reward?.recruit;
    return (Array.isArray(r) ? r : r ? [r] : []).filter((id) => YOKAI_BY_ID[id]);
  }, [ep]);
  const lastOpen = useMemo(() => {
    let n = 0;
    for (let c = 0; c < CHAPTER_COUNT; c++) if (chapterOpen(view, c)) n = c;
    return n;
  }, [view]);

  return (
    <>
      <div className="ch-head">
        <Art className="ch-art" src={ART.battle(stages[0].bg)} fallback={<div className="art-placeholder" />} />
        <button className="ch-arrow l" aria-label="앞 장" disabled={chapter <= 0} onClick={() => setChapter(chapter - 1)}>
          ‹
        </button>
        <button className="ch-arrow r" aria-label="다음 장" disabled={chapter >= lastOpen} onClick={() => setChapter(chapter + 1)}>
          ›
        </button>
        <div className="ch-lbl">
          <small>
            {ep.season}부 · {chapter + 1}장
          </small>
          <b>{ep.title}</b>
          <span>
            ★ {stars}/18
            {recruits.length > 0 && ` · 끝까지 깨면 ${recruits.map((id) => `${YOKAI_BY_ID[id].name} ${view.yokai[id] ? '조각' : '합류'}`).join(' · ')}`}
          </span>
        </div>
      </div>
      {!unlocked && <p className="soft ch-locked">앞 장을 끝까지 깨면 열려요.</p>}
      <ol className="stg-list">
        {stages.map((st) => {
          const open_ = stageOpen(view, st);
          const cleared = stageCleared(view, st.id);
          const need = stagePower(st);
          const s = stageStars(view, st.id);
          const now = open_ && !cleared;
          return (
            <li key={st.id} className={`stg ${cleared ? 'done' : ''} ${now ? 'now' : ''} ${open_ ? '' : 'locked'} ${st.boss ? 'boss' : ''}`}>
              <button data-guide={`stage-${st.id}`} disabled={!open_} onClick={() => open({ kind: 'stage', id: st.id })}>
                <span className="stg-no">{st.label}</span>
                <span className="stg-txt">
                  <b>
                    {stageName(st)}
                    {st.battle && <i className="stg-story">이야기</i>}
                  </b>
                  <small>
                    Lv {st.level} · 권장 <em className={power >= need ? 'ok' : power >= need * 0.85 ? 'close' : 'low'}>{fmt(need)}</em>
                  </small>
                </span>
                <span className="stg-side">
                  {cleared ? (
                    <span className="stg-stars">
                      {[1, 2, 3].map((n) => (
                        <i key={n} className={n <= s ? 'on' : ''}>
                          ★
                        </i>
                      ))}
                    </span>
                  ) : now ? (
                    <em className="stg-go">출정 ›</em>
                  ) : (
                    <LineIcon name="flag" size={18} />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Training({ view, power, open }: { view: GameState; power: number; open: (m: ModalRequest) => void }) {
  return (
    <>
      <p className="soft camp-note">막히면 여기서 수련치와 엽전을 모아요. 몇 번이고 할 수 있고, 같은 편성이면 결과도 같아요. 이야기를 더 깨면 높은 단계가 열려요.</p>
      <ol className="stg-list">
        {TRAIN_LEVELS.map((lv, tier) => {
          const open_ = trainOpen(view, tier);
          const need = trainPower(tier);
          const r = trainReward(tier);
          return (
            <li key={tier} className={`stg train ${open_ ? '' : 'locked'}`}>
              <button disabled={!open_} onClick={() => open({ kind: 'train', tier })}>
                <span className="stg-no">{tier + 1}</span>
                <span className="stg-txt">
                  <b>수련 {tier + 1}단계</b>
                  <small>
                    {open_ ? (
                      <>
                        Lv {lv} · 권장 <em className={power >= need ? 'ok' : power >= need * 0.85 ? 'close' : 'low'}>{fmt(need)}</em>
                      </>
                    ) : (
                      `이야기에서 Lv ${lv - 4} 스테이지를 깨면 열려요`
                    )}
                  </small>
                </span>
                <span className="stg-side stg-rw">
                  <span>
                    <ResIcon kind="exp" size={14} />
                    {fmt(r.exp)}
                  </span>
                  <span>
                    <ResIcon kind="coin" size={14} />
                    {fmt(r.coin)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}
