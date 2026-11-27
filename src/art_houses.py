"""Townsfolk's houses, at the shops' size (64x64) and in their style: a shingled roof with a chimney,
timber-framed plaster walls on a stone footing, two shuttered windows with flower boxes, a door in the
middle. Three roof colours."""
from core import Sprite
from sprites import ground_shadow

ROOFS = {'red': ('R', 'P', 'b'), 'blue': ('U', 'c', 'n'), 'green': ('T', 'L', 'g')}


def house(roof):
    base, hi, dk = ROOFS[roof]
    s = Sprite(64, 64)
    # roof: back slope, ridge, front slope with shingle rows
    s.rect(6, 12, 57, 31, base); s.rect(6, 12, 57, 18, dk); s.rect(6, 19, 57, 19, hi)
    for y in range(22, 31, 3):
        s.rect(6, y, 57, y, dk)
        for x in range(6 + (y % 2) * 2, 58, 4): s.set(x, y + 1, dk)
    for y in (14, 16):
        for x in range(6 + (y % 4), 58, 4): s.set(x, y, base)
    s.rect(6, 31, 57, 31, 'b')
    s.rect(14, 4, 19, 16, 'S'); s.rect(14, 4, 19, 4, 'd'); s.rect(18, 5, 19, 16, 'd'); s.rect(15, 3, 17, 3, 'K')  # chimney
    # walls: plaster in a timber frame, on a stone footing
    s.rect(9, 32, 54, 57, 't'); s.rect(9, 32, 54, 33, 'B')
    for x in (9, 23, 40, 54): s.rect(x, 32, x, 56, 'b')
    s.rect(9, 44, 54, 44, 'b')
    s.rect(9, 55, 54, 57, 'S'); s.rect(9, 55, 54, 55, 's'); s.rect(9, 57, 54, 57, 'e')
    # windows with shutters and flower boxes
    for x0 in (12, 43):
        s.rect(x0, 36, x0 + 8, 43, 'b'); s.rect(x0 + 1, 37, x0 + 7, 42, 'C'); s.rect(x0 + 1, 37, x0 + 7, 37, 'p')
        s.rect(x0 + 4, 37, x0 + 4, 42, 'b'); s.set(x0 + 2, 38, 'W')
        s.rect(x0 - 2, 36, x0 - 1, 43, dk); s.rect(x0 + 9, 36, x0 + 10, 43, dk)
        s.rect(x0, 44, x0 + 8, 46, 'B'); s.rect(x0, 44, x0 + 8, 44, 'b')
        for i, x in enumerate(range(x0 + 1, x0 + 8, 2)): s.set(x, 43, 'r' if i % 2 else 'y'); s.set(x + 1, 43, 'G')
    # door
    s.rect(27, 40, 36, 57, 'b'); s.rect(28, 41, 35, 57, 'B'); s.rect(29, 42, 34, 46, 'b')
    s.rect(31, 41, 32, 57, 'b'); s.set(34, 50, 'y'); s.rect(26, 58, 37, 58, 'd')
    s.outline()
    return ground_shadow(s, 60)


HOUSES = [(f'house_{r}', (lambda r=r: house(r))) for r in ROOFS]
