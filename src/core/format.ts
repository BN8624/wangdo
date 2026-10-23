// 숫자·시간을 한국어로 보기 좋게 표시한다.

const UNITS: [number, string][] = [
  [1e16, '경'],
  [1e12, '조'],
  [1e8, '억'],
  [1e4, '만'],
];

/** 12,345 → "1.2만", 999 → "999" */
export function fmt(n: number): string {
  const v = Math.floor(n);
  if (Math.abs(v) < 10_000) return v.toLocaleString('ko-KR');
  for (const [size, unit] of UNITS) {
    if (Math.abs(v) >= size) {
      const x = v / size;
      const digits = Math.abs(x) >= 100 ? 0 : 1;
      return `${trimZero(x.toFixed(digits))}${unit}`;
    }
  }
  return String(v);
}

function trimZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** 소수점 한 자리까지 보여 주는 생산량 표시 */
export function fmtRate(n: number): string {
  if (n >= 100) return fmt(n);
  return trimZero(n.toFixed(1));
}

/** 밀리초 → "3시간 5분", "12분", "40초" */
export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  if (m > 0) return s > 0 && m < 10 ? `${m}분 ${s}초` : `${m}분`;
  return `${s}초`;
}
