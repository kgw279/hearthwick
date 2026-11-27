"""Town paving textures: cobblestone street and town-square pavers (seamless 32px, 3 variants each).
Used as ground layers by the engine's compositor (terrain.json); the edges are drawn there."""
import random
from core import Sprite

VARIANTS = 3


def cobble_v(v):
    """Small rounded setts in staggered rows, cool grey (matches the original cobblestone tile)."""
    s = Sprite(); s.rect(0, 0, 31, 31, 'e')
    rnd = random.Random(3 + 31 * v)
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


def pavers_v(v):
    """Large square flagstones for a town square: warm sandstone slabs, 16px, half-offset rows, thin grout."""
    s = Sprite(); s.rect(0, 0, 31, 31, 'H')
    rnd = random.Random(500 + 17 * v)
    for row in range(2):
        y0 = row * 16
        off = 0 if row == 0 else 8
        for col in range(2):
            x0 = col * 16 + off
            # a slab that wraps across the tile edge must look the same in every variant (any variant can sit next to any other)
            edge = x0 + 15 >= 32
            base = 'k' if edge or (v * 3 + row * 2 + col) % 4 else 't'
            hi = 'W' if base == 'k' else 'k'
            lo = 't' if base == 'k' else 'B'
            for y in range(y0 + 1, y0 + 16):
                for x in range(x0 + 1, x0 + 16):
                    cx, cy = x - x0, y - y0
                    c = base
                    if cy == 15 or cx == 15: c = lo                  # lower/right bevel
                    elif cy == 1 or cx == 1: c = hi if (edge and (x + y) % 3) or (not edge and rnd.random() < 0.6) else base
                    s.set(x % 32, y, c)                              # wraps: seamless tile
            for _ in range(0 if edge else 3):                        # wear speckles
                x, y = x0 + rnd.randint(3, 12), y0 + rnd.randint(3, 12)
                s.set(x % 32, y, lo)
    return s


GROUND_TILES = [(f'cobble_v{v}', cobble_v(v)) for v in range(VARIANTS)] + [(f'pavers_v{v}', pavers_v(v)) for v in range(VARIANTS)]
