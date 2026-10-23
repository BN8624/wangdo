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

  levelCapBase: 10,
  levelCapPerRank: 10,
  levelCostBase: 5,
  levelCostExp: 2,
  gradeCostMult: { 1: 1, 2: 1.5, 3: 2.2 } as Record<number, number>,

  /** 호감도 단계당 능력치 보너스 */
  bondStatBonus: 0.08,
  talkCooldownMinutes: 3 * 60,
  /** 대화 대답의 delta(1·4·8)에 곱하는 값 */
  talkMult: 2,
  giftBond: { liked: 30, normal: 12 },
  outingBond: 45,
  outingCooldownMinutes: 20 * 60,
  /** 나들이 비용 = 칭호 0 기준 엽전 × 1.5^칭호 */
  outingCost: 150,
  /** 선물·나들이 값이 칭호마다 오르는 비율 */
  priceGrowth: 1.5,
  feastBond: 2,

  wishBaseCharges: 3,
  wishChargeEveryRanks: 4,
  wishRegenMinutes: 60,
  wishMinReward: 20,
  wishRewardScale: 0.5,

  feastGrainBase: 80,
  feastGrainGrowth: 1.9,
  feastFamePerCharm: 0.015,
  feastFameRankBonus: 0.05,

  staminaMax: 6,
  staminaRegenMinutes: 30,
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
} as const;
