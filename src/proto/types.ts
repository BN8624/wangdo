// 시제품(자동 진행 도트 RPG)의 공통 타입
import type { CharName, FaceName, MonName } from './atlas';

/** 0 아래 · 1 위 · 2 왼 · 3 오른(스프라이트 시트의 열 순서) */
export type Dir = 0 | 1 | 2 | 3;
export interface Pt {
  x: number;
  y: number;
}

/** 대사 한 줄. who: narration · me · 식객 id · npc:이름 */
export interface Line {
  who: string;
  text: string;
  /** 대화창 얼굴(없으면 who로 찾는다) */
  face?: FaceName;
  /** 이 깃발이 있을 때만 */
  if?: string;
  /** 이 깃발이 없을 때만 */
  unless?: string;
  /** 이 줄에서 크게 띄울 물건 그림(public/art/item/<이름>.webp) */
  img?: string;
  /** 이 줄부터 화면 위쪽에 띄울 장면 그림(public/proto/scene/<이름>.webp). null이면 거둔다 */
  scene?: string | null;
}

export type MemberId = 'me' | 'baekseol' | 'muyeong';
export type Slot = 'weapon' | 'charm';

export interface ItemDef {
  id: string;
  name: string;
  slot: Slot;
  /** 공격·체력·방어 % */
  atk?: number;
  hp?: number;
  def?: number;
  /** 속도 더하기 */
  spd?: number;
  price: number;
  desc: string;
}

export interface Member {
  id: MemberId;
  level: number;
  exp: number;
  weapon?: string;
  charm?: string;
}

/** 맵에 서 있는 사람·짐승 */
export interface Actor {
  id: string;
  /** 걷는 캐릭터 또는 몬스터 그림 */
  char?: CharName;
  mon?: MonName;
  at: Pt;
  dir: Dir;
}

/** 적 무리 한 판 */
export interface FoeDef {
  name: string;
  /** 그림: 캐릭터(사람) 또는 몬스터 */
  char?: CharName;
  mon?: MonName;
  level: number;
  role: 'attack' | 'defense' | 'heal' | 'support';
  element: 'fire' | 'water' | 'wood' | 'light' | 'dark';
  kind: 'grunt' | 'elite' | 'boss';
  power?: number;
}
export interface FoeGroup {
  name: string;
  /** 웨이브마다 적 */
  waves: FoeDef[][];
  boss?: boolean;
  /** 전투 배경 바닥 */
  ground: 'grass' | 'cave' | 'dirt';
}
