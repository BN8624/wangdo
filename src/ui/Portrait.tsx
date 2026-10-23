import { useState, type ReactNode } from 'react';
import { portraitPath } from '../data/art';
import type { YokaiDef } from '../core/types';

// 그림 파일이 없으면 다시 요청하지 않도록 실패한 경로를 기억한다.
const missing = new Set<string>();

/** 그림 파일을 보여 주고, 없으면 fallback을 보여 준다. */
export function Art({ src, alt = '', className, fallback }: { src: string; alt?: string; className?: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(missing.has(src));
  if (failed) return <>{fallback}</>;
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      draggable={false}
      onError={() => {
        missing.add(src);
        setFailed(true);
      }}
    />
  );
}

/** 요괴 초상화. AI 그림이 없으면 대표 색으로 그린 자리 표시 그림을 보여 준다. */
export function Portrait({ def }: { def: YokaiDef }) {
  return <Art className="portrait" src={portraitPath(def.id)} alt={`${def.name} (${def.kind})`} fallback={<Placeholder def={def} />} />;
}

function Placeholder({ def }: { def: YokaiDef }) {
  return (
    <div className="portrait-fallback" style={{ background: `radial-gradient(circle at 50% 60%, #fff, ${def.color}55)` }}>
      <svg viewBox="0 0 100 120" width="100%" height="100%" aria-label={def.name}>
        <path d="M18 122 Q20 86 50 84 Q80 86 82 122Z" fill={def.color} />
        <path d="M38 85 L50 102 L62 85" fill="none" stroke="#fffaf0" strokeWidth="5" strokeLinejoin="round" />
        <circle cx="50" cy="54" r="28" fill="#ffe3c8" />
        <path d="M22 56 Q20 26 50 26 Q80 26 78 56 Q74 38 50 36 Q28 38 22 56Z" fill="#3a2f2a" />
        <ellipse cx="40" cy="58" rx="3.4" ry="4.4" fill="#2d2420" />
        <ellipse cx="60" cy="58" rx="3.4" ry="4.4" fill="#2d2420" />
        <ellipse cx="33" cy="66" rx="5" ry="3" fill="#f29ca3" opacity=".6" />
        <ellipse cx="67" cy="66" rx="5" ry="3" fill="#f29ca3" opacity=".6" />
        <path d="M45 67 Q50 71 55 67" fill="none" stroke="#7a3b2e" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
