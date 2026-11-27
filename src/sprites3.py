"""Batch 3: 4-direction characters, inn interior, ingredient wave 2."""
import random
from core import Sprite
from sprites import kid, _with_shadow

# =====================================================================
# Characters: base kid in 3 views x 3 frames, then looks layered on top
#   views: down, up, left (right = mirrored left)
#   frames: idle, walk1, walk2   (walk cycle = walk1, idle, walk2, idle)
# =====================================================================

def _lift_leg(base, side):
    """Lift one leg 1px (front/back views)."""
    s = base.copy()
    x0, x1 = (12, 15) if side == 'L' else (16, 19)
    for x in range(x0, x1 + 1):
        for y in range(24, 28):
            s.px[y - 1][x] = base.px[y][x] if y > 24 else s.px[y - 1][x]
        s.px[27][x] = 'K'
    return s


def _bob(s, top=0, bottom=23, x0=8, x1=23):
    out = s.copy()
    for y in range(top + 1, bottom + 1):
        for x in range(x0, x1 + 1):
            out.px[y - 1][x] = s.px[y][x]
    for x in range(x0, x1 + 1):
        if s.px[bottom + 1][x] is None:
            out.px[bottom][x] = None
        elif out.px[bottom][x] is None:
            out.px[bottom][x] = 'O'
    return out


def kid_up():
    s = kid()
    s.rect(12, 7, 19, 16, 'B'); s.rect(11, 8, 20, 15, 'B')
    s.rect(13, 8, 16, 8, 't'); s.set(12, 9, 't'); s.set(18, 10, 't')
    for x in (13, 15, 17, 19): s.set(x, 16, 'b')
    s.rect(12, 18, 19, 22, 'U'); s.rect(12, 18, 12, 21, 'n'); s.rect(19, 18, 19, 21, 'n')
    s.rect(14, 18, 17, 18, 'n'); s.rect(13, 19, 13, 21, 'c')
    s.set(12, 22, 'k'); s.set(19, 22, 'k')
    return s


def kid_left(frame='idle'):
    s = Sprite()
    s.rect(12, 6, 19, 16, 'B'); s.rect(11, 7, 20, 15, 'B')                # head
    s.rect(11, 11, 16, 15, 'k'); s.rect(12, 16, 16, 16, 'k')              # face toward left
    s.set(11, 11, 'B'); s.set(13, 11, 'B')                                 # fringe
    s.rect(17, 13, 17, 14, 'k'); s.set(17, 14, 't')                        # ear
    s.rect(14, 8, 16, 8, 't'); s.set(13, 9, 't')
    s.rect(12, 13, 13, 14, 'K'); s.set(12, 13, 'W')                        # eye
    s.set(14, 15, 'P')
    s.rect(13, 18, 18, 22, 'U'); s.rect(13, 18, 14, 18, 'p'); s.rect(14, 19, 14, 20, 'c')
    s.rect(18, 18, 18, 22, 'n')
    s.rect(13, 23, 18, 23, 'n')
    if frame == 'idle':
        s.rect(14, 24, 17, 25, 'n'); s.rect(16, 24, 17, 25, 'K')
        s.rect(13, 26, 17, 26, 'b')
        arm = [(16, 18), (16, 19), (16, 20), (16, 21)]; hand = (16, 22)
    else:
        near_fwd = frame == 'walk1'
        fwd = [(13, 24), (14, 24), (12, 25), (13, 25)]; fwd_boot = [(10, 26), (11, 26), (12, 26)]
        back = [(17, 24), (18, 24), (18, 25), (19, 25)]; back_boot = [(18, 26), (19, 26), (20, 26)]
        near, near_b, far, far_b = (fwd, fwd_boot, back, back_boot) if near_fwd else (back, back_boot, fwd, fwd_boot)
        for p in far: s.set(*p, 'K')
        for p in far_b + near_b: s.set(*p, 'b')
        for p in near: s.set(*p, 'n')
        arm = [(15, 18), (15, 19), (14, 20), (14, 21)] if near_fwd else [(16, 18), (17, 19), (17, 20), (18, 21)]
        hand = (13, 22) if near_fwd else (18, 22)
    for x, y in arm: s.set(x, y, 'n')
    s.set(*hand, 'k')
    s.outline()
    s.rect(13, 17, 18, 17, 'O')                                             # neck line
    sh = Sprite(); sh.rect(10, 27, 21, 27, 'K'); sh.rect(11, 28, 20, 28, 'K')
    for y in range(32):
        for x in range(32):
            if s.px[y][x] is None and sh.px[y][x]:
                s.px[y][x] = 'K'
    return s


def mirror(s):
    out = s.copy()
    out.px = [row[::-1] for row in s.px]
    return out


LOOKS = {
    'kid': {},
    'baker': {'U': 'W', 'c': 'W', 'p': 's', 'B': 'r', 't': 'y', 'n': 'S'},
    'elder': {'U': 'T', 'c': 'L', 'p': 'k', 'B': 's', 't': 'W', 'n': 'g'},
    'girl': {'U': 'R', 'c': 'P', 'p': 'W', 'B': 'y', 't': 'W', 'n': 'b'},
    # shopkeepers
    'butcher': {'U': 'R', 'c': 'P', 'B': 'b', 't': 'B', 'n': 'b'},
    'fishmonger': {'U': 'T', 'c': 'L', 'B': 'H', 't': 'y', 'n': 'd'},
    'dairymaid': {'U': 'P', 'c': 'k', 'B': 'H', 't': 'y', 'n': 'u'},
    'spicer': {'U': 'v', 'c': 'm', 'B': 'K', 't': 'd', 'n': 'b'},
}

HEADWEAR = {'fishmonger': ('u', 'c'), 'dairymaid': ('P', 'k'), 'spicer': ('H', 'y')}   # cap colour, highlight
APRONS = {'butcher': ('W', 'R'), 'dairymaid': ('W', 's'), 'fishmonger': ('t', 'B')}    # apron colour, stain/edge


def _extras(s, look, view):
    if look == 'kid' and view == 'left':
        s.set(16, 5, 'O'); s.set(17, 4, 'O')                    # cowlick, same as the front view
    if look == 'baker':
        s.rect(11, 2, 20, 6, 'O'); s.rect(12, 3, 19, 6, 'W'); s.rect(12, 6, 19, 6, 's'); s.rect(14, 3, 15, 4, 'p')
        s.set(17, 4, None); s.set(16, 5, 'W')
        if view == 'down':
            s.rect(13, 19, 18, 23, 'k'); s.rect(13, 23, 18, 23, 't')
        elif view == 'up':
            s.rect(15, 20, 16, 21, 'k')
        else:
            s.rect(13, 19, 14, 23, 'k')
    if look in HEADWEAR:
        c, hi = HEADWEAR[look]
        s.set(16, 5, None); s.set(17, 4, None)
        s.rect(11, 3, 20, 6, 'O'); s.rect(12, 4, 19, 6, c); s.rect(12, 4, 15, 4, hi)
        if look == 'spicer':
            s.set(20, 5, c); s.set(21, 6, 'O')
    if look in APRONS:
        c, mark = APRONS[look]
        if view == 'down':
            s.rect(13, 19, 18, 23, c); s.rect(13, 23, 18, 23, mark); s.set(16, 21, mark)
        elif view == 'left':
            s.rect(13, 19, 14, 23, c)
    if look == 'elder':
        s.set(16, 5, None); s.set(17, 4, None)
        if view == 'down':
            s.rect(13, 16, 18, 16, 's'); s.rect(14, 17, 17, 17, 's'); s.set(15, 15, 's')
        elif view == 'left':
            s.rect(11, 16, 14, 16, 's'); s.rect(12, 17, 13, 17, 's'); s.set(11, 15, 's')
    elif look == 'girl':
        s.set(16, 5, None); s.set(17, 4, None)
        sides = {'down': (10, 21), 'up': (10, 21), 'left': (21,)}[view]
        for bx in sides:
            for y in (16, 17, 18): s.set(bx, y, 'y')
            s.set(bx, 19, 'P')
            ox = bx - 1 if bx < 16 else bx + 1
            for y in (16, 17, 18, 19, 20): s.set(ox, y, 'O')
            s.set(bx, 20, 'O')
        if view == 'down':
            s.rect(12, 23, 19, 23, 'R'); s.rect(13, 24, 14, 24, 'k'); s.rect(17, 24, 18, 24, 'k')
    return s


def _recolor_girl_face(s):
    # blonde (y) only on hair; skin highlight stays
    return s


def character(look, view, frame):
    if view in ('down', 'up'):
        base = kid() if view == 'down' else kid_up()
        s = _extras(base.remap(LOOKS[look]), look, view)
        if look == 'girl':
            s.px = [[('t' if v == 'y' and 13 <= y <= 15 and 12 <= x <= 19 and view == 'down' else v)
                     for x, v in enumerate(row)] for y, row in enumerate(s.px)]
        if frame == 'idle':
            return s
        return _bob(_lift_leg(s, 'L' if frame == 'walk1' else 'R'))
    left = _extras(kid_left(frame).remap(LOOKS[look]), look, 'left')
    if look == 'girl':
        left.px = [[('t' if v == 'y' and 13 <= y <= 15 and 11 <= x <= 16 else v)
                    for x, v in enumerate(row)] for y, row in enumerate(left.px)]
    return left if view == 'left' else mirror(left)


CHAR_LOOKS = ['kid', 'baker', 'elder', 'girl', 'butcher', 'fishmonger', 'dairymaid', 'spicer']
CHAR_VIEWS = ['down', 'up', 'left', 'right']
CHAR_FRAMES = ['idle', 'walk1', 'walk2']

CHARACTERS = [(f'{c}_{v}_{f}', (lambda c=c, v=v, f=f: character(c, v, f)))
              for c in CHAR_LOOKS for v in CHAR_VIEWS for f in CHAR_FRAMES]

# =====================================================================
# Inn interior
# =====================================================================

def inn_wall():
    s = Sprite()
    s.rect(0, 0, 31, 3, 'b'); s.rect(0, 3, 31, 3, 'O')
    s.rect(0, 4, 31, 17, 'k')
    for x in (0, 16): s.rect(x, 4, x + 1, 17, 'b')
    for x, y in [(5, 7), (24, 12), (10, 14), (27, 6)]: s.set(x, y, 't')
    s.rect(0, 18, 31, 19, 'B'); s.rect(0, 18, 31, 18, 't')
    s.rect(0, 20, 31, 29, 'B')
    for x in range(0, 32, 4): s.rect(x, 20, x, 29, 'b')
    for x in range(2, 32, 8): s.set(x, 24, 'H')
    s.rect(0, 30, 31, 31, 'b'); s.rect(0, 31, 31, 31, 'O')
    return s


def fireplace():
    s = Sprite()
    s.rect(5, 9, 26, 27, 'S')
    for row, y in enumerate(range(9, 28, 3)):
        s.rect(5, y, 26, y, 'e')
        for x in range(5 + (row % 2) * 3, 27, 6): s.set(x, y + 1, 'e'); s.set(x, y + 2, 'e')
        for x in range(6 + (row % 2) * 3, 27, 6): s.set(x, y + 1, 's')
    s.rect(3, 6, 28, 8, 'B'); s.rect(3, 6, 28, 6, 't'); s.rect(3, 8, 28, 8, 'b')       # mantel
    s.rect(10, 15, 21, 27, 'K'); s.rect(11, 14, 20, 14, 'K'); s.rect(9, 14, 22, 14, 'e')
    s.rect(11, 25, 20, 26, 'B'); s.rect(12, 26, 19, 26, 'b')                              # logs
    for x, h in [(12, 4), (13, 6), (14, 8), (15, 9), (16, 7), (17, 8), (18, 5), (19, 3)]:
        for i in range(h):
            s.set(x, 24 - i, 'y' if i < h // 2 else 'r')
    s.set(15, 21, 'W'); s.set(16, 22, 'W')
    s.rect(7, 3, 8, 5, 'k'); s.set(7, 2, 'y')                                            # candle
    s.rect(22, 3, 25, 5, 'p'); s.rect(23, 4, 24, 4, 'm')                                 # little vase
    s.outline()
    return s


def bar_counter():
    s = Sprite()
    s.rect(0, 13, 31, 17, 't'); s.rect(0, 13, 31, 13, 'k'); s.rect(0, 17, 31, 17, 'B')
    s.rect(0, 18, 31, 27, 'B'); s.rect(0, 18, 31, 18, 'b'); s.rect(0, 27, 31, 27, 'b')
    for x0 in (2, 18):
        s.rect(x0, 20, x0 + 11, 25, 'b'); s.rect(x0 + 1, 21, x0 + 10, 24, 'B'); s.rect(x0 + 1, 21, x0 + 10, 21, 't')
    s.rect(20, 9, 23, 13, 'W'); s.rect(20, 9, 23, 10, 'p'); s.rect(24, 10, 24, 12, 'W')  # tankard
    s.rect(5, 12, 9, 13, 'W'); s.rect(6, 12, 8, 12, 'p')                                 # plate
    s.outline()
    for x in (0, 31):                                                                     # keep tileable
        for y in range(32):
            if s.px[y][x] == 'O' and 13 <= y <= 27: s.px[y][x] = s.px[y][1 if x == 0 else 30]
    s.rect(0, 28, 31, 28, 'K')
    return s


def keg():
    s = Sprite()
    s.rect(9, 23, 10, 27, 'b'); s.rect(21, 23, 22, 27, 'b'); s.rect(8, 23, 23, 24, 'B')   # rack
    s.ellipse(16, 15, 9.5, 9, 'S')                                                         # iron hoop
    s.ellipse(16, 15, 8.2, 7.8, 'B')
    s.ellipse(16, 15, 6.5, 6.2, 't')
    for x in range(10, 23, 3):                                                             # end-grain planks
        for y in range(8, 23):
            if s.get(x, y) == 't': s.set(x, y, 'B')
    s.ellipse(13.5, 11.5, 1.6, 1.2, 'k')
    for x in range(6, 27):
        for y in range(6, 25):
            nx, ny = (x + 0.5 - 16) / 9.5, (y + 0.5 - 15) / 9
            if s.get(x, y) == 'S' and nx + ny < -0.6: s.set(x, y, 's')
            elif s.get(x, y) == 'S' and nx + ny > 0.7: s.set(x, y, 'd')
    s.rect(15, 18, 17, 19, 's'); s.rect(16, 20, 16, 21, 'd'); s.set(15, 18, 'W')            # tap
    s.rect(14, 16, 18, 16, 'e')
    s.outline()
    return _with_shadow(s, 16, 28, 9, 1.2)


def shelf_jars():
    s = Sprite()
    for y in (12, 22):
        s.rect(3, y, 28, y + 1, 'B'); s.rect(3, y, 28, y, 't')
        s.set(5, y + 2, 'b'); s.set(26, y + 2, 'b')
    jars = [(5, 'v'), (10, 'y'), (15, 'G'), (20, 'r'), (24, 'P')]
    for i, (x, c) in enumerate(jars):
        h = 5 if i % 2 == 0 else 4
        s.rect(x, 12 - h, x + 3, 11, 'p'); s.rect(x, 12 - h + 1, x + 3, 11, c); s.rect(x, 12 - h, x + 3, 12 - h, 'B')
        s.set(x, 12 - h + 2, 'W')
    for x, c in [(5, 'k'), (9, 'H'), (14, 't'), (19, 's'), (23, 'R')]:
        s.rect(x, 17, x + 3, 21, c); s.rect(x, 17, x + 3, 17, 'b' if c != 's' else 'e')
        s.set(x + 1, 18, 'W')
    s.outline()
    return s


def rug():
    s = Sprite()
    s.ellipse(16, 18, 14, 9, 't'); s.ellipse(16, 18, 12.5, 7.8, 'R'); s.ellipse(16, 18, 10, 5.8, 'P')
    s.ellipse(16, 18, 8.5, 4.6, 'R')
    for d in range(5):
        for x, y in [(16 - d, 18 - (4 - d)), (16 + d, 18 - (4 - d)), (16 - d, 18 + (4 - d)), (16 + d, 18 + (4 - d))]:
            s.set(x, y, 'y')
    s.set(16, 18, 'k')
    for x in range(4, 29, 3):
        for y in range(9, 28):
            if s.get(x, y) == 't' and (y < 12 or y > 24): s.set(x, y, 'k')
    s.outline('b')
    return s


def bed():
    s = Sprite()
    s.rect(6, 3, 25, 10, 'B'); s.rect(6, 3, 25, 3, 't'); s.rect(6, 3, 7, 10, 'b'); s.rect(24, 3, 25, 10, 'b')
    s.rect(9, 5, 22, 5, 'b')
    s.rect(7, 9, 24, 26, 'W')
    s.rect(9, 9, 22, 12, 'W'); s.rect(9, 12, 22, 12, 'p'); s.rect(10, 9, 14, 9, 'p')          # pillow
    s.rect(7, 14, 24, 25, 'R'); s.rect(7, 14, 24, 15, 'W'); s.rect(7, 15, 24, 15, 'p')
    for y in range(17, 26, 3):
        for x in range(7, 25):
            if (x // 3 + y // 3) % 2 == 0: s.set(x, y, 'P')
    for x in range(9, 25, 4):
        for y in range(16, 26):
            if s.get(x, y) == 'R': s.set(x, y, 'P') if y % 3 == 0 else None
    s.rect(7, 25, 24, 25, 'b'); s.rect(6, 14, 6, 27, 'b'); s.rect(25, 14, 25, 27, 'b')
    s.rect(6, 26, 25, 27, 'B'); s.rect(6, 27, 25, 27, 'b')
    s.outline()
    return _with_shadow(s, 16, 28, 11, 1.2)


def nightstand():
    s = Sprite()
    s.rect(10, 15, 21, 18, 't'); s.rect(10, 15, 21, 15, 'k')
    s.rect(10, 19, 21, 26, 'B'); s.rect(10, 19, 21, 19, 'b')
    s.rect(12, 21, 19, 23, 'b'); s.rect(13, 22, 18, 22, 'B'); s.rect(15, 22, 16, 22, 'y')
    s.rect(11, 27, 12, 27, 'b'); s.rect(19, 27, 20, 27, 'b')
    s.rect(13, 13, 16, 15, 'y'); s.rect(13, 15, 16, 15, 'H'); s.rect(14, 10, 15, 13, 'k'); s.set(14, 9, 'y'); s.set(14, 8, 'r')
    s.rect(18, 13, 19, 15, 'v')                                                             # small book
    s.outline()
    return _with_shadow(s, 16, 28, 7, 1.0)


def potted_plant():
    s = Sprite()
    s.rect(11, 20, 20, 27, 'r'); s.rect(11, 20, 20, 21, 'B'); s.rect(18, 22, 20, 27, 'b'); s.rect(11, 22, 12, 27, 't')
    s.rect(12, 27, 19, 27, 'b')
    rnd = random.Random(4)
    for cx, cy, r in [(16, 13, 6), (11, 15, 4), (21, 15, 4), (16, 8, 4)]:
        s.ellipse(cx, cy, r, r * 0.8, 'g')
    for cx, cy, r in [(15, 12, 4.5), (11, 14, 2.5), (20, 14, 2.5), (15, 7, 2.6)]:
        s.ellipse(cx, cy, r, r * 0.8, 'G')
    for _ in range(6):
        s.set(rnd.randint(11, 19), rnd.randint(6, 14), 'L')
    s.rect(15, 18, 16, 19, 'g')
    s.outline()
    return _with_shadow(s, 16, 28, 7, 1.0)


def chest():
    s = Sprite()
    s.rect(8, 11, 23, 16, 'B'); s.rect(9, 10, 22, 10, 'B'); s.rect(9, 10, 22, 11, 't')    # lid
    s.rect(8, 17, 23, 26, 'B'); s.rect(8, 17, 23, 17, 'b')
    for x in (10, 21):
        s.rect(x, 10, x + 1, 26, 'H'); s.rect(x, 10, x, 26, 'y')
    s.rect(14, 15, 17, 19, 'H'); s.rect(15, 16, 16, 18, 'y'); s.set(15, 18, 'K')
    s.rect(8, 22, 23, 22, 'b')
    s.outline()
    return _with_shadow(s, 16, 28, 9, 1.2)


INTERIOR = [('inn_wall', inn_wall), ('fireplace', fireplace), ('bar_counter', bar_counter), ('keg', keg),
            ('shelf_jars', shelf_jars), ('rug', rug), ('bed', bed), ('nightstand', nightstand),
            ('potted_plant', potted_plant), ('chest', chest)]

# =====================================================================
# Ingredient wave 2
# =====================================================================

def ball(s, cx, cy, rx, ry, dark, base, light, spec='W'):
    for y in range(s.h):
        for x in range(s.w):
            nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if nx * nx + ny * ny <= 1:
                l = -0.7 * nx - 0.7 * ny
                s.set(x, y, light if l > 0.5 else dark if l < -0.55 else base)
    if spec:
        s.set(int(cx - rx * 0.45), int(cy - ry * 0.5), spec)


def item_apple():
    s = Sprite()
    ball(s, 16, 17.5, 7, 6.5, 'b', 'R', 'P')
    s.rect(16, 9, 16, 11, 'b'); s.rect(17, 9, 19, 10, 'G'); s.set(19, 9, 'L'); s.set(18, 11, 'g')
    s.outline(); return s


def item_berries():
    s = Sprite()
    for cx, cy in [(13, 18), (19, 18), (16, 14), (16, 21), (21, 22), (11, 22)]:
        ball(s, cx, cy, 2.8, 2.8, 'n', 'v', 'm', spec=None)
        s.set(int(cx - 1), int(cy - 1), 'p')
    s.rect(15, 9, 18, 10, 'G'); s.set(14, 10, 'g'); s.set(18, 9, 'L'); s.rect(16, 11, 16, 11, 'g')
    s.outline(); return s


def item_mushroom():
    s = Sprite()
    s.rect(13, 16, 18, 23, 'k'); s.rect(17, 16, 18, 23, 't'); s.rect(13, 23, 18, 23, 't')
    for y in range(8, 17):
        for x in range(6, 27):
            nx, ny = (x + 0.5 - 16) / 10, (y + 0.5 - 16) / 7.5
            if nx * nx + ny * ny <= 1 and y <= 16:
                s.set(x, y, 'P' if (nx < -0.2 and ny < -0.4) else 'b' if y >= 15 else 'R')
    for x, y in [(11, 12), (16, 10), (20, 12), (14, 14), (22, 14)]:
        s.set(x, y, 'W'); s.set(x + 1, y, 'W')
    s.outline(); return s


def item_honey():
    s = Sprite()
    s.rect(10, 13, 21, 25, 'r'); s.rect(10, 13, 11, 25, 'y'); s.rect(19, 13, 21, 25, 'H')
    s.rect(11, 9, 20, 12, 'B'); s.rect(11, 9, 20, 9, 't'); s.rect(10, 12, 21, 12, 'b')
    s.rect(12, 17, 19, 21, 'k'); s.rect(12, 17, 19, 17, 'W'); s.rect(14, 19, 17, 19, 'H')
    s.rect(14, 13, 15, 15, 'y')
    s.outline(); return s


def item_potato():
    s = Sprite()
    ball(s, 16, 17, 8, 5.5, 'B', 't', 'k', spec=None)
    for x, y in [(12, 16), (18, 18), (20, 15), (14, 19)]: s.set(x, y, 'H')
    s.outline(); return s


def item_carrot():
    s = Sprite()
    for i in range(14):
        w = max(0, 3 - i // 4)
        for d in range(-w, w + 1):
            s.set(16 + d + i // 5, 12 + i, 'r' if d < w else 'B')
    for y in (15, 18, 21): s.set(15 + (y - 12) // 5, y, 'B')
    for x, y in [(14, 8), (15, 9), (16, 7), (16, 8), (16, 9), (18, 8), (17, 9), (15, 10), (16, 10), (17, 10), (13, 7), (19, 7)]:
        s.set(x, y, 'G')
    s.set(16, 6, 'L'); s.set(13, 6, 'L')
    s.outline(); return s


def item_onion():
    s = Sprite()
    ball(s, 16, 18, 7, 6.5, 'v', 'm', 'k')
    for y in range(12, 24, 1):
        if s.get(16, y) in ('v', 'm'): s.set(16, y, 'v')
    s.rect(15, 9, 17, 11, 'm'); s.set(16, 8, 'L'); s.set(15, 7, 'G'); s.set(17, 7, 'G')
    s.rect(14, 24, 18, 24, 'k')
    s.outline(); return s


def item_herbs():
    s = Sprite()
    for x0, lean in [(12, -1), (16, 0), (20, 1)]:
        for i in range(10):
            s.set(x0 + (lean * i) // 4, 23 - i, 'g')
        for i in (3, 6, 9):
            x, y = x0 + (lean * i) // 4, 23 - i
            s.set(x - 1, y, 'G'); s.set(x + 1, y - 1, 'G'); s.set(x - 2, y - 1, 'L'); s.set(x + 2, y - 2, 'L')
    s.rect(13, 21, 19, 22, 't'); s.rect(13, 22, 19, 22, 'B')
    for x in range(14, 19): s.set(x, 24 + (x % 2), 'g')
    s.outline(); return s


# ---- processed ----------------------------------------------------

def _bowl(s, rim, body, shade, fill_d, fill, fill_l):
    s.ellipse(16, 15, 10, 3, rim); s.ellipse(16, 15, 8.5, 2, fill); s.ellipse(14, 14.5, 4, 1, fill_l)
    for y in range(16, 24):
        half = int(round(9.5 - ((y - 16) / 7) ** 2 * 4.5))
        for x in range(16 - half, 16 + half + 1):
            s.set(x, y, shade if x > 16 + half - 3 else body)
        s.set(16 - half, y, rim if y < 19 else body)
    s.rect(13, 24, 19, 24, shade)
    for x in range(8, 25):
        if s.get(x, 16) == fill: s.set(x, 16, fill_d)


def dish_mushroom_stew():
    s = Sprite(); _bowl(s, 't', 'B', 'b', 'b', 'B', 't')
    for x, y, c in [(12, 15, 'k'), (17, 14, 'k'), (20, 15, 'R'), (14, 16, 'G'), (19, 16, 'G'), (11, 14, 'r')]:
        s.set(x, y, c)
    for x, y in [(13, 10), (14, 9), (13, 8), (19, 10), (20, 9), (19, 8)]: s.set(x, y, 'p')
    s.outline(); return s


def dish_whipped_cream():
    s = Sprite(); _bowl(s, 'p', 'W', 's', 's', 'W', 'W')
    for x, h in [(11, 2), (13, 4), (15, 6), (16, 7), (17, 5), (19, 3), (21, 2)]:
        for i in range(h): s.set(x, 15 - i, 'W' if i < h - 1 else 'p')
        s.set(x + 1, 15 - h // 2, 'p')
    s.set(16, 7, 'R'); s.set(16, 6, 'g')
    s.outline(); return s


def dish_berry_jam():
    s = Sprite()
    s.rect(10, 13, 21, 25, 'v'); s.rect(10, 13, 11, 25, 'm'); s.rect(19, 13, 21, 25, 'n')
    s.rect(9, 9, 22, 12, 'R'); s.rect(9, 9, 22, 9, 'P'); s.rect(9, 12, 22, 12, 'b')
    for x in range(9, 23, 2): s.set(x, 12, 'W')
    s.rect(13, 17, 18, 21, 'k'); s.rect(15, 18, 16, 20, 'v'); s.set(14, 19, 'v'); s.set(17, 19, 'v')
    s.set(12, 14, 'W'); s.set(12, 15, 'W')
    s.outline(); return s


def _plate(s, y=20, rx=11):
    s.ellipse(16, y, rx, 4, 'p'); s.ellipse(16, y - 0.5, rx - 2, 2.6, 'W')


def dish_mashed_potatoes():
    s = Sprite(); _plate(s)
    ball(s, 16, 17, 7, 4.5, 't', 'k', 'W', spec=None)
    for x in (12, 15, 18): s.set(x, 15, 't'); s.set(x + 1, 14, 'W')
    s.rect(15, 13, 17, 14, 'y'); s.set(15, 13, 'W')
    s.set(11, 18, 'G'); s.set(21, 17, 'G'); s.set(19, 19, 'g')
    s.outline(); return s


def dish_baked_potato():
    s = Sprite(); _plate(s)
    ball(s, 16, 17, 8, 4.5, 'b', 'B', 't', spec=None)
    s.rect(12, 15, 20, 17, 'k'); s.rect(12, 17, 20, 17, 't'); s.rect(14, 14, 18, 14, 'k')
    s.rect(15, 14, 17, 15, 'y'); s.set(15, 14, 'W')
    s.set(13, 15, 'G'); s.set(19, 16, 'G')
    s.outline(); return s


def dish_apple_pie():
    s = Sprite()
    s.ellipse(16, 18, 11, 5.5, 'S'); s.ellipse(16, 17, 10, 4.5, 't'); s.ellipse(16, 17, 8, 3.4, 'r')
    for x in range(8, 25, 3):
        for y in range(13, 22):
            if s.get(x, y) == 'r': s.set(x, y, 't')
    for y in (15, 18):
        for x in range(7, 26):
            if s.get(x, y) == 'r': s.set(x, y, 't')
    s.ellipse(16, 17, 10, 4.5, None) if False else None
    for x in range(6, 27):
        for y in range(12, 24):
            if s.get(x, y) == 't' and s.get(x, y + 1) == 'S': s.set(x, y, 'B')
    s.set(11, 14, 'k'); s.set(12, 14, 'k')
    s.outline(); return s


def dish_honey_cake():
    s = Sprite()
    s.ellipse(16, 22, 10, 3, 'p'); s.ellipse(16, 21.5, 8, 2, 'W')                       # plate
    s.rect(9, 13, 23, 21, 't'); s.ellipse(16, 21, 7.5, 1.5, 't')
    s.ellipse(16, 13, 7.5, 2.2, 'r'); s.ellipse(15, 12.5, 4, 1, 'y')
    for x, d in [(10, 3), (13, 5), (16, 2), (19, 4), (22, 2)]:
        for i in range(d): s.set(x, 14 + i, 'r')
        s.set(x, 14 + d, 'H')
    s.rect(9, 17, 23, 17, 'k'); s.rect(20, 13, 23, 21, 'B') if False else None
    for y in range(14, 22): s.set(23, y, 'B'); s.set(22, y, 'B') if y > 17 else None
    s.rect(15, 9, 17, 10, 'y'); s.set(16, 8, 'W')                                       # honey dollop
    s.outline(); return s


def dish_chopped_herbs():
    s = Sprite()
    s.rect(7, 14, 22, 22, 't'); s.rect(7, 14, 22, 14, 'k'); s.rect(7, 21, 22, 22, 'H')    # board
    s.rect(23, 17, 26, 19, 't'); s.rect(23, 19, 26, 19, 'H'); s.set(25, 18, 'B')          # handle
    rnd = random.Random(6)
    for _ in range(30):
        x, y = rnd.randint(9, 19), rnd.randint(15, 19)
        s.set(x, y, rnd.choice('GGgL'))
    s.rect(18, 17, 21, 17, 's'); s.set(21, 17, 'W'); s.rect(22, 17, 23, 17, 'b')          # knife
    s.outline(); return s


FOOD2 = [
    ('herbs', item_herbs, 'raw', [], None),
    ('berries', item_berries, 'raw', [], None),
    ('mushroom', item_mushroom, 'raw', [], None),
    ('honey', item_honey, 'raw', [], None),
    ('apple', item_apple, 'raw', [], None),
    ('potato', item_potato, 'raw', [], None),
    ('carrot', item_carrot, 'raw', [], None),
    ('onion', item_onion, 'raw', [], None),
    ('chopped_herbs', dish_chopped_herbs, 'processed', ['herbs'], 'chop'),
    ('berry_jam', dish_berry_jam, 'processed', ['berries', 'honey'], 'boil'),
    ('whipped_cream', dish_whipped_cream, 'processed', ['milk'], 'mix'),
    ('mushroom_stew', dish_mushroom_stew, 'processed', ['mushroom', 'onion'], 'boil'),
    ('mashed_potatoes', dish_mashed_potatoes, 'processed', ['potato', 'milk'], 'mix'),
    ('baked_potato', dish_baked_potato, 'processed', ['potato'], 'bake'),
    ('apple_pie', dish_apple_pie, 'processed', ['apple', 'flour'], 'bake'),
    ('honey_cake', dish_honey_cake, 'processed', ['flour', 'egg', 'honey'], 'bake'),
]
