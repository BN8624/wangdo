import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { battleKey, saveStoryPlace, storyBattleInfo, storyFight, withGuests } from '../core/campaign';
import type { Won } from '../core/engine';
import { fmt } from '../core/format';
import { completeEpisode, lockReason, visibleLines, type EpisodeResult } from '../core/story';
import type { Episode, GameState, StoryLine } from '../core/types';
import { EPISODES, EPISODE_BY_ID } from '../data/story';
import { ART } from '../data/art';
import { YOKAI_BY_ID } from '../data/yokai';
import { BattleView } from './BattleView';
import { FoePrep } from './FoePrep';
import { Art, Portrait } from './Portrait';
import { act } from './store';
import { buzz, pushToast } from './toast';
import { track } from './analytics';
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
  {/* 장소 배경은 흐리고 차분하게 눌러 인물이 돋보이게 한다(이벤트 그림은 그대로) */}
  <Art className={`vn-bg scene-img ${bg.includes('/bg/') ? 'soft' : ''}`} src={bg} fallback={<div className="art-placeholder vn-bg"/>}/>
  {line?.cg && <Art key={line.cg} className="vn-cg" src={ART.scene(line.cg)} fallback={null}/>}
  {line?.img && <Art key={line.img} className="vn-item" src={ART.item(line.img)} fallback={null}/>}
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
    return selected ? <EpisodeViewer key={selected.id} ep={selected} view={view} onClose={onClose} open={open}/> : <><div className="dim" onClick={onClose}/><div className="sheet" role="dialog" aria-label="이야기 목록"><button className="close" onClick={onClose}>닫기</button><div className="sheet-title">해랑국 이야기</div>{[...new Set(EPISODES.map(e => e.season))].map(season => <section key={season}><h2>{season}부</h2><div className="scene-list">{EPISODES.filter(e => e.season === season).map(ep => { const reason = lockReason(view, ep), done = view.story.done.includes(ep.id); return <button className="scene-item" key={ep.id} disabled={!!reason} onClick={() => setSelected(ep)}><span className="no">{ep.no}</span><span className="ttl">{ep.title}<small>{reason ?? (done ? '본 이야기 · 다시 보기' : progressLabel(view, ep))}</small></span></button>; })}</div></section>)}</div></>;
}
/** 목록에 보일 진행 상황: 전투를 몇 판 이겼는지 */
function progressLabel(s: GameState, ep: Episode): string {
  const total = ep.battles?.length ?? 0;
  if (!total) return '열린 이야기';
  const won = ep.battles!.filter((_, n) => s.story.won.includes(battleKey(ep, n))).length;
  return s.story.at?.ep === ep.id || won > 0 ? `이어 보기 · 전투 ${won}/${total}` : `열린 이야기 · 전투 ${total}판`;
}

type BattleStep = { n: number; step: 'intro' | 'prep' | 'outro'; line: number };

function EpisodeViewer({ ep, view, onClose, open }: { ep: Episode; view: GameState; onClose: () => void; open: (m: ModalRequest) => void }) {
  const [wasDone] = useState(view.story.done.includes(ep.id));
  // 전투를 앞두고 멈췄던 화면 이어서 연다: 그 장면 뒤의 전투부터
  const [resume] = useState(() => (!wasDone && view.story.at?.ep === ep.id ? view.story.at : null));
  const [scene, setScene] = useState(resume?.scene ?? 0);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<(number | null)[]>(() => resume?.choices ?? ep.scenes.map(() => null));
  const [reply, setReply] = useState<string | null>(null);
  const [result, setResult] = useState<EpisodeResult | null>(null);
  const [battle, setBattle] = useState<BattleStep | null>(null);
  const [fighting, setFighting] = useState<Won | null>(null);

  const flags = [...view.story.flags, ...ep.scenes.flatMap((sc, i) => (choices[i] !== null ? sc.choice?.options[choices[i]!]?.effects?.flags ?? [] : []))];
  const sc = ep.scenes[scene];
  const lines = visibleLines({ ...view, story: { ...view.story, flags } }, sc.lines);
  const choosing = !battle && index >= lines.length && !!sc.choice && choices[scene] === null;

  /** 이 장면 뒤에 아직 이기지 않은 전투(다시 보는 화는 전투를 건너뛴다) */
  const pendingAfter = (sceneIdx: number, s: GameState = view) =>
    wasDone ? -1 : (ep.battles ?? []).findIndex((b, n) => b.after === sceneIdx && !s.story.won.includes(battleKey(ep, n)));

  const finish = () => {
    const r = act((s) => completeEpisode({ ...s, introSeen: true }, ep, choices));
    track(`story/${ep.id}`);
    setResult(r);
  };

  const beginBattle = (n: number, sceneIdx: number) => {
    act((s) => [saveStoryPlace(s, { ep: ep.id, scene: sceneIdx, battle: n, choices }), null]);
    setBattle({ n, step: ep.battles![n].intro?.length ? 'intro' : 'prep', line: 0 });
  };

  /** 장면을 다 보면: 그 뒤에 전투가 있으면 전투, 없으면 다음 장면이나 끝 */
  const leaveScene = (sceneIdx: number, s: GameState = view) => {
    const n = pendingAfter(sceneIdx, s);
    if (n >= 0) return beginBattle(n, sceneIdx);
    setBattle(null);
    if (sceneIdx + 1 < ep.scenes.length) {
      setScene(sceneIdx + 1);
      setIndex(0);
      setReply(null);
    } else finish();
  };

  // 이어 보기로 열었으면 멈췄던 전투부터(이미 이겼으면 다음 장면으로)
  useEffect(() => {
    if (resume) leaveScene(resume.scene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    if (result || choosing || battle) return;
    if (index + 1 < lines.length) return setIndex((i) => i + 1);
    if (sc.choice && choices[scene] === null) return setIndex(lines.length);
    leaveScene(scene);
  };

  if (result) {
    const recruits = result.recruits.map((id) => YOKAI_BY_ID[id]).filter(Boolean);
    return (
      <>
        <div className="dim" />
        <div className="modal episode-reward" role="dialog" aria-label="이야기 보상">
          <div className="title">{ep.title} · 끝</div>
          {wasDone ? (
            <div className="sub">다시 본 이야기</div>
          ) : (
            <div className="reward-list">
              {ep.reward?.coin ? <span>엽전 +{fmt(ep.reward.coin)}</span> : null}
              {ep.reward?.grain ? <span>곡식 +{fmt(ep.reward.grain)}</span> : null}
              {ep.reward?.fame ? <span>명성 +{fmt(ep.reward.fame)}</span> : null}
            </div>
          )}
          {recruits.length > 0 && (
            <>
              <div className="recruit-row">
                {recruits.map((def) => (
                  <div key={def.id} className="recruit-card">
                    <Portrait def={def} />
                  </div>
                ))}
              </div>
              <div className="title">{recruits.map((d) => d.name).join(' · ')} 합류</div>
            </>
          )}
          <div className="actions">
            <button
              className="btn hong"
              onClick={() => {
                onClose();
                result.bondUps.forEach((u) => open({ kind: 'bondup', ...u }));
              }}
            >
              궁궐로
            </button>
          </div>
        </div>
      </>
    );
  }

  const title = `${ep.season}부 ${ep.no}화 · ${ep.title}`;
  const closable = view.introSeen ? onClose : undefined;

  if (battle) {
    const b = ep.battles![battle.n];
    const field = ART.battle(b.set);
    if (fighting) {
      return (
        <BattleView
          result={fighting}
          onClose={() => {
            const won = fighting.won;
            setFighting(null);
            if (!won) {
              pushToast({ text: '상대가 지쳤어요. 다시 도전하면 더 쉬워요' });
              return setBattle({ n: battle.n, step: 'prep', line: 0 });
            }
            if (b.outro?.length) return setBattle({ n: battle.n, step: 'outro', line: 0 });
            leaveScene(b.after);
          }}
        />
      );
    }
    if (battle.step === 'intro' || battle.step === 'outro') {
      const said = (battle.step === 'intro' ? b.intro : b.outro) ?? [];
      const line = said[battle.line];
      const who = line && YOKAI_BY_ID[line.who] ? [line.who] : [];
      return (
        <NovelFrame
          title={title}
          bg={field}
          cast={who}
          line={line}
          onClose={closable}
          onNext={() => {
            if (battle.line + 1 < said.length) return setBattle({ ...battle, line: battle.line + 1 });
            if (battle.step === 'intro') return setBattle({ ...battle, step: 'prep', line: 0 });
            leaveScene(b.after);
          }}
        />
      );
    }
    return (
      <>
        <NovelFrame title={title} bg={field} cast={[]} line={{ who: 'narration', text: `${b.foe}와(과) 맞섰다.` }} onNext={() => {}} onClose={closable}>
          <span />
        </NovelFrame>
        <BattlePrep
          view={view}
          ep={ep}
          n={battle.n}
          onFight={(r) => setFighting(r)}
          onLater={closable}
        />
      </>
    );
  }

  return (
    <NovelFrame
      title={title}
      bg={sc.cg ?? ART.bg(sc.bg)}
      cast={sc.cg ? [] : sceneCast(sc.cast ?? [], lines.slice(0, index + 1))}
      line={reply ? { who: 'narration', text: reply } : lines[index]}
      onNext={next}
      onClose={closable}
    >
      {choosing ? (
        <div className="vn-choices" onClick={(e) => e.stopPropagation()}>
          <p>{sc.choice!.prompt}</p>
          {sc.choice!.options.map((o, i) => (
            <button
              className="choice"
              key={i}
              onClick={() => {
                setChoices((c) => c.map((v, j) => (j === scene ? i : v)));
                setReply(o.reply ?? '선택을 마쳤습니다.');
              }}
            >
              {o.text}
            </button>
          ))}
        </div>
      ) : undefined}
    </NovelFrame>
  );
}

/** 이야기 전투 출전 준비 */
function BattlePrep({ view, ep, n, onFight, onLater }: { view: GameState; ep: Episode; n: number; onFight: (r: Won) => void; onLater?: () => void }) {
  const arena = useMemo(() => withGuests(view, ep, n), [view, ep, n]);
  const info = useMemo(() => storyBattleInfo(view, ep, n), [view, ep, n]);
  const b = ep.battles![n];
  const guests = (b.guests ?? []).filter((id) => !view.yokai[id]).map((id) => YOKAI_BY_ID[id]?.name);
  const order = (ep.battles ?? []).length > 1 ? ` · ${n + 1}/${ep.battles!.length}` : '';

  const go = (party: string[]) => {
    const r = act((s, t) => storyFight(s, t, ep, n, party));
    if (!r.ok) return pushToast({ text: '나설 식객을 모두 골라 주세요', warn: true });
    buzz(30);
    track(`story-battle/${ep.id}/${n}/${r.won ? 'win' : 'lose'}`);
    onFight(r);
  };

  return (
    <div className="bprep" role="dialog" aria-label="출전 준비" onClick={(e) => e.stopPropagation()}>
      <FoePrep
        arena={arena}
        info={info}
        label={`이야기 전투${order}`}
        boss={b.boss}
        note={guests.length > 0 && <div className="bprep-guest">함께 싸워요: {guests.join(' · ')}</div>}
        onGo={go}
      >
        {onLater && (
          <button className="btn" onClick={onLater}>
            나중에
          </button>
        )}
      </FoePrep>
    </div>
  );
}
