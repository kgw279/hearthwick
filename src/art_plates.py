"""Art for the plates content_plates.py fills in: drawn from what's on them, each thing's own icon shrunk
to half size and set out on a plate (a soup in a bowl, a drink in a mug), so every plate looks like what
went into it without a picture of its own."""
from core import Sprite
from items_art import sprite_for

# where the shrunk icons go (their top-left), by how many there are
SPOTS = {1: [(8, 6)], 2: [(4, 8), (12, 6)], 3: [(3, 9), (13, 9), (8, 3)]}


def _half(s):
    """A 32px icon at 16px: each 2x2 block's first coloured pixel."""
    out = [[None] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            px = [s.px[2 * y + dy][2 * x + dx] for dy in (0, 1) for dx in (0, 1)]
            out[y][x] = next((p for p in px if p is not None), None)
    return out


def _plate(s):
    s.ellipse(16, 21, 13, 6.5, 's'); s.ellipse(16, 20.5, 11, 5, 'W'); s.ellipse(16, 21, 8, 3.5, 'p')


def _mug(s):
    s.rect(9, 12, 21, 27, 'B'); s.rect(9, 12, 21, 13, 't'); s.rect(10, 14, 20, 26, 'b')
    s.rect(22, 15, 25, 16, 'B'); s.rect(24, 16, 25, 22, 'B'); s.rect(22, 22, 25, 23, 'B')   # handle


def plated(components, drink=False):
    s = Sprite()
    if drink:
        _mug(s)
        spots = [(8, 0), (14, 2)][:len(components)]
    else:
        _plate(s)
        spots = SPOTS.get(len(components), SPOTS[3])
    for comp, (ox, oy) in zip(components, spots):
        small = _half(sprite_for(comp))
        for y in range(16):
            for x in range(16):
                if small[y][x] is not None and small[y][x] != 'O':   # outlines are redrawn round the whole plate
                    s.set(ox + x, oy + y, small[y][x])
    s.outline()
    return s
