// 게임 전체에서 쓰는 타입. 상태는 JSON으로 그대로 저장할 수 있어야 한다.
import type { SkillKind } from './combat';

export type StatKey = 'might' | 'wit' | 'politics' | 'charm';
export type Stats = Record<StatKey, number>;

/** coin 엽전 · jade 옥(모집) · exp 수련치(레벨업) · fame 명성(관직이 저절로 오른다) */
export type ResourceKey = 'coin' | 'jade' | 'exp' | 'fame';
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
  flavor: string;
}

export type WishReward =
  /** 방치 보상 몇 분어치 엽전·수련치(grain은 수련치로 준다) */
  | { kind: 'coin' | 'grain'; minutes: number }
  /** 다음 관직까지 명성의 일정 비율(%) */
  | { kind: 'fame'; pct: number }
  /** 수련장 몇 판어치 수련치 */
  | { kind: 'exp'; amount: number }
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
  boss: { name: string; stat: StatKey; line: string; weak: SkillKind };
}


export interface YokaiState {
  level: number;
  /** 별(1~6). 처음에는 등급만큼 */
  stars: number;
  /** 이 식객의 조각(별 올리기에 쓴다) */
  shards: number;
  /** 호감도 점수 */
  bond: number;
  /** 마지막으로 대화한 시각 */
  talkAt: number;
  /** 마지막 나들이 시각 */
  outingAt: number;
  /** 지금까지 본 인연 장면 단계 */
  seen: number;
  /** 지금까지 나눈 대화 수(다음 대화 주제를 고르는 데 쓴다) */
  talks: number;
  /** 낀 장비(아이템 id) */
  gear: { weapon?: string; trinket?: string };
}

export interface PendingWish {
  id: string;
}

export interface GameState {
  version: 3;
  createdAt: number;
  /** 마지막으로 정산한 시각 */
  lastSettled: number;
  /** 관직(계정 레벨). 명성이 쌓이면 저절로 오른다 */
  rank: number;
  res: Resources;
  yokai: Record<string, YokaiState>;
  /** 출정 편성 다섯 칸(빈칸은 '') */
  team: string[];
  gifts: Record<string, number>;
  wish: { charges: number; lastRegen: number; pending: PendingWish | null; recent: string[] };
  rng: number;
  totals: { wishes: number; wins: number; losses: number; talks: number; gifts: number; pulls: number; stages: number };
  introSeen: boolean;
  /** 안내 단계(끝나면 안내 목록 길이 이상) */
  guide: number;
  /** 본 이야기 화(장을 다 깨면 본 것으로 친다)와 선택으로 생긴 깃발, 이미 본 컷신 */
  story: { done: string[]; flags: string[]; watched: string[] };
  /** 캠페인: 스테이지마다 딴 별(0~3) */
  camp: { stars: Record<string, number> };
  /** 모집: 모집 횟수, 마지막 SSR 뒤로 센 횟수(천장), 첫 열 번 모집을 했는지 */
  gacha: { pulls: number; pity: number; firstTen: boolean };
  /** 방치 보상: 마지막으로 받은 시각 */
  afk: { since: number };
  /** 가진 장비와 재료(낀 장비는 빼고 센다). memory = 아무 식객에게나 쓰는 기억 조각 */
  inventory: Record<string, number>;
  /** 로비에 서 있는 대표 식객 */
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

/** 화 안에 끼는 전투. after번째 장면(0부터)을 마친 뒤에 싸운다 */
export interface StoryBattle {
  after: number;
  foe: string;
  /** 그림 세트: 토벌 장 id(backhill·ferry·alley·pleasure·north) */
  set: string;
  /** 졸개 그림 번호(1~3) */
  grunt?: number;
  /** 그 장의 대장 그림을 쓴다 */
  boss?: boolean;
  /** 상대 그림으로 이 식객의 전신을 쓴다(겨루기) */
  rival?: string;
  /** 상대 그림(art/<art>.webp). 있으면 set·grunt·boss보다 먼저 쓴다 */
  art?: string;
  /** 상대 세기 배율(기본 1). 첫 전투처럼 반드시 이겨야 하는 판만 낮춘다 */
  power?: number;
  /** 전투 배경(art/battle/<bg>.webp). 없으면 set의 배경 */
  bg?: string;
  /** 나설 식객 수(1~3, 기본 3) */
  size?: number;
  /** 판마다 겨룰 능력치. 없으면 순번으로 정한다 */
  stats?: StatKey[];
  weak?: SkillKind;
  /** 아직 합류하지 않았어도 이 전투에 함께 나서는 식객 */
  guests?: string[];
  /** 상대가 처음 외치는 말 */
  line?: string;
  /** 상대 레벨 */
  level?: number;
  /** 전투 앞뒤에 나오는 짧은 대화 */
  intro?: StoryLine[];
  outro?: StoryLine[];
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
  /** after: 앞 화, node: 먼저 끝내야 하는 모험 노드(던전 등) */
  unlock: { after?: string; node?: string };
  scenes: StoryScene[];
  battles?: StoryBattle[];
  /** recruit: 화를 마치면 합류하는 식객(여럿이면 배열) */
  reward?: { coin?: number; grain?: number; fame?: number; recruit?: string | string[] | null };
}
