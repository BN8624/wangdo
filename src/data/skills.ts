import { BATTLE, SKILL_DAMAGE, type BattleSkill, type SkillKind } from '../core/battle';

// 식객 고유 기술. 토벌에서 세 번에 한 번 쓴다(첫 기술은 편성 순서대로 한 차례씩 늦게). 종류는 설화 속 정체와 하는 일에서 골랐다.
export const SKILLS: Record<string, BattleSkill> = {
  baekseol: { name: '여우불 홀림', kind: 'stun' },
  muyeong: { name: '쇠방망이 내려치기', kind: 'strike' },
  sodam: { name: '우렁이 밥상', kind: 'heal' },
  haeryun: { name: '해태의 판결', kind: 'weaken' },
  oryeon: { name: '삼족오의 셈', kind: 'rally' },
  yeonhwa: { name: '이무기 춤', kind: 'stun' },
  bulsae: { name: '불길 쏟기', kind: 'strike' },
  cheongyeon: { name: '날개옷 바람막이', kind: 'guard' },
  seorin: { name: '백호의 방패', kind: 'guard' },
  geumyeong: { name: '그림자 덫', kind: 'weaken' },
  danhui: { name: '감투 흥정', kind: 'rally' },
  haejin: { name: '용궁 샘물', kind: 'heal' },
  wolha: { name: '명부 낙인', kind: 'strike' },
  bari: { name: '생명수', kind: 'heal' },
  yunseul: { name: '운명의 실 엮기', kind: 'weaken' },
  beori: { name: '벼락 집행', kind: 'stun' },
};

export const SKILL_LABEL: Record<SkillKind, string> = { strike: '강타', stun: '기절', guard: '방어', heal: '치유', weaken: '약화', rally: '격려' };

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** 식객 창에 보여 줄 기술 설명 */
export function skillText(kind: SkillKind): string {
  switch (kind) {
    case 'strike':
      return `맡은 능력치의 ${SKILL_DAMAGE.strike}배로 크게 친다.`;
    case 'stun':
      return '치면서 상대를 기절시켜 다음 반격을 한 번 막는다.';
    case 'guard':
      return `치면서 식객 모두에게 방어를 걸어 다음 피해를 ${pct(1 - BATTLE.guardCut)} 줄인다.`;
    case 'heal':
      return `가볍게 치고 가장 다친 식객의 체력을 ${pct(BATTLE.healRatio)} 채운다.`;
    case 'weaken':
      return `치면서 상대를 약화시켜 ${BATTLE.weakTurns}차례 동안 반격이 ${pct(1 - BATTLE.weakCut)} 약해진다.`;
    case 'rally':
      return `치면서 식객 모두를 격려해 이어지는 공격 ${BATTLE.rallyHits}번이 ${BATTLE.rallyBoost}배가 된다.`;
  }
}
