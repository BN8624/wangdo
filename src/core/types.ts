// 게임 전체에서 쓰는 타입. 상태는 JSON으로 그대로 저장할 수 있어야 한다.

export type StatKey = 'might' | 'wit' | 'craft' | 'charm';
export type Stats = Record<StatKey, number>;

/** 창고에 쌓였다가 '거두기'로 들어오는 자원 */
export type StoredKey = 'coin' | 'grain' | 'hands';
/** 지갑에 들어 있는 모든 자원 */
export type ResourceKey = StoredKey | 'fame';
export type Resources = Record<ResourceKey, number>;

export type Grade = 1 | 2 | 3;

export interface YokaiDef {
  id: string;
  name: string;
  /** 종족·별명. 예: "덜렁이 도깨비" */
  kind: string;
  grade: Grade;
  specialty: StatKey;
  base: Stats;
  /** 레벨 1당 오르는 능력치 */
  growth: Stats;
  intro: string;
  /** AI 그림 프롬프트에 들어갈 캐릭터 묘사(영문) */
  artSubject: string;
  /** 초상화가 없을 때 쓰는 대표 색 */
  color: string;
}

export interface RankDef {
  title: string;
  /** 승급에 필요한 위세(전체 능력치 합) */
  powerReq: number;
  /** 승급할 때 소모하는 명성 */
  fameCost: number;
  /** 이 칭호에 오르면 합류하는 식객 */
  recruit?: string;
  flavor: string;
}

export type WishReward =
  | { kind: StoredKey; minutes: number }
  /** 다음 승급 명성의 일정 비율(%) */
  | { kind: 'fame'; pct: number };

export interface WishChoice {
  label: string;
  reward: WishReward;
}

export interface WishDef {
  id: string;
  who: string;
  text: string;
  minRank: number;
  choices: [WishChoice, WishChoice];
}

export interface ChapterDef {
  id: string;
  title: string;
  intro: string;
  foes: string[];
  boss: { name: string; yokai: string; line: string };
}

export interface StageInfo {
  index: number;
  chapter: ChapterDef;
  chapterIndex: number;
  /** 장 안에서의 번호(1부터) */
  number: number;
  isBoss: boolean;
  foe: string;
  hp: number;
  fame: number;
  coin: number;
}

export interface PendingWish {
  id: string;
}

export interface GameState {
  version: 1;
  createdAt: number;
  /** 창고·뚝딱 충전이 마지막으로 정산된 시각 */
  lastSettled: number;
  rank: number;
  res: Resources;
  store: Record<StoredKey, number>;
  /** 보유한 식객과 레벨 */
  yokai: Record<string, { level: number }>;
  wish: { charges: number; lastRegen: number; pending: PendingWish | null; recent: string[] };
  stage: { index: number; damage: number };
  rng: number;
  totals: { wishes: number; feasts: number; stages: number; collected: number };
  introSeen: boolean;
}
