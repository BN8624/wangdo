// 메인 이야기(연재). 화 파일은 content/story/<부>/<화>.json이고, 여기서는 열림 조건과 보상만 다룬다.
import { BOND_LEVELS } from '../data/village';
import { rankDef } from '../data/ranks';
import { YOKAI_BY_ID } from '../data/yokai';
import { bondLevel, freshYokai, power } from './engine';
import { fmt } from './format';
import type { Episode, GameState, StoryLine } from './types';

export function sortEpisodes(list: Episode[]): Episode[] {
  return [...list].sort((a, b) => a.season - b.season || a.no - b.no);
}

export function isUnlocked(s: GameState, ep: Episode): boolean {
  const u = ep.unlock ?? {};
  return (
    (!u.after || s.story.done.includes(u.after)) &&
    s.rank >= (u.rank ?? 0) &&
    power(s) >= (u.power ?? 0) &&
    s.stage.index >= (u.stage ?? 0)
  );
}

/** 아직 안 본 화 중 가장 앞의 것 */
export function nextEpisode(s: GameState, all: Episode[]): Episode | null {
  return sortEpisodes(all).find((ep) => !s.story.done.includes(ep.id)) ?? null;
}

/** 잠긴 화를 열려면 무엇이 필요한지 */
export function lockReason(s: GameState, ep: Episode): string | null {
  // 이미 본 화는 조건이 바뀌어도 언제든 다시 볼 수 있다.
  if (s.story.done.includes(ep.id)) return null;
  const u = ep.unlock ?? {};
  if (u.after && !s.story.done.includes(u.after)) return '앞 화를 먼저 봐야 해요';
  if (s.rank < (u.rank ?? 0)) return `관직 〈${rankDef(u.rank!).title}〉에 오르면 열려요`;
  if (power(s) < (u.power ?? 0)) return `권세 ${fmt(u.power!)}이 되면 열려요`;
  if (s.stage.index < (u.stage ?? 0)) return `토벌을 ${u.stage}번 해내면 열려요`;
  return null;
}

/** 깃발 조건에 맞는 대사만 */
export const visibleLines = (s: GameState, lines: StoryLine[]) => lines.filter((l) => !l.if || s.story.flags.includes(l.if));

export interface EpisodeResult {
  recruit: string | null;
  bondUps: { id: string; level: number }[];
}

/** 화를 다 봤을 때: 고른 선택지의 효과와 보상을 적용한다. choices[i]는 i번째 장면에서 고른 번호 */
export function completeEpisode(s: GameState, ep: Episode, choices: (number | null)[]): [GameState, EpisodeResult] {
  if (s.story.done.includes(ep.id) || !isUnlocked(s, ep)) return [s, { recruit: null, bondUps: [] }];
  const next = structuredClone(s);
  const before = Object.fromEntries(Object.entries(next.yokai).map(([id, y]) => [id, bondLevel(y.bond)]));

  ep.scenes.forEach((scene, i) => {
    const pick = choices[i];
    if (!scene.choice || pick === null || pick === undefined) return;
    const fx = scene.choice.options[pick]?.effects;
    if (!fx) return;
    for (const [id, amount] of Object.entries(fx.bond ?? {})) if (next.yokai[id]) next.yokai[id].bond += amount;
    for (const f of fx.flags ?? []) if (!next.story.flags.includes(f)) next.story.flags.push(f);
    for (const [k, v] of Object.entries(fx.res ?? {})) next.res[k as keyof typeof next.res] += v ?? 0;
  });

  const r = ep.reward ?? {};
  next.res.coin += r.coin ?? 0;
  next.res.grain += r.grain ?? 0;
  next.res.fame += r.fame ?? 0;
  let recruit: string | null = null;
  if (r.recruit && YOKAI_BY_ID[r.recruit] && !next.yokai[r.recruit]) {
    next.yokai[r.recruit] = freshYokai();
    recruit = r.recruit;
  }
  next.story.done.push(ep.id);

  const bondUps = Object.entries(next.yokai)
    .filter(([id, y]) => before[id] !== undefined && bondLevel(y.bond) > before[id] && bondLevel(y.bond) < BOND_LEVELS.length)
    .map(([id, y]) => ({ id, level: bondLevel(y.bond) }));
  return [next, { recruit, bondUps }];
}

/** 이야기에 띄울 수 있는 물건 그림 */
export const ITEMS = ['bangmangi', 'iou', 'emblem', 'shell', 'ledger', 'crack', 'contract', 'reed', 'crate', 'tornseal', 'bond'];
/** 이야기에 띄울 수 있는 이벤트 그림 */
export const SCENES = [
  'e1-tree', 'e1-ondol', 'e1-coins', 'e2-collar', 'e2-tavern', 'e2-walk-mu', 'e2-walk-bs', 'e3-hide', 'e3-shell', 'e3-measure',
  'e4-mirror', 'e5-catch', 'e6-boat', 'e7-gate', 'e8-shoulder', 'e9-oath', 'e10-robe', 'e10-night',
];

export const BGS = ['village', 'palace', 'market', 'tavern', 'field', 'night', 'forest', 'hall', 'court', 'hut', 'villagenight', 'warehouse', 'ferry', 'pass', 'camp'];

/** 화 파일이 형식에 맞는지 검사한다. 문제가 없으면 빈 배열 */
export function validateEpisode(ep: Episode, heroineIds: Set<string>): string[] {
  const errs: string[] = [];
  if (!/^s\d+e\d+$/.test(ep.id ?? '')) errs.push(`id 형식이 이상해요: ${ep.id}`);
  if (ep.id !== `s${ep.season}e${String(ep.no).padStart(2, '0')}`) errs.push(`id와 season/no가 맞지 않아요: ${ep.id}`);
  if (!ep.title || !ep.summary) errs.push('title·summary가 비었어요');
  if (!Array.isArray(ep.scenes) || ep.scenes.length === 0) errs.push('장면이 없어요');
  for (const [i, sc] of (ep.scenes ?? []).entries()) {
    if (!BGS.includes(sc.bg)) errs.push(`${i + 1}장면 bg가 목록에 없어요: ${sc.bg}`);
    for (const c of sc.cast ?? []) if (!heroineIds.has(c)) errs.push(`${i + 1}장면 cast에 없는 식객: ${c}`);
    for (const l of sc.lines ?? []) {
      const ok = l.who === 'narration' || l.who === 'me' || l.who.startsWith('npc:') || heroineIds.has(l.who);
      if (!ok) errs.push(`${i + 1}장면 who가 이상해요: ${l.who}`);
      if (!l.text) errs.push(`${i + 1}장면에 빈 대사가 있어요`);
      if (/[一-鿿]/.test(l.text ?? '')) errs.push(`${i + 1}장면 대사에 한자가 있어요: ${l.text}`);
      if (l.img && !ITEMS.includes(l.img)) errs.push(`${i + 1}장면 img가 목록에 없어요: ${l.img}`);
      if (l.cg && !SCENES.includes(l.cg)) errs.push(`${i + 1}장면 cg가 목록에 없어요: ${l.cg}`);
      if (l.show && !(sc.cast ?? []).includes(l.show)) errs.push(`${i + 1}장면 show가 cast에 없어요: ${l.show}`);
    }
    for (const o of sc.choice?.options ?? []) {
      for (const id of Object.keys(o.effects?.bond ?? {})) if (!heroineIds.has(id)) errs.push(`선택지 bond에 없는 식객: ${id}`);
    }
  }
  if (ep.reward?.recruit && !heroineIds.has(ep.reward.recruit)) errs.push(`reward.recruit에 없는 식객: ${ep.reward.recruit}`);
  return errs;
}
