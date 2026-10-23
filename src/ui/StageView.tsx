import { challengeStage, handsNeeded, stageInfo } from '../core/engine';
import { fmt } from '../core/format';
import { STAGES_PER_CHAPTER } from '../data/stages';
import { YOKAI_BY_ID } from '../data/yokai';
import type { GameState } from '../core/types';
import { ChapterArt, FoeGroup, ResIcon } from './icons';
import { Portrait } from './Portrait';
import { act } from './store';
import { buzz, pushToast } from './toast';
import type { ModalRequest } from './App';

const FOE_TINT = ['#3d5a9e', '#4b4f8a', '#b5527a', '#2a9d8f', '#d8452b'];

export function StageView({ view, open }: { view: GameState; open: (m: ModalRequest) => void }) {
  const info = stageInfo(view.stage.index);

  if (!info) {
    return (
      <div className="view">
        <div className="page-title">소동 해결</div>
        <div className="card" style={{ textAlign: 'center', lineHeight: 1.7 }}>
          <b style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>모든 소동을 잠재웠어요!</b>
          <br />
          팔도가 조용해졌어요. 다음 이야기는 준비 중이에요.
        </div>
      </div>
    );
  }

  const need = handsNeeded(view) ?? 0;
  const progress = info.hp > 0 ? view.stage.damage / info.hp : 0;
  const boss = info.chapter.boss;
  const bossDef = YOKAI_BY_ID[boss.yokai];
  const chapterStart = info.chapterIndex * STAGES_PER_CHAPTER;

  const go = () => {
    const r = act(challengeStage);
    if (!r.ok) {
      if (r.reason === 'no-hands') pushToast({ text: '일손이 없어요. 고을에서 거둬 오세요', warn: true });
      return;
    }
    buzz(30);
    open({ kind: 'stage', result: r });
  };

  return (
    <div className="view">
      <div className="chapter">
        <ChapterArt index={info.chapterIndex} id={info.chapter.id} />
        <div className="lbl">
          <b>{info.chapter.title}</b>
          <span>{info.chapter.intro}</span>
        </div>
      </div>

      <div className="track">
        {Array.from({ length: STAGES_PER_CHAPTER }, (_, i) => {
          const idx = chapterStart + i;
          const done = idx < view.stage.index;
          const isBoss = i === STAGES_PER_CHAPTER - 1;
          const cls = done ? 'done' : idx === view.stage.index ? (isBoss ? 'now boss' : 'now') : 'todo';
          return (
            <span key={i} style={{ display: 'contents' }}>
              <div className={`node ${cls} ${isBoss ? 'boss' : ''}`}>{done ? '✓' : isBoss ? '大' : i + 1}</div>
              {i < STAGES_PER_CHAPTER - 1 && <div className={`link ${done ? 'done' : ''}`} />}
            </span>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="foe">
          <div className={`foe-pic ${info.isBoss ? 'boss' : ''}`}>
            {info.isBoss ? <Portrait def={bossDef} /> : <FoeGroup chapterId={info.chapter.id} tint={FOE_TINT[info.chapterIndex % FOE_TINT.length]} />}
          </div>
          <div>
            <div className="foe-no">
              {info.chapter.title.split(' · ')[0]} · {info.isBoss ? '대장' : `${info.number}번째 소동`}
            </div>
            <div className="foe-name">{info.foe}</div>
          </div>
        </div>
        <div className="bar-row" style={{ marginTop: 12 }}>
          <span className="lbl">진정</span>
          <div className="bar" style={{ height: 14 }}>
            <i style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg,#7cc4b8,var(--cheong))' }} />
          </div>
          <span className="num" style={{ minWidth: 48 }}>
            {Math.floor(progress * 100)}%
          </span>
        </div>
        <div className="need">
          <span>
            필요 일손 <b>{fmt(need)}명</b>
          </span>
          <span>
            보유 <b style={{ color: view.res.hands >= need ? 'var(--cheong)' : 'var(--hong)' }}>{fmt(view.res.hands)}명</b>
          </span>
        </div>
        <div className="reward">
          보상
          <span>
            <ResIcon kind="fame" size={16} />+{fmt(info.fame)}
          </span>
          <span>
            <ResIcon kind="coin" size={16} />+{fmt(info.coin)}
          </span>
          {info.isBoss && !view.yokai[boss.yokai] && <span>+ 새 식객</span>}
        </div>
        <button className="btn hong wide go" disabled={view.res.hands < 1} onClick={go}>
          {view.res.hands >= need ? '출동!' : view.res.hands >= 1 ? '있는 일손으로 출동' : '일손이 없어요'}
        </button>
      </div>

      {!info.isBoss && (
        <div className="card boss-card">
          <div className="boss-shadow">
            <Portrait def={bossDef} />
          </div>
          <div className="txt">
            <b>이 장의 대장 · ???</b>
            <br />
            소동 {STAGES_PER_CHAPTER - info.number}개를 더 해결하면 만날 수 있어요.
            <br />
            달래 주면 식객으로 합류해요
          </div>
        </div>
      )}
      <div style={{ height: 16 }} />
    </div>
  );
}
