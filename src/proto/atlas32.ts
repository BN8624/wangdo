// scripts/pixel-chars.py가 만든다. 손으로 고치지 않는다.
// 캐릭터마다 128×160: 열 = 아래·위·왼·오른, 줄 = 서기·걷기·서기·걷기·공격(한 칸 32×32)
export const CHAR_CELL = 32;

export const CHARS32 = {
  ajeon: [128, 160] as [number, number],
  baekseol: [0, 0] as [number, number],
  bandit: [384, 320] as [number, number],
  bandit2: [0, 480] as [number, number],
  innkeeper: [0, 320] as [number, number],
  keeper: [128, 320] as [number, number],
  me: [128, 0] as [number, number],
  mokso: [128, 480] as [number, number],
  muyeong: [256, 0] as [number, number],
  sodam: [384, 0] as [number, number],
  thug: [0, 160] as [number, number],
  widow: [256, 320] as [number, number],
  worker: [256, 160] as [number, number],
  worker2: [384, 160] as [number, number],
} as const;

export type Char32Name = keyof typeof CHARS32;
