import { useState } from 'react';
import { teamPower } from '../core/units';
import { STAGES } from '../core/campaign';
import { fmt } from '../core/format';
import { rankDef } from '../data/ranks';
import { YOKAI } from '../data/yokai';
import type { GameState } from '../core/types';
import { BackupPanel } from './Backup';
import { SoundToggles } from './SoundToggles';
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
          <span>편성 전투력</span>
          <b>{fmt(teamPower(view))}</b>
        </div>
        <div>
          <span>식객</span>
          <b>
            {Object.keys(view.yokai).length} / {YOKAI.length}
          </b>
        </div>
        <div>
          <span>깬 스테이지 · 별</span>
          <b>
            {STAGES.filter((st) => (view.camp.stars[st.id] ?? 0) > 0).length} / {STAGES.length} · ★{Object.values(view.camp.stars).reduce((a, n) => a + n, 0)}
          </b>
        </div>
        <div>
          <span>모집</span>
          <b>{fmt(view.gacha.pulls)}번</b>
        </div>
        <div>
          <span>전투</span>
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
      </div>

      <div className="section-title">소리</div>
      <div className="card">
        <SoundToggles />
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
