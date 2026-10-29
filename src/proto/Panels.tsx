// 아래 판과 알림들: 대화, 선택, 선물, 받아내기, 장터, 합류, 패배, 빚 글씨
import { useEffect, useRef, useState } from 'react';
import { play } from '../ui/sound';
import { CHARS, FACES, type CharName, type FaceName } from './atlas';
import { ITEMS, MEMBER_NAME, SHOP, priceOf } from './data';
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

/** 대화창 위에 세우는 식객 일러스트(투명 배경 전신) */
export const PORTRAIT: Partial<Record<string, string>> = {
  baekseol: 'proto/portrait/baekseol.webp',
  muyeong: 'proto/portrait/muyeong.webp',
  sodam: 'proto/portrait/sodam.webp',
};

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
export function Dialogue({ lines, speed, auto, portraits, onDone }: { lines: Line[]; speed: number; auto: boolean; portraits: boolean; onDone: () => void }) {
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
  // 일러스트: 말하는 식객을 세우고, 지문이나 다른 사람 차례에는 마지막에 말한 식객을 흐리게 남긴다
  let stand: string | null = null;
  for (let k = Math.min(i, lines.length - 1); k >= 0 && portraits; k--) {
    if (PORTRAIT[lines[k].who]) {
      stand = lines[k].who;
      break;
    }
  }
  const speaking = stand === line.who;
  // 장면 그림: scene을 단 줄부터 그 대사 묶음이 끝날 때까지(또는 null을 만날 때까지) 위쪽에 띄운다. 도트 얼굴을 고르면 끈다
  let scene: string | null = null;
  for (let k = Math.min(i, lines.length - 1); k >= 0 && portraits; k--) {
    if (lines[k].scene !== undefined) {
      scene = lines[k].scene ?? null;
      break;
    }
  }
  // 물건 그림이 나오는 줄에서는 식객 그림 대신 물건을 크게 띄운다
  const item = line.img;
  const face = portraits && PORTRAIT[line.who] ? null : faceOf(line);
  const name = speakerName(line.who);
  return (
    <>
      {(stand || item || scene) && <div className="scrim" />}
      {scene && (
        <div className="scene" key={scene}>
          <img src={`proto/scene/${scene}.webp`} alt="" />
        </div>
      )}
      {item && (
        <div className="item-card" key={item}>
          <img src={`art/item/${item}.webp`} alt="" />
        </div>
      )}
      {stand && !item && !scene && (
        <div className={`stand ${speaking ? '' : 'idle'}`} key={stand}>
          <img src={PORTRAIT[stand]} alt={speakerName(stand)} />
        </div>
      )}
      <div className="sheet talk" onClick={next} role="button" aria-label="다음 대사">
        {face && <Face face={face} />}
        <div className="talk-body">
          {name && <div className="name">{name}</div>}
          <div className={`text ${line.who === 'narration' ? 'narr' : ''}`}>{line.text.slice(0, shown)}</div>
          <div className="more">{shown < full ? '' : i + 1 < lines.length ? '▼' : '■'}</div>
        </div>
      </div>
    </>
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
              <button key={id} className="opt" disabled={g.coin < priceOf(it.price, g.party)} onClick={() => setPick(id)}>
                {it.name} · <span className="coin">{priceOf(it.price, g.party)}냥</span>
                {priceOf(it.price, g.party) < it.price && <span className="gear"> (소담이 깎음)</span>}
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
  sodam: '우렁이 밥상 — 우리 편 모두의 체력을 채운다',
};

/** 컷인 전용 상반신(투명 배경, 가로 3:2). 없으면 대화창 전신을 잘라 쓴다 */
const CUTIN_ART: Partial<Record<MemberId, string>> = { baekseol: 'proto/cutin/baekseol.webp', muyeong: 'proto/cutin/muyeong.webp', sodam: 'proto/cutin/sodam.webp' };

/** 기술 컷인: 비스듬한 띠 위에 일러스트(주인공은 방망이)와 기술 이름 */
export function CutIn({ who, name }: { who: MemberId; name: string }) {
  const art = PORTRAIT[who];
  return (
    <div className={`cutin ${who}`}>
      <div className="cutin-band">
        {CUTIN_ART[who] ? (
          <img className="cutin-art wide" src={CUTIN_ART[who]} alt="" />
        ) : art ? (
          <img className="cutin-art" src={art} alt="" />
        ) : (
          <img className="cutin-item" src="art/item/bangmangi.webp" alt="" />
        )}
        <div className="cutin-name">
          <small>{MEMBER_NAME[who]}</small>
          {name}
        </div>
      </div>
    </div>
  );
}

/** 이야기 속에서 기술을 얻었다 */
export function SkillGet({ who, text, cutins, onDone }: { who: MemberId; text: string; cutins: boolean; onDone: () => void }) {
  useEffect(() => {
    play('promote');
  }, []);
  const [name, desc] = SKILL_TEXT[who].split(' — ');
  return (
    <>
      <div className="scrim" />
      {cutins && <CutIn who={who} name={name} />}
      <div className="sheet" onClick={onDone} role="button" aria-label="계속">
        <p className="gear" style={{ margin: '0 0 4px' }}>
          {text}
        </p>
        <p className="prompt" style={{ margin: '0 0 4px' }}>
          {josa(MEMBER_NAME[who], '이', '가')} 기술을 얻었다 · {name}
        </p>
        <p style={{ margin: '0 0 10px' }}>{desc}. 다음 싸움에서는 첫 차례부터 쓴다.</p>
        <button className="opt primary" style={{ width: '100%' }}>
          계속
        </button>
      </div>
    </>
  );
}

export function Join({ who, portraits, learned, onDone }: { who: MemberId; portraits: boolean; learned: boolean; onDone: () => void }) {
  useEffect(() => {
    play('promote');
  }, []);
  return (
    <div className="center" onClick={onDone}>
      <div className="card">
        {portraits && PORTRAIT[who] ? (
          <div className="join-art">
            <img src={PORTRAIT[who]} alt={MEMBER_NAME[who]} />
          </div>
        ) : (
          <Sprite c={who as CharName} scale={6} className="big-sprite" />
        )}
        <h2>{josa(MEMBER_NAME[who], '이', '가')} 동료가 되었다</h2>
        <p>{learned ? SKILL_TEXT[who] : '기술은 아직 없다. 이야기 속에서 얻는다.'}</p>
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
export function DebtScroll({ lines, speed, broken, onDone }: { lines: string[]; speed: number; broken?: boolean; onDone: () => void }) {
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
        {n >= lines.length && (broken ? <span className="seal broken">쩍!</span> : <span className="seal">갚아라</span>)}
      </div>
    </div>
  );
}
