// 토벌 전투 화면. 엔진이 미리 계산한 전투 기록(battle.events)을 한 칸씩 재생한다. 모두 자동이고, 2배속과 건너뛰기만 있다.
// 공격하는 식객은 카드가 빛나고, 고유 기술은 얼굴 띠로 외친다. 걸린 효과(기절·약화·방어·격려)는 상대 체력 줄 아래와 카드 위에 표시한다.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { FightResult } from '../core/engine';
import { BATTLE, type BattleEvent, type Status } from '../core/battle';
import type { StatKey } from '../core/types';
import { fmt } from '../core/format';
import { ART, foeArtPath } from '../data/art';
import { GIFT_BY_ID } from '../data/village';
import { STAT_LABEL, YOKAI_BY_ID } from '../data/yokai';
import { ResIcon } from './icons';
import { Art } from './Portrait';
import { buzz } from './toast';
import { SPEC_COLOR } from './YokaiView';

const PACE: Record<BattleEvent['t'], number> = { round: 420, skill: 760, hit: 560, miss: 480, heal: 560, status: 460, skip: 640, down: 700 };

const STATUS_LABEL: Record<Status, string> = { stun: '기절', weak: '약화', guard: '방어', rally: '격려' };

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
const CARD_HEAL: Keyframe[] = [{ filter: 'brightness(1.5) sepia(.5) hue-rotate(70deg) saturate(2.5)' }, { filter: 'none' }];
const FOE_DIZZY: Keyframe[] = [
  { transform: 'none' },
  { transform: 'rotate(-3deg)', offset: 0.25 },
  { transform: 'rotate(3deg)', offset: 0.5 },
  { transform: 'rotate(-2deg)', offset: 0.75 },
  { transform: 'none' },
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
    if (!ev || reducedMotion()) return;
    if (ev.t === 'hit' && ev.target < 0) foeRef.current?.animate(FOE_HIT, 320);
    if ((ev.t === 'hit' || ev.t === 'miss') && ev.by < 0) {
      foeRef.current?.animate(FOE_LUNGE, 400);
      if (ev.t === 'hit') cardRefs.current[ev.target]?.animate(CARD_HURT, 350);
    }
    if (ev.t === 'hit' && (ev.crit || ev.skill)) stageRef.current?.animate(SHAKE, 280);
    if (ev.t === 'heal') cardRefs.current[ev.target]?.animate(CARD_HEAL, 500);
    if (ev.t === 'skip') foeRef.current?.animate(FOE_DIZZY, 600);
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
    const foeStatus = new Set<Status>();
    const partyStatus = new Set<Status>();
    for (const ev of events.slice(0, shown)) {
      if (ev.t === 'round') round = ev.n;
      if (ev.t === 'hit') {
        if (ev.target < 0) foeHp = ev.hp;
        else hp[ev.target] = ev.hp;
      }
      if (ev.t === 'heal') hp[ev.target] = ev.hp;
      if (ev.t === 'status') {
        const set = ev.side === 'foe' ? foeStatus : partyStatus;
        if (ev.on) set.add(ev.status);
        else set.delete(ev.status);
      }
      if (ev.t === 'down') down.add(ev.target);
      last = ev;
    }
    return { foeHp, hp, down, round, last, foeStatus, partyStatus };
  }, [shown, events, battle]);

  const last = state.last;
  const actor = last && (last.t === 'hit' || last.t === 'miss' || last.t === 'skill') && last.by >= 0 ? last.by : null;
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
          <Art className="solo" src={foeArtPath(stage)} alt={stage.foe} fallback={groupFoe} />
        </div>

        {last?.t === 'hit' && last.target < 0 && actorStat && (
          <div
            key={`fx-${shown}`}
            className={`battle-fx ${FX[actorStat]} ${last.crit || last.skill ? 'crit' : ''}`}
            style={{ '--c': SPEC_COLOR[actorStat] } as CSSProperties}
          />
        )}
        {last?.t === 'hit' && (last.crit || last.target >= 0) && <div key={`flash-${shown}`} className={`battle-flash ${last.target >= 0 ? 'hurt' : ''}`} />}
        {last?.t === 'hit' && last.target < 0 && (
          <div key={`dmg-${shown}`} className={`battle-dmg ${last.crit ? 'crit' : ''} ${last.skill ? 'skill' : ''}`}>
            {last.crit && <small>치명타!</small>}
            {fmt(last.dmg)}
          </div>
        )}
        {last?.t === 'miss' && last.target < 0 && (
          <div key={`miss-${shown}`} className="battle-dmg miss">
            빗나감
          </div>
        )}
        {last?.t === 'status' && last.on && (
          <div key={`st-${shown}`} className={`battle-pop ${last.side} ${last.status}`}>
            {STATUS_LABEL[last.status]}!
          </div>
        )}
        {last?.t === 'skip' && (
          <div key={`skip-${shown}`} className="battle-pop foe stun">
            기절해서 쉰다
          </div>
        )}
      </div>

      <div className="battle-top">
        <div className="battle-round">
          <small>남은 라운드</small>
          <b key={state.round}>{leftRounds}</b>
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
          {state.foeStatus.size > 0 && (
            <div className="bchips">
              {[...state.foeStatus].map((st) => (
                <span key={st} className={`bchip ${st}`}>
                  {STATUS_LABEL[st]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {last?.t === 'skill' && (
        <div key={`skill-${shown}`} className="battle-cutin" style={{ '--c': SPEC_COLOR[battle.allies[last.by].stat] } as CSSProperties}>
          <Art className="battle-cutin-face" src={ART.card(battle.allies[last.by].id)} alt="" fallback={<div />} />
          <div className="battle-cutin-text">
            <small>{YOKAI_BY_ID[battle.allies[last.by].id]?.name}</small>
            <b>{last.name}</b>
          </div>
        </div>
      )}
      {done && <div className={`battle-stamp ${result.won ? 'win' : 'lose'}`}>{result.won ? '해결!' : '후퇴'}</div>}

      <div className="battle-bottom">
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
            <button className={speed === 2 ? 'on' : ''} onClick={toggleSpeed}>
              2배속
            </button>
            <button onClick={() => setShown(events.length)}>건너뛰기</button>
          </div>
        )}
        <div className="battle-party">
          {battle.allies.map((a, i) => {
            const def = YOKAI_BY_ID[a.id];
            const hit = last?.t === 'hit' && last.by < 0 && last.target === i;
            const missed = last?.t === 'miss' && last.by < 0 && last.target === i;
            const healed = last?.t === 'heal' && last.target === i;
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
                  {healed && last?.t === 'heal' && <span className="bcard-dmg heal">+{fmt(last.amount)}</span>}
                  {!state.down.has(i) && state.partyStatus.size > 0 && (
                    <span className="bcard-chips">
                      {[...state.partyStatus].map((st) => (
                        <span key={st} className={`bchip ${st}`}>
                          {STATUS_LABEL[st]}
                        </span>
                      ))}
                    </span>
                  )}
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
