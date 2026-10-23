import type { YokaiDef } from '../core/types';

// 식객 요괴 명부. 능력치 순서: 힘(might)·꾀(wit)·재주(craft)·매력(charm)
// 힘 → 일손·소동 해결 / 꾀 → 엽전 / 재주 → 곡식 / 매력 → 잔치·소원의 명성

const s = (might: number, wit: number, craft: number, charm: number) => ({ might, wit, craft, charm });

export const YOKAI: YokaiDef[] = [
  {
    id: 'dudu',
    name: '두두',
    kind: '덜렁이 도깨비',
    grade: 1,
    specialty: 'might',
    base: s(12, 3, 5, 5),
    growth: s(1.6, 0.4, 0.6, 0.6),
    intro: '방망이 주인을 제일 먼저 알아본 도깨비. 힘은 장사인데 셈만 하면 머리에서 김이 난다.',
    artSubject:
      'a cheerful clumsy young dokkaebi (Korean folklore goblin) with one small rounded horn, wild spiky hair, sun-tanned cheeks, wearing a patched traditional Korean vest over baggy hanbok trousers, resting a knobby wooden club on the shoulder, big toothy grin',
    color: '#e0533d',
  },
  {
    id: 'bangul',
    name: '방울',
    kind: '꼬리 하나 구미호',
    grade: 1,
    specialty: 'wit',
    base: s(3, 12, 4, 6),
    growth: s(0.4, 1.6, 0.5, 0.7),
    intro: '아직 꼬리가 하나뿐인 아기 구미호. 아홉 꼬리를 채우겠다며 장사 공부에 한창이다.',
    artSubject:
      'a cute baby gumiho (Korean fox spirit) child with fox ears and only one fluffy white tail, wearing a small pastel hanbok with a coin pouch, holding a wooden abacus, curious bright eyes',
    color: '#f2a03d',
  },
  {
    id: 'sora',
    name: '소라',
    kind: '우렁각시',
    grade: 1,
    specialty: 'craft',
    base: s(4, 5, 12, 5),
    growth: s(0.5, 0.6, 1.6, 0.5),
    intro: '논두렁 우렁이 껍데기에서 나온 솜씨꾼. 그가 지은 밥 냄새에 산짐승도 줄을 선다.',
    artSubject:
      'a gentle young Korean snail bride (ureong-gaksi) with a spiral snail-shell shaped hair bun, wearing a simple cream hanbok with rolled sleeves and an apron, holding a steaming rice bowl, warm smile',
    color: '#8cbf5a',
  },
  {
    id: 'geokkuri',
    name: '거꾸리',
    kind: '청개구리',
    grade: 1,
    specialty: 'charm',
    base: s(4, 5, 4, 12),
    growth: s(0.5, 0.6, 0.5, 1.6),
    intro: '뭐든 반대로 하는 청개구리. 잔치에서 거꾸로 춤을 추면 다들 배꼽을 잡는다.',
    artSubject:
      'a mischievous green tree frog spirit standing upright, wearing a tiny Korean gat hat tilted upside down, doing a playful dance, cheeky expression',
    color: '#4fae7a',
  },
  {
    id: 'bokdeongi',
    name: '복덩이',
    kind: '복두꺼비',
    grade: 2,
    specialty: 'craft',
    base: s(6, 14, 16, 6),
    growth: s(0.6, 1.6, 2.0, 0.6),
    intro: '곳간 구석에 살며 복을 부르는 두꺼비 신령. 복덩이가 사는 집은 쌀독이 마르지 않는다.',
    artSubject:
      'a plump golden lucky toad spirit holding a red pouch of brass coins, wearing a tiny jade ornament, sitting on a stack of rice sacks, content smile',
    color: '#d9a93a',
  },
  {
    id: 'haechi',
    name: '해치',
    kind: '해태',
    grade: 2,
    specialty: 'charm',
    base: s(12, 6, 6, 18),
    growth: s(1.2, 0.6, 0.6, 2.2),
    intro: '옳고 그름을 가리는 신수. 해치가 잔치에 오면 싸우던 이웃도 웃으며 화해한다.',
    artSubject:
      'a friendly haetae (Korean mythical lion-dog guardian) with a curly mane, a single small horn on the forehead, jade-green and gold scales, sitting proudly, kind wise eyes',
    color: '#2f8f83',
  },
  {
    id: 'haedoji',
    name: '해돋이',
    kind: '삼족오',
    grade: 2,
    specialty: 'wit',
    base: s(6, 20, 8, 8),
    growth: s(0.6, 2.4, 0.8, 0.8),
    intro: '세 발 달린 해의 까마귀. 하늘 높이 날면 팔도 장터 시세가 훤히 보인다.',
    artSubject:
      'a three-legged golden sun crow (samjogo) with glowing red-orange feathers, carrying a tiny merchant ledger satchel, perched proudly',
    color: '#e8743b',
  },
  {
    id: 'beom',
    name: '범 할배',
    kind: '산신령의 호랑이',
    grade: 3,
    specialty: 'might',
    base: s(30, 10, 8, 16),
    growth: s(3.2, 1.0, 0.8, 1.6),
    intro: '산신령을 모시는 늙은 호랑이. 백 년을 살았지만 아직도 곶감이라면 질색한다.',
    artSubject:
      'an old wise tiger in Korean mountain-spirit style, white eyebrows and long white whiskers, wearing a flowing scholar robe, holding a long pipe, gentle grandfatherly smile',
    color: '#c9772e',
  },
  {
    id: 'dalbi',
    name: '달비',
    kind: '선녀',
    grade: 3,
    specialty: 'charm',
    base: s(8, 16, 14, 30),
    growth: s(0.8, 1.6, 1.4, 3.4),
    intro: '날개옷을 잃어버리고 고을에 눌러앉은 선녀. 나무꾼인 당신을 보면 어쩐지 웃음을 참는다.',
    artSubject:
      'a graceful Korean celestial maiden (seonnyeo) in a flowing pastel hanbok with ribbon sashes, hair in an elegant updo with a crescent moon hairpin, holding a folded feather robe, playful smile',
    color: '#8a7fd1',
  },
  {
    id: 'kkulkkeok',
    name: '꿀꺽이',
    kind: '불가사리',
    grade: 2,
    specialty: 'might',
    base: s(20, 4, 10, 6),
    growth: s(2.4, 0.4, 1.0, 0.6),
    intro: '쇠붙이만 보면 배가 고파지는 불가사리. 배만 부르면 세상 순한 덩치다.',
    artSubject:
      'a big round bulgasari (Korean iron-eating monster) with a bear-like body covered in shiny metal scales and a small elephant-like trunk, munching an iron pot, sleepy happy face',
    color: '#7d8a99',
  },
  {
    id: 'seureureu',
    name: '스르르',
    kind: '어둑시니',
    grade: 2,
    specialty: 'wit',
    base: s(6, 18, 6, 10),
    growth: s(0.6, 2.2, 0.6, 1.2),
    intro: '쳐다볼수록 커지는 어둠 요괴. 알고 보니 낯을 엄청 가리는 수줍음쟁이.',
    artSubject:
      'a shy shadow spirit (eoduksini) shaped like a soft indigo cloud with big round shy eyes and a small blush, peeking from behind a glowing paper lantern',
    color: '#4b4f8a',
  },
  {
    id: 'kimseobang',
    name: '김서방',
    kind: '감투 장수 도깨비',
    grade: 2,
    specialty: 'charm',
    base: s(10, 12, 6, 18),
    growth: s(1.0, 1.4, 0.6, 2.2),
    intro: '도깨비 시장에서 감투를 파는 장사꾼. 쓰면 안 보인다는 감투가 진짜인지는 아무도 모른다.',
    artSubject:
      'a jolly dokkaebi merchant with two small horns and a round belly, wearing a tall black horsehair hat that is half transparent, carrying a wooden A-frame backpack full of hats, winking',
    color: '#b5527a',
  },
  {
    id: 'yongkkum',
    name: '용꿈',
    kind: '이무기',
    grade: 3,
    specialty: 'craft',
    base: s(18, 10, 28, 10),
    growth: s(1.8, 1.0, 3.2, 1.0),
    intro: '천 년째 용이 되기를 꿈꾸는 이무기. 여의주를 찾을 때까지 연못을 지키기로 했다.',
    artSubject:
      'a young imugi (Korean serpent that wishes to become a dragon) with a long blue-green body and tiny nub horns, coiled around a rock in a lotus pond, dreamy hopeful eyes looking at a glowing pearl',
    color: '#3a8fb7',
  },
  {
    id: 'gangcheori',
    name: '강철이',
    kind: '불 뿜는 용',
    grade: 3,
    specialty: 'might',
    base: s(34, 10, 12, 10),
    growth: s(3.6, 1.0, 1.2, 1.0),
    intro: '지나가는 곳마다 가뭄이 든다는 불 뿜는 용. 사실은 추위를 너무 타서 그렇다.',
    artSubject:
      'a small hot-tempered fire drake (gangcheori) with red-orange scales and tiny wings, wrapped in a knitted scarf, puffing a small flame, grumpy but cute',
    color: '#d8452b',
  },
];

export const YOKAI_BY_ID: Record<string, YokaiDef> = Object.fromEntries(YOKAI.map((y) => [y.id, y]));

export const STARTERS = ['dudu', 'bangul', 'sora'];

export const STAT_LABEL: Record<keyof YokaiDef['base'], string> = {
  might: '힘',
  wit: '꾀',
  craft: '재주',
  charm: '매력',
};

export const GRADE_LABEL: Record<number, string> = { 1: '흔함', 2: '귀함', 3: '전설' };
