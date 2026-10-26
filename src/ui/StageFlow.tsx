// 출정 흐름: (처음이면) 앞 컷신 → 편성 → 턴제 전투 → (첫 클리어면) 뒤 컷신 → 합류 → 다음 스테이지.
// 수련장도 같은 편성·전투 화면을 쓴다(컷신 없음).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { STAGES, STAGE_BY_ID, battleSeed, firstClearReward, stageCleared, stageOpen, stagePower, stageSetup, stageStars, stageWaves, type StageDef } from '../core/campaign';
import type { CombatResult, CombatSetup, UnitInit } from '../core/combat';
import { autoTeam, finishStage, finishTrain, markWatched, setTeam, type StageOutcome } from '../core/engine';
import { fmt } from '../core/format';
import { TRAIN_LEVELS, trainPower, trainReward, trainSetup, trainWaves } from '../core/idle';
import type { GameState } from '../core/types';
import { heroPower, teamPower } from '../core/units';
import { ELEMENT_COLOR, ELEMENT_LABEL, ROLE_LABEL, advantage, elementOf, roleOf, type Element } from '../data/roster';
import { YOKAI_BY_ID } from '../data/yokai';
import { BattleView, type BattleOutcome } from './BattleView';
import { CutscenePlayer, cutKey, hasCut } from './StoryView';
import { RecruitCard } from './modals';
import { Art, Portrait } from './Portrait';
import { ART } from '../data/art';
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
      kicker={`${st.label}${st.boss ? ' 대장' : ''} · ${st.ep.title}`}
      title={stageName(st)}
      bg={st.bg}
      waves={stageWaves(st)}
      need={stagePower(st)}
      reward={
        cleared ? (
          <div className="fm-reward">
            <small>별</small>
            <span className="fm-stars">
              {'★'.repeat(stageStars(view, st.id))}
              <em>{'★'.repeat(3 - stageStars(view, st.id))}</em>
            </span>
            <em>승리 · 아무도 안 쓰러짐 · 15라운드 안</em>
          </div>
        ) : (
          <RewardChips label="첫 클리어" items={[['jade', reward.jade], ['coin', reward.coin], ['exp', reward.exp], ['fame', reward.fame]]} extra={st.boss && st.ep.reward?.recruit ? '새 식객 합류' : undefined} />
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
      kicker={`수련장 ${tier + 1}단계 · Lv ${TRAIN_LEVELS[tier]}`}
      title="수련 대련"
      bg="palace"
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
      {items
        .filter(([, n]) => n > 0)
        .map(([k, n]) => (
          <span key={k}>
            <ResIcon kind={k} size={14} />
            {fmt(n)}
          </span>
        ))}
      {extra && <em>{extra}</em>}
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

/** 편성 화면: 상대 미리보기, 다섯 칸에 전신으로 선 식객, 전투력과 출동 */
export function Formation({ view, kicker, title, bg, waves, need, reward, onGo, onClose }: {
  view: GameState;
  kicker: string;
  title: string;
  bg: string;
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
    for (const u of waves.flat()) if (!seen.has(u.name) || u.boss) seen.set(u.name, u);
    return [...seen.values()].sort((a, b) => Number(!!b.boss) - Number(!!a.boss)).slice(0, 5);
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
    <div className="fm" role="dialog" aria-label={`${title} 편성`}>
      <Art className="fm-bg" src={ART.battle(bg)} fallback={<div className="fm-bg" />} />
      <div className="fm-top">
        <button className="fm-back" aria-label="닫기" onClick={onClose}>
          ‹
        </button>
        <div className="fm-head">
          <small>{kicker}</small>
          <b>{title}</b>
        </div>
      </div>

      <div className="fm-foes">
        {foes.map((u) => (
          <span key={u.id} className={`fm-foe ${u.boss ? 'boss' : ''}`} style={{ ['--el' as string]: ELEMENT_COLOR[u.element] }}>
            <Art src={u.art} alt={u.name} fallback={<i />} />
          </span>
        ))}
        <small>
          WAVE {waves.length}
          {tip && (
            <>
              {' · '}
              <b style={{ color: ELEMENT_COLOR[tip.good] }}>{ELEMENT_LABEL[tip.good]}</b> 속성 유리
            </>
          )}
        </small>
      </div>

      <div className="fm-team">
        {team.map((id, i) => {
          const y = id ? view.yokai[id] : null;
          return (
            <button key={i} className={`fm-slot ${id ? '' : 'empty'} ${picking === i ? 'on' : ''}`} style={id ? { ['--el' as string]: ELEMENT_COLOR[elementOf(id)] } : undefined} onClick={() => setPicking(i)}>
              {id && y ? (
                <>
                  <Art className="fm-stand" src={ART.full(id)} alt={YOKAI_BY_ID[id].name} fallback={<span className="portrait-fallback">{YOKAI_BY_ID[id].name}</span>} />
                  <span className="fm-plate">
                    <b>{YOKAI_BY_ID[id].name}</b>
                    <small>
                      Lv{y.level} <i>{'★'.repeat(y.stars)}</i>
                    </small>
                  </span>
                </>
              ) : (
                <span className="fm-plus">+</span>
              )}
            </button>
          );
        })}
      </div>

      {reward}
      {ratio < 0.85 && filled > 0 && <p className="fm-warn">전투력이 모자라요 · 식객 레벨·별을 올리거나 수련장에서 키워요</p>}

      <div className="fm-bar">
        <div className={`fm-power ${ratio >= 1 ? 'ok' : ratio >= 0.85 ? 'close' : 'low'}`}>
          <small>전투력</small>
          <b>{fmt(power)}</b>
          <small>권장 {fmt(need)}</small>
        </div>
        <button
          className="fm-auto"
          data-guide="auto-team"
          onClick={() => {
            save(autoTeam(getState()));
            buzz(15);
            if (owned < 2) pushToast({ text: '식객이 더 있어야 칸을 채울 수 있어요. 모집 탭에서 모아요' });
          }}
        >
          자동
          <br />
          편성
        </button>
        <button className="fm-go" data-guide="go" disabled={filled === 0} onClick={() => onGo(team)}>
          출동
        </button>
      </div>

      {picking !== null && (
        <>
          <div className="dim" onClick={() => setPicking(null)} />
          <div className="sheet fm-pick" role="dialog" aria-label="식객 고르기">
            <div className="sheet-head">
              <div className="sheet-title">{picking + 1}번 칸</div>
              <span className="fm-pick-btns">
                {team[picking] && (
                  <button className="close" onClick={() => put(picking, null)}>
                    비우기
                  </button>
                )}
                <button className="close" onClick={() => setPicking(null)}>
                  닫기
                </button>
              </span>
            </div>
            <div className="fm-grid">
              {Object.keys(view.yokai)
                .sort((a, b) => heroPower(view, b, []) - heroPower(view, a, []))
                .map((id) => {
                  const y = view.yokai[id];
                  const def = YOKAI_BY_ID[id];
                  const at = team.indexOf(id);
                  return (
                    <button key={id} className={`fm-cell r${def.grade} ${at >= 0 ? 'in' : ''}`} onClick={() => put(picking, id)}>
                      <Portrait def={def} />
                      <i className="fm-el" style={{ background: ELEMENT_COLOR[elementOf(id)] }} />
                      {at >= 0 && <em>{at + 1}</em>}
                      <span>
                        <b>{def.name}</b>
                        <small>
                          Lv{y.level} · {ROLE_LABEL[roleOf(id)]}
                        </small>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
