// 게임 전체에서 쓰는 타입. 상태는 JSON으로 그대로 저장할 수 있어야 한다.
import type { SkillKind } from './battle';

export type StatKey = 'might' | 'wit' | 'politics' | 'charm';
export type Stats = Record<StatKey, number>;

export type ResourceKey = 'coin' | 'grain' | 'fame';
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
  /** 좋아하는 선물 id 두 개 */
  likes: [string, string];
  /** AI 그림 프롬프트에 들어갈 캐릭터 묘사(영문) */
  artSubject: string;
  /** 그림이 없을 때 쓰는 대표 색 */
  color: string;
  /** 합류 경로: story:<화 id> · recruit · story:s2 … */
  join: string;
  voice: string;
}

export type WorkplaceId = 'market' | 'woodyard' | 'field' | 'tavern';

export interface WorkplaceDef {
  id: WorkplaceId;
  name: string;
  stat: StatKey;
  produces: ResourceKey;
  /** 능력치 1당 분당 생산량 */
  perStat: number;
  flavor: string;
}

export interface ComboDef {
  id: string;
  pair: [string, string];
  title: string;
  text: string;
}

export interface GiftDef {
  id: string;
  name: string;
  /** 칭호 0 기준 값(엽전). 칭호가 오르면 비싸진다 */
  cost: number;
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
  | { kind: 'coin' | 'grain'; minutes: number }
  /** 다음 승급 명성의 일정 비율(%) */
  | { kind: 'fame'; pct: number }
  | { kind: 'stamina'; amount: number }
  | { kind: 'gift' };

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
  /** foes마다 쓸 졸개 그림 번호(1~3) */
  grunts: number[];
  /** weak: 대장이 약한 기술 종류 */
  boss: { name: string; stat: StatKey; line: string; weak: SkillKind };
}

export interface StageInfo {
  index: number;
  chapter: ChapterDef;
  chapterIndex: number;
  /** 장 안에서의 번호(1부터) */
  number: number;
  isBoss: boolean;
  foe: string;
  /** 겨루기 세 판: 어떤 능력치로, 상대 수치는 얼마인지 */
  rounds: { stat: StatKey; value: number }[];
  /** 이 종류의 고유 기술에 약하다 */
  weak: SkillKind;
  fame: number;
  coin: number;
}

export interface YokaiState {
  level: number;
  /** 호감도 점수 */
  bond: number;
  /** 마지막으로 대화한 시각 */
  talkAt: number;
  /** 마지막 나들이 시각 */
  outingAt: number;
  /** 지금까지 본 이야기 장면 단계 */
  seen: number;
  /** 지금까지 나눈 대화 수(다음 대화 주제를 고르는 데 쓴다) */
  talks: number;
}

export interface PendingWish {
  id: string;
}

export interface GameState {
  version: 2;
  createdAt: number;
  /** 생산·기력·뚝딱이 마지막으로 정산된 시각 */
  lastSettled: number;
  rank: number;
  res: Resources;
  stamina: { value: number; lastRegen: number };
  yokai: Record<string, YokaiState>;
  work: Record<WorkplaceId, string[]>;
  gifts: Record<string, number>;
  wish: { charges: number; lastRegen: number; pending: PendingWish | null; recent: string[] };
  stage: { index: number };
  /** 처음 본 짝꿍 이야기 */
  combosSeen: string[];
  rng: number;
  totals: { wishes: number; feasts: number; wins: number; losses: number; talks: number; gifts: number; earned: number };
  introSeen: boolean;
  /** 안내 단계(끝나면 안내 목록 길이 이상) */
  guide: number;
  /** 본 이야기 화와 선택으로 생긴 깃발 */
  story: { done: string[]; flags: string[] };
  /** 궁궐 화면에 서 있는 대표 식객 */
  favorite: string;
}

// ───────── 메인 이야기(연재) ─────────

export interface StoryLine {
  /** narration · me · 식객 id · npc:이름 */
  who: string;
  text: string;
  /** 이 깃발이 있을 때만 나오는 줄 */
  if?: string;
  /** 이 줄에서 화면 가운데 크게 보여 줄 물건 그림(art/item/<이름>.webp) */
  img?: string;
  /** 이름표에 대신 띄울 호칭(이름을 밝히기 전 '???' 등) */
  as?: string;
  /** 해설 줄에서 이 인물을 화면에 세운다(등장 묘사 등) */
  show?: string;
  /** 이 줄에서 화면 가득 보여 줄 이벤트 그림(art/scene/<이름>.webp). 인물·배경 대신 보인다 */
  cg?: string;
}

export interface StoryEffects {
  bond?: Record<string, number>;
  flags?: string[];
  res?: Partial<Resources>;
}

export interface StoryScene {
  bg: string;
  cg?: string | null;
  cast?: string[];
  lines: StoryLine[];
  choice?: { prompt: string; options: { text: string; reply?: string; effects?: StoryEffects }[] };
}

export interface Episode {
  id: string;
  season: number;
  no: number;
  title: string;
  summary: string;
  unlock: { after?: string; rank?: number; power?: number; stage?: number };
  scenes: StoryScene[];
  reward?: { coin?: number; grain?: number; fame?: number; recruit?: string | null };
}
