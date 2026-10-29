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
};

/** 장터에서 파는 것 */
export const SHOP = ['oakclub', 'ironpin', 'straw', 'cotton'];

const raccoon = (level: number) => ({ name: '뒷산 너구리', mon: 'racoon' as const, level, role: 'attack' as const, element: 'wood' as const, kind: 'grunt' as const, power: 0.75 });
const wisp = (level: number) => ({ name: '도깨비불', mon: 'wisp' as const, level, role: 'support' as const, element: 'fire' as const, kind: 'grunt' as const, power: 0.8 });
// 흑운채: 도깨비 유민의 산적 무리. 사람 체형에 뿔 달린 도트(괴물 아님)
const gob = (level: number) => ({ name: '흑운채 졸개', char: 'bandit' as const, level, role: 'attack' as const, element: 'dark' as const, kind: 'grunt' as const, power: 0.9 });
const gob2 = (level: number) => ({ name: '흑운채 졸개', char: 'bandit2' as const, level, role: 'defense' as const, element: 'wood' as const, kind: 'grunt' as const, power: 0.9 });
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
      [thug(13), { name: '머슴 대장', char: 'thug', level: 14, role: 'attack', element: 'fire', kind: 'elite', power: 0.85 }, thug(13, 'defense')],
    ],
  },
  meoTrain: { name: '송씨 머슴', ground: 'dirt', waves: [[thug(11), thug(11)]] },
  // 지면 쉼터 근처에서 하는 수련(쉬운 상대)
  village: { name: '도깨비불', ground: 'grass', waves: [[wisp(1), wisp(2)]] },
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
