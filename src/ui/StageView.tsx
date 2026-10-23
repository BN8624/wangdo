import { useEffect, useState } from 'react';
import { bestParty, fight, ownedYokai, partyChance, partyChances, staminaRegenRemaining, stageInfo, statsOf, winChance } from '../core/engine';
import { fmt, fmtDuration } from '../core/format';
import { BALANCE } from '../data/balance';
import { STAGES_PER_CHAPTER } from '../data/stages';
import { STAT_LABEL, YOKAI_BY_ID } from '../data/yokai';
import type { GameState } from '../core/types';
import { ChapterArt, FoeGroup, ResIcon } from './icons';
import { Portrait } from './Portrait';
import { act } from './store';
import { buzz, pushToast } from './toast';
import type { ModalRequest } from './App';
import { SPEC_COLOR } from './YokaiView';

const pct = (p: number) => `${Math.round(p * 100)}%`;

export function StageView({ view, now, open }: { view: GameState; now: number; open: (m: ModalRequest) => void }) {
  const info = stageInfo(view.stage.index);
  const [party, setParty] = useState<string[]>(() => (info ? bestParty(view, info) : []));
  const [choosing, setChoosing] = useState<number | null>(null);

  // 토벌이 바뀌거나 새 식객이 오면 추천 편성으로 다시 맞춘다.
  const owned = Object.keys(view.yokai).length;
  useEffect(() => {
    if (info) setParty(bestParty(view, info));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.stage.index, owned]);

  if (!info) {
    return (
      <div className="view">
        <div className="page-title">토벌 해결</div>
        <div className="card" style={{ textAlign: 'center', lineHeight: 1.7 }}>
          <b style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>모든 토벌을 잠재웠어요!</b>
          <br />
          팔도가 조용해졌어요. 다음 이야기는 준비 중이에요.
        </div>
      </div>
    );
  }

  const chances = partyChances(view, info, party);
  const total = partyChance(chances);
  const regen = staminaRegenRemaining(view, now);
  const chapterStart = info.chapterIndex * STAGES_PER_CHAPTER;

  const go = () => {
    const r = act((s, t) => fight(s, t, party));
    if (!r.ok) {
      if (r.reason === 'no-stamina') pushToast({ text: '기력이 없어요. 조금 쉬었다 와요', warn: true });
      if (r.reason === 'bad-party') pushToast({ text: '서로 다른 식객 셋을 골라 주세요', warn: true });
      return;
    }
    buzz(30);
    open({ kind: 'fight', result: r });
  };

  const choose = (slot: number, id: string) => {
    const next = [...party];
    const other = next.indexOf(id);
    if (other >= 0) next[other] = next[slot];
    next[slot] = id;
    setParty(next);
    setChoosing(null);
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
          const cls = done ? 'done' : idx === view.stage.index ? 'now' : 'todo';
          return (
            <span key={i} style={{ display: 'contents' }}>
              <div className={`node ${cls} ${isBoss ? 'boss' : ''}`}>{done ? '✓' : isBoss ? '★' : i + 1}</div>
              {i < STAGES_PER_CHAPTER - 1 && <div className={`link ${done ? 'done' : ''}`} />}
            </span>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="foe">
          <div className={`foe-pic ${info.isBoss ? 'boss' : ''}`}>
            <FoeGroup chapterId={info.chapter.id} />
          </div>
          <div>
            <div className="foe-no">
              {info.chapter.title.split(' · ')[0]} · {info.isBoss ? '대장' : `${info.number}번째 토벌`}
            </div>
            <div className="foe-name">{info.foe}</div>
            <div className="soft" style={{ fontSize: 13 }}>세 판 중 두 판을 이기면 해결!</div>
          </div>
        </div>

        <div className="rounds">
          {info.rounds.map((r, i) => {
            const id = party[i];
            const def = id ? YOKAI_BY_ID[id] : null;
            return (
              <button key={i} className={`round ${choosing === i ? 'on' : ''}`} onClick={() => setChoosing(choosing === i ? null : i)}>
                <span className="round-no">{i + 1}판</span>
                <span className="round-stat" style={{ background: SPEC_COLOR[r.stat] }}>
                  {STAT_LABEL[r.stat]}
                </span>
                <span className="round-pic">{def ? <Portrait def={def} /> : '?'}</span>
                <span className="round-vs">
                  <b>{def ? fmt(statsOf(view, id)[r.stat]) : '-'}</b> vs {fmt(r.value)}
                </span>
                <span className={`round-p ${chances[i] >= 0.5 ? 'ok' : 'bad'}`}>{pct(chances[i])}</span>
              </button>
            );
          })}
        </div>

        {choosing !== null && (
          <div className="chooser">
            {ownedYokai(view)
              .map(({ def }) => ({ def, p: winChance(statsOf(view, def.id)[info.rounds[choosing].stat], info.rounds[choosing].value) }))
              .sort((a, b) => b.p - a.p)
              .map(({ def, p }) => (
                <button key={def.id} className={party[choosing] === def.id ? 'on' : ''} onClick={() => choose(choosing, def.id)}>
                  <span className="cpic">
                    <Portrait def={def} />
                  </span>
                  <b>{def.name}</b>
                  <span>{pct(p)}</span>
                </button>
              ))}
          </div>
        )}

        <div className="need">
          <span>
            해결 확률 <b style={{ color: total >= 0.5 ? 'var(--cheong)' : 'var(--hong)' }}>{pct(total)}</b>
          </span>
          <button className="link-btn" onClick={() => setParty(bestParty(view, info))}>
            추천 편성
          </button>
        </div>
        <div className="reward">
          이기면
          <span>
            <ResIcon kind="fame" size={16} />+{fmt(info.fame)}
          </span>
          <span>
            <ResIcon kind="coin" size={16} />+{fmt(info.coin)}
          </span>
          <span>+ 선물</span>
        </div>
        <button className="btn hong wide go" data-guide="go" disabled={view.stamina.value < 1 || party.length < 3} onClick={go}>
          출동! <small>기력 1</small>
        </button>
        <div className="cap-note">
          기력 {view.stamina.value}/{BALANCE.staminaMax}
          {regen !== null && ` · 다음 회복 ${fmtDuration(regen)}`}
        </div>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
