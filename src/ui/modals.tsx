import { useEffect, useState } from 'react';
import { chooseWish, levelCap, markSceneSeen, rankMultiplier, talk, wishRewardAmount, type FightResult } from '../core/engine';
import { fmt, fmtDuration } from '../core/format';
import { ART, WISH_USES_YOKAI } from '../data/art';
import { bondContent } from '../data/bond-content';
import { RANKS } from '../data/ranks';
import { BOND_LEVELS, GIFT_BY_ID } from '../data/village';
import { WISH_BY_ID } from '../data/wishes';
import { STAT_LABEL, YOKAI_BY_ID } from '../data/yokai';
import type { ComboDef, GameState, ResourceKey } from '../core/types';
import { Burst, Club, RES_LABEL, ResIcon, Villager, VillageScene } from './icons';
import { Art, Portrait } from './Portrait';
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
        <span className="ttuk-word">뚝딱!</span>
        {WISH_USES_YOKAI[wish.id] ? (
          <Frame id={WISH_USES_YOKAI[wish.id]} />
        ) : (
          <div className="who-pic portrait-frame">
            <Villager wishId={wish.id} />
          </div>
        )}
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
  const r = RANKS[rank];
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
            <Club size={130} />
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
export function FightModal({ result, onClose }: { result: Extract<FightResult, { ok: true }>; onClose: () => void }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= result.rounds.length) return;
    const t = setTimeout(() => {
      setShown((n) => n + 1);
      buzz(result.rounds[shown].won ? 15 : 40);
    }, 650);
    return () => clearTimeout(t);
  }, [shown, result.rounds]);
  const done = shown >= result.rounds.length;
  const recruit = result.recruit ? YOKAI_BY_ID[result.recruit] : null;
  return (
    <Shell onClose={done ? onClose : undefined}>
      <div className={`head ${done && result.won ? 'jade' : done ? 'night' : ''}`}>
        <Burst />
        <span className="ttuk-word">{!done ? '겨루기!' : result.won ? '해결!' : '아쉬워요'}</span>
        {done && recruit ? <Frame id={recruit.id} /> : null}
      </div>
      <div className="title">{result.stage.foe}</div>
      <div className="fight-rounds">
        {result.rounds.map((r, i) => (
          <div key={i} className={`fr ${i < shown ? (r.won ? 'win' : 'lose') : 'wait'}`}>
            <span className="fr-pic">
              <Portrait def={YOKAI_BY_ID[r.id]} />
            </span>
            <span className="fr-txt">
              <b>{YOKAI_BY_ID[r.id].name}</b> · {STAT_LABEL[r.stat]} {fmt(r.mine)} vs {fmt(r.foe)}
            </span>
            <span className="fr-mark">{i < shown ? (r.won ? '승' : '패') : '…'}</span>
          </div>
        ))}
      </div>
      {done && result.won && (
        <div className="reward-list">
          <span>
            <ResIcon kind="fame" />+{fmt(result.fame)}
          </span>
          <span>
            <ResIcon kind="coin" />+{fmt(result.coin)}
          </span>
          {result.gift && <span style={{ fontSize: 15 }}>선물 〈{GIFT_BY_ID[result.gift].name}〉</span>}
        </div>
      )}
      {done && !result.won && <div className="sub" style={{ marginTop: 10 }}>편성을 바꾸거나 식객을 더 키워서 다시 도전해요.</div>}
      {done && recruit && (
        <div className="bubble">
          "{result.stage.chapter.boss.line}"
          <br />
          <b>{recruit.name}</b>이(가) 식객으로 합류했어요!
        </div>
      )}
      <div className="actions">
        <button className="btn hong wide" disabled={!done} onClick={onClose}>
          확인
        </button>
      </div>
    </Shell>
  );
}

export function OfflineModal({ summary, onClose }: { summary: OfflineSummary; onClose: () => void }) {
  const keys = (Object.keys(summary.gained) as ResourceKey[]).filter((k) => summary.gained[k] > 0);
  return (
    <Shell onClose={onClose}>
      <div className="head jade">
        <Burst />
        <span className="ttuk-word">어서 와요!</span>
        <Frame id="dudu" />
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
          고을로 가기
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
  const withCg = level === 3 || level === 5;
  return (
    <div className="vn" onClick={next} role="dialog" aria-label={scene.title}>
      <div className="vn-bg">
        {withCg ? (
          <Art className="vn-cg" src={ART.cg(id, level)} fallback={<VillageScene rank={level * 2} />} />
        ) : (
          <VillageScene rank={level * 2} />
        )}
      </div>
      {!withCg && (
        <div className="vn-char">
          <Portrait def={YOKAI_BY_ID[id]} />
        </div>
      )}
      <div className="vn-title">
        {name} · {level}. {scene.title}
      </div>
      <div className="vn-box">
        {line.who !== 'narration' && <div className="vn-name">{line.who === 'me' ? '나' : name}</div>}
        <div className={`vn-text ${line.who === 'narration' ? 'narr' : ''}`}>{line.text}</div>
        <div className="vn-more">{i + 1 < scene.lines.length ? '▼' : '끝'}</div>
      </div>
    </div>
  );
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

const STORY = [
  '산골 마을 달골에 사는 나무꾼인 당신.\n오늘도 나무를 하러 깊은 산에 올랐다가\n그만 길을 잃고 말았어요.',
  '어둑한 숲속, 도깨비들이 놀다 간 자리에\n울퉁불퉁한 방망이 하나가 떨어져 있었어요.\n"금 나와라… 뚝딱?"',
  '방망이 소리에 장난꾸러기 도깨비 두두와\n새내기 구미호 방울, 우렁각시 소라가 나타났어요.\n"방망이 주인님! 우리랑 같이 살아요!"',
  '아가씨들에게 일터를 맡기고, 이야기를 나누며\n쓸쓸한 달골을 팔도 제일의 고을로 키워 보세요.\n언젠가 도깨비 대왕이 될지도 몰라요!',
];

export function IntroModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const last = page === STORY.length - 1;
  return (
    <Shell>
      <div className="head">
        {page === 2 ? (
          <div className="trio">
            {['bangul', 'dudu', 'sora'].map((id) => (
              <div key={id} className="portrait-frame">
                <Portrait def={YOKAI_BY_ID[id]} />
              </div>
            ))}
          </div>
        ) : (
          <Art
            className="scene-img"
            src={[ART.story('lost'), ART.story('club'), '', ART.village(3)][page]}
            fallback={
              <div className="who-pic" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                <Club size={130} />
              </div>
            }
          />
        )}
      </div>
      <div className="title">왕도 — 나무꾼에서 도깨비 대왕까지</div>
      <div className="story" style={{ whiteSpace: 'pre-line' }}>
        {STORY[page]}
      </div>
      <div className="page-dots">
        {STORY.map((_, i) => (
          <b key={i} className={i === page ? 'on' : ''} />
        ))}
      </div>
      <div className="actions">
        <button className="btn hong wide" onClick={() => (last ? onClose() : setPage(page + 1))}>
          {last ? '시작하기' : '다음'}
        </button>
      </div>
    </Shell>
  );
}

