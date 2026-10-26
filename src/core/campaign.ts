// 캠페인: 장(= 이야기 화)마다 스테이지 여섯. 화의 전투가 주요 스테이지가 되고(마지막 전투 = 대장),
// 나머지는 그 장의 무대에 맞는 졸개 웨이브로 채운다. 화의 장면은 스테이지 사이 컷신으로 나눠 넣는다.
import { BALANCE as B } from '../data/balance';
import { EPISODES } from '../data/story';
import { CHAPTERS as SETS } from '../data/stages';
import { NODE_BY_ID, REGIONS, type FoeDef } from '../data/world';
import type { Element, Role } from '../data/roster';
import { YOKAI_BY_ID } from '../data/yokai';
import meetsData from '../../content/meets.json';
import type { CombatResult, CombatSetup, UnitInit } from './combat';
import { nextRandom } from './rng';
import type { Episode, GameState, StoryBattle, StoryLine } from './types';
import { foeUnit, heroUnit, levelCap, startStars, wavePower } from './units';

export interface Cut {
  /** 이 범위의 장면(포함)을 보여 준다 */
  scenes?: [number, number];
  /** 이야기 전투 앞뒤 대화 */
  lines?: StoryLine[];
}

export interface StageDef {
  id: string;
  /** 0부터 센 장 순번 */
  chapter: number;
  /** 장 안의 번호(1~6) */
  k: number;
  ep: Episode;
  /** "3-4" */
  label: string;
  level: number;
  boss: boolean;
  /** 이 스테이지가 맡은 이야기 전투 */
  battle?: StoryBattle;
  pre: Cut;
  post: Cut;
  bg: string;
  /** 만남: 이 스테이지를 처음 깨면 합류하는 식객(뽑기 없이도 모두 만날 수 있게) */
  meet?: { heroine: string; name: string };
}

interface MeetDef {
  id: string;
  heroine: string;
  name: string;
  lines: StoryLine[];
}
/** 만남 이야기를 맡을 장. 그 장에서 이야기 전투가 없는 둘째 스테이지 이후 첫 스테이지가 만남 무대가 된다 */
const MEET_AT: Record<string, string> = { 'm:seorin': 's1e03', 'm:danhui': 's1e06', 'm:bulsae': 's1e08' };
const MEETS = (meetsData as MeetDef[]).filter((m) => MEET_AT[m.id] && YOKAI_BY_ID[m.heroine]);

const N = B.stagesPerChapter;
const OLD_MAX = Math.max(...EPISODES.flatMap((e) => (e.battles ?? []).map((b) => b.level ?? 1)));
/** 화의 전투 레벨을 마지막 장 대장 레벨에 맞춰 줄인다 */
const scaleLevel = (lv: number) => Math.max(1, Math.round((lv * B.finalLevel) / OLD_MAX));

function hash(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** 화의 전투를 맡을 스테이지 번호 */
function battleStages(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [N];
  return Array.from({ length: count }, (_, i) => Math.max(1, Math.round((N * (i + 1)) / count)));
}

function buildChapter(ep: Episode, chapter: number, startLevel: number): StageDef[] {
  const battles = ep.battles ?? [];
  const at = battleStages(battles.length);
  const endLevel = Math.max(startLevel, ...battles.map((b) => scaleLevel(b.level ?? 1)));
  const lastScene = ep.scenes.length - 1;
  const set = battles[0]?.set ?? 'backhill';
  const stages: StageDef[] = [];
  let shown = -1;
  for (let k = 1; k <= N; k++) {
    const bi = at.indexOf(k);
    const battle = bi >= 0 ? battles[bi] : undefined;
    const pre: Cut = {};
    if (battle) {
      const upto = Math.min(lastScene, battle.after);
      // 첫 스테이지가 이 전투가 아니면 첫 장면만 1스테이지 앞에 두었다
      if (upto > shown) pre.scenes = [shown + 1, upto];
      shown = Math.max(shown, upto);
      if (battle.intro?.length) pre.lines = battle.intro;
    } else if (k === 1 && lastScene >= 0) {
      const firstBattle = battles[0]?.after ?? lastScene;
      const upto = Math.min(firstBattle, 0);
      pre.scenes = [0, upto];
      shown = upto;
    }
    const post: Cut = {};
    if (battle?.outro?.length) post.lines = battle.outro;
    if (k === N && shown < lastScene) post.scenes = [shown + 1, lastScene];
    const level = Math.round(startLevel + ((endLevel - startLevel) * k) / N);
    stages.push({
      id: `${ep.id}-${k}`,
      chapter,
      k,
      ep,
      label: `${chapter + 1}-${k}`,
      level: battle ? Math.max(level, scaleLevel(battle.level ?? 1)) : level,
      boss: k === N,
      battle,
      pre,
      post,
      bg: battle?.bg ?? (battle?.set ?? set),
    });
  }
  for (const m of MEETS.filter((x) => MEET_AT[x.id] === ep.id)) {
    const st = stages.find((x) => x.k >= 2 && !x.battle && !x.boss && !x.meet && !x.pre.lines);
    if (!st) continue;
    st.meet = { heroine: m.heroine, name: m.name };
    // 대본의 'her'는 그 식객
    st.pre = { ...st.pre, lines: m.lines.map((l) => (l.who === 'her' ? { ...l, who: m.heroine } : l)) };
  }
  return stages;
}

function buildAll(): StageDef[] {
  const out: StageDef[] = [];
  let level = 1;
  EPISODES.forEach((ep, i) => {
    const chapter = buildChapter(ep, i, level);
    out.push(...chapter);
    level = chapter[chapter.length - 1].level;
  });
  return out;
}

export const STAGES: StageDef[] = buildAll();
export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map((st) => [st.id, st]));
export const CHAPTER_COUNT = EPISODES.length;
export const chapterStages = (chapter: number) => STAGES.filter((st) => st.chapter === chapter);

// ───────────────────────── 진행 ─────────────────────────

export const stageStars = (s: GameState, id: string) => s.camp.stars[id] ?? 0;
export const stageCleared = (s: GameState, id: string) => stageStars(s, id) > 0;

/** 앞 스테이지를 깼으면 열린다 */
export function stageOpen(s: GameState, st: StageDef): boolean {
  const i = STAGES.indexOf(st);
  return i <= 0 || stageCleared(s, STAGES[i - 1].id);
}

/** 다음에 깰 스테이지(다 깼으면 null) */
export function nextStage(s: GameState): StageDef | null {
  return STAGES.find((st) => !stageCleared(s, st.id)) ?? null;
}

/** 가장 멀리 깬 스테이지 */
export function furthestStage(s: GameState): StageDef | null {
  let last: StageDef | null = null;
  for (const st of STAGES) if (stageCleared(s, st.id)) last = st;
  return last;
}

export const chapterStars = (s: GameState, chapter: number) => chapterStages(chapter).reduce((a, st) => a + stageStars(s, st.id), 0);
export const chapterOpen = (s: GameState, chapter: number) => stageOpen(s, chapterStages(chapter)[0]);

// ───────────────────────── 적 ─────────────────────────

const ELEMENTS: Element[] = ['fire', 'water', 'wood', 'light', 'dark'];
const ROLES: Role[] = ['attack', 'attack', 'attack', 'defense', 'defense', 'support', 'support', 'heal'];

/** 그 장의 졸개들: 이야기 화가 있는 지역의 필드·던전 무리, 없으면 화 전투의 무대 */
function gruntPool(ep: Episode): FoeDef[] {
  const region = REGIONS.find((r) => r.path.includes(`ep:${ep.id}`));
  const pool: FoeDef[] = [];
  for (const p of region?.path ?? []) {
    const n = NODE_BY_ID[p];
    if (n?.kind === 'field') pool.push(...n.foes);
    if (n?.kind === 'dungeon') pool.push(...n.pool);
  }
  if (pool.length) return pool;
  const set = SETS.find((c) => c.id === (ep.battles?.[0]?.set ?? 'backhill')) ?? SETS[0];
  return set.foes.map((name, i) => ({ name, art: `grunt/${set.id}${set.grunts[i] > 1 ? `-${set.grunts[i]}` : ''}` }));
}

function storyFoeArt(b: StoryBattle): string {
  if (b.rival) return `art/full/${b.rival}.webp`;
  if (b.art) return `art/${b.art}.webp`;
  if (b.boss) return `art/boss/${b.set}.webp`;
  return `art/grunt/${b.set}${b.grunt && b.grunt > 1 ? `-${b.grunt}` : ''}.webp`;
}

/** 스테이지의 적 웨이브. 정해진 규칙으로 만들어 늘 같다 */
export function stageWaves(st: StageDef): UnitInit[][] {
  const pool = gruntPool(st.ep);
  let seed = hash(st.id);
  const pick = () => {
    const [r, next] = nextRandom(seed);
    seed = next;
    return r;
  };
  const tutorial = st.chapter === 0 && st.k === 1;
  const power = (1 + B.foeChapterGrowth * st.chapter) * (st.battle?.power ?? 1) * (tutorial ? 0.5 : 1);
  // 대장·정예 스테이지는 장의 벽: 별을 올린 만큼 시원해지는 건 졸개 스테이지이고, 벽은 키워야 넘는다
  const tough = st.battle && !tutorial ? 1 + B.gateHpGrowth * st.chapter : 1;
  const grunt = (i: number, w: number) => {
    const f = pool[Math.floor(pick() * pool.length)];
    return foeUnit({
      id: `${st.id}:${w}:${i}`,
      name: f.name,
      art: `art/${f.art}.webp`,
      level: st.level,
      role: ROLES[Math.floor(pick() * ROLES.length)],
      element: ELEMENTS[hash(f.name) % ELEMENTS.length],
      kind: 'grunt',
      power,
      tough,
      skill: pick() < 0.35,
    });
  };
  const waveCount = tutorial ? 1 : st.k <= 2 ? 2 : 3;
  const size = tutorial ? 2 : Math.min(5, 2 + Math.floor(st.chapter / 5) + (st.k >= 4 ? 1 : 0));
  const waves: UnitInit[][] = [];
  for (let w = 0; w < waveCount; w++) waves.push(Array.from({ length: size }, (_, i) => grunt(i, w)));
  if (st.battle && !tutorial) {
    const b = st.battle;
    const kind = st.boss ? 'boss' : 'elite';
    const lead = foeUnit({
      id: `${st.id}:lead`,
      name: b.foe,
      art: storyFoeArt(b),
      level: st.level,
      role: st.boss ? 'attack' : ROLES[hash(b.foe) % ROLES.length],
      element: b.rival && YOKAI_BY_ID[b.rival] ? (ELEMENTS[hash(b.rival) % ELEMENTS.length]) : ELEMENTS[hash(b.foe) % ELEMENTS.length],
      kind,
      power,
      tough,
      skill: true,
    });
    const last = waves[waves.length - 1];
    last.splice(Math.max(1, last.length - 2), last.length, lead);
  }
  return waves;
}

/** 권장 전투력 */
export const stagePower = (st: StageDef) => wavePower(stageWaves(st));

/** 같은 스테이지·같은 편성·같은 식객 상태면 같은 씨앗(다시 눌러 운으로 이기지 않게) */
export function battleSeed(s: GameState, key: string, team: string[]): number {
  let text = key;
  for (const id of team) {
    const y = s.yokai[id];
    if (y) text += `|${id}:${y.level}:${y.stars}:${y.gear.weapon ?? ''}:${y.gear.trinket ?? ''}:${Math.floor(y.bond / 50)}`;
  }
  return hash(text);
}

export function stageSetup(s: GameState, st: StageDef, team: string[]): CombatSetup {
  const ids = team.slice(0, 5);
  return { allies: ids.map((id) => (id && s.yokai[id] ? heroUnit(s, id, ids) : null)), waves: stageWaves(st) };
}

// ───────────────────────── 보상 ─────────────────────────

export interface StageReward {
  jade: number;
  coin: number;
  exp: number;
  fame: number;
  memory: number;
  items: string[];
  recruits: string[];
  shards: Record<string, number>;
}

export const emptyReward = (): StageReward => ({ jade: 0, coin: 0, exp: 0, fame: 0, memory: 0, items: [], recruits: [], shards: {} });

/** 첫 클리어 보상 미리보기 */
export function firstClearReward(st: StageDef): StageReward {
  const r = emptyReward();
  r.jade = st.boss ? B.bossClearJade : B.firstClearJade;
  r.coin = Math.round(B.stageCoin.base + B.stageCoin.perLevel * st.level);
  r.exp = Math.round(B.stageExp.base + B.stageExp.perLevel * st.level);
  r.fame = Math.round(B.stageFame.base + B.stageFame.perLevel * st.level);
  if (st.boss) {
    r.memory = B.chapterMemory;
    r.coin += st.ep.reward?.coin ?? 0;
    r.fame += st.ep.reward?.fame ?? 0;
  }
  return r;
}

export function episodeRecruits(ep: Episode): string[] {
  const r = ep.reward?.recruit;
  return (Array.isArray(r) ? r : r ? [r] : []).filter((id) => YOKAI_BY_ID[id]);
}

/** 이 장에서 합류하는 식객(대장을 깨면 합류 + 만남 스테이지) */
export const chapterRecruits = (chapter: number): string[] => [...new Set([...chapterStages(chapter).flatMap((st) => (st.meet ? [st.meet.heroine] : [])), ...episodeRecruits(EPISODES[chapter])])];

/** 만남이 생기기 전에 그 스테이지를 지나간 저장은 불러올 때 합류시킨다(제자리에서 고친다) */
export function catchUpMeets(s: GameState): string[] {
  const added: string[] = [];
  for (const st of STAGES) {
    if (!st.meet || !stageCleared(s, st.id) || s.yokai[st.meet.heroine]) continue;
    recruit(s, st.meet.heroine, emptyReward());
    added.push(st.meet.heroine);
  }
  return added;
}

/** 합류시킨다. 이미 있으면 그 식객 조각 */
function recruit(s: GameState, id: string, reward: StageReward) {
  if (s.yokai[id]) {
    s.yokai[id].shards += B.storyDupeShards;
    reward.shards[id] = (reward.shards[id] ?? 0) + B.storyDupeShards;
    return;
  }
  const top = Object.values(s.yokai).map((y) => y.level).sort((a, b) => b - a).slice(0, 5);
  const level = Math.max(1, Math.round(top.reduce((a, x) => a + x, 0) / Math.max(1, top.length)));
  const stars = startStars(id);
  s.yokai[id] = { level: Math.min(level, levelCap(stars)), stars, shards: 0, bond: 0, talkAt: 0, outingAt: 0, seen: 0, talks: 0, gear: {} };
  reward.recruits.push(id);
}

/** 스테이지 결과를 반영한다(제자리에서 고친다). 지면 아무것도 주지 않는다 */
export function applyStage(s: GameState, st: StageDef, team: string[], result: CombatResult): { first: boolean; stars: number; reward: StageReward } {
  const reward = emptyReward();
  if (!result.won) {
    s.totals.losses += 1;
    return { first: false, stars: 0, reward };
  }
  s.totals.wins += 1;
  s.totals.stages += 1;
  const prev = stageStars(s, st.id);
  const stars = Math.max(prev, result.stars);
  s.camp = { stars: { ...s.camp.stars, [st.id]: stars } };
  const first = prev === 0;
  if (first) Object.assign(reward, firstClearReward(st));
  reward.jade += (stars - prev) * B.starJade;
  for (const id of team) if (id && s.yokai[id]) s.yokai[id].bond += B.battleBond;
  if (first && st.meet) recruit(s, st.meet.heroine, reward);
  if (first && st.boss) {
    if (!s.story.done.includes(st.ep.id)) s.story = { ...s.story, done: [...s.story.done, st.ep.id] };
    for (const id of episodeRecruits(st.ep)) recruit(s, id, reward);
  }
  s.res.jade += reward.jade;
  s.res.coin += reward.coin;
  s.res.exp += reward.exp;
  s.res.fame += reward.fame;
  if (reward.memory) s.inventory = { ...s.inventory, memory: (s.inventory.memory ?? 0) + reward.memory };
  if (s.totals.wins % B.winsPerPetition === 0) s.wish = { ...s.wish, charges: s.wish.charges + 1 };
  return { first, stars, reward };
}
