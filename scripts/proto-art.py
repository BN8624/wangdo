"""시제품 그림 만들기: Ninja Adventure(CC0) 원본에서 쓸 것만 골라 조선풍으로 고치고 한 장씩 묶는다.

쓰는 법:
  python3 scripts/proto-art.py "<Ninja Adventure - Asset Pack 폴더>" [--preview 미리보기.png]
  python3 scripts/proto-art.py --derive [--preview 미리보기.png]
    원본 묶음 없이, 이미 만든 chars.png·faces.png에서 DERIVED·DERIVED_FACES만 다시 만든다

결과:
  public/proto/tiles.png   타일·도장(집·나무 등)
  public/proto/chars.png   걷는 캐릭터(칸마다 64×100: 아래·위·왼·오른 × 걷기 4 + 공격 1, 한 칸 16×20)
  public/proto/mons.png    몬스터(칸마다 64×64)와 대장(50×50 × 5)
  public/proto/faces.png   대화창 얼굴(38×38)
  public/proto/fx.png      타격 효과(32×32 × 4)
  src/proto/atlas.ts       위 그림의 좌표표(자동 생성, 손으로 고치지 않는다)

원본 위에 덧그린 것(여우귀·뿔·상투 등)은 이 파일의 OVERLAY에 칸 단위로 적는다.

주의: Tiled 맵(src/proto/maps/*.tmj)은 tiles.png의 칸 위치로 장식을 기억한다(deco.tsj).
TILES에 새 타일을 넣을 때는 반드시 맨 뒤에 붙여 기존 타일의 자리를 옮기지 않는다.
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'proto')
ATLAS_TS = os.path.join(ROOT, 'src', 'proto', 'atlas.ts')

T = 16
# 캐릭터 한 칸 높이: 원본 16 위에 귀·뿔을 그릴 여백 4
CH = 20
HEAD = CH - T


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ── 타일: 이름 → (원본 파일, 칸 x, 칸 y, 너비 칸, 높이 칸) ──
FLOOR = 'Backgrounds/Tilesets/TilesetFloor.png'
NATURE = 'Backgrounds/Tilesets/TilesetNature.png'
HOUSE = 'Backgrounds/Tilesets/TilesetHouse.png'
RELIEF = 'Backgrounds/Tilesets/TilesetRelief.png'
ELEMENT = 'Backgrounds/Tilesets/TilesetElement.png'

TILES = {
    # 풀
    'grass': (FLOOR, 0, 12, 1, 1),
    'grass2': (FLOOR, 1, 12, 1, 1),
    'grass3': (FLOOR, 2, 12, 1, 1),
    'grass4': (FLOOR, 3, 12, 1, 1),
    'grass5': (FLOOR, 4, 12, 1, 1),
    'grass6': (FLOOR, 2, 11, 1, 1),
    'grass7': (FLOOR, 3, 11, 1, 1),
    # 흙길(이웃 네 방향으로 고르는 자동 타일)
    'd_tl': (FLOOR, 0, 7, 1, 1), 'd_t': (FLOOR, 1, 7, 1, 1), 'd_tr': (FLOOR, 2, 7, 1, 1),
    'd_l': (FLOOR, 0, 8, 1, 1), 'd_c': (FLOOR, 1, 8, 1, 1), 'd_r': (FLOOR, 2, 8, 1, 1),
    'd_bl': (FLOOR, 0, 9, 1, 1), 'd_b': (FLOOR, 1, 9, 1, 1), 'd_br': (FLOOR, 2, 9, 1, 1),
    'd_vt': (FLOOR, 3, 7, 1, 1), 'd_vm': (FLOOR, 3, 8, 1, 1), 'd_vb': (FLOOR, 3, 9, 1, 1),
    'd_hl': (FLOOR, 0, 10, 1, 1), 'd_hm': (FLOOR, 1, 10, 1, 1), 'd_hr': (FLOOR, 2, 10, 1, 1),
    'd_one': (FLOOR, 3, 10, 1, 1),
    'd_c2': (FLOOR, 0, 11, 1, 1), 'd_c3': (FLOOR, 1, 11, 1, 1),
    # 동굴
    'cave': (FLOOR, 12, 15, 1, 1),
    'wall': (RELIEF, 5, 1, 1, 1),
    'wall_foot': (RELIEF, 5, 2, 1, 1),
    'hole': (NATURE, 7, 13, 1, 1),
    # 작은 것
    'bush': (NATURE, 0, 10, 1, 1),
    'bush2': (NATURE, 1, 10, 1, 1),
    'leafy': (NATURE, 2, 10, 1, 1),
    'flower_y': (NATURE, 0, 11, 1, 1),
    'clover': (NATURE, 2, 11, 1, 1),
    'flower_r': (NATURE, 3, 11, 1, 1),
    'flower_w': (NATURE, 6, 11, 1, 1),
    'rock': (NATURE, 8, 12, 1, 1),
    'rock2': (NATURE, 6, 12, 1, 1),
    'stone': (NATURE, 4, 13, 1, 1),
    'jar': (ELEMENT, 2, 0, 1, 1),
    'jar_red': (ELEMENT, 3, 0, 1, 1),
    'crate': (ELEMENT, 0, 2, 1, 1),
    'sack': (ELEMENT, 2, 2, 1, 1),
    'sign': (ELEMENT, 6, 3, 1, 2),
    # 도장(여러 칸)
    'tree_round': (NATURE, 0, 0, 2, 2),
    'tree_pine': (NATURE, 2, 0, 2, 2),
    'tree_dead': (NATURE, 4, 0, 2, 2),
    'tree_root': (NATURE, 6, 0, 2, 2),
    'stump': (NATURE, 0, 8, 2, 2),
    'boulder': (NATURE, 0, 12, 2, 2),
    'house_a': (HOUSE, 0, 0, 4, 3),
    'house_thatch': (HOUSE, 4, 0, 4, 3),
    'house_b': (HOUSE, 8, 0, 4, 3),
    'house_tile': (HOUSE, 12, 0, 4, 3),
    'jumak': (HOUSE, 16, 0, 3, 3),
    'stall': (HOUSE, 19, 0, 4, 3),
}

# 초가처럼 보이게: 주황 지붕을 볏짚 색으로
# ── 조선풍 소품(2026-10-28): 기존 타일 뒤에 붙인다(Tiled가 tiles.png 안의 자리로 기억하므로 앞 타일을 옮기지 않는다) ──
# 이름 → (원본 파일, 칸 x, 칸 y, 너비 칸, 높이 칸, 색 바꾸기)
FENCE = {'#a3754e': '#9a8a66', '#965340': '#76674b', '#ffad5d': '#c9b98e', '#e66a3a': '#8b7a56'}  # 싸리 울타리: 마른 싸리 빛
STONE = {'#c8966b': '#8f8b84', '#d2b37d': '#a9a49b', '#eecf9b': '#c4beb2', '#a3754e': '#6f6b66'}  # 돌담: 잿빛 막돌
POSTS = {'#e46d3a': '#a3754e'}  # 빨랫줄 기둥: 주황 → 나무 빛
LAUNDRY = {**POSTS, '#79b8ce': '#4a5a8a', '#548789': '#38466e', '#e0394c': '#ece6d6'}  # 쪽빛 저고리와 흰 무명
EXTRA_TILES = {
    'fence': ('Backgrounds/Tilesets/TilesetHouse.png', 11, 5, 1, 1, FENCE),
    'stonewall': ('Backgrounds/Tilesets/TilesetHouse.png', 11, 9, 1, 1, STONE),
    'clothesline': ('Backgrounds/Tilesets/TilesetElement.png', 11, 2, 3, 2, POSTS),
    'laundry': ('Backgrounds/Tilesets/TilesetElement.png', 14, 2, 2, 2, LAUNDRY),
    'straw': ('Backgrounds/Tilesets/TilesetElement.png', 12, 4, 1, 1, None),
}
# Tiled deco.tsj에 적을 속성: 칸마다 solid(막힘)·above(사람을 덮음). 줄 단위(위→아래)
EXTRA_PROPS = {
    'fence': ['solid'], 'stonewall': ['solid'], 'clothesline': ['above', 'solid'], 'laundry': ['above', 'solid'], 'straw': ['solid'],
    'sotdae': ['above', 'above', 'solid'],
}


def sotdae():
    """솟대(16×48): 긴 장대 끝에 나무 새 한 마리"""
    img = Image.new('RGBA', (16, 48), (0, 0, 0, 0))
    px = img.load()
    pole, pole_hi, wood, wood_hi, beak = hexrgb('#7a5a3c'), hexrgb('#a3754e'), hexrgb('#d9c9a6'), hexrgb('#f1e6cc'), hexrgb('#e6a23a')
    for y in range(12, 47):
        put(px, 16, 48, 6, y, OUTLINE)
        put(px, 16, 48, 7, y, pole_hi)
        put(px, 16, 48, 8, y, pole)
        put(px, 16, 48, 9, y, OUTLINE)
    for x in range(6, 10):
        put(px, 16, 48, x, 47, OUTLINE)
    # 새: 장대 꼭대기에 옆으로 앉은 나무 오리(머리는 오른쪽, 꼬리는 왼쪽으로 들림)
    bird = [
        '..........oo...',
        '.........owho..',
        'o........owwob.',
        'ow.......owwo..',
        'owwoooooowwo...',
        '.owwwwwhhwwo...',
        '.owwwwwwwwwo...',
        '..owwwwwwwo....',
        '...oooooooo....',
    ]
    for j, row in enumerate(bird):
        for i, c in enumerate(row):
            if c == '.':
                continue
            put(px, 16, 48, i, 3 + j, {'o': OUTLINE, 'h': wood_hi, 'w': wood, 'b': beak}[c])
    return img


THATCH = {'#e66a3a': '#b8955a', '#ffad5d': '#d9c08a', '#f38c4c': '#c9a86c'}
# 기와처럼 보이게: 붉은 지붕을 먹빛 회색으로
GIWA = {'#e0394c': '#5b6475', '#e66a3a': '#47505f', '#e38967': '#7a8496', '#ff8b62': '#8e98aa'}
TILE_RECOLOR = {'house_a': THATCH, 'house_b': THATCH, 'house_tile': GIWA}

# ── 캐릭터 ──
CHARS = {
    # id: (원본 폴더, 색 바꾸기, 덧그리기 이름)
    # 나무꾼: 원본의 상투를 살리고 베옷 색으로. 얼굴의 붉은 칠은 살빛으로
    'me': ('SamuraiBlue', {
        '#548789': '#b8a888', '#79b8ce': '#e9e0c8', '#4a5270': '#7a6748', '#9ba7aa': '#d6ccb0',
        '#d14b34': '#d9783f',
    }, None),
    # 백설: 흰머리·흰 옷·여우귀
    'baekseol': ('Princess', {
        '#3b3643': '#b9b2c9', '#4e484a': '#ece8f2', '#d78b4a': '#f6d2b0', '#a3754e': '#e3a983',
        '#f1c471': '#f4f0f6', '#965340': '#d9b6a6', '#8d977f': '#c8323c', '#e0394c': '#ece8f2',
    }, 'fox'),
    # 무영: 붉은 머리띠는 그대로, 갑옷은 먹빛 쇠, 뿔 둘
    'muyeong': ('FighterWhite', {
        '#8f3e56': '#3f4652', '#d3a2c0': '#9aa3b5', '#f2eaf1': '#d5dae6',
    }, 'horns'),
    # 창고지기: 원본의 페도라를 갓으로 바꿔 그린다
    'keeper': ('Noble', {}, 'gat'),
    'thug': ('Monk2', {}, None),
    'innkeeper': ('OldMan', {}, None),
    'widow': ('OldWoman', {}, None),
    'worker': ('Villager4', {'#f6c25c': '#3b3643', '#d9a13a': '#2a2630'}, None),
    'worker2': ('Hunter', {}, None),
    # 소담: 한쪽으로 묶은 머리를 짙은 갈색으로, 옷을 짙은 청록으로
    'sodam': ('Woman', {'#f1c471': '#6b4630', '#d78b4a': '#43291c', '#548789': '#2b6f6a', '#79b8ce': '#4fa79a'}, None),
}

MONS = {
    'racoon': 'Actor/Monster/Racoon/SpriteSheet.png',
    'wisp': 'Actor/Monster/Spirit/SpriteSheet.png',
    'gob': 'Actor/Monster/Cyclope/SpriteSheet.png',
    'gob2': 'Actor/Monster/Cyclope2/SpriteSheet.png',
    'bat': 'Actor/Monster/BlueBat/SpriteSheet.png',
}
BOSS = {'boss_gob': 'Actor/Boss/DemonCyclop/Idle.png'}

FACES = {
    'baekseol': 'Actor/Character/Princess/Faceset.png',
    'muyeong': 'Actor/Character/FighterWhite/Faceset.png',
    'keeper': 'Actor/Character/Noble/Faceset.png',
    'thug': 'Actor/Character/Monk2/Faceset.png',
    'innkeeper': 'Actor/Character/OldMan/Faceset.png',
    'widow': 'Actor/Character/OldWoman/Faceset.png',
    'worker': 'Actor/Character/Villager4/Faceset.png',
    'worker2': 'Actor/Character/Hunter/Faceset.png',
    'boss_gob': 'Actor/Boss/DemonCyclop/Faceset.png',
    'gob': 'Actor/Monster/Cyclope/Faceset.png',
    'sodam': 'Actor/Character/Woman/Faceset.png',
}
FACE_RECOLOR = {'baekseol': 'baekseol', 'muyeong': 'muyeong', 'worker': 'worker', 'sodam': 'sodam'}

# ── 이미 만든 캐릭터에서 파생 ──
# 흑운채는 도깨비 유민의 산적 무리다(STORY_BIBLE). 괴물이 아니라 사람 체형 산적에 뿔을 단다.
# 먹빛 옷(흑운채 = 검은 구름)으로 맞춘다.
BANDIT_HUNTER = {'#d14b34': '#3b3643', '#8f3e56': '#26222c', '#4a5270': '#2b2f3a', '#548789': '#3f4652'}
BANDIT_MONK = {'#d14b34': '#3f4652', '#8f3e56': '#2b2f3a', '#e0394c': '#5a6070'}
# 두목 먹쇠: 붉은 도깨비 살빛, 먹빛 옷, 큰 뿔
MOKSO = {**BANDIT_MONK, '#ef914f': '#c4553f'}
AJEON = {'#4e484a': '#3f5f8a', '#3b3643': '#2c4566'}
DERIVED = {
    # id: (바탕 캐릭터, 색 바꾸기, 덧그리기)
    'bandit': ('worker2', BANDIT_HUNTER, 'dhorns'),
    'bandit2': ('thug', BANDIT_MONK, 'dhorns'),
    'mokso': ('thug', MOKSO, 'bighorns'),
    # 관아 아전: 창고지기(갓 쓴 양반)의 먹빛 도포를 관아 푸른 옷으로
    'ajeon': ('keeper', AJEON, None),
}
DERIVED_FACES = {
    'bandit': ('worker2', BANDIT_HUNTER, 'horns'),
    'mokso': ('thug', MOKSO, 'bighorns'),
    'ajeon': ('keeper', AJEON, None),
}

FX = {'cut': 'FX/Attack/Cut/SpriteSheet.png', 'claw': 'FX/Attack/Claw/SpriteSheet.png'}


def recolor(img, mapping):
    if not mapping:
        return img
    m = {hexrgb(k): hexrgb(v) for k, v in mapping.items()}
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in m:
                px[x, y] = (*m[(r, g, b)], a)
    return img


def col_top(px, x, h):
    """그 세로줄에서 불투명한 가장 위 칸"""
    for y in range(h):
        if px[x, y][3] > 0:
            return y
    return h


def head_top(frame):
    """프레임에서 불투명한 가장 위 줄과 그 줄의 좌우 끝"""
    px = frame.load()
    for y in range(frame.height):
        xs = [x for x in range(frame.width) if px[x, y][3] > 0]
        if xs:
            return y, xs[0], xs[-1]
    return 0, 0, frame.width - 1


OUTLINE = hexrgb('#141b1b')


def put(px, w, h, x, y, c):
    if 0 <= x < w and 0 <= y < h:
        px[x, y] = (*c, 255)


def overlay(frame, kind, facing):
    """frame: 16×20 한 칸(위 4줄은 여백). facing: 0 아래 1 위 2 왼 3 오른"""
    if not kind:
        return
    px = frame.load()
    w, h = frame.size
    y0, xl, xr = head_top(frame)
    if kind == 'fox':
        white, pink = hexrgb('#f4f0f6'), hexrgb('#e7a3b8')
        # 머리 위 좌우에 세모 귀. 옆모습이면 뒤쪽 귀 하나
        ears = [xl + 3, xr - 3] if facing in (0, 1) else ([xr - 4] if facing == 2 else [xl + 4])
        inner = pink if facing == 0 else white
        for ex in ears:
            # 끝 1칸 → 3칸 → 5칸으로 벌어지는 세모. 밑변이 그 자리 머리끝에 붙는다. 안쪽은 분홍(앞모습)
            b = min(col_top(px, x, h) for x in range(ex - 1, ex + 2)) + 1
            put(px, w, h, ex, b - 4, OUTLINE)
            for dx in (-1, 1):
                put(px, w, h, ex + dx, b - 3, OUTLINE)
            put(px, w, h, ex, b - 3, white)
            for dx in (-2, 2):
                put(px, w, h, ex + dx, b - 2, OUTLINE)
            for dx in (-1, 0, 1):
                put(px, w, h, ex + dx, b - 2, inner if dx == 0 else white)
            for dx in (-2, -1, 0, 1, 2):
                if px[ex + dx, b - 1][3] == 0 or abs(dx) < 2:
                    put(px, w, h, ex + dx, b - 1, OUTLINE if abs(dx) == 2 else (inner if dx == 0 else white))
    elif kind == 'gat':
        gat(frame)
    elif kind == 'horns':
        ivory = hexrgb('#efe6d2')
        xs = [xl + 3, xr - 3] if facing in (0, 1) else ([xl + 5] if facing == 2 else [xr - 5])
        for hx in xs:
            b = col_top(px, hx, h)
            put(px, w, h, hx, b - 3, OUTLINE)
            for yy in (b - 2, b - 1):
                put(px, w, h, hx - 1, yy, OUTLINE)
                put(px, w, h, hx, yy, ivory)
                put(px, w, h, hx + 1, yy, OUTLINE)
    elif kind in ('dhorns', 'bighorns'):
        # 도깨비 뿔(흑운채). 머리끝 줄은 삐친 머리카락이나 둥근 정수리라 좁으니, 세 줄 아래 머리 폭으로 자리를 잡는다
        big = kind == 'bighorns'
        red, ivory = hexrgb('#c8323c'), hexrgb('#efe6d2')
        row = [x for x in range(w) if px[x, min(h - 1, y0 + 3)][3] > 0]
        hl, hr = (row[0], row[-1]) if row else (xl, xr)
        xs = [hl + 3, hr - 3] if facing in (0, 1) else ([hl + 5] if facing == 2 else [hr - 5])
        tall = 4 if big else 3
        for k, hx in enumerate(xs):
            # 앞뒤 모습에서는 끝을 바깥으로 한 칸 젖혀 토끼 귀처럼 보이지 않게 한다
            out = (-1 if k == 0 else 1) if len(xs) == 2 else 0
            b = col_top(px, hx, h)
            for i, yy in enumerate(range(b - tall - 1, b)):
                cx = hx + (out if i <= 1 else 0)
                if i == 0:
                    put(px, w, h, cx, yy, OUTLINE)
                    continue
                put(px, w, h, cx - 1, yy, OUTLINE)
                put(px, w, h, cx, yy, ivory if not big or i <= 2 else red)
                put(px, w, h, cx + 1, yy, OUTLINE)


def face_horns(img, kind):
    """대화창 얼굴(38×38)의 머리 위에 뿔. 배경색(왼쪽 위 칸)이 아닌 가장 위 줄을 머리끝으로 본다"""
    px = img.load()
    w, h = img.size
    bg = px[0, 0]
    top = next(y for y in range(h) if any(px[x, y] != bg for x in range(w)))
    xs = [x for x in range(w) if px[x, top + 2] != bg]
    xl, xr = xs[0], xs[-1]
    tall = 6 if kind == 'bighorns' else 4
    ivory, red = hexrgb('#efe6d2'), hexrgb('#c8323c')
    for hx in (xl + (xr - xl) // 4, xr - (xr - xl) // 4):
        b = next(y for y in range(h) if px[hx, y] != bg) + 1
        put(px, w, h, hx, b - tall - 1, OUTLINE)
        put(px, w, h, hx + 1, b - tall - 1, OUTLINE)
        for i, yy in enumerate(range(b - tall, b)):
            put(px, w, h, hx - 1, yy, OUTLINE)
            for dx in (0, 1):
                put(px, w, h, hx + dx, yy, ivory if kind == 'horns' or i < tall // 2 else red)
            put(px, w, h, hx + 2, yy, OUTLINE)


def derive_char(base_block, mapping, ov):
    """이미 만든 캐릭터 칸(64×100)을 한 칸(16×20)씩 색을 바꾸고 덧그린다"""
    block = Image.new('RGBA', base_block.size, (0, 0, 0, 0))
    for r in range(5):
        for d in range(4):
            fr = base_block.crop((d * T, r * CH, (d + 1) * T, (r + 1) * CH))
            recolor(fr, mapping)
            overlay(fr, ov, d)
            block.alpha_composite(fr, (d * T, r * CH))
    return block


def derive_face(base_face, mapping, ov):
    img = base_face.copy()
    recolor(img, mapping)
    if ov:
        face_horns(img, ov)
    return img


GAT_DARK = hexrgb('#2b2730')
GAT_LIGHT = hexrgb('#5a5560')
GAT_STRAP = hexrgb('#c9a24a')


def gat(frame):
    """페도라 → 갓: 챙(가장 넓은 줄) 위를 지우고, 얇고 넓은 챙 위에 좁고 높은 원통 몸통을 세운 뒤 갓끈을 늘어뜨린다"""
    px = frame.load()
    w, h = frame.size
    rows = [sum(1 for x in range(w) if px[x, y][3] > 0) for y in range(min(h, 14))]
    brim = max(range(len(rows)), key=lambda y: (rows[y], y))  # 가장 넓은 줄 중 아래(챙 몸통)
    xs = [x for x in range(w) if px[x, brim][3] > 0]
    cx = (xs[0] + xs[-1] + 1) // 2
    for y in range(brim):
        for x in range(w):
            px[x, y] = (0, 0, 0, 0)
    # 챙: 비치는 말총 느낌으로 밝은 한 줄 + 아래 외곽선(원본의 다음 줄)
    for x in range(xs[0] + 1, xs[-1]):
        px[x, brim] = (*GAT_LIGHT, 255)
    put(px, w, h, xs[0], brim, OUTLINE)
    put(px, w, h, xs[-1], brim, OUTLINE)
    # 몸통(대우): 너비 6, 높이 6, 윗모서리를 둥글게
    x0, x1 = cx - 3, cx + 2
    y0 = max(0, brim - 7)
    for x in range(x0 + 1, x1):
        put(px, w, h, x, y0, OUTLINE)
    for y in range(y0 + 1, brim):
        put(px, w, h, x0, y, OUTLINE)
        put(px, w, h, x1, y, OUTLINE)
        for x in range(x0 + 1, x1):
            put(px, w, h, x, y, GAT_LIGHT if (x == x0 + 1 or y == y0 + 1) else GAT_DARK)
    # 갓끈: 챙 양끝 안쪽에서 구슬 둘
    for sx in (xs[0] + 2, xs[-1] - 2):
        for y in (brim + 3, brim + 5):
            if px[sx, y][3] > 0:
                put(px, w, h, sx, y, GAT_STRAP)


def gat_face(img):
    """대화창 얼굴(38×38): 모자를 지우고 갓(얇고 넓은 챙 + 높은 원통 + 갓끈)을 그린다"""
    px = img.load()
    w, h = img.size
    bg = px[0, h // 2]
    shade = hexrgb('#8f3e56')
    # 얼굴 위 그림자 띠의 첫 줄 = 모자 밑
    under = next(y for y in range(h) if any(px[x, y][:3] == shade for x in range(w)))
    for y in range(under):
        for x in range(w):
            px[x, y] = bg
    cx = w // 2
    # 챙: 얇고 넓게
    by = under - 2
    for x in range(cx - 17, cx + 17):
        put(px, w, h, x, by, GAT_LIGHT)
        put(px, w, h, x, by + 1, OUTLINE if abs(x - cx + 0.5) > 15 else GAT_DARK)
    # 몸통: 너비 10, 위로 갈수록 살짝 좁아지고 윗모서리가 둥글다
    x0, x1 = cx - 5, cx + 4
    y0 = max(1, by - 10)
    for y in range(y0, by):
        inset = 1 if y < y0 + 3 else 0
        for x in range(x0 + inset, x1 + 1 - inset):
            if y == y0 and x in (x0 + inset, x1 - inset):
                continue
            edge = x in (x0 + inset, x1 - inset) or y == y0
            put(px, w, h, x, y, OUTLINE if edge else (GAT_LIGHT if x in (x0 + 1, x0 + 2) or y == y0 + 1 else GAT_DARK))
    # 갓끈: 챙 아래로 턱까지 늘어진 구슬 줄
    for sx in (cx - 9, cx + 8):
        for y in range(by + 3, min(h, by + 17), 2):
            put(px, w, h, sx, y, GAT_STRAP)


def load(src, rel):
    return Image.open(os.path.join(src, rel)).convert('RGBA')


class Packer:
    """가로 width 픽셀 안에 줄 단위로 쌓는다"""

    def __init__(self, width):
        self.width, self.x, self.y, self.row_h = width, 0, 0, 0
        self.items = []

    def add(self, name, img):
        if self.x + img.width > self.width:
            self.x, self.y, self.row_h = 0, self.y + self.row_h, 0
        self.items.append((name, img, self.x, self.y))
        self.x += img.width
        self.row_h = max(self.row_h, img.height)

    def image(self):
        h = self.y + self.row_h
        out = Image.new('RGBA', (self.width, h), (0, 0, 0, 0))
        for _, img, x, y in self.items:
            out.alpha_composite(img, (x, y))
        return out

    def rects(self):
        return {n: [x, y, img.width, img.height] for n, img, x, y in self.items}


def build(src):
    os.makedirs(OUT, exist_ok=True)
    atlas = {}

    tp = Packer(256)
    for name, (rel, cx, cy, cw, ch) in TILES.items():
        img = load(src, rel).crop((cx * T, cy * T, (cx + cw) * T, (cy + ch) * T))
        img = recolor(img, TILE_RECOLOR.get(name))
        tp.add(name, img)
    chest = load(src, 'Items/Treasure/LittleTreasureChest.png')
    tp.add('chest', chest.crop((0, 0, 16, 16)))
    tp.add('chest_open', chest.crop((16, 0, 32, 16)))
    for name, (rel, cx, cy, cw, ch, mapping) in EXTRA_TILES.items():
        tp.add(name, recolor(load(src, rel).crop((cx * T, cy * T, (cx + cw) * T, (cy + ch) * T)), mapping))
    tp.add('sotdae', sotdae())
    tp.image().save(os.path.join(OUT, 'tiles.png'))
    atlas['tiles'] = tp.rects()
    sync_deco_tsj(atlas['tiles'])

    cp = Packer(64 * 6)
    for cid, (folder, mapping, ov) in CHARS.items():
        sheet = load(src, f'Actor/Character/{folder}/SpriteSheet.png')
        rows = min(5, sheet.height // T)
        block = Image.new('RGBA', (64, 5 * CH), (0, 0, 0, 0))
        for r in range(5):
            # 걷기 줄이 적은 시트(OldWoman 등)는 있는 줄을 되풀이한다
            src_row = r if r < rows else r % rows
            for d in range(4):
                fr = Image.new('RGBA', (T, CH), (0, 0, 0, 0))
                fr.alpha_composite(sheet.crop((d * T, src_row * T, (d + 1) * T, (src_row + 1) * T)), (0, HEAD))
                recolor(fr, mapping)
                overlay(fr, ov, d)
                block.alpha_composite(fr, (d * T, r * CH))
        cp.add(cid, block)
    blocks = {n: img for n, img, _, _ in cp.items}
    for cid, (base, mapping, ov) in DERIVED.items():
        cp.add(cid, derive_char(blocks[base], mapping, ov))
    cp.image().save(os.path.join(OUT, 'chars.png'))
    atlas['chars'] = cp.rects()

    mp = Packer(64 * 6)
    for mid, rel in MONS.items():
        mp.add(mid, load(src, rel))
    for bid, rel in BOSS.items():
        mp.add(bid, load(src, rel))
    mp.image().save(os.path.join(OUT, 'mons.png'))
    atlas['mons'] = mp.rects()

    fp = Packer(38 * 8)
    for fid, rel in FACES.items():
        img = load(src, rel)
        if fid in FACE_RECOLOR:
            recolor(img, CHARS[FACE_RECOLOR[fid]][1])
        if fid == 'keeper':
            gat_face(img)
        fp.add(fid, img)
    faces = {n: img for n, img, _, _ in fp.items}
    for fid, (base, mapping, ov) in DERIVED_FACES.items():
        fp.add(fid, derive_face(faces[base], mapping, ov))
    fp.image().save(os.path.join(OUT, 'faces.png'))
    atlas['faces'] = fp.rects()

    xp = Packer(128)
    for xid, rel in FX.items():
        xp.add(xid, load(src, rel))
    xp.image().save(os.path.join(OUT, 'fx.png'))
    atlas['fx'] = xp.rects()

    write_atlas(atlas)
    return atlas


def write_atlas(atlas):
    with open(ATLAS_TS, 'w', encoding='utf-8') as f:
        f.write('// 자동 생성: scripts/proto-art.py. 손으로 고치지 않는다.\n')
        f.write('// 그림 좌표표 [x, y, 너비, 높이] (픽셀)\n')
        f.write('export type Rect = [number, number, number, number];\n\n')
        for key in ('tiles', 'chars', 'mons', 'faces', 'fx'):
            names = sorted(atlas[key])
            f.write(f'export const {key.upper()} = {{\n')
            for n in names:
                f.write(f"  {n}: {json.dumps(atlas[key][n])} as Rect,\n")
            f.write('} as const;\n\n')
        f.write('export type TileName = keyof typeof TILES;\n')
        f.write('export type CharName = keyof typeof CHARS;\n')
        f.write('export type MonName = keyof typeof MONS;\n')
        f.write('export type FaceName = keyof typeof FACES;\n')


DECO_TSJ = os.path.join(ROOT, 'src', 'proto', 'maps', 'deco.tsj')


def sync_deco_tsj(tiles):
    """Tiled 장식 타일셋(deco.tsj)을 tiles.png 크기에 맞추고, 소품 칸에 이름·solid·above를 적는다"""
    im = Image.open(os.path.join(OUT, 'tiles.png'))
    ts = json.load(open(DECO_TSJ, encoding='utf-8'))
    cols = im.width // T
    ts['imagewidth'], ts['imageheight'] = im.width, im.height
    ts['columns'], ts['tilecount'] = cols, cols * (im.height // T)
    have = {t['id']: t for t in ts['tiles']}
    for name, rows in EXTRA_PROPS.items():
        x, y, w, h = tiles[name]
        for r in range(h // T):
            for c in range(w // T):
                tid = (y // T + r) * cols + x // T + c
                kind = rows[min(r, len(rows) - 1)]
                have[tid] = {'id': tid, 'properties': [
                    {'name': 'name', 'type': 'string', 'value': name},
                    {'name': 'solid', 'type': 'bool', 'value': kind == 'solid'},
                    {'name': 'above', 'type': 'bool', 'value': kind == 'above'},
                ]}
    ts['tiles'] = [have[k] for k in sorted(have)]
    with open(DECO_TSJ, 'w', encoding='utf-8') as f:
        f.write(json.dumps(ts, ensure_ascii=False, indent=1) + '\n')


def read_atlas():
    """지금 atlas.ts를 읽어 {묶음: {이름: [x, y, w, h]}}로"""
    import re
    atlas, cur = {}, None
    for line in open(ATLAS_TS, encoding='utf-8'):
        m = re.match(r'export const (\w+) = \{', line)
        if m:
            cur = m.group(1).lower()
            atlas[cur] = {}
            continue
        m = re.match(r'\s+(\w+): (\[[^\]]+\]) as Rect,', line)
        if m and cur:
            atlas[cur][m.group(1)] = json.loads(m.group(2))
    return atlas


def derive_only():
    """원본 묶음 없이: 지금 chars.png·faces.png의 바탕 캐릭터에서 파생 캐릭터만 다시 만들어 붙인다.
    Packer와 같은 순서·자리에 놓으므로 원본 묶음으로 build한 결과와 같다"""
    atlas = read_atlas()
    for key, png, width, table in (('chars', 'chars.png', 64 * 6, DERIVED), ('faces', 'faces.png', 38 * 8, DERIVED_FACES)):
        sheet = Image.open(os.path.join(OUT, png)).convert('RGBA')
        rects = {n: r for n, r in atlas[key].items() if n not in table}
        pk = Packer(width)
        for n, (x, y, w, h) in sorted(rects.items(), key=lambda kv: (kv[1][1], kv[1][0])):
            pk.add(n, sheet.crop((x, y, x + w, y + h)))
        made = {n: img for n, img, _, _ in pk.items}
        for n, (base, mapping, ov) in table.items():
            pk.add(n, (derive_char if key == 'chars' else derive_face)(made[base], mapping, ov))
        pk.image().save(os.path.join(OUT, png))
        atlas[key] = pk.rects()
    write_atlas(atlas)


def preview(path):
    """사람이 볼 미리보기: 캐릭터 전부 ×4, 원본과 나란히"""
    chars = Image.open(os.path.join(OUT, 'chars.png'))
    faces = Image.open(os.path.join(OUT, 'faces.png'))
    tiles = Image.open(os.path.join(OUT, 'tiles.png'))
    s = 4
    w = max(chars.width, tiles.width, faces.width) * s
    h = (chars.height + faces.height + tiles.height) * s + 40
    out = Image.new('RGBA', (w, h), (110, 120, 110, 255))
    y = 0
    for im in (chars, faces, tiles):
        big = im.resize((im.width * s, im.height * s), Image.NEAREST)
        out.alpha_composite(big, (0, y))
        y += big.height + 20
    out.convert('RGB').save(path)


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)
    if args[0] == '--derive':
        derive_only()
    else:
        build(args[0])
    if '--preview' in args:
        preview(args[args.index('--preview') + 1])
    print('ok')
