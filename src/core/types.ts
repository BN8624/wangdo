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
  /** 모든 식객에게 전투 몇 판어치 경험치 */
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
  /** 졸개 그림 번호를 따로 정할 때(이야기 전투) */
  grunt?: number;
  /** 상대 그림으로 식객 전신을 쓸 때(식객과 겨루는 이야기 전투) */
  rival?: string;
  /** 이야기 속 전투면 어느 화의 몇 번째 전투인지 */
  story?: { ep: string; n: number };
  /** 진 횟수만큼 상대가 지친 정도(1 = 그대로) */
  mercy?: number;
  /** 상대가 처음 외치는 말 */
  line?: string;
  /** 상대 레벨(경험치·표시용) */
  level?: number;
  /** 전투 배경 그림 키(art/battle/<키>.webp). 없으면 장 id */
  bg?: string;
  /** 상대 그림 경로(art/<경로>.webp). 있으면 이걸 쓴다 */
  art?: string;
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
  /** 지금 레벨에서 모은 경험치 */
  exp: number;
  /** 낀 장비(아이템 id) */
  gear: { weapon?: string; trinket?: string };
}

export interface PendingWish {
  id: string;
}

export interface GameState {
  version: 2;
  createdAt: number;
  /** 생산이 마지막으로 정산된 시각 */
  lastSettled: number;
  rank: number;
  res: Resources;
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
  story: {
    done: string[];
    flags: string[];
    /** 이긴 이야기 전투(화 id#번호) */
    won: string[];
    /** 이야기 전투마다 진 횟수: 질수록 상대가 지친다 */
    losses: Record<string, number>;
    /** 보다가 멈춘 화: 어느 장면에서 어느 전투를 앞두고 있었는지, 그때까지 고른 선택지 */
    at?: { ep: string; scene: number; battle: number; choices: (number | null)[] };
  };
  /** 가진 장비(낀 것은 빼고 센다) */
  inventory: Record<string, number>;
  /** 모험: 끝낸 노드(던전·퀘스트), 던전마다 깬 층 수, 연 보물상자, 전투마다 진 횟수(봐주기) */
  adv: { cleared: string[]; floors: Record<string, number>; chests: string[]; losses: Record<string, number> };
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
