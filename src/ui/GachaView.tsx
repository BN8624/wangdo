// 모집 탭: 옥으로 한 번·열 번 모집. 결과는 카드가 차례로 뒤집히고, 새 SSR은 크게 보여 준다.
import { useEffect, useMemo, useState } from 'react';
import { pull, pullCost, type PullResult } from '../core/gacha';
import { fmt } from '../core/format';
import type { GameState } from '../core/types';
import { BALANCE as B } from '../data/balance';
import { ART } from '../data/art';
import { ELEMENT_COLOR, RARITY_LABEL, elementOf } from '../data/roster';
import { YOKAI, YOKAI_BY_ID } from '../data/yokai';
import { Art, Portrait } from './Portrait';
import { ResIcon } from './icons';
import { RecruitCard } from './modals';
import { act } from './store';
import { buzz, pushToast } from './toast';
import { play } from './sound';
import { track } from './analytics';

const FEATURED = YOKAI.filter((y) => y.grade === 3).map((y) => y.id);

export function GachaView({ view }: { view: GameState }) {
  const [feat, setFeat] = useState(0);
  const [results, setResults] = useState<PullResult[] | null>(null);
  useEffect(() => {
    const t = setInterval(() => setFeat((n) => (n + 1) % FEATURED.length), 4500);
    return () => clearInterval(t);
  }, []);
  const featured = FEATURED[feat];

  const doPull = (count: 1 | 10) => {
    const r = act((s) => pull(s, count));
    if (!r.ok) return pushToast({ text: '옥이 모자라요. 스테이지 첫 클리어·별·관직·방치 보상으로 모아요', warn: true });
    track(`gacha/${count}`);
    buzz(30);
    setResults(r.results);
  };

  const left = B.pity - view.gacha.pity;
  return (
    <div className="view gacha">
      <div className="gc-banner">
        <Art key={featured} className="gc-art" src={ART.card(featured)} alt={YOKAI_BY_ID[featured].name} fallback={<div className="art-placeholder" />} />
        <div className="gc-label">
          <small>상설 모집</small>
          <b>해랑국 식객 모집</b>
          <span>
            {YOKAI_BY_ID[featured].name} · {YOKAI_BY_ID[featured].kind}
          </span>
        </div>
        <div className="gc-dots">
          {FEATURED.map((id, i) => (
            <i key={id} className={i === feat ? 'on' : ''} />
          ))}
        </div>
      </div>

      <div className="gc-info">
        <span>
          SSR {Math.round(B.rates.ssr * 100)}% · SR {Math.round(B.rates.sr * 100)}% · R {Math.round((1 - B.rates.ssr - B.rates.sr) * 100)}%
        </span>
        <span>
          SSR 확정까지 <b>{left}</b>회
        </span>
        {!view.gacha.firstTen && <span className="gc-first">첫 열 번 모집은 SSR 하나 확정!</span>}
        <span className="soft">열 번 모집은 SR 이상 하나 확정 · 이미 있는 식객은 조각이 되어 별을 올려요</span>
      </div>

      <div className="gc-btns">
        <button className="btn" disabled={view.res.jade < pullCost(1)} onClick={() => doPull(1)}>
          한 번 모집
          <span>
            <ResIcon kind="jade" size={16} />
            {fmt(pullCost(1))}
          </span>
        </button>
        <button className="btn hong" data-guide="pull10" disabled={view.res.jade < pullCost(10)} onClick={() => doPull(10)}>
          열 번 모집
          <span>
            <ResIcon kind="jade" size={16} />
            {fmt(pullCost(10))}
          </span>
        </button>
      </div>

      <div className="section-title">모집할 수 있는 식객</div>
      {([3, 2, 1] as const).map((g) => (
        <div key={g} className="gc-pool">
          <em className={`rar r${g}`}>{RARITY_LABEL[g]}</em>
          <div>
            {YOKAI.filter((y) => y.grade === g).map((y) => (
              <span key={y.id} className={`gc-face ${view.yokai[y.id] ? 'own' : ''}`} title={y.name}>
                <Portrait def={y} />
                <small>{y.name}</small>
              </span>
            ))}
          </div>
        </div>
      ))}
      <p className="soft camp-note">이야기 식객은 그 장을 끝까지 깨면 확정으로 합류해요. 모집에서 먼저 만나면 이야기에서는 조각을 받아요.</p>

      {results && <PullReveal key={view.gacha.pulls} results={results} jade={view.res.jade} onAgain={() => doPull(10)} onClose={() => setResults(null)} />}
    </div>
  );
}

/** 결과: 가장 높은 등급 빛 → 새 SSR 소개 → 카드 목록 */
function PullReveal({ results, jade, onAgain, onClose }: { results: PullResult[]; jade: number; onAgain: () => void; onClose: () => void }) {
  const best = Math.max(...results.map((r) => r.rarity));
  const splashes = useMemo(() => results.filter((r) => r.isNew && r.rarity === 3).map((r) => r.id), [results]);
  const [stage, setStage] = useState<'flash' | number | 'grid'>('flash');
  useEffect(() => {
    play(best === 3 ? 'promote' : 'chime');
  }, [best]);

  const afterFlash = () => setStage(splashes.length ? 0 : 'grid');
  if (stage === 'flash') {
    return (
      <div className={`gc-flash r${best}`} role="dialog" aria-label="모집 결과" onClick={afterFlash}>
        <div className="gc-flash-core" />
        <b>{best === 3 ? '전설의 기운이…!' : best === 2 ? '희귀한 기운' : '모집 완료'}</b>
        <small>화면을 눌러 확인</small>
      </div>
    );
  }
  if (typeof stage === 'number') {
    return <RecruitCard id={splashes[stage]} note="NEW" onClose={() => setStage(stage + 1 < splashes.length ? stage + 1 : 'grid')} />;
  }
  return (
    <div className="gc-result" role="dialog" aria-label="모집 결과">
      <div className={`gc-grid n${results.length}`}>
        {results.map((r, i) => {
          const def = YOKAI_BY_ID[r.id];
          return (
            <div key={i} className={`gc-card r${r.rarity}`} style={{ animationDelay: `${i * 90}ms` }}>
              <Art src={ART.card(r.id)} alt={def.name} fallback={<div className="portrait-fallback">{def.name}</div>} />
              <em className={`rar r${r.rarity}`}>{RARITY_LABEL[r.rarity]}</em>
              <i className="gc-el" style={{ background: ELEMENT_COLOR[elementOf(r.id)] }} />
              {r.isNew ? <span className="gc-new">NEW</span> : <span className="gc-shard">조각 +{r.shards}</span>}
              <b>{def.name}</b>
            </div>
          );
        })}
      </div>
      <div className="gc-result-btns">
        <button className="btn" onClick={onClose}>
          확인
        </button>
        {results.length === 10 && (
          <button className="btn hong" disabled={jade < pullCost(10)} onClick={onAgain}>
            한 번 더 열 번 <ResIcon kind="jade" size={14} />
            {fmt(pullCost(10))}
          </button>
        )}
      </div>
    </div>
  );
}
