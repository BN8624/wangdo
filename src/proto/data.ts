// 시제품의 장비·적 무리·식객 이름
import type { FoeGroup, ItemDef, MemberId } from './types';

export const MEMBER_NAME: Record<MemberId, string> = { me: '나', baekseol: '백설', muyeong: '무영', sodam: '소담' };

/** 함께 싸우는 수(주인공 포함). 식객이 이보다 많으면 나머지는 쉬되, 경험치는 똑같이 받는다 */
export const PARTY_MAX = 4;

/** 장터 값: 소담(살림)이 있으면 한 할 깎는다 */
export const priceOf = (price: number, party: { id: MemberId }[]) => (party.some((m) => m.id === 'sodam') ? Math.floor(price * 0.9) : price);

export const ITEMS: Record<string, ItemDef> = {
  oakclub: { id: 'oakclub', name: '참나무 몽둥이', slot: 'weapon', atk: 15, price: 40, desc: '공격 +15%' },
  ironpin: { id: 'ironpin', name: '무쇠 비녀', slot: 'weapon', atk: 12, spd: 4, price: 45, desc: '공격 +12%, 속도 +4' },
  straw: { id: 'straw', name: '새 짚신', slot: 'charm', spd: 8, price: 25, desc: '속도 +8' },
  cotton: { id: 'cotton', name: '무명 띠', slot: 'charm', hp: 12, def: 5, price: 30, desc: '체력 +12%, 방어 +5%' },
  amulet: { id: 'amulet', name: '과부댁 부적', slot: 'charm', def: 15, hp: 8, price: 0, desc: '방어 +15%, 체력 +8%' },
  flail: { id: 'flail', name: '쇠도리깨', slot: 'weapon', atk: 32, price: 0, desc: '공격 +32%' },
  norigae: { id: 'norigae', name: '산호 노리개', slot: 'charm', atk: 10, hp: 10, price: 0, desc: '공격 +10%, 체력 +10%' },
  // 5화부터 장터에 들어오는 물건(엽전이 쌓이기만 하지 않게)
  steelclub: { id: 'steelclub', name: '무쇠 방망이', slot: 'weapon', atk: 26, price: 150, desc: '공격 +26%' },
  jadepin: { id: 'jadepin', name: '옥비녀', slot: 'weapon', atk: 20, spd: 8, price: 170, desc: '공격 +20%, 속도 +8' },
  silkband: { id: 'silkband', name: '비단 허리띠', slot: 'charm', hp: 20, def: 10, price: 140, desc: '체력 +20%, 방어 +10%' },
  mituri: { id: 'mituri', name: '가죽 미투리', slot: 'charm', spd: 14, hp: 6, price: 160, desc: '속도 +14, 체력 +6%' },
  // 7화 강나루 소금 배 상인
  ironfan: { id: 'ironfan', name: '쇠부채', slot: 'weapon', atk: 38, price: 320, desc: '공격 +38%' },
  tigervest: { id: 'tigervest', name: '범가죽 조끼', slot: 'charm', hp: 30, def: 22, price: 300, desc: '체력 +30%, 방어 +22%' },
  // 10화 반환 잔치 장터
  dragonpin: { id: 'dragonpin', name: '용머리 비녀', slot: 'weapon', atk: 34, spd: 10, price: 420, desc: '공격 +34%, 속도 +10' },
  jadering: { id: 'jadering', name: '옥가락지', slot: 'charm', atk: 14, hp: 18, def: 12, price: 380, desc: '공격 +14%, 체력 +18%, 방어 +12%' },
  // 곁이야기에서 받는 것
  foxhair: { id: 'foxhair', name: '여우털 부적', slot: 'charm', atk: 8, hp: 8, spd: 6, price: 0, desc: '공격 +8%, 체력 +8%, 속도 +6' },
  clubcord: { id: 'clubcord', name: '무영의 붉은 끈', slot: 'charm', atk: 10, spd: 5, price: 0, desc: '공격 +10%, 속도 +5' },
  shellchip: { id: 'shellchip', name: '우렁이 껍데기 조각', slot: 'charm', hp: 12, def: 12, price: 0, desc: '체력 +12%, 방어 +12%' },
  redknot: { id: 'redknot', name: '백설의 진홍 실', slot: 'charm', atk: 16, hp: 14, spd: 8, price: 0, desc: '공격 +16%, 체력 +14%, 속도 +8' },
  armorcord: { id: 'armorcord', name: '무영의 갑옷 끈', slot: 'charm', hp: 22, def: 20, price: 0, desc: '체력 +22%, 방어 +20%' },
  // 의뢰 보상(quests.ts)
  oldaxe: { id: 'oldaxe', name: '돌쇠의 손도끼', slot: 'weapon', atk: 18, price: 0, desc: '공격 +18%' },
  dokbell: { id: 'dokbell', name: '도깨비 방울', slot: 'charm', spd: 12, hp: 6, price: 0, desc: '속도 +12, 체력 +6%' },
  scalepin: { id: 'scalepin', name: '저울추 노리개', slot: 'charm', def: 14, hp: 10, price: 0, desc: '방어 +14%, 체력 +10%' },
  pickdagger: { id: 'pickdagger', name: '주인 없는 단도', slot: 'weapon', atk: 22, spd: 8, price: 0, desc: '공격 +22%, 속도 +8' },
  herbpouch: { id: 'herbpouch', name: '약초 주머니', slot: 'charm', hp: 26, def: 6, price: 0, desc: '체력 +26%, 방어 +6%' },
  oar: { id: 'oar', name: '사공의 노', slot: 'weapon', atk: 30, def: 6, price: 0, desc: '공격 +30%, 방어 +6%' },
  saltpouch: { id: 'saltpouch', name: '소금 주머니', slot: 'charm', def: 20, atk: 6, price: 0, desc: '방어 +20%, 공격 +6%' },
  heukunblade: { id: 'heukunblade', name: '흑운채 칼', slot: 'weapon', atk: 36, price: 0, desc: '공격 +36%' },
  asndagger: { id: 'asndagger', name: '무늬 없는 단검', slot: 'weapon', atk: 38, spd: 12, price: 0, desc: '공격 +38%, 속도 +12' },
  chaenorigae: { id: 'chaenorigae', name: '송채령의 옥노리개', slot: 'charm', atk: 16, hp: 16, def: 16, price: 0, desc: '공격·체력·방어 +16%' },
  // 장터에 더 들어오는 물건
  pinestaff: { id: 'pinestaff', name: '소나무 지팡이', slot: 'weapon', atk: 10, spd: 6, price: 35, desc: '공격 +10%, 속도 +6' },
  bamboohat: { id: 'bamboohat', name: '대삿갓', slot: 'charm', def: 8, hp: 8, price: 35, desc: '방어 +8%, 체력 +8%' },
  ssangdo: { id: 'ssangdo', name: '쌍도', slot: 'weapon', atk: 24, spd: 6, price: 190, desc: '공격 +24%, 속도 +6' },
  hempvest: { id: 'hempvest', name: '삼베 누비옷', slot: 'charm', hp: 16, def: 14, price: 150, desc: '체력 +16%, 방어 +14%' },
  goldpin: { id: 'goldpin', name: '금비녀', slot: 'weapon', atk: 32, spd: 10, price: 360, desc: '공격 +32%, 속도 +10' },
  silkshoes: { id: 'silkshoes', name: '비단 꽃신', slot: 'charm', spd: 18, hp: 10, price: 340, desc: '속도 +18, 체력 +10%' },
  jadebell: { id: 'jadebell', name: '옥방울', slot: 'charm', atk: 18, hp: 16, def: 10, spd: 6, price: 480, desc: '공격 +18%, 체력 +16%, 방어 +10%, 속도 +6' },
  apronknot: { id: 'apronknot', name: '소담의 앞치마 끈', slot: 'charm', atk: 10, hp: 18, def: 12, price: 0, desc: '공격 +10%, 체력 +18%, 방어 +12%' },
  prayerbeads: { id: 'prayerbeads', name: '전 주인의 염주', slot: 'charm', atk: 8, hp: 10, def: 8, spd: 4, price: 0, desc: '공격 +8%, 체력 +10%, 방어 +8%, 속도 +4' },
  forgering: { id: 'forgering', name: '무영이 벼린 쇠고리', slot: 'charm', atk: 14, def: 10, price: 0, desc: '공격 +14%, 방어 +10%' },
};

/** 장터에서 파는 것(화가 지날수록 물건이 바뀐다) */
export const SHOP = ['oakclub', 'ironpin', 'pinestaff', 'straw', 'cotton', 'bamboohat'];
export const SHOP5 = ['steelclub', 'jadepin', 'ssangdo', 'silkband', 'mituri', 'hempvest'];
export const SHOP7 = ['ironfan', 'goldpin', 'tigervest', 'jadepin', 'silkband', 'mituri'];
export const SHOP10 = ['dragonpin', 'jadering', 'jadebell', 'silkshoes', 'ironfan', 'tigervest'];

const raccoon = (level: number) => ({ name: '뒷산 너구리', mon: 'racoon' as const, level, role: 'attack' as const, element: 'wood' as const, kind: 'grunt' as const, power: 0.75 });
const wisp = (level: number) => ({ name: '도깨비불', mon: 'wisp' as const, level, role: 'support' as const, element: 'fire' as const, kind: 'grunt' as const, power: 0.8 });
// 흑운채: 도깨비 유민의 산적 무리. 사람 체형에 뿔 달린 도트(괴물 아님)
const gob = (level: number) => ({ name: '흑운채 졸개', char: 'bandit' as const, level, role: 'attack' as const, element: 'dark' as const, kind: 'grunt' as const, power: 0.9 });
const gob2 = (level: number) => ({ name: '흑운채 졸개', char: 'bandit2' as const, level, role: 'defense' as const, element: 'wood' as const, kind: 'grunt' as const, power: 0.9 });
const pick = (level: number, role: 'attack' | 'defense' = 'attack') => ({ name: '소매치기', char: 'pickpocket' as const, level, role, element: 'dark' as const, kind: 'grunt' as const, power: 0.9 });
const sol = (level: number, role: 'attack' | 'defense' = 'attack') => ({ name: '송씨 사병', char: 'soldier' as const, level, role, element: 'dark' as const, kind: 'grunt' as const, power: 0.95 });
const asn = (level: number, role: 'attack' | 'defense' = 'attack') => ({ name: '자객', char: 'assassin' as const, level, role, element: 'dark' as const, kind: 'grunt' as const, power: 1.0 });
const thug = (level: number, role: 'attack' | 'defense' = 'attack') => ({ name: '송씨 머슴', char: 'thug' as const, level, role, element: 'fire' as const, kind: 'grunt' as const, power: 0.85 });
const bat = (level: number) => ({ name: '굴 박쥐', mon: 'bat' as const, level, role: 'attack' as const, element: 'dark' as const, kind: 'grunt' as const, power: 0.8 });

export const FOES: Record<string, FoeGroup> = {
  beast: { name: '뒷산 너구리', ground: 'grass', waves: [[raccoon(1), raccoon(1)]] },
  keeper: {
    name: '창고지기와 몽둥이 장정들',
    ground: 'dirt',
    boss: true,
    waves: [
      [
        { name: '몽둥이 장정', char: 'thug', level: 2, role: 'attack', element: 'fire', kind: 'grunt', power: 0.72 },
        { name: '창고지기', char: 'keeper', level: 2, role: 'support', element: 'water', kind: 'elite', power: 0.7 },
        { name: '몽둥이 장정', char: 'thug', level: 2, role: 'attack', element: 'fire', kind: 'grunt', power: 0.72 },
      ],
    ],
  },
  // 2화(백설 화)
  parak: {
    name: '달골 파락호',
    ground: 'dirt',
    waves: [
      [
        { name: '파락호', char: 'thug', level: 3, role: 'attack', element: 'fire', kind: 'grunt', power: 0.75 },
        { name: '파락호', char: 'thug', level: 3, role: 'defense', element: 'wood', kind: 'grunt', power: 0.75 },
        { name: '파락호', char: 'thug', level: 3, role: 'attack', element: 'fire', kind: 'grunt', power: 0.75 },
      ],
    ],
  },
  drunks: { name: '흑운채 술꾼', ground: 'dirt', waves: [[gob(4), gob2(4)]] },
  wisps: { name: '도깨비불 떼', ground: 'grass', waves: [[wisp(4), wisp(4), wisp(5)]] },
  // 4화: 송씨 머슴들
  meoDay: { name: '송씨 머슴', ground: 'dirt', waves: [[thug(12), thug(12, 'defense')]] },
  meoNight: {
    name: '머슴 대장과 패거리',
    ground: 'dirt',
    boss: true,
    waves: [
      [thug(12), thug(13, 'defense')],
      [thug(13), { name: '머슴 대장', char: 'thug', level: 15, role: 'attack', element: 'fire', kind: 'elite', power: 1.25 }, thug(13, 'defense')],
    ],
  },
  pickpockets: { name: '소매치기패', ground: 'dirt', waves: [[pick(15), pick(15, 'defense'), pick(16)]] },
  pickTrain: { name: '장터 왈패', ground: 'dirt', waves: [[pick(13), pick(13)]] },
  oilmen: { name: '송씨 일꾼', ground: 'dirt', waves: [[thug(16), thug(16, 'defense'), thug(17)]] },
  oilTrain: { name: '송씨 일꾼', ground: 'dirt', waves: [[thug(14), thug(14)]] },
  ferryThugs: { name: '나루 왈패', ground: 'dirt', waves: [[thug(18), thug(18, 'defense'), pick(19)]] },
  ferryTrain: { name: '나루 왈패', ground: 'dirt', waves: [[thug(16), pick(16)]] },
  doksa: {
    name: '밀수 상단 행수 독사',
    ground: 'dirt',
    boss: true,
    waves: [
      [thug(19), thug(19, 'defense')],
      // 작전 없이 가면 지기 쉽다(몰아쳐라·목숨부터가 잘 먹힌다)
      [thug(19), { name: '독사', char: 'doksa', level: 25, role: 'attack', element: 'dark', kind: 'elite', power: 1.7 }, pick(19)],
    ],
  },
  gateTrain: { name: '흑운채 보초', ground: 'dirt', waves: [[gob(19), gob2(19)]] },
  cheolgom: {
    name: '흑운채 선봉장 철곰',
    ground: 'dirt',
    boss: true,
    waves: [
      [gob(19), gob2(19)],
      // 쇠비늘이 단단해 버티기만 하면 못 쓰러뜨린다(몰아쳐라·기술이 맞다)
      [gob(19), { name: '철곰', char: 'cheolgom', level: 23, role: 'defense', element: 'wood', kind: 'elite', power: 1.55 }],
    ],
  },
  privates: { name: '별창을 지키던 송씨 사병', ground: 'dirt', waves: [[sol(21), sol(21, 'defense'), sol(22)]] },
  privTrain: { name: '송씨 사병', ground: 'dirt', waves: [[sol(19), sol(19)]] },
  // 9화 새벽 갈대밭: 독사가 잡혀간 뒤 남은 밀수 상단 잔당
  reeds9: { name: '갈대밭에 숨은 독사의 잔당', ground: 'dirt', waves: [[thug(21), pick(22), thug(21, 'defense')]] },
  bribed: {
    name: '원본 장부를 노린 매수된 아전',
    ground: 'dirt',
    waves: [[{ name: '매수된 아전', char: 'ajeon', level: 23, role: 'support', element: 'water', kind: 'grunt', power: 0.95 }, { name: '매수된 아전', char: 'ajeon', level: 23, role: 'support', element: 'water', kind: 'grunt', power: 0.95 }, { name: '아전 우두머리', char: 'ajeon', level: 24, role: 'attack', element: 'water', kind: 'elite', power: 1.0 }]],
  },
  // 11화 해 질 녘: 반환 곡식 창고에 불을 놓으러 온 강 집사의 사람들
  arson: { name: '창고에 불을 놓으러 온 송씨 사병', ground: 'dirt', waves: [[sol(24), thug(23, 'defense'), sol(24)]] },
  arsonTrain: { name: '송씨 사병', ground: 'dirt', waves: [[sol(22), thug(22)]] },
  asnTrain: { name: '자객', ground: 'dirt', waves: [[asn(23), asn(23)]] },
  assassins: {
    name: '채권 사본을 노린 자객',
    ground: 'dirt',
    boss: true,
    waves: [
      [asn(25), asn(25), asn(25, 'defense')],
      [{ name: '자객 우두머리', char: 'assassin', level: 29, role: 'attack', element: 'dark', kind: 'elite', power: 1.8 }, asn(25)],
    ],
  },
  meoTrain: { name: '송씨 머슴', ground: 'dirt', waves: [[thug(11), thug(11)]] },
  // 지면 쉼터 근처에서 하는 수련(쉬운 상대)
  village: { name: '도깨비불', ground: 'grass', waves: [[wisp(1), wisp(2)]] },
  // 새 화(extra.ts)
  dc_bats: { name: '깊은 굴 박쥐 떼', ground: 'cave', waves: [[bat(10), bat(10), bat(11)]] },
  dc_wisps: { name: '샘가의 도깨비불', ground: 'cave', waves: [[wisp(10), wisp(11), wisp(11)]] },
  dc_guardian: {
    name: '옛 사당의 사당지기',
    ground: 'cave',
    boss: true,
    waves: [
      [bat(11), wisp(11)],
      [{ name: '사당지기 도깨비불', mon: 'wisp', level: 14, role: 'support', element: 'fire', kind: 'elite', power: 1.5 }, bat(12)],
    ],
  },
  dc_train: { name: '굴 박쥐', ground: 'cave', waves: [[bat(9), bat(9)]] },
  town_rowdy: { name: '장터 거리의 왈패', ground: 'dirt', waves: [[thug(15), pick(15), thug(15, 'defense')]] },
  pojol: { name: '형방이 부른 관아 포졸', ground: 'dirt', waves: [[{ ...sol(16), name: '관아 포졸' }, { ...sol(16, 'defense'), name: '관아 포졸' }, { ...sol(17), name: '관아 포졸' }]] },
  town_train: { name: '장터 왈패', ground: 'dirt', waves: [[thug(14), pick(14)]] },
  raiders: {
    name: '산채를 노린 검은바람',
    ground: 'dirt',
    boss: true,
    waves: [
      [{ ...gob(21), name: '검은바람 졸개' }, { ...gob(21), name: '검은바람 졸개' }, pick(21)],
      [{ name: '검은바람 우두머리', char: 'bandit2', level: 25, role: 'attack', element: 'dark', kind: 'elite', power: 1.55 }, { ...gob(22), name: '검은바람 졸개' }],
    ],
  },
  raid_train: { name: '검은바람 졸개', ground: 'dirt', waves: [[{ ...gob(20), name: '검은바람 졸개' }, { ...gob(20), name: '검은바람 졸개' }]] },
  mguards: { name: '송 대감 댁 순라 사병', ground: 'dirt', waves: [[sol(23), sol(23, 'defense')]] },
  mguards2: { name: '사랑채를 지키는 사병', ground: 'dirt', waves: [[sol(24), sol(24, 'defense'), sol(24)]] },
  manor_train: { name: '송씨 사병', ground: 'dirt', waves: [[sol(22), sol(22)]] },
  // 마을 의뢰(quests.ts)
  q_raccoons: { name: '장독 깨는 너구리', ground: 'grass', waves: [[raccoon(6), raccoon(6), raccoon(7)]] },
  q_wisps: { name: '등잔 기름 핥는 도깨비불', ground: 'grass', waves: [[wisp(9), wisp(9), wisp(10)]] },
  q_raccoons2: { name: '창고 너구리 떼', ground: 'dirt', waves: [[raccoon(15), raccoon(15), raccoon(16)]] },
  q_wisps2: { name: '약초밭 도깨비불', ground: 'grass', waves: [[wisp(16), wisp(16), wisp(17)]] },
  passTrain: { name: '떠돌이 졸개', ground: 'dirt', waves: [[gob(6), wisp(6)]] },
  caveTrain: { name: '굴 박쥐', ground: 'cave', waves: [[bat(7), bat(7)]] },
  toll1: { name: '통행세 패거리', ground: 'dirt', waves: [[gob(7), gob2(7)]] },
  toll2: { name: '통행세 패거리', ground: 'dirt', waves: [[gob(7), gob(8)]] },
  toll3: { name: '통행세 패거리', ground: 'dirt', waves: [[gob2(8), gob(8)], [gob(8)]] },
  cave1: { name: '굴 박쥐 떼', ground: 'cave', waves: [[bat(8), bat(8), bat(9)]] },
  cave2: { name: '산적굴 보초', ground: 'cave', waves: [[gob(9), bat(9)], [gob2(9), gob(9)]] },
  guards: { name: '두목의 보초', ground: 'cave', waves: [[gob2(10), gob(10)]] },
  boss: {
    name: '흑운채 두목',
    ground: 'cave',
    boss: true,
    waves: [[{ name: '흑운채 두목', char: 'mokso', level: 11, role: 'attack', element: 'dark', kind: 'boss', power: 0.9 }]],
  },
  bossFull: {
    name: '흑운채 두목과 보초',
    ground: 'cave',
    boss: true,
    waves: [
      [
        gob2(10),
        { name: '흑운채 두목', char: 'mokso', level: 11, role: 'attack', element: 'dark', kind: 'boss', power: 0.9 },
        gob(10),
      ],
    ],
  },
};
