# 왕도 — 빚 받으러 왕까지

조선풍 판타지 RPG(성인 대상). 떼인 빚을 받아내는 도깨비 방망이를 주운 나무꾼(1인칭 "나")이 구미호·도깨비·우렁각시 같은 요괴 식객들과 함께 권세가의 장부를 뒤집으며 해랑국의 왕좌까지 오른다. 이야기는 부 단위로 이어진다(1부 달골 10장, 2부 한빛성 8장, 3부 하늘의 빚 8장). 식객 16명.

처음 접속하면 성인 확인 화면이 나온다. 관능적인 장면은 입맞춤과 함께 보낸 밤의 암시까지 쓰고, 맨몸이나 성행위 묘사는 하지 않는다.

**플레이:** https://bn8624.github.io/wangdo/ (휴대폰 브라우저 권장)

수집형 RPG(니케·블루 아카이브·서머너즈 워 같은 틀)에 방치 보상을 더했다. 아래 탭은 **로비 · 식객 · 출정 · 모집 · 기록**.

- **출정(캠페인)**: 26장 × 스테이지 6. 장마다 이야기 한 화가 스테이지 사이 짧은 컷신으로 나뉘어 나오고, 마지막 스테이지(대장)를 깨면 그 화의 식객이 확정으로 합류한다. 첫 클리어 보상(옥·엽전·수련치·명성)과 별 3개(승리·아무도 쓰러지지 않음·15라운드 안 승리).
- **전투**: 다섯 명 대 적 웨이브의 턴제 자동 전투. 속도 순으로 움직이고, 고유 기술(강타·기절·방어·치유·약화·격려)은 쿨타임마다 쓴다. 속성 상성(물 > 불 > 나무 > 물, 빛 ↔ 어둠)은 1.3배. 자동·수동(빛나는 카드를 눌러 기술), 1~3배속, 건너뛰기. 같은 편성·같은 식객 상태면 결과도 같고, 지면 얻는 것이 없다. 첫 전투(1-1)만은 반드시 이긴다.
- **모집**: 옥으로 한 번·열 번. SSR 4%·SR 20%, 60번째 안에 SSR 확정, 열 번은 SR 이상 하나 확정, 첫 열 번은 새 SSR 하나 확정. 겹치면 조각이 되어 별을 올린다. 현금 결제는 없다.
- **식객 육성**: 수련치·엽전으로 레벨, 조각(+기억 조각)으로 별(★1~6, 별마다 레벨 상한이 오른다), 무기·장신구, 짝꿍 편성 보너스, 인연 단계 보너스.
- **방치 보상**: 로비의 상자에 자리를 비운 동안(최대 12시간) 엽전·수련치·명성·옥·장비가 쌓인다. 가장 멀리 깬 스테이지가 높을수록 많다.
- **수련장**: 막혔을 때 몇 번이고 하는 반복 전투(14단계). 기력·대기 시간 같은 기다림은 어디에도 없다.
- **관직(계정 레벨)**: 명성이 차면 서민 → 참봉 → … → 영의정 → 섭정 → 왕으로 저절로 오르고 옥을 준다.
- **정무**: 세 번 이길 때마다 상소 하나를 판결해 보상을 받는다.
- **인연**: 대화·선물·나들이로 호감도 5단계, 단계마다 개인 이야기와 특별 그림.
- **소리**: 음원 파일 없이 브라우저에서 합성하는 가야금풍 배경음과 효과음(`src/ui/sound.ts`). 기록 탭에서 끈다.
- **저장 지키기**: 저장은 기기 브라우저에만 있다. 파일 백업·코드 복사·불러오기, 사흘마다 백업 알림, 홈 화면 추가 안내(`src/ui/Backup.tsx`). 서비스 워커(`public/sw.js`)가 그림을 기기에 담아 둔다.

설계: `docs/COLLECTION_DESIGN.md` · 설정집: `docs/STORY_BIBLE.md`

## 개발

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 규칙·데이터·진행 속도 테스트
npm run build      # 타입 검사 + dist/ 빌드
npm run simulate   # 쉬지 않고 하는 사람이 장마다 걸리는 시간·전투력 표
```

- 게임 규칙: `src/core/engine.ts` (순수 함수, 시간은 인자로 받음)
- 밸런스 수치: `src/data/balance.ts`, `src/data/ranks.ts` — 바꾼 뒤 `npm run simulate`와 `npm test`로 확인
- 전투: `src/core/combat.ts`(순수 함수, 한 차례씩 진행) · 능력치 `src/core/units.ts` · 캠페인 `src/core/campaign.ts` · 모집 `src/core/gacha.ts` · 방치·수련장 `src/core/idle.ts` · 화면 `src/ui/BattleView.tsx`·`src/ui/StageFlow.tsx` · 기술 `src/data/skills.ts` · 속성 `src/data/roster.ts`
- 내용: 식객 `content/heroines.json`, 이야기 `content/story/`, 인연 `content/bonds/`, 정무 `src/data/wishes.ts`, 졸개 무리 `src/data/world.ts`, 장비 `src/data/items.ts`
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

방문 통계(선택): [GoatCounter](https://www.goatcounter.com/)에서 무료 사이트를 만들고, 저장소 **Settings → Secrets and variables → Actions → Variables**에 `GOATCOUNTER`(예: `https://wangdo.goatcounter.com/count`)를 넣으면 다음 배포부터 켜진다. 스테이지 승패와 모집이 이정표로 잡힌다.
