"""Batch 2: corner autotiles, the Hearthwick Inn, kitchen stations and dining furniture."""
import math, random
from core import Sprite
from sprites import grass, dirt, water, _with_shadow

# =====================================================================
# Base-texture variants
#   Every variant keeps a plain 1px border, so any variant sits next to any
#   other without a seam. Variant 0 is the original tile.
# =====================================================================

def grass_v(v):
    if v == 0:
        return grass()
    rnd = random.Random(100 + v)
    s = Sprite(); s.rect(0, 0, 31, 31, 'G')
    for c, n in (('g', 10), ('L', 7)):
        for _ in range(n):
            x, y = rnd.randint(1, 28), rnd.randint(1, 29)
            s.set(x, y, c); s.set(x + 1, y + 1, c); s.set(x + 2, y, c)
    for c, n in (('g', 4), ('L', 6)):
        for _ in range(n):
            s.set(rnd.randint(1, 30), rnd.randint(1, 30), c)
    return s


def dirt_v(v):
    if v == 0:
        return dirt()
    rnd = random.Random(200 + v)
    s = Sprite(); s.rect(0, 0, 31, 31, 't')
    for _ in range(26):
        s.set(rnd.randint(1, 30), rnd.randint(1, 30), 'B')
    for _ in range(6):
        x, y = rnd.randint(1, 29), rnd.randint(1, 29)
        s.set(x, y, 'k'); s.set(x + 1, y, 'k'); s.set(x, y + 1, 'B'); s.set(x + 1, y + 1, 'B')
    return s


def water_v(v):
    if v == 0:
        return water()
    rnd = random.Random(300 + v)
    s = Sprite(); s.rect(0, 0, 31, 31, 'u')
    for _ in range(8):
        x, y = rnd.randint(1, 27), rnd.randint(1, 29)
        for i in range(4):
            s.set(x + i, y + (0 if i in (1, 2) else 1), 'c')
    for _ in range(5):
        s.set(rnd.randint(1, 30), rnd.randint(1, 30), 'p')
    for _ in range(4):
        x, y = rnd.randint(1, 29), rnd.randint(1, 30)
        s.set(x, y, 'U'); s.set(x + 1, y, 'U')
    return s


BASES = {'grass': grass_v, 'dirt': dirt_v, 'water': water_v}
VARIANTS = 3

# =====================================================================
# Corner (Wang) autotiles
#   index = TL*1 + TR*2 + BL*4 + BR*8  (bit set = the "other" terrain)
#   Tile 0 = all grass, tile 15 = all other terrain.
#   Edges depend only on the two corners they join (the wobble fades to zero
#   at every border), so any tiles whose shared corners agree line up exactly,
#   whichever variant each one is.
# =====================================================================

def _noise_field(seed=5, n=3):
    rnd = random.Random(seed)
    g = [[rnd.uniform(-1, 1) for _ in range(n + 1)] for _ in range(n + 1)]

    def f(u, v):
        x, y = u * n, v * n
        i, j = min(max(int(x), 0), n - 1), min(max(int(y), 0), n - 1)
        fx, fy = min(max(x - i, 0), 1), min(max(y - j, 0), 1)
        sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        a = g[j][i] + (g[j][i + 1] - g[j][i]) * sx
        b = g[j + 1][i] + (g[j + 1][i + 1] - g[j + 1][i]) * sx
        return a + (b - a) * sy
    return f


NOISES = [_noise_field(5), _noise_field(17), _noise_field(41)]
NOISE = NOISES[0]


def corner_value(idx, x, y, variant=0, amp=0.34):
    tl, tr, bl, br = (idx >> 0) & 1, (idx >> 1) & 1, (idx >> 2) & 1, (idx >> 3) & 1
    u, v = (x + 0.5) / 32, (y + 0.5) / 32
    base = tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v
    if 0 <= x < 32 and 0 <= y < 32:
        base += amp * NOISES[variant](u, v) * math.sin(math.pi * u) * math.sin(math.pi * v)
    return base


def _mask(idx, x, y, variant=0):
    return 1 if corner_value(idx, x, y, variant) > 0.5 else 0


def terrain_mask(maskfn):
    """32x32 0/1 mask from maskfn, despeckled (interior pixels only: border pixels stay formula-exact so tiles keep matching)."""
    m = [[maskfn(x, y) for x in range(32)] for y in range(32)]
    for _ in range(2):
        n = [row[:] for row in m]
        for y in range(1, 31):
            for x in range(1, 31):
                diff = sum(m[y + dy][x + dx] != m[y][x] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                if diff >= 3:
                    n[y][x] = 1 - m[y][x]
        m = n
    return m


def corner_mask(idx, variant=0, amp=0.34):
    """Corner-autotile shape. amp = how much the edge wobbles (0.34 natural ground; small for laid paving)."""
    return terrain_mask(lambda x, y: 1 if corner_value(idx, x, y, variant, amp) > 0.5 else 0)


def render_terrain(maskfn, other, variant=0):
    """maskfn(x, y) -> 0 grass / 1 other, defined for any x,y (outside = neighbour estimate)."""
    g = grass_v(variant)
    o = BASES[other](variant)
    s = Sprite()
    m = terrain_mask(maskfn)

    def M(x, y):
        return m[y][x] if 0 <= x < 32 and 0 <= y < 32 else maskfn(x, y)

    for y in range(32):
        for x in range(32):
            here = M(x, y)
            s.px[y][x] = o.px[y][x] if here else g.px[y][x]
            up, down = M(x, y - 1), M(x, y + 1)
            side = M(x - 1, y) != here or M(x + 1, y) != here
            if other == 'dirt':
                if here and up == 0:
                    s.px[y][x] = 'B'                       # lip shadow under the grass edge
                elif not here and (down or side):
                    s.px[y][x] = 'g'                       # darker grass fringe
            else:  # water: grass bank + foam
                if not here and down:
                    s.px[y][x] = 'b'                       # earth bank face
                elif not here and M(x, y + 2):
                    s.px[y][x] = 'B'
                elif here and up == 0:
                    s.px[y][x] = 'p'                       # foam line
                elif here and (side or M(x, y - 2) == 0):
                    s.px[y][x] = 'c'                       # shallows
    return s


def autotile(idx, other, variant=0):
    return render_terrain(lambda x, y: _mask(idx, x, y, variant), other, variant)


# AUTOTILES[pair][variant][index]
AUTOTILES = {
    'grass_dirt': [[autotile(i, 'dirt', v) for i in range(16)] for v in range(VARIANTS)],
    'grass_water': [[autotile(i, 'water', v) for i in range(16)] for v in range(VARIANTS)],
}

# =====================================================================
# The Hearthwick Inn (64x64)
# =====================================================================

def inn():
    s = Sprite(64, 64)
    # --- roof (thatch) ---------------------------------------------
    s.rect(4, 8, 59, 30, 'H')
    s.rect(4, 8, 59, 14, 'o')                                # back slope (in shade)
    for x in range(4, 60, 3): s.set(x, 10, 'H'); s.set(x + 1, 12, 'H')
    s.rect(4, 15, 59, 15, 'k')                               # ridge
    for li, (y0, y1) in enumerate(((16, 20), (21, 25), (26, 30))):   # three thatch layers
        s.rect(4, y0, 59, y0, 't')
        s.rect(4, y1, 59, y1, 'b')
        rnd = random.Random(20 + li)
        for x in range(4, 60):
            r = rnd.random()
            if r < 0.38:                                     # straw strokes
                for y in range(y1 - 1 - rnd.randint(1, 3), y1):
                    s.set(x, y, 'o')
            elif r < 0.58:
                for y in range(y0 + 1, y0 + 1 + rnd.randint(1, 2)):
                    s.set(x, y, 't')
            if x % 2 == 0:
                s.set(x, y1 - 1, 'b')                        # scalloped layer edge
    s.rect(4, 30, 59, 30, 'b')                               # eave edge
    # dormer
    s.rect(26, 17, 37, 27, 'k'); s.rect(26, 17, 37, 17, 'b'); s.rect(26, 17, 26, 27, 'b'); s.rect(37, 17, 37, 27, 'b')
    for i in range(7): s.rect(25 + i, 16 - i, 38 - i, 16 - i, 'R')
    s.rect(25, 16, 38, 16, 'b')
    s.rect(29, 20, 34, 25, 'b'); s.rect(30, 21, 33, 24, 'y'); s.rect(31, 21, 32, 24, 'r'); s.set(30, 21, 'W')
    # chimney + smoke
    s.rect(47, 1, 53, 14, 'S'); s.rect(47, 1, 53, 1, 'd'); s.rect(52, 2, 53, 14, 'd')
    for y in range(3, 14, 3):
        s.rect(47, y, 53, y, 'e')
        s.set(49 if (y // 3) % 2 else 51, y + 1, 'e')
    s.rect(49, 0, 51, 0, 'K')
    # --- upper storey: plaster + timber frame ----------------------
    s.rect(6, 31, 57, 43, 'k')
    s.rect(6, 31, 57, 31, 'B')                               # eave shadow
    for x in (6, 16, 26, 37, 47, 57):
        s.rect(x, 31, x + (1 if x < 57 else 0), 43, 'b')
    s.rect(6, 43, 57, 43, 'b')
    for x0 in (8, 49):                                       # diagonal braces
        for i in range(7): s.set(x0 + i, 42 - i, 'b'); s.set(x0 + i + 1, 42 - i, 'b')
    for wx in (19, 29, 40):                                  # upstairs windows
        s.rect(wx, 34, wx + 5, 40, 'b'); s.rect(wx + 1, 35, wx + 4, 39, 'y')
        s.rect(wx + 1, 37, wx + 4, 37, 'b'); s.rect(wx + 3, 35, wx + 3, 39, 'b'); s.set(wx + 1, 35, 'W')
        s.rect(wx, 41, wx + 5, 41, 'G'); s.set(wx + 1, 41, 'P'); s.set(wx + 4, 41, 'm')
    # --- ground floor: stone + wood -------------------------------
    s.rect(6, 44, 57, 58, 't')
    s.rect(6, 44, 57, 44, 'B')
    for y in range(47, 58, 3): s.rect(6, y, 57, y, 'B')
    s.rect(6, 54, 57, 58, 'S')                               # stone footing
    for y in (54, 57):
        s.rect(6, y, 57, y, 'e')
    for x in range(8, 58, 5): s.set(x, 55, 'e'); s.set(x + 2, 56, 'e')
    s.rect(6, 54, 57, 54, 's')
    # big front windows (warm glow)
    for wx in (10, 42):
        s.rect(wx, 46, wx + 11, 53, 'b'); s.rect(wx + 1, 47, wx + 10, 52, 'y')
        s.rect(wx + 1, 50, wx + 10, 52, 'r'); s.rect(wx + 1, 49, wx + 10, 49, 'b')
        s.rect(wx + 4, 47, wx + 4, 52, 'b'); s.rect(wx + 7, 47, wx + 7, 52, 'b')
        s.set(wx + 2, 47, 'W'); s.set(wx + 3, 47, 'W')
        s.rect(wx, 54, wx + 11, 54, 'B')                     # sill
    # arched double door
    s.rect(26, 47, 37, 58, 'b'); s.rect(28, 45, 35, 46, 'b')
    s.rect(27, 48, 31, 58, 'B'); s.rect(32, 48, 36, 58, 'B'); s.rect(29, 46, 34, 47, 'B')
    s.rect(31, 47, 32, 58, 'b')
    for y in (50, 55): s.rect(27, y, 36, y, 'b')
    s.set(30, 53, 'y'); s.set(33, 53, 'y')
    s.rect(28, 59, 35, 59, 'd'); s.rect(29, 60, 34, 60, 'S')  # step
    # lanterns either side of the door
    for lx in (23, 39):
        s.rect(lx, 47, lx + 1, 49, 'y'); s.set(lx, 46, 'e'); s.set(lx + 1, 46, 'e'); s.set(lx, 50, 'e'); s.set(lx + 1, 50, 'e')
    # hanging sign: bracket + board with a tiny hearth flame
    s.rect(57, 44, 62, 44, 'e'); s.set(58, 45, 'e'); s.set(61, 45, 'e')
    s.rect(57, 46, 62, 52, 't'); s.rect(57, 46, 62, 46, 'k'); s.rect(57, 52, 62, 52, 'B')
    s.set(59, 48, 'r'); s.set(60, 48, 'y'); s.rect(58, 49, 61, 49, 'r'); s.set(59, 49, 'y'); s.set(60, 49, 'y')
    s.rect(58, 50, 61, 50, 'b')
    # barrels by the wall
    s.rect(7, 55, 9, 58, 'B'); s.rect(7, 56, 9, 56, 'S'); s.rect(7, 55, 9, 55, 'b')
    s.outline()
    sh = Sprite(64, 64); sh.rect(5, 61, 60, 62, 'K'); sh.rect(8, 63, 58, 63, 'K')
    for y in range(64):
        for x in range(64):
            if s.px[y][x] is None and sh.px[y][x]:
                s.px[y][x] = 'K'
    return s

# =====================================================================
# Kitchen stations (one per cooking method) + dining furniture
# =====================================================================

def _table_base(s, top='t', x0=5, x1=26):
    s.rect(x0, 14, x1, 19, top); s.rect(x0, 14, x1, 14, 'k')
    for y in (16, 18): s.rect(x0, y, x1, y, 'H' if top == 't' else 'B')
    s.rect(x0, 20, x1, 21, 'B'); s.rect(x0, 21, x1, 21, 'b')
    for lx in (x0 + 1, x1 - 2):
        s.rect(lx, 22, lx + 1, 27, 'b'); s.rect(lx, 22, lx, 27, 'B')


def stove():           # fry
    s = Sprite()
    s.rect(20, 1, 22, 9, 'e'); s.rect(20, 1, 20, 9, 'd')
    s.rect(7, 9, 24, 13, 'S'); s.rect(7, 9, 24, 9, 's'); s.rect(7, 13, 24, 13, 'd')
    s.rect(7, 14, 24, 26, 'e'); s.rect(7, 14, 7, 26, 'd'); s.rect(7, 14, 24, 14, 'd')
    s.rect(11, 17, 20, 23, 'K'); s.rect(12, 20, 19, 22, 'r'); s.rect(13, 21, 18, 22, 'y')
    s.set(14, 19, 'r'); s.set(17, 19, 'r'); s.set(15, 18, 'y')
    s.rect(11, 16, 20, 16, 'd')
    s.rect(8, 27, 9, 27, 'e'); s.rect(22, 27, 23, 27, 'e')
    s.ellipse(13, 11, 4.5, 1.8, 'K'); s.ellipse(13, 11, 3.5, 1.0, 'd')          # pan
    s.rect(17, 11, 20, 11, 'b')
    s.set(12, 11, 'W'); s.set(13, 11, 'y')                                    # egg in pan
    s.outline()
    return _with_shadow(s, 16, 28, 10, 1.3)


def oven():            # bake
    s = Sprite()
    s.ellipse(16, 18, 11, 10, 'R')
    s.rect(4, 22, 28, 27, 'S'); s.rect(4, 22, 28, 22, 's'); s.rect(4, 25, 28, 25, 'e')
    for x in range(6, 28, 5): s.set(x, 23, 'e'); s.set(x + 2, 26, 'e')
    for row, y in enumerate(range(10, 22, 3)):
        for x in range(5, 28):
            if s.get(x, y) == 'R': s.set(x, y, 'b')
        for x in range(6 + (row % 2) * 3, 28, 6):
            for dy in (1, 2):
                if s.get(x, y + dy) == 'R': s.set(x, y + dy, 'b')
    for x in range(8, 15):                                   # highlight on dome
        if s.get(x, 11) in ('R',): s.set(x, 11, 'P')
    s.ellipse(16, 21, 5, 4, 'b'); s.ellipse(16, 21, 4, 3.2, 'K')
    s.rect(12, 22, 20, 24, 'K')
    s.rect(13, 22, 19, 22, 'r'); s.rect(14, 21, 18, 21, 'r'); s.set(15, 22, 'y'); s.set(17, 22, 'y')
    s.rect(13, 20, 18, 20, 't'); s.set(14, 19, 't'); s.set(17, 19, 't')       # loaf inside
    s.outline()
    return _with_shadow(s, 16, 28, 12, 1.3)


def cutting_board():   # chop
    s = Sprite()
    _table_base(s)
    s.rect(9, 14, 20, 17, 'k'); s.rect(9, 17, 20, 17, 'H'); s.rect(20, 14, 20, 17, 'H')
    s.rect(21, 15, 24, 15, 's'); s.set(21, 15, 'W'); s.rect(25, 15, 26, 15, 'b')                 # knife
    for x, c in [(11, 'r'), (12, 'r'), (14, 'r'), (16, 'G'), (17, 'L'), (18, 'G')]: s.set(x, 15, c)
    s.set(13, 16, 'r')
    s.outline()
    return _with_shadow(s, 16, 28, 11, 1.2)


def mixing_table():    # mix / whisk
    s = Sprite()
    _table_base(s)
    s.ellipse(13, 14, 6, 2, 'U'); s.ellipse(13, 14, 4.6, 1.2, 'k'); s.set(11, 13, 'W')
    s.rect(7, 15, 19, 17, 'U'); s.rect(8, 18, 18, 18, 'n'); s.rect(7, 15, 7, 17, 'c')
    s.rect(18, 15, 19, 17, 'n')
    s.rect(15, 8, 15, 13, 's'); s.set(16, 7, 's')                                                 # whisk
    s.rect(20, 16, 26, 16, 't'); s.set(19, 16, 'B'); s.set(27, 16, 'B'); s.rect(21, 16, 25, 16, 'k')  # rolling pin
    s.outline()
    return _with_shadow(s, 16, 28, 11, 1.2)


def hand_mill():       # grind
    s = Sprite()
    s.ellipse(16, 22, 11, 4, 'S'); s.rect(5, 22, 27, 26, 'd'); s.ellipse(16, 26, 11, 1.5, 'd')
    s.ellipse(16, 22, 11, 4, 'S'); s.ellipse(15, 21, 9, 2.6, 's')
    s.ellipse(16, 17, 7.5, 2.8, 's'); s.rect(9, 17, 23, 20, 'S'); s.ellipse(16, 20, 7.5, 1.2, 'S')
    s.ellipse(16, 17, 7.5, 2.8, 's'); s.ellipse(15, 16, 5, 1.4, 'p')
    s.rect(15, 16, 17, 17, 'K'); s.set(16, 16, 'y')                                               # grain in hole
    s.rect(21, 9, 22, 17, 'B'); s.rect(22, 9, 22, 17, 'b'); s.rect(21, 8, 22, 8, 't')            # handle
    for x, y in [(6, 24), (7, 24), (8, 25), (25, 24), (26, 25), (24, 25)]: s.set(x, y, 'W')     # flour spill
    s.outline()
    return _with_shadow(s, 16, 28, 12, 1.3)


def grill():           # grill
    s = Sprite()
    s.ellipse(16, 22, 12, 5.5, 'S'); s.rect(4, 22, 28, 25, 'd'); s.ellipse(16, 25, 12, 2, 'd')
    s.ellipse(16, 22, 12, 5.5, 'S')
    for x in range(5, 28, 4): s.set(x, 24, 'e'); s.set(x + 2, 23, 's')
    s.ellipse(16, 21, 9, 3.6, 'K')
    for x, y in [(11, 21), (14, 22), (18, 21), (21, 22), (16, 20), (12, 23), (20, 23)]:
        s.set(x, y, 'r'); s.set(x + 1, y, 'y')
    for y in (18, 20, 22, 24):                                                                    # grate
        for x in range(7, 26):
            if s.get(x, y) in ('K', 'r', 'y'): s.set(x, y, 'e')
    s.rect(7, 17, 25, 17, 'd')
    for x in range(8, 25, 4):
        for y in range(17, 25):
            if s.get(x, y) in ('K', 'r', 'y'): s.set(x, y, 'd')
    for x, y in [(10, 15), (16, 14), (22, 15), (13, 16), (19, 16)]: s.set(x, y, 'y'); s.set(x, y + 1, 'r')
    s.ellipse(15, 19, 4, 1.2, 't'); s.set(12, 19, 'B'); s.set(19, 19, 'B'); s.set(14, 19, 'b'); s.set(16, 19, 'b')  # fish on grate
    s.outline()
    return _with_shadow(s, 16, 28, 13, 1.4)


def cauldron():        # boil
    s = Sprite()
    s.rect(9, 26, 23, 27, 'B'); s.rect(9, 27, 23, 27, 'b')                                       # logs
    for x, c in [(11, 'r'), (13, 'y'), (16, 'r'), (18, 'y'), (20, 'r')]: s.set(x, 25, c)
    s.ellipse(16, 18, 10, 7.5, 'e'); s.ellipse(13, 16, 4, 3, 'd'); s.set(11, 14, 'S')
    s.rect(8, 25, 9, 26, 'K'); s.rect(23, 25, 24, 26, 'K')
    s.ellipse(16, 11, 10, 2.8, 'd'); s.ellipse(16, 11, 8, 1.8, 't'); s.ellipse(15, 11, 5, 1, 'k')
    s.set(13, 11, 'r'); s.set(18, 11, 'G'); s.set(16, 12, 'r')
    for x, y in [(12, 7), (13, 6), (12, 5), (19, 6), (20, 5), (19, 4), (16, 4), (16, 3)]: s.set(x, y, 'p')
    s.outline()
    return _with_shadow(s, 16, 28, 11, 1.3)


def dining_table():
    s = Sprite()
    s.rect(3, 12, 28, 19, 't'); s.rect(3, 12, 28, 12, 'k')
    for y in (15, 18): s.rect(3, y, 28, y, 'H')
    s.set(9, 15, 't'); s.set(21, 18, 't')
    s.rect(3, 20, 28, 21, 'B'); s.rect(3, 21, 28, 21, 'b')
    for lx in (4, 26): s.rect(lx, 22, lx + 1, 27, 'b'); s.rect(lx, 22, lx, 27, 'B')
    s.ellipse(10, 15, 3, 1.4, 'W'); s.ellipse(10, 15, 1.5, 0.6, 'y')                              # plate w/ egg
    s.rect(19, 13, 21, 16, 'W'); s.rect(19, 13, 21, 13, 'p'); s.rect(22, 14, 22, 15, 'W')       # mug
    s.rect(15, 11, 15, 13, 'k'); s.set(15, 10, 'y'); s.set(15, 9, 'r')                          # candle
    s.outline()
    return _with_shadow(s, 16, 28, 13, 1.2)


def stool():
    s = Sprite()
    s.ellipse(16, 18, 6, 2.3, 't'); s.ellipse(15, 17, 4, 1.2, 'k')
    s.rect(10, 19, 22, 20, 'B'); s.ellipse(16, 20, 6, 1.2, 'B')
    for lx in (11, 15, 20): s.rect(lx, 21, lx + 1, 27, 'b')
    s.rect(11, 24, 21, 24, 'B')
    s.outline()
    return _with_shadow(s, 16, 28, 7, 1.0)


BUILDINGS = [('hearthwick_inn', inn)]

def brewing_cask():     # ferment
    """Upright oak cask on a stand, side view, with a tap and a dripping tankard."""
    s = Sprite()
    s.rect(8, 24, 24, 25, 'B'); s.rect(9, 26, 10, 27, 'b'); s.rect(22, 26, 23, 27, 'b')            # stand
    for y in range(6, 24):
        bulge = 1 if 9 <= y <= 20 else 0
        s.rect(9 - bulge, y, 23 + bulge, y, 'B')
    for x in (12, 16, 20): s.rect(x, 7, x, 23, 'b')                                                  # staves
    s.rect(9, 6, 23, 6, 't'); s.rect(8, 9, 24, 10, 'S'); s.rect(8, 19, 24, 20, 'S')                 # lid + hoops
    s.rect(8, 9, 24, 9, 's'); s.rect(8, 19, 24, 19, 's'); s.rect(9, 7, 10, 23, 't')
    s.rect(4, 15, 8, 16, 's'); s.rect(4, 17, 4, 18, 'd'); s.set(5, 15, 'W')                          # tap
    s.rect(2, 21, 6, 24, 't'); s.rect(2, 21, 6, 21, 'k'); s.rect(3, 20, 5, 20, 'W'); s.set(4, 19, 'H')  # tankard + drip
    s.outline()
    return _with_shadow(s, 16, 28, 10, 1.3)


STATIONS = [
    # name, builder, cooking method it performs
    ('hand_mill', hand_mill, 'grind'),
    ('mixing_table', mixing_table, 'mix'),
    ('cutting_board', cutting_board, 'chop'),
    ('stove', stove, 'fry'),
    ('grill', grill, 'grill'),
    ('oven', oven, 'bake'),
    ('cauldron', cauldron, 'boil'),
    ('brewing_cask', brewing_cask, 'ferment'),
    ('dining_table', dining_table, None),
    ('stool', stool, None),
]
