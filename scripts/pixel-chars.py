"""32×32 도트 캐릭터 만들기(2026-11-02 결정: 타일 16px 그대로, 캐릭터는 32×32칸, 키 약 30px).

GPT(Codex)에 큼직한 도트로 네 방향 서 있는 그림을 그리게 한 뒤,
칸 경계를 찾아 한 칸에 한 색씩 뽑고 → 색을 정리하고 → 32×32칸에 맞추고 → 걷기·공격 칸을 붙인다.

쓰는 법:
  python3 scripts/pixel-chars.py gen <이름> [<이름> ...]   GPT로 원본을 그려 art/pixel/raw/<이름>.webp에 둔다(품질 92, 칸 중앙값만 쓰니 충분)
  python3 scripts/pixel-chars.py build                     art/pixel/raw의 원본으로 시트를 만든다
  python3 scripts/pixel-chars.py preview 미리보기.png       만든 시트를 크게 늘려 본다

결과:
  public/proto/chars32.png   캐릭터마다 128×160(열 = 아래·위·왼·오른, 줄 = 서기·걷기·서기·걷기·공격, 한 칸 32×32)
  src/proto/atlas32.ts       시트 좌표표(자동 생성)
"""
import os
import subprocess
import sys
import tempfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'art', 'pixel', 'raw')
OUT_PNG = os.path.join(ROOT, 'public', 'proto', 'chars32.png')
OUT_TS = os.path.join(ROOT, 'src', 'proto', 'atlas32.ts')
C = 32
# 원본에서 몸 높이를 이만큼 넘으면 비슷한 줄을 빼서 맞춘다
FIT = 31

# 이름 → (기준 그림들, 설명). 설명은 GPT에게 그대로 간다
CHARS = {
    'baekseol': (['art/ref/baekseol.webp', 'art/sd/baekseol.webp'],
                 'Baekseol, a nine-tailed fox spirit woman: silver-white long hair, white fox ears with pink inside, amber eyes, red flower hairpin with red tassel, white jeogori top, red sash, pale-blue skirt, red shoes, three big white tails with lavender shading.'),
    'me': (['art/sd/me.webp'],
           "the protagonist, a poor Joseon woodcutter man: a wide straw hat (satgat) pulled down so his eyes are hidden in shadow (only mouth and chin visible), worn beige hemp jeogori and baji, straw sandals, a wooden A-frame carrier (jige) on his back, a black goblin club with a red tassel at his waist. Plain brown and hemp colors."),
    'muyeong': (['art/ref/muyeong.webp', 'art/sd/muyeong.webp'],
                'Muyeong, a dokkaebi (Korean goblin) woman warrior: short thick black curly hair to the jaw, two small red horns, golden eyes, a plain black breastplate with a thin gold trim, a simple navy coat skirt, black boots, '
                'a short dark iron club held upright in one hand close to her body. KEEP IT SIMPLE: big flat color areas, very few gold accents, no tassels, no patterns; she must be no bigger than the reference character.'),
    'sodam': (['art/ref/sodam.webp', 'art/sd/sodam.webp'],
              'Sodam, a gentle snail-bride spirit woman: dark brown hair in one thick braid over her shoulder, green eyes, cream shell hair ornament, deep teal silk dress with white sheer sleeves and gold trim, a shell-shaped gold belt, holding a ledger book to her chest.'),
    'thug': (['art/sd/meoseum.webp'],
             'a rough Joseon village thug / servant man: topknot (sangtu) with a headband, rolled-up sleeves on a coarse cotton jeogori, brown-and-indigo clothes, a thick wooden cudgel on his shoulder, scowling face.'),
    'ajeon': (['art/sd/ajeon.webp'],
              'a Joseon government clerk (ajeon) man: black gat hat, blue official robe (dallyeong), small moustache, holding a scroll with both hands. Blue and ink-black colors.'),
    'worker': (['art/sd/villager.webp'],
               'a cheerful Joseon village woman in her forties: hair in a bun with a white headscarf, white jeogori with rolled sleeves, indigo skirt, a water gourd at her waist, chatty smiling face.'),
    'worker2': (['art/sd/fishmonger.webp'],
                'a timid Joseon laborer / fishmonger man in his forties: topknot with a headband, short cotton jeogori with an apron, holding a straw string with two fish, nervous face. Beige and grey-blue colors.'),
    'innkeeper': (['art/sd/innkeeper.webp'],
                  'an old Joseon tavern keeper man in his sixties: white beard, black tanggeon cap, faded grey durumagi coat, a wine bottle at his waist, sly smiling face.'),
    'keeper': ([],
               "a greedy Joseon storehouse keeper man working for a rich noble house: a black gat hat with a chin string, a mustard-brown durumagi coat, a big ring of keys at his belt, a pot belly, a sneering face."),
    'widow': ([],
              'a stout Joseon widow woman in her fifties: grey-streaked hair in a bun with a wooden binyeo pin, a faded purple jeogori and dark grey skirt, a white apron, hands on her hips, a sharp-tongued but kind face.'),
    'bandit': ([],
               "a Heugun-chae mountain bandit who is a dokkaebi (Korean goblin) man: two short horns on his head, wild black hair, red-brown skin, a black headband, a ragged black vest over bare arms, dark baggy trousers with leg wraps, a curved short sword. Black and dark red colors."),
    'bandit2': ([],
                "a big sturdy Heugun-chae mountain bandit who is a dokkaebi (Korean goblin) man: one thick horn on his forehead, bald head, grey-green skin, a fur shoulder cape, dark brown clothes with a rope belt, a heavy wooden shield and a club. Dark green and brown colors."),
    'chaeryeong': ([],
                   'Song Chaeryeong, a cool and elegant noble lady of thirty-two: jet-black hair in a low bun with a jade binyeo pin, narrow dark eyes, red lips, a deep purple silk dangui jacket with gold pattern, a navy long skirt, a folded fan in one hand.'),
    'yunseo': ([],
               'Yun Seogyeong, a cold royal inspector woman of thirty-five: black hair tucked under a black samo official hat, thin round gold-rimmed glasses, a navy dallyeong official robe with a gold phoenix rank badge on the chest, a black belt, holding a thick document folder.'),
    'pickpocket': ([],
                   'a Joseon market pickpocket thug: a tilted bamboo paerangi hat, a black cloth over his nose and mouth, ragged grey-brown clothes with leg wraps, a short knife in one hand.'),
    'mokso': ([],
              "the chief of the Heugun-chae mountain bandits, a huge dokkaebi (Korean goblin) man: two long curved black horns, a wild mane of grey hair, dark red skin, a scarred face with a fierce grin, black lamellar armor with a tiger-pelt cape, a giant iron goblin club. Black, dark red and gold colors."),
}

# 짐승·도깨비불: 사람보다 작게. 이름 → (기준 그림, 설명, 키, 너비)
CREATURES = {
    'racoon': ([], 'a mischievous Korean raccoon dog (neoguri) on four legs: brown-grey fur, a dark eye mask, a bushy striped tail, small round ears, sharp little teeth bared. A wild animal, not a person, no clothes.', 16, 22),
    'wisp': ([], 'a dokkaebi-bul (Korean goblin fire wisp): a floating teardrop-shaped blue-white flame with a pale cyan core, two small mischievous black eyes, a wispy tail of fire curling below. No body, no legs. The four poses differ only by which way the eyes and the flame tip lean.', 18, 16),
    'bat': ([], 'a cave bat with wings spread: dark purple-grey fur, leathery wings with a lighter membrane, big pointed ears, tiny red eyes and two small fangs. Seen from slightly above, flying.', 14, 24),
}
ALL = {**{n: (r, d, 24, 20) for n, (r, d) in CHARS.items()}, **CREATURES}

STYLE_REF = 'art/pixel/style-baekseol.png'
TEMPLATE = 'art/pixel/grid-template.png'


def make_template():
    p = os.path.join(ROOT, TEMPLATE)
    if os.path.exists(p):
        return
    im = Image.new('RGB', (1024, 1024), (255, 0, 255))
    d = ImageDraw.Draw(im)
    for i in range(0, 1025, 16):
        c = (235, 0, 235) if i % 512 else (120, 0, 120)
        d.line([(i, 0), (i, 1023)], fill=c)
        d.line([(0, i), (1023, i)], fill=c)
    im.save(p)


def prompt(name):
    refs, desc, tall, wide = ALL[name]
    creature = name in CREATURES
    lines = [
        'Use your built-in image generation tool to create exactly one image using the first attached image as the exact canvas template (1024x1024): '
        'a magenta canvas with a faint grid. Each small grid square is ONE game pixel (16x16 screen pixels). The dark lines split it into a 2x2 layout of cells, each 32x32 game pixels.',
        'The second attached image is a finished sprite of another character in our game: match its pixel size, chunky one-color-per-square pixels, dark plum 1-pixel outline, '
        'soft shading and chibi proportions (big head) EXACTLY. Do not draw that character.',
    ]
    for i, _ in enumerate(refs):
        lines.append(f'Attached image {i + 3}: the character to draw (identity reference only; simplify heavily for the tiny size).')
    lines += [
        f'Draw: {desc}',
        'Pixel art game sprite, 4 standing poses in the 2x2 layout: top-left facing DOWN toward the viewer, top-right facing LEFT, bottom-left facing RIGHT, bottom-right facing UP (back view). '
        'Top-down three-quarter JRPG field view.',
        f'The character must be exactly {tall} game pixels tall in each cell (fit within {tall} grid squares vertically and at most {wide} horizontally, including any weapon or prop), '
        + ('cute but a little menacing, eyes 1-2 pixels. ' if creature else 'big head about 11 pixels tall, eyes 2 pixels tall. ')
        + 'Every grid square is filled with exactly ONE flat color (never part of a square). '
        'Dark plum 1-pixel outline around the silhouette. Max 16 colors. No anti-aliasing, no gradients, no blur, no ground shadow.',
        'Remove the grid lines in the final image: the background must be flat solid pure magenta #FF00FF. No text, no borders.',
        'Save exactly one generated image as out.png in the current working directory. Do not write code or create other files.',
    ]
    return '\n\n'.join(lines)


def gen(name):
    os.makedirs(RAW, exist_ok=True)
    work = tempfile.mkdtemp(prefix=f'px-{name}-')
    refs = ALL[name][0]
    imgs = [TEMPLATE, STYLE_REF, *refs]
    args = [os.environ.get('CODEX_BIN', 'codex'), 'exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', work]
    for p in imgs:
        args += ['-i', os.path.join(ROOT, p)]
    args += ['--', prompt(name)]
    subprocess.run(args, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=900)
    out = os.path.join(work, 'out.png')
    if not os.path.exists(out):
        return f'{name}: 실패(그림 없음)'
    Image.open(out).convert('RGB').save(os.path.join(RAW, f'{name}.webp'), quality=92, method=4)
    return f'{name}: 완료'


# ── 원본 → 작은 도트 ──
def is_bg(c):
    return c[0] > 150 and c[2] > 150 and (c[0] + c[2]) / 2 - c[1] > 70


def pitch_of(a):
    """같은 색이 이어지는 길이 가운데 가장 흔한 것(1 제외) 근처를 칸 간격으로"""
    runs = Counter()
    for y in range(0, a.shape[0], 5):
        d = np.abs(np.diff(a[y], axis=0)).sum(1) > 60
        idx = np.flatnonzero(d)
        for l in np.diff(idx):
            if l > 4:
                runs[int(l)] += 1
    top = [l for l, _ in runs.most_common(4) if l < 30]
    w = sum(runs[l] for l in top)
    return sum(l * runs[l] for l in top) / w


def cuts(a, axis, p):
    L = a.shape[1 - axis] if axis == 0 else a.shape[1]
    L = a.shape[0] if axis == 0 else a.shape[1]
    d = np.abs(np.diff(a, axis=axis)).sum(2).sum(1 - axis).astype(float)
    pk = [i for i in range(1, len(d) - 1) if d[i] >= d[i - 1] and d[i] >= d[i + 1] and d[i] > d.mean() * 0.6]
    pk.sort(key=lambda i: -d[i])
    chosen = []
    for i in pk:
        if all(abs(i - j) >= p * 0.7 for j in chosen):
            chosen.append(i)
    b = [0] + [c + 1 for c in sorted(chosen)] + [L]
    out = [0]
    for x in b[1:]:
        gap = x - out[-1]
        if gap < p * 0.5:
            continue
        k = max(1, round(gap / p))
        base = out[-1]
        for t in range(1, k + 1):
            out.append(round(base + gap * t / k))
    return out


def sample(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    p = pitch_of(a)
    xs, ys = cuts(a, 1, p), cuts(a, 0, p)
    cols = np.zeros((len(ys) - 1, len(xs) - 1, 3))
    mask = np.zeros((len(ys) - 1, len(xs) - 1), bool)
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            y0, y1, x0, x1 = ys[j], ys[j + 1], xs[i], xs[i + 1]
            my, mx = max(1, (y1 - y0) // 4), max(1, (x1 - x0) // 4)
            c = np.median(a[y0 + my:y1 - my, x0 + mx:x1 - mx].reshape(-1, 3), 0)
            if not is_bg(c):
                cols[j, i] = c
                mask[j, i] = True
    return cols, mask


def palette(cols, mask, thr=42):
    """비슷한 색끼리 묶는다(작은 색도 2칸 이상이면 살린다)"""
    pts = cols[mask]
    cents, cnt = [], []
    for c in pts:
        for k, p in enumerate(cents):
            if np.abs(p / cnt[k] - c).sum() < thr:
                cents[k] = cents[k] + c
                cnt[k] += 1
                break
        else:
            cents.append(c.copy())
            cnt.append(1)
    pal = np.array([cents[k] / cnt[k] for k in range(len(cents)) if cnt[k] >= 2])
    return pal.round().astype(int)


def snap(cols, mask, pal):
    out = np.zeros((*mask.shape, 4), np.uint8)
    for j, i in zip(*np.nonzero(mask)):
        d = ((pal - cols[j, i]) ** 2 * [3, 4, 2]).sum(1)
        out[j, i] = [*pal[d.argmin()], 255]
    return out


def clean(a, outline):
    hh, ww = a.shape[:2]
    for _ in range(2):
        b = a.copy()
        for y in range(1, hh - 1):
            for x in range(1, ww - 1):
                if a[y, x, 3] == 0:
                    continue
                c = tuple(a[y, x])
                nb = [tuple(a[y + dy, x + dx]) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1))]
                if c in nb or tuple(c[:3]) == outline:
                    continue
                m, k = Counter(nb).most_common(1)[0]
                if k >= 3:
                    b[y, x] = m
        a = b
    op = a[..., 3] > 0
    pad = np.pad(op, 1)
    inner = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    a[op & ~inner] = (*outline, 255)
    return a


def squeeze(a, axis, target):
    """이웃과 가장 비슷한 줄(열)을 빼서 target에 맞춘다(머리카락·치마처럼 같은 줄이 이어진 곳이 빠진다)"""
    while a.shape[axis] > target:
        n = a.shape[axis]
        d = [np.abs(np.take(a, i, axis) - np.take(a, i + 1, axis)).sum() for i in range(n - 1)]
        lo = 2 if n > 8 else 0
        i = int(np.argmin(d[lo:n - 1 - lo])) + lo
        a = np.delete(a, i, axis)
    return a


def trim(a):
    ys = np.flatnonzero(a[..., 3].any(1))
    xs = np.flatnonzero(a[..., 3].any(0))
    return a[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]


def poses(path):
    """원본 → [아래, 위, 왼, 오른] 서 있는 그림(각각 잘라 낸 배열)"""
    cols, mask = sample(path)
    pal = palette(cols, mask)
    a = snap(cols, mask, pal)
    outline = tuple(int(v) for v in pal[pal.sum(1).argmin()])
    a = clean(a, outline)
    hh, ww = a.shape[:2]
    h, w = hh // 2, ww // 2
    quad = [a[:h, :w], a[:h, w:], a[h:, :w], a[h:, w:]]  # 아래, 왼, 오른, 위
    out = []
    for q in (quad[0], quad[3], quad[1], quad[2]):
        q = trim(q.astype(int))
        q = squeeze(q, 0, FIT)
        q = squeeze(q, 1, C)
        out.append(q.astype(np.uint8))
    return out, outline


def place(piece, dy=0):
    cell = np.zeros((C, C, 4), np.uint8)
    h, w = piece.shape[:2]
    x0 = (C - w) // 2
    y0 = C - h + dy
    ys, ye = max(0, y0), min(C, y0 + h)
    cell[ys:ye, x0:x0 + w] = piece[ys - y0:ye - y0]
    return cell


def step(piece, dir_, side, outline):
    """걷는 칸: 몸을 1px 들고, 한쪽 발은 바닥에 남긴다(앞·뒤 모습), 옆모습은 발을 앞뒤로 벌린다"""
    h, w = piece.shape[:2]
    up = place(piece, -1)
    base = place(piece, 0)
    x0 = (C - w) // 2
    cx = x0 + w // 2
    foot = slice(C - 2, C)
    if dir_ in (0, 1):
        # 디딘 발 쪽 바닥 두 줄은 원래 자리, 든 발 쪽 맨 아랫줄은 비운다
        keep = slice(cx, C) if side == 0 else slice(0, cx)
        lift = slice(0, cx) if side == 0 else slice(cx, C)
        up[foot, keep] = base[foot, keep]
        up[C - 1, lift] = 0
    else:
        # 옆모습: 맨 아래 세 줄을 앞뒤로 1px씩 벌린다
        rows = up[C - 3:C].copy()
        front = 1 if dir_ == 3 else -1
        sgn = front if side == 0 else -front
        moved = np.zeros_like(rows)
        left, right = rows[:, :cx], rows[:, cx:]
        if sgn > 0:
            moved[:, :cx - 1] = left[:, 1:]
            moved[:, cx + 1:] = right[:, :-1] if right.shape[1] > 1 else right
            moved[:, cx - 1:cx + 1] = rows[:, cx - 1:cx + 1]
        else:
            moved[:, 1:cx] = left[:, :-1]
            moved[:, cx:-1] = right[:, 1:]
        up[C - 3:C] = np.where(moved[..., 3:4] > 0, moved, up[C - 3:C] * (moved[..., 3:4] > 0))
    return up


def lunge(piece, dir_):
    """공격 칸: 보는 쪽으로 1px 내밀고 1px 숙인다"""
    cell = place(piece, 0)
    dx = {0: 0, 1: 0, 2: -1, 3: 1}[dir_]
    dy = {0: 1, 1: -1, 2: 0, 3: 0}[dir_]
    return np.roll(np.roll(cell, dx, 1), dy, 0)


def build():
    names = [n for n in ALL if os.path.exists(os.path.join(RAW, f'{n}.webp'))]
    per_row = 4
    rows = (len(names) + per_row - 1) // per_row
    sheet = np.zeros((rows * 5 * C, per_row * 4 * C, 4), np.uint8)
    atlas = {}
    for k, n in enumerate(names):
        pz, outline = poses(os.path.join(RAW, f'{n}.webp'))
        bx, by = (k % per_row) * 4 * C, (k // per_row) * 5 * C
        atlas[n] = (bx, by)
        for d, p in enumerate(pz):
            frames = [place(p), step(p, d, 0, outline), place(p), step(p, d, 1, outline), lunge(p, d)]
            for r, f in enumerate(frames):
                sheet[by + r * C:by + (r + 1) * C, bx + d * C:bx + (d + 1) * C] = f
        print(n, [p.shape[:2] for p in pz])
    Image.fromarray(sheet, 'RGBA').save(OUT_PNG, optimize=True)
    with open(OUT_TS, 'w') as f:
        f.write('// scripts/pixel-chars.py가 만든다. 손으로 고치지 않는다.\n')
        f.write('// 캐릭터마다 128×160: 열 = 아래·위·왼·오른, 줄 = 서기·걷기·서기·걷기·공격(한 칸 32×32)\n')
        f.write('export const CHAR_CELL = 32;\n\nexport const CHARS32 = {\n')
        for n in sorted(atlas):
            f.write(f'  {n}: [{atlas[n][0]}, {atlas[n][1]}] as [number, number],\n')
        f.write('} as const;\n\n/** 캐릭터(사람·짐승) 이름 */\nexport type CharName = keyof typeof CHARS32;\n')
    print('→', os.path.relpath(OUT_PNG, ROOT), os.path.relpath(OUT_TS, ROOT))


def preview(path):
    im = Image.open(OUT_PNG)
    bg = Image.new('RGBA', im.size, (60, 66, 52, 255))
    bg.alpha_composite(im)
    bg.resize((im.width * 4, im.height * 4), Image.NEAREST).save(path)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'gen':
        make_template()
        names = sys.argv[2:] or list(ALL)
        with ThreadPoolExecutor(int(os.environ.get('JOBS', '3'))) as ex:
            for r in ex.map(gen, names):
                print(r, flush=True)
    elif cmd == 'build':
        build()
    elif cmd == 'preview':
        preview(sys.argv[2])
    else:
        print(__doc__)
