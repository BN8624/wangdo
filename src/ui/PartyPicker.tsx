// 편성 고르기: 판마다 겨룰 능력치와 나설 식객, 이길 확률. 모험과 이야기 속 전투가 함께 쓴다.
import { useState } from 'react';
import { battleChance, bestParty, ownedYokai, statsOf } from '../core/engine';
import { fmt } from '../core/format';
import type { GameState, StageInfo } from '../core/types';
import { SKILL_LABEL, SKILLS } from '../data/skills';
import { STAT_LABEL, YOKAI_BY_ID } from '../data/yokai';
import { Portrait } from './Portrait';
import { SPEC_COLOR } from './YokaiView';

const pct = (p: number) => `${Math.round(p * 100)}%`;

/** view: 이 전투에 나설 수 있는 식객이 들어 있는 상태(이야기 전투면 손님 식객까지) */
export function PartyPicker({ view, info, party, setParty }: { view: GameState; info: StageInfo; party: string[]; setParty: (p: string[]) => void }) {
  const [choosing, setChoosing] = useState<number | null>(null);
  const total = battleChance(view, info, party);

  const choose = (slot: number, id: string) => {
    const next = [...party];
    const other = next.indexOf(id);
    if (other >= 0) next[other] = next[slot];
    next[slot] = id;
    setParty(next);
    setChoosing(null);
  };

  return (
    <>
      <div className="rounds">
        {info.rounds.map((r, i) => {
          const id = party[i];
          const def = id ? YOKAI_BY_ID[id] : null;
          return (
            <button key={i} className={`round ${choosing === i ? 'on' : ''}`} onClick={() => setChoosing(choosing === i ? null : i)}>
              <span className="round-no">{i + 1}번</span>
              <span className="round-stat" style={{ background: SPEC_COLOR[r.stat] }}>
                {STAT_LABEL[r.stat]}
              </span>
              <span className="round-pic">{def ? <Portrait def={def} /> : '?'}</span>
              <span className="round-vs">
                <b className={def && statsOf(view, id)[r.stat] >= r.value ? 'ok' : 'bad'}>{def ? fmt(statsOf(view, id)[r.stat]) : '-'}</b> vs {fmt(r.value)}
              </span>
              <span className={`round-skill ${id && SKILLS[id]?.kind === info.weak ? 'weak' : ''}`}>{id && SKILLS[id] ? SKILL_LABEL[SKILLS[id].kind] : ''}</span>
            </button>
          );
        })}
      </div>

      {choosing !== null && (
        <div className="chooser">
          {ownedYokai(view)
            .map(({ def }) => ({ def, v: statsOf(view, def.id)[info.rounds[choosing].stat] }))
            .sort((a, b) => b.v - a.v)
            .map(({ def, v }) => (
              <button key={def.id} className={party[choosing] === def.id ? 'on' : ''} onClick={() => choose(choosing, def.id)}>
                <span className="cpic">
                  <Portrait def={def} />
                </span>
                <b>{def.name}</b>
                <span className={v >= info.rounds[choosing].value ? 'ok' : 'bad'}>{fmt(v)}</span>
                {SKILLS[def.id] && <small className={SKILLS[def.id].kind === info.weak ? 'weak' : ''}>{SKILL_LABEL[SKILLS[def.id].kind]}</small>}
              </button>
            ))}
        </div>
      )}

      <div className="need">
        <span>
          이길 확률 <b style={{ color: total >= 0.5 ? 'var(--cheong)' : 'var(--hong)' }}>{pct(total)}</b>
        </span>
        <button className="link-btn" onClick={() => setParty(bestParty(view, info))}>
          추천 편성
        </button>
      </div>
    </>
  );
}
