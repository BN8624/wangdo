import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { Recover } from './ui/Recover';
import { initStore } from './ui/store';
import { askPersist, watchInstallPrompt } from './ui/backup';
import './styles.css';

initStore();
askPersist();
watchInstallPrompt();
// 그림·폰트를 기기에 담아 두는 서비스 워커(개발 중에는 쓰지 않는다)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Recover>
      <App />
    </Recover>
  </StrictMode>,
);
