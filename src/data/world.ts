import type { SkillKind } from '../core/combat';
import quests from '../../content/quests.json';
import meets from '../../content/meets.json';

// 모험 지도: 부마다 지역, 지역마다 노드(이야기·마을·필드·던전·개인 퀘스트)가 길처럼 이어진다.
// 상대 그림은 art/<art>.webp, 전투 배경은 art/battle/<bg>.webp. 상대 세기는 레벨로 정한다(docs/RPG_DESIGN.md).

export interface FoeDef {
  name: string;
  art: string;
  weak?: SkillKind;
  line?: string;
}

/** 열리는 조건: ep(본 화), node(끝낸 던전·퀘스트), owned(데리고 있는 식객) */
export interface Req {
  ep?: string;
  node?: string;
  owned?: string;
}

export interface TownDef {
  kind: 'town';
  id: string;
  name: string;
  desc: string;
  shop: string[];
  req: Req;
}

export interface FieldDef {
  kind: 'field';
  id: string;
  name: string;
  desc: string;
  bg: string;
  levels: [number, number];
  foes: FoeDef[];
  req: Req;
}

export interface FloorDef {
  name: string;
  level: number;
  /** 이 층에서 싸울 판 수(대장 층은 1) */
  battles: number;
  chest?: { item?: string; coin?: number };
}

export interface DungeonDef {
  kind: 'dungeon';
  id: string;
  name: string;
  desc: string;
  bg: string;
  /** 층마다 돌아가며 나오는 상대 */
  pool: FoeDef[];
  /** 마지막 층은 대장 층 */
  floors: FloorDef[];
  boss: FoeDef & { drop?: string };
  req: Req;
}

export interface QuestDef {
  kind: 'quest';
  id: string;
  heroine: string;
  name: string;
  desc: string;
  bg: string;
  /** 퀘스트 장면(인연 장면과 같은 모양) */
  lines: { who: 'narration' | 'me' | 'her'; text: string }[];
  battles: (FoeDef & { level: number })[];
  /** 끝내면 받는 전용 장신구 */
  reward?: string;
  /** 만남: 끝내면 그 식객이 합류한다 */
  recruit?: boolean;
  req: Req;
}

export type NodeDef = TownDef | FieldDef | DungeonDef | QuestDef;

export interface RegionDef {
  id: string;
  part: number;
  name: string;
  desc: string;
  /** 길 순서: 노드 id 또는 'ep:<화 id>' */
  path: string[];
}

const F = (name: string, art: string, weak?: SkillKind, line?: string): FoeDef => ({ name, art, ...(weak ? { weak } : {}), ...(line ? { line } : {}) });

export const NODES: NodeDef[] = [
  // ───────── 1부 달골 ─────────
  { kind: 'town', id: 'dalgol-town', name: '달골 장터', desc: '나무꾼들이 모이는 작은 장. 싸구려지만 손에 맞는 물건이 있다.', shop: ['oak-club', 'bamboo-fan', 'plain-brush', 'hand-mirror', 'luck-pouch', 'wood-norigae'], req: { ep: 's1e01' } },
  {
    kind: 'field', id: 'backhill-field', name: '달골 뒷산', desc: '송씨가 제 산이라 우기는 뒷산. 산적과 노름꾼이 어슬렁거린다.', bg: 'backhill', levels: [1, 6],
    foes: [F('뒷산 산적', 'grunt/backhill', 'stun'), F('고개 노름꾼', 'grunt/backhill-2', 'strike'), F('칼 든 떠돌이', 'grunt/backhill-3', 'guard')], req: { ep: 's1e01' },
  },
  {
    kind: 'dungeon', id: 'bandit-cave', name: '고갯길 산적굴', desc: '흑운채에서 쫓겨난 고개 두목이 숨어든 굴. 떼먹은 통행세가 쌓여 있다.', bg: 'cave',
    pool: [F('산적굴 파수꾼', 'grunt/backhill', 'stun'), F('노름판 졸개', 'grunt/backhill-2', 'strike'), F('굴 속 칼잡이', 'grunt/backhill-3', 'guard')],
    floors: [{ name: '횃불이 꺼진 굴 입구', level: 3, battles: 2 }, { name: '노름판이 벌어진 동굴', level: 5, battles: 2, chest: { coin: 300 } }, { name: '두목의 금고', level: 7, battles: 1 }],
    boss: { name: '고개 두목', art: 'boss/gogae', weak: 'stun', line: '통행세를 갚으라고? 내 굴에 와서?', drop: 'chief-club' }, req: { ep: 's1e02' },
  },
  {
    kind: 'dungeon', id: 'song-cellar', name: '송씨 창고 지하', desc: '텅 빈 곡식 칸 아래로 이어진 지하. 곡식이 강으로 빠져나간 길이 있다.', bg: 'cellar',
    pool: [F('창고 일꾼', 'grunt/ferry', 'weaken'), F('장부 고치는 서기', 'grunt/ferry-2', 'stun'), F('송씨 머슴', 'grunt/backhill', 'strike')],
    floors: [{ name: '비어 있는 곡식 칸', level: 6, battles: 2 }, { name: '젖은 갈대가 깔린 통로', level: 8, battles: 2, chest: { item: 'mugwort-pouch' } }, { name: '감독의 장부방', level: 10, battles: 1 }],
    boss: { name: '창고 감독', art: 'boss/gamdok', weak: 'weaken', line: '장부에 없는 곡식은 처음부터 없던 곡식이오.', drop: 'warehouse-keys' }, req: { ep: 's1e05' },
  },

  // ───────── 1부 강나루 ─────────
  { kind: 'town', id: 'ferry-town', name: '강나루 객주', desc: '배꾼과 장사꾼이 드나드는 나루. 쓸 만한 물건이 들어온다.', shop: ['iron-flail', 'brass-abacus', 'office-seal', 'silk-kerchief', 'mugwort-pouch', 'silver-ring'], req: { ep: 's1e05' } },
  {
    kind: 'field', id: 'reed-field', name: '나루 갈대밭', desc: '밤마다 밀수 짐이 오가는 갈대밭.', bg: 'ferry', levels: [9, 15],
    foes: [F('갈대밭 도둑', 'grunt/backhill-3', 'guard'), F('밀수 뱃사공', 'grunt/ferry', 'weaken'), F('장부 고치는 서기', 'grunt/ferry-2', 'stun'), F('나루 호위', 'grunt/ferry-3', 'strike')], req: { ep: 's1e05' },
  },
  {
    kind: 'dungeon', id: 'smuggler-ship', name: '밤 나루 밀수선', desc: '달아난 독사가 숨어든 밀수선. 검은 구름 문양 상자가 실려 있다.', bg: 'ferry',
    pool: [F('밀수 뱃사공', 'grunt/ferry', 'weaken'), F('상단 호위', 'grunt/ferry-3', 'strike'), F('뱃장부꾼', 'grunt/ferry-2', 'stun'), F('갑판 도둑', 'grunt/backhill-3', 'guard')],
    floors: [{ name: '갑판', level: 11, battles: 2 }, { name: '선실', level: 12, battles: 2, chest: { coin: 1200 } }, { name: '화물칸', level: 14, battles: 2, chest: { item: 'silver-ring' } }, { name: '뱃머리', level: 15, battles: 1 }],
    boss: { name: '궁지에 몰린 독사', art: 'boss/ferry', weak: 'strike', line: '강 위에선 숫자도 물에 젖지요. 당신 셈도.', drop: 'viper-abacus' }, req: { ep: 's1e06' },
  },

  // ───────── 1부 흑운채 고갯길 ─────────
  {
    kind: 'field', id: 'pass-field', name: '흑운채 고갯길', desc: '흑운채로 오르는 험한 길. 척후와 궁수가 지킨다.', bg: 'backhill', levels: [15, 21],
    foes: [F('흑운채 척후', 'grunt/north', 'rally'), F('흑운채 궁수', 'grunt/north-2', 'guard'), F('도깨비 광부', 'grunt/cave', 'stun'), F('고갯길 산적', 'grunt/backhill', 'strike')], req: { ep: 's1e06' },
  },
  {
    kind: 'dungeon', id: 'weapon-cave', name: '흑운채 무기 동굴', desc: '송씨 배로 온 무기 상자가 쌓인 갱도.', bg: 'cave',
    pool: [F('도깨비 광부', 'grunt/cave', 'stun'), F('흑운채 척후', 'grunt/north', 'rally'), F('흑운채 궁수', 'grunt/north-2', 'guard')],
    floors: [
      { name: '갱도 입구', level: 17, battles: 2 }, { name: '무기 상자 더미', level: 18, battles: 2, chest: { item: 'goblin-club' } },
      { name: '용광로', level: 20, battles: 2, chest: { coin: 3000 } }, { name: '무기고 깊은 곳', level: 21, battles: 1 },
    ],
    boss: { name: '무기고지기 도깨비', art: 'boss/mugigo', weak: 'stun', line: '이 무기는 송씨 대감 몫이다. 한 자루도 못 내준다!', drop: 'forge-hammer' }, req: { ep: 's1e07' },
  },
  {
    kind: 'dungeon', id: 'upstream-granary', name: '상류 별창', desc: '달골 곡식 열두 칸이 숨겨진 별창. 송씨 사병이 지킨다.', bg: 'cellar',
    pool: [F('별창 사병', 'grunt/alley', 'rally'), F('송씨 머슴', 'grunt/backhill', 'strike'), F('매수된 포교', 'grunt/ferry-3', 'weaken')],
    floors: [{ name: '별창 마당', level: 20, battles: 2 }, { name: '곡식 칸 사이', level: 22, battles: 2, chest: { item: 'jade-norigae' } }, { name: '사병장의 초소', level: 23, battles: 1 }],
    boss: { name: '별창 사병장', art: 'boss/byeolchang', weak: 'rally', line: '대감께서 맡기신 곳이다. 열쇠가 있어도 못 들어간다.', drop: 'red-tassel-spear' }, req: { ep: 's1e08' },
  },
  { kind: 'town', id: 'gwana-town', name: '달골 관아 앞 저자', desc: '관아가 생기자 도성 물건이 들어오기 시작했다.', shop: ['goblin-club', 'silk-fan', 'jade-brush', 'pearl-vanity', 'jade-norigae', 'talisman-pouch'], req: { ep: 's1e08' } },

  // ───────── 2부 한빛성 ─────────
  { kind: 'town', id: 'capital-town', name: '한빛성 저잣거리', desc: '팔도 물건이 다 모이는 도성의 큰 장.', shop: ['hwando', 'secret-book', 'royal-tally', 'coral-fan', 'coral-hairpin', 'tiger-claw'], req: { ep: 's1e10' } },
  {
    kind: 'field', id: 'alley-field', name: '한빛성 뒷골목', desc: '송씨 사병과 자객이 숨어 다니는 뒷골목.', bg: 'alley', levels: [23, 30],
    foes: [F('송씨 사병', 'grunt/alley', 'rally'), F('헛소문 이야기꾼', 'grunt/alley-2', 'stun'), F('골목 자객', 'grunt/alley-3', 'guard'), F('매수된 포교', 'grunt/ferry-3', 'weaken')], req: { ep: 's2e01' },
  },
  {
    kind: 'dungeon', id: 'silk-warehouse', name: '송씨 비단 창고', desc: '윤 서방이 무너진 뒤에도 그림자 호위가 지키는 비단 창고.', bg: 'alley',
    pool: [F('송씨 사병', 'grunt/alley', 'rally'), F('창고 자객', 'grunt/alley-3', 'guard'), F('장부 이야기꾼', 'grunt/alley-2', 'stun')],
    floors: [{ name: '창고 마당', level: 25, battles: 2 }, { name: '비단 더미', level: 26, battles: 2, chest: { coin: 6000 } }, { name: '밀실 앞 복도', level: 28, battles: 2, chest: { item: 'tiger-claw' } }, { name: '밀실', level: 29, battles: 1 }],
    boss: { name: '그림자 호위', art: 'boss/geurimja', weak: 'guard', line: '집사는 졌지만, 그림자는 지지 않아요.', drop: 'shadow-veil' }, req: { ep: 's2e01' },
  },

  // ───────── 2부 붉은 등 거리 ─────────
  { kind: 'town', id: 'lantern-town', name: '붉은 등 거리 노점', desc: '기방 사이 좁은 노점. 값은 비싸도 물건은 확실하다.', shop: ['woldo', 'tortoise-board', 'judge-scepter', 'phoenix-mirror', 'gold-norigae', 'dragon-scale'], req: { ep: 's2e02' } },
  {
    kind: 'field', id: 'lantern-field', name: '붉은 등 거리', desc: '정보와 술과 칼이 오가는 밤거리.', bg: 'pleasure', levels: [29, 36],
    foes: [F('여우 가면', 'grunt/pleasure', 'guard'), F('기방 첩자', 'grunt/pleasure-2', 'stun'), F('취한 문지기', 'grunt/pleasure-3', 'strike'), F('밤거리 도박꾼', 'grunt/backhill-2', 'weaken')], req: { ep: 's2e02' },
  },
  {
    kind: 'dungeon', id: 'gambling-den', name: '지하 도박장', desc: '홍매에게 빚진 이들이 마지막 판을 거는 곳.', bg: 'gambling',
    pool: [F('밤거리 도박꾼', 'grunt/backhill-2', 'weaken'), F('취한 문지기', 'grunt/pleasure-3', 'strike'), F('기방 첩자', 'grunt/pleasure-2', 'stun')],
    floors: [{ name: '투전판', level: 30, battles: 2 }, { name: '골패판', level: 31, battles: 2, chest: { coin: 9000 } }, { name: '큰 판', level: 32, battles: 2, chest: { item: 'coral-hairpin' } }, { name: '주인의 단상', level: 33, battles: 1 }],
    boss: { name: '도박장 주인', art: 'boss/dobak', weak: 'stun', line: '빚도 판돈이지요. 나리, 한 판 하시겠소?', drop: 'loaded-dice' }, req: { ep: 's2e02' },
  },
  {
    kind: 'dungeon', id: 'hongdeung', name: '홍등루', desc: '붉은 여우 홍매의 집. 층마다 홀림이 깔려 있다.', bg: 'pleasure',
    pool: [F('여우 가면', 'grunt/pleasure', 'guard'), F('기방 첩자', 'grunt/pleasure-2', 'stun'), F('홍등루 문지기', 'grunt/pleasure-3', 'strike')],
    floors: [
      { name: '1층 연회장', level: 32, battles: 2 }, { name: '2층 휘장 복도', level: 33, battles: 2, chest: { coin: 10000 } },
      { name: '3층 거울방', level: 34, battles: 2, chest: { item: 'woldo' } }, { name: '4층 향 피우는 방', level: 35, battles: 2 }, { name: '꼭대기 방 앞', level: 36, battles: 1 },
    ],
    boss: { name: '홍매의 그림자', art: 'boss/hongmae-shadow', weak: 'guard', line: '진짜 나는 위에 있어. 여기선 그림자랑 놀아.', drop: 'fox-talisman' }, req: { ep: 's2e03' },
  },

  // ───────── 2부 마른 수로 ─────────
  {
    kind: 'dungeon', id: 'water-gate', name: '용궁 수문', desc: '닫힌 수문 아래 용궁으로 이어지는 물길. 뇌물 받은 수문장이 지킨다.', bg: 'waterway',
    pool: [F('용궁 병사', 'grunt/yonggung', 'stun'), F('용궁 물 시녀', 'grunt/yonggung-2', 'guard'), F('뇌물 받은 수문지기', 'grunt/ferry-3', 'weaken')],
    floors: [
      { name: '마른 수로 바닥', level: 36, battles: 2 }, { name: '산호 계단', level: 37, battles: 2, chest: { item: 'gold-norigae' } },
      { name: '물길 회랑', level: 38, battles: 2 }, { name: '수문 앞 광장', level: 39, battles: 2, chest: { coin: 20000 } }, { name: '수문장의 자리', level: 40, battles: 1 },
    ],
    boss: { name: '뇌물 받은 수문장', art: 'boss/sumun', weak: 'stun', line: '공주님 명이라 했소. 엽전 소리가 공주님 목소리요.', drop: 'coral-trident' }, req: { ep: 's2e05' },
  },

  // ───────── 2부 북방 ─────────
  { kind: 'town', id: 'north-town', name: '북방 객주', desc: '눈보라를 피해 상인이 모이는 마지막 객주. 귀한 물건이 있다.', shop: ['dragon-glaive', 'crow-fan', 'royal-seal', 'fox-ornament', 'phoenix-hairpin', 'seven-norigae'], req: { ep: 's2e06' } },
  {
    kind: 'field', id: 'snow-field', name: '북방 설원', desc: '눈보라 속에 흑운채 강경파가 숨어 있다.', bg: 'north', levels: [39, 47],
    foes: [F('설원 척후', 'grunt/north', 'rally'), F('설원 궁수', 'grunt/north-2', 'guard'), F('친위대 도깨비', 'grunt/north-3', 'strike'), F('얼어붙은 광부', 'grunt/cave', 'stun')], req: { ep: 's2e05' },
  },
  {
    kind: 'dungeon', id: 'blackcloud-keep', name: '흑운채 본진', desc: '검은 바람의 강경파가 틀어쥔 산채 본진.', bg: 'north',
    pool: [F('설원 척후', 'grunt/north', 'rally'), F('설원 궁수', 'grunt/north-2', 'guard'), F('친위대 도깨비', 'grunt/north-3', 'strike'), F('무기고 광부', 'grunt/cave', 'stun')],
    floors: [
      { name: '목책 앞', level: 41, battles: 2 }, { name: '눈 덮인 마당', level: 42, battles: 2, chest: { coin: 25000 } }, { name: '병영', level: 43, battles: 2 },
      { name: '무기고', level: 44, battles: 2, chest: { item: 'dragon-scale' } }, { name: '큰 마루 앞', level: 44, battles: 2 }, { name: '큰 마루', level: 45, battles: 1 },
    ],
    boss: { name: '흑운채 친위대장', art: 'boss/chinwi', weak: 'rally', line: '두목께서 오실 때까지 이 마루는 아무도 못 지난다.', drop: 'guard-glaive' }, req: { ep: 's2e06' },
  },

  // ───────── 2부 궁궐 ─────────
  {
    kind: 'dungeon', id: 'palace-passage', name: '궁궐 비밀 통로', desc: '송 대감의 사병이 궁궐 안으로 드나든 비밀 통로.', bg: 'palace',
    pool: [F('매수된 금군', 'grunt/palace', 'strike'), F('궁녀 첩자', 'grunt/palace-2', 'stun'), F('송씨 사병', 'grunt/alley', 'rally')],
    floors: [{ name: '담장 밑 굴', level: 45, battles: 2 }, { name: '등불 꺼진 회랑', level: 46, battles: 2, chest: { item: 'phoenix-hairpin' } }, { name: '창고 뒤 마당', level: 47, battles: 2 }, { name: '사병장의 진', level: 48, battles: 1 }],
    boss: { name: '송씨 사병장', art: 'boss/sabyeong', weak: 'weaken', line: '대감의 빚은 칼로 받는 법이다.', drop: 'general-sword' }, req: { ep: 's2e07' },
  },
  {
    kind: 'dungeon', id: 'underworld-gate', name: '저승 문턱', desc: '선왕의 혼이 서 있는 저승 문 앞. 명부에서 풀려난 원귀들이 떠돈다.', bg: 'underworld',
    pool: [F('저승 졸개', 'grunt/underworld', 'guard'), F('사슬 든 저승 졸개', 'grunt/underworld', 'rally'), F('여우 가면 원혼', 'grunt/pleasure', 'stun')],
    floors: [
      { name: '검은 강가', level: 50, battles: 2 }, { name: '푸른 등불 다리', level: 51, battles: 2, chest: { item: 'seven-norigae' } },
      { name: '안개 숲', level: 52, battles: 2 }, { name: '명부 서고', level: 54, battles: 2, chest: { coin: 60000 } }, { name: '저승 문 앞', level: 55, battles: 1 },
    ],
    boss: { name: '명부의 원귀', art: 'boss/wongwi', weak: 'guard', line: '내 이름도 지워졌어요. 당신 이름도 지워 줄까요?', drop: 'ghost-lantern' }, req: { ep: 's2e08' },
  },

  // ───────── 3부 하늘 ─────────
  { kind: 'town', id: 'temple-town', name: '천문산 산사', desc: '하늘 사다리 밑의 마지막 절. 스님들이 구름길 나그네에게 물건을 판다.', shop: ['cloud-spear', 'star-chart', 'heaven-tablet', 'moon-mirror', 'star-norigae', 'cloud-pouch'], req: { ep: 's3e01' } },
  {
    kind: 'field', id: 'cloud-field', name: '구름재', desc: '하늘 사다리로 오르는 구름 고갯길. 집달 사자들이 길목을 지킨다.', bg: 'skyroad', levels: [52, 60],
    foes: [F('구름 집달 사자', 'grunt/sky', 'stun'), F('사다리 학 수비병', 'grunt/sky-2', 'guard'), F('떠도는 별 그림자', 'grunt/underworld', 'weaken')], req: { ep: 's3e01' },
  },
  {
    kind: 'dungeon', id: 'observatory', name: '천문대 폐허', desc: '선왕이 하늘에 비를 빌던 옛 천문대. 별지기의 혼이 아직 하늘을 잰다.', bg: 'observatory',
    pool: [F('구름 집달 사자', 'grunt/sky', 'stun'), F('사다리 학 수비병', 'grunt/sky-2', 'guard'), F('떠도는 별 그림자', 'grunt/underworld', 'weaken')],
    floors: [{ name: '무너진 돌계단', level: 54, battles: 2 }, { name: '청동 혼천의 방', level: 55, battles: 2, chest: { item: 'star-norigae' } }, { name: '별 그림 회랑', level: 57, battles: 2 }, { name: '별지기의 관측대', level: 58, battles: 1 }],
    boss: { name: '별지기', art: 'boss/byeoljigi', weak: 'weaken', line: '선왕은 이 자리에서 비를 빌었소. 값은 아직 아무도 안 치렀지.', drop: 'star-armillary' }, req: { ep: 's3e01' },
  },
  { kind: 'town', id: 'galaxy-town', name: '은하 나루 장', desc: '은하수 나루에 서는 하늘 장. 별비단과 까치 깃이 흔하다.', shop: ['thunder-halberd', 'magpie-fan', 'heaven-seal', 'starsilk-fan', 'thunder-ring', 'magpie-hairpin'], req: { ep: 's3e03' } },
  {
    kind: 'field', id: 'galaxy-field', name: '은하수 강변', desc: '별빛이 물처럼 흐르는 강변. 뱃사공과 까막까치가 나그네를 시험한다.', bg: 'galaxy', levels: [58, 66],
    foes: [F('은하 뱃사공', 'grunt/galaxy', 'guard'), F('까막까치 병사', 'grunt/galaxy-2', 'strike'), F('사다리 학 수비병', 'grunt/sky-2', 'rally')], req: { ep: 's3e03' },
  },
  {
    kind: 'dungeon', id: 'magpie-bridge', name: '오작교', desc: '견우와 직녀가 만나던 다리. 먹구름이 다리를 끊고 까마귀 떼를 풀었다.', bg: 'galaxy',
    pool: [F('까막까치 병사', 'grunt/galaxy-2', 'strike'), F('은하 뱃사공', 'grunt/galaxy', 'guard'), F('먹구름의 서리', 'grunt/heaven', 'stun')],
    floors: [
      { name: '다리 어귀', level: 60, battles: 2 }, { name: '끊어진 첫 마디', level: 61, battles: 2, chest: { item: 'thunder-ring' } },
      { name: '까치 둥지 난간', level: 62, battles: 2 }, { name: '은하 한가운데', level: 64, battles: 2, chest: { coin: 150000 } }, { name: '까마귀 대장의 자리', level: 65, battles: 1 },
    ],
    boss: { name: '까마귀 대장', art: 'boss/kkamagwi', weak: 'guard', line: '다리는 끊겨야 값이 오르지. 건너려면 통행세를 내라.', drop: 'crow-saber' }, req: { ep: 's3e03' },
  },
  { kind: 'town', id: 'heaven-town', name: '천상 저자', desc: '하늘 관청 앞 저잣거리. 값은 하늘 높은 줄 모른다.', shop: ['sky-sword', 'galaxy-abacus', 'law-brush', 'weaver-shuttle', 'heaven-norigae', 'jade-talisman'], req: { ep: 's3e05' } },
  {
    kind: 'field', id: 'garden-field', name: '천상 정원', desc: '구름 위에 가꾼 정원. 관청 사람들이 산책하다 불쑥 시비를 건다.', bg: 'jade', levels: [64, 72],
    foes: [F('먹구름의 서리', 'grunt/heaven', 'stun'), F('금빛 문지기', 'grunt/jade', 'guard'), F('뇌병', 'grunt/heaven-2', 'rally'), F('불의 정령', 'grunt/fire', 'weaken')], req: { ep: 's3e05' },
  },
  {
    kind: 'dungeon', id: 'ledger-archive', name: '하늘 장부각', desc: '하늘의 모든 빚이 적힌 장부 창고. 먹구름의 서리들이 지킨다.', bg: 'archive',
    pool: [F('먹구름의 서리', 'grunt/heaven', 'stun'), F('장부를 태우는 불의 정령', 'grunt/fire', 'weaken'), F('금빛 문지기', 'grunt/jade', 'guard')],
    floors: [
      { name: '열람실', level: 66, battles: 2 }, { name: '이자 장부 서고', level: 67, battles: 2 }, { name: '봉인된 계약 서가', level: 68, battles: 2, chest: { item: 'magpie-hairpin' } },
      { name: '불탄 기록실', level: 69, battles: 2, chest: { coin: 250000 } }, { name: '서리장의 책상', level: 70, battles: 1 },
    ],
    boss: { name: '장부각 서리장', art: 'boss/seorijang', weak: 'stun', line: '장부에 없으면 없는 일이오. 장부에 있으면? 당연히 갚아야지.', drop: 'clerk-abacus' }, req: { ep: 's3e05' },
  },
  {
    kind: 'dungeon', id: 'thunder-shrine', name: '뇌공 신전', desc: '하늘의 집행을 맡은 뇌공의 신전. 북이 울릴 때마다 땅에 벼락이 떨어진다.', bg: 'thunder',
    pool: [F('뇌병', 'grunt/heaven-2', 'rally'), F('구름 집달 사자', 'grunt/sky', 'stun'), F('사다리 학 수비병', 'grunt/sky-2', 'guard')],
    floors: [
      { name: '젖은 돌길', level: 68, battles: 2 }, { name: '번개 맞은 회랑', level: 69, battles: 2, chest: { item: 'heaven-norigae' } },
      { name: '북 치는 뜰', level: 70, battles: 2 }, { name: '벼락 제단', level: 71, battles: 2 }, { name: '천둥 북 앞', level: 72, battles: 1 },
    ],
    boss: { name: '천둥 북 수호신', art: 'boss/cheondung', weak: 'rally', line: '북이 울리면 장부가 집행된다. 네 이름도 울려 주마.', drop: 'thunder-drumstick' }, req: { ep: 's3e06' },
  },
  {
    kind: 'field', id: 'edge-field', name: '하늘 끝 벼랑', desc: '구름이 끝나는 벼랑. 쫓겨난 천병과 장부의 불씨가 떠돈다.', bg: 'abyss', levels: [72, 85],
    foes: [F('금빛 천병', 'grunt/jade', 'guard'), F('뇌병', 'grunt/heaven-2', 'rally'), F('불의 정령', 'grunt/fire', 'weaken'), F('구름 집달 사자', 'grunt/sky', 'stun')], req: { ep: 's3e07' },
  },
  {
    kind: 'dungeon', id: 'jade-palace', name: '옥황궁 회랑', desc: '옥황상제의 궁으로 가는 마지막 회랑. 금빛 천병들이 늘어서 있다.', bg: 'jade',
    pool: [F('금빛 천병', 'grunt/jade', 'guard'), F('뇌병', 'grunt/heaven-2', 'rally'), F('먹구름의 서리', 'grunt/heaven', 'weaken')],
    floors: [
      { name: '백옥 계단', level: 72, battles: 2 }, { name: '금빛 회랑', level: 73, battles: 2 }, { name: '구름 다리', level: 74, battles: 2, chest: { item: 'jade-talisman' } },
      { name: '어좌 앞 뜰', level: 75, battles: 2 }, { name: '천장의 문', level: 76, battles: 1 },
    ],
    boss: { name: '금빛 천장', art: 'boss/geumcheonjang', weak: 'guard', line: '이 문 너머는 하늘의 법정이다. 빚진 자는 무릎으로 들어간다.', drop: 'light-sword' }, req: { ep: 's3e07' },
  },
  {
    kind: 'dungeon', id: 'sky-abyss', name: '하늘 끝 무저갱', desc: '하늘이 끝나는 벼랑 아래. 지워진 빚과 버려진 장부가 먹구름이 되어 고였다.', bg: 'abyss',
    pool: [F('장부 불의 정령', 'grunt/fire', 'weaken'), F('금빛 천병의 망령', 'grunt/jade', 'guard'), F('뇌병의 망령', 'grunt/heaven-2', 'rally'), F('저승 졸개', 'grunt/underworld', 'stun')],
    floors: [
      { name: '부서진 옥기둥', level: 78, battles: 2 }, { name: '떠도는 장부', level: 79, battles: 2, chest: { coin: 400000 } }, { name: '먹구름 소용돌이', level: 81, battles: 2 },
      { name: '지워진 이름들의 골짜기', level: 82, battles: 2, chest: { item: 'heaven-norigae' } }, { name: '바닥 없는 길', level: 84, battles: 2 }, { name: '먹구름의 본체', level: 85, battles: 1 },
    ],
    boss: { name: '먹구름의 본체', art: 'boss/meokgureum', weak: 'stun', line: '빚은 지워지지 않아. 먹구름이 될 뿐이지.', drop: 'storm-brush' }, req: { ep: 's3e08' },
  },
];

// 식객 개인 퀘스트(content/quests.json)와 만남(content/meets.json: 끝내면 합류)
NODES.push(...(quests as QuestDef[]), ...(meets as QuestDef[]));

export const NODE_BY_ID: Record<string, NodeDef> = Object.fromEntries(NODES.map((n) => [n.id, n]));

/** 부 이름 */
export const PART_NAMES: Record<number, string> = { 1: '달골 편', 2: '한빛성 편', 3: '하늘의 빚' };

export const REGIONS: RegionDef[] = [
  { id: 'dalgol', part: 1, name: '달골', desc: '방망이를 주운 산골 마을과 뒷산, 그리고 송씨 창고.', path: ['ep:s1e01', 'dalgol-town', 'backhill-field', 'ep:s1e02', 'bandit-cave', 'm:seorin', 'ep:s1e03', 'ep:s1e04', 'q:baekseol', 'ep:s1e05', 'song-cellar'] },
  { id: 'ferry', part: 1, name: '강나루', desc: '곡식이 배로 빠져나간 강. 밀수 상단 독사의 본거지.', path: ['ferry-town', 'm:danhui', 'reed-field', 'ep:s1e06', 'q:sodam', 'smuggler-ship'] },
  { id: 'blackcloud', part: 1, name: '흑운채 고갯길', desc: '도깨비 산채와 송씨의 무기 길, 그리고 상류 별창.', path: ['pass-field', 'ep:s1e07', 'q:muyeong', 'weapon-cave', 'm:bulsae', 'ep:s1e08', 'upstream-granary', 'gwana-town', 'ep:s1e09', 'ep:s1e10'] },
  { id: 'capital', part: 2, name: '한빛성', desc: '왕실 채권 한 장 때문에 불려 온 도성.', path: ['capital-town', 'ep:s2e01', 'q:oryeon', 'q:danhui', 'alley-field', 'silk-warehouse', 'ep:s2e02', 'q:geumyeong', 'q:haeryun'] },
  { id: 'redlantern', part: 2, name: '붉은 등 거리', desc: '정보를 사고파는 여우들의 거리.', path: ['lantern-town', 'lantern-field', 'gambling-den', 'ep:s2e03', 'q:yeonhwa', 'hongdeung', 'ep:s2e04'] },
  { id: 'waterway', part: 2, name: '마른 수로', desc: '용궁이 닫아 버린 도성의 물길.', path: ['ep:s2e05', 'q:haejin', 'q:bari', 'q:bulsae', 'water-gate'] },
  { id: 'north', part: 2, name: '북방', desc: '눈보라 너머 흑운채 본진.', path: ['snow-field', 'ep:s2e06', 'q:seorin', 'north-town', 'blackcloud-keep'] },
  { id: 'palace', part: 2, name: '궁궐', desc: '어전 심리와 비밀 통로, 그리고 저승 문턱.', path: ['ep:s2e07', 'palace-passage', 'ep:s2e08', 'q:cheongyeon', 'q:wolha', 'underworld-gate'] },
  { id: 'heaven-mountain', part: 3, name: '천문산', desc: '하늘 사다리가 내려오는 산. 선왕이 비를 빌던 천문대가 있다.', path: ['ep:s3e01', 'temple-town', 'cloud-field', 'observatory', 'ep:s3e02', 'q2:cheongyeon'] },
  { id: 'galaxy', part: 3, name: '은하수', desc: '별빛이 강이 되어 흐르는 하늘 나루와 끊어진 오작교.', path: ['ep:s3e03', 'galaxy-town', 'galaxy-field', 'magpie-bridge', 'ep:s3e04', 'q:yunseul'] },
  { id: 'heaven-office', part: 3, name: '하늘 관청', desc: '하늘의 모든 빚을 적고 집행하는 관청과 장부각, 뇌공의 신전.', path: ['ep:s3e05', 'heaven-town', 'garden-field', 'ledger-archive', 'ep:s3e06', 'q2:bulsae', 'q:beori', 'thunder-shrine', 'ep:s3e07'] },
  { id: 'jade-throne', part: 3, name: '옥좌', desc: '옥황상제의 법정, 그리고 하늘이 끝나는 무저갱.', path: ['q2:wolha', 'edge-field', 'jade-palace', 'ep:s3e08', 'q2:baekseol', 'sky-abyss'] },
];
