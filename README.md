# 왕도 — 빚 받으러 왕까지

조선풍 판타지 방치형 육성 게임. 떼인 빚을 받아내는 도깨비 방망이를 주운 나무꾼(1인칭 "나")이 구미호·도깨비·우렁각시 같은 요괴 식객들과 함께 권세가의 장부를 뒤집으며 해랑국의 왕좌까지 오른다. 이야기는 부 단위로 이어진다.

**플레이:** https://bn8624.github.io/wangdo/ (휴대폰 브라우저 권장)

- **이야기**: 부 → 화로 이어지는 연재. 관직·권세·토벌 진행에 따라 다음 화가 열린다. `content/story/`에 화 파일을 넣으면 바로 붙고, `npm run story:next`로 Codex가 다음 화를 이어 쓴다.
- **관직**: 서민 → 참봉 → 현감 → … → 영의정 → 섭정 → 왕, 그 뒤 치세 단계가 끝없이 이어진다.
- **일터**: 저잣거리(지략→엽전)·훈련장(무력→엽전)·논밭(정치→곡식)·주막(매력→명성)에 식객을 보내 자동 수입.
- **정무**: 관아에 올라온 상소를 판결해 보상을 받는다.
- **인연**: 대화·선물·나들이·연회로 호감도 5단계, 단계마다 개인 이야기와 특별 그림.
- **토벌**: 식객 셋이 자동으로 싸우는 라운드제 전투. 10라운드 안에 상대를 쓰러뜨리면 해결. 식객마다 고유 기술(강타·기절·방어·치유·약화·격려)이 있고, 추천 편성은 기술 조합까지 계산한다. 대치 구도와 말풍선 대사로 재생되며 2배속·건너뛰기가 있다.

설계: `docs/DESIGN.md` · 설정집: `docs/STORY_BIBLE.md`

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
- 전투: `src/core/battle.ts`(순수 함수, 전투 기록을 만든다) · 화면 `src/ui/BattleView.tsx` · 기술 `src/data/skills.ts` · 대사 `src/data/battle-lines.ts`
- 내용: 식객 `content/heroines.json`, 인연 `content/bonds/`, 정무 `src/data/wishes.ts`, 토벌 `src/data/stages.ts`
- 그림 기준: `docs/CHARACTER_GUIDE.md`
- 화면: `src/ui/`

## 그림

그림은 ChatGPT 구독으로 로그인한 Codex CLI의 이미지 생성으로 만든다(목록: `src/data/art.ts`). 모든 식객은 성인 여성 캐릭터다.

```bash
codex login --device-auth   # 처음 한 번
npm run art:generate        # 없는 초상화만 그림 (-- dudu --force 로 특정 캐릭터 다시 그리기)
npm run art:prompts         # 손으로 뽑을 때 쓸 프롬프트 목록 → docs/ART_PROMPTS.md
```

화풍 기준 그림은 `art/style-heroine.png`(인물)·`art/style-scene.png`(배경), 결과는 `public/art/`.

## 배포

`main`에 푸시하면 GitHub Actions가 타입 검사·테스트·빌드를 통과한 뒤 GitHub Pages에 올린다. 처음 한 번 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 바꿔야 한다.
