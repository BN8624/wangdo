import type { RankDef } from '../core/types';

// 관직 사다리. index 0이 시작이고, powerReq·fameCost는 그 관직에 '오를 때'의 조건이다.
// 왕에 오른 뒤에는 rankDef()가 치세 단계를 끝없이 만들어 낸다.
// recruit: 모집 기능이 생기기 전까지 관직에 오를 때 합류하는 식객.
// 수치는 scripts/simulate.ts로 진행 속도를 확인하면서 맞춘다.
export const RANKS: RankDef[] = [
  { title: '서민', powerReq: 0, fameCost: 0, flavor: '산에서 나무나 하던 신세였다. 그 방망이를 줍기 전까지는.' },
  { title: '방망이 임자', powerReq: 950, fameCost: 5, flavor: '달골에 소문이 돈다. 금이 쏟아지는 방망이를 가진 사내가 있다고.' },
  { title: '종9품 참봉', powerReq: 1100, fameCost: 25, recruit: 'seorin', flavor: '말단이지만 관복을 입었다. 이제 아무도 나무꾼이라 부르지 못한다.' },
  { title: '정8품 사직', powerReq: 2800, fameCost: 90, recruit: 'danhui', flavor: '관아 사람들이 고개를 숙이기 시작했다.' },
  { title: '종7품 직장', powerReq: 4900, fameCost: 300, recruit: 'geumyeong', flavor: '도성에서 온 서찰이 하나둘 쌓인다. 누군가 나를 지켜보고 있다.' },
  { title: '종6품 현감', powerReq: 6500, fameCost: 700, flavor: '고을 하나가 온전히 내 것이 되었다.' },
  { title: '종5품 판관', powerReq: 9600, fameCost: 1500, recruit: 'haeryun', flavor: '판결 한 마디에 사람들의 운명이 갈린다.' },
  { title: '종4품 군수', powerReq: 12000, fameCost: 3000, recruit: 'yeonhwa', flavor: '송씨 가문이 처음으로 나를 경계하기 시작했다.' },
  { title: '정3품 목사', powerReq: 16500, fameCost: 6000, recruit: 'bulsae', flavor: '이제 도성의 연회에 초대받는 몸이다.' },
  { title: '종2품 관찰사', powerReq: 18500, fameCost: 14000, recruit: 'cheongyeon', flavor: '한 도의 사람과 요괴가 내 말을 따른다.' },
  { title: '정2품 판서', powerReq: 25000, fameCost: 40000, flavor: '어전 회의에서 내 목소리가 울린다.' },
  { title: '종1품 찬성', powerReq: 28500, fameCost: 80000, recruit: 'bari', flavor: '권세가들이 앞다투어 혼담을 넣는다.' },
  { title: '정1품 영의정', powerReq: 31000, fameCost: 150000, flavor: '왕 다음 자리. 하지만 왕좌는 비어 있다.' },
  { title: '섭정', powerReq: 40000, fameCost: 250000, flavor: '어린 왕을 대신해 나라를 움직인다. 송씨 가문의 눈빛이 달라졌다.' },
  { title: '왕', powerReq: 45000, fameCost: 420000, flavor: '나무꾼이 왕좌에 앉았다. 해랑국의 새 시대가 열린다.' },
];

/** 왕이 된 뒤 치세 단계마다 조건이 오르는 비율 */
const REIGN_POWER = 1.3;
const REIGN_FAME = 1.35;
const KING = RANKS.length - 1;

/** 관직 정보. 왕 다음부터는 '왕 · 치세 n단계'가 끝없이 이어진다. */
export function rankDef(rank: number): RankDef {
  if (rank <= KING) return RANKS[Math.max(0, rank)];
  const n = rank - KING;
  const king = RANKS[KING];
  return {
    title: `왕 · 치세 ${n}단계`,
    powerReq: Math.round(king.powerReq * Math.pow(REIGN_POWER, n)),
    fameCost: Math.round(king.fameCost * Math.pow(REIGN_FAME, n)),
    flavor: '왕좌는 지키는 것이 더 어렵다. 해랑국은 오늘도 새 소식으로 시끄럽다.',
  };
}
