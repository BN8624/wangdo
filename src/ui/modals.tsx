import { useState } from 'react';
import { chooseWish, levelCap, rankMultiplier, wishRewardAmount, type StageResult } from '../core/engine';
import { fmt, fmtDuration } from '../core/format';
import { ART, WISH_USES_YOKAI } from '../data/art';
import { RANKS } from '../data/ranks';
import { WISH_BY_ID } from '../data/wishes';
import { YOKAI_BY_ID } from '../data/yokai';
import type { GameState, StoredKey } from '../core/types';
import { Burst, Club, RES_LABEL, ResIcon, Villager } from './icons';
import { Art, Portrait } from './Portrait';
import { act, type OfflineSummary } from './store';
import { buzz, pushToast } from './toast';

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

export function WishModal({ view, onClose }: { view: GameState; onClose: () => void }) {
  const pending = view.wish.pending;
  if (!pending) return null;
  const wish = WISH_BY_ID[pending.id];
  const pick = (i: 0 | 1) => {
    const r = act((s, now) => chooseWish(s, now, i));
    if (r.ok) {
      buzz(20);
      pushToast({ text: `+${fmt(r.amount)} ${RES_LABEL[r.kind]}`, res: r.kind });
    }
    onClose();
  };
  return (
    <Shell>
      <div className="head">
        <Burst />
        <span className="ttuk-word">뚝딱!</span>
        <div className="who-pic portrait-frame">
          {WISH_USES_YOKAI[wish.id] ? <Portrait def={YOKAI_BY_ID[WISH_USES_YOKAI[wish.id]]} /> : <Villager wishId={wish.id} />}
        </div>
      </div>
      <div className="title">{wish.who}</div>
      <div className="bubble">{wish.text}</div>
      <div className="choices">
        {wish.choices.map((c, i) => (
          <button key={i} className={`choice ${i === 0 ? 'a' : 'b'}`} onClick={() => pick(i as 0 | 1)}>
            <span>{c.label}</span>
            <span className="rw">
              <ResIcon kind={c.reward.kind} size={16} />+{fmt(wishRewardAmount(view, c.reward))}
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
          <div className="who-pic portrait-frame">
            <Portrait def={def} />
          </div>
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
        <span style={{ fontSize: 14 }}>생산량 ×{rankMultiplier(rank).toFixed(2)}</span>
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

export function StageResultModal({ result, onClose }: { result: Extract<StageResult, { ok: true }>; onClose: () => void }) {
  const recruit = result.recruit ? YOKAI_BY_ID[result.recruit] : null;
  const pct = Math.max(1, Math.floor((result.damage / result.stage.hp) * 100));
  return (
    <Shell onClose={onClose}>
      <div className={`head ${result.cleared ? 'jade' : ''}`}>
        <Burst />
        <span className="ttuk-word">{result.cleared ? '해결!' : '조금만 더!'}</span>
        {recruit ? (
          <div className="who-pic portrait-frame">
            <Portrait def={recruit} />
          </div>
        ) : null}
      </div>
      <div className="title">{result.cleared ? `${result.stage.foe}을(를) 달랬어요` : '소동이 아직 남았어요'}</div>
      <div className="sub">일손 {fmt(result.handsUsed)}명이 힘을 보탰어요</div>
      {result.cleared ? (
        <div className="reward-list">
          <span>
            <ResIcon kind="fame" />+{fmt(result.fame)}
          </span>
          <span>
            <ResIcon kind="coin" />+{fmt(result.coin)}
          </span>
        </div>
      ) : (
        <div className="sub" style={{ marginTop: 10 }}>
          이번에 {pct}%만큼 잠재웠어요. 일손을 더 모아 다시 출동해요.
        </div>
      )}
      {recruit && (
        <div className="bubble">
          "{result.stage.chapter.boss.line}"
          <br />
          <b>{recruit.name}</b>이(가) 식객으로 합류했어요!
        </div>
      )}
      <div className="actions">
        <button className="btn hong wide" onClick={onClose}>
          확인
        </button>
      </div>
    </Shell>
  );
}

export function OfflineModal({ summary, onClose }: { summary: OfflineSummary; onClose: () => void }) {
  const keys = (Object.keys(summary.gained) as StoredKey[]).filter((k) => summary.gained[k] > 0);
  return (
    <Shell onClose={onClose}>
      <div className="head jade">
        <Burst />
        <span className="ttuk-word">어서 와요!</span>
        <div className="who-pic portrait-frame">
          <Portrait def={YOKAI_BY_ID.dudu} />
        </div>
      </div>
      <div className="title">자리를 비운 {fmtDuration(summary.minutes * 60_000)} 동안</div>
      <div className="sub">식객들이 부지런히 일해서 창고에 쌓아 뒀어요</div>
      <div className="reward-list">
        {keys.length === 0 ? (
          <span style={{ fontSize: 14 }}>창고가 이미 가득 차 있었어요</span>
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

const STORY = [
  '산골 마을 달골에 사는 나무꾼인 당신.\n오늘도 나무를 하러 깊은 산에 올랐다가\n그만 길을 잃고 말았어요.',
  '어둑한 숲속, 도깨비들이 놀다 간 자리에\n울퉁불퉁한 방망이 하나가 떨어져 있었어요.\n"금 나와라… 뚝딱?"',
  '방망이 소리에 장난꾸러기 도깨비 두두와\n새내기 구미호 방울, 우렁각시 소라가 나타났어요.\n"방망이 주인님! 우리랑 같이 살아요!"',
  '요괴 친구들과 함께 쓸쓸한 달골을\n팔도 제일의 고을로 키워 보세요.\n언젠가 도깨비 대왕이 될지도 몰라요!',
];

export function IntroModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const last = page === STORY.length - 1;
  return (
    <Shell>
      <div className="head">
        <Burst />
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
