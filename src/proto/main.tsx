// 시제품 진입점(proto.html). #sprites 로 열면 고친 그림을 늘어놓아 본다.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSound } from '../ui/sound';
import { App } from './App';
import { loadArt } from './draw';
import './proto.css';

function Sprites() {
  return (
    <div className="sprites">
      {['chars32', 'mons', 'faces', 'tiles', 'fx'].map((s) => (
        <img key={s} src={`proto/${s}.png`} alt={s} style={{ width: 'auto', zoom: 3 }} />
      ))}
    </div>
  );
}

initSound();
// 식객 일러스트는 처음 말할 때 깜빡이지 않게 미리 받아 둔다
for (const src of ['baekseol', 'muyeong', 'sodam']) new Image().src = `proto/portrait/${src}.webp`;
for (const src of ['e1-tree', 'e1-ondol', 'e1-foxfire', 'e1-coins', 'e2-market', 'e2-mirror', 'e2-collar', 'e2-walk-mu', 'e2-walk-bs', 'e3-firstcup', 'e4-hide', 'e4-shell', 'e4-measure', 'e5-chaeryeong', 'e5-confess', 'e5-shoulder', 'e6-faint', 'e6-porridge', 'e7-geojeok', 'e8-gate', 'e8-tea', 'e9-key', 'e9-count']) new Image().src = `proto/scene/${src}.webp`;
for (const src of ['baekseol', 'muyeong', 'sodam']) new Image().src = `proto/cutin/${src}.webp`;
for (const src of ['bangmangi', 'iou', 'emblem', 'crate']) new Image().src = `art/item/${src}.webp`;
const root = createRoot(document.getElementById('root')!);
loadArt()
  .then(() => root.render(<StrictMode>{location.hash === '#sprites' ? <Sprites /> : <App />}</StrictMode>))
  .catch((e) => root.render(<p style={{ padding: 20 }}>{String(e)}</p>));
