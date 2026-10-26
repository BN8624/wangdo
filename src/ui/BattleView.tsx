// 전투 화면. 엔진이 미리 계산한 전투 기록(battle.events)을 한 칸씩 재생한다. 모두 자동이고, 2배속과 건너뛰기만 있다.
// 오피스퀸키우기식 대치 구도: 화면을 사선으로 나눠 오른쪽 위에 상대, 왼쪽 아래 앞쪽에 지금 나선 식객을 세우고, 말풍선 한 줄로 주고받는다.
// 빛 이펙트는 쓰지 않는다. 지금 나서지 않은 쪽은 색을 빼서 진한 색이 한 명에게만 남게 한다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Won } from '../core/engine';
import { BATTLE, firstSkillTurn, type BattleEvent, type SkillKind, type Status } from '../core/battle';
import { fmt } from '../core/format';
import { ART, foeArtPath } from '../data/art';
import { ALLY_LINES, foeLines } from '../data/battle-lines';
import { SKILL_LABEL } from '../data/skills';
import { GIFT_BY_ID } from '../data/village';
import { ITEM_BY_ID } from '../data/items';
import { NODE_BY_ID } from '../data/world';
import { YOKAI_BY_ID } from '../data/yokai';
import { ResIcon } from './icons';
import { Art } from './Portrait';
import { buzz } from './toast';
import { play } from './sound';

// 1배속 기준 한 칸의 길이(ms). 말풍선 한 줄을 읽을 수 있을 만큼, 기술은 그보다 길게 머문다.
const PACE: Record<BattleEvent['t'], number> = { round: 600, skill: 2300, hit: 1150, miss: 950, heal: 1300, status: 1300, skip: 1300, down: 1200 };

function paceOf(ev: BattleEvent): number {
  if (ev.t === 'hit' && ev.skill) return 1500;
  // 효과가 풀리는 건 조용히 지나간다
  if (ev.t === 'status' && !ev.on) return 350;
  return PACE[ev.t];
}

/** 기술을 쓴 뒤 화면 가운데 띠에 적는 효과 설명 */
const EFFECT_TEXT: Record<SkillKind, string> = {
  strike: '평소보다 훨씬 큰 피해',
  stun: '상대가 다음 차례를 쉰다',
  guard: '다음 공격 피해가 절반으로',
  heal: '가장 다친 식객의 체력을 채운다',
  weaken: `${BATTLE.weakTurns}차례 동안 상대 공격이 약해진다`,
  rally: `이어지는 공격 ${BATTLE.rallyHits}번이 강해진다`,
};

const STATUS_LABEL: Record<Status, string> = { stun: '기절', weak: '약화', guard: '방어', rally: '격려' };

// 맞을 때 흔들림. key로 다시 그리면 그림이 깜빡여서 Web Animations로 그 자리에서 다시 튼다.
const FOE_HIT: Keyframe[] = [
  { transform: 'none', filter: 'brightness(1.6)' },
  { transform: 'translateX(12px)', offset: 0.3 },
  { transform: 'translateX(-5px)', offset: 0.6 },
  { transform: 'none', filter: 'none' },
];
const ALLY_HURT: Keyframe[] = [
  { transform: 'none', filter: 'sepia(.6) hue-rotate(-30deg) saturate(2.4) brightness(.9)' },
  { transform: 'translateX(-10px)', offset: 0.3 },
  { transform: 'translateX(5px)', offset: 0.6 },
  { transform: 'none', filter: 'none' },
];
const CARD_HEAL: Keyframe[] = [{ filter: 'brightness(1.5) sepia(.5) hue-rotate(70deg) saturate(2.5)' }, { filter: 'none' }];
const FOE_DIZZY: Keyframe[] = [
  { transform: 'none' },
  { transform: 'rotate(-2deg)', offset: 0.25 },
  { transform: 'rotate(2deg)', offset: 0.5 },
  { transform: 'rotate(-1deg)', offset: 0.75 },
  { transform: 'none' },
];
const SHAKE: Keyframe[] = [
  { transform: 'none' },
  { transform: 'translate(-6px, 3px)' },
  { transform: 'translate(5px, -3px)' },
  { transform: 'translate(-2px, 2px)' },
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

function HpBar({ kind, value, max }: { kind: 'foe' | 'mine'; value: number; max: number }) {
  const width = `${(value / max) * 100}%`;
  return (
    <div className={`hpbar ${kind}`}>
      <i className="lag" style={{ width }} />
      <i className="cur" style={{ width }} />
    </div>
  );
}

/** 말풍선 하나: 누가(식객·상대) 무슨 말을 했는지 */
type Said = { side: 'ally' | 'foe'; who: string; text: string };

/** 한지 말풍선. 꼬리 방향만 다르게 그린다 */
function Bubble({ side, who, text }: { side: 'ally' | 'foe' | 'skill'; who: string; text: string }) {
  const shape = {
    ally: '8,6 222,0 214,84 70,90 22,118 40,88 0,92',
    foe: '0,4 206,0 200,70 236,96 186,84 10,92',
    skill: '4,14 92,10 110,-16 120,8 198,4 190,84 0,90',
  }[side];
  const box = { ally: '0 0 228 104', foe: '0 0 214 104', skill: '0 0 200 92' }[side];
  return (
    <div className={`battle-bubble ${side}`}>
      <svg viewBox={box} preserveAspectRatio="none" aria-hidden>
        <polygon points={shape} />
      </svg>
      <p>
        <small>{who}</small>
        {text}
      </p>
    </div>
  );
}

export function BattleView({ result, onClose }: { result: Won; onClose: () => void }) {
  const { battle, stage } = result;
  const events = battle.events;
  const chapterId = stage.chapter.id;
  const [shown, setShown] = useState(0);
  const [speed, setSpeed] = useState<1 | 2>(loadSpeed);
  const done = shown >= events.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const foeRef = useRef<HTMLDivElement>(null);
  const allyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const foeSays = useMemo(() => (stage.line ? [stage.line, ...foeLines(chapterId, false)] : foeLines(chapterId, stage.isBoss)), [chapterId, stage.isBoss, stage.line]);

  useEffect(() => {
    if (done) return;
    const ev = events[shown];
    const t = setTimeout(() => {
      setShown((n) => n + 1);
      if (ev.t === 'hit') buzz(ev.crit ? 25 : ev.by < 0 ? 18 : 8);
    }, paceOf(ev) / speed);
    return () => clearTimeout(t);
  }, [shown, speed, done, events]);

  // 소리: 타격은 북, 기술은 징, 치유는 퉁김
  useEffect(() => {
    const ev = events[shown - 1];
    if (!ev) return;
    if (ev.t === 'hit') play(ev.weak || ev.crit ? 'crit' : 'hit');
    if (ev.t === 'skill') play('skill');
    if (ev.t === 'heal') play('heal');
  }, [shown, events]);

  // 끝나면 낙관을 찍고 결과 가락
  useEffect(() => {
    if (!done) return;
    const t1 = setTimeout(() => play('stamp'), 250);
    const t2 = setTimeout(() => play(result.won ? 'win' : 'lose'), 650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [done, result.won]);

  useEffect(() => {
    const ev = events[shown - 1];
    if (!ev || reducedMotion()) return;
    if (ev.t === 'hit' && ev.target < 0) foeRef.current?.animate(FOE_HIT, 320);
    if (ev.t === 'hit' && ev.by < 0) {
      allyRefs.current[ev.target]?.animate(ALLY_HURT, 380);
      cardRefs.current[ev.target]?.animate(ALLY_HURT, 380);
    }
    if (ev.t === 'hit' && (ev.crit || ev.skill)) stageRef.current?.animate(SHAKE, 260);
    if (ev.t === 'heal') cardRefs.current[ev.target]?.animate(CARD_HEAL, 500);
    if (ev.t === 'skip' || (ev.t === 'status' && ev.on && ev.status === 'stun')) foeRef.current?.animate(FOE_DIZZY, 700);
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

  // 지금까지 재생한 기록으로 체력·라운드·효과·앞에 선 식객·말풍선을 다시 계산한다.
  const state = useMemo(() => {
    let foeHp = battle.foe.maxHp;
    const hp = battle.allies.map((a) => a.maxHp);
    const down = new Set<number>();
    let round = 0;
    let last: BattleEvent | null = null;
    let focus = 0;
    let bubble: Said | null = null;
    const foeStatus = new Set<Status>();
    const partyStatus = new Set<Status>();
    // 기술 게이지: 식객마다 지금까지 나선 차례와 마지막으로 기술을 쓴 차례
    const turns = battle.allies.map(() => 0);
    const lastSkill = battle.allies.map(() => 0);
    let effect: { kind: SkillKind; name: string; weak?: boolean } | null = null;
    events.slice(0, shown).forEach((ev, idx) => {
      if ((ev.t === 'skill' || ev.t === 'miss' || (ev.t === 'hit' && !ev.skill)) && ev.by >= 0) {
        turns[ev.by] += 1;
        if (ev.t === 'skill') lastSkill[ev.by] = turns[ev.by];
      }
      // 기술의 효과 띠는 그 기술의 타격·효과·치유가 이어지는 동안만 남긴다
      if (ev.t === 'skill') effect = { kind: ev.kind, name: ev.name };
      else if (ev.t === 'hit' && ev.skill && ev.weak && effect) effect = { ...effect, weak: true };
      else if (!((ev.t === 'hit' && ev.skill) || ev.t === 'heal' || ev.t === 'status')) effect = null;
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
      // 식객이 나서면 그 식객이, 상대가 반격하면 맞는 식객이 앞에 선다
      if ((ev.t === 'hit' || ev.t === 'miss' || ev.t === 'skill') && ev.by >= 0) {
        focus = ev.by;
        const lines = ALLY_LINES[battle.allies[ev.by].id];
        const who = YOKAI_BY_ID[battle.allies[ev.by].id]?.name ?? '';
        if (ev.t === 'skill') bubble = lines ? { side: 'ally', who, text: lines.skill } : null;
        else if (!(ev.t === 'hit' && ev.skill)) bubble = lines ? { side: 'ally', who, text: lines.attack[(idx * 7 + ev.by) % lines.attack.length] } : null;
      }
      if ((ev.t === 'hit' || ev.t === 'miss') && ev.by < 0) {
        focus = ev.target;
        bubble = { side: 'foe', who: stage.foe, text: foeSays[(idx * 5) % foeSays.length] };
      }
      last = ev;
    });
    const gauge = battle.allies.map((_, i) => {
      const next = lastSkill[i] ? lastSkill[i] + BATTLE.skillEvery : firstSkillTurn(i);
      const from = lastSkill[i];
      return { fill: Math.min(1, (turns[i] - from) / (next - from)), ready: turns[i] + 1 === next };
    });
    return { foeHp, hp, down, round, last: last as BattleEvent | null, focus, bubble: bubble as Said | null, foeStatus, partyStatus, gauge, effect: effect as { kind: SkillKind; name: string; weak?: boolean } | null };
  }, [shown, events, battle, stage.foe, foeSays]);

  const last = state.last;
  const skillOn = last?.t === 'skill';
  const foeActs = !!last && (last.t === 'hit' || last.t === 'miss') && last.by < 0;
  const foeDown = state.down.has(-1);
  const leftRounds = Math.max(0, BATTLE.maxRounds - Math.max(0, state.round - 1));
  const recruit = result.recruit ? YOKAI_BY_ID[result.recruit] : null;
  const focusAlly = battle.allies[state.focus];
  const focusName = YOKAI_BY_ID[focusAlly.id]?.name ?? '';
  const skillAlly = last?.t === 'skill' ? battle.allies[last.by] : null;

  return (
    <div className="battle" role="dialog" aria-label={`${stage.foe}와(과)의 전투`}>
      <svg className="battle-defs" aria-hidden>
        {/* 낙관 번짐: 가장자리를 조금 흔들고 인주가 고르게 묻지 않은 자국을 낸다 */}
        <filter id="battle-ink" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2" xChannelSelector="R" yChannelSelector="G" result="wob" />
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="11" result="blot" />
          <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.42" result="soft" />
          <feComposite in="wob" in2="soft" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed="2" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -6 4.6" result="specks" />
          <feComposite in="inked" in2="specks" operator="in" />
        </filter>
      </svg>
      <div ref={stageRef} className="battle-stage">
        <Art
          className="battle-bg"
          src={ART.battle(stage.bg ?? chapterId)}
          fallback={<Art className="battle-bg" src={ART.chapter(chapterId)} fallback={<div className="battle-bg" />} />}
        />
        <div className="battle-pane foe" />
        <div className="battle-pane ally" />
        <div className="battle-seam" />

        <div ref={foeRef} className={`battle-foe ${foeActs ? 'act' : ''} ${foeDown ? 'down' : ''}`}>
          <Art
            src={foeArtPath(stage)}
            alt={stage.foe}
            fallback={<Art className="group" src={ART.foe(chapterId)} alt={stage.foe} fallback={<div className="portrait-fallback">{stage.foe}</div>} />}
          />
        </div>

        {/* 셋 다 미리 깔아 두고 앞에 선 식객만 보인다 */}
        {battle.allies.map((a, i) => (
          <div
            key={a.id}
            ref={(el) => (allyRefs.current[i] = el)}
            className={`battle-ally ${state.focus === i && !skillOn ? 'on' : ''} ${state.down.has(i) ? 'down' : ''}`}
            style={{ backgroundImage: `url(${ART.full(a.id)})` }}
          />
        ))}

        {last?.t === 'hit' && last.target < 0 && (
          <div key={`dmg-${shown}`} className={`battle-dmg foe ${last.crit || last.skill ? 'big' : ''}`}>
            {fmt(last.dmg)}
            {last.weak ? <small>약점!</small> : last.crit && <small>치명타</small>}
          </div>
        )}
        {last?.t === 'hit' && last.by < 0 && (
          <div key={`dmg-${shown}`} className="battle-dmg ally">
            {fmt(last.dmg)}
          </div>
        )}
        {last?.t === 'miss' && (
          <div key={`miss-${shown}`} className={`battle-dmg miss ${last.target < 0 ? 'foe' : 'ally'}`}>
            빗나감
          </div>
        )}
        {last?.t === 'status' && last.on && (
          <div key={`st-${shown}`} className={`battle-pop ${last.side}`}>
            {STATUS_LABEL[last.status]}
          </div>
        )}
        {last?.t === 'skip' && (
          <div key={`skip-${shown}`} className="battle-pop foe">
            기절해서 쉰다
          </div>
        )}
      </div>

      <div className="battle-top">
        <div className="battle-round">
          남은 {leftRounds}라운드
          <small>
            {Math.max(1, state.round)} / {BATTLE.maxRounds}
          </small>
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
          {state.foeStatus.size > 0 && !done && (
            <div className="bchips">
              {[...state.foeStatus].map((st) => (
                <span key={st} className="bchip">
                  {STATUS_LABEL[st]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!done && !skillOn && !state.effect && state.bubble && <Bubble key={`b-${state.bubble.side}-${state.bubble.text}`} {...state.bubble} />}
      {!done && !skillOn && state.effect && (
        <div key={`fx-${state.effect.name}-${state.round}`} className="battle-effect">
          <b>{SKILL_LABEL[state.effect.kind]}</b>
          <span>
            <small>
              {state.effect.name}
              {state.effect.weak && <em> · 약점을 찔렀다!</em>}
            </small>
            {EFFECT_TEXT[state.effect.kind]}
          </span>
        </div>
      )}

      {skillAlly && last?.t === 'skill' && (
        <div key={`skill-${shown}`} className="battle-skill">
          <div className="battle-skill-dim" />
          <div className="battle-skill-art" style={{ backgroundImage: `url(${ART.full(skillAlly.id)})` }} />
          <div className="battle-skill-band" />
          <div className="battle-skill-name" style={{ fontSize: Math.min(88, Math.floor(500 / last.name.length)) }}>
            {last.name}
          </div>
          <div className="battle-skill-cap">
            {YOKAI_BY_ID[skillAlly.id]?.name}의 기술 · {SKILL_LABEL[last.kind]}
          </div>
          {ALLY_LINES[skillAlly.id] && <Bubble side="skill" who={YOKAI_BY_ID[skillAlly.id]?.name ?? ''} text={ALLY_LINES[skillAlly.id].skill} />}
        </div>
      )}

      {!done && (
        <div className="battle-mine">
          <div className="who">{focusName}</div>
          <HpBar kind="mine" value={state.hp[state.focus]} max={focusAlly.maxHp} />
          <div className="hpnum">
            {fmt(state.hp[state.focus])} / {fmt(focusAlly.maxHp)}
          </div>
        </div>
      )}
      {!done && (
        <div className="battle-ctrl">
          <button className={speed === 2 ? 'on' : ''} onClick={toggleSpeed} aria-label="2배속">
            ×2
          </button>
          <button onClick={() => setShown(events.length)} aria-label="건너뛰기">
            ▶▶
          </button>
        </div>
      )}

      {done && (
        <div className="battle-result">
          {/* 한지 위에 찍는 낙관: 이기면 인주색 '승리', 지면 먹색 '퇴각' */}
          <div className={`battle-seal ${result.won ? 'win' : 'lose'}`} aria-hidden>
            {[...(result.won ? '승리' : '퇴각')].map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </div>
          <div className="title">{result.won ? `${stage.foe} 격파!` : '이번엔 물러났어요'}</div>
          {result.won ? (
            <div className="reward-list">
              <span>
                <ResIcon kind="fame" />+{fmt(result.fame)}
              </span>
              <span>
                <ResIcon kind="coin" />+{fmt(result.coin)}
              </span>
              {!!result.exp && (
                <span>
                  <ResIcon kind="exp" />경험치 +{fmt(result.exp)}
                </span>
              )}
              {result.gift && <span>선물 〈{GIFT_BY_ID[result.gift].name}〉</span>}
              {result.drops?.map((d) => <span key={d}>장비 〈{ITEM_BY_ID[d]?.name}〉</span>)}
            </div>
          ) : (
            <div className="sub">
              {battle.rounds >= BATTLE.maxRounds && !state.hp.every((h) => h <= 0) ? '시간 안에 쓰러뜨리지 못했어요.' : '식객들이 모두 쓰러졌어요.'}{' '}
              같은 식객·장비·편성이면 결과도 같아요. 필드에서 레벨을 올리거나, 장비·편성을 바꿔 다시 도전해요.
            </div>
          )}
          {!!result.ups?.length && (
            <div className="sub levelups">
              {result.ups.map((u) => (
                <span key={u.id}>
                  {YOKAI_BY_ID[u.id]?.name} <b>Lv {u.to}</b>
                </span>
              ))}
            </div>
          )}
          {result.chest && (
            <div className="sub chest">
              보물상자 · {result.chest.item ? `〈${ITEM_BY_ID[result.chest.item]?.name}〉` : ''}
              {result.chest.coin ? ` 엽전 ${fmt(result.chest.coin)}` : ''}
            </div>
          )}
          {result.reward && <div className="sub chest">사연의 보답 · 〈{ITEM_BY_ID[result.reward]?.name}〉</div>}
          {result.cleared && NODE_BY_ID[result.cleared] && <div className="sub cleared">「{NODE_BY_ID[result.cleared].name}」을(를) 끝냈어요!</div>}
          {recruit && (
            <div className="sub">
              <b>{recruit.name}</b>이(가) 식객으로 합류했어요!
            </div>
          )}
          <button className="battle-ok" onClick={onClose}>
            확인
          </button>
        </div>
      )}

      <div className="battle-party">
        {battle.allies.map((a, i) => {
          const def = YOKAI_BY_ID[a.id];
          const healed = last?.t === 'heal' && last.target === i;
          const g = state.gauge[i];
          const ready = g.ready && !done && !state.down.has(i);
          return (
            <div key={a.id} className={`bcard ${state.focus === i && !done ? 'on' : ''} ${state.down.has(i) ? 'down' : ''} ${ready ? 'ready' : ''}`}>
              <div ref={(el) => (cardRefs.current[i] = el)} className="bcard-pic">
                <Art src={ART.card(a.id)} alt={def?.name} fallback={<div className="portrait-fallback">{def?.name}</div>} />
                <span className="bcard-name">{def?.name}</span>
                {state.down.has(i) && <span className="bcard-down">쓰러짐</span>}
                {healed && last?.t === 'heal' && <span className="bcard-heal">+{fmt(last.amount)}</span>}
                {!state.down.has(i) && state.partyStatus.size > 0 && (
                  <span className="bcard-chips">
                    {[...state.partyStatus].map((st) => (
                      <span key={st} className="bchip">
                        {STATUS_LABEL[st]}
                      </span>
                    ))}
                  </span>
                )}
                {ready && <span className="bcard-ready">기술</span>}
                <i className="bcard-sp" style={{ width: `${(done ? 0 : g.fill) * 100}%` }} />
                <i className="bcard-hp" style={{ width: `${(state.hp[i] / a.maxHp) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
