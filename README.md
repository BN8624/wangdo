# 왕도 — 빚 받으러 왕까지

조선풍 판타지 방치형 육성 게임(성인 대상). 떼인 빚을 받아내는 도깨비 방망이를 주운 나무꾼(1인칭 "나")이 구미호·도깨비·우렁각시 같은 요괴 식객들과 함께 권세가의 장부를 뒤집으며 해랑국의 왕좌까지 오른다. 이야기는 부 단위로 이어진다(1부 달골 10화, 2부 한빛성 8화).

처음 접속하면 성인 확인 화면이 나온다. 관능적인 장면은 입맞춤과 함께 보낸 밤의 암시까지 쓰고, 맨몸이나 성행위 묘사는 하지 않는다.

**플레이:** https://bn8624.github.io/wangdo/ (휴대폰 브라우저 권장)

- **이야기**: 부 → 화로 이어지는 연재. 관직·권세·토벌 진행에 따라 다음 화가 열린다. `content/story/`에 화 파일을 넣으면 바로 붙고, `npm run story:next`로 Codex가 다음 화를 이어 쓴다.
- **관직**: 서민 → 참봉 → 현감 → … → 영의정 → 섭정 → 왕, 그 뒤 치세 단계가 끝없이 이어진다.
- **일터**: 저잣거리(지략→엽전)·훈련장(무력→엽전)·논밭(정치→곡식)·주막(매력→명성)에 식객을 보내 자동 수입.
- **정무**: 관아에 올라온 상소(60건)를 판결해 보상을 받는다.
- **인연**: 대화·선물·나들이·연회로 호감도 5단계, 단계마다 개인 이야기와 특별 그림.
- **토벌**: 식객 셋이 자동으로 싸우는 라운드제 전투. 10라운드 안에 상대를 쓰러뜨리면 해결. 식객마다 고유 기술(강타·기절·방어·치유·약화·격려)이 있고, 상대마다 약점 기술이 있어 맞는 기술은 1.7배로 들어간다. 추천 편성은 실제 전투 승률로 고른다. 대치 구도와 말풍선 대사로 재생되며 2배속·건너뛰기가 있고, 져도 위로금(30%)을 받는다.
- **소리**: 음원 파일 없이 브라우저에서 합성하는 가야금풍 배경음과 효과음(`src/ui/sound.ts`). 기록 탭에서 끈다.
- **저장 지키기**: 저장은 기기 브라우저에만 있다. 파일 백업·코드 복사·불러오기, 사흘마다 백업 알림, 홈 화면 추가 안내(`src/ui/Backup.tsx`). 서비스 워커(`public/sw.js`)가 그림을 기기에 담아 둔다.

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

방문 통계(선택): [GoatCounter](https://www.goatcounter.com/)에서 무료 사이트를 만들고, 저장소 **Settings → Secrets and variables → Actions → Variables**에 `GOATCOUNTER`(예: `https://wangdo.goatcounter.com/count`)를 넣으면 다음 배포부터 켜진다. 이야기를 다 본 화, 승급, 토벌 승패가 이정표로 잡힌다.
