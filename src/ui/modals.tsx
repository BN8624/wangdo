import { NovelFrame } from './StoryView';
import { useState } from 'react';
import { chooseWish, levelCap, markSceneSeen, rankMultiplier, talk, wishRewardAmount } from '../core/engine';
import { fmt, fmtDuration } from '../core/format';
import { ART } from '../data/art';
import { bondContent } from '../data/bond-content';
import { rankDef } from '../data/ranks';
import { BOND_LEVELS, GIFT_BY_ID } from '../data/village';
import { WISH_BY_ID } from '../data/wishes';
import { YOKAI_BY_ID } from '../data/yokai';
import type { ComboDef, GameState, ResourceKey } from '../core/types';
import { Burst, LineIcon, RES_LABEL, ResIcon, VillageScene } from './icons';
import { Portrait } from './Portrait';
import { act, type OfflineSummary } from './store';
import { buzz, pushToast } from './toast';
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
    const r = act((s, now) => chooseWish(s, now, i));
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
                  <ResIcon kind={c.reward.kind} size={16} />+{fmt(wishRewardAmount(view, c.reward))}
                </>
              )}
            </span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

export function PromoteModal({ rank, recruit, onClose }: { rank: number; recruit: string | null; onClose: () => void }) {
  const r = rankDef(rank);
  const def = recruit ? YOKAI_BY_ID[recruit] : null;
  return (
    <Shell onClose={onClose}>
      <div className="head">
        <Burst />
        <span className="ttuk-word">승급!</span>
        {def ? (
          <Frame id={def.id} />
        ) : (
          <div className="who-pic" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
            <LineIcon name="crown" size={90} />
          </div>
        )}
      </div>
      <div className="title">〈{r.title}〉</div>
      <div className="sub">{r.flavor}</div>
      {def && (
        <div className="bubble">
          <b>{def.name}</b>({def.kind})이(가) 식객으로 합류했어요!
          <br />
          <span className="soft">{def.intro}</span>
        </div>
      )}
      <div className="reward-list" style={{ fontSize: 14 }}>
        <span style={{ fontSize: 14 }}>생산량 ×{rankMultiplier(rank).toFixed(1)}</span>
        <span style={{ fontSize: 14 }}>레벨 상한 {levelCap(rank)}</span>
      </div>
      <div className="actions">
        <button className="btn hong wide" onClick={onClose}>
          좋아요!
        </button>
      </div>
    </Shell>
  );
}

/** 겨루기 결과. 세 판을 하나씩 보여 준다. */
export function OfflineModal({ summary, onClose }: { summary: OfflineSummary; onClose: () => void }) {
  const keys = (Object.keys(summary.gained) as ResourceKey[]).filter((k) => summary.gained[k] > 0);
  return (
    <Shell onClose={onClose}>
      <div className="head jade">
        <Burst />
        <span className="ttuk-word">어서 와요!</span>
        <Frame id="baekseol" />
      </div>
      <div className="title">자리를 비운 {fmtDuration(summary.minutes * 60_000)} 동안</div>
      <div className="sub">식객들이 일터에서 부지런히 벌어 왔어요</div>
      <div className="reward-list">
        {keys.length === 0 ? (
          <span style={{ fontSize: 14 }}>일터에 아무도 없었어요</span>
        ) : (
          keys.map((k) => (
            <span key={k}>
              <ResIcon kind={k} />+{fmt(summary.gained[k])}
            </span>
          ))
        )}
      </div>
      <div className="actions">
        <button className="btn cheong wide" onClick={onClose}>
          궁궐로 가기
        </button>
      </div>
    </Shell>
  );
}

/** 대화: 식객이 말을 걸고, 대답을 고르면 반응한다. */
export function TalkModal({ view, id, open, onClose }: { view: GameState; id: string; open: (m: ModalRequest) => void; onClose: () => void }) {
  const content = bondContent(id);
  const topic = content.talks[view.yokai[id].talks % content.talks.length];
  const [answer, setAnswer] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState(0);
  const reply = (i: number) => {
    const r = act((s, now) => talk(s, now, id, topic.replies[i].delta));
    if (!r.ok) return onClose();
    buzz(15);
    setAnswer(i);
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
          <div className="sub">호감도 +{topic.replies[answer].delta * 2}</div>
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
      <div className="sub">능력치 +{level * 8}% · 새 이야기가 열렸어요</div>
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
  return <NovelFrame title={`${name} · ${level}. ${scene.title}`} bg={level===3||level===5?ART.cg(id,level):ART.bg('night')} cast={level===3||level===5?[]:[id]} line={{who:line.who==='her'?id:line.who,text:line.text}} onNext={next} />;
}

export function ComboModal({ combo, onClose }: { combo: ComboDef; onClose: () => void }) {
  return (
    <Shell onClose={onClose}>
      <div className="head">
        <Burst />
        <span className="ttuk-word">짝꿍!</span>
        <div className="trio">
          {combo.pair.map((id) => (
            <div key={id} className="portrait-frame">
              <Portrait def={YOKAI_BY_ID[id]} />
            </div>
          ))}
        </div>
      </div>
      <div className="title">{combo.title}</div>
      <div className="bubble">{combo.text}</div>
      <div className="actions">
        <div className="sub">같은 일터에 있으면 생산량 +20%</div>
        <button className="btn hong wide" onClick={onClose}>
          좋아요!
        </button>
      </div>
    </Shell>
  );
}

