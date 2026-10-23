import type { RankDef } from '../core/types';

// 칭호 사다리. index 0이 시작 칭호이고, powerReq·fameCost는 그 칭호로 '오를 때'의 조건이다.
// 수치는 scripts/simulate.ts로 진행 속도를 확인하면서 맞춘다.
export const RANKS: RankDef[] = [
  { title: '나무꾼', powerReq: 0, fameCost: 0, flavor: '산에서 나무를 하다 도깨비 방망이를 주웠다.' },
  { title: '방망이 임자', powerReq: 95, fameCost: 5, flavor: '"금 나와라 뚝딱!" 마을에 소문이 나기 시작했다.' },
  { title: '주막 주인', powerReq: 110, fameCost: 25, recruit: 'geokkuri', flavor: '허름한 주막을 열자 요괴 손님이 하나둘 찾아온다.' },
  { title: '장터 행수', powerReq: 280, fameCost: 90, recruit: 'bokdeongi', flavor: '장터 상인들이 당신에게 셈을 맡기기 시작했다.' },
  { title: '마을 어른', powerReq: 490, fameCost: 300, flavor: '아이들이 "어르신"이라며 인사를 한다. 아직 젊은데.' },
  { title: '촌장', powerReq: 650, fameCost: 700, recruit: 'haechi', flavor: '달골 사람들이 만장일치로 당신을 촌장으로 뽑았다.' },
  { title: '고을 유지', powerReq: 960, fameCost: 1500, flavor: '이웃 고을에서도 달골 장터를 구경하러 온다.' },
  { title: '고을 대감', powerReq: 1200, fameCost: 3000, recruit: 'haedoji', flavor: '터줏대감도 당신에게 고개를 끄덕였다.' },
  { title: '팔도 거상', powerReq: 1650, fameCost: 6000, flavor: '팔도 장터마다 달골 물건이 깔렸다.' },
  { title: '요괴들의 벗', powerReq: 1850, fameCost: 14000, recruit: 'beom', flavor: '산속 요괴들도 달골이라면 믿고 찾아온다.' },
  { title: '도깨비 두목', powerReq: 2500, fameCost: 40000, flavor: '도깨비들이 방망이를 들고 당신 뒤에 줄을 섰다.' },
  { title: '도깨비 대장', powerReq: 2850, fameCost: 80000, flavor: '밤마다 도깨비불이 달골을 대낮처럼 밝힌다.' },
  { title: '요괴 고을 주인', powerReq: 3100, fameCost: 150000, recruit: 'dalbi', flavor: '사람과 요괴가 어울려 사는 고을, 그 주인이 되었다.' },
  { title: '산신령의 벗', powerReq: 4000, fameCost: 250000, flavor: '산신령이 내려와 막걸리 한 잔을 청했다.' },
  { title: '도깨비 대왕', powerReq: 4500, fameCost: 420000, flavor: '사람도 요괴도 모두 당신을 대왕이라 부른다. 금 나와라 뚝딱!' },
];

export const MAX_RANK = RANKS.length - 1;
