// 메인 이야기(연재). 화 파일은 content/story/<부>/<화>.json. 수집형 캠페인에서는 장(src/core/campaign.ts)마다 컷신으로 나뉘어 나온다.
import type { Episode, GameState, StoryLine } from './types';

export function sortEpisodes(list: Episode[]): Episode[] {
  return [...list].sort((a, b) => a.season - b.season || a.no - b.no);
}

/** 깃발 조건에 맞는 대사만 */
export const visibleLines = (s: GameState, lines: StoryLine[]) => lines.filter((l) => !l.if || s.story.flags.includes(l.if));

/** 화를 마치면 합류하는 식객들 */
export const episodeRecruits = (ep: Episode): string[] => {
  const r = ep.reward?.recruit;
  return !r ? [] : Array.isArray(r) ? r : [r];
};

/** 이야기에 띄울 수 있는 물건 그림 */
export const ITEMS = ['bangmangi', 'iou', 'emblem', 'shell', 'ledger', 'crack', 'contract', 'reed', 'crate', 'tornseal', 'bond', 'goldmark', 'redledger', 'pearl', 'myeongbu', 'oath', 'skymap', 'starthread', 'heavenbond'];
/** 이야기에 띄울 수 있는 이벤트 그림 */
export const SCENES = [
  'e1-tree', 'e1-ondol', 'e1-coins', 'e2-collar', 'e2-tavern', 'e2-walk-mu', 'e2-walk-bs', 'e3-hide', 'e3-shell', 'e3-measure',
  'e4-mirror', 'e5-catch', 'e6-boat', 'e7-gate', 'e8-shoulder', 'e9-oath', 'e10-robe', 'e10-night',
  's2e1-desk', 's2e2-shadow', 's2e3-dance', 's2e4-name', 's2e4-night', 's2e5-bath', 's2e6-cave', 's2e7-hair', 's2e8-moon',
  's3e1-thunder', 's3e2-ladder', 's3e3-loom', 's3e4-bridge', 's3e5-court', 's3e6-fire', 's3e7-deadline', 's3e8-rain',
];

export const BGS = [
  'village', 'palace', 'market', 'tavern', 'field', 'night', 'forest', 'hall', 'court', 'hut', 'villagenight', 'warehouse', 'ferry', 'pass', 'camp',
  'capital', 'alley', 'gibang', 'bath', 'snowcave', 'bedroom',
  'temple', 'skyroad', 'galaxy', 'loom', 'heavenoffice', 'archive', 'jadecourt', 'shrine',
];

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
  for (const id of episodeRecruits(ep)) if (!heroineIds.has(id)) errs.push(`reward.recruit에 없는 식객: ${id}`);
  for (const [n, b] of (ep.battles ?? []).entries()) {
    if (b.after < 0 || b.after >= (ep.scenes ?? []).length) errs.push(`${n + 1}번째 전투의 after가 장면 밖이에요: ${b.after}`);
    if (!b.foe) errs.push(`${n + 1}번째 전투에 상대 이름이 없어요`);
    for (const id of [...(b.guests ?? []), ...(b.rival ? [b.rival] : [])]) if (!heroineIds.has(id)) errs.push(`${n + 1}번째 전투에 없는 식객: ${id}`);
    for (const l of [...(b.intro ?? []), ...(b.outro ?? [])]) {
      const ok = l.who === 'narration' || l.who === 'me' || l.who.startsWith('npc:') || heroineIds.has(l.who);
      if (!ok) errs.push(`${n + 1}번째 전투 대사의 who가 이상해요: ${l.who}`);
      if (/[一-鿿]/.test(l.text ?? '')) errs.push(`${n + 1}번째 전투 대사에 한자가 있어요: ${l.text}`);
    }
  }
  return errs;
}
