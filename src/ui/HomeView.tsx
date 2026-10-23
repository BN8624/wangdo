import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { LiveArt } from './LiveArt';
import { rigOf } from '../data/rigs';
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
    onHeroine: (id: string) => void;
}
export function HomeView({ view, now, open, go, onHeroine }: Props) {
    const [picking, setPicking] = useState<WorkplaceId | null>(null);
    const [work, setWork] = useState(false);
    const [banquet, setBanquet] = useState(false);
    const [taps, setTaps] = useState(0);
    const [line, setLine] = useState<string | null>(null);
    useEffect(() => { if (!line) return; const t = setTimeout(() => setLine(null), 5000); return () => clearTimeout(t); }, [line, taps]);
    const step = guideStep(view);
    const wpTarget = step?.target?.startsWith('wp-') ? step.target : null;
    const def = YOKAI_BY_ID[view.favorite] ?? YOKAI_BY_ID[Object.keys(view.yokai)[0]];
    const ep = nextEpisode(view, EPISODES), locked = ep ? lockReason(view, ep) : null;
    const hint = nextHint(view, now);
    const talks = bondContent(def.id).talks;
    const poke = () => { setTaps(n => n + 1); setLine(talks.length ? talks[taps % talks.length].line : null); };
    const resting = ownedYokai(view).some(({ def: d }) => !workplaceOf(view, d.id));
    const doWish = () => { const r = act(useWish); if (r.ok)
        open({ kind: 'wish' }); };
    const doFeast = () => { const r = act(feast); if (r.ok) {
        buzz();
        pushToast({ text: `연회 성공 · 명성 +${fmt(r.fame)}`, res: 'fame' });
        setBanquet(false);
    } };
    return <div className="view home">
  <Art className="home-bg" src={ART.bg('palace')} alt="" fallback={<div className="home-bg art-placeholder"/>}/>
  <div className="home-menu">
   <button className="menu-icon" data-guide="story" onClick={() => open({ kind: 'story', episode: ep && !locked ? ep.id : undefined })}><LineIcon name="scroll" size={24}/><span>이야기</span>{ep && !locked && <i className="badge">!</i>}</button>
   <button className="menu-icon" data-guide="ttuk" disabled={!view.wish.pending && view.wish.charges <= 0} onClick={doWish}><LineIcon name="flag" size={24}/><span>정무</span>{(view.wish.pending || view.wish.charges > 0) && <i className="badge">{view.wish.pending ? '!' : view.wish.charges}</i>}</button>
   <button className="menu-icon" data-guide={wpTarget ?? 'work'} onClick={() => setWork(true)}><LineIcon name="home" size={24}/><span>일터</span>{resting && <i className="badge dot"/>}</button>
   <button className="menu-icon" data-guide="feast" onClick={() => setBanquet(true)}><LineIcon name="cup" size={24}/><span>연회</span></button>
  </div>
  <div className="heroine">
   <button className="heroine-art" aria-label={`${def.name}에게 말 걸기`} onClick={poke}>
    <img className="heroine-shadow" src={ART.full(def.id)} alt="" aria-hidden="true"/>
    <LiveArt className="heroine-live" src={ART.full(def.id)} rig={rigOf(def.id)} alt={def.name}/>
   </button>
  </div>
  {line ? <div className="say" role="status"><b>{def.name}</b><span>{line}</span><button onClick={() => onHeroine(def.id)}>대화하기 ›</button></div> : !step && <button className="quest" onClick={() => go(hint.target)}><b>할 일</b><span>{hint.text}</span><em>가기 ›</em></button>}
  {work && createPortal(<WorkSheet view={view} open={open} picking={picking} setPicking={setPicking} onClose={() => { setWork(false); setPicking(null); }}/>, document.body)}
  {banquet && createPortal(<><div className="dim" onClick={() => setBanquet(false)}/><div className="modal" role="dialog" aria-label="연회"><div className="title">연회 열기</div><div className="bubble">곡식 {fmt(feastCost(view.rank))} · 명성 +{fmt(feastFame(view))}<br />모든 식객의 호감도가 올라갑니다.</div><div className="actions"><button className="btn hong" disabled={view.res.grain < feastCost(view.rank)} onClick={doFeast}>연회 열기</button><button className="btn" onClick={() => setBanquet(false)}>닫기</button></div></div></>, document.body)}
 </div>;
}

/** 관직 창: 다음 관직까지 남은 권세·명성과 승급 */
export function RankSheet({ view, open, onClose }: { view: GameState; open: (m: ModalRequest) => void; onClose: () => void }) {
    const target = nextRank(view), pw = power(view), canPromote = promoteCheck(view).ok;
    const doPromote = () => { const r = act(promote); if (r.ok) {
        onClose();
        open({ kind: 'promote', rank: r.rank, recruit: r.recruit });
    } };
    return createPortal(<><div className="dim" onClick={onClose}/><div className="modal rank-modal" role="dialog" aria-label="관직">
    <div className="title">{rankDef(view.rank).title}</div>
    <div className="sub">권세 {fmt(pw)}</div>
    {target ? <>
      <div className="soft">다음 관직 · <b>{target.title}</b>{target.recruit && ` · ${YOKAI_BY_ID[target.recruit].name} 합류`}</div>
      <Progress label="권세" have={pw} need={target.powerReq} color="var(--gold)"/>
      <Progress label="명성" have={view.res.fame} need={target.fameCost} color="var(--seal)"/>
      <div className="soft small-note">권세는 식객 레벨·호감도로, 명성은 주막·연회·토벌로 올라요.</div>
    </> : <div className="soft">가장 높은 관직이에요.</div>}
    <div className="actions"><button className="btn hong" data-guide="promote" disabled={!canPromote} onClick={doPromote}>승급하기</button><button className="btn" onClick={onClose}>닫기</button></div>
  </div></>, document.body);
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
/** 일터 창: 일터 목록에서 칸을 누르면 같은 창 안에서 식객 고르기로 넘어간다. */
function WorkSheet({ view, open, picking, setPicking, onClose }: {
    view: GameState;
    open: (m: ModalRequest) => void;
    picking: WorkplaceId | null;
    setPicking: (w: WorkplaceId | null) => void;
    onClose: () => void;
}) {
    const slots = slotsPerWorkplace(view.rank);
    const send = (id: string, to: WorkplaceId | null) => {
        const r = act((s, now) => assign(s, now, id, to));
        if (!r.ok) {
            if (r.reason === 'full')
                pushToast({ text: '칸이 가득 찼어요. 먼저 한 명을 쉬게 하세요', warn: true });
            return;
        }
        buzz();
        if (to)
            setPicking(null);
        for (const c of r.newCombos)
            open({ kind: 'combo', combo: c });
    };
    return (<>
      <div className="dim" onClick={onClose}/>
      <div className="sheet" role="dialog" aria-label="일터">
        <div className="sheet-head">
          {picking ? <button className="back" onClick={() => setPicking(null)}>‹ 일터</button> : <div className="sheet-title">일터</div>}
          <button className="close" onClick={onClose}>닫기</button>
        </div>
        {picking ? <Picker view={view} wpId={picking} send={send}/> : WORKPLACES.map((wp) => (
          <button className="work-row panel" key={wp.id} data-guide={`wp-${wp.id}`} onClick={() => setPicking(wp.id)}>
            <div className="work-info">
              <b>{wp.name}</b>
              <span>{STAT_LABEL[wp.stat]} → <ResIcon kind={wp.produces} size={16}/> {wp.produces === 'fame' ? `${fmtRate(workplaceRate(view, wp) * 60)}/시간` : `${fmtRate(workplaceRate(view, wp))}/분`}</span>
              {activeCombos(view.work[wp.id]).length > 0 && <small>짝꿍 보너스 +{activeCombos(view.work[wp.id]).length * 20}%</small>}
            </div>
            <div className="faces">
              {Array.from({ length: slots }, (_, i) => (
                <span className={`face ${view.work[wp.id][i] ? '' : 'empty'}`} key={i}>
                  {view.work[wp.id][i] ? <Portrait def={YOKAI_BY_ID[view.work[wp.id][i]]}/> : '+'}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </>);
}

function Picker({ view, wpId, send }: { view: GameState; wpId: WorkplaceId; send: (id: string, to: WorkplaceId | null) => void }) {
    const wp = WORKPLACE_BY_ID[wpId];
    const full = view.work[wpId].length >= slotsPerWorkplace(view.rank);
    const list = ownedYokai(view)
        .map(({ def }) => ({ def, value: statsOf(view, def.id)[wp.stat] * (hasAptitude(def, wp) ? 1.5 : 1), at: workplaceOf(view, def.id) }))
        .sort((a, b) => b.value - a.value);
    return (<>
      <div className="sheet-title">{wp.name}<span>{wp.flavor}</span></div>
      <div className="pick-list">
        {list.map(({ def, at }) => {
            const here = at === wpId;
            return (<div key={def.id} className={`pick ${here ? 'here' : ''}`}>
                <div className="pick-pic"><Portrait def={def}/></div>
                <div className="pick-info">
                  <b>{def.name}</b>
                  <span>{STAT_LABEL[wp.stat]} {fmt(statsOf(view, def.id)[wp.stat])}{hasAptitude(def, wp) && <em> 적성 ×1.5</em>}</span>
                  <small>{at ? `${WORKPLACE_BY_ID[at].name}에서 일하는 중` : '쉬는 중'}</small>
                </div>
                {here
                  ? <button className="btn small" onClick={() => send(def.id, null)}>쉬게 하기</button>
                  : <button className="btn hong small" disabled={full} onClick={() => send(def.id, wpId)}>보내기</button>}
              </div>);
        })}
      </div>
    </>);
}
