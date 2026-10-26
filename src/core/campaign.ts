// 이야기 속 전투. 화마다 장면 사이에 전투가 끼어 '대화 → 전투 → 대화'로 이어진다.
// 질 때마다 상대가 지쳐 약해지므로(봐주기) 이야기가 영영 막히지는 않는다.
import { BALANCE as B } from '../data/balance';
import { EPISODES } from '../data/story';
import { CHAPTERS } from '../data/stages';
import type { SkillKind } from './battle';
import { avgLevel, battleCoin, battleFame, foeValue, freshYokai, playBattle, roundStats, settle, type FightResult } from './engine';
import { nextRandom } from './rng';
import type { Episode, GameState, StageInfo, StatKey } from './types';

export const battleKey = (ep: Episode, n: number) => `${ep.id}#${n}`;

/** 이야기 전투 전체의 순번(난이도와 보상이 이 순번을 따라 오른다) */
const ORDER = new Map<string, number>();
EPISODES.forEach((ep) => (ep.battles ?? []).forEach((_, n) => ORDER.set(battleKey(ep, n), ORDER.size)));
export const storyBattleCount = () => ORDER.size;
export const storyBattleOrder = (ep: Episode, n: number) => ORDER.get(battleKey(ep, n)) ?? 0;

const WEAK_KINDS: SkillKind[] = ['strike', 'stun', 'guard', 'weaken', 'rally'];

/** 진 횟수에 따른 상대 세기(1 = 그대로) */
export const mercyOf = (losses: number) => Math.max(B.storyMercyFloor, 1 - B.storyMercyStep * losses);

/** 이야기 전투 하나의 상대 정보. 토벌과 같은 모양이라 전투 화면·편성 계산을 그대로 쓴다 */
export function storyBattleInfo(s: GameState, ep: Episode, n: number): StageInfo {
  const b = ep.battles![n];
  const k = storyBattleOrder(ep, n);
  const chapterIndex = Math.max(0, CHAPTERS.findIndex((c) => c.id === b.set));
  const chapter = CHAPTERS[chapterIndex];
  const size = Math.min(3, Math.max(1, b.size ?? 3));
  const losses = s.story.losses[battleKey(ep, n)] ?? 0;
  const mercy = mercyOf(losses);

  let seed = k * 104729 + 7;
  const pick = () => {
    const [r, next] = nextRandom(seed);
    seed = next;
    return r;
  };
  const stats: StatKey[] = b.stats?.length ? b.stats.slice(0, size) : roundStats(withGuests(s, ep, n), size, pick);
  const factors = { 1: [1], 2: [0.95, 1.05], 3: [0.9, 1, 1.1] }[size]!;
  const level = b.level ?? 1;
  const base = foeValue(level, b.boss ? 'boss' : 'story') * mercy;
  return {
    // 봐주기 단계마다 다른 번호(추천 편성 계산을 따로 저장하려고)
    index: 100_000 + k * 100 + losses,
    chapter,
    chapterIndex,
    number: b.grunt ?? 1,
    isBoss: !!b.boss,
    foe: b.foe,
    rounds: stats.map((stat, i) => ({ stat, value: Math.max(1, Math.round(base * factors[i])) })),
    weak: b.weak ?? WEAK_KINDS[k % WEAK_KINDS.length],
    fame: battleFame(level) * (b.boss ? 3 : 1),
    coin: battleCoin(level) * (b.boss ? 3 : 1),
    level,
    grunt: b.grunt,
    rival: b.rival,
    story: { ep: ep.id, n },
    mercy,
    line: b.line,
  };
}

/** 이 전투에 나설 수 있는 식객이 있는 상태: 아직 합류하지 않은 손님 식객은 지금 식객들의 평균 레벨로 잠시 끼워 준다 */
export function withGuests(s: GameState, ep: Episode, n: number): GameState {
  const guests = (ep.battles![n].guests ?? []).filter((id) => !s.yokai[id]);
  if (!guests.length) return s;
  const level = avgLevel(s);
  const next: GameState = { ...s, yokai: { ...s.yokai } };
  for (const id of guests) next.yokai[id] = { ...freshYokai(), level };
  return next;
}

/** 지금 이 화에서 아직 이기지 않은 첫 전투(없으면 null) */
export function nextStoryBattle(s: GameState, ep: Episode): number | null {
  if (s.story.done.includes(ep.id)) return null;
  const i = (ep.battles ?? []).findIndex((_, n) => !s.story.won.includes(battleKey(ep, n)));
  return i < 0 ? null : i;
}

/** 이야기 전투를 치른다. 이기면 경험치·엽전·선물, 지면 일부를 받고 상대가 조금 지친다 */
export function storyFight(s: GameState, now: number, ep: Episode, n: number, party: string[]): [GameState, FightResult] {
  const b = ep.battles?.[n];
  if (!b) return [s, { ok: false, reason: 'bad-party' }];
  const next = settle(s, now);
  const arena = withGuests(next, ep, n);
  const info = storyBattleInfo(next, ep, n);
  if (party.length !== info.rounds.length || new Set(party).size !== party.length || party.some((id) => !arena.yokai[id])) {
    return [s, { ok: false, reason: 'bad-party' }];
  }
  const r = playBattle(next, arena, info, party, { boss: b.boss, giftChance: 1 });
  const key = battleKey(ep, n);
  if (r.won) next.story = { ...next.story, won: [...next.story.won, key] };
  else next.story = { ...next.story, losses: { ...next.story.losses, [key]: (next.story.losses[key] ?? 0) + 1 } };
  return [next, r];
}

/** 보다가 멈춘 곳을 저장한다(전투를 앞두고 나가면 다음에 그 전투부터) */
export function saveStoryPlace(s: GameState, at: NonNullable<GameState['story']['at']>): GameState {
  return { ...s, story: { ...s.story, at } };
}
