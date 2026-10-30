// 받아내기 협상 판: 버티는 상대를 정해진 차례 안에 꺾는다. 정답은 없고, 수단마다 세기와 대가가 다르다.
//  - 방망이(나): 약하지만 대가가 없다
//  - 백설 홀림: 세지만 백설에게 빚이 하나 쌓인다
//  - 무영 위협: 세지만 마을 평판이 깎인다
//  - 소담 장부 대조: 장부(깃발)가 있어야 쓰고, 아주 세다
//  - 단서: 조사에서 모은 것. 한 번씩만 쓴다
// 상대마다 잘 먹히는(배율 > 1) 수단과 안 먹히는(< 1) 수단이 있다.
import type { Line, MemberId } from './types';

export type ToolId = 'bat' | 'charm' | 'threat' | 'ledger';

export interface ToolDef {
  label: string;
  /** 기본 세기 */
  power: number;
  /** 이 식객이 기술을 되찾아야 쓴다 */
  needs?: MemberId;
  /** 이 깃발이 있어야 쓴다 */
  needFlag?: string;
  /** 대가: 백설에게 진 빚 · 평판 */
  bsDebt?: number;
  rep?: number;
  say: Line[];
}

const me = (text: string): Line => ({ who: 'me', text });
const n = (text: string): Line => ({ who: 'narration', text });

export const TOOLS: Record<ToolId, ToolDef> = {
  bat: { label: '방망이로 두드린다', power: 18, say: [me('갚을 건 갚읍시다.'), n('방망이 끝이 닿자 상대의 어깨 위로 먹빛 글씨가 번졌다.')] },
  charm: {
    label: '백설: 여우불로 홀린다',
    power: 40,
    needs: 'baekseol',
    bsDebt: 1,
    say: [{ who: 'baekseol', text: '제 눈 보세요. 거짓말하면 다 보여요.' }, n('푸른 불꽃이 상대의 눈동자에 비쳤다. 상대의 입이 저도 모르게 풀렸다.')],
  },
  threat: {
    label: '무영: 쇠방망이로 위협한다',
    power: 32,
    needs: 'muyeong',
    rep: -1,
    say: [{ who: 'muyeong', text: '다음은 저 기둥이 아니라 당신 정강이요.' }, n('쇠방망이가 기둥을 내려찍었다. 지켜보던 마을 사람들이 움찔 물러났다.')],
  },
  ledger: {
    label: '소담: 장부를 대조한다',
    power: 55,
    needFlag: 'clue_ledger',
    say: [{ who: 'sodam', text: '장부에 다 있어요. 날짜, 끼니, 쌀 한 되까지.' }, n('소담이 장부를 펼쳐 한 줄씩 짚었다. 숫자 앞에서는 둘러댈 말이 없었다.')],
  },
};

/** 이번 판에만 쓰는 단서: 깃발이 있으면 한 번 쓴다 */
export interface Clue {
  flag: string;
  label: string;
  power: number;
  say: Line[];
}

export interface NegoBeat {
  t: 'nego';
  id: string;
  /** 상대 이름과 얼굴 */
  who: string;
  face?: string;
  prompt: string;
  resolve: number;
  turns: number;
  tools: ToolId[];
  /** 수단별 배율(잘 먹힘 > 1, 안 먹힘 < 1) */
  mods?: Partial<Record<ToolId, number>>;
  clues?: Clue[];
  /** 차례마다 상대 반응: 남은 마음이 많을 때·반쯤·거의 꺾였을 때 */
  react: [Line, Line, Line];
  win: { lines: Line[]; flag: string; log: string; coin?: number };
  lose: { lines: Line[]; flag: string; log: string; coin?: number };
}

export interface NegoState {
  id: string;
  left: number;
  turn: number;
  used: string[];
}

export interface NegoView {
  who: string;
  face?: string;
  prompt: string;
  left: number;
  max: number;
  turn: number;
  turns: number;
  options: { id: string; label: string; strength: '세게' | '보통' | '약하게'; cost?: string; once?: boolean; disabled?: string }[];
}

interface Ctx {
  flags: string[];
  party: MemberId[];
  skills: MemberId[];
}

const strength = (p: number): NegoView['options'][number]['strength'] => (p >= 40 ? '세게' : p >= 25 ? '보통' : '약하게');

/** 지금 쓸 수 있는 수단과 그 세기 */
export function negoOptions(b: NegoBeat, st: NegoState, ctx: Ctx): NegoView['options'] {
  const out: NegoView['options'] = [];
  for (const id of b.tools) {
    const t = TOOLS[id];
    const p = Math.round(t.power * (b.mods?.[id] ?? 1));
    let disabled: string | undefined;
    if (t.needs && !(ctx.skills.includes(t.needs) && (ctx.party.includes(t.needs) || t.needs === 'me'))) disabled = '아직 힘이 돌아오지 않았다';
    if (t.needFlag && !ctx.flags.includes(t.needFlag)) disabled = '쓸 거리가 없다';
    if (disabled && id !== 'bat') continue;
    const cost = t.bsDebt ? `백설에게 빚 +${t.bsDebt}` : t.rep ? `평판 ${t.rep}` : undefined;
    out.push({ id, label: t.label, strength: strength(p), cost, disabled });
  }
  for (const c of b.clues ?? [])
    if (ctx.flags.includes(c.flag) && !st.used.includes(c.flag)) out.push({ id: c.flag, label: `단서: ${c.label}`, strength: strength(c.power), once: true });
  return out;
}

/** 수단 하나를 쓴 결과 */
export function negoApply(b: NegoBeat, st: NegoState, pick: string) {
  const tool = TOOLS[pick as ToolId];
  const clue = b.clues?.find((c) => c.flag === pick);
  const power = tool ? Math.round(tool.power * (b.mods?.[pick as ToolId] ?? 1)) : (clue?.power ?? 0);
  const left = Math.max(0, st.left - power);
  const next: NegoState = { ...st, left, turn: st.turn + 1, used: clue ? [...st.used, pick] : st.used };
  const ratio = left / b.resolve;
  const react = left <= 0 ? [] : [b.react[ratio > 0.6 ? 0 : ratio > 0.25 ? 1 : 2]];
  return {
    st: next,
    say: [...(tool?.say ?? clue?.say ?? []), ...react],
    bsDebt: tool?.bsDebt ?? 0,
    rep: tool?.rep ?? 0,
    won: left <= 0,
    over: left <= 0 || next.turn >= b.turns,
  };
}
