import { CHAPTERS } from './stages';

// 토벌 대사. 식객은 공격할 때와 고유 기술을 쓸 때, 상대는 반격할 때 말풍선으로 한 줄씩 말한다.
// 말투는 content/heroines.json의 voice를 따른다. 짧게(두 줄 안에) 쓴다.

export interface AllyLines {
  attack: string[];
  skill: string;
}

export const ALLY_LINES: Record<string, AllyLines> = {
  baekseol: { attack: ['어머, 그걸로 막으시게요?', '꼬리 하나면 충분하겠네요.', '나리 앞에서 무례하시네요.'], skill: '나리, 잠깐 눈 좀 감아 주세요.' },
  muyeong: { attack: ['비키시오. 두 번 말하지 않소.', '임자, 그게 전부요?', '쇠방망이 맛을 보시오.'], skill: '물러서시오. 크게 가오.' },
  sodam: { attack: ['장부가 세 줄이나 틀렸네요.', '쌀 한 섬 값은 받아 가겠습니다.', '숫자는 거짓말을 안 해요.'], skill: '다들 한 숟갈씩 드세요.' },
  haeryun: { attack: ['사실만 말씀하시지요.', '죄목이 하나 더 늘었습니다.', '판결은 이미 났습니다.'], skill: '해태는 거짓을 알아봅니다.' },
  oryeon: { attack: ['값은 지금 치르시지요.', '이 거래, 손해는 그쪽입니다.', '셈은 정확히 하겠습니다.'], skill: '이번 판은 남는 장사예요.' },
  yeonhwa: { attack: ['박자를 놓치셨네요.', '물결처럼 비켜 드리죠.', '한 소절만 더 추실까요?'], skill: '이 춤, 끝까지 보세요.' },
  bulsae: { attack: ['뜨거우니까 비켜.', '한 번만 더 덤벼 봐.', '불 조절은 내가 해.'], skill: '다 태운다.' },
  cheongyeon: { attack: ['정말 이대로 괜찮으세요?', '여기서 멈추시지요.', '하늘 법에 어긋납니다.'], skill: '모두 제 뒤로 오세요.' },
  seorin: { attack: ['세 걸음 안입니다.', '왼쪽이 비었습니다.', '칼은 한 번이면 됩니다.'], skill: '제가 막겠습니다. 앞으로.' },
  geumyeong: { attack: ['뒤는 보셨나요?', '누가 보냈는지 말해 볼래요?', '그림자는 늘 가까이 있어요.'], skill: '이미 발밑이에요.' },
  danhui: { attack: ['이 값이면 거저예요!', '에누리는 없어요.', '아이고, 손이 미끄러졌네.'], skill: '오늘만 두 배로 쳐 드립니다!' },
  haejin: { attack: ['약속을 어긴 대가입니다.', '물길은 당신 편이 아닙니다.', '용궁의 이름으로 묻겠습니다.'], skill: '샘물이 상처를 씻어 줄 거예요.' },
  wolha: { attack: ['기한이 다 되었습니다.', '명부에 이름이 올랐습니다.', '책임은 그쪽에 있습니다.'], skill: '지금 낙인을 찍겠습니다.' },
  bari: { attack: ['여기서 그만두세요.', '다치게 하고 싶지 않아요.', '이 길은 돌아가는 게 좋아요.'], skill: '괜찮아요, 금방 나아요.' },
  yunseul: { attack: ['그 약속, 실이 엉켜 있네요.', '매듭을 하나 풀어 드릴게요.', '씨줄이 어긋났어요.'], skill: '당신의 실, 제가 엮을게요.' },
  beori: { attack: ['집행한다.', '피하지 마시오.', '장부에 적혔소.'], skill: '벼락이 간다. 물러서시오!' },
};

/** 장마다 상대 대사: 일반 토벌의 졸개와 대장 */
const FOE: Record<string, { grunt: string[]; boss: string[] }> = {
  backhill: {
    grunt: ['통행세 내고 지나가라!', '어디서 굴러온 놈들이냐!', '이 고개는 우리 땅이다!'],
    boss: ['흑운채를 우습게 봤구나!', '곰 발바닥 맛을 봐라!'],
  },
  ferry: { grunt: ['장부엔 그런 거 없소.', '강물에 빠지고 싶나?', '곡식? 원래 반이었지!'], boss: ['셈이 서툴군요.', '이자는 비쌀 겁니다.'] },
  alley: { grunt: ['대감 댁 일에 끼지 마라.', '여긴 도성이다, 촌놈아.', '빚 문서가 여기 있는데?'], boss: ['대감께서 기다리십니다.', '곱게 따라오시지요.'] },
  pleasure: { grunt: ['비밀에는 값이 있죠.', '한 잔 하시고 가세요.', '패는 이미 정해졌어요.'], boss: ['여우가 여우를 홀릴 수 있을까?', '그 꼬리, 탐나네.'] },
  north: { grunt: ['산을 넘을 생각 마라!', '눈 속에 묻어 주마!', '두목께는 못 간다!'], boss: ['바람을 베어 본 적 있나?', '흑운채는 무너지지 않는다!'] },
};

/** 상대가 반격할 때 할 수 있는 대사들. 대장은 장 설정의 첫 대사를 맨 앞에 둔다 */
export function foeLines(chapterId: string, isBoss: boolean): string[] {
  const set = FOE[chapterId];
  if (!set) return ['비켜라!'];
  if (!isBoss) return set.grunt;
  const first = CHAPTERS.find((c) => c.id === chapterId)?.boss.line;
  return first ? [first, ...set.boss] : set.boss;
}

export const FOE_LINE_CHAPTERS = Object.keys(FOE);
