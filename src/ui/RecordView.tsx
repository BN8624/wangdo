import { useState } from 'react';
import { ownedYokai, power } from '../core/engine';
import { fmt } from '../core/format';
import { rankDef } from '../data/ranks';
import { YOKAI } from '../data/yokai';
import type { GameState } from '../core/types';
import { BackupPanel } from './Backup';
import { resetGame } from './store';

export function RecordView({ view, now }: { view: GameState; now: number }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const day = Math.floor((now - view.createdAt) / 86_400_000) + 1;

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
            {rankDef(view.rank).title}
          </b>
        </div>
        <div>
          <span>권세</span>
          <b>{fmt(power(view))}</b>
        </div>
        <div>
          <span>식객</span>
          <b>
            {ownedYokai(view).length} / {YOKAI.length}
          </b>
        </div>
        <div>
          <span>토벌</span>
          <b>
            {fmt(view.totals.wins)}승 {fmt(view.totals.losses)}패
          </b>
        </div>
        <div>
          <span>나눈 대화 · 건넨 선물</span>
          <b>
            {fmt(view.totals.talks)} · {fmt(view.totals.gifts)}
          </b>
        </div>
        <div>
          <span>처리한 정무</span>
          <b>{fmt(view.totals.wishes)}</b>
        </div>
        <div>
          <span>개최한 연회</span>
          <b>{fmt(view.totals.feasts)}</b>
        </div>
        <div>
          <span>벌어들인 엽전·곡식</span>
          <b>{fmt(view.totals.earned)}</b>
        </div>
      </div>

      <div className="section-title">저장 지키기</div>
      <div className="card">
        <BackupPanel view={view} now={now} />
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
      <div className="soft" style={{ textAlign: 'center', fontSize: 13, margin: '18px 0' }}>
        왕도 v{__APP_VERSION__} · 그림: AI 생성
      </div>
    </div>
  );
}
