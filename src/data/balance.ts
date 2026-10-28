// 밸런스 수치 모음(전투 능력치·성장 배율). 바꾼 뒤에는 `npm test`로 시제품이 지지 않고 끝까지 가는지 확인한다.
// 설계: docs/COLLECTION_DESIGN.md
export const BALANCE = {
  start: { coin: 2000, jade: 2000, exp: 600, fame: 0 },

  // ── 식객 능력치 ──
  /** 레벨 1·★1의 역할별 기본 능력치 */
  roleBase: {
    attack: { hp: 520, atk: 64, def: 30, spd: 104, crit: 0.15 },
    defense: { hp: 820, atk: 42, def: 58, spd: 96, crit: 0.05 },
    heal: { hp: 600, atk: 50, def: 38, spd: 100, crit: 0.05 },
    support: { hp: 640, atk: 52, def: 40, spd: 108, crit: 0.08 },
  },
  /** 레벨당 능력치 증가율(1레벨 기준) */
  levelGrowth: 0.08,
  /** 별마다 능력치 배율(0번은 안 씀) */
  starMult: [0, 1, 1.12, 1.26, 1.42, 1.6, 1.8],
  /** 별마다 공격력에 더 붙는 배율: 별을 많이 올린 식객일수록 한 대가 굵어서 몇 대 만에 끝낸다(★3까지는 그대로) */
  starAtk: [0, 1, 1, 1, 1.15, 1.4, 1.75],
  /** 별마다 레벨 상한 */
  levelCap: [0, 40, 50, 60, 70, 85, 100],
  /** ★n → ★n+1에 드는 조각 */
  starCost: [0, 20, 40, 80, 120, 200],
  /** 인연 단계마다 모든 능력치 */
  bondBonus: 0.03,
  /** 같은 편성에 짝꿍이 함께 있으면 공격력 */
  comboAtk: 0.08,
  /** 무기 단계마다 공격력 */
  weaponAtk: 0.06,
  /** 레벨업 비용: 수련치 = expBase × L^expExp + expFlat, 엽전 = coinBase × L^coinExp + coinFlat */
  expBase: 6,
  expExp: 1.5,
  expFlat: 10,
  coinBase: 8,
  coinExp: 1.4,
  coinFlat: 10,

  // ── 적 ──
  /** 적 능력치 = 역할 기본값 × 레벨 배율 × 종류 배율 × 장 배율 */
  foeKind: {
    grunt: { hp: 0.7, atk: 1, def: 1, spd: 0.95 },
    elite: { hp: 2, atk: 1.1, def: 1.1, spd: 1 },
    boss: { hp: 5, atk: 1.25, def: 1.2, spd: 1 },
  },
  /** 장 배율 = 1 + foeChapterGrowth × 장 순번(0부터). 별·장비가 붙는 만큼 적도 세진다 */
  foeChapterGrowth: 0.032,
  /** 대장·정예 스테이지(장의 벽)의 적 체력 = × (1 + gateHpGrowth × 장 순번). 그 장쯤의 별(starAtk)만큼 버텨서 벽은 그대로 남는다 */
  gateHpGrowth: 0.03,
  /** 마지막 장 대장 레벨 */
  finalLevel: 70,

  // ── 캠페인 보상 ──
  stagesPerChapter: 6,
  firstClearJade: 30,
  bossClearJade: 100,
  starJade: 10,
  /** 스테이지 첫 클리어 엽전·수련치·명성 = base + perLevel × 레벨 */
  stageCoin: { base: 80, perLevel: 28 },
  stageExp: { base: 120, perLevel: 40 },
  stageFame: { base: 4, perLevel: 1.2 },
  /** 장을 다 깨면 아무 식객에게나 쓰는 기억 조각 */
  chapterMemory: 40,
  /** 이야기로 합류할 식객을 이미 가졌으면 그 식객 조각 */
  storyDupeShards: 40,

  // ── 모집 ──
  pullCost: 100,
  rates: { ssr: 0.04, sr: 0.2 },
  pity: 60,
  dupeShards: [0, 20, 40, 80],
  /** 옥을 기억 조각으로 바꾸는 값: 뽑기를 하지 않아도 원하는 식객의 별을 확정으로 올릴 수 있게 */
  memoryTrade: { jade: 100, memory: 5 },

  // ── 방치·수련장 ──
  afkCapMinutes: 12 * 60,
  /** 분당 엽전·수련치·명성 = base + perLevel × 가장 멀리 깬 스테이지 레벨 */
  afkCoin: { base: 6, perLevel: 2 },
  afkExp: { base: 8, perLevel: 3 },
  afkFame: { base: 0.05, perLevel: 0.01 },
  /** 이 분마다 옥 하나 */
  afkJadeEvery: 10,
  /** 이 분마다 장비 하나 */
  afkGearEvery: 120,
  /** 수련장 난이도: 레벨과 그 난이도가 열리는 캠페인 레벨 */
  trainLevels: [3, 8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80],
  trainExp: { base: 50, perLevel: 30 },
  trainCoin: { base: 40, perLevel: 16 },
  trainFame: { base: 1, perLevel: 0.3 },

  // ── 관직(계정 레벨) ──
  /** 관직 r에 오르는 누적 명성 = rankFameBase × r^rankFameExp */
  rankFameBase: 40,
  rankFameExp: 2.1,
  rankJade: 200,

  // ── 인연 ──
  talkTopics: 8,
  talkMult: 2,
  battleBond: 2,
  giftBond: { liked: 30, normal: 12 },
  outingBond: 45,
  outingCost: 150,
  priceGrowth: 1.25,

  // ── 정무(상소) ──
  wishBaseCharges: 3,
  winsPerPetition: 3,
  wishMinReward: 20,
  wishRewardScale: 0.5,

  /** 모의 플레이: 편성을 바꿔 가며 이길 때까지 해 보는 횟수 */
  simTries: 3,
} as const;
