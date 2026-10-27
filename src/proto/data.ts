// 시제품의 장비·적 무리·식객 이름
import type { FoeGroup, ItemDef, MemberId } from './types';

export const MEMBER_NAME: Record<MemberId, string> = { me: '나', baekseol: '백설', muyeong: '무영' };

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
const gob = (level: number) => ({ name: '흑운채 졸개', mon: 'gob' as const, level, role: 'attack' as const, element: 'dark' as const, kind: 'grunt' as const, power: 0.9 });
const gob2 = (level: number) => ({ name: '흑운채 졸개', mon: 'gob2' as const, level, role: 'defense' as const, element: 'wood' as const, kind: 'grunt' as const, power: 0.9 });
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
  // 지면 쉼터 근처에서 하는 수련(쉬운 상대)
  village: { name: '도깨비불', ground: 'grass', waves: [[wisp(1), wisp(2)]] },
  passTrain: { name: '떠돌이 졸개', ground: 'dirt', waves: [[gob(3), wisp(3)]] },
  caveTrain: { name: '굴 박쥐', ground: 'cave', waves: [[bat(4), bat(4)]] },
  toll1: { name: '통행세 패거리', ground: 'dirt', waves: [[gob(4), gob2(4)]] },
  toll2: { name: '통행세 패거리', ground: 'dirt', waves: [[gob(4), gob(5)]] },
  toll3: { name: '통행세 패거리', ground: 'dirt', waves: [[gob2(5), gob(5)], [gob(5)]] },
  cave1: { name: '굴 박쥐 떼', ground: 'cave', waves: [[bat(5), bat(5), bat(6)]] },
  cave2: { name: '산적굴 보초', ground: 'cave', waves: [[gob(6), bat(6)], [gob2(6), gob(6)]] },
  guards: { name: '두목의 보초', ground: 'cave', waves: [[gob2(7), gob(7)]] },
  boss: {
    name: '흑운채 두목',
    ground: 'cave',
    boss: true,
    waves: [[{ name: '흑운채 두목', mon: 'boss_gob', level: 8, role: 'attack', element: 'dark', kind: 'boss', power: 0.9 }]],
  },
  bossFull: {
    name: '흑운채 두목과 보초',
    ground: 'cave',
    boss: true,
    waves: [
      [
        gob2(7),
        { name: '흑운채 두목', mon: 'boss_gob', level: 8, role: 'attack', element: 'dark', kind: 'boss', power: 0.9 },
        gob(7),
      ],
    ],
  },
};
