import { useState, type ReactNode } from 'react';
import { completeEpisode, lockReason, visibleLines } from '../core/story';
import type { Episode, GameState, StoryLine } from '../core/types';
import { EPISODES, EPISODE_BY_ID } from '../data/story';
import { ART } from '../data/art';
import { YOKAI_BY_ID } from '../data/yokai';
import { Art, Portrait } from './Portrait';
import { act } from './store';
import type { ModalRequest } from './App';
/** 장면에 보일 인물: 폰 화면에서 크게 보이도록 가장 최근에 말했거나 등장한 식객 한 명. 주인공은 1인칭이라 화면에 나오지 않는다. */
function sceneCast(cast: string[], spoken: StoryLine[]): string[] {
    for (let i = spoken.length - 1; i >= 0; i--) {
        const who = spoken[i].show ?? spoken[i].who;
        if (cast.includes(who)) return [who];
    }
    return [];
}
export function NovelFrame({ title, bg, cast, line, onNext, children, onClose }: {
    title: string;
    bg: string;
    cast: string[];
    line?: StoryLine;
    onNext: () => void;
    children?: ReactNode;
    onClose?: () => void;
}) {
    const name = line?.as ?? (line?.who === 'me' ? '나' : line?.who.startsWith('npc:') ? line.who.slice(4) : YOKAI_BY_ID[line?.who ?? '']?.name);
    return <div className="vn" role="dialog" aria-label={title} onClick={onNext} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
    } }}>
  <Art className="vn-bg scene-img" src={bg} fallback={<div className="art-placeholder vn-bg"/>}/>
  {line?.cg && <img key={line.cg} className="vn-cg" src={ART.scene(line.cg)} alt=""/>}
  {line?.img && <img key={line.img} className="vn-item" src={ART.item(line.img)} alt=""/>}
  <div className={`vn-cast ${line?.img ? 'dim-cast' : ''}`} data-n={cast.length} hidden={!!line?.cg}>{cast.map(id => <Art key={id} className={`vn-full ${cast.length > 1 ? (line?.who === id ? 'on' : 'off') : ''}`} src={ART.full(id)} alt={YOKAI_BY_ID[id]?.name} fallback={<div className="portrait-fallback">{YOKAI_BY_ID[id]?.name}</div>}/>)}</div>
  <div className="vn-title">{title}</div>{onClose && <button className="vn-close panel" onClick={e => { e.stopPropagation(); onClose(); }}>닫기</button>}
  <div className="vn-box panel">{name && line?.who !== 'narration' && <div className="vn-name">{name}</div>}<div className="vn-text">{line?.text}</div>{children ?? <div className="vn-more">화면을 눌러 계속 ▾</div>}</div>
 </div>;
}
export function StoryView({ view, episode, onClose, open }: {
    view: GameState;
    episode?: string;
    onClose: () => void;
    open: (m: ModalRequest) => void;
}) {
    const [selected, setSelected] = useState<Episode | undefined>(episode ? EPISODE_BY_ID[episode] : undefined);
    return selected ? <EpisodeViewer key={selected.id} ep={selected} view={view} onClose={onClose} open={open}/> : <><div className="dim" onClick={onClose}/><div className="sheet" role="dialog" aria-label="이야기 목록"><button className="close" onClick={onClose}>닫기</button><div className="sheet-title">해랑국 이야기</div>{[...new Set(EPISODES.map(e => e.season))].map(season => <section key={season}><h2>{season}부</h2><div className="scene-list">{EPISODES.filter(e => e.season === season).map(ep => { const reason = lockReason(view, ep), done = view.story.done.includes(ep.id); return <button className="scene-item" key={ep.id} disabled={!!reason} onClick={() => setSelected(ep)}><span className="no">{ep.no}</span><span className="ttl">{ep.title}<small>{reason ?? (done ? '본 이야기 · 다시 보기' : '열린 이야기')}</small></span></button>; })}</div></section>)}</div></>;
}
function EpisodeViewer({ ep, view, onClose, open }: {
    ep: Episode;
    view: GameState;
    onClose: () => void;
    open: (m: ModalRequest) => void;
}) {
    const [wasDone] = useState(view.story.done.includes(ep.id));
    const [scene, setScene] = useState(0), [index, setIndex] = useState(0), [choices, setChoices] = useState<(number | null)[]>(() => ep.scenes.map(() => null));
    const [reply, setReply] = useState<string | null>(null), [finished, setFinished] = useState(false), [recruit, setRecruit] = useState<string | null>(null);
    const [ups, setUps] = useState<{
        id: string;
        level: number;
    }[]>([]);
    const flags = [...view.story.flags, ...ep.scenes.flatMap((sc, i) => choices[i] !== null ? sc.choice?.options[choices[i]!]?.effects?.flags ?? [] : [])];
    const sc = ep.scenes[scene], lines = visibleLines({ ...view, story: { ...view.story, flags } }, sc.lines);
    const choosing = index >= lines.length && !!sc.choice && choices[scene] === null;
    const finish = () => { const result = act(s => completeEpisode({ ...s, introSeen: true }, ep, choices)); setRecruit(result.recruit); setUps(result.bondUps); setFinished(true); };
    const next = () => {
        if (finished || choosing)
            return;
        if (index + 1 < lines.length) {
            setIndex(i => i + 1);
            return;
        }
        if (sc.choice && choices[scene] === null) {
            setIndex(lines.length);
            return;
        }
        if (scene + 1 < ep.scenes.length) {
            setScene(n => n + 1);
            setIndex(0);
            setReply(null);
        }
        else
            finish();
    };
    if (finished)
        return <><div className="dim"/><div className="modal episode-reward" role="dialog" aria-label="이야기 보상"><div className="title">{ep.title} · 끝</div>{wasDone ? <div className="sub">다시 본 이야기</div> : <div className="reward-list"><span>엽전 +{ep.reward?.coin ?? 0}</span><span>곡식 +{ep.reward?.grain ?? 0}</span><span>명성 +{ep.reward?.fame ?? 0}</span></div>}{recruit && <><div className="recruit-card"><Portrait def={YOKAI_BY_ID[recruit]}/></div><div className="title">{YOKAI_BY_ID[recruit].name} 합류</div></>}<div className="actions"><button className="btn hong" onClick={() => { onClose(); ups.forEach(u => open({ kind: 'bondup', ...u })); }}>궁궐로</button></div></div></>;
    return <NovelFrame title={`${ep.season}부 ${ep.no}화 · ${ep.title}`} bg={sc.cg ?? ART.bg(sc.bg)} cast={sc.cg ? [] : sceneCast(sc.cast ?? [], lines.slice(0, index + 1))} line={reply ? { who: 'narration', text: reply } : lines[index]} onNext={next} onClose={view.introSeen ? onClose : undefined}>{choosing ? <div className="vn-choices" onClick={e => e.stopPropagation()}><p>{sc.choice!.prompt}</p>{sc.choice!.options.map((o, i) => <button className="choice" key={i} onClick={() => { setChoices(c => c.map((v, j) => j === scene ? i : v)); setReply(o.reply ?? '선택을 마쳤습니다.'); }}>{o.text}</button>)}</div> : undefined}</NovelFrame>;
}
