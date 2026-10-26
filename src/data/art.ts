import { CHAPTERS } from './stages';
import { YOKAI } from './yokai';
import { BATTLE_SUBJECTS, ENEMY_SUBJECTS, ITEM_SUBJECTS, STORY_ART_BRIEFS, bondArtSubject } from './art-direction';

// 게임에 쓰는 모든 그림의 목록과 프롬프트. `npm run art:generate`가 이 목록을 보고 없는 그림을 그린다.
// 화풍이 흔들리지 않도록 STYLE은 고정하고 종류별 틀 + 대상 묘사만 바꾼다.

const STYLE =
  'Polished Korean mobile fantasy game illustration, matching the references: softly painted semi-realistic rendering, elegant edges, luminous skin, tactile hair and fabric, refined harmonious palette. ' +
  'Simple readable shapes and restrained ornament: preserve signature details but avoid covering every surface with gold filigree, layered jewelry or busy embroidery. No floating petals or decorative sparkles. Joseon-inspired fantasy. No text, no letters, no watermark, no frame.';

// 디자인 기준은 docs/CHARACTER_GUIDE.md. 체형은 공통, 옷과 자세는 식객마다 다르게(subject에 적는다).
const HEROINE =
  'Polished Korean gacha-game character art: soft airbrushed shading, glossy luminous skin with a warm blush, detailed glossy eyes. ' +
  'The character is clearly an adult woman of the age specified in her subject, beautiful and glamorous. Preserve her established face, hair color and tall graceful adult proportions from the identity references. ' +
  'Preserve the established fashion appeal. Her outfit silhouette, legwear, pose and expression follow her specific profession and personality in the subject; do not give every character the same dress, draped sleeves or smile. ' +
  'Alluring but tasteful and non-explicit: no nudity, no underwear visible, no low camera angle looking up the skirt.';

const FRAME = {
  full: `${HEROINE} Full body from head to feet at eye level, her signature pose, feet firmly on the same baseline (or seated if stated), with 5% safety padding for head, shoes and props. Use her established role-specific fantasy costume with Korean Joseon collars, knots and accessories. Isolated on a fully transparent background (PNG with alpha), no scenery, no floor, no shadow.`,
  card: `${HEROINE} Vertical portrait from head to mid-thigh at eye level. She looks toward the viewer with her characteristic expression. A quiet, softly blurred background belonging to her story; no lantern bokeh, petals or decorative sparkles.`,
  cg: `${HEROINE} Tall vertical 2:3 romantic story illustration (event CG) of her alone, seen from the point of view of the viewer who is with her. The viewer is never drawn: no hand, arm, sleeve, leg or silhouette of the viewer anywhere in the frame; anything she gives or receives stays in her own hands or on a surface. Express the specific emotional moment, with quiet warm lighting and a subdued background. Keep her face and hands clear of the bottom quarter reserved for dialogue.`,
  bg: 'Background art with no people. Tall vertical composition for a phone screen, the lower third fairly open.',
  banner: 'Wide background art with no people, the main subject in the middle horizontal band so it can be cropped into a wide banner.',
  foe: 'A group of adversaries for a battle screen, centered, plain dark background. Menacing but stylish, no gore.',
  battle: 'Tall vertical 2:3 battle background, no people. Keep the central and lower fighting area open, with a clear ground plane; architecture and props stay at the sides and far background. Calm values behind the enemy silhouettes. No foreground obstruction.',
  boss: 'One adult Korean Joseon-fantasy boss, head to mid-thigh portrait facing the viewer at eye level. Preserve the identity reference face, hair, outfit and signature prop. Transparent background, no scenery, floor or shadow. Readable large shapes, restrained ornament, no gore.',
  grunt: 'One adult Korean Joseon-fantasy adversary, head to mid-thigh portrait facing the viewer at eye level. Preserve the identity reference face, hair, outfit and signature prop. Transparent background, no scenery, floor or shadow. Readable large shapes, restrained ornament, no gore.',
  enemy: 'One adult Korean Joseon-fantasy opponent for the battle field, COMPLETE FULL BODY from the top of the head to both feet with 5% transparent safety padding. Both feet visibly grounded on the same baseline, balanced combat-ready pose, eye-level camera. Preserve the identity reference face, hair, outfit, palette and signature weapon; extend the existing portrait into a coherent full body. Transparent background, no scenery, no floor, no painted shadow, no frame, no other characters. Keep weapons inside the canvas. No anatomy or clothing cropped by the image edges.',
  item: 'One clearly readable Korean Joseon-fantasy story prop, centered square composition with 8% safety padding, fully transparent background and no scenery, frame or text. Use a simple three-quarter view and restrained materials.',
  scene: 'Tall vertical 2:3 first-person story event illustration. The protagonist is never drawn: no hand, arm, sleeve or silhouette of the protagonist anywhere in the image; anything handed over stays in the hands of the other character or on a surface. Preserve referenced character identities. Depict the specific narrative action and emotional expression, with a quiet background. Keep faces and important gestures in the upper three quarters for the dialogue overlay. No collage, no text, no explicit nudity or sexual activity.',
} as const;

export type ArtKind = keyof typeof FRAME;

/** 그림 한 장. out은 public 기준 경로 */
export interface ArtAsset {
  id: string;
  kind: ArtKind;
  out: string;
  subject: string;
  /** ROOT 기준 경로. 화풍 참조와 별도로 얼굴·의상·물건의 동일성을 보존한다. */
  identity?: string[];
  /** 원본 설정/대사의 위치. 제작 이력을 따라갈 수 있게 한다. */
  source?: string;
}

/** 생성 구도와 납품 해상도를 함께 관리한다. resize가 세로 CG를 작은 가로 상자에 넣지 않게 한다. */
export const ART_SPECS: Record<ArtKind, { aspect: 'portrait' | 'landscape' | 'square'; width: number; height: number; transparent: boolean }> = {
  full: { aspect: 'portrait', width: 800, height: 1200, transparent: true },
  card: { aspect: 'portrait', width: 768, height: 1152, transparent: false },
  cg: { aspect: 'portrait', width: 900, height: 1350, transparent: false },
  bg: { aspect: 'portrait', width: 900, height: 1350, transparent: false },
  banner: { aspect: 'landscape', width: 1200, height: 800, transparent: false },
  foe: { aspect: 'square', width: 640, height: 640, transparent: false },
  battle: { aspect: 'portrait', width: 900, height: 1350, transparent: false },
  boss: { aspect: 'portrait', width: 800, height: 1200, transparent: true },
  grunt: { aspect: 'portrait', width: 800, height: 1200, transparent: true },
  enemy: { aspect: 'portrait', width: 800, height: 1200, transparent: true },
  item: { aspect: 'square', width: 640, height: 640, transparent: true },
  scene: { aspect: 'portrait', width: 900, height: 1350, transparent: false },
};
export const ASPECT = Object.fromEntries(Object.entries(ART_SPECS).map(([kind, spec]) => [kind, spec.aspect])) as Record<ArtKind, 'portrait' | 'landscape' | 'square'>;

/** 화풍 기준 그림: 인물은 백설 카드(2026-10 정본을 art/에 고정해 백설을 다시 그려도 기준이 흔들리지 않게), 배경은 궁궐 시안 */
export const ANCHOR: Record<ArtKind, string> = {
  full: 'art/style-heroine-card.webp',
  card: 'art/style-heroine-card.webp',
  cg: 'art/style-heroine-card.webp',
  bg: 'art/style-scene.png',
  banner: 'art/style-scene.png',
  foe: 'art/style-scene.png',
  battle: 'art/style-scene.png',
  boss: 'public/art/boss/ferry.webp',
  grunt: 'public/art/boss/ferry.webp',
  enemy: 'public/art/boss/ferry.webp',
  item: 'public/art/item/ledger.webp',
  scene: 'public/art/scene/e1-tree.webp',
};

export const artPrompt = (a: ArtAsset) => `${STYLE} ${FRAME[a.kind]}\nSubject: ${a.subject}.`;

export const ART = {
  card: (id: string) => `art/card/${id}.webp`,
  full: (id: string) => `art/full/${id}.webp`,
  cg: (id: string, level: number) => `art/cg/${id}-${level}.webp`,
  bg: (key: string) => `art/bg/${key}.webp`,
  chapter: (id: string) => `art/banner/${id}.webp`,
  foe: (id: string) => `art/foe/${id}.webp`,
  /** 토벌 전투 배경(세로), 장마다 대장과 일반 졸개 그림 */
  battle: (id: string) => `art/battle/${id}.webp`,
  boss: (id: string) => `art/boss/${id}.webp`,
  grunt: (id: string, v = 1) => (v > 1 ? `art/grunt/${id}-${v}.webp` : `art/grunt/${id}.webp`),
  /** 전장 전용 전신. 기존 boss/grunt 초상은 아이콘·목록에 계속 쓴다. */
  enemy: (kind: 'boss' | 'grunt', id: string) => `art/enemy/${kind}/${id}.webp`,
  item: (key: string) => `art/item/${key}.webp`,
  scene: (key: string) => `art/scene/${key}.webp`,
};


/** 카드·목록에 쓰는 초상(카드 그림) */
export const portraitPath = ART.card;

/** 전장용 전신이 실제로 있는 적(`kind/id`). 없는 적은 초상을 쓴다. 없는 파일을 불러 보고 실패를 기다리면
 *  웨이브 시작에 빈칸이 비치고 칸 크기가 바뀌므로 목록으로 정한다(테스트가 public/art/enemy와 맞춰 본다). */
export const ENEMY_FIGURES = new Set([
  'boss/alley',
  'boss/backhill',
  'boss/dobak',
  'boss/ferry',
  'boss/noegong',
  'grunt/alley',
  'grunt/backhill',
  'grunt/backhill-2',
  'grunt/ferry',
  'grunt/underworld',
]);

const BG: Record<string, string> = {
  palace: 'the grand courtyard of a fantasy Korean palace at dusk, dancheong-painted halls with sweeping tiled roofs and restrained warm windows, soft purple evening sky, a quiet central character area without floating particles',
  village: 'Dalgol, a cozy mountain village with thatched and tiled roofs, persimmon trees and a big zelkova tree at the crossroads, warm afternoon light',
  market: 'a Korean capital market with indigo and ochre cloth awnings, simple goods at the edges and a broad matte stone walking lane; warm neutral late-afternoon daylight and distant green mountains, unlit corner lanterns, no festival lights or petals',
  tavern: 'the inside of an elegant tavern (jumak) at night, wooden beams, low tables, warm lamplight and paper screens',
  field: 'terraced rice paddies and a granary under a wide blue sky, a stream and a footbridge',
  night: 'a serene moon-blue Korean palace garden, low stone arched bridge, sparse lotus leaves, pine silhouettes and quiet pond; slate-blue and teal with only two dim warm windows at the edges, no fireflies or golden reflection streaks',
  forest: 'a deep misty pine forest with shafts of light and an old shrine',
  hall: 'the interior of a county magistrate office (gwana) with a raised dais, folding screen and petition desk',
  hut: 'the inside of a modest thatched-roof cottage room at night, warm low oil-lamp light, paper sliding doors, a folded blanket on the heated floor',
  villagenight: 'Dalgol mountain village at night, thatched houses around a dirt square, a big zelkova tree, torches and paper lanterns, full moon',
  court: 'the royal throne hall with a sun-and-moon folding screen behind the empty throne, red pillars and gold light',
  warehouse: 'the inside of a large wooden granary warehouse, rows of storage bays, a few rice sacks, dust in shafts of lantern light, an open heavy door',
  ferry: 'a river ferry dock at night, wooden pier planks, moored cargo boats, paper lanterns reflecting on dark water, light mist',
  pass: 'a mountain pass road on the back hill at dusk, red pines, a stone cairn shrine with cloth strips, a wooden toll barricade with torches',
  camp: 'the great hall of a dokkaebi mountain fortress, rough timber pillars, a raised seat covered with fur, torches and plain black cloth banners',
  capital: 'the main street of a grand royal capital at daytime, a huge stone city gate with a tiled pavilion, shop signs and banners, palace roofs in the distance',
  alley: 'a narrow back alley of the royal capital at night, wet stones, hanging paper lanterns, wooden walls and shadows',
  gibang: 'an elegant private room in a red-lantern pleasure house, red silk curtains, a low lacquered table with a wine set, a folding screen, warm red light',
  bath: 'an indoor bathhouse with a large steaming stone pool, dark wood beams, rising steam, soft lantern light and floating petals',
  snowcave: 'a shallow mountain cave during a blizzard at night, a small campfire, fur bedding, snow blowing past the entrance',
  bedroom: 'a nobleman bedroom at night, thick silk bedding on the warm floor, a paper lantern, a folding screen with plum blossoms, lattice doors',
  temple: 'a small mountain temple high on a misty peak at dusk, curved roofs, stone lanterns, mountains below in the mist',
  skyroad: 'a long stone stairway rising through soft clouds into a pale starry sky',
  galaxy: 'the quiet shore of the Milky Way river in heaven at night, a calm river of starlight, a small wooden ferry dock with a lantern',
  loom: 'a weaving room in heaven, a large old wooden loom with fine silver threads, a round window showing the night sky',
  heavenoffice: 'a heavenly government office hall above the clouds, low desks with stacked ledgers, pale jade pillars',
  archive: 'a quiet heavenly archive room, tall shelves of scrolls, a reading desk with a lamp',
  jadecourt: 'the Jade Emperor throne hall of white jade and gold, a tall silk curtain hiding the throne',
  shrine: 'a heavenly thunder shrine on a floating cliff, a huge war drum on a stone altar, storm clouds',
  map: 'a readable painted fantasy map of the Korean kingdom Haerang, mountain paths, villages, river crossings and the distant royal capital; no labels or readable writing',
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
    { id: `full-${y.id}`, kind: 'full', out: ART.full(y.id), subject: `${y.kind}. ${y.artSubject}`, identity: [`public/${ART.card(y.id)}`], source: 'content/heroines.json' },
    { id: `card-${y.id}`, kind: 'card', out: ART.card(y.id), subject: `${y.kind}. ${y.artSubject}`, identity: [`public/${ART.full(y.id)}`], source: 'content/heroines.json' },
  ]),
  ...Object.entries(BG).map(([key, subject]): ArtAsset => ({ id: `bg-${key}`, kind: 'bg', out: ART.bg(key), subject })),
  ...CHAPTERS.map((c): ArtAsset => ({ id: `banner-${c.id}`, kind: 'banner', out: ART.chapter(c.id), subject: BANNER[c.id] })),
  ...CHAPTERS.map((c): ArtAsset => ({ id: `foe-${c.id}`, kind: 'foe', out: ART.foe(c.id), subject: FOES[c.id] })),
  ...YOKAI.flatMap((y): ArtAsset[] => [
    { id: `cg-${y.id}-3`, kind: 'cg', out: ART.cg(y.id, 3), subject: `${y.name}, ${y.kind}. ${y.artSubject}; ${bondArtSubject(y.id, 3)}`, identity: [`public/${ART.card(y.id)}`], source: `content/bonds/${y.id}.json, scene level 3` },
    { id: `cg-${y.id}-5`, kind: 'cg', out: ART.cg(y.id, 5), subject: `${y.name}, ${y.kind}. ${y.artSubject}; ${bondArtSubject(y.id, 5)}`, identity: [`public/${ART.card(y.id)}`], source: `content/bonds/${y.id}.json, scene level 5` },
  ]),
  ...Object.entries(BATTLE_SUBJECTS).map(([key, subject]): ArtAsset => ({ id: `battle-${key}`, kind: 'battle', out: ART.battle(key), subject, source: 'src/data/art-direction.ts; src/data/world.ts' })),
  ...ENEMY_SUBJECTS.flatMap(({ group, key, subject, source }): ArtAsset[] => [
    { id: `${group}-${key}`, kind: group, out: group === 'boss' ? ART.boss(key) : ART.grunt(key), subject, identity: [`public/art/${group}/${key}.webp`], source },
    { id: `enemy-${group}-${key}`, kind: 'enemy', out: ART.enemy(group, key), subject, identity: [`public/art/${group}/${key}.webp`], source },
  ]),
  ...Object.entries(ITEM_SUBJECTS).map(([key, subject]): ArtAsset => ({ id: `item-${key}`, kind: 'item', out: ART.item(key), subject, identity: [`public/${ART.item(key)}`], source: 'src/core/story.ts; src/data/art-direction.ts' })),
  ...STORY_ART_BRIEFS.map(({ key, cast, source, subject }): ArtAsset => ({ id: `scene-${key}`, kind: 'scene', out: ART.scene(key), subject, identity: cast.map((id) => `public/${ART.card(id)}`), source })),
];
