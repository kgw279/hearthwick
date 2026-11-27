"""Batch 6: full interior kit.

- Wall caps in wood and stone: outer corners, inner corners, side-door ends,
  and material transitions (wood <-> stone) for every straight run.
- Wall faces in plaster and stone (+ window / door / shelf on both) and
  plaster <-> stone face transitions.
- Floor transition sets (dual-grid, 16 tiles): wood <-> flagstone, wood <-> terracotta.
- Stairs up / stairs down (a linked pair between two room scenes).
- Furniture and wall decorations.
"""
from core import Sprite
from sprites import TILES, _with_shadow
from sprites3 import inn_wall
from sprites5 import wall_cap, wall_face_stone, floor_flagstone, floor_tiles

MATERIALS = ('wood', 'stone')
STONE_MAP = {'b': 'S', 'B': 'e', 't': 's'}


def _overlay(a, b):
    out = a.copy()
    for y in range(32):
        for x in range(32):
            if b.px[y][x] is not None:
                out.px[y][x] = b.px[y][x]
    return out


def _clear(s, x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            s.px[y][x] = None


def cap(kind, mat='wood'):
    """All cap pieces. kind: TL T TR L R BL B BR B_end_L B_end_R
    L_end_top L_end_bottom R_end_top R_end_bottom inner_T_L inner_T_R inner_B_L inner_B_R"""
    if kind.startswith('inner_'):
        _, a, b = kind.split('_')
        s = _overlay(wall_cap(a), wall_cap(b))
    elif kind in ('L_end_top', 'L_end_bottom', 'R_end_top', 'R_end_bottom'):
        side, _, which = kind.split('_')
        s = wall_cap(side)
        x0, x1 = (23, 31) if side == 'L' else (0, 8)
        if which == 'bottom':           # wall comes down from above and stops: opening below
            _clear(s, x0, 21, x1, 31)
            s.rect(x0, 20, x1, 20, 'O'); s.rect(x0 + 1, 19, x1 - 1, 19, 'B')
            s.rect(x0, 21, x1, 21, 'K')
        else:                           # wall starts here and continues down: opening above
            _clear(s, x0, 0, x1, 9)
            s.rect(x0, 10, x1, 10, 'O'); s.rect(x0 + 1, 11, x1 - 1, 11, 't')
    else:
        s = wall_cap(kind)
    return s.remap(STONE_MAP) if mat == 'stone' else s


def cap_transition(kind, a, b):
    """Straight cap that changes material halfway. T/B: left=a, right=b. L/R: top=a, bottom=b."""
    sa, sb = cap(kind, a), cap(kind, b)
    out = sa.copy()
    if kind in ('T', 'B'):
        for y in range(32):
            for x in range(16, 32):
                out.px[y][x] = sb.px[y][x]
        for y in range(32):
            if out.px[y][15] not in (None, 'K') and out.px[y][16] not in (None, 'K') and out.px[y][15] != 'O':
                out.px[y][15] = 'O'
    else:
        for y in range(16, 32):
            out.px[y] = sb.px[y][:]
        for x in range(32):
            if out.px[15][x] not in (None, 'O'):
                out.px[15][x] = 'O'
    return out


# ---------------------------------------------------------------------
# Wall faces
# ---------------------------------------------------------------------

def _window(s, frame='b'):
    s.rect(8, 5, 23, 17, frame); s.rect(9, 6, 22, 16, 'C'); s.rect(9, 6, 22, 7, 'p')
    s.rect(15, 6, 16, 16, frame); s.rect(9, 11, 22, 11, frame)
    s.set(10, 8, 'W'); s.set(11, 8, 'W'); s.set(17, 8, 'W')
    s.rect(6, 4, 8, 18, 'R'); s.rect(23, 4, 25, 18, 'R'); s.rect(6, 4, 25, 4, 'P')
    s.rect(7, 5, 7, 18, 'P'); s.rect(24, 5, 24, 18, 'b')
    s.rect(8, 17, 23, 18, 't'); s.rect(8, 18, 23, 18, 'B')
    s.set(11, 16, 'G'); s.set(12, 15, 'P'); s.set(13, 16, 'G')
    return s


def _door(s):
    s.rect(9, 6, 22, 31, 'b'); s.rect(11, 5, 20, 5, 'b')
    s.rect(10, 7, 21, 31, 'B'); s.rect(12, 6, 19, 6, 'B')
    s.rect(15, 7, 16, 31, 'b')
    for y in (12, 22): s.rect(10, y, 21, y, 'b')
    s.set(13, 18, 'y'); s.set(18, 18, 'y')
    s.rect(10, 7, 10, 31, 't')
    return s


def _shelf(s):
    s.rect(3, 12, 28, 13, 'B'); s.rect(3, 12, 28, 12, 't'); s.set(5, 14, 'b'); s.set(26, 14, 'b')
    for x, c in [(5, 'S'), (9, 'y'), (13, 'p'), (19, 'r'), (24, 'G')]:
        s.rect(x, 8, x + 2, 11, c); s.set(x, 8, 'W')
    for x in (7, 16, 22):
        s.rect(x, 19, x + 3, 22, 'e'); s.rect(x, 19, x + 3, 19, 'd'); s.set(x + 1, 18, 'e')
    return s


def face(kind, mat='plaster'):
    base = inn_wall() if mat == 'plaster' else wall_face_stone()
    if kind == 'plain': return base
    if kind == 'window': return _window(base, 'b' if mat == 'plaster' else 'e')
    if kind == 'door': return _door(base)
    if kind == 'shelf': return _shelf(base)


def face_transition(a, b):
    sa, sb = face('plain', a), face('plain', b)
    out = sa.copy()
    for y in range(32):
        for x in range(16, 32):
            out.px[y][x] = sb.px[y][x]
    out.rect(14, 4, 17, 31, 'b'); out.rect(14, 4, 14, 31, 't'); out.rect(17, 4, 17, 31, 'O')   # timber post hides the joint
    out.rect(13, 0, 18, 3, 'b')
    return out


# ---------------------------------------------------------------------
# Floor transitions (dual grid: each tile quadrant takes its corner's material)
#   index = TL*1 + TR*2 + BL*4 + BR*8, bit set = second material
# ---------------------------------------------------------------------

FLOOR_TEX = {'wood': lambda: dict(TILES)['wood_floor'](), 'flagstone': floor_flagstone, 'terracotta': floor_tiles}
EDGE = {'wood': 'H', 'flagstone': 'e', 'terracotta': 'B'}


def floor_transition(idx, a, b):
    ta, tb = FLOOR_TEX[a](), FLOOR_TEX[b]()
    bits = [(idx >> i) & 1 for i in range(4)]

    def mat(x, y):
        q = (1 if x >= 16 else 0) + (2 if y >= 16 else 0)
        return bits[q]

    s = Sprite()
    for y in range(32):
        for x in range(32):
            m = mat(x, y)
            s.px[y][x] = (tb if m else ta).px[y][x]
    for y in range(32):
        for x in range(32):
            m = mat(x, y)
            nbs = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < 32 and 0 <= y + dy < 32]
            if any(mat(*p) != m for p in nbs):
                s.px[y][x] = EDGE[b] if m else EDGE[a]
                if not m and any(mat(*p) != m and p[1] < y for p in nbs):
                    s.px[y][x] = 'O'          # stone/tile edge drops a shadow onto the wood below it
    return s


FLOOR_PAIRS = [('wood', 'flagstone'), ('wood', 'terracotta')]

# ---------------------------------------------------------------------
# Stairs: a linked pair. stairs_up sits in a back wall (1x2 tiles: wall face
# row + floor row). Walking into its top half loads the upper room, where
# the player appears at stairs_down; stairs_down leads back.
# ---------------------------------------------------------------------

def stairs_up():
    s = Sprite(32, 64)
    wall = inn_wall()
    for y in range(32):
        s.px[y] = wall.px[y][:]
    s.rect(6, 4, 25, 31, 'b'); s.rect(8, 5, 23, 31, 'K'); s.rect(9, 4, 22, 4, 'b')        # opening in the wall
    steps = 9
    for i in range(steps):                                                             # steps rise into the opening
        y1 = 61 - i * 6; y0 = y1 - 5
        inset = i // 2
        x0, x1 = 6 + inset, 25 - inset
        dark = i >= steps - 3
        s.rect(x0, y0, x1, y0 + 1, 'B' if dark else 't')                               # tread
        s.rect(x0, y0 + 2, x1, y1, 'b' if dark else 'B')                               # riser
        s.rect(x0, y0, x1, y0, 'B' if dark else 'k')
        s.rect(x0, y1, x1, y1, 'O')
    for side in (0, 1):                                                                # stringers + rail
        for i in range(steps):
            y1 = 61 - i * 6
            x = (5 + i // 2) if side == 0 else (26 - i // 2)
            for y in range(y1 - 5, y1 + 1):
                s.set(x, y, 'b')
            s.set(x + (-1 if side == 0 else 1), y1 - 5, 'O')
        for i in range(0, steps, 2):
            y1 = 61 - i * 6
            x = (4 + i // 2) if side == 0 else (27 - i // 2)
            s.rect(x, y1 - 8, x, y1, 'B'); s.set(x, y1 - 9, 'H')
    for y in range(64):
        for x in range(32):
            if y >= 32 and s.px[y][x] is None:
                pass
    s.rect(4, 62, 27, 63, 'K')
    return s


def stairs_down():
    s = Sprite()
    s.rect(3, 3, 28, 28, 'O'); s.rect(4, 4, 27, 27, 'b')
    shades = ['K', 'K', 'n', 'b', 'b', 'B', 'B', 't']
    for i, c in enumerate(shades):                                                    # steps fall away from the viewer
        y0 = 5 + i * 3
        s.rect(6, y0, 25, y0 + 2, c)
        if c in ('B', 't', 'b'):
            s.rect(6, y0, 25, y0, 'k' if c == 't' else 't' if c == 'B' else 'B')
    s.rect(4, 4, 5, 27, 'B'); s.rect(26, 4, 27, 27, 'b')                              # side walls of the well
    for x in (3, 28):                                                                 # railings
        for y in range(4, 28, 6):
            s.rect(x, y, x, y + 2, 'H')
    s.rect(3, 2, 28, 2, 't'); s.rect(3, 2, 3, 28, 't'); s.rect(28, 2, 28, 28, 'B')
    s.rect(2, 1, 29, 1, 'O'); s.rect(2, 1, 2, 29, 'O'); s.rect(29, 1, 29, 29, 'O')
    s.rect(3, 29, 28, 29, 'k'); s.rect(3, 30, 28, 30, 'O')                            # top lip nearest the viewer
    return s

# ---------------------------------------------------------------------
# Furniture
# ---------------------------------------------------------------------

def long_table(part):
    """Seamless long table: left end, middle (repeat), right end."""
    s = Sprite()
    s.rect(0, 13, 31, 19, 't'); s.rect(0, 13, 31, 13, 'k')
    for y in (16, 18): s.rect(0, y, 31, y, 'H')
    s.rect(0, 20, 31, 21, 'B'); s.rect(0, 21, 31, 21, 'b')
    if part == 'left':
        _clear(s, 0, 0, 3, 31); s.rect(5, 22, 6, 27, 'b'); s.rect(5, 22, 5, 27, 'B')
    if part == 'right':
        _clear(s, 28, 0, 31, 31); s.rect(25, 22, 26, 27, 'b'); s.rect(25, 22, 25, 27, 'B')
    if part == 'middle':
        s.ellipse(9, 16, 3, 1.3, 'W'); s.ellipse(9, 16, 1.4, 0.5, 'y')
        s.rect(20, 13, 22, 16, 'W'); s.rect(20, 13, 22, 13, 'p')
    else:
        s.rect(14 if part == 'left' else 15, 11, 14 if part == 'left' else 15, 14, 'k'); s.set(14 if part == 'left' else 15, 10, 'y')
    s.outline()
    for x in ((31,) if part == 'left' else (0,) if part == 'right' else (0, 31)):
        for y in range(32):
            if s.px[y][x] == 'O' and 13 <= y <= 21:
                s.px[y][x] = s.px[y][1 if x == 0 else 30]
    for y in (22,):
        for x in range(32):
            if s.px[y][x] == 'O' and s.px[21][x] in ('b',):
                pass
    return s


def bench(part='middle'):
    s = Sprite()
    s.rect(0, 22, 31, 24, 't'); s.rect(0, 22, 31, 22, 'k'); s.rect(0, 25, 31, 25, 'B')
    if part == 'left':
        _clear(s, 0, 0, 4, 31); s.rect(6, 26, 7, 28, 'b')
    elif part == 'right':
        _clear(s, 27, 0, 31, 31); s.rect(24, 26, 25, 28, 'b')
    s.outline()
    for x in ((31,) if part == 'left' else (0,) if part == 'right' else (0, 31)):
        for y in range(32):
            if s.px[y][x] == 'O' and 22 <= y <= 25:
                s.px[y][x] = s.px[y][1 if x == 0 else 30]
    return s


def bookshelf():
    s = Sprite()
    s.rect(5, 2, 26, 27, 'b'); s.rect(6, 3, 25, 26, 'B'); s.rect(5, 2, 26, 2, 't')
    for y0 in (4, 12, 20):
        s.rect(7, y0, 24, y0 + 6, 'K')
        x = 7
        for i, c in enumerate('RuGHvrTnPy'):
            w = 1 + (i * 3 + y0) % 2
            if x + w > 24: break
            h = 4 + (i + y0) % 3
            s.rect(x, y0 + 6 - h + 1, x + w - 1, y0 + 6, c); s.set(x, y0 + 6 - h + 1, 'k' if c not in 'yk' else 'W')
            x += w + (1 if i % 4 == 3 else 0)
        s.rect(6, y0 + 7, 25, y0 + 7, 't')
    s.outline()
    return _with_shadow(s, 16, 29, 11, 1.0)


def cupboard():
    s = Sprite()
    s.rect(5, 4, 26, 27, 'B'); s.rect(5, 4, 26, 5, 't')
    s.rect(7, 7, 24, 14, 'K')
    for x, c in [(8, 'W'), (12, 'p'), (16, 'W'), (20, 'p')]:
        s.ellipse(x + 1.5, 11, 2, 2.6, c); s.set(x + 1, 11, 'c')
    s.rect(7, 15, 24, 15, 't')
    s.rect(7, 17, 15, 26, 'b'); s.rect(8, 18, 14, 25, 'B'); s.rect(16, 17, 24, 26, 'b'); s.rect(17, 18, 23, 25, 'B')
    s.set(14, 21, 'y'); s.set(17, 21, 'y')
    s.outline()
    return _with_shadow(s, 16, 29, 11, 1.0)


def wardrobe():
    s = Sprite()
    s.rect(6, 1, 25, 27, 'B'); s.rect(6, 1, 25, 2, 't'); s.rect(5, 3, 26, 3, 'b')
    s.rect(8, 5, 15, 25, 'b'); s.rect(9, 6, 14, 24, 'B'); s.rect(16, 5, 23, 25, 'b'); s.rect(17, 6, 22, 24, 'B')
    for (x0, x1) in ((9, 14), (17, 22)):
        s.rect(x0 + 1, 8, x1 - 1, 12, 't'); s.rect(x0 + 1, 16, x1 - 1, 21, 't')
    s.set(14, 15, 'y'); s.set(17, 15, 'y')
    s.outline()
    return _with_shadow(s, 16, 29, 11, 1.0)


def armchair():
    s = Sprite()
    s.rect(9, 8, 22, 18, 'R'); s.rect(9, 8, 22, 9, 'P'); s.rect(10, 10, 21, 10, 'P')
    s.rect(6, 14, 9, 24, 'R'); s.rect(22, 14, 25, 24, 'R'); s.rect(6, 14, 9, 14, 'P'); s.rect(22, 14, 25, 14, 'P')
    s.rect(10, 18, 21, 23, 'P'); s.rect(10, 18, 21, 18, 'm') if False else None
    s.rect(10, 22, 21, 24, 'R'); s.rect(7, 25, 8, 27, 'b'); s.rect(23, 25, 24, 27, 'b')
    s.rect(12, 12, 15, 15, 'y'); s.rect(12, 12, 15, 12, 'W')                                 # cushion
    s.outline()
    return _with_shadow(s, 16, 28, 10, 1.2)


def runner(part):
    """Long rug, seamless horizontally: left end, middle, right end."""
    s = Sprite()
    s.rect(0, 10, 31, 21, 'R'); s.rect(0, 11, 31, 11, 'y'); s.rect(0, 20, 31, 20, 'y')
    for x in range(0, 32, 8):
        for i in range(4):
            s.set(x + 3 + i, 15 - (i if i < 2 else 3 - i), 'P'); s.set(x + 3 + i, 16 + (i if i < 2 else 3 - i), 'P')
    s.rect(0, 10, 31, 10, 'b'); s.rect(0, 21, 31, 21, 'b')
    if part == 'left':
        _clear(s, 0, 0, 3, 31); s.rect(4, 10, 4, 21, 'b')
        for y in range(11, 21, 2): s.set(3, y, 'k'); s.set(2, y, 'k')
    if part == 'right':
        _clear(s, 28, 0, 31, 31); s.rect(27, 10, 27, 21, 'b')
        for y in range(11, 21, 2): s.set(28, y, 'k'); s.set(29, y, 'k')
    return s


def doormat():
    s = Sprite()
    s.rect(7, 18, 24, 27, 'H'); s.rect(8, 19, 23, 26, 't')
    for y in range(20, 26, 2): s.rect(9, y, 22, y, 'H')
    s.outline('b')
    return s


# wall decorations: transparent overlays placed on top of any wall face tile
def deco_painting():
    s = Sprite()
    s.rect(9, 5, 22, 15, 'H'); s.rect(10, 6, 21, 14, 'c'); s.rect(10, 11, 21, 14, 'G')
    s.rect(14, 9, 17, 12, 'G'); s.ellipse(18, 8, 1.5, 1.5, 'y'); s.rect(10, 13, 21, 14, 'g')
    s.rect(9, 5, 22, 5, 'y')
    s.outline()
    return s


def deco_sconce():
    s = Sprite()
    s.rect(15, 11, 16, 14, 'e'); s.rect(13, 14, 18, 15, 'e'); s.rect(15, 8, 16, 10, 'k')
    s.set(15, 7, 'y'); s.set(16, 7, 'r'); s.set(15, 6, 'y')
    s.outline()
    for x, y in [(12, 6), (19, 6), (13, 4), (18, 4), (11, 9), (20, 9)]: s.set(x, y, 'y') if s.get(x, y) is None else None
    return s


def deco_menu_board():
    s = Sprite()
    s.rect(8, 4, 23, 17, 'B'); s.rect(9, 5, 22, 16, 'D')
    for y, w in ((7, 10), (10, 8), (13, 11)): s.rect(11, y, 10 + w, y, 'W' if y == 7 else 's')
    s.set(11, 7, 'y'); s.set(20, 10, 'y')
    s.rect(14, 2, 17, 3, 'e')
    s.outline()
    return s


def deco_banner():
    s = Sprite()
    s.rect(10, 3, 21, 3, 'B')
    s.rect(11, 4, 20, 17, 'v'); s.rect(11, 4, 20, 5, 'm')
    for i in range(3): s.set(11 + i, 18 + i, 'v'); s.set(20 - i, 18 + i, 'v')
    s.rect(14, 18, 17, 18, 'v'); s.rect(15, 19, 16, 19, 'v')
    s.set(15, 9, 'y'); s.set(16, 9, 'r'); s.rect(14, 10, 17, 11, 'r'); s.rect(15, 10, 16, 10, 'y'); s.rect(14, 12, 17, 12, 'b')  # hearth flame crest
    s.outline()
    return s


def floor_lamp():
    s = Sprite()
    s.rect(15, 10, 16, 26, 'e'); s.rect(12, 26, 19, 27, 'e')
    s.rect(11, 4, 20, 9, 'k'); s.rect(11, 4, 20, 4, 'W'); s.rect(12, 9, 19, 9, 't')
    s.rect(13, 5, 18, 8, 'y')
    s.outline()
    return _with_shadow(s, 16, 28, 5, 1.0)


def barrel_stack():
    s = Sprite()
    for cx, cy in ((10, 21), (22, 21), (16, 12)):
        s.ellipse(cx, cy, 6, 5.5, 'B')
        s.ellipse(cx, cy, 4.6, 4.2, 't'); s.ellipse(cx, cy, 3.4, 3.0, 'B'); s.ellipse(cx - 1, cy - 1, 1.4, 1.2, 'k')
    s.outline()
    return _with_shadow(s, 16, 28, 12, 1.4)


# ---------------------------------------------------------------------
CAP_KINDS = ['TL', 'T', 'TR', 'L', 'R', 'BL', 'B', 'BR', 'B_end_L', 'B_end_R',
             'L_end_top', 'L_end_bottom', 'R_end_top', 'R_end_bottom',
             'inner_T_L', 'inner_T_R', 'inner_B_L', 'inner_B_R']

WALL_KIT2 = (
    [(f'cap_{mat}_{k}', (lambda k=k, mat=mat: cap(k, mat))) for mat in MATERIALS for k in CAP_KINDS]
    + [(f'cap_{k}_{a}_to_{b}', (lambda k=k, a=a, b=b: cap_transition(k, a, b)))
       for k in ('T', 'B', 'L', 'R') for a, b in (('wood', 'stone'), ('stone', 'wood'))]
    + [(f'face_{m}_{k}', (lambda k=k, m=m: face(k, m))) for m in ('plaster', 'stone') for k in ('plain', 'window', 'door', 'shelf')]
    + [('face_plaster_to_stone', lambda: face_transition('plaster', 'stone')),
       ('face_stone_to_plaster', lambda: face_transition('stone', 'plaster'))]
)

FLOOR_TRANSITIONS = [(f'floor_{a}_{b}_{i:02d}', (lambda i=i, a=a, b=b: floor_transition(i, a, b)))
                     for a, b in FLOOR_PAIRS for i in range(16)]

FURNITURE = [
    ('long_table_left', lambda: long_table('left')), ('long_table_middle', lambda: long_table('middle')),
    ('long_table_right', lambda: long_table('right')),
    ('bench_left', lambda: bench('left')), ('bench_middle', lambda: bench('middle')), ('bench_right', lambda: bench('right')),
    ('bookshelf', bookshelf), ('cupboard', cupboard), ('wardrobe', wardrobe), ('armchair', armchair),
    ('runner_left', lambda: runner('left')), ('runner_middle', lambda: runner('middle')), ('runner_right', lambda: runner('right')),
    ('doormat', doormat), ('floor_lamp', floor_lamp), ('barrel_stack', barrel_stack),
    ('deco_painting', deco_painting), ('deco_sconce', deco_sconce), ('deco_menu_board', deco_menu_board),
    ('deco_banner', deco_banner),
]

STAIRS = [('stairs_up', stairs_up)]          # 32x64
STAIRS_SMALL = [('stairs_down', stairs_down)]
