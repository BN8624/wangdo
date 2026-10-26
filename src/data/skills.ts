import { COMBAT, type BattleSkill, type SkillKind } from '../core/combat';

// 식객 고유 기술(쿨타임 3차례). 종류는 설화 속 정체와 하는 일에서 골랐고, 종류가 곧 역할을 정한다(src/data/roster.ts).
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
      return `적 하나에게 공격력의 ${COMBAT.mult.strike}배 피해.`;
    case 'stun':
      return `적 하나에게 ${COMBAT.mult.stun}배 피해를 주고 한 차례 기절시킨다.`;
    case 'guard':
      return `아군 모두에게 자기 최대 체력 ${pct(COMBAT.shieldRatio)}만큼 보호막(${COMBAT.buffTurns}차례)을 씌운다.`;
    case 'heal':
      return `가장 다친 아군을 공격력의 ${COMBAT.heal}배, 나머지를 ${COMBAT.healRest}배 회복한다.`;
    case 'weaken':
      return `적 모두에게 ${COMBAT.mult.weaken}배 피해를 주고 공격력을 ${pct(COMBAT.atkDown)} 깎는다(${COMBAT.buffTurns}차례).`;
    case 'rally':
      return `아군 모두의 공격력을 ${pct(COMBAT.atkUp)} 올리고(${COMBAT.buffTurns}차례) 적 하나를 친다.`;
  }
}
