import { CHAPTERS } from './stages';
import { YOKAI } from './yokai';

// 게임에 쓰는 모든 그림의 목록과 프롬프트. `npm run art:generate`가 이 목록을 보고 없는 그림을 그린다.
// 화풍이 흔들리지 않도록 STYLE은 고정하고 종류별 틀 + 대상 묘사만 바꾼다.

const STYLE =
  'Premium Korean mobile game illustration in polished Korean webtoon / modern anime style: clean confident lineart, ' +
  'soft cel shading with rich lighting, saturated colors with gold accents. Joseon-era fantasy kingdom. No text, no letters, no watermark, no frame.';

const HEROINE =
  'The character is clearly an adult woman, glamorous and alluring, wearing a fashionable fantasy fusion-hanbok in her own colors and motifs, ' +
  'with a form-fitting silhouette that shows bare shoulders, collarbones and arms and a high side slit in the skirt showing her legs. ' +
  'Tasteful and non-explicit: no nudity, no underwear visible.';

const FRAME = {
  full: `${HEROINE} Full body standing pose facing slightly to the side, confident and charming. Isolated on a fully transparent background (PNG with alpha), no scenery, no floor, no shadow.`,
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
};

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
  map: 'a bright clean bird\'s-eye town map of Dalgol valley: walled government office at the top, market street middle left, training yard middle right, pavilion on a pond in the center, rice paddies bottom left, thatched tavern bottom right',
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
