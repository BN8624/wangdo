// 모집 탭: 옥으로 한 번·열 번 모집. 결과는 카드가 차례로 뒤집히고, 새 SSR은 크게 보여 준다.
import { useEffect, useMemo, useState } from 'react';
import { tradeMemory } from '../core/engine';
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
  const [info, setInfo] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setFeat((n) => (n + 1) % FEATURED.length), 5000);
    return () => clearInterval(t);
  }, []);
  const featured = FEATURED[feat];
  const fdef = YOKAI_BY_ID[featured];

  const doPull = (count: 1 | 10) => {
    const r = act((s) => pull(s, count));
    if (!r.ok) return pushToast({ text: '옥이 모자라요. 스테이지 첫 클리어·별·관직·방치 보상으로 모아요', warn: true });
    track(`gacha/${count}`);
    buzz(30);
    setResults(r.results);
  };

  const doTrade = (times: number) => {
    const r = act((s) => tradeMemory(s, times));
    if (!r.ok) return pushToast({ text: '옥이 모자라요', warn: true });
    track(`trade/${times}`);
    pushToast({ text: `기억 조각 +${r.memory} · 식객 창에서 원하는 식객의 별을 올려요` });
  };

  const left = B.pity - view.gacha.pity;
  return (
    <div className="view gc">
      <Art key={featured} className="gc-art" src={ART.card(featured)} alt={fdef.name} fallback={<div className="gc-art" />} />
      <div className="gc-top">
        <div className="gc-dots">
          {FEATURED.map((id, i) => (
            <button key={id} className={i === feat ? 'on' : ''} aria-label={YOKAI_BY_ID[id].name} onClick={() => setFeat(i)} />
          ))}
        </div>
        <button className="gc-info-btn" onClick={() => setInfo(true)}>
          확률·목록
        </button>
      </div>
      <div className="gc-panel">
        <div className="gc-name">
          <small>상설 모집</small>
          <b>{fdef.name}</b>
          <span>
            <em className="rar r3">SSR</em> {fdef.kind}
          </span>
        </div>
        <p className="gc-pity">{!view.gacha.firstTen ? '첫 열 번 모집은 새 SSR 하나 확정!' : `SSR 확정까지 ${left}회`}</p>
        <div className="gc-btns">
          <button className="btn" disabled={view.res.jade < pullCost(1)} onClick={() => doPull(1)}>
            한 번
            <span>
              <ResIcon kind="jade" size={14} />
              {fmt(pullCost(1))}
            </span>
          </button>
          <button className="btn hong" data-guide="pull10" disabled={view.res.jade < pullCost(10)} onClick={() => doPull(10)}>
            열 번
            <span>
              <ResIcon kind="jade" size={14} />
              {fmt(pullCost(10))}
            </span>
          </button>
        </div>
        <div className="gc-trade">
          <p>
            <b>기억 조각으로 바꾸기</b>
            <small>운에 맡기지 않고 원하는 식객의 별을 올려요 · 가진 조각 {fmt(view.inventory.memory ?? 0)}</small>
          </p>
          <button className="btn small" disabled={view.res.jade < B.memoryTrade.jade} onClick={() => doTrade(1)}>
            <ResIcon kind="jade" size={13} />
            {B.memoryTrade.jade} → {B.memoryTrade.memory}
          </button>
          <button className="btn small" disabled={view.res.jade < B.memoryTrade.jade * 10} onClick={() => doTrade(10)}>
            ×10
          </button>
        </div>
      </div>

      {info && (
        <>
          <div className="dim" onClick={() => setInfo(false)} />
          <div className="sheet" role="dialog" aria-label="모집 확률과 목록">
            <div className="sheet-head">
              <div className="sheet-title">모집 안내</div>
              <button className="close" onClick={() => setInfo(false)}>
                닫기
              </button>
            </div>
            <p className="gc-rates">
              SSR {Math.round(B.rates.ssr * 100)}% · SR {Math.round(B.rates.sr * 100)}% · R {Math.round((1 - B.rates.ssr - B.rates.sr) * 100)}%
              <br />
              {B.pity}번째 안에 SSR 확정 · 열 번 모집은 SR 이상 하나 확정 · 이미 있는 식객은 조각이 되어 별을 올려요.
              <br />
              현금 결제는 없어요. 열여섯 식객 모두 이야기와 만남으로 확정 합류하고, 옥은 기억 조각(아무 식객에게나 쓰는 별 재료)으로도 바꿀 수 있어요. 모집은 더 빨리, 더 여러 식객을 만나는 덤이에요.
            </p>
            {([3, 2, 1] as const).map((g) => (
              <div key={g} className="gc-pool">
                <em className={`rar r${g}`}>{RARITY_LABEL[g]}</em>
                <div>
                  {YOKAI.filter((y) => y.grade === g).map((y) => (
                    <span key={y.id} className={`gc-face ${view.yokai[y.id] ? 'own' : ''}`}>
                      <Portrait def={y} />
                      <small>{y.name}</small>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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
