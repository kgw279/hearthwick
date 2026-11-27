"""Walls of the land itself, for outdoors: the faces of the two kinds, as tiling 32x32 textures the engine
composites per pixel (world/tilemap.ts). Along its upper edge each shows the ground painted there (its
top), and below that its face, so painting it taller makes a taller wall.

  cliff_face   a retaining wall of rock: ledges of grey stone, darker joints between
  cliff_earth  a natural bank: layered soil, bedded stones, roots
"""
from core import Sprite


def _h(x, y, k):
    """A repeatable hash of a wrapped position (the textures tile)."""
    x, y = x % 32, y % 32
    return ((x * 73856093) ^ (y * 19349663) ^ (k * 83492791)) & 0xffff


def cliff_face():
    s = Sprite()
    # strata: bands of stone 5-7px tall, each with its own shade, offset a little along x
    bands = [(0, 'S'), (6, 'd'), (11, 'S'), (17, 's'), (22, 'S'), (27, 'd')]
    for y in range(32):
        band = max(i for i, (top, _) in enumerate(bands) if top <= y)
        for x in range(32):
            c = bands[band][1]
            if y == bands[band][0] or (y == (bands[band][0] - 1) % 32 and _h(x, y, 1) % 3 == 0): c = 'e'   # ledge cracks
            elif y == bands[band][0] + 1 and c != 's': c = 's' if _h(x, y, 2) % 2 else c                     # lit lip
            s.set(x, y, c)
    for x0 in (5, 14, 23, 29):                                         # vertical joints between blocks
        for y in range(32):
            if _h(x0, y // 6, 3) % 2 == 0 and s.px[y][x0] != 'e': s.set(x0, y, 'e' if _h(x0, y, 4) % 4 else 'd')
    for i in range(14):                                                # flecks
        x, y = _h(i, 7, 5) % 32, _h(i, 9, 6) % 32
        if s.px[y][x] in ('S', 'd'): s.set(x, y, 's' if i % 2 else 'e')
    return s


def cliff_earth():
    """A natural bank of earth: packed soil in uneven layers, stones bedded in it, roots threading through."""
    s = Sprite()
    for y in range(32):
        for x in range(32):
            # soil in clods: each 4x3 clod its own shade, darker toward the foot of a layer
            clod = _h(x // 4 + (y // 3) * 7, y // 3, 13) % 5
            c = ('B', 'B', 'b', 'B', 'H')[clod] if clod != 4 or _h(x, y, 19) % 3 == 0 else 'B'
            if _h(x, y, 14) % 7 == 0: c = 'b'                          # grain
            s.set(x, y, c)
    for i in range(8):                                                 # stones bedded in the soil
        cx, cy = _h(i, 1, 15) % 30, _h(i, 2, 16) % 30
        for dx, dy, c in ((0, 0, 'S'), (1, 0, 'S'), (2, 0, 's'), (0, 1, 'd'), (1, 1, 'S'), (2, 1, 'd')):
            s.set((cx + dx) % 32, (cy + dy) % 32, c)
    for i in range(3):                                                 # roots
        x, y = _h(i, 3, 17) % 32, _h(i, 4, 18) % 32
        for k in range(7):
            s.set((x + k) % 32, (y + (k * (i + 1)) // 4) % 32, 'b')
    return s


CLIFFS = [('cliff_face', cliff_face), ('cliff_earth', cliff_earth)]
