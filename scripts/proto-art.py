"""시제품 그림 만들기: Ninja Adventure(CC0) 원본에서 쓸 것만 골라 조선풍으로 고치고 한 장씩 묶는다.

쓰는 법:
  python3 scripts/proto-art.py "<Ninja Adventure - Asset Pack 폴더>" [--preview 미리보기.png]

결과:
  public/proto/tiles.png   타일·도장(집·나무 등)
  public/proto/chars.png   걷는 캐릭터(칸마다 64×100: 아래·위·왼·오른 × 걷기 4 + 공격 1, 한 칸 16×20)
  public/proto/mons.png    몬스터(칸마다 64×64)와 대장(50×50 × 5)
  public/proto/faces.png   대화창 얼굴(38×38)
  public/proto/fx.png      타격 효과(32×32 × 4)
  src/proto/atlas.ts       위 그림의 좌표표(자동 생성, 손으로 고치지 않는다)

원본 위에 덧그린 것(여우귀·뿔·상투 등)은 이 파일의 OVERLAY에 칸 단위로 적는다.
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
    'keeper': ('Noble', {}, None),
    'thug': ('Monk2', {}, None),
    'innkeeper': ('OldMan', {}, None),
    'widow': ('OldWoman', {}, None),
    'worker': ('Villager4', {'#f6c25c': '#3b3643', '#d9a13a': '#2a2630'}, None),
    'worker2': ('Hunter', {}, None),
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
}
FACE_RECOLOR = {'baekseol': 'baekseol', 'muyeong': 'muyeong', 'worker': 'worker'}

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
    tp.image().save(os.path.join(OUT, 'tiles.png'))
    atlas['tiles'] = tp.rects()

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
        fp.add(fid, img)
    fp.image().save(os.path.join(OUT, 'faces.png'))
    atlas['faces'] = fp.rects()

    xp = Packer(128)
    for xid, rel in FX.items():
        xp.add(xid, load(src, rel))
    xp.image().save(os.path.join(OUT, 'fx.png'))
    atlas['fx'] = xp.rects()

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
    return atlas


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
    build(args[0])
    if '--preview' in args:
        preview(args[args.index('--preview') + 1])
    print('ok')
