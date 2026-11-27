"""Tableware, tables and chairs for the inn.

Item icons (32x32, sheet "tableware_items"): plates, bowls, mugs and cutlery in three tiers, and each
one dirty (food left on it, after a guest has used it; washing turns it back).
World pieces:
  tables (sheet "tables"): plain tables for one, two and four guests, tops left clear for place settings
  chairs (sheet "chairs"): a chair facing each way (the way its sitter faces), and a place setting to
  set on a table
"""
from core import Sprite

# material colours: dark, base, light, highlight
MATS = {
    'wood': ('b', 'B', 't', 'k'),
    'clay': ('R', 'r', 't', 'k'),
    'iron': ('e', 'd', 'S', 's'),
    'pewter': ('d', 'S', 's', 'W'),
}
# what each kind comes in, cheapest first (cutlery isn't fired in clay)
TIERS = {'plate': ('wood', 'clay', 'pewter'), 'bowl': ('wood', 'clay', 'pewter'),
         'mug': ('wood', 'clay', 'pewter'), 'cutlery': ('wood', 'iron', 'pewter')}


def plate(m):
    dk, base, lt, hi = MATS[m]
    s = Sprite()
    s.ellipse(16, 18, 12, 6.5, dk); s.ellipse(16, 17.5, 11, 5.6, base)
    s.ellipse(16, 18, 7, 3.4, lt); s.ellipse(16, 18.5, 6, 2.6, base)
    s.rect(9, 15, 12, 15, hi)
    s.outline()
    return s


def bowl(m):
    dk, base, lt, hi = MATS[m]
    s = Sprite()
    for y in range(14, 25):                                   # the bowl's body narrows to its foot
        half = int(10 - (y - 14) ** 1.6 / 4.2)
        s.rect(16 - half, y, 15 + half, y, base if y < 21 else dk)
    s.rect(12, 25, 19, 26, dk)                                # foot
    s.ellipse(16, 13.5, 10.5, 3.6, lt); s.ellipse(16, 14, 8.6, 2.6, dk)  # rim and inside
    s.rect(8, 16, 9, 18, hi)
    s.outline()
    return s


def mug(m):
    dk, base, lt, hi = MATS[m]
    s = Sprite()
    s.rect(9, 9, 20, 26, base); s.rect(9, 9, 9, 26, lt); s.rect(20, 9, 20, 26, dk)
    s.ellipse(14.5, 9, 5.6, 1.8, lt); s.ellipse(14.5, 9.4, 4.4, 1.0, dk)  # rim and inside
    s.rect(21, 12, 24, 13, base); s.rect(23, 12, 24, 21, base); s.rect(21, 20, 24, 21, base)  # handle
    if m == 'wood':
        for y in (13, 21): s.rect(9, y, 20, y, dk)            # staves' hoops
    if m == 'pewter':
        s.ellipse(14.5, 8, 6.2, 2.0, hi); s.ellipse(14.5, 8, 5, 1.3, lt); s.rect(21, 7, 23, 8, base)  # lid
    s.outline()
    return s


def cutlery(m):
    dk, base, lt, hi = MATS[m]
    s = Sprite()
    for x in (8, 10, 12): s.rect(x, 5, x, 10, lt)              # fork
    s.rect(8, 10, 12, 11, lt); s.rect(10, 12, 10, 26, base); s.rect(9, 18, 11, 26, dk if m != 'wood' else base)
    s.rect(19, 5, 22, 16, lt); s.rect(22, 6, 22, 16, hi); s.rect(19, 5, 19, 16, base)  # knife blade
    s.rect(19, 17, 22, 26, dk); s.rect(20, 17, 21, 26, base)
    if m == 'wood':
        s.rect(9, 18, 11, 26, 'b'); s.rect(19, 17, 22, 26, 'b')
    s.outline()
    return s


DRAW = {'plate': plate, 'bowl': bowl, 'mug': mug, 'cutlery': cutlery}
# what's left on each kind after a meal: smears (centre, radii) and crumbs, in food colours
MESS = {
    'plate': ([(13, 17, 3, 1.4), (19, 19, 2, 1)], [(16, 16), (11, 19), (21, 17), (17, 20)]),
    'bowl': ([(16, 14, 5, 1.4)], [(11, 17), (20, 18), (13, 19)]),
    'mug': ([(14.5, 9.4, 4.4, 1.0)], [(10, 11), (10, 12), (10, 13), (11, 12), (19, 11), (19, 12)]),
    'cutlery': ([], [(8, 6), (10, 7), (12, 6), (10, 8), (20, 8), (21, 9), (20, 11), (21, 12), (20, 14)]),
}


def dirty(kind, m):
    s = DRAW[kind](m)
    smears, crumbs = MESS[kind]
    for cx, cy, rx, ry in smears:
        stain = Sprite(); stain.ellipse(cx, cy, rx, ry, 'H')
        for y in range(32):
            for x in range(32):
                if stain.px[y][x] and s.px[y][x] not in (None, 'O'): s.px[y][x] = 'H' if (x + y) % 3 else 'o'
    for i, (x, y) in enumerate(crumbs):
        s.set(x, y, ('o', 'H', 'G')[i % 3])
    return s


def item_ids():
    """(id, kind, material, tier 1-3) for every clean piece of tableware."""
    return [(f'{m}_{k}', k, m, t + 1) for k, mats in TIERS.items() for t, m in enumerate(mats)]


ITEMS = ([(iid, (lambda k=k, m=m: DRAW[k](m))) for iid, k, m, _ in item_ids()]
         + [(f'dirty_{iid}', (lambda k=k, m=m: dirty(k, m))) for iid, k, m, _ in item_ids()])


def has(iid):
    return any(i == iid for i, _ in ITEMS)


# --------------------------------------------------------------------- world pieces

def table(w, d):
    """A plain table, top w x d px, centred in a 64x48 cell, standing on the cell's bottom."""
    s = Sprite(64, 48)
    x0, x1 = 32 - w // 2, 32 - w // 2 + w - 1
    legs = 7
    y1 = 46 - legs - 3                      # bottom of the apron
    y0 = y1 - 2 - d                         # back edge of the top
    s.rect(x0, y0, x1, y0 + d - 1, 't'); s.rect(x0, y0, x1, y0, 'k')
    for y in range(y0 + 4, y0 + d - 1, 4): s.rect(x0, y, x1, y, 'H')          # boards
    s.rect(x0, y0 + d, x1, y1, 'B'); s.rect(x0, y1, x1, y1, 'b')              # apron
    for lx in (x0 + 1, x1 - 2):
        s.rect(lx, y1 + 1, lx + 1, y1 + legs, 'b'); s.rect(lx, y1 + 1, lx, y1 + legs, 'B')
    s.outline()
    for x in range(x0 + 2, x1 - 1):                                            # shadow under it
        if s.px[46][x] is None: s.px[46][x] = 'K'
    return s


TABLES = [('table_1', lambda: table(20, 12)), ('table_2', lambda: table(30, 16)), ('table_4', lambda: table(50, 20))]


def _legs(s, xs, y0, y1):
    for x in xs: s.rect(x, y0, x + 1, y1, 'b')


def chair(facing):
    """A chair; `facing` is the way its sitter faces."""
    s = Sprite()
    if facing == 'down':      # seen from the front: backrest behind the seat
        s.rect(10, 5, 21, 15, 'B'); s.rect(10, 5, 21, 6, 't'); s.rect(12, 8, 19, 14, 'b')
        for x in (14, 17): s.rect(x, 8, x, 14, 'B')
        s.rect(9, 16, 22, 19, 't'); s.rect(9, 16, 22, 16, 'k'); s.rect(9, 20, 22, 21, 'B')
        _legs(s, (10, 20), 22, 27)
    elif facing == 'up':      # seen from behind: the backrest in front of the seat
        s.rect(9, 15, 22, 19, 't'); s.rect(9, 15, 22, 15, 'k'); s.rect(9, 20, 22, 21, 'B')
        _legs(s, (10, 20), 22, 27)
        s.rect(10, 4, 21, 20, 'B'); s.rect(10, 4, 21, 5, 't'); s.rect(10, 20, 21, 20, 'b')
        for x in (13, 16, 19): s.rect(x, 7, x, 18, 'b')
    else:                     # from the side, facing left (right is the mirror)
        s.rect(9, 16, 20, 19, 't'); s.rect(9, 16, 20, 16, 'k'); s.rect(9, 20, 20, 21, 'B')
        _legs(s, (9, 19), 22, 27)
        s.rect(19, 4, 21, 19, 'B'); s.rect(19, 4, 21, 4, 't'); s.rect(21, 5, 21, 19, 'b')
        if facing == 'right':
            for row in s.px: row.reverse()
    s.outline()
    s.rect(10, 28, 21, 28, 'K')
    return s


def place_setting():
    """A place set for one guest, small enough to set on a table: plate, fork and knife, a mug."""
    s = Sprite()
    s.ellipse(15, 19, 5, 2.4, 's'); s.ellipse(15, 19, 4, 1.7, 'W'); s.ellipse(15, 19.3, 2.2, 0.9, 'p')
    s.rect(8, 17, 8, 22, 's'); s.rect(7, 17, 7, 18, 's'); s.rect(9, 17, 9, 18, 's')   # fork
    s.rect(22, 17, 22, 22, 's'); s.rect(23, 17, 23, 19, 'W')                          # knife
    s.rect(19, 12, 22, 16, 'B'); s.rect(19, 12, 22, 12, 't'); s.rect(23, 13, 23, 15, 'B')  # mug
    s.outline()
    return s


CHAIRS = [(f'chair_{f}', (lambda f=f: chair(f))) for f in ('down', 'up', 'left', 'right')] + [('place_setting', place_setting)]
