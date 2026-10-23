import raw from '../../content/heroines.json';
import type { Grade, StatKey, Stats, YokaiDef } from '../core/types';

// 식객 명부. 사람이 읽는 설정은 docs/STORY_BIBLE.md, 게임이 쓰는 값은 content/heroines.json에 있다.
// 능력치는 등급과 특기로 정하고, 이름에 따라 조금씩 흔들어 같은 등급끼리도 개성이 나게 한다.

interface HeroineJson {
  id: string;
  name: string;
  kind: string;
  grade: Grade;
  specialty: StatKey;
  likes: [string, string];
  join: string;
  intro: string;
  personality?: string;
  voice?: string;
  art: string;
}

const KEYS: StatKey[] = ['might', 'wit', 'politics', 'charm'];
/** 등급별 [특기, 나머지] 기본값과 레벨당 성장 */
const BASE: Record<Grade, [number, number]> = { 1: [120, 50], 2: [180, 70], 3: [260, 100] };
const GROWTH: Record<Grade, [number, number]> = { 1: [16, 6], 2: [22, 8], 3: [30, 10] };
const SPEC_COLOR: Record<StatKey, string> = { might: '#c0392b', wit: '#c98a1e', politics: '#2e7566', charm: '#b5527a' };

/** 이름으로 정해지는 0.85~1.15 사이 흔들림 */
function wobble(id: string, k: string): number {
  let h = 2166136261;
  for (const c of id + k) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 0.85 + ((h >>> 0) % 1000) / 1000 * 0.3;
}

function build(h: HeroineJson): YokaiDef {
  const base = {} as Stats;
  const growth = {} as Stats;
  for (const k of KEYS) {
    const spec = k === h.specialty;
    base[k] = Math.round(BASE[h.grade][spec ? 0 : 1] * wobble(h.id, k));
    growth[k] = Math.round(GROWTH[h.grade][spec ? 0 : 1] * wobble(h.id, `g${k}`) * 10) / 10;
  }
  return {
    id: h.id,
    name: h.name,
    kind: h.kind,
    grade: h.grade,
    specialty: h.specialty,
    base,
    growth,
    intro: h.intro,
    likes: h.likes,
    artSubject: h.art,
    color: SPEC_COLOR[h.specialty],
    join: h.join,
    voice: h.voice ?? '',
  };
}

export const YOKAI: YokaiDef[] = (raw as HeroineJson[]).map(build);
export const YOKAI_BY_ID: Record<string, YokaiDef> = Object.fromEntries(YOKAI.map((y) => [y.id, y]));

/** 처음부터 함께하는 식객(1화에서 합류) */
export const STARTERS = YOKAI.filter((y) => y.join === 'story:s1e01').map((y) => y.id);

export const STAT_LABEL: Record<StatKey, string> = { might: '무력', wit: '지략', politics: '정치', charm: '매력' };
export const GRADE_LABEL: Record<number, string> = { 1: '일반', 2: '희귀', 3: '전설' };
