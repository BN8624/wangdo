// 이야기 화면. 스테이지 사이에 짧은 컷신을 틀고(CutscenePlayer), 다 깬 장은 다시 볼 수 있다(StoryList).
import { useMemo, useState, type ReactNode } from 'react';
import { chapterStages, type Cut, type StageDef } from '../core/campaign';
import { choose } from '../core/engine';
import type { Episode, GameState, StoryLine } from '../core/types';
import { EPISODES } from '../data/story';
import { ART } from '../data/art';
import { YOKAI_BY_ID } from '../data/yokai';
import { Art } from './Portrait';
import { act } from './store';

/** 장면에 보일 인물: 폰 화면에서 크게 보이도록 가장 최근에 말했거나 등장한 식객 한 명. 주인공은 1인칭이라 화면에 나오지 않는다. */
function sceneCast(cast: string[], spoken: StoryLine[]): string[] {
  for (let i = spoken.length - 1; i >= 0; i--) {
    const who = spoken[i].show ?? spoken[i].who;
    if (cast.includes(who)) return [who];
  }
  return [];
}

export function NovelFrame({ title, bg, cast, line, onNext, children, onClose, closeLabel = '닫기' }: {
  title: string;
  bg: string;
  cast: string[];
  line?: StoryLine;
  onNext: () => void;
  children?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
}) {
  const name = line?.as ?? (line?.who === 'me' ? '나' : line?.who.startsWith('npc:') ? line.who.slice(4) : YOKAI_BY_ID[line?.who ?? '']?.name);
  return (
    <div
      className="vn"
      role="dialog"
      aria-label={title}
      onClick={onNext}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNext();
        }
      }}
    >
      {/* 장소 배경은 흐리고 차분하게 눌러 인물이 돋보이게 한다(이벤트 그림은 그대로) */}
      <Art className={`vn-bg scene-img ${bg.includes('/bg/') || bg.includes('/battle/') ? 'soft' : ''}`} src={bg} fallback={<div className="art-placeholder vn-bg" />} />
      {line?.cg && <Art key={line.cg} className="vn-cg" src={ART.scene(line.cg)} fallback={null} />}
      {line?.img && <Art key={line.img} className="vn-item" src={ART.item(line.img)} fallback={null} />}
      <div className={`vn-cast ${line?.img ? 'dim-cast' : ''}`} data-n={cast.length} hidden={!!line?.cg}>
        {cast.map((id) => (
          <Art
            key={id}
            className={`vn-full ${cast.length > 1 ? (line?.who === id ? 'on' : 'off') : ''}`}
            src={ART.full(id)}
            alt={YOKAI_BY_ID[id]?.name}
            fallback={<div className="portrait-fallback">{YOKAI_BY_ID[id]?.name}</div>}
          />
        ))}
      </div>
      <div className="vn-title">{title}</div>
      {onClose && (
        <button
          className="vn-close panel"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          {closeLabel}
        </button>
      )}
      <div className="vn-box panel">
        {name && line?.who !== 'narration' && <div className="vn-name">{name}</div>}
        <div className="vn-text">{line?.text}</div>
        {children ?? <div className="vn-more">화면을 눌러 계속 ▾</div>}
      </div>
    </div>
  );
}

/** 컷신 한 토막: 어느 스테이지의 앞(pre)인지 뒤(post)인지 */
export interface CutPart {
  stage: StageDef;
  order: 'pre' | 'post';
}

type Segment = { kind: 'scene'; ep: Episode; i: number; title: string } | { kind: 'lines'; lines: StoryLine[]; bg: string; title: string };

export const hasCut = (c: Cut) => !!c.scenes || !!c.lines?.length;
export const cutKey = (st: StageDef, order: 'pre' | 'post') => `${st.id}:${order}`;

/** 앞 컷신은 장면 → 전투 전 대화, 뒤 컷신은 전투 뒤 대화 → 남은 장면 */
function segments(parts: CutPart[]): Segment[] {
  const out: Segment[] = [];
  for (const { stage: st, order } of parts) {
    const cut = order === 'pre' ? st.pre : st.post;
    const title = `${st.label} · ${st.ep.title}`;
    const scenes: Segment[] = [];
    if (cut.scenes) for (let i = cut.scenes[0]; i <= cut.scenes[1]; i++) if (st.ep.scenes[i]) scenes.push({ kind: 'scene', ep: st.ep, i, title });
    const lines: Segment[] = cut.lines?.length ? [{ kind: 'lines', lines: cut.lines, bg: ART.battle(st.bg), title }] : [];
    out.push(...(order === 'pre' ? [...scenes, ...lines] : [...lines, ...scenes]));
  }
  return out;
}

/** 컷신 재생. apply면 선택지 효과(깃발·인연)를 바로 반영한다(다시 보기는 반영하지 않는다) */
export function CutscenePlayer({ view, parts, apply, onDone, skipLabel = '건너뛰기' }: {
  view: GameState;
  parts: CutPart[];
  apply: boolean;
  onDone: () => void;
  skipLabel?: string;
}) {
  const segs = useMemo(() => segments(parts), [parts]);
  const [seg, setSeg] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [reply, setReply] = useState<string | null>(null);
  const [localFlags, setLocalFlags] = useState<string[]>([]);
  const s = segs[seg];
  if (!s) return null;
  const flags = [...view.story.flags, ...localFlags];
  const scene = s.kind === 'scene' ? s.ep.scenes[s.i] : null;
  const lines = scene ? scene.lines.filter((l) => !l.if || flags.includes(l.if)) : s.kind === 'lines' ? s.lines : [];
  const choosing = !!scene?.choice && index >= lines.length && picked[seg] === undefined;

  const next = () => {
    if (choosing) return;
    if (index + 1 < lines.length) return setIndex(index + 1);
    if (scene?.choice && picked[seg] === undefined) return setIndex(lines.length);
    if (seg + 1 < segs.length) {
      setSeg(seg + 1);
      setIndex(0);
      setReply(null);
    } else onDone();
  };

  const pick = (i: number) => {
    const o = scene!.choice!.options[i];
    setPicked((p) => ({ ...p, [seg]: i }));
    setReply(o.reply ?? '선택을 마쳤습니다.');
    if (apply) act((st) => [choose(st, o.effects), null]);
    else if (o.effects?.flags) setLocalFlags((f) => [...f, ...o.effects!.flags!]);
  };

  const line = reply ? { who: 'narration', text: reply } : lines[Math.min(index, lines.length - 1)];
  const bg = scene ? scene.cg ?? ART.bg(scene.bg) : s.kind === 'lines' ? s.bg : '';
  const cast = scene ? (scene.cg ? [] : sceneCast(scene.cast ?? [], lines.slice(0, index + 1))) : line && YOKAI_BY_ID[line.who] ? [line.who] : [];

  return (
    <NovelFrame title={s.title} bg={bg} cast={cast} line={line} onNext={next} onClose={onDone} closeLabel={skipLabel}>
      {choosing ? (
        <div className="vn-choices" onClick={(e) => e.stopPropagation()}>
          <p>{scene!.choice!.prompt}</p>
          {scene!.choice!.options.map((o, i) => (
            <button className="choice" key={i} onClick={() => pick(i)}>
              {o.text}
            </button>
          ))}
        </div>
      ) : undefined}
    </NovelFrame>
  );
}

/** 한 장(화)의 컷신을 처음부터 끝까지 */
export function chapterParts(chapter: number): CutPart[] {
  return chapterStages(chapter).flatMap((stage) => (['pre', 'post'] as const).filter((order) => hasCut(order === 'pre' ? stage.pre : stage.post)).map((order) => ({ stage, order })));
}

/** 다 깬 장의 이야기 다시 보기 */
export function StoryList({ view, onClose }: { view: GameState; onClose: () => void }) {
  const [playing, setPlaying] = useState<number | null>(null);
  if (playing !== null) return <CutscenePlayer view={view} parts={chapterParts(playing)} apply={false} onDone={() => setPlaying(null)} skipLabel="닫기" />;
  const seasons = [...new Set(EPISODES.map((e) => e.season))];
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="이야기 다시 보기">
        <div className="sheet-head">
          <div className="sheet-title">이야기 다시 보기</div>
          <button className="close" onClick={onClose}>
            닫기
          </button>
        </div>
        <p className="soft small-note">장의 마지막 스테이지를 깨면 그 장의 이야기를 처음부터 다시 볼 수 있어요.</p>
        {seasons.map((season) => (
          <section key={season}>
            <h2 className="story-season">{season}부</h2>
            <div className="scene-list">
              {EPISODES.map((ep, chapter) => ({ ep, chapter }))
                .filter(({ ep }) => ep.season === season)
                .map(({ ep, chapter }) => {
                  const done = view.story.done.includes(ep.id);
                  return (
                    <button className={`scene-item ${done ? '' : 'locked'}`} key={ep.id} disabled={!done} onClick={() => setPlaying(chapter)}>
                      <span className="no">{chapter + 1}</span>
                      <span className="ttl">
                        {done ? ep.title : '아직 깨지 않은 장'}
                        <small>{done ? ep.summary : `${chapter + 1}장을 끝까지 깨면 열려요`}</small>
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
