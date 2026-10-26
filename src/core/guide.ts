// 처음 하는 사람을 위한 안내. 식객이 말풍선으로 할 일을 하나씩 알려 주고, 해내면 작은 보상을 준다.
import { GIFT_BY_ID } from '../data/village';
import { workplaceOf } from './engine';
import type { GameState, ResourceKey } from './types';

export type GuideTab = 'home' | 'yokai' | 'adv';

export interface GuideStep {
  who: string;
  text: string;
  /** 반짝여 표시할 곳(data-guide 값, 여러 개면 띄어쓰기로 구분) */
  target?: string;
  /** 그 곳이 있는 탭 */
  tab?: GuideTab;
  /** 없으면 '알겠어요'를 눌러 넘어간다 */
  done?: (s: GameState) => boolean;
  reward?: Partial<Record<ResourceKey, number>> & { gift?: string };
}

export const GUIDE: GuideStep[] = [
  { who: 'baekseol', text: '나리, 맨 위가 살림이에요. 엽전·곡식·명성이죠. 엽전으로는 장비와 선물을 사요.', target: 'res', tab: 'home' },
  { who: 'baekseol', text: '먼저 우리 이야기부터 들어 보실래요? 궁궐의 "이야기" 버튼을 눌러 주세요.', target: 'story', tab: 'home', done: (s) => s.story.done.includes('s1e01'), reward: { coin: 200 } },
  { who: 'baekseol', text: '당장은 엽전이 급하죠. 저를 저잣거리에 보내 주세요. 식객이 늘면 그때 주막으로 옮기면 돼요.', target: 'wp-market', tab: 'home', done: (s) => s.work.market.includes('baekseol'), reward: { coin: 100 } },
  { who: 'baekseol', text: '이제 정무를 보세요. 상소를 읽고 판결하면 보상이 따라와요.', target: 'ttuk', tab: 'home', done: (s) => s.totals.wishes >= 1 && !s.wish.pending, reward: { grain: 100 } },
  { who: 'baekseol', text: '식객 탭에서 저를 눌러 말을 걸어 주세요. 대답에 따라 마음이 달라지거든요.', target: 'talk ycard-baekseol', tab: 'yokai', done: (s) => s.totals.talks >= 1, reward: { gift: 'mirror' } },
  { who: 'baekseol', text: '레벨은 싸워서 올라요. 모험 탭의 달골 뒷산에서 한번 싸워 보세요. 몇 번이고 싸울 수 있어요.', target: 'node-backhill-field go', tab: 'adv', done: (s) => (s.adv.floors['f:backhill-field'] ?? 0) >= 1, reward: { coin: 300 } },
  { who: 'baekseol', text: '이야기는 앞 화만 보면 바로 이어져요. 다음 화를 보세요.', target: 'story', tab: 'home', done: (s) => s.story.done.includes('s1e02'), reward: { coin: 300 } },
  { who: 'muyeong', text: '무영이다. 훈련장은 내게 맡겨. 호위 일로 엽전을 벌어 오지.', target: 'wp-woodyard', tab: 'home', done: (s) => workplaceOf(s, 'muyeong') !== null, reward: { coin: 200 } },
  { who: 'muyeong', text: '고갯길 산적굴이 열렸소. 던전은 층마다 싸움과 보물상자가 있고 맨 끝에 두목이 있소. 들어가 보시오.', target: 'node-bandit-cave go', tab: 'adv', done: (s) => (s.adv.floors['bandit-cave'] ?? 0) >= 1 || s.adv.cleared.includes('bandit-cave'), reward: { fame: 5 } },
  { who: 'baekseol', text: '산적굴을 돌파하면 다음 이야기가 열려요. 버거운 상대는 뒷산에서 레벨을 올리고 장비를 갖춘 뒤 다시 와요.', target: 'story', tab: 'home', done: (s) => s.story.done.includes('s1e03'), reward: { grain: 200 } },
  { who: 'sodam', text: '소담이에요. 논밭과 장부는 제가 볼게요. 저를 논밭에 보내 주세요.', target: 'wp-field', tab: 'home', done: (s) => workplaceOf(s, 'sodam') !== null, reward: { coin: 200 } },
  { who: 'baekseol', text: '곡식으로 연회를 열면 명성도 오르고 다들 기분이 좋아지죠.', target: 'feast', tab: 'home', done: (s) => s.totals.feasts >= 1, reward: { coin: 300 } },
  { who: 'baekseol', text: '권세와 명성이 차면 승급이에요. 관직이 오르면 일터 칸과 수입이 늘어요.', target: 'promote', tab: 'home', done: (s) => s.rank >= 1, reward: { gift: 'norigae' } },
  { who: 'baekseol', text: '이제 해랑국은 나리 손에 달렸어요. 모험 지도를 따라 이야기를 이어 가고, 막히면 궁궐 아래 "할 일"을 보세요.' },
];

export const guideStep = (s: GameState): GuideStep | null => GUIDE[s.guide] ?? null;

/** 지금 단계를 마쳤으면(또는 직접 넘기면) 보상을 주고 다음 단계로 간다. */
export function advanceGuide(s: GameState, manual = false): [GameState, GuideStep | null] {
  const step = guideStep(s);
  if (!step) return [s, null];
  if (step.done ? !step.done(s) : !manual) return [s, null];
  const next = structuredClone(s);
  next.guide += 1;
  const r = step.reward;
  if (r) {
    for (const k of ['coin', 'grain', 'fame'] as const) if (r[k]) next.res[k] += r[k]!;
    if (r.gift && GIFT_BY_ID[r.gift]) next.gifts[r.gift] = (next.gifts[r.gift] ?? 0) + 1;
  }
  return [next, step];
}
