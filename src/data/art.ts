import { CHAPTERS } from './stages';
import { WISHES } from './wishes';
import { YOKAI } from './yokai';
import type { YokaiDef } from '../core/types';

// 게임에 쓰는 모든 그림의 목록과 프롬프트. `npm run art:generate`가 이 목록을 보고 없는 그림을 그린다.
// 화풍이 흔들리지 않도록 BASE는 고정하고, 종류별 틀 + 대상 묘사만 바꾼다.

const BASE = [
  'Bright, warm Korean folk-tale picture book illustration.',
  'Soft watercolor and gouache on hanji paper texture, gentle brown ink outlines, cute rounded shapes.',
  'Palette: warm cream, jade green, vermilion, saffron yellow and soft indigo, like Korean dancheong accents.',
  'No text, no letters, no watermark, no frame, no border.',
].join(' ');

const FRAME = {
  portrait:
    'Every character is an adult young woman in her twenties, drawn in a wholesome, modest, family-friendly way. ' +
    'Upper-body character portrait, centered, three-quarter view, cheerful friendly expression. Plain warm cream background with no scenery.',
  npc: 'Upper-body character portrait, centered, three-quarter view, friendly expressive face. Plain warm cream background with no scenery.',
  scene:
    'Wide landscape illustration with no people. Keep the main subject in the middle horizontal band so the image can be cropped into a wide banner.',
  square: 'Square illustration, the subjects centered and filling most of the frame, plain warm cream background with no scenery.',
  icon:
    'A single game item icon, centered, filling about 80% of the frame, isolated on a plain flat solid cream background (#FBF5E6), no shadow, no other objects.',
  appicon:
    'Mobile app icon artwork, square, bold simple composition that reads well at small sizes, full-bleed saffron-yellow background.',
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
  portrait: 'portrait',
  npc: 'portrait',
  scene: 'landscape',
  square: 'square',
  icon: 'square',
  appicon: 'square',
};

export const artPrompt = (a: ArtAsset) => `${BASE} ${FRAME[a.kind]}\nSubject: ${a.subject}.`;

// ── 식객 초상화 ──
export const portraitPath = (id: string) => `portraits/${id}.webp`;
export const portraitPrompt = (def: YokaiDef) => artPrompt(portraitAsset(def));
const portraitAsset = (def: YokaiDef): ArtAsset => ({ id: def.id, kind: 'portrait', out: portraitPath(def.id), subject: def.artSubject });

// ── 그 밖의 그림 경로 ──
export const ART = {
  village: (tier: number) => `art/scene/village-${tier}.webp`,
  chapter: (id: string) => `art/scene/ch-${id}.webp`,
  foe: (chapterId: string) => `art/foe/${chapterId}.webp`,
  npc: (wishId: string) => `art/npc/${wishId}.webp`,
  icon: (name: string) => `art/icon/${name}.webp`,
  story: (id: string) => `art/scene/story-${id}.webp`,
};

/** 소원 손님 중 식객 초상화를 그대로 쓰는 경우 */
export const WISH_USES_YOKAI: Record<string, string> = { trial: 'haechi' };

const NPC: Record<string, string> = {
  yeot: 'a cheerful old Korean taffy (yeot) peddler grandfather with a white beard, straw hat and white hanbok, holding big iron taffy scissors and a wooden tray of taffy',
  heungbu: 'a cute small boy from a poor but kind family, patched hanbok, holding an empty rice bowl, hopeful big eyes',
  hokbu: 'a jolly old man with a big round lump on his cheek, white topknot and white hanbok, singing happily with his mouth open',
  axe: 'a sturdy friendly young woodcutter man with a headband, carrying an A-frame back rack of firewood, holding an iron axe, surprised expression',
  kongjwi: 'a kind hardworking young girl with a long braid, simple cream hanbok, holding a clay water jar, worried but brave',
  frog: 'a motherly green frog wearing a little apron and a headscarf, sighing with a gentle tired smile',
  salt: 'a middle-aged salt peddler man in a straw rain cape, carrying sacks of salt on an A-frame back rack, glancing worriedly at the rain',
  magpie: 'a cute black-and-white magpie bird with a tiny red ribbon, holding a few seeds in its beak',
  patjuk: 'a feisty old grandmother with white hair in a bun, holding a big ladle over a pot of red bean porridge, determined smile',
  brothers: 'two friendly farmer brothers carrying rice sheaves on their backs, laughing together',
  rabbit: 'a clever white rabbit with a sly grin, wearing a tiny blue vest, ears perked up',
  'sun-moon': 'a young brother and his little sister holding hands and looking up hopefully, simple hanbok, a thick rope hanging down from above',
  fart: 'a cheerful, embarrassed young bride in a pink hanbok, holding a basket of round Korean pears, blushing comically',
  millstone: 'a flustered merchant man hugging a magic hand millstone that keeps pouring out white salt',
  spring: 'a baby with a tiny white beard and an old man topknot, wrapped in an oversized hanbok, comically grumpy',
  gotgam: 'a big but timid tiger trembling and hiding its eyes at the sight of a string of dried persimmons',
  ojak: 'a gentle young cowherd man with a straw hat, holding a cow rope, looking longingly up at the starry sky',
  gamtu: 'a suspicious peddler man in a tall black horsehair hat, grinning slyly and holding out another black hat',
  beads: 'a loyal dog and a cat sitting proudly together, the cat holding a glowing magic bead in its mouth',
  millet: 'a cheerful young bachelor holding up a single grain of millet between his fingers, a cow behind him',
  feather: 'a young celestial maiden in a pastel hanbok holding a shimmering feather robe, worried expression',
  'dokkaebi-night': 'three rowdy, cheerful dokkaebi goblins with horns and knobby clubs, rolling up their sleeves for a ssireum wrestling match',
  sanshin: 'a kindly old mountain spirit with a long white beard and a gnarled wooden staff, holding a ginseng root, a small tiger peeking beside him',
};

const CHAPTER_SCENE: Record<string, string> = {
  market: 'a bustling Korean traditional market street with stalls of iron pots, hoes, rice cakes and taffy, a few iron pots scattered playfully, bright daytime',
  'dark-pass': 'a winding mountain pass at dusk with old wooden totem poles (jangseung) and paper lanterns, soft indigo shadows creeping in, a little spooky but cute',
  'night-market': 'a magical dokkaebi night market under a big full moon, floating blue dokkaebi fire lights, stalls selling hats and strange goods, purple night sky',
  'lotus-pond': 'a misty lotus pond with big lily pads, a stone arch bridge and mist spilling over rice paddies, soft morning light',
  'red-peak': 'a hot red mountain peak above dry cracked fields, heat shimmer in the air, warm orange sky',
};

const CHAPTER_FOES: Record<string, string> = {
  market: 'three tiny mischievous dokkaebi goblin kids with stubby horns, running off with rice cakes and taffy scissors, cheeky grins',
  'dark-pass': 'three cute little blue will-o-the-wisp fire spirits with tiny faces, and a shy little shadow bat',
  'night-market': 'two sly raccoon-dog peddlers and a small goblin swapping coins for leaves, mischievous grins',
  'lotus-pond': 'a choir of three cheeky green frogs and a grumpy carp splashing water',
  'red-peak': 'three little fire imps with flame-shaped hair playing with sparks, and a startled grasshopper',
};

const ICONS: Record<string, string> = {
  coin: 'a single traditional Korean brass coin (yeopjeon) with a square hole in the middle, shiny gold',
  grain: 'a single bundle of golden rice stalks tied with a red string',
  hands: 'three cheerful little villagers in hanbok holding a hoe, a basket and a rake, standing together',
  fame: 'a vermilion plum-blossom shaped medallion with gold trim and a small red tassel',
  club: 'a magical knobby wooden dokkaebi club (bangmangi) with a few golden sparkles',
  'nav-home': 'a small cozy hanok house with a curved tiled roof',
  'nav-yokai': 'a cute fox-eared folk mask with a small horn, like a yokai face',
  'nav-stage': 'a bright blue dokkaebi fire wisp',
  'nav-record': 'a rolled paper scroll tied with a red ribbon',
};

export const ART_ASSETS: ArtAsset[] = [
  ...YOKAI.map(portraitAsset),
  { id: 'village-1', kind: 'scene', out: ART.village(1), subject: 'a small humble mountain hamlet in old Korea with two thatched-roof houses, a stone wall, a persimmon tree, green hills, blue sky with fluffy clouds' },
  { id: 'village-2', kind: 'scene', out: ART.village(2), subject: 'a lively old Korean village with several thatched and tiled-roof hanok houses, a small market street with colorful awnings, rice paddies and green hills under a blue sky' },
  { id: 'village-3', kind: 'scene', out: ART.village(3), subject: 'a grand, prosperous fantasy Korean town where people and dokkaebi live together, many tiled-roof hanok houses painted in dancheong colors, festive paper lanterns, a big wooden gate, soft glowing dokkaebi fire lights floating in the daylight sky' },
  ...Object.entries(ICONS).map(([id, subject]): ArtAsset => ({ id: `icon-${id}`, kind: 'icon', out: ART.icon(id), subject })),
  { id: 'app-icon', kind: 'appicon', out: 'icon-512.png', subject: 'a magical knobby wooden dokkaebi club with gold brass coins bursting out of it' },
  ...CHAPTERS.map((c): ArtAsset => ({ id: `ch-${c.id}`, kind: 'scene', out: ART.chapter(c.id), subject: CHAPTER_SCENE[c.id] })),
  ...CHAPTERS.map((c): ArtAsset => ({ id: `foe-${c.id}`, kind: 'square', out: ART.foe(c.id), subject: CHAPTER_FOES[c.id] })),
  ...WISHES.filter((w) => !WISH_USES_YOKAI[w.id]).map((w): ArtAsset => ({ id: `npc-${w.id}`, kind: 'npc', out: ART.npc(w.id), subject: NPC[w.id] })),
  { id: 'story-lost', kind: 'scene', out: ART.story('lost'), subject: 'a lost young woodcutter seen from behind, carrying an A-frame back rack of firewood, standing in a deep misty pine forest with warm rays of light' },
  { id: 'story-club', kind: 'scene', out: ART.story('club'), subject: 'a magical knobby wooden dokkaebi club lying on mossy ground in a forest clearing, golden sparkles and a few brass coins popping out of it' },
];
