"""Rock crags and cliff walls for outdoors: two tiling 32x32 textures the engine composites per pixel
(world/tilemap.ts). Painted rock shows its grassy top along its upper edge and rock face below it, so
painting it taller makes a taller cliff.

  cliff_face  layered rock: ledges of grey stone, darker cracks between
  cliff_top   the crag's top: grass with stones breaking through
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


def cliff_top():
    s = Sprite()
    for y in range(32):
        for x in range(32):
            s.set(x, y, 'G' if _h(x, y, 7) % 7 else 'g')
    for i in range(7):                                                 # stones through the turf
        cx, cy = _h(i, 1, 8) % 30 + 1, _h(i, 2, 9) % 30 + 1
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 0)):
            if _h(i, dx + dy, 10) % 4: s.set((cx + dx) % 32, (cy + dy) % 32, 'S' if dy == 0 else 'd')
        s.set(cx % 32, cy % 32, 's')
    for i in range(10):                                                # tufts
        x, y = _h(i, 3, 11) % 32, _h(i, 4, 12) % 32
        if s.px[y][x] == 'G': s.set(x, y, 'L')
    return s


CLIFFS = [('cliff_face', cliff_face), ('cliff_top', cliff_top)]
