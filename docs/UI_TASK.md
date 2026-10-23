# 작업: 왕도 v2 화면을 새로 만들기 (src/ui, src/styles.css)

먼저 읽을 것: `docs/DESIGN.md`(톤·시스템), `docs/mockup-v2.1.jpg`와 `docs/mockup-v2.1.html`(확정된 시안. 색·패널·글씨·아이콘을 이걸 그대로 따른다), `src/core/*.ts`(게임 규칙, 이미 완성됨), `src/data/*.ts`.

## 지킬 것

- `src/core/`와 `src/data/`의 규칙·수치는 바꾸지 않는다. 화면(`src/ui/`, `src/styles.css`, `src/main.tsx`, `index.html`)만 고친다. 꼭 필요한 순수 도우미 함수는 `src/ui/` 안에 만든다.
- 화면 어디에도 한자를 쓰지 않는다. 아이콘은 `docs/mockup-v2.1.html`의 SVG 심볼 방식(선 아이콘)으로 만든다. 지금 `src/ui/icons.tsx`의 그림 파일 아이콘과 수채화풍 SVG는 버린다.
- 시안처럼: 배경 그림 위에 반투명 짙은 패널(rgba(18,14,22,.8), 1px 흰 10~15% 테두리, 둥근 모서리 12px), 흰 글씨, 금색(#f2c66d)은 숫자·강조에만, 붉은색(#d9473c)은 주 버튼과 배지. 제목 'Song Myung', 본문 'Gowun Dodum' 16px 이상, 숫자 'Gowun Batang' 굵게. 작은 회색 글씨를 남발하지 않는다(최소 13px, 대비 충분히).
- 휴대폰 세로 390px 기준, 최대 너비 480px 가운데 정렬.
- 그림 경로는 `src/data/art.ts`의 `ART`를 쓴다. 그림이 아직 없을 수 있으니 `src/ui/Portrait.tsx`의 `Art`(없으면 대체 표시)를 계속 쓴다. 대체 표시는 짙은 단색 + 이름 정도로 단순하게.
- 안내(`src/core/guide.ts`)가 쓰는 `data-guide` 값을 모두 해당 요소에 단다: `res`, `story`, `wp-market`, `wp-woodyard`, `wp-field`, `wp-tavern`, `ttuk`(정무 버튼), `talk`, `ycard-<식객 id>`, `grow`, `go`(출동), `feast`(연회), `promote`, `tab-home`, `tab-yokai`, `tab-stage`. 안내 말풍선(`src/ui/Guide.tsx`)도 새 스타일로.
- 끝나면 `npm run typecheck`, `npm test`, `npm run build`가 모두 통과해야 한다. git 명령은 쓰지 않는다.

## 화면 구성

아래 탭 4개: **궁궐**(`home`) · **식객**(`yokai`) · **토벌**(`stage`) · **기록**(`record`).

### 궁궐 (메인)
- 배경 `ART.bg('palace')`, 가운데에 대표 식객(`state.favorite`)의 배경 없는 전신 `ART.full(id)`를 크게 세운다. 대표 식객을 누르면 말풍선 대사가 바뀐다(인연 대사 `bondContent(id).talks[n].line` 중에서).
- 위: 관직(`rankDef(rank).title`) + 권세(`power`) 큰 숫자 패널. 승급 가능하면 승급 버튼(`data-guide="promote"`), 아니면 다음 관직까지 권세·명성 진행 막대.
- 그 아래 살림 4칸(엽전·곡식·명성·기력, `data-guide="res"`), 시안의 아이콘 그대로.
- 오른쪽 세로 메뉴 타일: **이야기**(새 화가 열려 있으면 배지, `data-guide="story"`), **정무**(뚝딱 소원 = 상소, 남은 횟수 배지, `data-guide="ttuk"`), **연회**(잔치, `data-guide="feast"`), **일터**(일터 시트 열기).
- 아래 큰 버튼 두 개: "정무 처리"(남은 횟수), "이야기 이어 보기"(다음 화 제목, 잠겼으면 잠긴 이유).
- 일터 시트: 4개 일터(`WORKPLACES`)마다 이름·생산량·칸(식객 얼굴)을 보여 주고, 칸을 누르면 식객 고르기(지금 `HomeView.tsx`의 `WorkSheet` 기능 유지). 일터 줄마다 `data-guide="wp-<id>"`.
- 다음 할 일(`nextHint`) 한 줄은 궁궐 아래쪽에 작게.

### 이야기
- 목록 화면: 부별로 화 목록(`EPISODES`), 본 화·열린 화·잠긴 화(잠긴 이유 `lockReason`) 표시.
- 보기 화면(비주얼 노벨): 배경 `ART.bg(scene.bg)`, 나오는 식객(`cast`)의 전신 그림, 아래 대사 상자(이름표: 식객 이름 / '나' / npc 이름, 지문은 이름표 없이). 화면을 누르면 다음 줄. `if` 깃발 처리는 `visibleLines`. 선택지가 있으면 장면 끝에서 버튼으로 고르고 `reply` 한 줄을 보여 준다. 마지막에 `completeEpisode(state, ep, choices)`를 `act`로 적용하고 보상(엽전·명성, 합류 식객)을 보여 준다. 합류 식객이 있으면 카드 그림으로 크게.
- 식객 인연 이야기(`SceneViewer`, 호감도 단계 장면)도 같은 보기 화면을 쓴다. 3·5단계는 `ART.cg(id, level)` 그림을 배경으로.

### 식객
- 카드 목록(카드 그림 `ART.card(id)`, 이름·종족·등급 별·레벨·하트 5칸·일하는 곳). 없는 식객은 어둡게 + 합류 경로(`joinCondition`).
- 식객 상세 시트: 탭 "인연"(대화·선물·나들이 버튼, 인연 이야기 5개 목록, `data-guide="talk"`) / "능력·레벨"(무력·지략·정치·매력, 레벨업 +1/+10/최대, `data-guide="grow"`). "대표로 세우기" 버튼(`setFavorite`).

### 토벌
- 지금 `StageView.tsx` 기능 그대로(장 배너 `ART.chapter`, 적 그림 `ART.foe`, 세 판 편성·승률·추천 편성·출동 `data-guide="go"`·기력), 새 스타일로.

### 창들
- 정무(상소): 대표 식객 카드 그림이 상소를 읽어 주는 모양, 두 판결 버튼과 보상 미리보기. 결과 알림.
- 승급, 토벌 결과(세 판 차례로 공개), 오프라인 수입, 대화, 선물·나들이 반응, 인연 단계 상승, 짝꿍: 지금 `modals.tsx` 기능 그대로 새 스타일로. 두루마리·한지·단청 같은 옛 장식은 모두 없앤다.
- 첫 실행(`introSeen`)에는 짧은 소개 대신 바로 이야기 1화 보기로 들어간다.

### 기록
- 지금 `RecordView.tsx` 그대로 새 스타일로.
