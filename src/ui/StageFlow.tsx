// 출정 흐름: (처음이면) 앞 컷신 → 편성 → 턴제 전투 → (첫 클리어면) 뒤 컷신 → 합류 → 다음 스테이지.
// 수련장도 같은 편성·전투 화면을 쓴다(컷신 없음).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { STAGES, STAGE_BY_ID, battleSeed, firstClearReward, stageCleared, stageOpen, stagePower, stageSetup, stageStars, stageWaves, type StageDef } from '../core/campaign';
import type { CombatResult, CombatSetup, UnitInit } from '../core/combat';
import { autoTeam, finishStage, finishTrain, markWatched, setTeam, type StageOutcome } from '../core/engine';
import { fmt } from '../core/format';
import { TRAIN_LEVELS, trainPower, trainReward, trainSetup, trainWaves } from '../core/idle';
import type { GameState } from '../core/types';
import { heroPower, levelCap, teamPower } from '../core/units';
import { ELEMENT_COLOR, ELEMENT_LABEL, RARITY_LABEL, ROLE_LABEL, advantage, elementOf, roleOf, type Element } from '../data/roster';
import { YOKAI_BY_ID } from '../data/yokai';
import { BattleView, type BattleOutcome } from './BattleView';
import { CutscenePlayer, cutKey, hasCut } from './StoryView';
import { RecruitCard } from './modals';
import { Art, Portrait } from './Portrait';
import { ResIcon } from './icons';
import { act, getState } from './store';
import { buzz, pushToast } from './toast';
import { track } from './analytics';
import { setMood } from './sound';
import type { ModalRequest } from './App';

type Phase =
  | { p: 'prep' }
  | { p: 'cut'; order: 'pre' | 'post' }
  | { p: 'battle'; setup: CombatSetup; seed: number; team: string[] }
  | { p: 'recruit'; ids: string[]; i: number };

type Step = 'post' | 'recruit' | 'next' | 'close';

/** 앞 컷신을 틀지: 아직 안 본 컷신이 있고 아직 깨지 않은 스테이지 */
const wantPre = (s: GameState, st: StageDef) => hasCut(st.pre) && !stageCleared(s, st.id) && !s.story.watched.includes(cutKey(st, 'pre'));

/** 목록에 보일 스테이지 이름 */
export function stageName(st: StageDef): string {
  if (st.battle) return st.battle.foe;
  const first = stageWaves(st)[0]?.[0];
  return first ? `${first.name} 무리` : '졸개 무리';
}

export function StageFlow({ id, open, onClose }: { id: string; open: (m: ModalRequest) => void; onClose: () => void }) {
  const [stageId, setStageId] = useState(id);
  const st = STAGE_BY_ID[stageId];
  const [phase, setPhase] = useState<Phase>(() => (wantPre(getState(), st) ? { p: 'cut', order: 'pre' } : { p: 'prep' }));
  const outcome = useRef<StageOutcome | null>(null);
  const steps = useRef<Step[]>([]);
  const view = getState();
  useEffect(() => setMood(phase.p === 'cut' ? 'story' : 'battle'), [phase.p]);

  const openStage = (next: StageDef) => {
    outcome.current = null;
    setStageId(next.id);
    setPhase(wantPre(getState(), next) ? { p: 'cut', order: 'pre' } : { p: 'prep' });
  };

  const runSteps = () => {
    const step = steps.current.shift() ?? 'close';
    if (step === 'post') {
      act((s) => [markWatched(s, cutKey(st, 'post')), null]);
      setPhase({ p: 'cut', order: 'post' });
    } else if (step === 'recruit') setPhase({ p: 'recruit', ids: outcome.current?.reward.recruits ?? [], i: 0 });
    else if (step === 'next') {
      const nx = STAGES[STAGES.indexOf(st) + 1];
      if (nx && stageOpen(getState(), nx)) openStage(nx);
      else onClose();
    } else onClose();
  };

  const leaveBattle = (goNext: boolean) => {
    const o = outcome.current;
    const list: Step[] = [];
    if (o?.won && o.first && hasCut(st.post)) list.push('post');
    if (o?.reward.recruits.length) list.push('recruit');
    list.push(goNext ? 'next' : 'close');
    steps.current = list;
    runSteps();
  };

  if (phase.p === 'cut') {
    return (
      <CutscenePlayer
        key={`${st.id}:${phase.order}`}
        view={view}
        parts={[{ stage: st, order: phase.order }]}
        apply
        onDone={() => {
          if (phase.order === 'pre') {
            act((s) => [markWatched(s, cutKey(st, 'pre')), null]);
            setPhase({ p: 'prep' });
          } else runSteps();
        }}
      />
    );
  }

  if (phase.p === 'recruit') {
    const rid = phase.ids[phase.i];
    if (!rid) return null;
    return <RecruitCard id={rid} onClose={() => (phase.i + 1 < phase.ids.length ? setPhase({ ...phase, i: phase.i + 1 }) : runSteps())} />;
  }

  if (phase.p === 'battle') {
    return (
      <BattleView
        key={`${st.id}:${phase.seed}`}
        setup={phase.setup}
        seed={phase.seed}
        title={`${st.label} ${stageName(st)}`}
        bg={st.bg}
        onFinish={(r: CombatResult): BattleOutcome => {
          const o = act((s) => finishStage(s, st, phase.team, r));
          outcome.current = o;
          track(`stage/${st.id}/${o.won ? 'win' : 'lose'}`);
          if (o.ranks.length) open({ kind: 'rank', ranks: o.ranks });
          return o;
        }}
        onClose={() => leaveBattle(false)}
        onRetry={() => setPhase({ p: 'prep' })}
        onNext={STAGES[STAGES.indexOf(st) + 1] ? () => leaveBattle(true) : undefined}
      />
    );
  }

  const cleared = stageCleared(view, st.id);
  const reward = firstClearReward(st);
  return (
    <Formation
      view={view}
      kicker={`${st.ep.season}부 ${st.chapter + 1}장 · ${st.label}${st.boss ? ' · 대장' : ''}`}
      title={stageName(st)}
      sub={st.ep.title}
      waves={stageWaves(st)}
      need={stagePower(st)}
      reward={
        cleared ? (
          <div className="fm-reward">
            <span className="fm-stars">
              {[1, 2, 3].map((n) => (
                <i key={n} className={n <= stageStars(view, st.id) ? 'on' : ''}>
                  ★
                </i>
              ))}
            </span>
            <small>별 하나마다 옥 10 · 승리, 아무도 쓰러지지 않음, 15라운드 안에 승리</small>
          </div>
        ) : (
          <RewardChips label="첫 클리어" items={[['jade', reward.jade], ['coin', reward.coin], ['exp', reward.exp], ['fame', reward.fame]]} extra={st.boss ? `기억 조각 ${reward.memory}${st.ep.reward?.recruit ? ' · 새 식객 합류' : ''}` : undefined} />
        )
      }
      onGo={(team) => {
        const s = getState();
        buzz(30);
        setPhase({ p: 'battle', setup: stageSetup(s, st, team), seed: battleSeed(s, st.id, team), team });
      }}
      onClose={onClose}
    />
  );
}

export function TrainFlow({ tier, open, onClose }: { tier: number; open: (m: ModalRequest) => void; onClose: () => void }) {
  const [battle, setBattle] = useState<{ setup: CombatSetup; seed: number; team: string[]; n: number } | null>(null);
  const view = getState();
  useEffect(() => setMood('battle'), []);
  const go = (team: string[], n = 0) => {
    const s = getState();
    buzz(30);
    setBattle({ setup: trainSetup(s, tier, team), seed: battleSeed(s, `train${tier}#0`, team), team, n });
  };
  if (battle) {
    return (
      <BattleView
        key={battle.n}
        setup={battle.setup}
        seed={battle.seed}
        title={`수련장 ${tier + 1}단계`}
        bg="palace"
        onFinish={(r) => {
          const o = act((s) => finishTrain(s, tier, battle.team, r));
          if (o.ranks.length) open({ kind: 'rank', ranks: o.ranks });
          return { won: o.won, stars: r.stars, reward: o.reward ?? undefined };
        }}
        onClose={onClose}
        onRetry={() => setBattle(null)}
        onNext={() => go(battle.team, battle.n + 1)}
        nextLabel="한 번 더 ›"
      />
    );
  }
  const r = trainReward(tier);
  return (
    <Formation
      view={view}
      kicker={`수련장 · ${tier + 1}단계 · Lv ${TRAIN_LEVELS[tier]}`}
      title="수련 대련"
      sub="몇 번이고 다시 할 수 있어요. 이기면 늘 같은 보상을 받아요."
      waves={trainWaves(tier)}
      need={trainPower(tier)}
      reward={<RewardChips label="승리마다" items={[['exp', r.exp], ['coin', r.coin], ['fame', r.fame]]} />}
      onGo={(team) => go(team)}
      onClose={onClose}
    />
  );
}

function RewardChips({ label, items, extra }: { label: string; items: ['jade' | 'coin' | 'exp' | 'fame', number][]; extra?: string }) {
  return (
    <div className="fm-reward">
      <small>{label}</small>
      <div>
        {items
          .filter(([, n]) => n > 0)
          .map(([k, n]) => (
            <span key={k}>
              <ResIcon kind={k} size={16} />
              {fmt(n)}
            </span>
          ))}
      </div>
      {extra && <small className="fm-extra">{extra}</small>}
    </div>
  );
}

/** 상대에게 가장 많은 속성과, 그 속성에 유리한 속성 */
function elementTip(waves: UnitInit[][]): { foe: Element; good: Element } | null {
  const count: Partial<Record<Element, number>> = {};
  for (const u of waves.flat()) count[u.element] = (count[u.element] ?? 0) + (u.boss ? 3 : 1);
  const top = (Object.entries(count) as [Element, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!top) return null;
  const good = (['water', 'fire', 'wood', 'light', 'dark'] as Element[]).find((e) => advantage(e, top) === 1);
  return good ? { foe: top, good } : null;
}

/** 편성 화면: 상대 미리보기, 권장 전투력, 다섯 칸, 자동 편성, 출동 */
export function Formation({ view, kicker, title, sub, waves, need, reward, onGo, onClose }: {
  view: GameState;
  kicker: string;
  title: string;
  sub: string;
  waves: UnitInit[][];
  need: number;
  reward: ReactNode;
  onGo: (team: string[]) => void;
  onClose: () => void;
}) {
  const [picking, setPicking] = useState<number | null>(null);
  const team = view.team;
  const power = teamPower(view, team);
  const ratio = need > 0 ? power / need : 2;
  const foes = useMemo(() => {
    const seen = new Map<string, UnitInit>();
    for (const u of waves.flat()) if (!seen.has(u.name + u.element) || u.boss) seen.set(u.name + u.element, u);
    return [...seen.values()].sort((a, b) => Number(!!b.boss) - Number(!!a.boss)).slice(0, 6);
  }, [waves]);
  const tip = useMemo(() => elementTip(waves), [waves]);
  const filled = team.filter(Boolean).length;
  const owned = Object.keys(view.yokai).length;

  const save = (next: string[]) => act((s) => [setTeam(s, next), null]);
  const put = (slot: number, id: string | null) => {
    const next = [...team];
    const at = id ? next.indexOf(id) : -1;
    if (at >= 0) next[at] = next[slot];
    next[slot] = id ?? '';
    save(next);
    setPicking(null);
    buzz(10);
  };

  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet fm" role="dialog" aria-label={`${title} 편성`}>
        <div className="sheet-head">
          <div className="fm-head">
            <small>{kicker}</small>
            <b>{title}</b>
            <span>{sub}</span>
          </div>
          <button className="close" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="fm-foes">
          <div className="fm-foe-row">
            {foes.map((u) => (
              <div key={u.id} className={`fm-foe ${u.boss ? 'boss' : ''}`} style={{ borderColor: ELEMENT_COLOR[u.element] }}>
                <Art src={u.art} alt={u.name} fallback={<div className="portrait-fallback">{u.name}</div>} />
                {u.boss && <em>대장</em>}
              </div>
            ))}
          </div>
          <small>
            웨이브 {waves.length} · 적 {waves.reduce((a, w) => a + w.length, 0)}
            {tip && (
              <>
                {' · '}주로 <b style={{ color: ELEMENT_COLOR[tip.foe] }}>{ELEMENT_LABEL[tip.foe]}</b> → <b style={{ color: ELEMENT_COLOR[tip.good] }}>{ELEMENT_LABEL[tip.good]}</b> 속성이 유리
              </>
            )}
          </small>
        </div>

        <div className={`fm-power ${ratio >= 1 ? 'ok' : ratio >= 0.85 ? 'close' : 'low'}`}>
          <span>
            내 전투력 <b>{fmt(power)}</b>
          </span>
          <span>
            권장 <b>{fmt(need)}</b>
          </span>
        </div>
        {ratio < 0.85 && filled > 0 && <p className="fm-warn">전투력이 많이 모자라요. 식객 탭에서 레벨·별을 올리거나, 수련장에서 수련치를 모아요.</p>}

        <div className="fm-slots">
          {team.map((id, i) => {
            const y = id ? view.yokai[id] : null;
            return (
              <button key={i} className={`fm-slot ${id ? '' : 'empty'} ${picking === i ? 'on' : ''}`} onClick={() => setPicking(picking === i ? null : i)}>
                {id && y ? (
                  <>
                    <Portrait def={YOKAI_BY_ID[id]} />
                    <i className="fm-elem" style={{ background: ELEMENT_COLOR[elementOf(id)] }} />
                    <span className="fm-lv">Lv{y.level}</span>
                    <span className="fm-role">{ROLE_LABEL[roleOf(id)]}</span>
                  </>
                ) : (
                  <span className="fm-plus">+</span>
                )}
              </button>
            );
          })}
        </div>

        {picking !== null && (
          <div className="fm-pick">
            {team[picking] && (
              <button className="fm-pick-row off" onClick={() => put(picking, null)}>
                <b>이 칸 비우기</b>
              </button>
            )}
            {Object.keys(view.yokai)
              .sort((a, b) => heroPower(view, b, []) - heroPower(view, a, []))
              .map((id) => {
                const y = view.yokai[id];
                const def = YOKAI_BY_ID[id];
                const at = team.indexOf(id);
                return (
                  <button key={id} className={`fm-pick-row ${at >= 0 ? 'in' : ''}`} onClick={() => put(picking, id)}>
                    <span className="fm-pick-pic">
                      <Portrait def={def} />
                    </span>
                    <span className="fm-pick-info">
                      <b>
                        {def.name} <em className={`rar r${def.grade}`}>{RARITY_LABEL[def.grade]}</em>
                      </b>
                      <small>
                        <i style={{ color: ELEMENT_COLOR[elementOf(id)] }}>●</i> {ELEMENT_LABEL[elementOf(id)]} · {ROLE_LABEL[roleOf(id)]} · Lv {y.level}/{levelCap(y.stars)} · {'★'.repeat(y.stars)}
                      </small>
                    </span>
                    <span className="fm-pick-pow">
                      {fmt(heroPower(view, id, []))}
                      {at >= 0 && <small>{at + 1}번 칸</small>}
                    </span>
                  </button>
                );
              })}
          </div>
        )}

        {reward}

        <div className="fm-actions">
          <button
            className="btn"
            data-guide="auto-team"
            onClick={() => {
              save(autoTeam(getState()));
              setPicking(null);
              buzz(15);
              if (owned < 2) pushToast({ text: '식객이 더 있어야 칸을 채울 수 있어요. 모집 탭에서 모아요' });
            }}
          >
            자동 편성
          </button>
          <button className="btn hong go" data-guide="go" disabled={filled === 0} onClick={() => onGo(team)}>
            출동
          </button>
        </div>
      </div>
    </>
  );
}
