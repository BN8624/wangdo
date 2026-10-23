import { useEffect, useState } from 'react';
import { activeCombos, assign, feast, feastCost, feastFame, hasAptitude, nextRank, ownedYokai, power, promote, promoteCheck, slotsPerWorkplace, statsOf, useWish, workplaceOf, workplaceRate, } from '../core/engine';
import { fmt, fmtRate } from '../core/format';
import { nextHint, type HintTarget } from '../core/hints';
import { rankDef } from '../data/ranks';
import { WORKPLACES, WORKPLACE_BY_ID } from '../data/village';
import { ART } from '../data/art';
import { STAT_LABEL, YOKAI_BY_ID } from '../data/yokai';
import type { GameState, WorkplaceId } from '../core/types';
import { LineIcon, ResIcon } from './icons';
import { Art, Portrait } from './Portrait';
import { act } from './store';
import { buzz, pushToast } from './toast';
import type { ModalRequest } from './App';
import { guideStep } from '../core/guide';
import { bondContent } from '../data/bond-content';
import { EPISODES } from '../data/story';
import { nextEpisode, lockReason } from '../core/story';
interface Props {
    view: GameState;
    now: number;
    open: (m: ModalRequest) => void;
    go: (t: HintTarget) => void;
}
export function HomeView({ view, now, open, go }: Props) {
    const [picking, setPicking] = useState<WorkplaceId | null>(null);
    const [work, setWork] = useState(false);
    const guideTarget = guideStep(view)?.target;
    useEffect(() => { if (guideTarget?.startsWith('wp-'))
        setWork(true); }, [guideTarget]);
    const [banquet, setBanquet] = useState(false);
    const [talk, setTalk] = useState(0);
    const target = nextRank(view), pw = power(view), canPromote = promoteCheck(view).ok;
    const def = YOKAI_BY_ID[view.favorite] ?? YOKAI_BY_ID[Object.keys(view.yokai)[0]];
    const talks = bondContent(def.id).talks;
    const ep = nextEpisode(view, EPISODES), locked = ep ? lockReason(view, ep) : null;
    const hint = nextHint(view, now);
    const doWish = () => { const r = act(useWish); if (r.ok)
        open({ kind: 'wish' }); };
    const doPromote = () => { const r = act(promote); if (r.ok)
        open({ kind: 'promote', rank: r.rank, recruit: r.recruit }); };
    const doFeast = () => { const r = act(feast); if (r.ok) {
        buzz();
        pushToast({ text: `연회 성공 · 명성 +${fmt(r.fame)}`, res: 'fame' });
        setBanquet(false);
    } };
    return <div className="view palace">
  <Art className="palace-bg" src={ART.bg('palace')} alt="해랑국 궁궐" fallback={<div className="palace-bg art-placeholder"/>}/>
  <div className="palace-shade"/>
  <button className="hero" aria-label={`${def.name} 대사 바꾸기`} onClick={() => setTalk(n => n + 1)}><Art src={ART.full(def.id)} alt={def.name} fallback={<div className="portrait-fallback">{def.name}</div>}/></button>
  <div className="rank-plate panel"><div className="rank-top"><LineIcon name="crown"/><div><div>{rankDef(view.rank).title}</div><strong className="power">권세 {fmt(pw)}</strong></div>{canPromote && <button className="btn hong small" data-guide="promote" onClick={doPromote}>승급</button>}</div>
  {target && !canPromote && <><div className="soft">다음 관직 · {target.title}</div><Progress label="권세" have={pw} need={target.powerReq} color="var(--gold)"/><Progress label="명성" have={view.res.fame} need={target.fameCost} color="var(--gold)"/></>}
  </div>
  <div className="side-menu">
   <button className="tile panel" data-guide="story" onClick={() => open({ kind: 'story' })}><LineIcon name="scroll"/>이야기{ep && !locked && <span className="badge">!</span>}</button>
   <button className="tile panel" data-guide="ttuk" disabled={!view.wish.pending && view.wish.charges <= 0} onClick={doWish}><LineIcon name="scroll"/>정무<span className="badge">{view.wish.charges}</span></button>
   <button className="tile panel" data-guide="feast" onClick={() => setBanquet(true)}><LineIcon name="cup"/>연회</button>
   <button className="tile panel" onClick={() => setWork(true)}><LineIcon name="home"/>일터</button>
  </div>
  <div className="home-bottom"><div className="home-bubble panel"><div className="speaker">{def.kind} · {def.name}</div><div>{talks[talk % talks.length]?.line}</div></div>
  <div className="home-actions"><button className="btn panel" disabled={!view.wish.pending && view.wish.charges <= 0} onClick={doWish}>정무 처리<small>남은 상소 {view.wish.charges}건</small></button><button className="btn hong" onClick={() => open({ kind: 'story', episode: ep && !locked ? ep.id : undefined })}>이야기 이어 보기<small>{locked ?? ep?.title ?? '다음 화 준비 중'}</small></button></div>
  <button className="hint" onClick={() => go(hint.target)}>다음 할 일 · {hint.text}</button></div>
  {work && <><div className="dim" onClick={() => setWork(false)}/><div className="sheet" role="dialog" aria-label="일터"><button className="close" onClick={() => setWork(false)}>닫기</button><div className="sheet-title">일터</div>{WORKPLACES.map(wp => <div className="work-row panel" key={wp.id} data-guide={`wp-${wp.id}`}><b>{wp.name}</b><span><ResIcon kind={wp.produces}/>{fmtRate(workplaceRate(view, wp))}/분</span><div className="faces">{Array.from({ length: slotsPerWorkplace(view.rank) }, (_, i) => <button className="face" key={i} aria-label={`${wp.name} ${i + 1}번 칸 식객 고르기`} onClick={() => setPicking(wp.id)}>{view.work[wp.id][i] ? <Portrait def={YOKAI_BY_ID[view.work[wp.id][i]]}/> : '+'}</button>)}</div>{activeCombos(view.work[wp.id]).length > 0 && <small>짝꿍 보너스 적용 중</small>}</div>)}</div></>}
  {banquet && <><div className="dim" onClick={() => setBanquet(false)}/><div className="modal" role="dialog" aria-label="연회"><div className="title">연회 열기</div><div className="bubble">곡식 {fmt(feastCost(view.rank))} · 명성 +{fmt(feastFame(view))}<br />모든 식객의 호감도가 올라갑니다.</div><div className="actions"><button className="btn hong" disabled={view.res.grain < feastCost(view.rank)} onClick={doFeast}>연회 열기</button><button className="btn" onClick={() => setBanquet(false)}>닫기</button></div></div></>}
  {picking && <WorkSheet view={view} wp={picking} open={open} onClose={() => setPicking(null)}/>}
 </div>;
}
function Progress({ label, have, need, color }: {
    label: string;
    have: number;
    need: number;
    color: string;
}) {
    const ok = have >= need;
    return (<div className="bar-row">
      <span className="lbl">{label}</span>
      <div className="bar">
        <i style={{ width: `${Math.min(100, (have / need) * 100)}%`, background: color }}/>
      </div>
      <span className={`num ${ok ? 'ok' : ''}`}>
        {fmt(have)} / {fmt(need)}
        {ok ? ' ✓' : ''}
      </span>
    </div>);
}
/** 일터에 보낼 식객 고르기 */
function WorkSheet({ view, wp: wpId, open, onClose }: {
    view: GameState;
    wp: WorkplaceId;
    open: (m: ModalRequest) => void;
    onClose: () => void;
}) {
    const wp = WORKPLACE_BY_ID[wpId];
    const full = view.work[wpId].length >= slotsPerWorkplace(view.rank);
    const list = ownedYokai(view)
        .map(({ def }) => ({ def, value: statsOf(view, def.id)[wp.stat] * (hasAptitude(def, wp) ? 1.5 : 1), at: workplaceOf(view, def.id) }))
        .sort((a, b) => b.value - a.value);
    const send = (id: string, to: WorkplaceId | null) => {
        const r = act((s, now) => assign(s, now, id, to));
        if (!r.ok) {
            if (r.reason === 'full')
                pushToast({ text: '칸이 가득 찼어요. 먼저 한 명을 쉬게 하세요', warn: true });
            return;
        }
        buzz();
        for (const c of r.newCombos)
            open({ kind: 'combo', combo: c });
    };
    return (<>
      <div className="dim" onClick={onClose}/>
      <div className="sheet work-picker" role="dialog" aria-label={`${wp.name} 배치`}>
        <button className="close" onClick={onClose}>닫기</button>
        <div className="grab"/>
        <div className="sheet-title">
          {wp.name} <span>{wp.flavor}</span>
        </div>
        <div className="pick-list">
          {list.map(({ def, at }) => {
            const here = at === wpId;
            return (<div key={def.id} className={`pick ${here ? 'here' : ''}`}>
                <div className="pick-pic">
                  <Portrait def={def}/>
                </div>
                <div className="pick-info">
                  <b>{def.name}</b>
                  <span>
                    {STAT_LABEL[wp.stat]} {fmt(statsOf(view, def.id)[wp.stat])}
                    {hasAptitude(def, wp) && <em> 적성 ×1.5</em>}
                  </span>
                  <small>{at ? `${WORKPLACE_BY_ID[at].name}에서 일하는 중` : '쉬는 중'}</small>
                </div>
                {here ? (<button className="btn cheong small" onClick={() => send(def.id, null)}>
                    쉬게 하기
                  </button>) : (<button className="btn hwang small" disabled={full} onClick={() => send(def.id, wpId)}>
                    보내기
                  </button>)}
              </div>);
        })}
        </div>
      </div>
    </>);
}
