"""All sprite definitions. Each function returns a 32x32 Sprite."""
import random
from core import Sprite, check_rows

# =====================================================================
# Hand-drawn originals, rebuilt from the exact Aseprite strokes
# =====================================================================

def house(roof='red'):
    s = Sprite()
    s.rect(4, 28, 28, 28, 'K')                       # ground shadow
    s.rect(3, 3, 28, 17, 'O'); s.rect(4, 17, 27, 27, 'O')
    s.rect(4, 4, 27, 8, 'b')                         # back slope
    s.rect(4, 9, 27, 9, 'P')                         # ridge highlight
    s.rect(4, 10, 27, 16, 'R')                       # front slope
    s.rect(5, 18, 26, 26, 't')                       # wall
    for y in (18, 22, 26):
        s.rect(5, y, 26, y, 'B')                     # eave shadow, plank, base
    for y in (12, 15):
        s.rect(4, y, 27, y, 'b')                     # shingle rows
    s.rect(4, 6, 27, 6, 'O')                         # back slope shingle row
    s.rect(7, 20, 10, 23, 'O'); s.rect(21, 20, 24, 23, 'O')   # window frames
    s.rect(20, 1, 24, 8, 'O')                        # chimney outline
    s.rect(21, 2, 23, 7, 'S'); s.rect(21, 2, 23, 2, 'd'); s.set(22, 2, 'K')
    s.rect(14, 27, 17, 27, 'd')                      # door step
    s.rect(14, 20, 17, 26, 'b'); s.rect(15, 21, 16, 26, 'B'); s.set(16, 23, 'y')
    s.rect(8, 21, 9, 22, 'C'); s.rect(22, 21, 23, 22, 'C')
    s.set(8, 21, 'p'); s.set(22, 21, 'p')
    s.rect(7, 24, 10, 24, 'G'); s.rect(21, 24, 24, 24, 'G')
    for x in (8, 10, 22, 24):
        s.set(x, 24, 'P')
    roofs = {
        'red': {},
        'blue': {'P': 'c', 'R': 'U', 'b': 'n'},
        'green': {'P': 'L', 'R': 'T', 'b': 'g'},
    }
    if roof == 'red':
        return s
    # recolour roof region only (rows 3..17) so the door/boots keep their browns
    m = roofs[roof]
    for y in range(3, 18):
        for x in range(s.w):
            v = s.px[y][x]
            if v in m and not (20 <= x <= 24 and y <= 8):
                s.px[y][x] = m[v]
    return s


GRASS_DARK_V = [(3, 4), (14, 2), (24, 6), (8, 12), (19, 14), (28, 17), (4, 22), (13, 25), (23, 26), (27, 29)]
GRASS_DARK_DOT = [(20, 3), (11, 18), (30, 9), (1, 29)]
GRASS_LIGHT_V = [(9, 6), (26, 11), (1, 15), (16, 20), (25, 21), (7, 28), (17, 8)]
GRASS_LIGHT_DOT = [(6, 9), (21, 10), (29, 24), (12, 30), (20, 30), (2, 1)]


def _v(s, x, y, c):
    s.set(x, y, c); s.set(x + 1, y + 1, c); s.set(x + 2, y, c)


def grass():
    s = Sprite()
    s.rect(0, 0, 31, 31, 'G')
    for x, y in GRASS_DARK_V: _v(s, x, y, 'g')
    for x, y in GRASS_DARK_DOT: s.set(x, y, 'g')
    for x, y in GRASS_LIGHT_V: _v(s, x, y, 'L')
    for x, y in GRASS_LIGHT_DOT: s.set(x, y, 'L')
    return s


def kid():
    s = Sprite()
    s.rect(10, 27, 21, 27, 'K'); s.rect(11, 28, 20, 28, 'K')
    s.rect(11, 6, 20, 17, 'O'); s.rect(10, 7, 21, 16, 'O')
    s.rect(11, 17, 20, 24, 'O'); s.rect(12, 24, 19, 27, 'O')
    s.set(16, 5, 'O'); s.set(17, 4, 'O')
    s.rect(12, 7, 19, 16, 'B'); s.rect(11, 8, 20, 15, 'B')
    s.rect(12, 11, 19, 16, 'k')
    for x in (12, 15, 16, 19): s.set(x, 11, 'B')
    s.rect(13, 8, 15, 8, 't'); s.set(12, 9, 't')
    s.rect(13, 13, 14, 14, 'K'); s.rect(17, 13, 18, 14, 'K')
    s.set(13, 13, 'W'); s.set(17, 13, 'W')
    s.set(12, 15, 'P'); s.set(19, 15, 'P'); s.set(15, 15, 'b')
    s.rect(12, 18, 19, 22, 'U')
    s.rect(12, 18, 12, 21, 'n'); s.rect(19, 18, 19, 21, 'n')
    s.rect(12, 23, 19, 23, 'n')
    s.rect(13, 24, 14, 25, 'n'); s.rect(17, 24, 18, 25, 'n')
    s.rect(14, 19, 15, 20, 'c'); s.rect(14, 18, 17, 18, 'p')
    s.set(12, 22, 'k'); s.set(19, 22, 'k')
    s.rect(13, 26, 14, 26, 'b'); s.rect(17, 26, 18, 26, 'b')
    return s


def walk_frame(base, side):
    """Lift one leg by a pixel and bob the body; side='L' or 'R'."""
    s = base.copy()
    x0, x1 = (12, 15) if side == 'L' else (16, 19)
    for x in range(x0, x1 + 1):
        for y in range(24, 28):
            s.px[y - 1][x] = base.px[y][x] if y > 24 else s.px[y - 1][x]
        s.px[27][x] = 'K'                       # shadow shows under lifted foot
    # bob: shift head+torso up 1px on the opposite side's stride
    out = s.copy()
    for y in range(4, 24):
        for x in range(9, 23):
            out.px[y - 1][x] = s.px[y][x]
    for x in range(9, 23):
        if out.px[23][x] is not None and base.px[24][x] is None:
            out.px[23][x] = None
    return out


def villager(kind):
    s = kid()
    if kind == 'baker':     # white shirt + apron, ginger hair, tall hat
        s = s.remap({'U': 'W', 'c': 'W', 'p': 's', 'B': 'r', 't': 'y', 'n': 'S'})
        s.rect(11, 2, 20, 6, 'O'); s.rect(12, 3, 19, 6, 'W'); s.rect(12, 6, 19, 6, 's')
        s.rect(14, 3, 15, 4, 'p')
        s.rect(13, 19, 18, 23, 'k'); s.rect(13, 23, 18, 23, 't')   # apron
        s.set(16, 5, 'W'); s.set(17, 4, None)
    elif kind == 'elder':   # grey hair, green tunic, beard
        s = s.remap({'U': 'T', 'c': 'L', 'p': 'k', 'B': 's', 't': 'W', 'n': 'g'})
        s.rect(13, 16, 18, 16, 's'); s.rect(14, 17, 17, 17, 's'); s.set(15, 15, 's')
        s.set(16, 5, None); s.set(17, 4, None)
    elif kind == 'girl':    # blonde braids, red dress
        s = s.remap({'U': 'R', 'c': 'P', 'p': 'W', 'B': 'y', 't': 'W', 'n': 'b'})
        s.px = [[('t' if v == 'y' and y >= 13 else v) for x, v in enumerate(row)] for y, row in enumerate(s.px)]
        for y in (16, 17, 18): s.set(10, y, 'y'); s.set(21, y, 'y')
        s.set(10, 19, 'P'); s.set(21, 19, 'P')
        for y in (16, 17, 18, 19, 20): s.set(9, y, 'O'); s.set(22, y, 'O')
        s.set(10, 20, 'O'); s.set(21, 20, 'O')
        s.rect(12, 23, 19, 23, 'R'); s.rect(13, 24, 14, 24, 'k'); s.rect(17, 24, 18, 24, 'k')
        s.set(16, 5, None); s.set(17, 4, None)
    return s


# =====================================================================
# Terrain tiles (all seamless)
# =====================================================================

def grass_flowers():
    s = grass()
    for (x, y, c) in [(5, 16, 'W'), (21, 23, 'W'), (12, 5, 'P'), (27, 2, 'y'), (15, 29, 'P'), (29, 13, 'W')]:
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            s.set(x + dx, y + dy, c)
        s.set(x, y, 'y' if c != 'y' else 'r')
    return s


def dirt():
    s = Sprite(); s.rect(0, 0, 31, 31, 't')
    rnd = random.Random(7)
    for _ in range(26):
        x, y = rnd.randrange(32), rnd.randrange(32)
        s.set(x, y, 'B')
    for x, y in [(4, 6), (19, 3), (27, 15), (9, 21), (22, 26), (14, 13), (2, 28)]:
        s.set(x, y, 'k'); s.set(x + 1, y, 'k'); s.set(x, y + 1, 'B'); s.set(x + 1, y + 1, 'B')
    return s


def cobble():
    s = Sprite(); s.rect(0, 0, 31, 31, 'e')
    rnd = random.Random(3)
    for row in range(4):
        y0 = row * 8
        off = 0 if row % 2 == 0 else 4
        for col in range(4):
            x0 = col * 8 + off
            base = rnd.choice(['s', 's', 'S'])
            for y in range(y0, y0 + 7):
                for x in range(x0, x0 + 7):
                    cx, cy = x - x0, y - y0
                    if (cx in (0, 6)) and (cy in (0, 6)):
                        continue                       # rounded corners
                    c = base
                    if cy == 6 or cx == 6: c = 'S' if base == 's' else 'd'
                    if (cy == 0 and 0 < cx < 5) or (cx == 0 and 0 < cy < 4):
                        c = 'p' if base == 's' else 's'
                    s.set(x % 32, y % 32, c)
    return s


def wood_floor():
    s = Sprite(); s.rect(0, 0, 31, 31, 'B')
    joints = [5, 21, 13, 29]
    for p in range(4):
        y0 = p * 8
        s.rect(0, y0, 31, y0, 't')                      # top highlight of plank
        s.rect(0, y0 + 7, 31, y0 + 7, 'b')              # seam
        for gx in range(0, 32, 9):
            s.set((gx + p * 3) % 32, y0 + 3, 'b'); s.set((gx + p * 3 + 1) % 32, y0 + 3, 'b')
        j = joints[p]
        for y in range(y0, y0 + 7):
            s.set(j, y, 'b')
        s.set((j + 1) % 32, y0, 'B')
        s.set((j + 3) % 32, y0 + 5, 'H')
    return s


def water():
    s = Sprite(); s.rect(0, 0, 31, 31, 'u')
    for x, y in [(3, 4), (18, 2), (11, 12), (25, 10), (5, 21), (20, 19), (13, 27), (27, 26)]:
        for i in range(4):
            s.set(x + i, y + (0 if i in (1, 2) else 1), 'c')
    for x, y in [(8, 7), (23, 15), (15, 22), (2, 13), (29, 30)]:
        s.set(x, y, 'p')
    for x, y in [(14, 6), (6, 16), (24, 23), (30, 5)]:
        s.set(x, y, 'U'); s.set(x + 1, y, 'U')
    return s


def farmland():
    s = Sprite(); s.rect(0, 0, 31, 31, 'B')
    for y0 in range(0, 32, 8):
        s.rect(0, y0, 31, y0 + 1, 'b')                  # furrow
        s.rect(0, y0 + 2, 31, y0 + 2, 'H')
        s.rect(0, y0 + 5, 31, y0 + 5, 't')              # ridge highlight
    rnd = random.Random(11)
    for _ in range(14):
        x, y = rnd.randrange(32), rnd.randrange(32)
        if s.get(x, y) == 'B': s.set(x, y, 'b')
    return s


def wheat_crop():
    s = farmland()
    for y0 in range(0, 32, 8):
        for x0 in range(2, 32, 6):
            x = (x0 + (y0 // 8) * 3) % 32
            for dy in range(5):
                s.set(x, y0 + 4 - dy, 'h' if dy < 2 else 'H')
            s.set(x, y0 - 1, 'y'); s.set(x, y0 - 2, 't'); s.set(x - 1, y0 - 1, 't'); s.set(x + 1, y0 - 2, 'y')
    return s


# =====================================================================
# Town props
# =====================================================================

def ground_shadow(s, y):
    """Buildings: light is overhead like every other prop, so the shadow sits straight under the
    footprint — two rows as wide as the footing (bottom 4 rows), then a row tapered by 3px each side."""
    row = [x for yy in range(max(0, y - 4), y) for x in range(s.w) if s.px[yy][x] is not None]   # footing, not the step
    x0, x1 = min(row) - 1, max(row) + 1
    for dy, inset in ((0, 0), (1, 0), (2, 3)):
        for x in range(x0 + inset, x1 - inset + 1):
            if 0 <= x < s.w and y + dy < s.h and s.px[y + dy][x] is None: s.px[y + dy][x] = 'K'
    return s


def _with_shadow(s, cx, cy, rx, ry):
    sh = Sprite(); sh.ellipse(cx, cy, rx, ry, 'K')
    for y in range(32):
        for x in range(32):
            if s.px[y][x] is None and sh.px[y][x]:
                s.px[y][x] = 'K'
    return s


def _foliage(s, clumps, dark='g', mid='G', light='L'):
    for cx, cy, r in clumps: s.ellipse(cx, cy, r, r, dark)
    for cx, cy, r in clumps: s.ellipse(cx - 1, cy - 1, r - 1.2, r - 1.2, mid)
    for cx, cy, r in clumps:
        if r >= 3: s.ellipse(cx - 2, cy - 2, max(1.0, r - 3.2), max(1.0, r - 3.2), light)


def tree():
    s = Sprite()
    s.rect(14, 18, 18, 27, 'B'); s.rect(17, 18, 18, 27, 'b'); s.rect(15, 20, 15, 25, 't')
    s.set(13, 27, 'B'); s.set(19, 27, 'b')
    _foliage(s, [(16, 12, 8), (9, 15, 5), (23, 15, 5), (12, 7, 5), (20, 7, 5), (16, 17, 5)])
    for x, y in [(11, 11), (21, 12), (15, 15), (18, 8)]:
        s.set(x, y, 'g')
    s.outline()
    return _with_shadow(s, 16, 28, 9, 2.2)


def bush():
    s = Sprite()
    _foliage(s, [(16, 21, 6), (11, 23, 4), (21, 23, 4), (16, 18, 4)])
    for x, y in [(12, 21), (19, 20), (16, 24), (22, 24), (14, 18)]:
        s.set(x, y, 'P'); s.set(x, y - 1, 'W')
    s.outline()
    return _with_shadow(s, 16, 28, 9, 1.8)


def barrel():
    s = Sprite()
    x0, y0, w = 10, 12, 12
    s.rect(x0 + 1, y0, x0 + w - 2, y0, 'b')
    s.set(x0, y0 + 1, 'b'); s.rect(x0 + 1, y0 + 1, x0 + w - 2, y0 + 1, 'B'); s.set(x0 + w - 1, y0 + 1, 'b')
    for i in range(1, w - 1, 3): s.set(x0 + i, y0 + 1, 't')
    s.rect(x0, y0 + 2, x0 + w - 1, y0 + 2, 'b')
    stave = ['t', 'k', 't', 'B', 't', 't', 'B', 't', 't', 'B', 'b', 'b']
    band = ['s', 'W', 's', 'S', 's', 's', 'S', 's', 's', 'S', 'e', 'e']
    for j in range(3, 15):
        row = band if j in (4, 11) else stave
        for i in range(w):
            s.set(x0 + i, y0 + j, row[i])
    s.rect(x0 + 1, y0 + 15, x0 + w - 2, y0 + 15, 'b')
    s.outline()
    return _with_shadow(s, 16, 28, 8, 1.6)


def crate():
    s = Sprite()
    x0, x1 = 9, 22
    s.rect(x0, 11, x1, 15, 't')                         # top face
    for y in (12, 14): s.rect(x0 + 1, y, x1 - 1, y, 'k')
    s.rect(x0, 11, x1, 11, 'B'); s.rect(x0, 15, x1, 15, 'B')
    s.rect(x0, 16, x1, 27, 'B')                         # front face
    s.rect(x0, 16, x1, 16, 'b'); s.rect(x0, 27, x1, 27, 'b')
    s.rect(x0, 16, x0 + 1, 27, 'b'); s.rect(x1 - 1, 16, x1, 27, 'b')
    for y in (20, 23): s.rect(x0 + 2, y, x1 - 2, y, 'b')
    for i in range(10):                                 # diagonal brace
        s.set(x0 + 2 + i, 26 - i, 't'); s.set(x0 + 3 + i, 26 - i, 't')
    s.outline()
    return _with_shadow(s, 16, 28, 9, 1.4)


def _fence_rails(s, x0, x1):
    for y in (17, 23):
        s.rect(x0, y, x1, y + 1, 'B'); s.rect(x0, y, x1, y, 't'); s.rect(x0, y + 2, x1, y + 2, 'b')


def _fence_post(s, px):
    s.rect(px, 14, px + 3, 27, 'B'); s.rect(px, 14, px, 27, 't'); s.rect(px + 3, 14, px + 3, 27, 'b')
    s.rect(px + 1, 13, px + 2, 13, 'B')


def _fence(rails, posts):
    s = Sprite()
    _fence_rails(s, *rails)
    for px in posts: _fence_post(s, px)
    s.outline()
    for px in posts: s.rect(px, 28, px + 3, 28, 'K')
    return s


def fence():
    """A run of fence, west to east. Its rails run off both edges so runs join seamlessly."""
    return _fence((0, 31), (4, 20))


def fence_end_l():
    """The west end of a run, and a pen's west corners: an end post with rails going east."""
    return _fence((14, 31), (14,))


def fence_end_r():
    """The east end of a run, and a pen's east corners: rails coming from the west into an end post."""
    return _fence((0, 17), (14,))


def fence_v():
    """A north-south run, seen from above: the rails show edge-on as one bar down the middle (in line
    with the end posts' x), with a post partway down. Segments stack every 32px; the rails run off
    both edges so segments, and the corners' end posts, join on."""
    s = Sprite()
    s.rect(14, 0, 16, 31, 'B'); s.rect(14, 0, 14, 31, 't'); s.rect(16, 0, 16, 31, 'b')
    _fence_post(s, 14)
    s.outline()
    for x in (13, 17):                                          # the post's shadow, either side of the rails
        if s.px[28][x] is None: s.px[28][x] = 'K'
    return s


def lamppost():
    s = Sprite()
    s.rect(14, 24, 18, 27, 'e'); s.rect(14, 24, 18, 24, 'S')
    s.rect(15, 11, 17, 23, 'e'); s.rect(15, 11, 15, 23, 'S')
    s.rect(12, 4, 20, 11, 'e')
    s.rect(13, 5, 19, 10, 'y'); s.rect(15, 6, 17, 9, 'W'); s.rect(13, 10, 19, 10, 'r')
    s.rect(16, 4, 16, 10, 'e')
    s.rect(13, 2, 19, 3, 'd'); s.rect(15, 1, 17, 1, 'd'); s.set(16, 0, 'd')
    s.outline()
    return _with_shadow(s, 16, 28, 5, 1.2)


def well():
    s = Sprite()
    s.rect(6, 4, 7, 19, 'B'); s.rect(24, 4, 25, 19, 'B'); s.rect(7, 4, 7, 19, 'b'); s.rect(25, 4, 25, 19, 'b')
    for i in range(6):                                  # little roof
        s.rect(4 + i, 5 - i if 5 - i >= 0 else 0, 27 - i, 5 - i if 5 - i >= 0 else 0, 'R')
    s.rect(4, 5, 27, 6, 'R'); s.rect(4, 6, 27, 6, 'b'); s.rect(9, 1, 22, 1, 'P')
    s.rect(9, 8, 22, 8, 'b'); s.rect(15, 9, 15, 15, 'S'); s.rect(14, 15, 16, 17, 'B')  # crank + bucket
    s.ellipse(16, 19, 11, 4.2, 's')                     # stone rim
    s.ellipse(16, 19, 8, 2.4, 'u'); s.rect(12, 19, 14, 19, 'c')
    s.rect(5, 20, 27, 27, 'S')
    for row, y in enumerate(range(20, 28, 3)):
        s.rect(5, y + 2, 27, y + 2, 'e')
        for x in range(5 + (row % 2) * 3, 28, 6):
            s.set(x, y, 'e'); s.set(x, y + 1, 'e')
        s.rect(5, y, 27, y, 's') if y == 20 else None
    s.outline()
    return _with_shadow(s, 16, 28, 12, 1.5)


def signpost():
    s = Sprite()
    s.rect(15, 14, 17, 27, 'B'); s.rect(17, 14, 17, 27, 'b')
    s.rect(7, 7, 24, 14, 't'); s.rect(7, 7, 24, 7, 'k'); s.rect(7, 14, 24, 14, 'B')
    s.set(25, 10, 't'); s.set(25, 11, 't'); s.set(26, 10, 't'); s.set(26, 11, 'B')  # arrow tip
    for y, (a, b) in zip((9, 11, 12), ((9, 20), (9, 17), (19, 22))):
        if y != 12: s.rect(a, y, b, y, 'b')
    s.rect(9, 12, 15, 12, 'b')
    s.outline()
    return _with_shadow(s, 16, 28, 4, 1.2)


def market_stall():
    s = Sprite()
    s.rect(5, 6, 26, 11, 'W')
    for x in range(5, 27, 4): s.rect(x, 6, x + 1, 11, 'R')
    s.rect(5, 11, 26, 11, 'b')
    for x in range(5, 27, 2): s.set(x, 12, 'R' if (x // 2) % 2 else 'W')
    s.rect(6, 12, 7, 27, 'B'); s.rect(24, 12, 25, 27, 'B')
    s.rect(4, 19, 27, 20, 't'); s.rect(4, 21, 27, 26, 'B'); s.rect(4, 21, 27, 21, 'b')
    for x in range(6, 26, 4): s.rect(x, 22, x, 26, 'b')
    for x, c in [(7, 'R'), (9, 'G'), (11, 'y'), (14, 'r'), (17, 'P'), (20, 'G'), (23, 'y')]:
        s.rect(x, 17, x + 1, 18, c); s.set(x, 17, 'W')
    s.outline()
    return _with_shadow(s, 16, 28, 12, 1.5)


# =====================================================================
# Food — raw ingredients
# =====================================================================

EGG = check_rows('egg', [
    "....OOOO....",
    "...OWWkkO...",
    "..OWWkkkkO..",
    "..OWkkkkkO..",
    ".OWkkkkkkkO.",
    ".OWkkkkkkkO.",
    ".OkkkkkkktO.",
    ".OkkkkkkktO.",
    ".OkkkkkkttO.",
    ".OkkkkkkttO.",
    "..OkkkkttO..",
    "..OttttttO..",
    "...OOOOOO...",
])

WHEAT = check_rows('wheat', [
    "......OO......",
    ".....OyyO.....",
    ".OO..OytO..OO.",
    "OyyO.OyyO.OyyO",
    "OytO.OytO.OytO",
    "OyyO.OyyO.OyyO",
    "OytO.OytO.OytO",
    "OyyO.OyyO.OyyO",
    "OytO.OytO.OytO",
    ".OHO.OHHO.OHO.",
    "..OHOOHHOOHO..",
    "...OHOHHOHO...",
    "....OHHHHO....",
    "...ORRRRRRO...",
    "...ORPPPPRO...",
    "....OHHHHO....",
    "...OHOHHOHO...",
    "..OHO.OO.OHO..",
    "..OO......OO..",
])

BEEF = check_rows('beef', [
    "....OOOOOOOO......",
    "..OOkkkkkkkkOO....",
    ".OkkRRRRRRRRkkO...",
    ".OkRRPRRRRRRRRkO..",
    "OkRRRRRRRPRRRRRtO.",
    "OkRRRPRRRRRRRRRtO.",
    "OkRRRRRRRWWRRPRtO.",
    "OkRRRRRRWsWRRRRtO.",
    "OkRRPRRRRWWRRRRtO.",
    ".OkRRRRRRRRRPRRtO.",
    ".OkkRRRRRRRRRRttO.",
    "..OOttttttttttOO..",
    "....OOOOOOOOOO....",
])

FISH = check_rows('fish', [
    "......OOOOOO........",
    "....OOuuuuuuOO......",
    "...OuuuuuuuuuuO...OO",
    "..OcWccccccccccO.OuO",
    ".OccKcccccccccccOcuO",
    "OPcccPPPPPPPcccccccO",
    ".OppppppcccccccccOcO",
    "..OpppppppppppppO.OO",
    "...OOppppppppOO.....",
    ".....OOOOOOOO.......",
])

MILK = check_rows('milk', [
    "....OOOO....",
    "....OssO....",
    "....OOOO....",
    "...OWWWpO...",
    "..OWWWWWpO..",
    ".OWWWWWWWpO.",
    ".OWWWWWWWpO.",
    ".OUUUUUUUnO.",
    ".OUWUUUUUnO.",
    ".OUUUUUUUnO.",
    ".OWWWWWWWpO.",
    ".OWWWWWWWpO.",
    ".OpWWWWWppO.",
    "..OOOOOOOO..",
])

# =====================================================================
# Food — processed
# =====================================================================

FLOUR = check_rows('flour', [
    "......OOOO......",
    ".....OWWWWO.....",
    "....OkWWWkkO....",
    ".....ObbbbO.....",
    "....OkkkkkkO....",
    "...OkkkkkkkkO...",
    "..OkkkkkkkkktO..",
    ".OkkkkkkkkkkktO.",
    ".OkkkkkHkkkkktO.",
    ".OkkkkHyHkkkktO.",
    ".OkkkkkHkkkkktO.",
    ".OkkkkkkkkkkttO.",
    ".OtkkkkkkkkkttO.",
    "..OttttttttttO..",
    "...OOOOOOOOOO...",
])

DOUGH = check_rows('dough', [
    "....OOOOOOOO....",
    "..OOkWWWkkkkOO..",
    ".OkWWkkkkkkkktO.",
    ".OkkkkkkkkkkttO.",
    "OttttttttttttttO",
    "OBBBBBBBBBBBBBbO",
    ".OBBBBBBBBBBBbO.",
    "..ObBBBBBBBBbO..",
    "...OObbbbbbOO...",
    ".....OOOOOO.....",
])

BREAD = check_rows('bread', [
    "....OOOOOOOOOO....",
    "..OOtttttttttttO..",
    ".OtttkttttkttttrO.",
    ".OttkttttkttttkrO.",
    "OtttttttttttttrrrO",
    "OrttttttttttttrrrO",
    "OrrtttttttttrrrrBO",
    "OBrrrrrrrrrrrrrBBO",
    ".OBBrrrrrrrrrBBBO.",
    "..OOBBBBBBBBBBOO..",
    "....OOOOOOOOOO....",
])

WHISKED = check_rows('whisked_egg', [
    ".............OO...",
    "............OsO...",
    "...........OsO....",
    "..OOOOOOOOOsOOOOO.",
    ".OyyWyyyyysyyyyyO.",
    "OyyWyyyyyOsOyyWyyO",
    "OyyyyyyyOsWsOyyyyO",
    "OyyyyyyyOsWsOyyyyO",
    "OUUUUUUUUOsOUUUUUO",
    "OcUUUUUUUUUUUUUUnO",
    ".OcUUUUUUUUUUUUnO.",
    "..OcUUUUUUUUUUnO..",
    "...OOnnnnnnnnOO...",
    ".....OOOOOOOO.....",
])

FRIED_EGG = check_rows('fried_egg', [
    "....OOOOO.........",
    "..OOWWWWWOOOO.....",
    ".OWWWWWWWWWWWOO...",
    ".OWWWWWWWWWWWWWO..",
    "OWWWWWrrrrWWWWWWO.",
    "OWWWWryWyyrWWWWWO.",
    "OWWWryWyyyrrWWWWpO",
    "OWWWryyyyyrrWWWWpO",
    "OWWWryyyyrrrWWWpO.",
    ".OWWWrrrrrrWWWWpO.",
    ".OpWWWWWWWWWWWpO..",
    "..OppWWWWWWWppO...",
    "...OOOppppppOO....",
    "......OOOOOO......",
])

SCRAMBLED = check_rows('scrambled_eggs', [
    "......OOOOOOOO......",
    "....OOkyyyykyyOO....",
    "...OkyyyHyyyykyyO...",
    ".OOyyGyyyyHyyyyyyOO.",
    "OWWOHyykyyyyyHyyOWWO",
    "OWsWOHHyyyHHyyyOWsWO",
    "OpWWWOOOOOOOOOOWWWpO",
    ".OppWWWWWWWWWWWWppO.",
    "..OOppppppppppppOO..",
    "....OOOOOOOOOOOO....",
])

TOAST = check_rows('toast', [
    "...OOOOOOOO...",
    ".OOBBBBBBBBOO.",
    "OBBttttttttBBO",
    "OBttkttttttrBO",
    "OBtktyyytttrBO",
    ".OBttykyttrBO.",
    ".OBtttyytrrBO.",
    ".OBtttttrrrBO.",
    ".OBttttrrrrBO.",
    ".OBtttrrrrrBO.",
    ".OBBBBBBBBBBO.",
    "..OOOOOOOOOO..",
])


def _item(rows, oy=None):
    s = Sprite(); s.stamp(rows, oy=oy); return s


def _grill_marks(s, body, mark='b', step=4):
    for y in range(s.h):
        for x in range(s.w):
            if s.px[y][x] in body and (x + y) % step == 0:
                s.px[y][x] = mark
    return s


def grilled_fish():
    s = _item(FISH).remap({'u': 'B', 'c': 't', 'p': 'k', 'P': 'r'})
    _grill_marks(s, {'t'})
    # lemon wedge garnish
    for x, y, c in [(22, 18, 'O'), (23, 18, 'O'), (24, 18, 'O'), (21, 19, 'O'), (22, 19, 'y'), (23, 19, 'y'),
                    (24, 19, 'W'), (25, 19, 'O'), (21, 20, 'O'), (22, 20, 'y'), (23, 20, 'y'), (24, 20, 'O'),
                    (22, 21, 'O'), (23, 21, 'O')]:
        s.set(x, y, c)
    return s


def steak():
    s = _item(BEEF).remap({'R': 'B', 'P': 'r', 'k': 't', 't': 'H'})
    _grill_marks(s, {'B'}, step=4)
    s.set(14, 10, 'G'); s.set(15, 9, 'G'); s.set(15, 10, 'L')   # herb sprig
    return s


FOOD = [
    # name, builder, kind, made_from, method
    ('egg', lambda: _item(EGG), 'raw', [], None),
    ('wheat', lambda: _item(WHEAT), 'raw', [], None),
    ('beef', lambda: _item(BEEF), 'raw', [], None),
    ('fish', lambda: _item(FISH), 'raw', [], None),
    ('milk', lambda: _item(MILK), 'raw', [], None),
    ('flour', lambda: _item(FLOUR), 'processed', ['wheat'], 'grind'),
    ('bread_dough', lambda: _item(DOUGH), 'processed', ['flour', 'milk'], 'mix'),
    ('bread_loaf', lambda: _item(BREAD), 'processed', ['bread_dough'], 'bake'),
    ('toast', lambda: _item(TOAST), 'processed', ['bread_loaf'], 'grill'),
    ('whisked_egg', lambda: _item(WHISKED), 'processed', ['egg'], 'mix'),
    ('fried_egg', lambda: _item(FRIED_EGG), 'processed', ['egg'], 'fry'),
    ('scrambled_eggs', lambda: _item(SCRAMBLED), 'processed', ['whisked_egg'], 'fry'),
    ('grilled_fish', grilled_fish, 'processed', ['fish'], 'grill'),
    ('steak', steak, 'processed', ['beef'], 'grill'),
]

TILES = [
    ('grass', grass), ('grass_flowers', grass_flowers), ('dirt_path', dirt), ('cobblestone', cobble),
    ('wood_floor', wood_floor), ('water', water), ('farmland', farmland), ('wheat_crop', wheat_crop),
]

PROPS = [
    ('house_red', lambda: house('red')), ('house_blue', lambda: house('blue')), ('house_green', lambda: house('green')),
    ('tree', tree), ('bush', bush), ('barrel', barrel), ('crate', crate), ('fence', fence), ('fence_end_l', fence_end_l), ('fence_end_r', fence_end_r), ('fence_v', fence_v),
    ('lamppost', lamppost), ('well', well), ('signpost', signpost), ('market_stall', market_stall),
]


def _chars():
    k = kid()
    return [
        ('kid_idle', lambda: k), ('kid_walk_1', lambda: walk_frame(k, 'L')), ('kid_walk_2', lambda: walk_frame(k, 'R')),
        ('baker', lambda: villager('baker')), ('elder', lambda: villager('elder')), ('girl', lambda: villager('girl')),
    ]


CHARS = _chars()
