// 처음 하는 사람을 위한 안내. 식객이 말풍선으로 할 일을 하나씩 알려 주고, 해내면 작은 보상을 준다.
import { GIFT_BY_ID } from '../data/village';
import { workplaceOf } from './engine';
import type { GameState, ResourceKey } from './types';

export type GuideTab = 'home' | 'yokai' | 'stage';

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
  {
    who: 'dudu',
    text: '어서 와, 방망이 주인! 맨 위가 우리 살림이야. 엽전·곡식·명성, 그리고 겨루기에 쓰는 기력이라구!',
    target: 'res',
    tab: 'home',
  },
  {
    who: 'bangul',
    text: '장사는 저한테 맡겨 주세요! 마을 그림에서 장터를 눌러 저를 보내 주세요.',
    target: 'wp-market',
    tab: 'home',
    done: (s) => s.work.market.includes('bangul'),
    reward: { coin: 100 },
  },
  {
    who: 'sora',
    text: '저는 논밭, 두두는 나무터가 잘 맞아요. 적성에 맞는 일터에 보내면 1.5배로 벌어요.',
    target: 'wp-field',
    tab: 'home',
    done: (s) => workplaceOf(s, 'sora') !== null && workplaceOf(s, 'dudu') !== null,
    reward: { grain: 100 },
  },
  {
    who: 'sora',
    text: '이제 방망이를 두드려 볼까요? 마을 사람이 소원을 들고 찾아와요.',
    target: 'ttuk',
    tab: 'home',
    done: (s) => s.totals.wishes >= 1 && !s.wish.pending,
    reward: { coin: 100 },
  },
  {
    who: 'dudu',
    text: '식객 탭에서 내 얼굴을 눌러 이야기 좀 하자구! 대답에 따라 호감도가 달라진다구.',
    target: 'talk ycard-dudu',
    tab: 'yokai',
    done: (s) => s.totals.talks >= 1,
    reward: { gift: 'tteok' },
  },
  {
    who: 'bangul',
    text: '엽전이 모이면 식객을 눌러 "능력·레벨"에서 레벨을 올려요. 위세가 올라야 승급한답니다.',
    target: 'grow ycard-bangul',
    tab: 'yokai',
    done: (s) => Object.values(s.yokai).some((y) => y.level >= 2),
    reward: { coin: 200 },
  },
  {
    who: 'dudu',
    text: '장터에 말썽꾼이 나타났다구! 소동 탭에서 우리 셋을 보내 줘. 출동!',
    target: 'go',
    tab: 'stage',
    done: (s) => s.totals.wins >= 1,
    reward: { fame: 3 },
  },
  {
    who: 'sora',
    text: '곡식으로 잔치를 열면 명성이 오르고 모두 기뻐해요. 고을에서 잔치를 열어 보세요.',
    target: 'feast',
    tab: 'home',
    done: (s) => s.totals.feasts >= 1,
    reward: { coin: 200 },
  },
  {
    who: 'bangul',
    text: '위세와 명성이 다 차면 승급할 수 있어요. 칭호가 오르면 일터 칸도, 새 식객도 늘어요!',
    target: 'promote',
    tab: 'home',
    done: (s) => s.rank >= 1,
    reward: { gift: 'norigae' },
  },
  {
    who: 'dudu',
    text: '이제 달골은 네 손에 달렸다구! 막히면 고을 아래 "다음 할 일"을 보라구.',
  },
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
