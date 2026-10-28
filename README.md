# 왕도 — 빚 받으러 왕까지

조선풍 판타지 자동 진행 도트 스토리 RPG(성인 대상). 떼인 빚을 받아내는 도깨비 방망이를 주운 나무꾼("나")이 식객들과 이야기를 따라 걷고 싸우며 권세가의 장부를 뒤집는다. 파티는 알아서 걷고 싸우고, 플레이어는 이야기 선택·갈림길·들를 곳·장비·받아내기를 고른다.

**플레이:** https://bn8624.github.io/wangdo/ (휴대폰 브라우저 권장). 지금은 시제품으로 1부 1~3화(25분 안팎)까지 있다. 처음 접속하면 성인 확인 화면이 나온다.

- 방향·결정: `docs/V3_DIRECTION.md`, 이어받기와 정한 것: `docs/HANDOFF_V3.md`
- 설정집: `docs/STORY_BIBLE.md`, 식객 일러스트 기준: `docs/ART_REFERENCE.md`, 맵: `docs/MAPS.md`
- 예전 수집형 게임(v2)은 2026-10-28에 내렸다. 마지막 상태는 `v2-final` 브랜치에 있다.

## 개발

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 시제품(맵·대본·모든 선택 조합 완주·고를 거리 간격·저장)과 전투 엔진
npm run build      # 타입 검사 + dist/ 빌드
```

- 진행: `src/proto/runner.ts`(순수 함수 진행기), 대본 `src/proto/story.ts`, 성장·전투 연결 `src/proto/party.ts`, 적·장비 `src/proto/data.ts`
- 화면(PixiJS + React): 맵 `src/proto/Field.tsx`, 전투 `src/proto/Battle.tsx`, 대화·선택 등 `src/proto/Panels.tsx`, 조명 `src/proto/light.ts`, 떠다니는 것 `src/proto/particles.ts`
- 맵: Tiled 파일 `src/proto/maps/*.tmj`(`docs/MAPS.md`)
- 전투 엔진: `src/core/combat.ts`(속도 순 턴제, 같은 조건이면 같은 결과), 능력치 `src/core/units.ts`, 수치 `src/data/balance.ts`·`skills.ts`·`roster.ts`
- 소리: `src/ui/sound.ts`(합성 배경음, `public/sfx/`의 Kenney CC0 효과음)
- 1부 원고: `content/story/`

## 그림

- 도트: Ninja Adventure(CC0)를 `scripts/proto-art.py`로 조선풍으로 고친 것(`public/proto/CREDITS.md`). 원본 묶음은 `npm run pixel:pack -- <zip>`으로 받는다.
- 식객 일러스트·장면: GPT(Codex)로 그린다. `npm run art:v3 -- <id>`(Codex 로그인 필요). AI 생성물이다.
