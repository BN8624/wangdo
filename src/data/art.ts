import { CHAPTERS } from './stages';
import { YOKAI } from './yokai';

// 게임에 쓰는 모든 그림의 목록과 프롬프트. `npm run art:generate`가 이 목록을 보고 없는 그림을 그린다.
// 화풍이 흔들리지 않도록 STYLE은 고정하고 종류별 틀 + 대상 묘사만 바꾼다.

const STYLE =
  'Beautiful Korean mobile game illustration in a polished modern webtoon style: clean elegant lineart, soft painterly cel shading, refined harmonious palette. ' +
  'Simple readable designs with minimal ornament (no gold filigree, no layered jewelry, no busy embroidery, no floating petals, no sparkles). Joseon-inspired fantasy. No text, no letters, no watermark, no frame.';

// 디자인 기준은 docs/CHARACTER_GUIDE.md. 체형은 공통, 옷과 자세는 식객마다 다르게(subject에 적는다).
const HEROINE =
  'Polished Korean gacha-game character art: soft airbrushed shading, glossy luminous skin with a warm blush, detailed glossy eyes. ' +
  'The character is clearly an adult woman in her late twenties, very beautiful and glamorous, with a slender, fit model-like figure: tall and long-legged (about eight heads tall), slim shoulders and arms, a very slim waist, long slender legs with shapely slim thighs, a large but natural bust (not oversized); never chubby, plump or stocky. ' +
  'Bold, daring outfit that shows skin (bare back, bare shoulders, deep neckline, high slit, short skirt); legwear differs per character (bare legs are fine, not everyone wears stockings) and her curves; her outfit, pose and expression follow the subject description and express her personality. ' +
  'Alluring but tasteful and non-explicit: no nudity, no underwear visible, no low camera angle looking up the skirt.';

const FRAME = {
  full: `${HEROINE} Full body from head to feet at eye level, her signature pose, feet firmly on the ground (or seated if stated). Modern fashionable outfit mixed with Korean Joseon accents (jeogori collars, ribbon ties, norigae tassels), not a traditional robe. Isolated on a fully transparent background (PNG with alpha), no scenery, no floor, no shadow.`,
  card: `${HEROINE} Three-quarter body shot, dynamic pose, with a scenic background that suits her story.`,
  cg: `${HEROINE} Wide romantic story illustration (event CG) of her alone, seen from the point of view of the viewer who is with her (the viewer is not drawn). Warm emotional lighting and a detailed background.`,
  bg: 'Background art with no people. Tall vertical composition for a phone screen, the lower third fairly open.',
  banner: 'Wide background art with no people, the main subject in the middle horizontal band so it can be cropped into a wide banner.',
  foe: 'A group of adversaries for a battle screen, centered, plain dark background. Menacing but stylish, no gore.',
} as const;

export type ArtKind = keyof typeof FRAME;

/** 그림 한 장. out은 public 기준 경로 */
export interface ArtAsset {
  id: string;
  kind: ArtKind;
  out: string;
  subject: string;
}

export const ASPECT: Record<ArtKind, 'portrait' | 'landscape' | 'square'> = {
  full: 'portrait',
  card: 'portrait',
  cg: 'landscape',
  bg: 'portrait',
  banner: 'landscape',
  foe: 'square',
};

/** 화풍 기준 그림: 인물은 구미호 시안, 배경은 궁궐 시안 */
export const ANCHOR: Record<ArtKind, string> = {
  full: 'art/style-heroine.png',
  card: 'art/style-heroine.png',
  cg: 'art/style-heroine.png',
  bg: 'art/style-scene.png',
  banner: 'art/style-scene.png',
  foe: 'art/style-scene.png',
};

export const artPrompt = (a: ArtAsset) => `${STYLE} ${FRAME[a.kind]}\nSubject: ${a.subject}.`;

export const ART = {
  card: (id: string) => `art/card/${id}.webp`,
  full: (id: string) => `art/full/${id}.webp`,
  cg: (id: string, level: number) => `art/cg/${id}-${level}.webp`,
  bg: (key: string) => `art/bg/${key}.webp`,
  chapter: (id: string) => `art/banner/${id}.webp`,
  foe: (id: string) => `art/foe/${id}.webp`,
  /** 주인공 "나": 전신과 대사창·상태줄에 쓰는 얼굴 */
  heroFull: 'art/full/hero.webp',
  heroFace: 'art/face/hero.webp',
};

/** 이야기 장면에서 주인공 전신을 가리키는 배역 id */
export const HERO_CAST = 'hero';

/** 카드·목록에 쓰는 초상(카드 그림) */
export const portraitPath = ART.card;

const BG: Record<string, string> = {
  palace: 'the grand courtyard of a fantasy Korean palace at dusk, dancheong-painted halls with sweeping tiled roofs, rows of glowing red lanterns, a purple-gold sunset sky, floating blue spirit lights, drifting petals',
  village: 'Dalgol, a cozy mountain village with thatched and tiled roofs, persimmon trees and a big zelkova tree at the crossroads, warm afternoon light',
  market: 'a lively market street in the capital with colorful stall awnings, hanging goods and lanterns, late afternoon',
  tavern: 'the inside of an elegant tavern (jumak) at night, wooden beams, low tables, warm lamplight and paper screens',
  field: 'terraced rice paddies and a granary under a wide blue sky, a stream and a footbridge',
  night: 'a moonlit palace garden at night with a lotus pond, a stone bridge and fireflies',
  forest: 'a deep misty pine forest with shafts of light and an old shrine',
  hall: 'the interior of a county magistrate office (gwana) with a raised dais, folding screen and petition desk',
  hut: 'the inside of a modest thatched-roof cottage room at night, warm low oil-lamp light, paper sliding doors, a folded blanket on the heated floor',
  villagenight: 'Dalgol mountain village at night, thatched houses around a dirt square, a big zelkova tree, torches and paper lanterns, full moon',
  court: 'the royal throne hall with a sun-and-moon folding screen behind the empty throne, red pillars and gold light',
};

const BANNER: Record<string, string> = {
  backhill: 'a mountain pass road through dense pine forest at dusk, a crude wooden toll barricade with torches and bandit flags',
  ferry: 'a busy river ferry crossing at sunset with grain barges, warehouses and lanterns on the docks',
  alley: 'narrow back alleys of the capital at night, rain-wet stone, lanterns and shadowy rooftops',
  pleasure: 'a street of elegant gisaeng houses with red lanterns, silk curtains and music pavilions at night',
  north: 'a bandit fortress on a snowy northern mountain pass under a stormy sky, black banners',
};

const FOES: Record<string, string> = {
  backhill: 'three rough mountain bandits with clubs and a horned goblin brute, torchlight',
  ferry: 'smugglers in straw hats with hooks and ledgers, a scheming merchant boss in the back',
  alley: 'masked private soldiers of a noble clan in black, a sly steward with a fan',
  pleasure: 'beautiful but dangerous fox-masked spies in red with hidden blades',
  north: 'snow-covered bandit warriors with black banners and a giant horned chieftain',
};

export const ART_ASSETS: ArtAsset[] = [
  { id: 'full-hero', kind: 'full', out: ART.heroFull, subject: 'the male protagonist, a handsome adult Korean woodcutter around 29 with messy black hair and a sly friendly grin, white shirt with rolled sleeves, brown hemp vest with a crossed collar, axe on his shoulder, a black dokkaebi club with a red tassel at his belt' },
  ...YOKAI.flatMap((y): ArtAsset[] => [
    { id: `full-${y.id}`, kind: 'full', out: ART.full(y.id), subject: `${y.kind}. ${y.artSubject}` },
    { id: `card-${y.id}`, kind: 'card', out: ART.card(y.id), subject: `${y.kind}. ${y.artSubject}` },
  ]),
  ...Object.entries(BG).map(([key, subject]): ArtAsset => ({ id: `bg-${key}`, kind: 'bg', out: ART.bg(key), subject })),
  ...CHAPTERS.map((c): ArtAsset => ({ id: `banner-${c.id}`, kind: 'banner', out: ART.chapter(c.id), subject: BANNER[c.id] })),
  ...CHAPTERS.map((c): ArtAsset => ({ id: `foe-${c.id}`, kind: 'foe', out: ART.foe(c.id), subject: FOES[c.id] })),
  ...YOKAI.flatMap((y): ArtAsset[] => [
    { id: `cg-${y.id}-3`, kind: 'cg', out: ART.cg(y.id, 3), subject: `${y.kind}. ${y.artSubject}; she shares a secret with a shy smile during a stroll along a lantern-lit riverside market` },
    { id: `cg-${y.id}-5`, kind: 'cg', out: ART.cg(y.id, 5), subject: `${y.kind}. ${y.artSubject}; on a palace balcony during a festival night with fireworks and lanterns, leaning close with a tender, happy smile` },
  ]),
];
