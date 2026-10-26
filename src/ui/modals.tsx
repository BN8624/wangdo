import { NovelFrame } from './StoryView';
import { useEffect, useState } from 'react';
import { chooseWish, markSceneSeen, talk, wishRewardAmount } from '../core/engine';
import { fmt, fmtDuration } from '../core/format';
import { afkPending, claimAfk, type AfkPending } from '../core/idle';
import { BALANCE as B } from '../data/balance';
import { ART } from '../data/art';
import { bondContent } from '../data/bond-content';
import { ITEM_BY_ID } from '../data/items';
import { rankDef } from '../data/ranks';
import { ELEMENT_COLOR, ELEMENT_LABEL, RARITY_LABEL, ROLE_LABEL, elementOf, roleOf } from '../data/roster';
import { SKILLS, skillText } from '../data/skills';
import { BOND_LEVELS, GIFT_BY_ID } from '../data/village';
import { WISH_BY_ID } from '../data/wishes';
import { YOKAI_BY_ID } from '../data/yokai';
import type { GameState } from '../core/types';
import { Burst, LineIcon, RES_LABEL, ResIcon, VillageScene } from './icons';
import { Art, Portrait } from './Portrait';
import { act } from './store';
import { buzz, pushToast } from './toast';
import { play } from './sound';
import type { ModalRequest } from './App';

function Shell({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="modal" role="dialog">
        {children}
      </div>
    </>
  );
}

function Frame({ id }: { id: string }) {
  return (
    <div className="who-pic portrait-frame">
      <Portrait def={YOKAI_BY_ID[id]} />
    </div>
  );
}

export function WishModal({ view, onClose }: { view: GameState; onClose: () => void }) {
  const pending = view.wish.pending;
  if (!pending) return null;
  const wish = WISH_BY_ID[pending.id];
  const pick = (i: 0 | 1) => {
    const r = act((s) => chooseWish(s, i));
    if (r.ok) {
      buzz(20);
      if (r.kind === 'gift') pushToast({ text: `선물 〈${GIFT_BY_ID[r.gift!].name}〉을(를) 얻었어요` });
      else pushToast({ text: `+${fmt(r.amount)} ${RES_LABEL[r.kind]}`, res: r.kind });
    }
    onClose();
  };
  return (
    <Shell>
      <div className="head">
        <Burst />
        <span className="ttuk-word">상소</span>
        <Frame id={view.favorite} />
      </div>
      <div className="title">{wish.who}</div>
      <div className="bubble">{wish.text}</div>
      <div className="choices">
        {wish.choices.map((c, i) => (
          <button key={i} className={`choice ${i === 0 ? 'a' : 'b'}`} onClick={() => pick(i as 0 | 1)}>
            <span>{c.label}</span>
            <span className="rw">
              {c.reward.kind === 'gift' ? (
                '선물 하나'
              ) : (
                <>
                  <ResIcon kind={c.reward.kind === 'grain' ? 'exp' : c.reward.kind} size={16} />+{fmt(wishRewardAmount(view, c.reward))}
                </>
              )}
            </span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

/** 방치 보상 상자: 쌓인 보상을 보여 주고 받는다 */
export function AfkModal({ view, now, onClose }: { view: GameState; now: number; onClose: () => void }) {
  const [claimed, setClaimed] = useState<(AfkPending & { items: string[] }) | null>(null);
  const p = claimed ?? afkPending(view, now);
  const full = p.minutes >= B.afkCapMinutes;
  const take = () => {
    const r = act((s, t) => claimAfk(s, t));
    play('coin');
    buzz(25);
    setClaimed(r);
  };
  const rows = [
    ['coin', p.coin],
    ['exp', p.exp],
    ['jade', p.jade],
    ['fame', p.fame],
  ] as const;
  return (
    <Shell onClose={claimed ? onClose : undefined}>
      <div className="head jade">
        <Burst />
        <span className="ttuk-word">{claimed ? '받았어요!' : '방치 보상'}</span>
        <div className="who-pic afk-chest">
          <LineIcon name="chest" size={96} />
        </div>
      </div>
      <div className="title">{fmtDuration(p.minutes * 60_000)} 동안 쌓였어요</div>
      <div className="sub">{full ? '상자가 가득 찼어요(최대 12시간). 자주 받아 가세요.' : '가장 멀리 깬 스테이지가 높을수록 많이 쌓여요.'}</div>
      <div className="reward-list">
        {rows
          .filter(([, n]) => n > 0)
          .map(([k, n]) => (
            <span key={k}>
              <ResIcon kind={k} />+{fmt(n)}
            </span>
          ))}
        {p.gear > 0 && <span>장비 {p.gear}개</span>}
      </div>
      {claimed?.items.length ? <div className="soft afk-items">{claimed.items.map((id) => `〈${ITEM_BY_ID[id]?.name}〉`).join(' ')}</div> : null}
      <div className="actions">
        {claimed ? (
          <button className="btn hong wide" onClick={onClose}>
            확인
          </button>
        ) : (
          <>
            <button className="btn hong wide" disabled={p.minutes < 1} onClick={take}>
              받기
            </button>
            <button className="btn wide" onClick={onClose}>
              나중에
            </button>
          </>
        )}
      </div>
    </Shell>
  );
}

/** 관직이 올랐다 */
export function RankModal({ ranks, onClose }: { ranks: number[]; onClose: () => void }) {
  const top = ranks[ranks.length - 1];
  const r = rankDef(top);
  const jade = ranks.reduce((a, n) => a + B.rankJade + 20 * n, 0);
  useEffect(() => play('promote'), []);
  return (
    <Shell onClose={onClose}>
      <div className="head">
        <Burst />
        <span className="ttuk-word">승급!</span>
        <div className="who-pic" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
          <LineIcon name="crown" size={90} />
        </div>
      </div>
      <div className="title">〈{r.title}〉</div>
      <div className="sub">{r.flavor}</div>
      <div className="reward-list">
        <span>
          <ResIcon kind="jade" />+{fmt(jade)}
        </span>
      </div>
      <div className="actions">
        <button className="btn hong wide" onClick={onClose}>
          좋아요!
        </button>
      </div>
    </Shell>
  );
}

/** 새 식객 합류: 카드 그림을 크게 */
export function RecruitCard({ id, onClose, note }: { id: string; onClose: () => void; note?: string }) {
  const def = YOKAI_BY_ID[id];
  const el = elementOf(id);
  useEffect(() => play('promote'), []);
  if (!def) return null;
  return (
    <div className={`recruit r${def.grade}`} role="dialog" aria-label={`${def.name} 합류`} onClick={onClose}>
      <Art className="recruit-art" src={ART.card(id)} alt={def.name} fallback={<div className="portrait-fallback">{def.name}</div>} />
      <div className="recruit-info">
        <span className="recruit-seal">{note ?? '합류'}</span>
        <div className="recruit-tags">
          <em className={`rar r${def.grade}`}>{RARITY_LABEL[def.grade]}</em>
          <span style={{ background: ELEMENT_COLOR[el] }}>{ELEMENT_LABEL[el]}</span>
          <span>{ROLE_LABEL[roleOf(id)]}</span>
        </div>
        <b>{def.name}</b>
        <small>{def.kind}</small>
        <p>{def.intro}</p>
        {SKILLS[id] && (
          <p className="recruit-skill">
            <b>{SKILLS[id].name}</b> · {skillText(SKILLS[id].kind)}
          </p>
        )}
        <div className="vn-more">화면을 눌러 계속 ▾</div>
      </div>
    </div>
  );
}

/** 대화: 식객이 말을 걸고, 대답을 고르면 반응한다. */
export function TalkModal({ view, id, open, onClose }: { view: GameState; id: string; open: (m: ModalRequest) => void; onClose: () => void }) {
  const content = bondContent(id);
  const topic = content.talks[view.yokai[id].talks % content.talks.length];
  const [answer, setAnswer] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState(0);
  const [gained, setGained] = useState(0);
  const reply = (i: number) => {
    const r = act((s, now) => talk(s, now, id, topic.replies[i].delta));
    if (!r.ok) return onClose();
    buzz(15);
    setAnswer(i);
    setGained(r.gained);
    if (r.to > r.from) setLevelUp(r.to);
  };
  const finish = () => {
    onClose();
    if (levelUp) open({ kind: 'bondup', id, level: levelUp });
  };
  return (
    <Shell>
      <div className="head jade">
        <Burst />
        <Frame id={id} />
      </div>
      <div className="title">{YOKAI_BY_ID[id].name}</div>
      <div className="bubble">{answer === null ? topic.line : topic.replies[answer].reaction}</div>
      {answer === null ? (
        <div className="choices">
          {topic.replies.map((r, i) => (
            <button key={i} className={`choice ${i % 2 ? 'b' : 'a'}`} onClick={() => reply(i)}>
              <span>{r.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="actions">
          <div className="sub">{gained > 0 ? `호감도 +${gained}` : '전에 나눈 이야기예요'}</div>
          <button className="btn hong wide" onClick={finish}>
            확인
          </button>
        </div>
      )}
    </Shell>
  );
}

/** 선물·나들이 반응 */
export function ReactModal({
  id,
  text,
  gained,
  levelUp,
  outing,
  open,
  onClose,
}: {
  id: string;
  text: string;
  gained: number;
  levelUp: number;
  outing?: boolean;
  open: (m: ModalRequest) => void;
  onClose: () => void;
}) {
  return (
    <Shell>
      <div className="head jade">
        {outing ? <VillageScene rank={0} /> : <Burst />}
        <Frame id={id} />
      </div>
      <div className="title">{YOKAI_BY_ID[id].name}</div>
      <div className="bubble">{text}</div>
      <div className="actions">
        <div className="sub">호감도 +{gained}</div>
        <button
          className="btn hong wide"
          onClick={() => {
            onClose();
            if (levelUp) open({ kind: 'bondup', id, level: levelUp });
          }}
        >
          확인
        </button>
      </div>
    </Shell>
  );
}

export function BondUpModal({ id, level, open, onClose }: { id: string; level: number; open: (m: ModalRequest) => void; onClose: () => void }) {
  return (
    <Shell>
      <div className="head">
        <Burst />
        <span className="ttuk-word">♥ 인연</span>
        <Frame id={id} />
      </div>
      <div className="title">
        {YOKAI_BY_ID[id].name}와(과) 〈{BOND_LEVELS[level].name}〉 사이가 되었어요
      </div>
      <div className="sub">능력치 +{Math.round(level * B.bondBonus * 100)}% · 새 이야기가 열렸어요</div>
      <div className="actions">
        <button
          className="btn hong wide"
          onClick={() => {
            onClose();
            open({ kind: 'scene', id, level });
          }}
        >
          이야기 보기
        </button>
        <button className="btn cheong wide" onClick={onClose}>
          나중에
        </button>
      </div>
    </Shell>
  );
}

/** 이야기 장면: 화면을 누를 때마다 한 줄씩 넘어간다. */
export function SceneViewer({ id, level, onClose }: { id: string; level: number; onClose: () => void }) {
  const scene = bondContent(id).scenes.find((s) => s.level === level);
  const [i, setI] = useState(0);
  if (!scene) return null;
  const line = scene.lines[i];
  const name = YOKAI_BY_ID[id].name;
  const next = () => {
    if (i + 1 < scene.lines.length) setI(i + 1);
    else {
      act((s) => [markSceneSeen(s, id, level), null]);
      onClose();
    }
  };
  return <NovelFrame title={`${name} · ${level}. ${scene.title}`} bg={level===3||level===5?ART.cg(id,level):ART.bg(level===4?'hut':'night')} cast={level===3||level===5?[]:[id]} line={{who:line.who==='her'?id:line.who,text:line.text}} onNext={next} onClose={onClose} />;
}
