// 아래 판과 알림들: 대화, 선택, 선물, 받아내기, 장터, 합류, 패배, 빚 글씨
import { useEffect, useRef, useState } from 'react';
import { play } from '../ui/sound';
import { CHARS, FACES, type CharName, type FaceName } from './atlas';
import { ITEMS, MEMBER_NAME, SHOP } from './data';
import { drawChar, drawFace } from './draw';
import { memberStats } from './party';
import type { Effect, Game } from './runner';
import type { ItemDef, Line, Member, MemberId } from './types';

/** 받침에 맞는 조사: josa('백설', '이', '가') → '백설이' */
export function josa(word: string, withBatchim: string, without: string) {
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (has ? withBatchim : without);
}

export function speakerName(who: string) {
  if (who === 'narration') return '';
  if (who.startsWith('npc:')) return who.slice(4);
  return MEMBER_NAME[who as MemberId] ?? who;
}

function faceOf(l: Line): FaceName | null {
  if (l.face) return l.face;
  return l.who in FACES ? (l.who as FaceName) : null;
}

/** 대화창 얼굴(38×38 도트를 두 배로) */
export function Face({ face }: { face: FaceName }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    drawFace(ctx, face, 0, 0, 2);
  }, [face]);
  return <canvas ref={ref} className="face pix" width={76} height={76} />;
}

/** 서 있는 캐릭터 한 칸 */
export function Sprite({ c, scale = 2, className }: { c: CharName; scale?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !(c in CHARS)) return;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawChar(ctx, c, 0, 0, 0, 4 * scale, scale);
  }, [c, scale]);
  return <canvas ref={ref} className={`pix ${className ?? ''}`} width={16 * scale} height={20 * scale} />;
}

/** 대사를 한 줄씩. 누르면 다음 줄, 글자가 아직 나오는 중이면 한 번에 다 보인다 */
export function Dialogue({ lines, speed, auto, onDone }: { lines: Line[]; speed: number; auto: boolean; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(0);
  const line = lines[Math.min(i, lines.length - 1)];
  const full = line.text.length;
  useEffect(() => {
    setShown(0);
  }, [i, lines]);
  useEffect(() => {
    if (shown >= full) return;
    const t = setTimeout(() => setShown((s) => Math.min(full, s + Math.max(1, Math.round(speed)))), 28);
    return () => clearTimeout(t);
  }, [shown, full, speed]);
  const next = () => {
    if (shown < full) {
      setShown(full);
      return;
    }
    if (i + 1 < lines.length) setI(i + 1);
    else onDone();
  };
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (!auto || shown < full) return;
    const t = setTimeout(() => nextRef.current(), (900 + full * 35) / speed);
    return () => clearTimeout(t);
  }, [auto, shown, full, speed]);
  useEffect(() => {
    setI(0);
  }, [lines]);
  const face = faceOf(line);
  const name = speakerName(line.who);
  return (
    <div className="sheet talk" onClick={next} role="button" aria-label="다음 대사">
      {face && <Face face={face} />}
      <div className="talk-body">
        {name && <div className="name">{name}</div>}
        <div className={`text ${line.who === 'narration' ? 'narr' : ''}`}>{line.text.slice(0, shown)}</div>
        <div className="more">{shown < full ? '' : i + 1 < lines.length ? '▼' : '■'}</div>
      </div>
    </div>
  );
}

export function PartyList({ party, compact = false }: { party: Member[]; compact?: boolean }) {
  return (
    <div className="party">
      {party.map((m) => {
        const st = memberStats(m);
        return (
          <div className="member" key={m.id}>
            <Sprite c={m.id as CharName} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>
                {MEMBER_NAME[m.id]} <span className="lv">Lv{m.level}</span>
                {!compact && (
                  <span className="gear">
                    {' '}
                    · 체력 {st.hp} · 공격 {st.atk}
                  </span>
                )}
              </div>
              <div className="gear">
                {m.weapon ? ITEMS[m.weapon].name : '맨손'} · {m.charm ? ITEMS[m.charm].name : '장신구 없음'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Choice({ fx, g, onPick }: { fx: Extract<Effect, { k: 'choice' }>; g: Game; onPick: (i: number) => void }) {
  return (
    <div className="sheet">
      <p className="prompt">{fx.prompt}</p>
      {fx.party && <PartyList party={g.party} />}
      <div className="opts">
        {fx.options.map((o, i) => (
          <button
            key={i}
            className="opt"
            onClick={() => {
              play('chime');
              onPick(i);
            }}
          >
            {o.text}
            {o.desc && <small>{o.desc}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

function gearNow(m: Member, it: ItemDef) {
  const cur = it.slot === 'weapon' ? m.weapon : m.charm;
  return cur ? ITEMS[cur].name : '없음';
}

export function Gift({ fx, g, onPick }: { fx: Extract<Effect, { k: 'gift' }>; g: Game; onPick: (i: number) => void }) {
  useEffect(() => {
    play('coin');
  }, []);
  return (
    <div className="sheet">
      <p className="prompt">{fx.title}</p>
      {fx.coin > 0 && <p style={{ margin: '0 0 8px' }} className="coin">엽전 +{fx.coin}냥</p>}
      {fx.item ? (
        <>
          <p style={{ margin: '0 0 10px' }}>
            <b>{fx.item.name}</b> <span className="gear">— {fx.item.desc}</span>
          </p>
          <div className="opts">
            {g.party.map((m, i) => (
              <button key={m.id} className="opt" onClick={() => onPick(i)}>
                {MEMBER_NAME[m.id]}에게 <small>지금: {gearNow(m, fx.item!)}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="opts">
          <button className="opt primary" onClick={() => onPick(0)}>
            챙긴다
          </button>
        </div>
      )}
    </div>
  );
}

export function Collect({ fx, onDone }: { fx: Extract<Effect, { k: 'collect' }>; onDone: (ids: string[]) => void }) {
  const [on, setOn] = useState<string[]>([]);
  const total = fx.debts.filter((d) => on.includes(d.id)).reduce((s, d) => s + d.amount, 0);
  const over = total > fx.cap;
  return (
    <div className="sheet">
      <p className="prompt">{fx.prompt}</p>
      <div className="bar" style={{ marginBottom: 6 }}>
        <i style={{ width: `${Math.min(100, (total / fx.cap) * 100)}%`, background: over ? 'var(--hp)' : undefined }} />
      </div>
      <p className="gear" style={{ margin: '0 0 10px' }}>
        {total} / {fx.cap}냥 {over ? '— 그릇을 넘었다' : ''}
      </p>
      <div className="opts">
        {fx.debts.map((d) => {
          const sel = on.includes(d.id);
          return (
            <button key={d.id} className={`opt check ${sel ? 'on' : ''}`} onClick={() => setOn(sel ? on.filter((x) => x !== d.id) : [...on, d.id])}>
              <span>{d.text}</span>
              <span>{sel ? '✔' : '·'}</span>
            </button>
          );
        })}
        <button
          className="opt primary"
          disabled={over || !on.length}
          onClick={() => {
            play('stamp');
            onDone(on);
          }}
        >
          갚아라!
        </button>
      </div>
    </div>
  );
}

export function Shop({ g, onBuy, onDone }: { g: Game; onBuy: (item: string, who: MemberId) => void; onDone: () => void }) {
  const [pick, setPick] = useState<string | null>(null);
  return (
    <div className="sheet">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <p className="prompt" style={{ margin: 0 }}>
          장터 노점
        </p>
        <span className="coin">엽전 {g.coin}냥</span>
      </div>
      {pick ? (
        <div className="opts">
          <p style={{ margin: 0 }}>
            <b>{josa(ITEMS[pick].name, '을', '를')}</b> 누구에게?
          </p>
          {g.party.map((m) => (
            <button
              key={m.id}
              className="opt"
              onClick={() => {
                play('coin');
                onBuy(pick, m.id);
                setPick(null);
              }}
            >
              {MEMBER_NAME[m.id]} <small>지금: {gearNow(m, ITEMS[pick])}</small>
            </button>
          ))}
          <button className="opt" onClick={() => setPick(null)}>
            그만두기
          </button>
        </div>
      ) : (
        <div className="opts">
          {SHOP.map((id) => {
            const it = ITEMS[id];
            return (
              <button key={id} className="opt" disabled={g.coin < it.price} onClick={() => setPick(id)}>
                {it.name} · <span className="coin">{it.price}냥</span>
                <small>{it.desc}</small>
              </button>
            );
          })}
          <button className="opt primary" onClick={onDone}>
            다 샀다
          </button>
        </div>
      )}
    </div>
  );
}

const SKILL_TEXT: Record<MemberId, string> = {
  me: '빚 독촉 — 적 모두의 공격을 꺾는다',
  baekseol: '여우불 홀림 — 한 명을 홀려 기절시킨다',
  muyeong: '쇠방망이 내려치기 — 한 명에게 큰 한 방',
};

export function Join({ who, onDone }: { who: MemberId; onDone: () => void }) {
  useEffect(() => {
    play('promote');
  }, []);
  return (
    <div className="center" onClick={onDone}>
      <div className="card">
        <Sprite c={who as CharName} scale={6} className="big-sprite" />
        <h2>{josa(MEMBER_NAME[who], '이', '가')} 동료가 되었다</h2>
        <p>{SKILL_TEXT[who]}</p>
        <button className="opt primary" style={{ width: '100%', marginTop: 10 }}>
          함께 간다
        </button>
      </div>
    </div>
  );
}

export function Defeat({ onTrain, onRetry }: { onTrain: () => void; onRetry: () => void }) {
  useEffect(() => {
    play('lose');
  }, []);
  return (
    <div className="sheet">
      <p className="prompt">쓰러졌다…… 마지막 쉼터에서 다시 시작한다.</p>
      <p className="gear" style={{ margin: '0 0 10px' }}>
        얻은 경험치는 그대로 남아 있다.
      </p>
      <div className="opts">
        <button className="opt primary" onClick={onTrain}>
          근처에서 수련하기 <small style={{ color: 'inherit' }}>자동으로 세 판</small>
        </button>
        <button className="opt" onClick={onRetry}>
          바로 다시 간다
        </button>
      </div>
    </div>
  );
}

/** 방망이를 두드리면 허공에 먹빛 글씨가 떠오른다 */
export function DebtScroll({ lines, speed, onDone }: { lines: string[]; speed: number; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= lines.length) return;
    const t = setTimeout(
      () => {
        play('stamp');
        setN(n + 1);
      },
      (n === 0 ? 400 : 1100) / speed,
    );
    return () => clearTimeout(t);
  }, [n, lines.length, speed]);
  return (
    <div className="ink" onClick={() => (n >= lines.length ? onDone() : setN(lines.length))}>
      <div className="scroll">
        {lines.slice(0, n).map((l, i) => (
          <p key={i}>{l}</p>
        ))}
        {n >= lines.length && <span className="seal">갚아라</span>}
      </div>
    </div>
  );
}
