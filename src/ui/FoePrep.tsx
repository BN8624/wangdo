// 출전 준비: 상대·약점·편성·이길 확률·보상. 이야기 전투와 모험(필드·던전·사연)이 함께 쓴다.
import { useEffect, useState, type ReactNode } from 'react';
import { BALANCE } from '../data/balance';
import { BATTLE } from '../core/battle';
import { battleExp, bestParty } from '../core/engine';
import { fmt } from '../core/format';
import type { GameState, StageInfo } from '../core/types';
import { foeArtPath } from '../data/art';
import { SKILL_LABEL } from '../data/skills';
import { PartyPicker } from './PartyPicker';
import { Art } from './Portrait';
import { ResIcon } from './icons';

/** arena: 나설 수 있는 식객이 든 상태(이야기 전투면 손님까지). label: 상대 위 작은 글씨 */
export function FoePrep({
  arena,
  info,
  label,
  note,
  boss,
  children,
  onGo,
}: {
  arena: GameState;
  info: StageInfo;
  label: string;
  note?: ReactNode;
  boss?: boolean;
  /** 출동 단추 줄(편성은 onGo로 넘긴다) */
  children?: ReactNode;
  onGo: (party: string[]) => void;
}) {
  const owned = Object.keys(arena.yokai).length;
  const [party, setParty] = useState<string[]>(() => bestParty(arena, info));
  // 상대가 바뀌거나(다음 판·지침) 식객이 늘면 추천 편성으로 다시 맞춘다
  useEffect(() => {
    setParty(bestParty(arena, info));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.index, owned]);
  const tired = info.mercy !== undefined && info.mercy < 1 ? Math.round((1 - info.mercy) * 100) : 0;
  const exp = battleExp(info.level ?? 1, boss ?? info.isBoss);

  return (
    <>
      <div className="foe">
        <div className={`foe-pic ${info.isBoss ? 'boss' : ''}`}>
          <Art className="foe-face" src={foeArtPath(info)} alt={info.foe} fallback={<div className="portrait-fallback">{info.foe}</div>} />
        </div>
        <div>
          <div className="foe-no">
            {label}
            {info.isBoss ? ' · 대장' : ''}
          </div>
          <div className="foe-name">
            {info.foe} {info.level !== undefined && <small className="foe-lv">Lv {info.level}</small>}
          </div>
          <div className="foe-weak">
            약점 <b>{SKILL_LABEL[info.weak]}</b>
            <small>이 기술은 {BATTLE.weakHit}배로 들어가요</small>
          </div>
          {tired > 0 && <div className="bprep-tired">다시 도전 · 상대가 지쳐 {tired}% 약해졌어요</div>}
          {note}
        </div>
      </div>
      <PartyPicker view={arena} info={info} party={party} setParty={setParty} />
      <div className="reward">
        이기면
        <span>
          <ResIcon kind="exp" size={16} />+{fmt(exp)}
        </span>
        <span>
          <ResIcon kind="coin" size={16} />+{fmt(info.coin)}
        </span>
        <span>
          <ResIcon kind="fame" size={16} />+{fmt(info.fame)}
        </span>
        <em>지면 {Math.round(BALANCE.loseRewardRatio * 100)}%</em>
      </div>
      <div className="bprep-actions">
        {children}
        <button className="btn hong go" data-guide="go" onClick={() => onGo(party)} disabled={party.length < info.rounds.length}>
          출동!
        </button>
      </div>
    </>
  );
}
