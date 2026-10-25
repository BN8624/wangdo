// 화면을 그리다 오류가 나면 하얀 화면 대신 복구 안내를 보여 준다. 저장은 지우지 않고, 백업 코드를 먼저 챙길 수 있게 한다.
import { Component, type ReactNode } from 'react';
import { SAVE_KEY } from '../core/save';

interface State {
  failed: boolean;
  copied: boolean;
  confirm: boolean;
}

function backupCode(): string {
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? '';
    const bytes = new TextEncoder().encode(raw);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  } catch {
    return '';
  }
}

export class Recover extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, copied: false, confirm: false };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('화면 오류', error);
  }

  copy = async () => {
    try {
      await navigator.clipboard.writeText(backupCode());
      this.setState({ copied: true });
    } catch {
      this.setState({ copied: false });
    }
  };

  restart = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* 저장이 막혀 있어도 새로 시작은 된다 */
    }
    location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="recover" role="alert">
        <b>잠깐, 화면에 문제가 생겼어요</b>
        <p>진행 상황은 그대로 저장되어 있어요. 다시 불러오면 대부분 해결돼요.</p>
        <button className="btn hong wide" onClick={() => location.reload()}>
          다시 불러오기
        </button>
        <button className="btn wide" onClick={this.copy}>
          {this.state.copied ? '저장 코드를 복사했어요' : '저장 코드 복사해 두기'}
        </button>
        {this.state.confirm ? (
          <button className="btn wide" onClick={this.restart}>
            정말 처음부터 시작하기
          </button>
        ) : (
          <button className="link-btn" onClick={() => this.setState({ confirm: true })}>
            계속 안 되면 처음부터 시작하기
          </button>
        )}
      </div>
    );
  }
}
