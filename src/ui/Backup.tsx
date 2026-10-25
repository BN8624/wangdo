// 저장 지키기 화면: 파일·코드 백업과 불러오기, 홈 화면 추가 안내. 기록 탭과 궁궐의 백업 알림에서 함께 쓴다.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { exportCode, importCode } from '../core/save';
import type { GameState } from '../core/types';
import { canInstall, isIos, isStandalone, lastBackupAt, markBackedUp, onInstallChange, promptInstall, saveToFile } from './backup';
import { replaceState } from './store';
import { pushToast } from './toast';

function ago(at: number, now: number): string {
  if (!at) return '아직 백업한 적이 없어요';
  const days = Math.floor((now - at) / 86_400_000);
  return days < 1 ? '마지막 백업 · 오늘' : `마지막 백업 · ${days}일 전`;
}

export function BackupPanel({ view, now }: { view: GameState; now: number }) {
  const [code, setCode] = useState('');
  const [installable, setInstallable] = useState(canInstall);
  const [, bump] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => onInstallChange(() => setInstallable(canInstall())), []);

  const load = (text: string) => {
    const s = importCode(text, Date.now());
    if (!s) {
      pushToast({ text: '저장 코드가 올바르지 않아요', warn: true });
      return;
    }
    replaceState(s);
    pushToast({ text: '저장을 불러왔어요' });
    setCode('');
  };

  const toFile = async () => {
    const r = await saveToFile(view);
    if (r !== 'cancelled') pushToast({ text: r === 'shared' ? '저장 파일을 보냈어요' : '저장 파일을 내려받았어요' });
    bump((n) => n + 1);
  };

  const copy = async () => {
    const c = exportCode(view);
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      markBackedUp();
      pushToast({ text: '저장 코드를 복사했어요. 메모나 카톡에 붙여 두세요' });
    } catch {
      pushToast({ text: '아래 코드를 길게 눌러 복사하세요' });
    }
    bump((n) => n + 1);
  };

  const fromFile = async (f: File | undefined) => {
    if (f) load(await f.text());
    if (fileRef.current) fileRef.current.value = '';
  };

  const install = async () => {
    if (await promptInstall()) pushToast({ text: '홈 화면에 추가했어요' });
  };

  return (
    <div className="backup">
      <div className="soft backup-note">
        진행 상황은 <b>이 기기 브라우저에만</b> 저장돼요. 방문 기록을 지우거나 오래 들어오지 않으면 사라질 수 있으니, 가끔 파일로 저장해 두세요.
      </div>
      <div className="backup-when">{ago(lastBackupAt(), now)}</div>
      <div className="row-btns">
        <button className="btn hong" onClick={toFile}>
          파일로 저장
        </button>
        <button className="btn cheong" onClick={copy}>
          코드 복사
        </button>
      </div>
      {!isStandalone() && (installable || isIos()) && (
        <div className="backup-install">
          {installable ? (
            <button className="btn nam wide" onClick={install}>
              홈 화면에 추가하기
            </button>
          ) : (
            <span>
              사파리 아래쪽 <b>공유 버튼</b>을 누르고 <b>홈 화면에 추가</b>를 고르면 앱처럼 열리고, 저장도 더 오래 남아요.
            </span>
          )}
        </div>
      )}
      <div className="backup-load">
        <textarea className="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="다른 기기에서 옮겨 올 저장 코드" />
        <div className="row-btns">
          <button className="btn nam" disabled={!code.trim()} onClick={() => load(code)}>
            코드 불러오기
          </button>
          <button className="btn nam" onClick={() => fileRef.current?.click()}>
            파일 불러오기
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={(e) => fromFile(e.target.files?.[0])} />
      </div>
    </div>
  );
}

/** 궁궐에서 띄우는 백업 창 */
export function BackupSheet({ view, now, onClose }: { view: GameState; now: number; onClose: () => void }) {
  return createPortal(
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="저장 지키기">
        <button className="close" onClick={onClose}>
          닫기
        </button>
        <div className="sheet-title">저장 지키기</div>
        <BackupPanel view={view} now={now} />
      </div>
    </>,
    document.body,
  );
}

const ADULT_KEY = 'wangdo.adult';

export function adultConfirmed(): boolean {
  try {
    return localStorage.getItem(ADULT_KEY) === '1';
  } catch {
    return false;
  }
}

/** 처음 한 번 묻는 성인 확인 */
export function AdultGate({ onPass }: { onPass: () => void }) {
  const [refused, setRefused] = useState(false);
  const pass = () => {
    try {
      localStorage.setItem(ADULT_KEY, '1');
    } catch {
      /* 저장이 막혀 있으면 다음에 또 묻는다 */
    }
    onPass();
  };
  return (
    <div className="adult-gate" role="dialog" aria-label="성인 확인">
      <div className="adult-mark">19</div>
      <b>왕도 — 빚 받으러 왕까지</b>
      {refused ? (
        <p>죄송해요. 이 게임은 성인만 이용할 수 있어요.</p>
      ) : (
        <>
          <p>
            이 게임에는 성인을 위한 관능적인 장면과 표현이 담겨 있어요.
            <br />만 19세 이상만 이용할 수 있어요.
          </p>
          <button className="btn hong wide" onClick={pass}>
            만 19세 이상이에요
          </button>
          <button className="link-btn" onClick={() => setRefused(true)}>
            아니에요
          </button>
        </>
      )}
    </div>
  );
}
