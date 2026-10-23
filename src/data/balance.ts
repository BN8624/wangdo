// 밸런스 수치 모음. 숫자를 바꾼 뒤에는 `npm run simulate`로 진행 속도를 꼭 확인한다.
export const BALANCE = {
  /** 창고가 가득 차기까지 걸리는 시간(분) */
  storageMinutes: 8 * 60,
  /** 능력치 1당 분당 생산량 */
  perStatPerMinute: { coin: 1, grain: 0.6, hands: 0.3 },
  /** 칭호 하나당 생산량 증가율 */
  rankProdBonus: 0.2,

  start: { coin: 200, grain: 100, hands: 150, fame: 0 },

  levelCapBase: 10,
  levelCapPerRank: 10,
  levelCostBase: 6,
  levelCostExp: 2.1,
  gradeCostMult: { 1: 1, 2: 1.5, 3: 2.2 } as Record<number, number>,

  wishBaseCharges: 3,
  /** 칭호 몇 개마다 뚝딱 최대 횟수 +1 */
  wishChargeEveryRanks: 4,
  wishRegenMinutes: 60,
  /** 소원 보상이 너무 작아지지 않도록 하는 최소량 */
  wishMinReward: 20,
  /** 소원 보상 전체 배율(분·% 모두에 곱한다) */
  wishRewardScale: 0.5,

  feastGrainBase: 80,
  feastGrainGrowth: 1.9,
  /** 잔치 명성 = 매력 합 × 이 값 × (1 + 칭호 × feastFameRankBonus) */
  feastFamePerCharm: 0.25,
  feastFameRankBonus: 0.05,

  stageHpBase: 250,
  stageHpGrowth: 1.36,
  bossHpMult: 2.2,
  /** 일손 한 명이 해결하는 소동 = 힘 합 ÷ 이 값 */
  forcePerHand: 100,
  stageFameBase: 5,
  stageFameGrowth: 1.2,
  stageCoinBase: 60,
  stageCoinGrowth: 1.22,
  bossRewardMult: 3,
} as const;
