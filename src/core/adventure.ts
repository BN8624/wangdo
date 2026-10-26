// 모험: 마을·필드·던전·개인 퀘스트. 지도는 src/data/world.ts.
// 필드는 몇 번이고 싸우는 수련장(봐주기 없음), 던전은 층마다 전투와 보물상자, 마지막 층에 대장.
// 던전·퀘스트 전투는 질 때마다 상대가 지친다(이야기 전투와 같은 봐주기).
import { BALANCE as B } from '../data/balance';
import { CHAPTERS } from '../data/stages';
import { EPISODE_BY_ID } from '../data/story';
import { NODE_BY_ID, REGIONS, type DungeonDef, type FieldDef, type FoeDef, type NodeDef, type QuestDef, type Req } from '../data/world';
import { mercyOf } from './campaign';
import { addItem, avgLevel, roundStats, battleCoin, battleFame, foeValue, freshYokai, playBattle, settle, type FightResult, type FoeKind, type Won } from './engine';
import { nextRandom } from './rng';
import type { GameState, StageInfo, StatKey } from './types';

/** 조건을 채웠는지 */
export function reqMet(s: GameState, r: Req): boolean {
  if (r.ep && !s.story.done.includes(r.ep)) return false;
  if (r.node && !s.adv.cleared.includes(r.node)) return false;
  if (r.owned && !s.yokai[r.owned]) return false;
  return true;
}

/** 길 위의 한 칸: 이야기 화거나 노드 */
export type PathStep = { kind: 'ep'; id: string } | { kind: 'node'; node: NodeDef };

export function pathSteps(regionId: string): PathStep[] {
  const region = REGIONS.find((r) => r.id === regionId);
  if (!region) return [];
  return region.path.flatMap((p): PathStep[] => {
    if (p.startsWith('ep:')) return EPISODE_BY_ID[p.slice(3)] ? [{ kind: 'ep', id: p.slice(3) }] : [];
    const node = NODE_BY_ID[p];
    return node ? [{ kind: 'node', node }] : [];
  });
}

export const nodeOpen = (s: GameState, node: NodeDef) => reqMet(s, node.req);
export const nodeDone = (s: GameState, node: NodeDef) => s.adv.cleared.includes(node.id);

/** 지역이 열렸는지: 길 위에 열린 칸이 하나라도 있으면 */
export function regionOpen(s: GameState, regionId: string): boolean {
  return pathSteps(regionId).some((st) => (st.kind === 'ep' ? isEpOpen(s, st.id) : nodeOpen(s, st.node)));
}

function isEpOpen(s: GameState, id: string): boolean {
  const ep = EPISODE_BY_ID[id];
  if (!ep) return false;
  const u = ep.unlock ?? {};
  return (!u.after || s.story.done.includes(u.after)) && (!u.node || s.adv.cleared.includes(u.node));
}

/** 지역 진행: 끝낸 칸 수 / 전체(마을·필드는 열리기만 하면 끝낸 것으로 친다) */
export function regionProgress(s: GameState, regionId: string): { done: number; total: number } {
  const steps = pathSteps(regionId);
  const done = steps.filter((st) =>
    st.kind === 'ep' ? s.story.done.includes(st.id) : st.node.kind === 'town' || st.node.kind === 'field' ? nodeOpen(s, st.node) : nodeDone(s, st.node),
  ).length;
  return { done, total: steps.length };
}

// ───────────────────────── 상대 만들기 ─────────────────────────

function seeded(seed: number) {
  let x = seed | 0;
  return () => {
    const [r, n] = nextRandom(x);
    x = n;
    return r;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h | 0;
}

/** 상대 정보(토벌과 같은 모양이라 전투 화면·편성 계산을 그대로 쓴다) */
function makeInfo(s: GameState, foe: FoeDef, o: { key: string; level: number; kind: FoeKind; bg: string; mercy?: number; boss?: boolean }): StageInfo {
  const pick = seeded(hash(o.key));
  const size = partySize(s);
  const stats: StatKey[] = roundStats(s, size, pick);
  const factors = { 1: [1], 2: [0.95, 1.05], 3: [0.9, 1, 1.1] }[size]!;
  const mercy = o.mercy ?? 1;
  const base = foeValue(o.level, o.kind) * mercy;
  const chapter = CHAPTERS.find((c) => c.id === o.bg) ?? CHAPTERS[0];
  return {
    index: 200_000 + (Math.abs(hash(o.key)) % 99_000) * 10 + Math.round((1 - mercy) * 9),
    chapter,
    chapterIndex: CHAPTERS.indexOf(chapter),
    number: 1,
    isBoss: !!o.boss,
    foe: foe.name,
    rounds: stats.map((stat, i) => ({ stat, value: Math.max(1, Math.round(base * factors[i])) })),
    weak: foe.weak ?? 'strike',
    fame: battleFame(o.level) * (o.boss ? 3 : 1),
    coin: battleCoin(o.level) * (o.boss ? 3 : 1),
    level: o.level,
    bg: o.bg,
    art: foe.art,
    line: foe.line,
    ...(o.mercy !== undefined ? { mercy } : {}),
  };
}

/** 나설 수 있는 식객 수(초반엔 셋이 안 될 수 있다) */
const partySize = (s: GameState) => Math.min(3, Object.keys(s.yokai).length);

/** 필드에서 다음에 만날 상대: 그 필드에서 싸운 횟수로 정해지므로 미리 볼 수 있다 */
export function fieldEncounter(s: GameState, field: FieldDef): StageInfo {
  const count = s.adv.floors[`f:${field.id}`] ?? 0;
  const pick = seeded(hash(`${field.id}#${count}`));
  const foe = field.foes[Math.floor(pick() * field.foes.length)];
  const [lo, hi] = field.levels;
  const level = lo + Math.floor(pick() * (hi - lo + 1));
  return makeInfo(s, foe, { key: `${field.id}#${count}`, level, kind: 'field', bg: field.bg });
}

/** 던전 진행: 깬 층 수와, 지금 층에서 이긴 판 수 */
export function dungeonPlace(s: GameState, d: DungeonDef): { floor: number; battle: number } {
  return { floor: s.adv.floors[d.id] ?? 0, battle: s.adv.floors[`${d.id}#b`] ?? 0 };
}

/** 던전에서 지금 싸울 상대(다 깼으면 null) */
export function dungeonEncounter(s: GameState, d: DungeonDef): StageInfo | null {
  const { floor, battle } = dungeonPlace(s, d);
  if (floor >= d.floors.length) return null;
  const fl = d.floors[floor];
  const boss = floor === d.floors.length - 1;
  const key = `${d.id}@${floor}.${battle}`;
  const foe = boss ? d.boss : d.pool[(floor * 2 + battle) % d.pool.length];
  return makeInfo(s, foe, { key, level: fl.level, kind: boss ? 'boss' : 'dungeon', bg: d.bg, mercy: mercyOf(s.adv.losses[key] ?? 0), boss });
}

/** 퀘스트에서 지금 싸울 상대(다 이겼으면 null) */
export function questEncounter(s: GameState, q: QuestDef): StageInfo | null {
  const n = s.adv.floors[q.id] ?? 0;
  const b = q.battles[n];
  if (!b) return null;
  const key = `${q.id}.${n}`;
  return makeInfo(s, b, { key, level: b.level, kind: n === q.battles.length - 1 ? 'boss' : 'dungeon', bg: battleBgFor(q.bg), mercy: mercyOf(s.adv.losses[key] ?? 0) });
}

/** 퀘스트 장면 배경(이야기 배경 키)에 어울리는 전투 배경 */
function battleBgFor(storyBg: string): string {
  const map: Record<string, string> = { forest: 'backhill', village: 'backhill', camp: 'north', market: 'alley', alley: 'alley', court: 'palace', gibang: 'pleasure', bath: 'waterway', night: 'underworld', field: 'cave', snowcave: 'north', temple: 'skyroad', skyroad: 'skyroad', galaxy: 'galaxy', loom: 'galaxy', heavenoffice: 'jade', archive: 'archive', jadecourt: 'jade' };
  return map[storyBg] ?? 'alley';
}

export type AdvResult = Won;

/** 모험 전투를 치른다: 필드(수련), 던전(층 진행), 퀘스트 */
export function advFight(s: GameState, now: number, nodeId: string, party: string[]): [GameState, AdvResult | Extract<FightResult, { ok: false }>] {
  const node = NODE_BY_ID[nodeId];
  if (!node || node.kind === 'town' || !nodeOpen(s, node)) return [s, { ok: false, reason: 'bad-party' }];
  const next = settle(s, now);
  const info = node.kind === 'field' ? fieldEncounter(next, node) : node.kind === 'dungeon' ? dungeonEncounter(next, node) : questEncounter(next, node);
  if (!info) return [s, { ok: false, reason: 'all-clear' }];
  if (party.length !== info.rounds.length || new Set(party).size !== party.length || party.some((id) => !next.yokai[id])) {
    return [s, { ok: false, reason: 'bad-party' }];
  }
  const adv = { ...next.adv, floors: { ...next.adv.floors }, losses: { ...next.adv.losses }, cleared: [...next.adv.cleared], chests: [...next.adv.chests] };
  next.adv = adv;

  if (node.kind === 'field') {
    const r: AdvResult = playBattle(next, next, info, party, { giftChance: B.fieldGiftChance });
    adv.floors[`f:${node.id}`] = (adv.floors[`f:${node.id}`] ?? 0) + 1;
    return [next, r];
  }

  if (node.kind === 'dungeon') {
    const { floor, battle } = dungeonPlace(next, node);
    const key = `${node.id}@${floor}.${battle}`;
    const boss = floor === node.floors.length - 1;
    // 대장 장비는 처음 깰 때만 준다(다시 돌 때는 경험치·엽전만)
    const drop = boss && !adv.cleared.includes(node.id) ? node.boss.drop : undefined;
    const r: AdvResult = playBattle(next, next, info, party, { boss, drop, giftChance: boss ? 1 : B.dungeonGiftChance });
    if (!r.won) {
      adv.losses[key] = (adv.losses[key] ?? 0) + 1;
      return [next, r];
    }
    const fl = node.floors[floor];
    if (battle + 1 < fl.battles) {
      adv.floors[`${node.id}#b`] = battle + 1;
      return [next, r];
    }
    // 층을 깼다: 보물상자를 열고 다음 층으로
    adv.floors[node.id] = floor + 1;
    adv.floors[`${node.id}#b`] = 0;
    const chestKey = `${node.id}@${floor}`;
    if (fl.chest && !adv.chests.includes(chestKey)) {
      adv.chests.push(chestKey);
      if (fl.chest.item) addItem(next, fl.chest.item);
      if (fl.chest.coin) next.res.coin += fl.chest.coin;
      r.chest = fl.chest;
    }
    if (floor + 1 >= node.floors.length && !adv.cleared.includes(node.id)) {
      adv.cleared.push(node.id);
      r.cleared = node.id;
    }
    return [next, r];
  }

  // 퀘스트
  const n = next.adv.floors[node.id] ?? 0;
  const key = `${node.id}.${n}`;
  const last = n === node.battles.length - 1;
  const r: AdvResult = playBattle(next, next, info, party, { boss: last, giftChance: last ? 1 : 0 });
  if (!r.won) {
    adv.losses[key] = (adv.losses[key] ?? 0) + 1;
    return [next, r];
  }
  adv.floors[node.id] = n + 1;
  if (last && !adv.cleared.includes(node.id)) {
    adv.cleared.push(node.id);
    r.cleared = node.id;
    if (node.reward) {
      addItem(next, node.reward);
      r.reward = node.reward;
    }
    if (node.recruit && !next.yokai[node.heroine]) {
      next.yokai[node.heroine] = { ...freshYokai(), level: avgLevel(next) };
      r.recruit = node.heroine;
    }
  }
  return [next, r];
}

/** 깬 던전에 다시 들어간다: 층을 처음부터 다시 돈다(보물상자는 한 번만) */
export function reenterDungeon(s: GameState, nodeId: string): GameState {
  const node = NODE_BY_ID[nodeId];
  if (!node || node.kind !== 'dungeon' || !nodeDone(s, node)) return s;
  return { ...s, adv: { ...s.adv, floors: { ...s.adv.floors, [node.id]: 0, [`${node.id}#b`]: 0 } } };
}

export type StepState = 'done' | 'open' | 'locked';

/** 길 위 한 칸의 상태. 마을·필드는 열리면 끝낸 것으로 친다 */
export function stepState(s: GameState, st: PathStep): StepState {
  if (st.kind === 'ep') return s.story.done.includes(st.id) ? 'done' : isEpOpen(s, st.id) ? 'open' : 'locked';
  if (!nodeOpen(s, st.node)) return 'locked';
  if (st.node.kind === 'town' || st.node.kind === 'field') return 'done';
  return nodeDone(s, st.node) ? 'done' : 'open';
}

/** 지금 할 만한 모험(할 일 안내용): 아직 안 깬 열린 던전 → 아직 안 한 열린 퀘스트 */
export function nextAdventure(s: GameState): NodeDef | null {
  for (const region of REGIONS)
    for (const st of pathSteps(region.id)) {
      if (st.kind !== 'node') continue;
      const n = st.node;
      if ((n.kind === 'dungeon' || n.kind === 'quest') && nodeOpen(s, n) && !nodeDone(s, n)) return n;
    }
  return null;
}

/** 지금 가장 잘 맞는 수련 필드: 열린 필드 중 상대 레벨이 우리 평균 레벨에 가장 가까운 곳 */
export function bestField(s: GameState): FieldDef | null {
  const owned = Object.values(s.yokai);
  const avg = owned.reduce((a, y) => a + y.level, 0) / Math.max(1, owned.length);
  let best: FieldDef | null = null;
  let gap = Infinity;
  for (const r of REGIONS)
    for (const st of pathSteps(r.id)) {
      if (st.kind !== 'node' || st.node.kind !== 'field' || !nodeOpen(s, st.node)) continue;
      const mid = (st.node.levels[0] + st.node.levels[1]) / 2;
      const g = Math.abs(mid - avg);
      if (g < gap) [gap, best] = [g, st.node];
    }
  return best;
}
