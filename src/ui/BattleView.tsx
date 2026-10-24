// 토벌 전투 화면. 엔진이 미리 계산한 전투 기록(battle.events)을 한 칸씩 재생한다. 모두 자동이고, 2배속과 건너뛰기만 있다.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { FightResult } from '../core/engine';
import type { BattleEvent } from '../core/battle';
import { BATTLE } from '../core/battle';
import type { StatKey } from '../core/types';
import { fmt } from '../core/format';
import { ART } from '../data/art';
import { GIFT_BY_ID } from '../data/village';
import { STAT_LABEL, YOKAI_BY_ID } from '../data/yokai';
import { ResIcon } from './icons';
import { Art } from './Portrait';
import { buzz } from './toast';
import { SPEC_COLOR } from './YokaiView';

const PACE: Record<BattleEvent['t'], number> = { round: 420, hit: 560, miss: 480, down: 700 };

/** 맡은 능력치마다 다른 타격 효과 */
const FX: Record<StatKey, string> = { might: 'slash', wit: 'burst', politics: 'seal', charm: 'bloom' };

// 맞거나 덤빌 때 흔들림. key로 다시 그리면 그림이 깜빡여서 Web Animations로 그 자리에서 다시 튼다.
const FOE_HIT: Keyframe[] = [
  { transform: 'none', filter: 'brightness(2.2)' },
  { transform: 'translateX(10px)', offset: 0.3 },
  { transform: 'translateX(-6px)', filter: 'brightness(1.3)', offset: 0.6 },
  { transform: 'none', filter: 'none' },
];
const FOE_LUNGE: Keyframe[] = [{ transform: 'none' }, { transform: 'translate(-18px, 14px) scale(1.06)', offset: 0.4 }, { transform: 'none' }];
const CARD_HURT: Keyframe[] = [
  { transform: 'none', filter: 'brightness(1.8) sepia(1) hue-rotate(-40deg) saturate(4)' },
  { transform: 'translateX(-5px)', offset: 0.4 },
  { transform: 'translateX(4px)', offset: 0.7 },
  { transform: 'none', filter: 'none' },
];
const SHAKE: Keyframe[] = [
  { transform: 'none' },
  { transform: 'translate(-7px, 4px)' },
  { transform: 'translate(6px, -4px)' },
  { transform: 'translate(-3px, 2px)' },
  { transform: 'none' },
];

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadSpeed(): 1 | 2 {
  try {
    return localStorage.getItem('wangdo.battleSpeed') === '2' ? 2 : 1;
  } catch {
    return 1;
  }
}

function HpBar({ kind, value, max }: { kind: 'foe' | 'ally'; value: number; max: number }) {
  const width = `${(value / max) * 100}%`;
  return (
    <div className={`hpbar ${kind}`}>
      <i className="lag" style={{ width }} />
      <i className="cur" style={{ width }} />
    </div>
  );
}

export function BattleView({ result, onClose }: { result: Extract<FightResult, { ok: true }>; onClose: () => void }) {
  const { battle, stage } = result;
  const events = battle.events;
  const chapterId = stage.chapter.id;
  const [shown, setShown] = useState(0);
  const [speed, setSpeed] = useState<1 | 2>(loadSpeed);
  const done = shown >= events.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const foeRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (done) return;
    const ev = events[shown];
    const t = setTimeout(() => {
      setShown((n) => n + 1);
      if (ev.t === 'hit') buzz(ev.crit ? 25 : ev.by < 0 ? 18 : 8);
    }, PACE[ev.t] / speed);
    return () => clearTimeout(t);
  }, [shown, speed, done, events]);

  useEffect(() => {
    const ev = events[shown - 1];
    if (!ev || ev.t === 'round' || ev.t === 'down' || reducedMotion()) return;
    if (ev.t === 'hit' && ev.target < 0) foeRef.current?.animate(FOE_HIT, 320);
    if (ev.by < 0) {
      foeRef.current?.animate(FOE_LUNGE, 400);
      if (ev.t === 'hit') cardRefs.current[ev.target]?.animate(CARD_HURT, 350);
    }
    if (ev.t === 'hit' && ev.crit) stageRef.current?.animate(SHAKE, 280);
  }, [shown, events]);

  const toggleSpeed = () => {
    const next = speed === 1 ? 2 : 1;
    setSpeed(next);
    try {
      localStorage.setItem('wangdo.battleSpeed', String(next));
    } catch {
      /* 저장이 막혀 있어도 이번 전투에는 적용된다 */
    }
  };

  // 지금까지 재생한 기록으로 체력·라운드·쓰러진 식객을 다시 계산한다.
  const state = useMemo(() => {
    let foeHp = battle.foe.maxHp;
    const hp = battle.allies.map((a) => a.maxHp);
    const down = new Set<number>();
    let round = 0;
    let last: BattleEvent | null = null;
    let lastAlly: number | null = null;
    for (const ev of events.slice(0, shown)) {
      if (ev.t === 'round') round = ev.n;
      if (ev.t === 'hit') {
        if (ev.target < 0) foeHp = ev.hp;
        else hp[ev.target] = ev.hp;
      }
      if (ev.t === 'down') down.add(ev.target);
      if ((ev.t === 'hit' || ev.t === 'miss') && ev.by >= 0) lastAlly = ev.by;
      last = ev;
    }
    return { foeHp, hp, down, round, last, lastAlly };
  }, [shown, events, battle]);

  const last = state.last;
  const actor = last && (last.t === 'hit' || last.t === 'miss') && last.by >= 0 ? last.by : null;
  const foeDown = state.down.has(-1);
  const leftRounds = Math.max(0, BATTLE.maxRounds - Math.max(0, state.round - 1));
  const recruit = result.recruit ? YOKAI_BY_ID[result.recruit] : null;
  const actorStat = actor !== null ? battle.allies[actor].stat : null;
  const groupFoe = <Art className="group" src={ART.foe(chapterId)} alt={stage.foe} fallback={<div className="portrait-fallback">{stage.foe}</div>} />;

  return (
    <div className="battle" role="dialog" aria-label={`${stage.foe} 토벌`}>
      <div ref={stageRef} className="battle-stage">
        <Art
          className="battle-bg"
          src={ART.battle(chapterId)}
          fallback={<Art className="battle-bg banner" src={ART.chapter(chapterId)} fallback={<div className="battle-bg" />} />}
        />
        <div className="battle-shade" />

        <div ref={foeRef} className={`battle-foe ${foeDown ? 'down' : ''}`}>
          {stage.isBoss ? <Art className="solo" src={ART.boss(chapterId)} alt={stage.foe} fallback={groupFoe} /> : groupFoe}
        </div>

        {last?.t === 'hit' && last.target < 0 && actorStat && (
          <div key={`fx-${shown}`} className={`battle-fx ${FX[actorStat]} ${last.crit ? 'crit' : ''}`} style={{ '--c': SPEC_COLOR[actorStat] } as CSSProperties} />
        )}
        {last?.t === 'hit' && (last.crit || last.target >= 0) && <div key={`flash-${shown}`} className={`battle-flash ${last.target >= 0 ? 'hurt' : ''}`} />}
        {last?.t === 'hit' && last.target < 0 && (
          <div key={`dmg-${shown}`} className={`battle-dmg ${last.crit ? 'crit' : ''}`}>
            {last.crit && <small>치명타!</small>}
            {fmt(last.dmg)}
          </div>
        )}
        {last?.t === 'miss' && last.target < 0 && (
          <div key={`miss-${shown}`} className="battle-dmg miss">
            빗나감
          </div>
        )}
      </div>

      <div className="battle-top">
        <div className="battle-round">
          <small>남은 라운드</small>
          <b>{leftRounds}</b>
        </div>
        <div className="battle-foebar">
          <div className="battle-foename">
            {stage.isBoss && <em>대장</em>}
            {stage.foe}
          </div>
          <HpBar kind="foe" value={state.foeHp} max={battle.foe.maxHp} />
          <div className="hpnum">
            {fmt(state.foeHp)} / {fmt(battle.foe.maxHp)}
          </div>
        </div>
      </div>

      {last?.t === 'round' && (
        <div key={`round-${shown}`} className="battle-banner">
          {last.n}라운드
        </div>
      )}
      {done && <div className={`battle-stamp ${result.won ? 'win' : 'lose'}`}>{result.won ? '해결!' : '후퇴'}</div>}

      <div className="battle-bottom">
        {/* 셋 다 미리 깔아 두고 마지막에 나선 식객만 보인다 */}
        {!done &&
          battle.allies.map((a, i) => (
            <div
              key={a.id}
              className={`battle-actor ${state.lastAlly === i && !state.down.has(i) ? 'on' : ''}`}
              style={{ '--c': SPEC_COLOR[a.stat] } as CSSProperties}
            >
              <div className="battle-actor-pic">
                <Art src={ART.card(a.id)} alt={YOKAI_BY_ID[a.id]?.name} fallback={<div />} />
              </div>
              <div className="battle-actor-name">
                <span>{STAT_LABEL[a.stat]}</span>
                {YOKAI_BY_ID[a.id]?.name}
              </div>
            </div>
          ))}

        {done ? (
          <div className="battle-result">
            <div className="title">{result.won ? `${stage.foe} 해결!` : '이번엔 물러났어요'}</div>
            {result.won ? (
              <div className="reward-list">
                <span>
                  <ResIcon kind="fame" />+{fmt(result.fame)}
                </span>
                <span>
                  <ResIcon kind="coin" />+{fmt(result.coin)}
                </span>
                {result.gift && <span>선물 〈{GIFT_BY_ID[result.gift].name}〉</span>}
              </div>
            ) : (
              <div className="sub">
                {battle.rounds >= BATTLE.maxRounds && !state.hp.every((h) => h <= 0) ? '시간 안에 쓰러뜨리지 못했어요.' : '식객들이 모두 쓰러졌어요.'} 편성을
                바꾸거나 식객을 더 키워서 다시 도전해요.
              </div>
            )}
            {recruit && (
              <div className="sub">
                <b>{recruit.name}</b>이(가) 식객으로 합류했어요!
              </div>
            )}
            <button className="btn hong wide" onClick={onClose}>
              확인
            </button>
          </div>
        ) : (
          <div className="battle-ctrl">
            <button className={speed === 2 ? 'on' : ''} onClick={toggleSpeed} aria-label="2배속">
              x2
            </button>
            <button onClick={() => setShown(events.length)} aria-label="건너뛰기">
              ▶▶
            </button>
          </div>
        )}
        <div className="battle-party">
          {battle.allies.map((a, i) => {
            const def = YOKAI_BY_ID[a.id];
            const hit = last?.t === 'hit' && last.by < 0 && last.target === i;
            const missed = last?.t === 'miss' && last.by < 0 && last.target === i;
            return (
              <div
                key={a.id}
                className={`bcard ${actor === i ? 'act' : ''} ${state.down.has(i) ? 'down' : ''}`}
                style={{ '--c': SPEC_COLOR[a.stat] } as CSSProperties}
              >
                <div ref={(el) => (cardRefs.current[i] = el)} className="bcard-pic">
                  <Art src={ART.card(a.id)} alt={def?.name} fallback={<div className="portrait-fallback">{def?.name}</div>} />
                  <span className="bcard-stat">{STAT_LABEL[a.stat]}</span>
                  <span className="bcard-name">{def?.name}</span>
                  {state.down.has(i) && <span className="bcard-down">쓰러짐</span>}
                  {hit && last?.t === 'hit' && <span className="bcard-dmg">-{fmt(last.dmg)}</span>}
                  {missed && <span className="bcard-dmg miss">빗나감</span>}
                </div>
                <HpBar kind="ally" value={state.hp[i]} max={a.maxHp} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
