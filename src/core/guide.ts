// 처음 하는 사람을 위한 안내. 식객이 말풍선으로 할 일을 하나씩 알려 주고, 해내면 작은 보상을 준다.
import { GIFT_BY_ID } from '../data/village';
import type { GameState, ResourceKey } from './types';

export type GuideTab = 'home' | 'yokai' | 'camp' | 'gacha';

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
  { who: 'baekseol', text: '나리, 맨 위가 살림이에요. 엽전과 수련치로 레벨을 올리고, 옥으로 식객을 모집해요.', target: 'res', tab: 'home' },
  { who: 'baekseol', text: '첫 출정이에요. 아래 출정 탭에서 1-1을 깨 보세요. 이건 저 혼자서도 이겨요.', target: 'stage-s1e01-1 go', tab: 'camp', done: (s) => (s.camp.stars['s1e01-1'] ?? 0) > 0, reward: { jade: 100 } },
  { who: 'baekseol', text: '이제 식객을 모아요. 모집 탭에서 열 번 모집을 눌러 보세요. 처음 열 번은 전설 식객 하나가 확정이에요.', target: 'pull10', tab: 'gacha', done: (s) => s.gacha.firstTen, reward: { coin: 1000 } },
  { who: 'baekseol', text: '출정할 때 편성 다섯 칸을 채우세요. "자동 편성"을 누르면 전투력이 높은 순으로 세워 줘요.', target: 'auto-team', tab: 'camp', done: (s) => s.team.filter(Boolean).length >= 4, reward: { exp: 600 } },
  { who: 'baekseol', text: '식객 탭에서 식객을 눌러 레벨을 올려요. 수련치와 엽전이 들어요. 별이 높을수록 더 높이 올라가요.', target: 'levelup', tab: 'yokai', done: (s) => Object.values(s.yokai).some((y) => y.level >= 5), reward: { coin: 800 } },
  { who: 'baekseol', text: '1장을 끝까지 깨면 이야기가 이어지고 새 식객이 합류해요. 막히면 출정의 수련장에서 수련치를 모아요.', target: 'tab-camp', tab: 'camp', done: (s) => s.story.done.includes('s1e01'), reward: { jade: 200 } },
  { who: 'baekseol', text: '로비의 상자에는 자리를 비운 동안에도 엽전·수련치·옥이 쌓여요. 들어오면 눌러서 받아 가세요.', target: 'afk', tab: 'home' },
  { who: 'baekseol', text: '대화와 선물로 인연을 쌓으면 인연 이야기가 열리고 능력치도 올라요. 식객 탭에서 저한테 말 걸어 주실래요?', target: 'talk', tab: 'yokai', done: (s) => s.totals.talks >= 1, reward: { gift: 'mirror' } },
  { who: 'baekseol', text: '이제 해랑국은 나리 손에 달렸어요. 막히면 로비 아래 "할 일"을 보세요.' },
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
    for (const k of ['coin', 'jade', 'exp', 'fame'] as const) if (r[k]) next.res[k] += r[k]!;
    if (r.gift && GIFT_BY_ID[r.gift]) next.gifts[r.gift] = (next.gifts[r.gift] ?? 0) + 1;
  }
  return [next, step];
}
