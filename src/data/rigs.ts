// 숨쉬기 그물망(LiveArt)의 기준점. 값은 전신 그림(art/full) 안의 비율(0~1)이다.
// cx: 몸통 가운데(가로), chest: 가슴 높이, waist: 허리 높이(이 아래는 움직이지 않는다), halfw: 몸통 반폭.
// 몸통 반폭 바깥(머리카락·꼬리·옷자락)은 바람에 흔들린다. 그림을 바꾸면 이 값도 맞춘다.

export interface Rig {
  cx: number;
  chest: number;
  waist: number;
  halfw: number;
}

export const DEFAULT_RIG: Rig = { cx: 0.5, chest: 0.22, waist: 0.34, halfw: 0.12 };

const RIGS: Record<string, Rig> = {
  baekseol: { cx: 0.55, chest: 0.22, waist: 0.33, halfw: 0.12 },
  muyeong: { cx: 0.5, chest: 0.22, waist: 0.34, halfw: 0.13 },
  sodam: { cx: 0.52, chest: 0.2, waist: 0.3, halfw: 0.11 },
};

export const rigOf = (id: string): Rig => RIGS[id] ?? DEFAULT_RIG;
