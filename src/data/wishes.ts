import type { WishDef } from '../core/types';

// 방망이를 '뚝딱' 두드리면 누군가 소원을 들고 찾아온다. 두 선택지 모두 보상이 있고,
// 무엇을 받을지만 다르다. minutes = 지금 생산량 기준 몇 분어치, pct = 다음 승급 명성의 %.
export const WISHES: WishDef[] = [
  {
    id: 'yeot',
    who: '엿장수 할아버지',
    text: '엿판이 텅 비었구먼. 방망이 한 번만 두드려 주겠나?',
    minRank: 0,
    choices: [
      { label: '엿을 산더미처럼 뚝딱!', reward: { kind: 'coin', minutes: 40 } },
      { label: '아이들과 엿을 나눠 먹는다', reward: { kind: 'fame', pct: 6 } },
    ],
  },
  {
    id: 'heungbu',
    who: '흥부네 막내',
    text: '형아들이 배고프대요. 쌀 한 됫박만 빌려주실 수 있어요?',
    minRank: 0,
    choices: [
      { label: '쌀가마를 통째로 뚝딱!', reward: { kind: 'fame', pct: 7 } },
      { label: '같이 논을 갈자고 한다', reward: { kind: 'grain', minutes: 45 } },
    ],
  },
  {
    id: 'hokbu',
    who: '혹부리 영감',
    text: '노래를 부르면 혹이 떨어진다던데… 같이 불러 주겠소?',
    minRank: 0,
    choices: [
      { label: '목청껏 함께 부른다', reward: { kind: 'fame', pct: 6 } },
      { label: '노래값으로 엽전을 뚝딱', reward: { kind: 'coin', minutes: 35 } },
    ],
  },
  {
    id: 'axe',
    who: '나무꾼 친구 돌쇠',
    text: '연못에 쇠도끼를 빠뜨렸어! 산신령님이 금도끼를 들고 나오셨는데 어쩌지?',
    minRank: 0,
    choices: [
      { label: '"제 건 쇠도끼예요" 정직하게', reward: { kind: 'fame', pct: 7 } },
      { label: '새 도끼를 뚝딱 만들어 준다', reward: { kind: 'hands', minutes: 40 } },
    ],
  },
  {
    id: 'kongjwi',
    who: '콩쥐',
    text: '밑 빠진 독에 물을 다 채워야 잔치에 갈 수 있대요…',
    minRank: 0,
    choices: [
      { label: '두꺼비를 불러 구멍을 막는다', reward: { kind: 'fame', pct: 6 } },
      { label: '물동이 든 일꾼들을 뚝딱', reward: { kind: 'hands', minutes: 35 } },
    ],
  },
  {
    id: 'frog',
    who: '청개구리 엄마',
    text: '우리 애는 산에 가라면 강에 가요. 뭐라고 해야 하죠?',
    minRank: 0,
    choices: [
      { label: '"절대 장터엔 가지 마" 라고 한다', reward: { kind: 'coin', minutes: 45 } },
      { label: '같이 거꾸로 놀아 준다', reward: { kind: 'fame', pct: 5 } },
    ],
  },
  {
    id: 'salt',
    who: '소금 장수',
    text: '비가 와서 소금이 다 녹게 생겼수! 지붕 좀 뚝딱 안 되겠소?',
    minRank: 1,
    choices: [
      { label: '튼튼한 처마를 뚝딱', reward: { kind: 'coin', minutes: 50 } },
      { label: '마을 사람들과 소금을 옮긴다', reward: { kind: 'hands', minutes: 45 } },
    ],
  },
  {
    id: 'magpie',
    who: '은혜 갚은 까치',
    text: '지난번에 구해 주셔서 고마웠어요. 씨앗 몇 알 드릴까요, 소문을 내 드릴까요?',
    minRank: 1,
    choices: [
      { label: '씨앗을 받아 심는다', reward: { kind: 'grain', minutes: 60 } },
      { label: '좋은 소문을 부탁한다', reward: { kind: 'fame', pct: 8 } },
    ],
  },
  {
    id: 'patjuk',
    who: '팥죽 할멈',
    text: '호랑이가 팥죽 먹으러 온다는구먼. 같이 막아 주겠나?',
    minRank: 1,
    choices: [
      { label: '알밤·자라·멍석을 모은다', reward: { kind: 'hands', minutes: 50 } },
      { label: '팥죽을 넉넉히 끓여 호랑이도 먹인다', reward: { kind: 'fame', pct: 7 } },
    ],
  },
  {
    id: 'brothers',
    who: '의좋은 형제',
    text: '형님 볏단을 몰래 옮겨 놨는데, 형님도 제 쪽으로 옮겨 놨지 뭐예요.',
    minRank: 2,
    choices: [
      { label: '볏단을 두 배로 뚝딱', reward: { kind: 'grain', minutes: 60 } },
      { label: '형제 이야기를 장터에 퍼뜨린다', reward: { kind: 'fame', pct: 6 } },
    ],
  },
  {
    id: 'rabbit',
    who: '꾀돌이 토끼',
    text: '자라가 용궁 구경 가자는데, 간을 두고 왔다고 해야 할까요?',
    minRank: 2,
    choices: [
      { label: '꾀를 같이 짜 준다', reward: { kind: 'coin', minutes: 55 } },
      { label: '용왕님께 약초를 대신 보낸다', reward: { kind: 'fame', pct: 7 } },
    ],
  },
  {
    id: 'sun-moon',
    who: '해님 달님 오누이',
    text: '하늘로 올라갈 동아줄이 필요해요! 튼튼한 걸로요!',
    minRank: 2,
    choices: [
      { label: '새 동아줄을 뚝딱', reward: { kind: 'fame', pct: 8 } },
      { label: '마을 장정들이 사다리를 만든다', reward: { kind: 'hands', minutes: 55 } },
    ],
  },
  {
    id: 'fart',
    who: '방귀쟁이 며느리',
    text: '방귀 한 방에 배나무가 털렸어요. 이 배를 어쩌죠?',
    minRank: 3,
    choices: [
      { label: '장터에 배를 내다 판다', reward: { kind: 'coin', minutes: 60 } },
      { label: '고을 잔치에 배를 돌린다', reward: { kind: 'fame', pct: 7 } },
    ],
  },
  {
    id: 'millstone',
    who: '요술 맷돌 주인',
    text: '"나와라" 하면 소금이 나오는 맷돌인데, 멈추는 말을 까먹었소!',
    minRank: 3,
    choices: [
      { label: '방망이로 맷돌을 멈춘다', reward: { kind: 'fame', pct: 8 } },
      { label: '쏟아진 소금을 팔아 치운다', reward: { kind: 'coin', minutes: 70 } },
    ],
  },
  {
    id: 'spring',
    who: '젊어지는 샘물 할아버지',
    text: '샘물을 너무 마셔서 아기가 됐어… 응애.',
    minRank: 4,
    choices: [
      { label: '할머니께 업혀 보낸다', reward: { kind: 'fame', pct: 7 } },
      { label: '샘물을 지키는 일꾼을 둔다', reward: { kind: 'hands', minutes: 60 } },
    ],
  },
  {
    id: 'gotgam',
    who: '겁쟁이 범',
    text: '곶감이란 놈이 그렇게 무섭다던데… 정말이오?',
    minRank: 4,
    choices: [
      { label: '곶감을 나눠 먹으며 안심시킨다', reward: { kind: 'fame', pct: 8 } },
      { label: '범에게 장작 패기를 맡긴다', reward: { kind: 'hands', minutes: 65 } },
    ],
  },
  {
    id: 'ojak',
    who: '견우',
    text: '오작교가 또 끊어졌어요. 올해도 직녀를 못 보면 어떡하죠?',
    minRank: 5,
    choices: [
      { label: '까치·까마귀를 불러 다리를 놓는다', reward: { kind: 'fame', pct: 9 } },
      { label: '튼튼한 나무다리를 뚝딱', reward: { kind: 'hands', minutes: 70 } },
    ],
  },
  {
    id: 'gamtu',
    who: '수상한 감투 장수',
    text: '쓰면 안 보이는 감투, 단돈 엽전 서 푼! 안 사면 손해요!',
    minRank: 5,
    choices: [
      { label: '흥정해서 되판다', reward: { kind: 'coin', minutes: 80 } },
      { label: '감투로 몰래 선행을 한다', reward: { kind: 'fame', pct: 8 } },
    ],
  },
  {
    id: 'beads',
    who: '개와 고양이',
    text: '할아버지의 요술 구슬을 찾아왔어요! 상 주세요!',
    minRank: 6,
    choices: [
      { label: '구슬로 곳간을 채운다', reward: { kind: 'grain', minutes: 80 } },
      { label: '둘에게 잔칫상을 차려 준다', reward: { kind: 'fame', pct: 9 } },
    ],
  },
  {
    id: 'millet',
    who: '좁쌀 한 톨 총각',
    text: '좁쌀 한 톨로 시작해서 소까지 바꿨어요. 이 소를 어쩔까요?',
    minRank: 6,
    choices: [
      { label: '소로 밭을 간다', reward: { kind: 'grain', minutes: 90 } },
      { label: '소를 고을 장터에 판다', reward: { kind: 'coin', minutes: 90 } },
    ],
  },
  {
    id: 'trial',
    who: '해치',
    text: '장터에서 다툼이 났소. 내가 판결을 해도 되겠소?',
    minRank: 7,
    choices: [
      { label: '해치에게 맡긴다', reward: { kind: 'fame', pct: 10 } },
      { label: '양쪽 모두에게 엽전을 뚝딱', reward: { kind: 'coin', minutes: 80 } },
    ],
  },
  {
    id: 'feather',
    who: '선녀의 동생',
    text: '언니 날개옷을 찾았어요! 그런데 언니가 안 가겠대요…',
    minRank: 9,
    choices: [
      { label: '날개옷을 고이 맡아 둔다', reward: { kind: 'fame', pct: 10 } },
      { label: '날개옷 비단으로 장사를 한다', reward: { kind: 'coin', minutes: 100 } },
    ],
  },
  {
    id: 'dokkaebi-night',
    who: '도깨비 무리',
    text: '오늘 밤 씨름판을 벌이려는데 판돈이 모자라오!',
    minRank: 10,
    choices: [
      { label: '판돈을 뚝딱 대 준다', reward: { kind: 'hands', minutes: 90 } },
      { label: '직접 씨름판에 나간다', reward: { kind: 'fame', pct: 10 } },
    ],
  },
  {
    id: 'sanshin',
    who: '산신령',
    text: '허허, 요즘 달골이 시끌벅적하더구먼. 내 선물 하나 주지.',
    minRank: 12,
    choices: [
      { label: '산삼 한 뿌리', reward: { kind: 'grain', minutes: 120 } },
      { label: '산신령의 덕담 한 마디', reward: { kind: 'fame', pct: 12 } },
    ],
  },
];

export const WISH_BY_ID: Record<string, WishDef> = Object.fromEntries(WISHES.map((w) => [w.id, w]));
