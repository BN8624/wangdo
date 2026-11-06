# 1부 완성형 볼륨 3단계(2026-11-06)의 새 지도 넷을 만든다: 읍내(town)·송 대감 댁(manor)·흑운채 산채(camp)·뒷산 깊은 굴(deepcave).
# Tiled에서 손으로 고친 뒤에는 다시 돌리지 않는다(덮어쓴다).
#   python3 scripts/make-maps.py [id ...]
# 땅 글자: . 풀  : 흙길  _ 동굴 바닥  # 동굴 벽  (공백) 어둠  ~ 물  = 판자
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(f'{ROOT}/src/proto/atlas.ts').read()
sec = s[s.index('export const TILES'):s.index('} as const;', s.index('export const TILES'))]
R = {m.group(1): list(map(int, m.group(2, 3, 4, 5))) for m in re.finditer(r'(\w+): \[(\d+), (\d+), (\d+), (\d+)\]', sec)}
TERRAIN = {'.': 0, ':': 1, '_': 2, '#': 3, ' ': 4, '~': 5, '=': 6}


class Map:
    def __init__(self, id, name, w, h, fill='.', bgm='home', ambient='none', cave=False):
        self.id, self.name, self.W, self.H = id, name, w, h
        self.g = [[fill] * w for _ in range(h)]
        self.deco = {}
        self.objs = []
        self.props = [{"name": "name", "type": "string", "value": name}, {"name": "bgm", "type": "string", "value": bgm}, {"name": "ambient", "type": "string", "value": ambient}]
        if cave:
            self.props.append({"name": "cave", "type": "bool", "value": True})

    def rect(self, ch, x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.g[y][x] = ch

    def free(self, x, y, w=1, h=1):
        return all(0 <= x + dx < self.W and 0 <= y + dy < self.H and (x + dx, y + dy) not in self.deco for dx in range(w) for dy in range(h))

    def put(self, name, x, y, force=False):
        tx, ty, tw, th = R[name]
        cw, ch = tw // 16, th // 16
        if not force and not self.free(x, y, cw, ch):
            return False
        for r in range(ch):
            for c in range(cw):
                self.deco[(x + c, y + r)] = (ty // 16 + r) * 16 + tx // 16 + c
        return True

    def _o(self, o):
        self.objs.append({"id": len(self.objs) + 1, **o})

    def point(self, name, x, y):
        self._o({"name": name, "type": "point", "point": True, "x": x * 16 + 8, "y": y * 16 + 8, "width": 0, "height": 0, "rotation": 0, "visible": True})

    def actor(self, name, char, x, y, d, hidden=True, light=None):
        props = [{"name": "char", "type": "string", "value": char}, {"name": "dir", "type": "int", "value": d}]
        if hidden:
            props.append({"name": "hidden", "type": "bool", "value": True})
        if light:
            props.append({"name": "light", "type": "string", "value": light})
        self._o({"name": name, "type": "actor", "point": True, "x": x * 16 + 8, "y": y * 16 + 8, "width": 0, "height": 0, "rotation": 0, "visible": True, "properties": props})

    def chest(self, name, x, y, item=None, coin=None):
        props = []
        if item:
            props.append({"name": "item", "type": "string", "value": item})
        if coin:
            props.append({"name": "coin", "type": "int", "value": coin})
        self._o({"name": name, "type": "chest", "point": True, "x": x * 16 + 8, "y": y * 16 + 8, "width": 0, "height": 0, "rotation": 0, "visible": True, "properties": props})

    def light(self, name, x, y, kind='lamp', r=3.0):
        self._o({"name": name, "type": "light", "point": True, "x": x * 16 + 8, "y": y * 16 + 4, "width": 0, "height": 0, "rotation": 0, "visible": True,
                 "properties": [{"name": "kind", "type": "string", "value": kind}, {"name": "radius", "type": "float", "value": r}]})

    def smoke(self, name, x, y):
        self._o({"name": name, "type": "smoke", "point": True, "x": x * 16 + 8, "y": y * 16, "width": 0, "height": 0, "rotation": 0, "visible": True})

    def save(self):
        W, H = self.W, self.H
        tdata = [TERRAIN[self.g[y][x]] + 1 for y in range(H) for x in range(W)]
        ddata = [(self.deco[(x, y)] + 8 if (x, y) in self.deco else 0) for y in range(H) for x in range(W)]
        m = {"compressionlevel": -1, "height": H, "infinite": False, "layers": [
            {"data": tdata, "height": H, "id": 1, "name": "terrain", "opacity": 1, "type": "tilelayer", "visible": True, "width": W, "x": 0, "y": 0},
            {"data": ddata, "height": H, "id": 2, "name": "deco", "opacity": 1, "type": "tilelayer", "visible": True, "width": W, "x": 0, "y": 0},
            {"draworder": "topdown", "id": 3, "name": "objects", "objects": self.objs, "opacity": 1, "type": "objectgroup", "visible": True, "x": 0, "y": 0}],
            "nextlayerid": 4, "nextobjectid": len(self.objs) + 1, "orientation": "orthogonal", "properties": self.props,
            "renderorder": "right-down", "tiledversion": "1.11.2", "tileheight": 16,
            "tilesets": [{"firstgid": 1, "source": "terrain.tsj"}, {"firstgid": 8, "source": "deco.tsj"}],
            "tilewidth": 16, "type": "map", "version": "1.10", "width": W}
        txt = json.dumps(m, ensure_ascii=False, indent=1)
        rows = lambda arr: '[\n' + ',\n'.join('    ' + ', '.join(str(v) for v in arr[i * W:(i + 1) * W]) for i in range(H)) + '\n   ]'
        txt = re.sub(r'"data": \[[^\]]*\]', lambda mm, it=iter([tdata, ddata]): '"data": ' + rows(next(it)), txt)
        open(f'{ROOT}/src/proto/maps/{self.id}.tmj', 'w').write(txt + '\n')
        print(f'== {self.id} {W}x{H}')
        for y in range(H):
            print(''.join('D' if (x, y) in self.deco else self.g[y][x] for x in range(W)))


def wall(m, kind, x0, y0, x1, y1, gaps=()):
    """돌담·울타리 네모(gaps 칸은 비운다)"""
    for x in range(x0, x1 + 1):
        for y in (y0, y1):
            if (x, y) not in gaps:
                m.put(kind, x, y, force=True)
    for y in range(y0 + 1, y1):
        for x in (x0, x1):
            if (x, y) not in gaps:
                m.put(kind, x, y, force=True)


def edge_trees(m, spots, kinds=('tree_pine', 'tree_round')):
    for i, (x, y) in enumerate(spots):
        if all(m.g[y + dy][x + dx] == '.' for dx in (0, 1) for dy in (0, 1) if y + dy < m.H and x + dx < m.W):
            m.put(kinds[i % len(kinds)], x, y)


# ───────── 읍내: 위는 관아(돌담 안 동헌·형방·옥), 가운데는 장터 거리 ─────────
def town():
    m = Map('town', '달골 읍내', 26, 28, bgm='home', ambient='leaves')
    m.rect(':', 12, 9, 13, 27)           # 남북 큰길
    m.rect(':', 1, 16, 24, 17)           # 장터 거리
    m.rect(':', 7, 6, 18, 7)             # 관아 마당 길
    m.rect(':', 12, 2, 13, 8)
    wall(m, 'stonewall', 4, 0, 21, 9, gaps={(12, 9), (13, 9)})
    m.put('house_tile', 11, 1)            # 동헌
    m.put('house_tile', 5, 2)             # 형방
    m.put('house_a', 16, 2)               # 옥
    m.put('sotdae', 10, 6)
    m.put('jar', 19, 7); m.put('crate', 6, 7); m.put('sack', 7, 8)
    for x, kind in [(2, 'stall'), (7, 'stall'), (16, 'stall'), (21, 'stall')]:
        m.put(kind, x, 12)
    m.put('jumak', 3, 19); m.put('stall', 16, 19); m.put('house_thatch', 20, 20)
    for p in [(7, 15), (8, 15), (11, 15), (15, 15), (20, 15)]:
        m.put('crate' if p[0] % 2 else 'sack', *p)
    for p in [(10, 18), (14, 18), (8, 19)]:
        m.put('jar_red' if p[0] % 2 else 'jar', *p)
    m.put('clothesline', 7, 22); m.put('straw', 15, 23)
    edge_trees(m, [(0, 22), (0, 25), (3, 25), (7, 25), (16, 25), (20, 25), (23, 23), (24, 1), (0, 1), (0, 9), (23, 9), (0, 12)])
    m.put('sign', 14, 25)
    m.point('읍내 어귀', 12, 26); m.point('장터 거리', 12, 16); m.point('관아 문 앞', 12, 10); m.point('동헌 앞', 12, 5)
    m.point('형방 앞', 7, 6); m.point('옥 앞', 17, 6); m.point('주막 앞 거리', 5, 18); m.point('장터 끝', 21, 17)
    m.actor('hyeongbang', 'ajeon', 8, 6, 0); m.actor('pojol1', 'soldier', 11, 10, 0); m.actor('pojol2', 'soldier', 14, 10, 0)
    m.actor('prisoner', 'bandit', 18, 7, 0); m.actor('town_widow', 'widow', 10, 17, 3); m.actor('town_fish', 'worker2', 17, 17, 2)
    m.actor('rowdy1', 'thug', 19, 16, 2); m.actor('rowdy2', 'pickpocket', 20, 17, 2); m.actor('rowdy3', 'thug', 21, 16, 2)
    m.actor('town_ys', 'yunseo', 13, 11, 1)
    m.chest('town_chest', 22, 18, coin=60)
    m.light('동헌 등잔', 12, 4); m.light('주막 등잔', 4, 21); m.light('장터 등잔', 17, 15, 'lamp', 2.6)
    m.smoke('주막 굴뚝', 4, 19); m.smoke('초가 굴뚝', 21, 20)
    m.save()


# ───────── 송 대감 댁: 돌담 안 사랑채·안채·곳간·행랑, 연못가 별당. 밤에 들어간다 ─────────
def manor():
    m = Map('manor', '송 대감 댁', 26, 26, bgm='story', ambient='none')
    wall(m, 'stonewall', 1, 1, 24, 23, gaps={(12, 23), (13, 23), (24, 7)})
    m.rect(':', 12, 15, 13, 25)          # 솟을대문에서 마당
    m.rect(':', 4, 14, 21, 15)           # 행랑 마당
    m.rect(':', 6, 8, 7, 13)             # 사랑채 앞
    m.rect(':', 16, 7, 23, 7)            # 안채 뒤 → 뒷문
    m.rect(':', 15, 8, 16, 13)
    m.rect('~', 17, 10, 21, 12)          # 연못
    m.put('house_tile', 4, 4)            # 사랑채
    m.put('house_tile', 13, 3)           # 안채
    m.put('house_tile', 18, 3)           # 안채 건넌방
    m.put('house_thatch', 3, 17)         # 행랑(소담이 살던 곳)
    m.put('house_b', 17, 17)             # 행랑
    m.put('house_a', 3, 10)              # 곳간
    for p in [(9, 5), (10, 9), (22, 13), (16, 14)]:
        m.put('jar' if p[0] % 2 else 'jar_red', *p)
    m.put('sotdae', 21, 9)
    for p in [(9, 18), (10, 19)]:
        m.put('straw', *p)
    m.put('clothesline', 7, 20)
    edge_trees(m, [(2, 2), (9, 2), (22, 2), (22, 14), (2, 20), (20, 20), (10, 11)], ('tree_round', 'tree_pine'))
    for p in [(16, 12), (22, 10), (17, 13)]:
        m.put('reeds', *p)
    m.point('솟을대문', 12, 24); m.point('행랑 마당', 12, 16); m.point('소담의 옛 방', 5, 16); m.point('곳간 앞', 6, 13)
    m.point('사랑채 앞', 6, 8); m.point('연못가', 15, 11); m.point('안채 뒤', 18, 7); m.point('뒷문', 23, 7)
    m.actor('mguard1', 'soldier', 10, 15, 3, light='torch'); m.actor('mguard2', 'soldier', 15, 14, 2, light='torch')
    m.actor('mguard3', 'soldier', 7, 12, 0, light='torch'); m.actor('mguard4', 'soldier', 17, 8, 2, light='torch')
    m.actor('butler', 'keeper', 7, 9, 0, light='torch'); m.actor('m_chae', 'chaeryeong', 22, 7, 2)
    m.actor('m_song', 'songdaegam', 6, 7, 0)
    m.chest('manor_chest', 5, 14, item='silkband')
    m.light('사랑채 등잔', 6, 7); m.light('안채 등잔', 15, 6); m.light('대문 등잔', 12, 22, 'lamp', 2.6); m.light('연못 등잔', 16, 9, 'lamp', 2.4)
    m.save()


# ───────── 흑운채 산채: 목책 안 움막들, 큰 마루, 무영 어머니의 대장간 ─────────
def camp():
    m = Map('camp', '흑운채 산채', 26, 26, bgm='home', ambient='leaves')
    wall(m, 'fence', 2, 3, 23, 22, gaps={(12, 22), (13, 22)})
    m.rect(':', 12, 15, 13, 25)          # 목책 문에서
    m.rect(':', 5, 13, 20, 15)           # 산채 마당
    m.rect(':', 12, 8, 13, 12)
    m.rect(':', 6, 10, 9, 12)            # 대장간 앞
    m.put('house_tile', 11, 4)           # 큰 마루
    m.put('house_a', 4, 6)               # 무영 어머니의 대장간
    m.put('house_thatch', 17, 6)
    m.put('house_b', 17, 16); m.put('house_thatch', 4, 17)
    for p in [(9, 8), (10, 8)]:
        m.put('rock', *p)
    m.put('stump', 8, 9)
    for p in [(15, 11), (16, 11), (20, 12)]:
        m.put('crate', *p)
    for p in [(14, 18), (10, 17)]:
        m.put('sack', *p)
    m.put('sotdae', 21, 13)
    m.put('laundry', 9, 19)
    edge_trees(m, [(0, 0), (4, 0), (8, 0), (16, 0), (20, 0), (24, 0), (0, 4), (0, 8), (0, 12), (0, 16), (0, 20), (24, 4), (24, 8), (24, 12), (24, 16), (24, 20), (3, 23), (7, 23), (17, 23), (21, 23)], ('tree_pine', 'tree_dead', 'tree_pine'))
    for p in [(19, 9), (6, 20), (20, 19)]:
        m.put('boulder', *p)
    m.point('목책 문', 12, 24); m.point('산채 마당', 12, 14); m.point('큰 마루 앞', 12, 8); m.point('대장간', 7, 11)
    m.point('아이들 움막', 18, 14); m.point('망루 아래', 19, 11)
    m.actor('c_meok', 'meoksoe', 13, 8, 0); m.actor('c_cheol', 'cheolgom', 16, 13, 2)
    m.actor('c_kid1', 'bandit', 18, 15, 0); m.actor('c_kid2', 'bandit2', 20, 15, 0)
    m.actor('raid1', 'bandit', 11, 20, 1, light='torch'); m.actor('raid2', 'bandit', 14, 20, 1, light='torch'); m.actor('raid3', 'pickpocket', 13, 21, 1, light='torch')
    m.actor('raid_boss', 'bandit2', 12, 19, 1, light='torch')
    m.chest('camp_chest', 21, 18, item='tigervest')
    m.light('대장간 불', 6, 9, 'torch', 3.0); m.light('큰 마루 등잔', 12, 7); m.light('망루 횃불', 19, 10, 'torch', 2.8)
    m.smoke('대장간 굴뚝', 6, 6); m.smoke('움막 굴뚝', 18, 6)
    m.save()


# ───────── 뒷산 깊은 굴: 방망이가 묻혀 있던 늙은 소나무 밑. 갈림길·박쥐 방·샘·옛 사당 ─────────
def deepcave():
    m = Map('deepcave', '뒷산 깊은 굴', 22, 32, fill=' ', bgm='battle', ambient='dust', cave=True)

    def room(x0, y0, x1, y1):
        m.rect('#', x0 - 1, y0 - 1, x1 + 1, y1 + 1)
        m.rect('_', x0, y0, x1, y1)

    def carve(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.g[y][x] = '_'
        for y in range(y0 - 1, y1 + 2):
            for x in range(x0 - 1, x1 + 2):
                if 0 <= x < m.W and 0 <= y < m.H and m.g[y][x] == ' ':
                    m.g[y][x] = '#'

    # 방을 먼저 파고(벽 포함), 길은 나중에 뚫는다(벽을 넘어 이어지게)
    room(8, 26, 13, 30)        # 입구
    room(6, 17, 15, 20)        # 갈림길
    room(1, 8, 7, 12)          # 박쥐 방
    room(14, 8, 20, 12)        # 샘
    room(5, 1, 16, 5)          # 옛 사당
    carve(10, 21, 11, 25)      # 입구 → 갈림길
    carve(4, 13, 5, 16)        # 갈림길 → 박쥐 방
    carve(4, 16, 7, 16)
    carve(16, 13, 17, 16)      # 갈림길 → 샘
    carve(14, 16, 17, 16)
    carve(10, 6, 11, 16)       # 갈림길 → 옛 사당
    m.rect('~', 16, 9, 18, 10)  # 샘
    m.put('sotdae', 10, 1, force=True)
    for p in [(6, 2), (15, 2)]:
        m.put('boulder', *p)
    for p in [(8, 4), (13, 4)]:
        m.put('stone', *p)
    for p in [(2, 9), (6, 11), (19, 11), (14, 9), (7, 18), (14, 19), (9, 28), (12, 29)]:
        m.put('rock' if p[0] % 2 else 'rock2', *p)
    m.point('굴 입구', 10, 29); m.point('갈림길', 10, 18); m.point('박쥐 방', 4, 10); m.point('샘', 15, 11)
    m.point('옛 사당 앞', 10, 6); m.point('옛 사당', 10, 4)
    m.actor('dc_bat1', 'bat', 3, 9, 3); m.actor('dc_bat2', 'bat', 5, 11, 3); m.actor('dc_wisp1', 'wisp', 17, 11, 2)
    m.actor('dc_wisp2', 'wisp', 11, 9, 0); m.actor('dc_guard', 'wisp', 11, 4, 0)
    m.chest('dc_chest1', 2, 11, item='norigae'); m.chest('dc_chest2', 19, 9, coin=80); m.chest('dc_chest3', 14, 3, item='mituri')
    m.light('사당 촛불', 10, 2, 'lamp', 3.4); m.light('샘 빛', 17, 10, 'wisp', 2.4)
    m.save()


ALL = {'town': town, 'manor': manor, 'camp': camp, 'deepcave': deepcave}
for k in (sys.argv[1:] or ALL):
    ALL[k]()
