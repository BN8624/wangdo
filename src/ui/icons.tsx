// 손으로 그린 작은 SVG 아이콘과 장면 그림.
import { ART } from '../data/art';
import type { ResourceKey } from '../core/types';
import { Art } from './Portrait';

export type IconKind = ResourceKey | 'stamina';

export function ResIcon({ kind, size = 20 }: { kind: IconKind; size?: number }) {
  return (
    <Art className="res-icon" src={ART.icon(kind)} fallback={<ResIconSvg kind={kind} size={size} />} />
  );
}

function ResIconSvg({ kind, size }: { kind: IconKind; size: number }) {
  const p = { width: size, height: size, viewBox: '0 0 20 20', 'aria-hidden': true };
  switch (kind) {
    case 'coin':
      return (
        <svg {...p}>
          <circle cx="10" cy="10" r="8.5" fill="#f4b942" stroke="#b5821a" strokeWidth="1.6" />
          <rect x="7.2" y="7.2" width="5.6" height="5.6" fill="#fffdf6" stroke="#b5821a" strokeWidth="1.3" />
        </svg>
      );
    case 'grain':
      return (
        <svg {...p}>
          <path d="M10 18 V7" stroke="#6f9a34" strokeWidth="1.8" />
          <g fill="#e8c35a" stroke="#b48a22" strokeWidth=".9">
            <ellipse cx="10" cy="4.5" rx="2" ry="3" />
            <ellipse cx="6.5" cy="8" rx="1.8" ry="2.8" transform="rotate(-30 6.5 8)" />
            <ellipse cx="13.5" cy="8" rx="1.8" ry="2.8" transform="rotate(30 13.5 8)" />
            <ellipse cx="6.8" cy="12.5" rx="1.7" ry="2.6" transform="rotate(-35 6.8 12.5)" />
            <ellipse cx="13.2" cy="12.5" rx="1.7" ry="2.6" transform="rotate(35 13.2 12.5)" />
          </g>
        </svg>
      );
    case 'stamina':
      return (
        <svg {...p}>
          <path d="M10 17.5 C3 12.5 1.5 9 3.5 5.8 C5.5 3 8.6 3.6 10 6.2 C11.4 3.6 14.5 3 16.5 5.8 C18.5 9 17 12.5 10 17.5Z" fill="#e2553f" stroke="#a83a28" strokeWidth="1" />
        </svg>
      );
    case 'fame':
      return (
        <svg {...p}>
          <path
            d="M10 1.5 L12.4 7 L18.3 7.4 L13.8 11.2 L15.2 17 L10 13.9 L4.8 17 L6.2 11.2 L1.7 7.4 L7.6 7Z"
            fill="#e2553f"
            stroke="#a83a28"
            strokeWidth="1"
          />
        </svg>
      );
  }
}

export const RES_LABEL: Record<IconKind, string> = { coin: '엽전', grain: '곡식', fame: '명성', stamina: '기력' };

const NAV_PATHS = {
  home: (
    <>
      <path d="M2 12 Q14 2 26 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="7" y="13" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    </>
  ),
  yokai: (
    <>
      <circle cx="14" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M10 5 L9 1.5 L12.5 4.2" fill="currentColor" />
      <path d="M4 25 Q5 17 14 17 Q23 17 24 25" fill="none" stroke="currentColor" strokeWidth="2.4" />
    </>
  ),
  stage: (
    <path
      d="M14 2 L17 10 L25 11 L19 16 L21 25 L14 20 L7 25 L9 16 L3 11 L11 10Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  ),
  record: (
    <>
      <rect x="5" y="3" width="18" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M9 9 H19 M9 14 H19 M9 19 H15" stroke="currentColor" strokeWidth="2.2" />
    </>
  ),
};

export function NavIcon({ name }: { name: keyof typeof NAV_PATHS }) {
  return (
    <Art
      className="nav-icon"
      src={ART.icon(`nav-${name === 'yokai' ? 'yokai' : name}`)}
      fallback={
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
          {NAV_PATHS[name]}
        </svg>
      }
    />
  );
}

export function Club({ size = 92 }: { size?: number }) {
  return <Art className="club club-img" src={ART.icon('club')} fallback={<ClubSvg size={size} />} />;
}

function ClubSvg({ size }: { size: number }) {
  return (
    <svg className="club" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <rect x="44" y="52" width="12" height="44" rx="5" fill="#a0673a" />
      <path d="M30 10 Q50 -2 70 10 Q76 36 62 56 L38 56 Q24 36 30 10Z" fill="#c78a4e" stroke="#7b4a24" strokeWidth="2.5" />
      <g fill="#7b4a24">
        <circle cx="40" cy="22" r="4" />
        <circle cx="58" cy="18" r="4" />
        <circle cx="50" cy="36" r="4" />
        <circle cx="62" cy="40" r="3.5" />
        <circle cx="38" cy="42" r="3.5" />
      </g>
    </svg>
  );
}

function House({ x, y, s = 1, roof }: { x: number; y: number; s?: number; roof: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x="6" y="14" width="44" height="22" fill="#fff7e6" stroke="#8a6a4a" strokeWidth="1.4" />
      <rect x="22" y="22" width="12" height="14" fill="#c9a77a" />
      <rect x="10" y="19" width="8" height="7" fill="#f1dcb2" stroke="#8a6a4a" strokeWidth=".8" />
      <rect x="38" y="19" width="8" height="7" fill="#f1dcb2" stroke="#8a6a4a" strokeWidth=".8" />
      <path d="M-6 16 Q4 13 10 4 L46 4 Q52 13 62 16 Q54 18 48 14 L8 14 Q2 18 -6 16Z" fill={roof} />
    </g>
  );
}

/** 고을 풍경. 칭호가 오를수록 집이 늘어난다. */
export function VillageScene({ rank }: { rank: number }) {
  const tier = rank < 5 ? 1 : rank < 10 ? 2 : 3;
  return <Art className="scene-img" src={ART.village(tier)} fallback={<VillageSvg rank={rank} />} />;
}

function VillageSvg({ rank }: { rank: number }) {
  const houses = [
    { x: 150, y: 90, s: 1.25, roof: '#e2553f' },
    { x: 46, y: 98, s: 1, roof: '#3d5a9e' },
    { x: 268, y: 100, s: 1, roof: '#2a9d8f' },
    { x: 330, y: 112, s: 0.8, roof: '#e2553f' },
    { x: 0, y: 112, s: 0.8, roof: '#2a9d8f' },
    { x: 104, y: 112, s: 0.75, roof: '#e2553f' },
    { x: 222, y: 114, s: 0.75, roof: '#3d5a9e' },
  ];
  const count = Math.min(houses.length, 1 + Math.floor((rank + 1) / 2));
  return (
    <svg viewBox="0 0 390 150" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe4f0" />
          <stop offset="1" stopColor="#fbf5e6" />
        </linearGradient>
      </defs>
      <rect width="390" height="150" fill="url(#sky)" />
      <circle cx="320" cy="42" r="20" fill="#ffd56b" />
      <circle cx="320" cy="42" r="28" fill="#ffd56b" opacity=".25" />
      <g fill="#fff" opacity=".9">
        <ellipse cx="70" cy="40" rx="26" ry="9" />
        <ellipse cx="88" cy="34" rx="16" ry="9" />
        <ellipse cx="238" cy="26" rx="20" ry="7" />
      </g>
      <path d="M0 105 Q60 55 120 92 Q170 60 230 88 Q300 48 390 96 V150 H0Z" fill="#a9d6a0" />
      <path d="M0 120 Q90 88 170 112 Q260 86 390 116 V150 H0Z" fill="#7fbf86" />
      {houses.slice(0, count).map((h, i) => (
        <House key={i} {...h} />
      ))}
      <g transform="translate(118,124)">
        <circle r="7" fill="#5aa469" />
        <rect x="-1.5" y="5" width="3" height="8" fill="#8a6a4a" />
      </g>
      <path d="M0 150 Q195 128 390 150Z" fill="#f2e3c2" />
    </svg>
  );
}

const CHAPTER_THEME = [
  { sky: '#f6c87a', ground: '#e9a65a', roofs: ['#e2553f', '#2a9d8f', '#3d5a9e'] },
  { sky: '#8f86c4', ground: '#5d5794', roofs: ['#3a2f4f', '#4b4f8a', '#3a2f4f'] },
  { sky: '#5b4a8a', ground: '#7a4f8a', roofs: ['#b5527a', '#e2553f', '#f4b942'] },
  { sky: '#a9dbe0', ground: '#6fb3b8', roofs: ['#2a9d8f', '#3a8fb7', '#2a9d8f'] },
  { sky: '#f7a65f', ground: '#d8452b', roofs: ['#8a3a20', '#a64a2a', '#8a3a20'] },
];

export function ChapterArt({ index, id }: { index: number; id: string }) {
  return <Art className="scene-img" src={ART.chapter(id)} fallback={<ChapterSvg index={index} />} />;
}

function ChapterSvg({ index }: { index: number }) {
  const t = CHAPTER_THEME[index % CHAPTER_THEME.length];
  return (
    <svg viewBox="0 0 366 128" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`fade${index}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset=".55" stopColor="#3a1e0c" stopOpacity=".45" />
          <stop offset="1" stopColor="#3a1e0c" stopOpacity=".7" />
        </linearGradient>
      </defs>
      <rect width="366" height="128" fill={t.sky} />
      {index === 1 || index === 2 ? <circle cx="40" cy="30" r="14" fill="#fff4c8" /> : null}
      <path d="M0 80 Q90 50 180 76 Q270 46 366 70 V128 H0Z" fill={t.ground} />
      {[196, 252, 308].map((x, i) => (
        <g key={x} transform={`translate(${x},${14 + (i % 2) * 6}) scale(.72)`}>
          <path d="M0 18 L70 18 L62 4 L8 4Z" fill={t.roofs[i]} />
          <rect x="6" y="18" width="58" height="26" fill="#fff4dc" stroke="#9a6b3a" strokeWidth="1.4" />
          <rect x="10" y="30" width="50" height="10" fill="#c78a4e" />
        </g>
      ))}
      <rect y="48" width="366" height="80" fill={`url(#fade${index})`} />
    </svg>
  );
}

/** 말썽꾼 무리(꼬마 도깨비 셋) */
export function FoeGroup({ chapterId, tint = '#3d5a9e' }: { chapterId: string; tint?: string }) {
  return <Art className="portrait" src={ART.foe(chapterId)} fallback={<FoeSvg tint={tint} />} />;
}

function FoeSvg({ tint }: { tint: string }) {
  const kid = (skin: string, cloth: string) => (
    <>
      <path d="M18 122 Q20 86 50 84 Q80 86 82 122Z" fill={cloth} />
      <circle cx="50" cy="54" r="28" fill={skin} />
      <path d="M46 28 L50 12 L54 28Z" fill="#f4d35e" />
      <path d="M24 48 L28 32 L36 38 L44 28 L50 34 L58 28 L64 38 L72 32 L76 48 Q50 34 24 48Z" fill="#4a3a33" />
      <ellipse cx="40" cy="58" rx="3.4" ry="4.4" fill="#2d2420" />
      <ellipse cx="60" cy="58" rx="3.4" ry="4.4" fill="#2d2420" />
      <path d="M42 66 Q50 74 58 66" fill="none" stroke="#7a3b2e" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
  return (
    <svg viewBox="0 0 100 100" width="84" height="84" aria-hidden>
      <g transform="translate(-6,22) scale(.62)">{kid('#f3bf8f', tint)}</g>
      <g transform="translate(44,26) scale(.58)">{kid('#f6c79c', '#e2553f')}</g>
      <g transform="translate(18,40) scale(.66)">{kid('#efb88a', '#8cc152')}</g>
    </svg>
  );
}

/** 소원을 들고 오는 마을 사람(자리 표시용) */
export function Villager({ wishId }: { wishId: string }) {
  return <Art className="portrait" src={ART.npc(wishId)} fallback={<VillagerSvg />} />;
}

function VillagerSvg() {
  return (
    <svg viewBox="0 0 100 120" width="132" height="160" aria-hidden>
      <path d="M18 122 Q20 86 50 84 Q80 86 82 122Z" fill="#f2ead8" />
      <path d="M38 85 L50 102 L62 85" fill="none" stroke="#3d5a9e" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="50" cy="54" r="28" fill="#f6cfa8" />
      <path d="M24 52 Q26 34 50 32 Q74 34 76 52 Q70 44 50 42 Q30 44 24 52Z" fill="#4a3a33" />
      <path d="M14 30 L86 30 L80 24 Q50 14 20 24Z" fill="#2d2420" />
      <rect x="36" y="8" width="28" height="18" rx="4" fill="#2d2420" />
      <ellipse cx="40" cy="58" rx="3.4" ry="4.4" fill="#2d2420" />
      <ellipse cx="60" cy="58" rx="3.4" ry="4.4" fill="#2d2420" />
      <ellipse cx="33" cy="66" rx="5" ry="3" fill="#f29ca3" opacity=".6" />
      <ellipse cx="67" cy="66" rx="5" ry="3" fill="#f29ca3" opacity=".6" />
      <path d="M45 67 Q50 71 55 67" fill="none" stroke="#7a3b2e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Burst() {
  return (
    <svg className="burst" viewBox="0 0 354 180" preserveAspectRatio="xMidYMax slice" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const b = a + Math.PI / 16;
        return (
          <path
            key={i}
            d={`M177 180 L${177 + Math.cos(a) * 400} ${180 + Math.sin(a) * 400} L${177 + Math.cos(b) * 400} ${180 + Math.sin(b) * 400}Z`}
            fill="#fff"
            opacity=".22"
          />
        );
      })}
    </svg>
  );
}
