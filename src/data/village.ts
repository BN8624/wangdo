import type { ComboDef, GiftDef, WorkplaceDef } from '../core/types';

// 고을의 일터. 식객을 배치하면 그 식객의 능력치만큼 자원이 저절로 들어온다.
export const WORKPLACES: WorkplaceDef[] = [
  { id: 'market', name: '장터', stat: 'wit', produces: 'coin', perStat: 2, flavor: '꾀 많은 식객이 흥정을 붙인다' },
  { id: 'woodyard', name: '나무터', stat: 'might', produces: 'coin', perStat: 1.5, flavor: '힘센 식객이 장작을 패서 판다' },
  { id: 'field', name: '논밭', stat: 'craft', produces: 'grain', perStat: 0.8, flavor: '솜씨 좋은 식객이 농사를 짓는다' },
  { id: 'tavern', name: '주막', stat: 'charm', produces: 'fame', perStat: 0.003, flavor: '매력 있는 식객이 손님을 끈다' },
];

export const WORKPLACE_BY_ID = Object.fromEntries(WORKPLACES.map((w) => [w.id, w])) as Record<WorkplaceDef['id'], WorkplaceDef>;

/** 같은 일터에 함께 두면 생산량이 오르는 짝꿍 */
export const COMBOS: ComboDef[] = [
  { id: 'strong', pair: ['dudu', 'kkulkkeok'], title: '힘자랑 대결', text: '두두와 꿀꺽이가 누가 장작을 더 많이 패나 내기를 시작했다. 덕분에 일이 두 배로 빨라졌다!' },
  { id: 'haggle', pair: ['bangul', 'gamtu'], title: '흥정 맞수', text: '방울과 김아씨가 손님 하나를 두고 흥정 솜씨를 겨룬다. 손님은 어리둥절, 돈궤는 두둑.' },
  { id: 'kitchen', pair: ['sora', 'bokdeongi'], title: '부엌 동맹', text: '소라의 손맛에 복덩이의 복이 더해지니, 쌀독이 마를 틈이 없다.' },
  { id: 'reverse', pair: ['geokkuri', 'haechi'], title: '거꾸로 판결', text: '거꾸리가 반대로 말할 때마다 해치가 바로잡는다. 구경꾼이 몰려들었다.' },
  { id: 'sky-water', pair: ['haedoji', 'yongkkum'], title: '하늘과 물', text: '해돋이가 하늘에서 길을 보고, 용꿈이 물길을 낸다. 일이 술술 풀린다.' },
  { id: 'fire-tiger', pair: ['beom', 'gangcheori'], title: '불과 범', text: '추위 타는 강철이가 호야 곁에 붙어 있다. 호야는 귀찮은 척하면서도 꼬리를 덮어 준다.' },
  { id: 'moonlight', pair: ['dalbi', 'seureureu'], title: '달밤 산책', text: '달비가 이야기를 들려주자 스르르가 처음으로 쑥스럽지 않게 웃었다.' },
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
