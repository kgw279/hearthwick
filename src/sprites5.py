"""Batch 5: narrow paths, room-building wall kit, forageable wild crops."""
import math, random
from core import Sprite
from sprites import _with_shadow, _foliage, tree
from sprites2 import render_terrain, terrain_mask, corner_value, NOISES
from sprites3 import ball, inn_wall

# =====================================================================
# Narrow dirt path (1 tile wide)
#   index = N*1 + E*2 + S*4 + W*8  (bit set = path continues that way)
#   Arms always cross a border at x/y 10..21, so any two tiles that both
#   connect across a shared edge line up exactly.
# =====================================================================

HALF = 6.0          # path half-width in px  -> 12px wide path


def _wobble(variant, t, phase):
    """Smooth sideways drift along an arm, zero at the tile border (t=0) and at the centre (t=16)."""
    taper = math.sin(math.pi * min(max(t, 0), 16) / 16)
    return 2.2 * NOISES[variant](min(max(t / 16, 0), 1) * 0.9, phase) * taper


def path_value(conn, x, y, variant=0, inside=True):
    px, py = x + 0.5, y + 0.5
    dx, dy = px - 16, py - 16
    n_arms = bin(conn).count('1')
    if n_arms == 0:
        r = 7.5 + (1.2 * NOISES[variant](px / 32, py / 32) if inside else 0)
        return math.hypot(dx, dy) <= r
    # rounded hub
    if math.hypot(dx, dy) <= (HALF + 0.6 if n_arms > 1 else HALF + 0.4):
        return True
    arms = [(1, 'N'), (2, 'E'), (4, 'S'), (8, 'W')]
    for bit, d in arms:
        if not conn & bit:
            continue
        if d in 'NS':
            along = py if d == 'N' else 32 - py          # distance from the border
            if along > 16.5 or along < -40:
                continue
            off = _wobble(variant, along, 0.2 if d == 'N' else 0.7) if inside else 0
            w = HALF + (1.0 * NOISES[variant](along / 16 * 0.5, 0.9) * math.sin(math.pi * min(max(along, 0), 16) / 16) if inside else 0)
            if abs(dx - off) <= w:
                return True
        else:
            along = px if d == 'W' else 32 - px
            if along > 16.5 or along < -40:
                continue
            off = _wobble(variant, along, 0.45 if d == 'W' else 0.05) if inside else 0
            w = HALF + (1.0 * NOISES[variant](along / 16 * 0.5, 0.35) * math.sin(math.pi * min(max(along, 0), 16) / 16) if inside else 0)
            if abs(dy - off) <= w:
                return True
    return False


def _path_fn(conn, variant):
    def m(x, y):
        inside = 0 <= x < 32 and 0 <= y < 32
        return 1 if path_value(conn, x, y, variant, inside) else 0
    return m


def path_tile(conn, variant=0):
    return render_terrain(_path_fn(conn, variant), 'dirt', variant)


def path_mask(conn, variant=0):
    return terrain_mask(_path_fn(conn, variant))


# A narrow path meeting the wide road: (name, road corner index, path connections)
CONNECTORS = [
    ('path_into_road_below', 12, 1 | 4),     # path comes from the north, road fills the bottom
    ('path_into_road_above', 3, 1 | 4),
    ('path_into_road_right', 10, 2 | 8),
    ('path_into_road_left', 5, 2 | 8),
]


def connector(idx, conn, variant=0):
    def m(x, y):
        inside = 0 <= x < 32 and 0 <= y < 32
        return 1 if (corner_value(idx, x, y, variant) > 0.5 or path_value(conn, x, y, variant, inside)) else 0
    return render_terrain(m, 'dirt', variant)


PATH_VARIANTS = 2
PATHS = [[path_tile(i, v) for i in range(16)] for v in range(PATH_VARIANTS)]

# =====================================================================
# Room-building wall kit
#   Room layout (top-down ¾):
#       TL  T   T   T  TR        <- wall caps (top of the wall)
#       L  FACE FACE  FACE R     <- wall faces (inn_wall / window / door / stone)
#       L  floor ...      R
#       BL  B  B  gap  B  BR     <- front wall cap; leave a gap (B_end_*) for a doorway
# =====================================================================

CAP = 8


def _cap_fill(s, x0, y0, x1, y1):
    s.rect(x0, y0, x1, y1, 'b')
    for y in range(y0, y1 + 1, 4):
        for x in range(x0 + (y // 4) % 2 * 3, x1 + 1, 6):
            s.set(x, y, 'B')


def _cap_edge(s, side, x0, y0, x1, y1):
    """Outline + top highlight along the inner edge facing the room."""
    if side == 'bottom':
        s.rect(x0, y1, x1, y1, 'O'); s.rect(x0, y1 - 1, x1, y1 - 1, 'B')
    if side == 'top':
        s.rect(x0, y0, x1, y0, 'O'); s.rect(x0, y0 + 1, x1, y0 + 1, 't')
    if side == 'left':
        s.rect(x0, y0, x0, y1, 'O'); s.rect(x0 + 1, y0, x0 + 1, y1, 't')
    if side == 'right':
        s.rect(x1, y0, x1, y1, 'O'); s.rect(x1 - 1, y0, x1 - 1, y1, 'B')


def wall_cap(kind):
    s = Sprite()
    if kind == 'T':
        _cap_fill(s, 0, 32 - CAP, 31, 31); _cap_edge(s, 'top', 0, 32 - CAP, 31, 31); s.rect(0, 31, 31, 31, 'O')
    elif kind == 'B':
        _cap_fill(s, 0, 0, 31, CAP - 1); _cap_edge(s, 'top', 0, 0, 31, CAP - 1)
        s.rect(0, CAP, 31, CAP + 5, 'B'); s.rect(0, CAP, 31, CAP, 't'); s.rect(0, CAP + 5, 31, CAP + 5, 'b')
        for x in range(0, 32, 4): s.rect(x, CAP + 1, x, CAP + 4, 'b')
        s.rect(0, CAP + 6, 31, CAP + 6, 'O'); s.rect(0, CAP + 7, 31, CAP + 7, 'K')
    elif kind == 'L':
        _cap_fill(s, 32 - CAP, 0, 31, 31); _cap_edge(s, 'left', 32 - CAP, 0, 31, 31); s.rect(31, 0, 31, 31, 'O')
        s.rect(32 - CAP - 1, 0, 32 - CAP - 1, 31, 'O')
    elif kind == 'R':
        _cap_fill(s, 0, 0, CAP - 1, 31); _cap_edge(s, 'right', 0, 0, CAP - 1, 31); s.rect(0, 0, 0, 31, 'O')
        s.rect(CAP, 0, CAP, 31, 'O')
    elif kind == 'TL':
        _cap_fill(s, 32 - CAP, 32 - CAP, 31, 31); s.rect(32 - CAP, 32 - CAP, 31, 32 - CAP, 't'); s.rect(32 - CAP, 32 - CAP, 32 - CAP, 31, 't')
        s.rect(32 - CAP - 1, 32 - CAP - 1, 31, 32 - CAP - 1, 'O'); s.rect(32 - CAP - 1, 32 - CAP - 1, 32 - CAP - 1, 31, 'O')
    elif kind == 'TR':
        _cap_fill(s, 0, 32 - CAP, CAP - 1, 31); s.rect(0, 32 - CAP, CAP - 1, 32 - CAP, 't')
        s.rect(0, 32 - CAP - 1, CAP, 32 - CAP - 1, 'O'); s.rect(CAP, 32 - CAP - 1, CAP, 31, 'O')
    elif kind == 'BL':
        _cap_fill(s, 32 - CAP, 0, 31, CAP - 1); s.rect(32 - CAP, 0, 32 - CAP, CAP - 1, 't')
        s.rect(32 - CAP - 1, 0, 32 - CAP - 1, CAP + 6, 'O')
        s.rect(32 - CAP, CAP, 31, CAP + 5, 'B'); s.rect(32 - CAP, CAP, 31, CAP, 't'); s.rect(32 - CAP, CAP + 5, 31, CAP + 5, 'b')
        s.rect(32 - CAP - 1, CAP + 6, 31, CAP + 6, 'O'); s.rect(32 - CAP, CAP + 7, 31, CAP + 7, 'K')
    elif kind == 'BR':
        _cap_fill(s, 0, 0, CAP - 1, CAP - 1)
        s.rect(CAP, 0, CAP, CAP + 6, 'O')
        s.rect(0, CAP, CAP - 1, CAP + 5, 'B'); s.rect(0, CAP, CAP - 1, CAP, 't'); s.rect(0, CAP + 5, CAP - 1, CAP + 5, 'b')
        s.rect(0, CAP + 6, CAP, CAP + 6, 'O'); s.rect(0, CAP + 7, CAP - 1, CAP + 7, 'K')
    elif kind in ('B_end_L', 'B_end_R'):          # front wall stops here (doorway on the other side)
        s = wall_cap('B')
        if kind == 'B_end_L':                     # wall continues to the left, opening to the right
            for y in range(32):
                for x in range(24, 32): s.px[y][x] = None
            s.rect(23, 0, 23, CAP + 6, 'O'); s.rect(22, 0, 22, CAP + 5, 'B')
        else:
            for y in range(32):
                for x in range(0, 8): s.px[y][x] = None
            s.rect(8, 0, 8, CAP + 6, 'O'); s.rect(9, 0, 9, CAP + 5, 't')
    return s


def wall_face_window():
    s = inn_wall()
    s.rect(8, 5, 23, 17, 'b'); s.rect(9, 6, 22, 16, 'C'); s.rect(9, 6, 22, 7, 'p')
    s.rect(15, 6, 16, 16, 'b'); s.rect(9, 11, 22, 11, 'b')
    s.set(10, 8, 'W'); s.set(11, 8, 'W'); s.set(17, 8, 'W')
    s.rect(6, 4, 8, 18, 'R'); s.rect(23, 4, 25, 18, 'R'); s.rect(6, 4, 25, 4, 'P')       # curtains + rod
    s.rect(7, 5, 7, 18, 'P'); s.rect(24, 5, 24, 18, 'b')
    s.rect(8, 17, 23, 18, 't'); s.rect(8, 18, 23, 18, 'B')                                  # sill
    s.set(11, 16, 'G'); s.set(12, 15, 'P'); s.set(13, 16, 'G')
    return s


def wall_face_door():
    s = inn_wall()
    s.rect(9, 6, 22, 31, 'b'); s.rect(11, 5, 20, 5, 'b')
    s.rect(10, 7, 21, 31, 'B'); s.rect(12, 6, 19, 6, 'B')
    s.rect(15, 7, 16, 31, 'b')
    for y in (12, 22): s.rect(10, y, 21, y, 'b')
    s.set(13, 18, 'y'); s.set(18, 18, 'y')
    s.rect(10, 7, 10, 31, 't')
    return s


def wall_face_stone():
    s = Sprite(); s.rect(0, 0, 31, 31, 'S')
    s.rect(0, 0, 31, 3, 'b'); s.rect(0, 3, 31, 3, 'O')
    for row, y in enumerate(range(4, 30, 4)):
        s.rect(0, y, 31, y, 'e')
        for x in range((row % 2) * 4, 32, 8):
            s.rect(x, y + 1, x, y + 3, 'e')
            s.set((x + 1) % 32, y + 1, 's')
    s.rect(0, 30, 31, 31, 'd'); s.rect(0, 31, 31, 31, 'O')
    return s


def wall_face_shelf():
    s = inn_wall()
    s.rect(3, 12, 28, 13, 'B'); s.rect(3, 12, 28, 12, 't'); s.set(5, 14, 'b'); s.set(26, 14, 'b')
    for x, c in [(5, 'S'), (9, 'y'), (13, 'p'), (19, 'r'), (24, 'G')]:
        s.rect(x, 8, x + 2, 11, c); s.set(x, 8, 'W')
    s.rect(14, 15, 17, 18, 'S') if False else None
    for x in (7, 16, 22):                                                                      # hanging pots
        s.rect(x, 19, x + 3, 22, 'e'); s.rect(x, 19, x + 3, 19, 'd'); s.set(x + 1, 18, 'e')
    return s


def floor_flagstone():
    s = Sprite(); s.rect(0, 0, 31, 31, 'd')
    rnd = random.Random(8)
    slabs = [(0, 0, 11, 9), (12, 0, 31, 7), (0, 10, 7, 21), (8, 10, 20, 17), (21, 8, 31, 17),
             (8, 18, 19, 31), (0, 22, 7, 31), (20, 18, 31, 25), (20, 26, 31, 31)]
    for x0, y0, x1, y1 in slabs:
        c = rnd.choice(['s', 'S', 's'])
        s.rect(x0, y0, x1 - 1, y1 - 1, c)
        s.rect(x0, y0, x1 - 1, y0, 'p' if c == 's' else 's')
        s.rect(x1 - 1, y0, x1 - 1, y1 - 1, 'S' if c == 's' else 'e')
    return s


def floor_tiles():
    s = Sprite()
    for ty in range(4):
        for tx in range(4):
            c = 'r' if (tx + ty) % 2 == 0 else 't'
            s.rect(tx * 8, ty * 8, tx * 8 + 7, ty * 8 + 7, c)
            s.rect(tx * 8, ty * 8, tx * 8 + 7, ty * 8, 'k' if c == 't' else 'y' if False else 't')
            s.rect(tx * 8 + 7, ty * 8, tx * 8 + 7, ty * 8 + 7, 'B')
    return s


WALL_KIT = [('wall_cap_TL', lambda: wall_cap('TL')), ('wall_cap_T', lambda: wall_cap('T')), ('wall_cap_TR', lambda: wall_cap('TR')),
            ('wall_cap_L', lambda: wall_cap('L')), ('wall_cap_R', lambda: wall_cap('R')),
            ('wall_cap_BL', lambda: wall_cap('BL')), ('wall_cap_B', lambda: wall_cap('B')), ('wall_cap_BR', lambda: wall_cap('BR')),
            ('wall_cap_B_end_L', lambda: wall_cap('B_end_L')), ('wall_cap_B_end_R', lambda: wall_cap('B_end_R')),
            ('wall_face', inn_wall), ('wall_face_window', wall_face_window), ('wall_face_door', wall_face_door),
            ('wall_face_shelf', wall_face_shelf), ('wall_face_stone', wall_face_stone),
            ('floor_flagstone', floor_flagstone), ('floor_tiles', floor_tiles)]

# =====================================================================
# Wild crops / forage nodes: each has a 'ready' and a 'harvested' state
# =====================================================================

def _tuft(s, x, y, h, c='g', tip='G'):
    for i in range(h): s.set(x, y - i, c)
    s.set(x, y - h, tip)


def _grass_base(s, cx=16, cy=26, rx=9):
    for i, x in enumerate(range(cx - rx, cx + rx + 1, 2)):
        _tuft(s, x, cy, 2 + (i * 7) % 3)


def wild_wheat(ready=True):
    s = Sprite()
    for i, x in enumerate(range(8, 25, 2)):
        h = 10 + (i * 5) % 5
        for k in range(h): s.set(x + (k // 6) * (1 if i % 2 else -1), 26 - k, 'h' if k < 5 else 'H')
        tx = x + (h // 6) * (1 if i % 2 else -1)
        if ready:
            for k in range(4): s.set(tx, 26 - h - k, 'y' if k % 2 else 't'); s.set(tx + 1, 26 - h - k + 1, 't' if k % 2 else 'y')
        else:
            s.set(tx, 26 - h, 'h')
    if not ready:
        for i in range(4):
            s.rect(9 + i * 4, 24, 10 + i * 4, 26, 'H')
    s.outline()
    return _with_shadow(s, 16, 28, 9, 1.2)


def berry_bush(ready=True):
    s = Sprite()
    _foliage(s, [(16, 20, 7), (10, 22, 4.5), (22, 22, 4.5), (16, 15, 4.5)])
    if ready:
        for x, y in [(11, 19), (15, 14), (19, 18), (13, 23), (21, 22), (17, 21), (9, 22), (23, 19)]:
            s.set(x, y, 'v'); s.set(x + 1, y, 'v'); s.set(x, y + 1, 'n'); s.set(x + 1, y + 1, 'v'); s.set(x, y, 'm')
    s.outline()
    return _with_shadow(s, 16, 28, 10, 1.6)


def mushroom_patch(ready=True):
    s = Sprite()
    if ready:
        for cx, cy, r in [(12, 22, 4), (19, 20, 5), (23, 25, 3), (15, 26, 2.5)]:
            for y in range(int(cy - r), int(cy + 1)):
                for x in range(int(cx - r - 1), int(cx + r + 2)):
                    nx, ny = (x + 0.5 - cx) / (r + 0.6), (y + 0.5 - cy) / (r * 0.75)
                    if nx * nx + ny * ny <= 1:
                        s.set(x, y, 'P' if nx < -0.3 and ny < -0.4 else 'R')
            s.rect(int(cx) - 1, int(cy) + 1, int(cx) + 1, int(cy + r * 0.7) + 1, 'k')
            s.set(int(cx - r / 2), int(cy - r / 2), 'W'); s.set(int(cx + r / 3), int(cy - r * 0.6), 'W')
    _grass_base(s, 16, 28, 9)
    s.rect(9, 27, 11, 27, 'B'); s.rect(20, 27, 22, 27, 'b')                                # log scraps
    s.outline()
    return _with_shadow(s, 16, 29, 10, 1.2)


def herb_patch(ready=True):
    s = Sprite()
    rnd = random.Random(3)
    for x in range(9, 24, 2):
        h = rnd.randint(5, 9) if ready else 2
        for i in range(h): s.set(x, 26 - i, 'g')
        if ready:
            for i in range(2, h, 2):
                s.set(x - 1, 26 - i, 'G'); s.set(x + 1, 25 - i, 'L')
            if x % 4 == 1: s.set(x, 26 - h, 'W')
    s.outline()
    return _with_shadow(s, 16, 28, 9, 1.2)


def _root_patch(ready, root, root_dk, leaf):
    s = Sprite()
    s.ellipse(16, 25, 10, 3, 'B'); s.ellipse(16, 24.5, 8.5, 2, 'b')                        # dug soil mound
    for x in (9, 14, 19, 24):
        s.set(x, 25, 't')
    if ready:
        for cx in (11, 21):
            s.rect(cx - 1, 23, cx + 1, 24, root); s.set(cx + 1, 24, root_dk); s.set(cx, 25, root_dk)
            for i in range(6): s.set(cx, 22 - i, leaf)                       # centre stalk
            for i in range(4):
                s.set(cx - 1 - i, 21 - i, leaf); s.set(cx + 1 + i, 21 - i, leaf)  # side stalks fan out
            for x, y in [(cx, 16), (cx - 5, 17), (cx + 5, 17), (cx - 2, 18), (cx + 2, 18)]:
                s.set(x, y, 'L')
    else:
        for cx in (11, 21): s.set(cx, 23, 'b'); s.set(cx, 22, 'b')
    s.outline()
    return _with_shadow(s, 16, 28, 11, 1.2)


def carrot_patch(ready=True): return _root_patch(ready, 'r', 'B', 'G')
def potato_patch(ready=True): return _root_patch(ready, 't', 'B', 'g')
def onion_patch(ready=True): return _root_patch(ready, 'm', 'v', 'T')


def tomato_vine(ready=True):
    s = Sprite()
    s.rect(15, 6, 16, 27, 'B'); s.rect(16, 6, 16, 27, 'b')                                 # stake
    _foliage(s, [(13, 12, 4), (19, 16, 4.5), (13, 20, 4.5), (19, 23, 3.5)])
    if ready:
        for cx, cy in [(11, 14), (21, 18), (14, 22), (19, 11)]:
            s.ellipse(cx, cy, 1.7, 1.7, 'R'); s.set(cx - 1, cy - 1, 'r')
    s.outline()
    return _with_shadow(s, 16, 28, 8, 1.2)


def apple_tree(ready=True):
    s = tree()
    if ready:
        for x, y in [(10, 12), (20, 9), (14, 16), (22, 15), (17, 6), (8, 17)]:
            s.set(x, y, 'R'); s.set(x + 1, y, 'R'); s.set(x, y + 1, 'b'); s.set(x + 1, y + 1, 'R'); s.set(x, y, 'P')
    return s


def bird_nest(ready=True):
    s = Sprite()
    s.ellipse(16, 22, 9, 4.5, 'B'); s.ellipse(16, 21, 7, 2.6, 'b')
    for x in range(8, 25, 2):
        s.set(x, 22 + (x % 3), 't'); s.set(x + 1, 24, 'H')
    for x, y in [(7, 20), (25, 21), (9, 25), (23, 25)]: s.set(x, y, 't')
    if ready:
        for cx in (13, 18, 15.5):
            cy = 20 if cx != 15.5 else 19
            s.ellipse(cx, cy, 2.2, 2.6, 'k'); s.set(int(cx) - 1, cy - 1, 'W')
    s.outline()
    return _with_shadow(s, 16, 27, 10, 1.2)


def beehive(ready=True):
    s = Sprite()
    s.rect(15, 24, 16, 27, 'B')                                                               # post
    for i, (rx, y) in enumerate([(5, 9), (7, 12), (8, 15), (8, 18), (7, 21), (5, 23)]):
        s.ellipse(16, y, rx, 1.8, 'y' if i % 2 == 0 else 'H')
    for y in (11, 14, 17, 20, 23):
        for x in range(6, 27):
            if s.get(x, y) in ('y', 'H') and (x + y) % 2: s.set(x, y, 'H')
    s.ellipse(16, 19, 1.6, 1.4, 'K')
    if ready:
        s.rect(13, 21, 19, 22, 'r'); s.set(14, 23, 'r'); s.set(18, 23, 'r'); s.set(18, 24, 'y')   # honey drip
        for x, y in [(23, 8), (8, 11), (25, 15)]:
            s.set(x, y, 'y'); s.set(x + 1, y, 'K'); s.set(x, y - 1, 'W')
    s.outline()
    return _with_shadow(s, 16, 28, 7, 1.0)


def fishing_spot(ready=True):
    s = Sprite()
    if ready:
        s.ellipse(16, 18, 9, 3.2, 'c'); s.ellipse(16, 18, 7.5, 2.2, 'u'); s.ellipse(16, 18, 5.5, 1.5, 'c')
        s.ellipse(16, 18, 4, 0.9, 'n')
        s.ellipse(17, 18, 3, 0.8, 'n'); s.set(21, 17, 'n'); s.set(21, 19, 'n')               # fish shadow
        for x, y in [(9, 14), (23, 13), (12, 22)]: s.set(x, y, 'W'); s.set(x + 1, y, 'p')
    else:
        s.ellipse(16, 18, 8, 2.2, 'c'); s.ellipse(16, 18, 6.5, 1.2, None) if False else None
        for x in range(8, 25):
            if s.get(x, 18) == 'c' and 10 < x < 22: s.set(x, 18, None)
    return s


def oak_tree(ready=True):
    s = Sprite()
    s.rect(14, 18, 18, 27, 'B'); s.rect(17, 18, 18, 27, 'b'); s.set(13, 27, 'B'); s.set(19, 27, 'b')
    _foliage(s, [(16, 11, 8), (9, 14, 5), (23, 14, 5), (12, 6, 5), (20, 6, 5)], dark='o', mid='g', light='h')
    if ready:
        for x, y in [(10, 12), (19, 9), (14, 15), (22, 14), (16, 5)]:
            s.set(x, y, 'B'); s.set(x, y + 1, 't'); s.set(x, y - 1, 'H')
    s.outline()
    return _with_shadow(s, 16, 28, 9, 2.2)


def cress_patch(ready=True):
    s = Sprite()
    s.ellipse(16, 24, 11, 3.5, 'c'); s.ellipse(16, 24, 9, 2.4, 'u'); s.set(10, 24, 'p'); s.set(21, 23, 'p')
    for x in range(8, 25, 2):
        h = (5 + (x * 7) % 4) if ready else 1
        for k in range(h): s.set(x, 23 - k, 'g')
        if ready: s.rect(x - 1, 23 - h, x + 1, 23 - h, 'G'); s.set(x, 22 - h, 'L')
    s.outline()
    return s


def game_trail(ready=True):
    s = Sprite()
    for x, y in [(8, 24), (12, 21), (16, 24), (20, 21), (24, 24)]:
        s.rect(x, y, x + 1, y + 1, 'b'); s.set(x + 2, y + 1, 'b')
    s.rect(4, 18, 27, 19, 'B') if False else None
    if ready:
        s.rect(13, 12, 19, 16, 'B'); s.rect(13, 12, 19, 12, 't'); s.rect(14, 17, 18, 18, 'b')     # bundle on a snare stake
        s.rect(20, 8, 21, 19, 'B'); s.rect(19, 9, 22, 9, 'k'); s.set(16, 14, 'R'); s.set(15, 14, 'R')
    else:
        s.rect(20, 8, 21, 19, 'B'); s.rect(19, 9, 22, 9, 'k'); s.rect(15, 18, 18, 19, 'k')
    s.outline()
    return _with_shadow(s, 16, 26, 8, 1.2)


def water_well(ready=True):
    """Small stone well. Ready: a full bucket sits on the rim. Harvested: the bucket is down the well."""
    s = Sprite()
    s.ellipse(16, 25, 10, 3.6, 'e'); s.rect(6, 17, 26, 25, 'S'); s.ellipse(16, 17, 10, 3.6, 's')
    for y in (19, 22):
        for x in range(7 + (y % 2) * 2, 26, 4): s.set(x, y, 'e'); s.set(x, y + 1, 'e')
    s.ellipse(16, 17, 7.6, 2.2, 'n'); s.ellipse(16, 17.4, 6, 1.4, 'c'); s.set(13, 17, 'u')
    s.rect(7, 6, 8, 17, 'B'); s.rect(24, 6, 25, 17, 'b'); s.rect(6, 5, 26, 6, 'b'); s.rect(6, 5, 26, 5, 't')
    if ready:
        s.rect(16, 7, 16, 9, 't')
        s.rect(20, 13, 25, 17, 'B'); s.rect(20, 13, 25, 13, 't'); s.rect(20, 15, 25, 15, 'b'); s.ellipse(22.5, 13.5, 2.2, 0.8, 'c')
        s.set(22, 13, 'u')
    else:
        s.rect(16, 7, 16, 16, 't')
    s.outline()
    return _with_shadow(s, 16, 27, 10, 1.4)


def oat_patch(ready=True):
    """Wild oats: slender green-gold stems, each tip hung with drooping golden spikelets (wild_wheat has upright ears)."""
    s = Sprite()
    for i, x in enumerate(range(8, 25, 4)):
        h = 12 + (i * 3) % 4
        for k in range(h): s.set(x + (1 if k > 8 else 0), 26 - k, 'h' if k < 6 else 'H')
        tx, ty = x + 1, 26 - h
        if ready:
            for dx, dy in ((1, 1), (2, 3), (-1, 2), (-2, 4), (1, 5)):
                s.set(tx + dx, ty + dy, 'y'); s.set(tx + dx, ty + dy + 1, 'H')
        else:
            s.set(tx, ty, 'H')
    if not ready:
        for i in range(4): s.rect(9 + i * 4, 24, 10 + i * 4, 26, 'H')
    s.outline()
    return _with_shadow(s, 16, 28, 9, 1.2)

FORAGE = [
    # name, builder, yields
    ('wild_wheat', wild_wheat, 'wheat'), ('berry_bush', berry_bush, 'berries'), ('mushroom_patch', mushroom_patch, 'mushroom'),
    ('herb_patch', herb_patch, 'herbs'), ('carrot_patch', carrot_patch, 'carrot'), ('potato_patch', potato_patch, 'potato'),
    ('onion_patch', onion_patch, 'onion'), ('tomato_vine', tomato_vine, 'tomato'), ('apple_tree', apple_tree, 'apple'),
    ('oak_tree', lambda ready=True: oak_tree(ready), 'acorns'), ('cress_patch', lambda ready=True: cress_patch(ready), 'cress'),
    ('game_trail', lambda ready=True: game_trail(ready), 'venison'),
    ('bird_nest', bird_nest, 'egg'), ('beehive', beehive, 'honey'), ('fishing_spot', fishing_spot, 'trout'),
    ('water_well', water_well, 'water'),
    ('oat_patch', oat_patch, 'oats'),
]
