import type { ComboDef, GiftDef, WorkplaceDef } from '../core/types';

// 고을의 일터. 식객을 배치하면 그 식객의 능력치만큼 자원이 저절로 들어온다.
export const WORKPLACES: WorkplaceDef[] = [
  { id: 'market', name: '저잣거리', stat: 'wit', produces: 'coin', perStat: 0.2, flavor: '지략이 뛰어난 식객이 상단을 굴린다' },
  { id: 'woodyard', name: '훈련장', stat: 'might', produces: 'coin', perStat: 0.15, flavor: '무력이 높은 식객이 호위 일을 맡아 벌어 온다' },
  { id: 'field', name: '논밭', stat: 'politics', produces: 'grain', perStat: 0.08, flavor: '정치에 밝은 식객이 소작과 세곡을 다스린다' },
  { id: 'tavern', name: '주막', stat: 'charm', produces: 'fame', perStat: 0.0003, flavor: '매력 있는 식객이 손님과 소문을 끈다' },
];

export const WORKPLACE_BY_ID = Object.fromEntries(WORKPLACES.map((w) => [w.id, w])) as Record<WorkplaceDef['id'], WorkplaceDef>;

/** 같은 일터에 함께 두면 생산량이 오르는 짝꿍 */
export const COMBOS: ComboDef[] = [
  { id: 'blades', pair: ['muyeong', 'seorin'], title: '새벽 대련', text: '무영과 서린이 새벽마다 칼을 맞댄다. 구경꾼이 몰리니 호위 의뢰도 따라 늘었다.' },
  { id: 'fox-trade', pair: ['baekseol', 'danhui'], title: '여우와 장사꾼', text: '백설과 단희가 손님의 속마음을 두고 내기를 건다. 이긴 쪽은 없고 주막 돈궤만 무거워진다.' },
  { id: 'ledger', pair: ['sodam', 'haeryun'], title: '장부와 법전', text: '소담의 장부에 해륜의 법전이 더해지자 세곡이 한 톨도 새지 않는다.' },
  { id: 'shadow-rite', pair: ['geumyeong', 'bari'], title: '그림자와 무녀', text: '금영이 엿들은 비밀을 바리가 점괘로 맞춰 본다. 저잣거리 시세가 손바닥 안이다.' },
  { id: 'fire-death', pair: ['bulsae', 'wolha'], title: '불과 저승길', text: '불새가 지핀 불 앞에서 월하가 처음으로 웃었다. 훈련장 열기가 식을 줄 모른다.' },
  { id: 'sky-sea', pair: ['cheongyeon', 'haejin'], title: '하늘과 바다', text: '선녀와 용왕의 딸이 서로의 고향 자랑을 하다 상단 거래 길을 하나 뚫었다.' },
  { id: 'dance-coin', pair: ['yeonhwa', 'oryeon'], title: '춤과 장삿속', text: '연화의 춤판에 오련이 상단 손님을 끌어온다. 둘 다 서로 손해 봤다고 투덜댄다.' },
];

export const GIFTS: GiftDef[] = [
  { id: 'tteok', name: '떡', cost: 60 },
  { id: 'yeot', name: '엿', cost: 50 },
  { id: 'gotgam', name: '곶감', cost: 70 },
  { id: 'makgeolli', name: '막걸리', cost: 90 },
  { id: 'kkotsin', name: '꽃신', cost: 140 },
  { id: 'norigae', name: '노리개', cost: 160 },
  { id: 'binyeo', name: '비녀', cost: 180 },
  { id: 'mirror', name: '손거울', cost: 150 },
  { id: 'book', name: '서책', cost: 120 },
  { id: 'brush', name: '붓과 먹', cost: 110 },
];

export const GIFT_BY_ID = Object.fromEntries(GIFTS.map((g) => [g.id, g])) as Record<string, GiftDef>;

/** 호감도 단계 이름과 단계에 필요한 점수 */
export const BOND_LEVELS = [
  { name: '서먹함', need: 0 },
  { name: '친해짐', need: 30 },
  { name: '다정함', need: 90 },
  { name: '각별함', need: 200 },
  { name: '마음을 엶', need: 380 },
  { name: '인연', need: 650 },
];
