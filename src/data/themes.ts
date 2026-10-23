// 식객 대표 색. 첫 화면 배경(사선 띠·이름표)에 쓴다. 없으면 특기 색을 쓴다.
import { YOKAI_BY_ID } from './yokai';

const THEME: Record<string, string> = {
  baekseol: '#d23c4b',
  muyeong: '#1f8a8a',
  sodam: '#9a7fd6',
};

const BY_STAT = { might: '#e2553f', wit: '#e08a1e', politics: '#4f9a3a', charm: '#d0577a' } as const;

export const themeOf = (id: string): string => THEME[id] ?? BY_STAT[YOKAI_BY_ID[id]?.specialty ?? 'charm'];
