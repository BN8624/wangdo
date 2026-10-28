# v3 이어받기

세션 "왕도 게임 문제점 검토"(2026-10-27)에서 정한 것과 남은 일을, GPT 이미지 생성(Codex)을 쓸 수 있는 다른 세션이 이어받도록 적는다. 작업 브랜치는 `claude/sharp-allen-80543g`이다.

## 먼저 읽을 것

1. [V3_DIRECTION.md](V3_DIRECTION.md): 방향 전체. 자동 진행 도트 스토리 RPG, 웹 먼저, 성인(19세 이상), 조선풍 판타지.
2. [ART_REFERENCE.md](ART_REFERENCE.md): 식객 일러스트 기준 그림(`art/ref/`), 고정 설명문, 시제품 1·2화에 맞는 기존 그림.
3. 시제품 코드: `proto.html`, `src/proto/`(원고는 `src/proto/story.ts`), 테스트 `tests/proto.test.ts`.
4. 배포 주소: 시제품 https://bn8624.github.io/wangdo/proto.html , 기존 게임 https://bn8624.github.io/wangdo/

예전 세션(수집형 게임, 10월 26일 새 디자인)의 결정은 v3에서 쓰지 않는다. 두 문서가 다르면 v3 문서를 따른다.

## 그림 만드는 법 (사용자 결정, 2026-10-27)

- 10월 25일처럼 Claude가 Codex(GPT 이미지 생성)를 불러 그린다. 도구는 `scripts/gen-art.ts`(`codex exec -i <참조> ...`)다.
- 기준은 `art/ref/{baekseol,muyeong,sodam}.webp`다. 참조 이미지로 이것을 첨부한다.
- 지금 `src/data/art.ts`의 화풍 문구와 참조(`art/style-heroine-card.webp`, `public/art/card|full`)는 10월 26일 버전을 가리키니 v3 그림에 그대로 쓰지 않는다.
- 설명문은 ART_REFERENCE.md의 공통 화풍 + 사람 설명 + 이번 장면을 쓴다.
- 장면 그림은 세로 2:3, 1인칭 시점이다. 주인공은 손이나 소매만 나오고 얼굴은 나오지 않는다.
- 사용량: 사용자가 쓰는 GPT 사용량은 정해진 시간마다 초기화된다. 막히면 기다린다.

### 그릴 것

| 그림 | 상태 |
| --- | --- |
| 1화 밤, 백설이 여우불을 되찾음 (`e1-foxfire`) | 그림, 넣음 (2026-10-28) |
| 2화 장터 (`e2-market`), 2화 밤 거울 (`e2-mirror`) | 그림, 넣음. 거울 속 먹빛 글자 자국은 그려지지 않았다(필요하면 다시) |
| 3화 주막, 첫 잔 (`e3-firstcup`) | 그림, 넣음 |
| 기술 컷인 상반신 (`public/proto/cutin/`) | 백설·무영 그림, 넣음 |
| 소담 대화창 전신(투명 배경) | 4화를 만들 때 |

GPT 그림은 `npx tsx scripts/v3-art.ts <id>`로 그린다(Codex 로그인 필요: `npm i -g @openai/codex` 뒤 `codex login --device-auth`). 설명문은 ART_REFERENCE.md의 공통 화풍·사람 설명을 그대로 읽는다. 새 그림은 스크립트의 `V3_ART`에 더한다.
그린 장면은 `public/proto/scene/<이름>.webp`(900×1350)에 넣고, 해당 대사 줄에 `{ scene: '<이름>' }`을 단다.

## 정한 것 (2026-10-27, 사용자 답)

1. **GPT**: 구독(ChatGPT)으로 쓴다. 세션마다 `npm i -g @openai/codex` 뒤 `codex login --device-auth`로 사용자가 브라우저에서 코드를 넣는다.
   - 도트 원본 묶음(Ninja Adventure)은 itch.io 가입 없이 `node scripts/fetch-ninja-pack.cjs <zip>`으로 받는다.
2. **백설 단독 화**: 넣었다. 1화와 무영 화 사이 2화 '여우가 사람 사는 법'. 상황마다 전투를 넣었다(사용자 요청): 장터 파락호, 주막 흑운채 술꾼, 밤 도깨비불. 고를 거리는 떡값·파락호·외상값·거울 넷이고 깃발로 반응이 갈린다. 3화 적은 레벨을 3씩 올렸다.
3. **기술**: A(빚을 받아낼수록 담보 잡힌 힘이 돌아옴). 주인공·무영·소담 모두 같은 방식. 컷인은 기술을 쓸 때마다 나오고 메뉴에서 켜고 끈다.
4. **10월 25일 그림**: 6장을 장면 그림으로 넣고, 대화창 백설·무영을 기준 전신으로 바꿨다. 글은 그림에 맞춰 고쳤다(밤길 백설은 손을 잡아끎, 무영의 뿔).
5. **'송 대감네'**: 바꿨다.

## 작업 방식

- 사용자는 바로 고치기 전에 의논부터 하길 원할 때가 있다("바로 고치지 말고 먼저 의논부터 하자"). 방향이 걸린 일은 의견을 먼저 말한다.
- 배포: 커밋 → 브랜치 푸시 → PR → 바로 병합 → GitHub Pages에서 새 파일 해시 확인.
- 검사: `npm run typecheck`, `npm test`(110개), `npm run build`.
