// 밸런스 수치 모음. 숫자를 바꾼 뒤에는 `npm run simulate`와 `npm test`로 진행 속도를 꼭 확인한다.
export const BALANCE = {
  /** 자리를 비운 동안 쌓이는 최대 시간(분) */
  offlineCapMinutes: 12 * 60,
  /** 칭호 하나당 생산량 증가율 */
  rankProdBonus: 0.2,
  /** 적성(특기)이 일터와 맞으면 곱하는 값 */
  aptitudeMult: 1.5,
  /** 짝꿍이 같은 일터에 있으면 그 일터 생산량 증가율 */
  comboBonus: 0.2,
  /** 일터 칸이 늘어나는 칭호 */
  slotRanks: [2, 6, 10],

  start: { coin: 300, grain: 120, fame: 0 },

  /** 경험치: 다음 레벨까지 = expCurveBase × 레벨^expCurveExp + expCurveFlat */
  expCurveBase: 10,
  expCurveExp: 1.6,
  expCurveFlat: 20,
  /** 한 판 경험치 = expGainBase × 상대레벨^expGainExp + expGainFlat (대장은 expBossMult배) */
  expGainBase: 8,
  expGainExp: 1.25,
  expGainFlat: 10,
  expBossMult: 3,
  /** 쉬던 식객이 받는 몫(지면 아무도 받지 못한다) */
  expBenchRatio: 0.3,
  /** 전투 엽전·명성 = base × 상대레벨^exp + flat */
  battleCoinBase: 5,
  battleCoinExp: 1.6,
  battleCoinFlat: 20,
  battleFameBase: 0.6,
  battleFameExp: 1.3,
  /** 상대 한 판 수치 = (foeLevelBase + foeLevelGrowth × 레벨) × 종류 배율.
   *  그 레벨 식객 셋이 장비·인연까지 갖췄을 때의 특기 능력치에 맞춘 값(모의 플레이로 잰다) */
  foeLevelBase: 200,
  foeLevelGrowth: 36,
  foeKindMult: { field: 0.9, dungeon: 1.05, story: 1.1, boss: 1.2 } as Record<'field' | 'dungeon' | 'story' | 'boss', number>,
  /** 기술 단계마다 기술 피해 증가(10·25·40레벨) */
  skillTierBonus: 0.15,

  /** 호감도 단계당 능력치 보너스 */
  bondStatBonus: 0.08,
  /** 식객마다 새 대화 수(처음 듣는 대화만 호감도를 올린다) */
  talkTopics: 8,
  /** 함께 싸워 이기면 오르는 호감도 */
  battleBond: 2,
  /** 대화 대답의 delta(1·4·8)에 곱하는 값 */
  talkMult: 2,
  giftBond: { liked: 30, normal: 12 },
  outingBond: 45,
  /** 나들이 비용 = 칭호 0 기준 엽전 × 1.5^칭호 */
  outingCost: 150,
  /** 선물·나들이 값이 칭호마다 오르는 비율 */
  priceGrowth: 1.5,
  feastBond: 2,

  wishBaseCharges: 3,
  /** 이만큼 이길 때마다 상소가 하나 올라온다 */
  winsPerPetition: 3,
  wishMinReward: 20,
  wishRewardScale: 0.5,

  feastGrainBase: 80,
  feastGrainGrowth: 1.9,
  feastFamePerCharm: 0.015,
  feastFameRankBonus: 0.05,

  /** 소동 상대 수치 = foeBase × foeGrowth^순번 */
  foeBase: 80,
  foeGrowth: 1.09,
  bossMult: 1.3,
  /** 승률 = r^k / (r^k + 1), r = 내 능력치 ÷ 상대 수치 */
  winSharpness: 4,
  stageFameBase: 5,
  stageFameGrowth: 1.2,
  stageCoinBase: 60,
  stageCoinGrowth: 1.22,
  bossRewardMult: 3,
  /** 필드·던전 잡졸을 이기면 이 확률로 선물을 줍는다(대장·이야기 전투는 언제나) */
  fieldGiftChance: 0.08,
  dungeonGiftChance: 0.25,

  /** 모의 플레이: 이길 확률이 이만큼은 돼 보여야 도전한다(못 미치면 필드에서 키운다) */
  simTryChance: 0.4,

  /** 추천 편성: 칸마다 그 능력치 상위 몇 명을 후보로 두고, 조합마다 몇 번 싸워 볼지 */
  partyPick: 4,
  partyRuns: 40,
} as const;
