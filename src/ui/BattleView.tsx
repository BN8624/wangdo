// 턴제 전투 화면. 위에 적 웨이브, 아래에 내 편 다섯. combat.ts의 Combat을 한 차례씩 진행하며 사건을 재생한다.
// 자동이면 기술이 준비되는 대로 쓰고, 수동이면 빛나는 카드를 눌러야 그 식객이 다음 차례에 기술을 쓴다. 배속·건너뛰기가 있다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Combat, type CombatEvent, type CombatResult, type CombatSetup } from '../core/combat';
import { fmt } from '../core/format';
import { ART } from '../data/art';
import { ALLY_LINES } from '../data/battle-lines';
import { ITEM_BY_ID } from '../data/items';
import { ELEMENT_COLOR, ELEMENT_LABEL } from '../data/roster';
import { YOKAI_BY_ID } from '../data/yokai';
import type { StageReward } from '../core/campaign';
import { Art } from './Portrait';
import { ResIcon } from './icons';
import { play } from './sound';
import { buzz } from './toast';

export interface BattleOutcome {
  won: boolean;
  stars: number;
  first?: boolean;
  reward?: Partial<StageReward>;
  ranks?: number[];
}

/** 1배속 기준 한 차례의 길이(ms) */
const PACE: Partial<Record<CombatEvent['t'], number>> = { wave: 1100, round: 260, act: 520, skill: 1150, hit: 520, heal: 620, shield: 620, buff: 520, stunned: 620, down: 520, end: 400 };

const SPEED_KEY = 'wangdo.speed';
const AUTO_KEY = 'wangdo.auto';
const load = (k: string, d: string) => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};
const save = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // 저장 못 해도 괜찮다
  }
};

interface Pop {
  key: number;
  side: 0 | 1;
  slot: number;
  text: string;
  kind: 'dmg' | 'crit' | 'heal' | 'adv';
}

export function BattleView({
  setup,
  seed,
  title,
  bg,
  onFinish,
  onClose,
  onNext,
  onRetry,
  nextLabel = '다음 스테이지 ›',
}: {
  setup: CombatSetup;
  seed: number;
  title: string;
  bg: string;
  /** 전투가 끝나면 결과를 반영하고 보여 줄 보상을 돌려준다 */
  onFinish: (r: CombatResult) => BattleOutcome;
  onClose: () => void;
  /** 이기면 다음 스테이지로 */
  onNext?: () => void;
  /** 지면 편성으로 돌아가기 */
  onRetry?: () => void;
  nextLabel?: string;
}) {
  const [auto, setAuto] = useState(() => load(AUTO_KEY, '1') === '1');
  const [speed, setSpeed] = useState(() => Number(load(SPEED_KEY, '2')) || 2);
  const combat = useMemo(() => new Combat(setup, seed, auto), [setup, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [, setTick] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [cutin, setCutin] = useState<{ id: string; name: string } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<BattleOutcome | null>(null);
  const damage = useRef<Record<number, number>>({});
  const popKey = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    combat.auto = auto;
    save(AUTO_KEY, auto ? '1' : '0');
  }, [auto, combat]);
  useEffect(() => save(SPEED_KEY, String(speed)), [speed]);

  const finish = () => {
    if (finished.current || !combat.result) return;
    finished.current = true;
    const o = onFinish(combat.result);
    setOutcome(o);
    play(o.won ? 'win' : 'lose');
    buzz(o.won ? 40 : 20);
  };

  const apply = (events: CombatEvent[]) => {
    const add: Pop[] = [];
    for (const e of events) {
      if (e.t === 'act') setActing(`${e.side}:${e.slot}`);
      if (e.t === 'wave') setBanner(`웨이브 ${e.n} / ${e.of}`);
      if (e.t === 'skill') {
        if (e.side === 0) {
          const u = combat.allies.find((a) => a.slot === e.slot);
          if (u) setCutin({ id: u.id, name: e.name });
          play('skill');
        } else setBanner(`${combat.foes[e.slot]?.name ?? '적'} · ${e.name}`);
      }
      if (e.t === 'hit') {
        if (e.side === 0) damage.current[e.slot] = (damage.current[e.slot] ?? 0) + e.dmg;
        add.push({ key: ++popKey.current, side: e.tside, slot: e.tslot, text: fmt(e.dmg), kind: e.crit ? 'crit' : e.adv === 1 ? 'adv' : 'dmg' });
        play(e.crit ? 'crit' : 'hit');
      }
      if (e.t === 'heal') add.push({ key: ++popKey.current, side: e.side, slot: e.tslot, text: `+${fmt(e.amount)}`, kind: 'heal' });
      if (e.t === 'shield') play('heal');
      if (e.t === 'stunned') add.push({ key: ++popKey.current, side: e.side, slot: e.slot, text: '기절', kind: 'adv' });
      if (e.t === 'end') finish();
    }
    if (add.length) {
      setPops((p) => [...p.slice(-12), ...add]);
      const keys = new Set(add.map((x) => x.key));
      setTimeout(() => setPops((p) => p.filter((x) => !keys.has(x.key))), 900);
    }
    setTick((n) => n + 1);
  };

  // 한 차례씩 진행
  useEffect(() => {
    if (combat.done) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const events = combat.step();
      apply(events);
      const wait = Math.max(120, ...events.map((e) => PACE[e.t] ?? 300)) / speed;
      if (!combat.done) t = setTimeout(tick, wait);
    };
    t = setTimeout(tick, 500 / speed);
    return () => clearTimeout(t);
  }, [combat, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cutin) return;
    const t = setTimeout(() => setCutin(null), 1000 / speed);
    return () => clearTimeout(t);
  }, [cutin, speed]);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 1100 / speed);
    return () => clearTimeout(t);
  }, [banner, speed]);

  const skip = () => {
    const events: CombatEvent[] = [];
    for (let i = 0; i < 5000 && !combat.done; i++) events.push(...combat.step());
    for (const e of events) if (e.t === 'hit' && e.side === 0) damage.current[e.slot] = (damage.current[e.slot] ?? 0) + e.dmg;
    setCutin(null);
    setBanner(null);
    setTick((n) => n + 1);
    finish();
  };

  const mvp = useMemo(() => {
    if (!outcome) return null;
    const best = Object.entries(damage.current).sort((a, b) => b[1] - a[1])[0];
    const u = best ? combat.allies.find((a) => a.slot === Number(best[0])) : combat.allies[0];
    return u ?? null;
  }, [outcome, combat]);

  const popsFor = (side: 0 | 1, slot: number) => pops.filter((p) => p.side === side && p.slot === slot);

  return (
    <div className="bt" role="dialog" aria-label={`${title} 전투`}>
      <Art className="bt-bg" src={ART.battle(bg)} fallback={null} />
      <div className="bt-top">
        <div className="bt-title">
          <b>{title}</b>
          <span>
            웨이브 {Math.max(1, combat.wave + 1)}/{setup.waves.length} · {combat.round}라운드
          </span>
        </div>
        <div className="bt-ctrl">
          <button className={auto ? 'on' : ''} onClick={() => setAuto((a) => !a)} aria-pressed={auto}>
            자동
          </button>
          <button onClick={() => setSpeed((v) => (v >= 3 ? 1 : v + 1))}>×{speed}</button>
          {!outcome && <button onClick={skip}>건너뛰기</button>}
        </div>
      </div>

      <div className="bt-foes">
        {combat.foes.map((u) => (
          <div key={u.id} className={`bt-foe ${u.boss ? 'boss' : ''} ${u.hp <= 0 ? 'down' : ''} ${acting === `1:${u.slot}` ? 'acting' : ''}`}>
            <div className="bt-foe-pic">
              <Art src={u.art} alt={u.name} fallback={<div className="portrait-fallback">{u.name}</div>} />
              <i className="bt-elem" style={{ background: ELEMENT_COLOR[u.element] }} title={ELEMENT_LABEL[u.element]} />
              {u.stunned && <span className="bt-tag">기절</span>}
              {popsFor(1, u.slot).map((p) => (
                <span key={p.key} className={`bt-pop ${p.kind}`}>
                  {p.text}
                </span>
              ))}
            </div>
            <div className="bt-hp">
              <i style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
            </div>
            <span className="bt-name">{u.name}</span>
          </div>
        ))}
      </div>

      <div className="bt-mid">
        {banner && <div className="bt-banner">{banner}</div>}
        {cutin && (
          <div className="bt-cutin" key={cutin.name + cutin.id}>
            <Art className="bt-cutin-art" src={ART.full(cutin.id)} fallback={null} />
            <div className="bt-cutin-text">
              <small>{YOKAI_BY_ID[cutin.id]?.name}</small>
              <b>{cutin.name}</b>
              <span>{ALLY_LINES[cutin.id]?.skill}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bt-allies">
        {setup.allies.map((init, i) => {
          if (!init) return <div key={i} className="bt-ally empty" />;
          const u = combat.allies.find((a) => a.slot === i)!;
          const ready = !!u.skill && u.cd === 0 && u.hp > 0;
          const queued = combat.isQueued(i);
          return (
            <button
              key={i}
              className={`bt-ally ${u.hp <= 0 ? 'down' : ''} ${acting === `0:${i}` ? 'acting' : ''} ${ready ? 'ready' : ''} ${queued ? 'queued' : ''}`}
              disabled={auto || !ready || !!outcome}
              onClick={() => {
                combat.queueSkill(i);
                buzz(15);
                setTick((n) => n + 1);
              }}
            >
              <Art className="bt-ally-pic" src={init.art} alt={init.name} fallback={<div className="portrait-fallback">{init.name}</div>} />
              <i className="bt-elem" style={{ background: ELEMENT_COLOR[u.element] }} />
              {u.shield > 0 && <span className="bt-shield">{fmt(u.shield)}</span>}
              {u.atkUp > 0 && <span className="bt-tag up">공↑</span>}
              {popsFor(0, i).map((p) => (
                <span key={p.key} className={`bt-pop ${p.kind}`}>
                  {p.text}
                </span>
              ))}
              <div className="bt-hp mine">
                <i style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
              </div>
              <div className="bt-cd">{u.skill ? (ready ? (auto ? '기술 준비' : queued ? '대기 중' : '눌러서 기술') : `기술 ${u.cd}`) : ''}</div>
            </button>
          );
        })}
      </div>

      {outcome && (
        <div className="bt-result">
          {mvp && outcome.won && <Art className="bt-mvp" src={ART.full(mvp.id)} fallback={null} />}
          <div className="bt-result-card">
            <div className={`bt-seal ${outcome.won ? 'win' : 'lose'}`}>{outcome.won ? '승리' : '패배'}</div>
            {outcome.won && (
              <div className="bt-stars" aria-label={`별 ${outcome.stars}개`}>
                {[1, 2, 3].map((n) => (
                  <span key={n} className={n <= outcome.stars ? 'on' : ''}>
                    ★
                  </span>
                ))}
              </div>
            )}
            {outcome.won ? <RewardList outcome={outcome} /> : <p className="bt-lose">같은 편성·같은 식객 상태면 결과도 같아요. 레벨을 올리거나 별·장비·편성을 바꿔 다시 도전해요.</p>}
            {mvp && outcome.won && (
              <p className="bt-mvp-line">
                MVP <b>{mvp.name}</b> · {ALLY_LINES[mvp.id]?.attack[0]}
              </p>
            )}
            <div className="bt-actions">
              <button className="btn" onClick={onClose}>
                확인
              </button>
              {outcome.won && onNext && (
                <button className="btn hong" onClick={onNext}>
                  {nextLabel}
                </button>
              )}
              {!outcome.won && onRetry && (
                <button className="btn hong" onClick={onRetry}>
                  편성 바꾸기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RewardList({ outcome }: { outcome: BattleOutcome }) {
  const r = outcome.reward ?? {};
  const items = [
    r.jade ? { k: 'jade' as const, n: r.jade } : null,
    r.coin ? { k: 'coin' as const, n: r.coin } : null,
    r.exp ? { k: 'exp' as const, n: r.exp } : null,
    r.fame ? { k: 'fame' as const, n: r.fame } : null,
  ].filter(Boolean) as { k: 'jade' | 'coin' | 'exp' | 'fame'; n: number }[];
  return (
    <div className="bt-rewards">
      {outcome.first && <small>첫 클리어 보상</small>}
      <div>
        {items.map((x) => (
          <span key={x.k}>
            <ResIcon kind={x.k} size={18} />+{fmt(x.n)}
          </span>
        ))}
        {!!r.memory && <span>기억 조각 +{r.memory}</span>}
        {r.items?.map((id) => <span key={id}>〈{ITEM_BY_ID[id]?.name}〉</span>)}
      </div>
      {!!r.recruits?.length && <p className="bt-recruit">합류: {r.recruits.map((id) => YOKAI_BY_ID[id]?.name).join(', ')}</p>}
      {!!Object.keys(r.shards ?? {}).length && (
        <p className="bt-recruit">
          {Object.entries(r.shards ?? {})
            .map(([id, n]) => `${YOKAI_BY_ID[id]?.name} 조각 +${n}`)
            .join(', ')}
        </p>
      )}
      {!items.length && !outcome.first && <small>이미 깬 스테이지예요. 별을 더 따면 옥을 받아요.</small>}
      {!!outcome.ranks?.length && <p className="bt-recruit">관직이 올랐어요!</p>}
    </div>
  );
}
