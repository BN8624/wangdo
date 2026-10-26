import { EPISODES } from './story';
import { CHAPTERS } from './stages';
import { NODES } from './world';
import baekseol from '../../content/bonds/baekseol.json';
import muyeong from '../../content/bonds/muyeong.json';
import sodam from '../../content/bonds/sodam.json';
import haeryun from '../../content/bonds/haeryun.json';
import oryeon from '../../content/bonds/oryeon.json';
import yeonhwa from '../../content/bonds/yeonhwa.json';
import bulsae from '../../content/bonds/bulsae.json';
import cheongyeon from '../../content/bonds/cheongyeon.json';
import seorin from '../../content/bonds/seorin.json';
import geumyeong from '../../content/bonds/geumyeong.json';
import danhui from '../../content/bonds/danhui.json';
import haejin from '../../content/bonds/haejin.json';
import wolha from '../../content/bonds/wolha.json';
import bari from '../../content/bonds/bari.json';
import yunseul from '../../content/bonds/yunseul.json';
import beori from '../../content/bonds/beori.json';

const BONDS = [baekseol, muyeong, sodam, haeryun, oryeon, yeonhwa, bulsae, cheongyeon, seorin, geumyeong, danhui, haejin, wolha, bari, yunseul, beori];

/** CLI에서도 읽히는 실제 인연 대본. 같은 물가/등잔 포즈를 모든 인물에 강요하지 않는다. */
export function bondArtSubject(id: string, level: 3 | 5): string {
  const scene = BONDS.find((bond) => bond.id === id)?.scenes.find((entry) => entry.level === level);
  if (!scene) throw new Error(`인연 그림 대본이 없습니다: ${id}/${level}`);
  return `Bond story level ${level}, ${scene.title}. Choose one coherent moment that illustrates the character's specific action, props and emotional change. Follow this story's location and costume changes; do not substitute a generic pose. Narrative context: ${scene.lines.map((line) => line.text).join(' ')}`;
}

/** 제작 시 현재 이야기/지역 데이터와 연결되는 아트 명세. 파일 이름만으로 대상을 추측하지 않는다. */
export const BATTLE_SUBJECTS: Record<string, string> = {
  abyss: 'a bottomless heavenly abyss with broken black stone ledges above distant storm clouds',
  alley: 'a narrow wet stone alley between Korean tiled wooden houses at night',
  archive: 'a heavenly archive of wooden ledger shelves and scroll cabinets, fire damage at the edges',
  backhill: 'a Korean mountain pass through pine trees, a rough timber toll barricade at dusk',
  cave: 'a mountain bandit cave with rough stone walls, torches and a distant storage alcove',
  cellar: 'a dark granary cellar with stone floor, timber pillars and rice sacks at the edges',
  ferry: 'a Korean river ferry landing at night, cargo boats and mooring posts at the sides',
  galaxy: 'a quiet crossing on the river of the Milky Way, pale water and a distant magpie bridge',
  gambling: 'a Joseon gambling den with low wooden tables at the edges and a clear central floor',
  jade: 'the white-jade heavenly court, restrained gold accents and distant throne steps',
  north: 'a snowy Korean northern mountain fortress courtyard with black cloth banners',
  observatory: 'an ancient Korean mountain observatory with an armillary sphere in the far background',
  palace: 'a Korean palace courtyard with dancheong eaves and distant red pillars',
  pleasure: 'a Korean red-lantern canal district at night, muted burgundy and smoky plum; a broad dry matte wood battle terrace, restrained red lamps only at upper corners, no bright gold floor reflections',
  skyroad: 'a broad stone stair landing above clouds on the road to heaven',
  thunder: 'a floating thunder shrine courtyard with a war drum on a distant stone altar',
  underworld: 'a misty underworld gate courtyard with dark Korean wooden doors and pale spirit light',
  waterway: 'a drained stone waterway under a Korean royal city, damp steps and a distant water gate',
};

const BOSS_KEYS = 'alley backhill byeolchang byeoljigi cheondung chinwi dobak ferry gamdok geumcheonjang geurimja gogae hongmae-shadow kkamagwi meokgureum mugigo noegong north pleasure sabyeong seorijang sumun wongwi'.split(' ');
const GRUNT_KEYS = 'alley alley-2 alley-3 backhill backhill-2 backhill-3 cave ferry ferry-2 ferry-3 fire galaxy galaxy-2 heaven heaven-2 jade north north-2 north-3 palace palace-2 pleasure pleasure-2 pleasure-3 sky sky-2 underworld yonggung yonggung-2'.split(' ');

/** 이름·역할·대사는 실제 상대 데이터에서 모은다. 얼굴/복장은 기존 초상을 identity reference로 보존한다. */
function enemyContexts(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (key: string, text: string) => {
    if (!out.has(key)) out.set(key, new Set());
    out.get(key)!.add(text);
  };
  for (const c of CHAPTERS) {
    add(`boss/${c.id}`, `${c.boss.name}. ${c.intro} ${c.boss.line}`);
    c.foes.forEach((name, i) => add(`grunt/${c.id}${c.grunts[i] > 1 ? `-${c.grunts[i]}` : ''}`, `${name}. ${c.intro}`));
  }
  for (const n of NODES) {
    if (n.kind === 'town') continue;
    const foes = n.kind === 'field' ? n.foes : n.kind === 'dungeon' ? [...n.pool, n.boss] : n.battles;
    for (const f of foes) add(f.art, `${f.name}. ${n.name}: ${n.desc}${f.line ? ` ${f.line}` : ''}`);
  }
  for (const ep of EPISODES) for (const b of ep.battles ?? []) {
    if (b.rival) continue;
    const key = b.art ?? (b.boss ? `boss/${b.set}` : `grunt/${b.set}${b.grunt && b.grunt > 1 ? `-${b.grunt}` : ''}`);
    add(key, `${b.foe}. ${ep.title}: ${ep.summary}`);
  }
  return out;
}

const ENEMY_CONTEXTS = enemyContexts();
export const ENEMY_SUBJECTS = (['boss', 'grunt'] as const).flatMap((group) =>
  (group === 'boss' ? BOSS_KEYS : GRUNT_KEYS).map((key) => {
    const context = [...(ENEMY_CONTEXTS.get(`${group}/${key}`) ?? [])].slice(0, 5).join(' / ');
    if (!context) throw new Error(`상대 아트 설정이 없습니다: ${group}/${key}`);
    return { group, key, subject: `One Korean Joseon-fantasy ${group === 'boss' ? 'boss' : 'adversary'}. Role and story context: ${context}`, source: 'src/data/world.ts; src/data/stages.ts; content/story/' };
  }),
);

export const ITEM_SUBJECTS: Record<string, string> = {
  bangmangi: 'a weathered Korean dokkaebi wooden club that collects unpaid debts, simple iron bands',
  bond: 'a folded Joseon debt bond with a red seal and tied paper cord; markings are abstract, no readable writing',
  contract: 'an old folded Korean loan contract on worn cream paper with an ominous red seal; no readable writing',
  crack: 'a close detail of a debt seal split by a dark crack, restrained magical glow',
  crate: 'a Korean wooden grain shipping crate with rope binding and a plain seal',
  emblem: 'a simple official Korean magistrate emblem and tasseled wooden token',
  goldmark: 'a small forged golden official seal mark used as evidence in a royal debt case',
  heavenbond: 'an ancient heavenly rain debt bond made from pale silk and silver thread, jade seal; no readable writing',
  iou: 'a humble Joseon handwritten IOU on creased paper with a thumb-sized red seal; no readable writing',
  ledger: 'an open worn Korean grain ledger with loose paper slips and brush, abstract marks only',
  myeongbu: 'the underworld register of names, dark bound pages and a pale jade clasp; no readable writing',
  oath: 'a blood-red oath seal on an unrolled Korean paper pledge, abstract marks only',
  pearl: 'one luminous pearl of the dragon palace on a small plain cloth',
  redledger: 'a red-covered private gambling-house ledger with one loose evidentiary slip; no readable writing',
  reed: 'a bundle of damp reeds found by a river smuggling route, tied with rough cord',
  shell: 'the spiral freshwater snail shell of a Korean ureong-gaksi, subtle green sheen',
  skymap: 'a worn Korean celestial chart with an armillary diagram and mountain path; no readable writing',
  starthread: 'a loom shuttle wound with a single fine silver thread of the Milky Way',
  tornseal: 'a torn official Korean paper seal split across two fragments, abstract red stamp only',
};

/** 이벤트마다 실제로 그 그림을 띄우는 대사 묶음을 참조한다. 다른 장면의 일반적인 포즈로 대체하지 않는다. */
export const STORY_ART_BRIEFS = EPISODES.flatMap((ep) => ep.scenes.flatMap((scene) => {
  const keys = [...new Set(scene.lines.flatMap((line) => line.cg ? [line.cg] : []))];
  return keys.map((key) => {
    const lines = scene.lines.filter((line) => line.cg === key);
    return {
      key,
      cast: scene.cast ?? [],
      source: `content/story/s${ep.season}/${ep.id}.json`,
      subject: `Story event ${key}, ${ep.title}. Setting: ${scene.bg}. Depict one coherent moment from these story beats, rather than a collage: ${lines.map((line) => line.text).join(' ')}`,
    };
  });
}));
