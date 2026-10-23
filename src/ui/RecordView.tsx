import { useState } from 'react';
import { ownedYokai, power } from '../core/engine';
import { fmt } from '../core/format';
import { exportCode, importCode } from '../core/save';
import { RANKS } from '../data/ranks';
import { YOKAI } from '../data/yokai';
import type { GameState } from '../core/types';
import { replaceState, resetGame } from './store';
import { pushToast } from './toast';

export function RecordView({ view, now }: { view: GameState; now: number }) {
  const [code, setCode] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const day = Math.floor((now - view.createdAt) / 86_400_000) + 1;

  const doExport = async () => {
    const c = exportCode(view);
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      pushToast({ text: '저장 코드를 복사했어요' });
    } catch {
      pushToast({ text: '아래 코드를 길게 눌러 복사하세요' });
    }
  };

  const doImport = () => {
    const s = importCode(code, Date.now());
    if (!s) {
      pushToast({ text: '저장 코드가 올바르지 않아요', warn: true });
      return;
    }
    replaceState(s);
    pushToast({ text: '저장 코드를 불러왔어요' });
  };

  return (
    <div className="view">
      <div className="page-title">기록</div>
      <div className="list">
        <div>
          <span>달골에서 지낸 날</span>
          <b>{day}일째</b>
        </div>
        <div>
          <span>칭호</span>
          <b>
            {RANKS[view.rank].title} ({view.rank + 1}/{RANKS.length})
          </b>
        </div>
        <div>
          <span>위세</span>
          <b>{fmt(power(view))}</b>
        </div>
        <div>
          <span>식객</span>
          <b>
            {ownedYokai(view).length} / {YOKAI.length}
          </b>
        </div>
        <div>
          <span>해결한 소동</span>
          <b>{fmt(view.totals.stages)}</b>
        </div>
        <div>
          <span>방망이를 두드린 횟수</span>
          <b>{fmt(view.totals.wishes)}</b>
        </div>
        <div>
          <span>연 잔치</span>
          <b>{fmt(view.totals.feasts)}</b>
        </div>
        <div>
          <span>거둬들인 자원</span>
          <b>{fmt(view.totals.collected)}</b>
        </div>
      </div>

      <div className="section-title">저장 옮기기</div>
      <div className="card">
        <div className="soft" style={{ fontSize: 13, lineHeight: 1.5 }}>
          진행 상황은 이 기기 브라우저에 자동 저장돼요. 다른 기기로 옮기려면 저장 코드를 복사해서 붙여 넣으세요.
        </div>
        <textarea className="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="저장 코드" />
        <div className="row-btns">
          <button className="btn cheong" onClick={doExport}>
            코드 만들기
          </button>
          <button className="btn nam" disabled={!code.trim()} onClick={doImport}>
            불러오기
          </button>
        </div>
      </div>

      <div className="section-title">처음부터 다시</div>
      <div className="card">
        <div className="row-btns" style={{ marginTop: 0 }}>
          {confirmReset ? (
            <>
              <button className="btn hong" onClick={() => (resetGame(), setConfirmReset(false))}>
                정말 지우기
              </button>
              <button className="btn cheong" onClick={() => setConfirmReset(false)}>
                취소
              </button>
            </>
          ) : (
            <button className="btn hong" onClick={() => setConfirmReset(true)}>
              모든 진행 지우기
            </button>
          )}
        </div>
      </div>
      <div className="soft" style={{ textAlign: 'center', fontSize: 12, margin: '18px 0' }}>
        왕도 v{__APP_VERSION__} · 그림: AI 생성
      </div>
    </div>
  );
}
