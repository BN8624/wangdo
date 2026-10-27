# 시제품 그림 출처

이 폴더의 그림(`tiles.png`, `chars.png`, `mons.png`, `faces.png`, `fx.png`)은 아래 묶음에서 골라 `scripts/proto-art.py`로 고친 것이다.

- **Ninja Adventure - Asset Pack**, pixel-boy & AAA, https://pixel-boy.itch.io/ninja-adventure-asset-pack
  - 라이선스: CC0 1.0 Universal(`LICENSE-ninja-adventure.txt`). 상업적 이용과 수정이 자유롭고 출처 표시 의무는 없다(고마움으로 적는다).

## 고친 것

| 이 게임에서 | 원본 | 고친 내용 |
|---|---|---|
| 나(주인공) | Actor/Character/SamuraiBlue | 옷을 베옷 색으로, 얼굴의 붉은 칠을 살빛으로 |
| 백설 | Actor/Character/Princess | 흰머리·흰 옷·밝은 살빛, 여우귀 덧그림 |
| 무영 | Actor/Character/FighterWhite | 옷을 먹빛 갑옷 색으로, 뿔 둘 덧그림 |
| 창고지기 | Actor/Character/Noble | 페도라를 갓(얇고 넓은 챙, 높은 원통 몸통, 갓끈)으로 다시 그림. 대화창 얼굴도 같이 |
| 초가 | Backgrounds/Tilesets/TilesetHouse (0,0)·(8,0) | 주황 지붕을 볏짚 색으로 |
| 기와집 | Backgrounds/Tilesets/TilesetHouse (12,0) | 붉은 지붕을 먹빛 회색으로 |

캐릭터 칸은 귀·뿔을 그릴 자리를 위해 원본 16×16 위에 4픽셀을 더한 16×20이다. 그 밖의 타일·몬스터·대장·얼굴 그림·효과는 원본 그대로다.

원본 묶음은 저장소에 넣지 않는다. 다시 만들려면 묶음을 받아 `python3 scripts/proto-art.py "<묶음 폴더>"`를 실행한다.

## 식객 일러스트

`portrait/`의 백설·무영·소담 전신 그림은 사용자가 ChatGPT 이미지 생성으로 만든 것이다(AI 생성물). 대화창과 합류 장면에 쓴다.
