import type { StatKey, Stats } from '../core/types';

// 장비. 식객마다 무기·장신구 한 칸씩, 누구나 아무거나 낄 수 있다.
// 무기는 능력치를 더하고(주 능력치 크게, 보조 작게), 장신구는 특수 효과를 준다.
// 단계(tier)는 대략 '8 × 단계' 레벨쯤에 맞춘다. 상점 값은 그때의 엽전 수입에 맞춘다.

export type Slot = 'weapon' | 'trinket';
export type ItemIcon = 'club' | 'sword' | 'fan' | 'abacus' | 'brush' | 'seal' | 'mirror' | 'norigae' | 'ring' | 'pouch' | 'hairpin' | 'charm' | 'pearl' | 'feather';

export interface ItemDef {
  id: string;
  name: string;
  slot: Slot;
  tier: number;
  icon: ItemIcon;
  /** 상점 값(없으면 상점에서 팔지 않는다) */
  price?: number;
  desc: string;
  /** 무기: 더하는 능력치 */
  stats?: Partial<Stats>;
  /** 장신구 효과: 모든 능력치 %, 체력 %, 기술 피해 %, 치명타 확률, 약점 배율 더하기, 경험치 % */
  pct?: number;
  hp?: number;
  skill?: number;
  crit?: number;
  weak?: number;
  exp?: number;
  /** 이 식객이 끼면 효과가 1.5배 */
  owner?: string;
}

/** 단계별 무기 주 능력치와 값 */
const MAIN = [0, 40, 75, 110, 150, 190, 235, 285];
const PRICE = [0, 600, 2400, 7000, 18000, 45000, 100000, 0];

function weapon(id: string, name: string, tier: number, icon: ItemIcon, main: StatKey, sub: StatKey, desc: string, sold = true): ItemDef {
  return { id, name, slot: 'weapon', tier, icon, desc, stats: { [main]: MAIN[tier], [sub]: Math.round(MAIN[tier] / 3) }, ...(sold ? { price: PRICE[tier] } : {}) };
}

export const ITEMS: ItemDef[] = [
  // 무력
  weapon('oak-club', '참나무 몽둥이', 1, 'club', 'might', 'charm', '나무꾼 시절 손에 익은 무게.'),
  weapon('iron-flail', '쇠도리깨', 2, 'club', 'might', 'politics', '타작하듯 내리친다.'),
  weapon('goblin-club', '도깨비 쇠방망이', 3, 'club', 'might', 'wit', '도깨비 대장간에서 두드린 방망이.'),
  weapon('hwando', '환도', 4, 'sword', 'might', 'politics', '관군이 차는 곧은 칼.'),
  weapon('woldo', '월도', 5, 'sword', 'might', 'charm', '반달 모양 날이 달린 긴 칼.'),
  weapon('dragon-glaive', '청룡 언월도', 6, 'sword', 'might', 'wit', '용 무늬가 새겨진 큰 칼.'),
  // 지략
  weapon('bamboo-fan', '대나무 부채', 1, 'fan', 'wit', 'charm', '바람보다 말을 일으키는 부채.'),
  weapon('brass-abacus', '놋쇠 주판', 2, 'abacus', 'wit', 'politics', '알이 굴러가는 소리에 상대가 긴장한다.'),
  weapon('silk-fan', '비단 부채', 3, 'fan', 'wit', 'charm', '펴면 꽃, 접으면 칼.'),
  weapon('secret-book', '비밀 서책', 4, 'abacus', 'wit', 'might', '아무도 안 읽은 병법이 적혀 있다.'),
  weapon('tortoise-board', '귀갑 점판', 5, 'abacus', 'wit', 'politics', '거북 등딱지로 만든 셈판.'),
  weapon('crow-fan', '삼족오 깃털 부채', 6, 'feather', 'wit', 'charm', '해를 품은 새의 깃털.'),
  // 정치
  weapon('plain-brush', '붓 한 자루', 1, 'brush', 'politics', 'wit', '서명 한 줄이 칼보다 무겁다.'),
  weapon('office-seal', '관인', 2, 'seal', 'politics', 'might', '찍는 순간 일이 정해진다.'),
  weapon('jade-brush', '옥 붓', 3, 'brush', 'politics', 'charm', '먹이 마르지 않는 붓.'),
  weapon('royal-tally', '어사 마패', 4, 'seal', 'politics', 'wit', '들어 올리면 모두가 엎드린다.'),
  weapon('judge-scepter', '판관의 홀', 5, 'seal', 'politics', 'might', '해태 뿔을 깎아 만든 홀.'),
  weapon('royal-seal', '왕실 인장', 6, 'seal', 'politics', 'charm', '해를 두른 용이 새겨진 인장.'),
  // 매력
  weapon('hand-mirror', '손거울', 1, 'mirror', 'charm', 'wit', '웃는 얼굴을 먼저 비춰 준다.'),
  weapon('silk-kerchief', '비단 손수건', 2, 'fan', 'charm', 'politics', '흔들면 눈길이 따라온다.'),
  weapon('pearl-vanity', '자개 경대', 3, 'mirror', 'charm', 'might', '자개가 등잔빛에 일렁인다.'),
  weapon('coral-fan', '붉은 산호 부채', 4, 'fan', 'charm', 'wit', '바닷속 산호로 살을 댄 부채.'),
  weapon('phoenix-mirror', '봉황 거울', 5, 'mirror', 'charm', 'politics', '보는 이의 마음까지 비친다.'),
  weapon('fox-ornament', '아홉 꼬리 장식', 6, 'charm', 'charm', 'might', '여우 꼬리털로 엮은 장식.'),

  // 장신구(상점·보물상자)
  { id: 'luck-pouch', name: '복주머니', slot: 'trinket', tier: 1, icon: 'pouch', price: 400, exp: 0.1, desc: '경험치 +10%' },
  { id: 'wood-norigae', name: '나무 노리개', slot: 'trinket', tier: 1, icon: 'norigae', price: 500, pct: 0.04, desc: '모든 능력치 +4%' },
  { id: 'mugwort-pouch', name: '쑥향 주머니', slot: 'trinket', tier: 2, icon: 'pouch', price: 1600, hp: 0.15, desc: '체력 +15%' },
  { id: 'silver-ring', name: '은가락지', slot: 'trinket', tier: 2, icon: 'ring', price: 1800, crit: 0.05, desc: '치명타 확률 +5%' },
  { id: 'jade-norigae', name: '옥 노리개', slot: 'trinket', tier: 3, icon: 'norigae', price: 5000, pct: 0.08, desc: '모든 능력치 +8%' },
  { id: 'talisman-pouch', name: '부적 주머니', slot: 'trinket', tier: 3, icon: 'charm', price: 4600, skill: 0.2, desc: '기술 피해 +20%' },
  { id: 'coral-hairpin', name: '산호 비녀', slot: 'trinket', tier: 4, icon: 'hairpin', price: 12000, weak: 0.3, desc: '약점 배율 +0.3' },
  { id: 'tiger-claw', name: '호랑이 발톱', slot: 'trinket', tier: 4, icon: 'charm', price: 13000, crit: 0.1, desc: '치명타 확률 +10%' },
  { id: 'gold-norigae', name: '금 노리개', slot: 'trinket', tier: 5, icon: 'norigae', price: 32000, pct: 0.12, desc: '모든 능력치 +12%' },
  { id: 'dragon-scale', name: '용 비늘 부적', slot: 'trinket', tier: 5, icon: 'charm', price: 30000, hp: 0.3, desc: '체력 +30%' },
  { id: 'phoenix-hairpin', name: '봉황 비녀', slot: 'trinket', tier: 6, icon: 'hairpin', price: 70000, skill: 0.4, desc: '기술 피해 +40%' },
  { id: 'seven-norigae', name: '칠보 노리개', slot: 'trinket', tier: 6, icon: 'norigae', price: 75000, pct: 0.16, desc: '모든 능력치 +16%' },

  // 대장이 떨어뜨리는 고유 장비(팔지 않음)
  weapon('chief-club', '고개 두목의 철 몽둥이', 2, 'club', 'might', 'charm', '통행세를 뜯던 몽둥이. 묵직하다.', false),
  { id: 'warehouse-keys', name: '창고 열쇠 꾸러미', slot: 'trinket', tier: 2, icon: 'charm', weak: 0.25, pct: 0.03, desc: '약점 배율 +0.25, 모든 능력치 +3%' },
  weapon('viper-abacus', '독사의 주판', 3, 'abacus', 'wit', 'politics', '알마다 독이 발린 주판.', false),
  weapon('forge-hammer', '도깨비 대장장이 망치', 4, 'club', 'might', 'politics', '무기 동굴 깊은 곳의 망치.', false),
  weapon('red-tassel-spear', '붉은 술 장창', 4, 'sword', 'might', 'wit', '별창 사병장의 창.', false),
  { id: 'shadow-veil', name: '그림자 면사포', slot: 'trinket', tier: 4, icon: 'charm', crit: 0.12, pct: 0.04, desc: '치명타 확률 +12%, 모든 능력치 +4%' },
  { id: 'loaded-dice', name: '속임수 주사위', slot: 'trinket', tier: 5, icon: 'pearl', crit: 0.1, exp: 0.15, desc: '치명타 확률 +10%, 경험치 +15%' },
  weapon('fox-talisman', '여우불 부적', 5, 'charm', 'charm', 'wit', '홍매의 그림자가 남긴 부적.', false),
  weapon('coral-trident', '산호 삼지창', 6, 'sword', 'might', 'politics', '용궁 수문장의 삼지창.', false),
  weapon('guard-glaive', '친위대장의 언월도', 7, 'sword', 'might', 'charm', '흑운채 친위대장의 큰 칼.', false),
  weapon('general-sword', '사병장의 장검', 7, 'sword', 'might', 'politics', '송씨 사병장의 곧은 장검.', false),
  { id: 'ghost-lantern', name: '원귀의 푸른 등', slot: 'trinket', tier: 7, icon: 'pearl', pct: 0.18, skill: 0.25, desc: '모든 능력치 +18%, 기술 피해 +25%' },

  // 식객 개인 퀘스트 보상(그 식객이 끼면 1.5배)
  { id: 'fox-bead', name: '여우 구슬', slot: 'trinket', tier: 4, icon: 'pearl', owner: 'baekseol', pct: 0.08, skill: 0.25, desc: '모든 능력치 +8%, 기술 피해 +25% · 백설이 끼면 1.5배' },
  { id: 'clear-teacup', name: '맑은 찻잔', slot: 'trinket', tier: 4, icon: 'charm', owner: 'muyeong', hp: 0.25, crit: 0.08, desc: '체력 +25%, 치명타 +8% · 무영이 끼면 1.5배' },
  { id: 'snail-shell', name: '우렁 껍데기', slot: 'trinket', tier: 4, icon: 'pearl', owner: 'sodam', exp: 0.2, hp: 0.2, desc: '경험치 +20%, 체력 +20% · 소담이 끼면 1.5배' },
  { id: 'haetae-bell', name: '해태 방울', slot: 'trinket', tier: 4, icon: 'charm', owner: 'haeryun', weak: 0.35, pct: 0.05, desc: '약점 배율 +0.35, 모든 능력치 +5% · 해륜이 끼면 1.5배' },
  { id: 'crow-gold', name: '삼족오 금표', slot: 'trinket', tier: 4, icon: 'charm', owner: 'oryeon', pct: 0.07, crit: 0.08, desc: '모든 능력치 +7%, 치명타 +8% · 오련이 끼면 1.5배' },
  { id: 'endless-fan', name: '끝나지 않는 부채', slot: 'trinket', tier: 4, icon: 'fan', owner: 'yeonhwa', skill: 0.3, pct: 0.05, desc: '기술 피해 +30%, 모든 능력치 +5% · 연화가 끼면 1.5배' },
  { id: 'ember', name: '식지 않는 불씨', slot: 'trinket', tier: 4, icon: 'pearl', owner: 'bulsae', crit: 0.1, skill: 0.2, desc: '치명타 +10%, 기술 피해 +20% · 불새가 끼면 1.5배' },
  { id: 'folded-robe', name: '접은 날개옷', slot: 'trinket', tier: 4, icon: 'feather', owner: 'cheongyeon', hp: 0.22, pct: 0.06, desc: '체력 +22%, 모든 능력치 +6% · 청연이 끼면 1.5배' },
  { id: 'tiger-pass', name: '백호 통행패', slot: 'trinket', tier: 4, icon: 'seal', owner: 'seorin', crit: 0.08, hp: 0.2, desc: '치명타 +8%, 체력 +20% · 서린이 끼면 1.5배' },
  { id: 'shadow-silk', name: '그림자 비단', slot: 'trinket', tier: 4, icon: 'charm', owner: 'geumyeong', crit: 0.12, weak: 0.2, desc: '치명타 +12%, 약점 배율 +0.2 · 금영이 끼면 1.5배' },
  { id: 'memory-hat', name: '기억의 감투', slot: 'trinket', tier: 4, icon: 'charm', owner: 'danhui', exp: 0.22, pct: 0.05, desc: '경험치 +22%, 모든 능력치 +5% · 단희가 끼면 1.5배' },
  { id: 'palace-pearl', name: '용궁 진주', slot: 'trinket', tier: 4, icon: 'pearl', owner: 'haejin', hp: 0.3, skill: 0.15, desc: '체력 +30%, 기술 피해 +15% · 해진이 끼면 1.5배' },
  { id: 'ledger-brand', name: '명부 낙인', slot: 'trinket', tier: 4, icon: 'seal', owner: 'wolha', weak: 0.35, crit: 0.08, desc: '약점 배율 +0.35, 치명타 +8% · 월하가 끼면 1.5배' },
  { id: 'life-bell', name: '생명수 방울', slot: 'trinket', tier: 4, icon: 'charm', owner: 'bari', hp: 0.28, exp: 0.12, desc: '체력 +28%, 경험치 +12% · 바리가 끼면 1.5배' },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** 효과를 한 줄로(목록·상점에 쓴다) */
export function itemEffect(item: ItemDef): string {
  if (item.slot === 'trinket') return item.desc;
  const LABEL: Record<StatKey, string> = { might: '무력', wit: '지략', politics: '정치', charm: '매력' };
  return Object.entries(item.stats ?? {})
    .map(([k, v]) => `${LABEL[k as StatKey]} +${v}`)
    .join(' · ');
}
