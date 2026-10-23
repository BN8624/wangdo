import { useState, type ReactNode } from 'react';
import { portraitPath } from '../data/art';
import type { YokaiDef } from '../core/types';

// 그림 파일이 없으면 다시 요청하지 않도록 실패한 경로를 기억한다.
const missing = new Set<string>();

/** 그림 파일을 보여 주고, 없으면 fallback을 보여 준다. */
export function Art({ src, alt = '', className, fallback }: { src: string; alt?: string; className?: string; fallback: ReactNode }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = missing.has(src) || failedSrc === src;
  if (failed) return <>{fallback}</>;
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      draggable={false}
      onError={() => {
        missing.add(src);
        setFailedSrc(src);
      }}
    />
  );
}

/** 요괴 초상화. AI 그림이 없으면 대표 색으로 그린 자리 표시 그림을 보여 준다. */
export function Portrait({ def }: { def: YokaiDef }) {
  return <Art className="portrait" src={portraitPath(def.id)} alt={`${def.name} (${def.kind})`} fallback={<Placeholder def={def} />} />;
}

function Placeholder({ def }: { def: YokaiDef }) {
 return <div className="portrait-fallback">{def.name}</div>;
}
