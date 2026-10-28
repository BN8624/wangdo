# 시제품 맵 (Tiled)

시제품 맵은 무료 맵 편집기 [Tiled](https://www.mapeditor.org)로 그린다(2026-10-28부터). 이전에는 `src/proto/maps.ts` 안에 글자로 그렸고, 옮길 때 다섯 장 모두 그림과 플레이 결과가 픽셀·상태까지 같음을 확인했다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `src/proto/maps/<id>.tmj` | 맵 한 장(backhill·village·pass·cave1·cave2) |
| `src/proto/maps/terrain.tsj`, `terrain.png` | 땅 타일셋. 풀·흙길·동굴 바닥·동굴 벽·어둠 다섯 가지 '뜻'만 담는다. 실제 그림(흙길 가장자리, 풀 무늬 등)은 코드가 이웃 칸을 보고 고른다 |
| `src/proto/maps/deco.tsj` | 장식 타일셋. `public/proto/tiles.png`를 16칸 격자로 쓴다. 막히는 칸은 타일 속성 `solid` |

## 층

1. `terrain`: 땅. terrain 타일셋만 쓴다.
2. `deco`: 집·나무·바위·장독 같은 장식. 집(4×3)·나무(2×2)는 여러 칸을 이어 붙인다. 나무와 지붕의 윗줄은 타일 속성 `above`라 지나갈 수 있고, 그 뒤로 지나가는 사람을 덮는다.
3. `objects`: 점 오브젝트. `type`(Tiled의 Class 칸)으로 나눈다.
   - `actor`: 사람·짐승. 이름 = 대본에서 쓰는 id. 속성 `char` 또는 `mon`, `dir`(0 아래 1 위 2 왼 3 오른), `hidden`(대본에서 보여 줄 때까지 숨김)
   - `chest`: 상자. 속성 `item`, `coin`
   - `point`: 대본이 쓰는 이름 지점. 예: 장터, 주막 앞, 고갯마루
   - `smoke`: 굴뚝 연기가 오르는 자리(낮에만)
   - `light`: 밤·동굴에서 어둠을 밝히는 불빛. 속성 `kind`(lamp 등잔·torch 횃불), `radius`(칸). 인물에는 속성 `light`(torch·wisp)를 주면 그 사람을 따라 불빛이 난다

맵 속성: `name`(화면에 띄울 이름), `bgm`(story·home·battle), `cave`(동굴 맵), `ambient`(떠다니는 것: leaves 낙엽·dust 먼지·none). 밤에는 바깥 맵 어디에나 반딧불이 난다.

## 대본에서

`story.ts`는 좌표 대신 이름 지점을 쓴다.

```ts
{ t: 'walk', to: '장터', face: 1 },
{ t: 'map', map: 'pass', at: '고개 아래', dir: 1 },
```

지점을 옮기면 대본은 그대로 따라간다. 지점 이름을 바꾸면 대본도 고친다. `tests/proto.test.ts`가 대본이 쓰는 지점이 맵에 다 있는지, 사람·상자·지점이 막힌 칸에 서 있지 않은지 검사한다.

## 새 맵

1. Tiled에서 새 맵(직교, 16×16 타일, 고정 크기)을 만들고 `terrain.tsj`, `deco.tsj`를 이 순서로 넣는다.
2. 층 `terrain`, `deco`, `objects`를 만든다.
3. `src/proto/maps.ts`의 `MapId`와 `RAW`에 더한다.
4. 형식은 JSON 맵 파일(`.tmj`), 타일셋은 외부 `.tsj`로 둔다.

## 주의

- `deco.tsj`는 `tiles.png` 안의 위치로 타일을 기억한다. `scripts/proto-art.py`에 새 타일을 넣을 때는 맨 뒤에 붙여 기존 타일 자리를 옮기지 않는다.
- 맵은 Vite의 `?raw`로 읽으므로, `tsx`로 바로 돌리는 스크립트에서는 맵을 불러올 수 없다. 검사는 vitest로 한다.
