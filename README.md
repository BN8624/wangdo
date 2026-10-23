# 왕도 — 나무꾼에서 도깨비 대왕까지

조선풍 전래동화 판타지 육성 게임. 도깨비 방망이를 주운 나무꾼이 요괴 아가씨들을 식객으로 맞아 시골 마을 '달골'을 키우고, 마지막엔 도깨비 대왕이 된다.

**플레이:** https://bn8624.github.io/wangdo/ (휴대폰 브라우저 권장)

<p align="center"><img src="docs/mockup-v0.png" alt="화면 시안" width="720"></p>

## 놀이 방법

| 자원 | 얻는 곳 | 쓰는 곳 |
|---|---|---|
| 엽전 | 장사(식객의 **꾀**) | 식객 레벨업 → 위세 ↑ |
| 곡식 | 농사(식객의 **재주**) | 잔치 → 명성 ↑ (식객의 **매력**이 높을수록 많이) |
| 일손 | 모집(식객의 **힘**) | 소동 해결 → 명성·엽전, 장 대장은 식객으로 합류 |
| 명성 | 잔치·소원·소동 | 칭호 승급 |

- **고을**: 시간이 지나면 창고에 자원이 쌓인다(최대 8시간). 거두기를 눌러 받는다.
- **금 나와라 뚝딱!**: 방망이를 두드리면 흥부네 막내, 혹부리 영감, 콩쥐 같은 전래동화 인물이 소원을 들고 온다. 두 선택지 중 하나의 보상을 받는다.
- **칭호**: 위세(식객 능력치 합)와 명성이 차면 승급한다. 나무꾼 → … → 도깨비 대왕(15단계). 승급하면 생산량과 레벨 상한이 오르고, 새 식객이 합류하기도 한다.
- **소동**: 5장 40개. 장마다 마지막 대장을 달래면 식객이 된다.
- 진행은 브라우저에 자동 저장된다. 기록 탭에서 저장 코드로 다른 기기에 옮길 수 있다.

## 개발

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 규칙·데이터·진행 속도 테스트
npm run build      # 타입 검사 + dist/ 빌드
npm run simulate   # 플레이 성향별 칭호·소동 진행 시점 표
```

- 게임 규칙: `src/core/engine.ts` (순수 함수, 시간은 인자로 받음)
- 밸런스 수치: `src/data/balance.ts`, `src/data/ranks.ts` — 바꾼 뒤 `npm run simulate`와 `npm test`로 확인
- 내용: 식객 `src/data/yokai.ts`, 소원 `src/data/wishes.ts`, 소동 `src/data/stages.ts`
- 화면: `src/ui/`

## 그림

식객 초상화는 ChatGPT 구독으로 로그인한 Codex CLI의 이미지 생성으로 만든다. 모든 식객은 20대 성인 여성 캐릭터다.

```bash
codex login --device-auth   # 처음 한 번
npm run art:generate        # 없는 초상화만 그림 (-- dudu --force 로 특정 캐릭터 다시 그리기)
npm run art:prompts         # 손으로 뽑을 때 쓸 프롬프트 목록 → docs/ART_PROMPTS.md
```

화풍 기준 그림은 `art/style-anchor.webp`, 결과는 `public/portraits/<id>.webp`. 그림이 없는 식객은 자리 표시 그림으로 나온다.

## 배포

`main`에 푸시하면 GitHub Actions가 타입 검사·테스트·빌드를 통과한 뒤 GitHub Pages에 올린다. 처음 한 번 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 바꿔야 한다.
