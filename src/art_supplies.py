"""Inn supplies' item icons (32x32, sheet "supply_items"): what keeps the rooms and hall going rather
than the kitchen. See content_supplies.py."""
from core import Sprite


def pillow():
    s = Sprite()
    s.ellipse(16, 17, 12, 7, 'p'); s.ellipse(15, 16, 10, 5, 'W')
    s.rect(4, 13, 5, 14, 'p'); s.rect(27, 13, 28, 14, 'p'); s.rect(4, 21, 5, 22, 'p'); s.rect(27, 21, 28, 22, 'p')  # corners
    s.rect(9, 19, 23, 19, 's')                                           # crease
    s.outline()
    return s


def bed_linens():
    s = Sprite()
    for i, (c, lt) in enumerate((('U', 'c'), ('W', 'p'), ('c', 'p'))):  # a folded stack
        y = 22 - i * 5
        s.rect(6, y, 25, y + 4, c); s.rect(6, y, 25, y, lt); s.rect(6, y + 4, 25, y + 4, 'S' if c == 'W' else 'u')
    s.rect(14, 12, 16, 26, 'R'); s.rect(14, 12, 16, 12, 'P')             # ribbon
    s.outline()
    return s


def candles():
    s = Sprite()
    for x, h in ((8, 13), (14, 17), (20, 11)):
        s.rect(x, 27 - h, x + 4, 26, 'k'); s.rect(x, 27 - h, x, 26, 'W'); s.rect(x + 4, 27 - h, x + 4, 26, 't')
        s.rect(x + 2, 25 - h, x + 2, 26 - h, 'K')                        # wick
        s.rect(x + 1, 21 - h, x + 3, 24 - h, 'r'); s.rect(x + 2, 20 - h, x + 2, 23 - h, 'y')  # flame
    s.outline()
    return s


def soap():
    s = Sprite()
    s.rect(7, 15, 24, 24, 'L'); s.rect(7, 15, 24, 16, 'W'); s.rect(7, 24, 24, 24, 'T'); s.rect(24, 15, 24, 24, 'G')
    s.rect(11, 19, 20, 20, 'G')                                          # stamped mark
    for x, y in ((10, 11), (15, 9), (21, 12)): s.ellipse(x, y, 1.6, 1.6, 'p')  # bubbles
    s.outline()
    return s


def slept_in(draw):
    """Used: rumpled and grubby, a few smudges on it (washing turns it back)."""
    s = draw()
    for cx, cy, rx, ry in ((11, 15, 3, 2), (20, 20, 4, 2), (17, 12, 2, 1.5)):
        stain = Sprite(); stain.ellipse(cx, cy, rx, ry, 'H')
        for y in range(32):
            for x in range(32):
                if stain.px[y][x] and s.px[y][x] not in (None, 'O'): s.px[y][x] = 'u' if (x + y) % 3 else 'H'
    return s


def damp(draw):
    """Washed, not yet dry: beads of water on it, and a drip below."""
    s = draw()
    for x, y in ((10, 14), (19, 17), (14, 21), (23, 13)):
        s.set(x, y, 'p'); s.set(x, y + 1, 'c')
    lo = max(y for y in range(32) for x in range(32) if s.px[y][x] is not None)
    s.set(16, min(31, lo + 2), 'c')
    return s


BEDDING = ['pillow', 'bed_linens']   # what makes up a bed: used by a guest, then washed and dried
ITEMS = ([('pillow', pillow), ('bed_linens', bed_linens), ('candles', candles), ('soap', soap)]
         + [(f'used_{b}', (lambda f=f: slept_in(f))) for b, f in (('pillow', pillow), ('bed_linens', bed_linens))]
         + [(f'wet_{b}', (lambda f=f: damp(f))) for b, f in (('pillow', pillow), ('bed_linens', bed_linens))])


def has(iid):
    return any(n == iid for n, _ in ITEMS)
