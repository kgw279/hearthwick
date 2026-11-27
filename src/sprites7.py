"""Tableware: salt cellar and pepper mill for the dining tables, drawn full, half and empty.

Small overlays sized for the dining table top: draw them over a dining_table frame
in the same cell (they're already placed: pepper beside the candle,
salt at the right end). `dining_table_set_*` frames are the table with both, pre-composited.
"""
from core import Sprite
from sprites2 import dining_table

LEVELS = ((2, 'full'), (1, 'half'), (0, 'empty'))


def salt_cellar(level, x=24, y=19):
    """Tiny white dish of salt. level: 2 full, 1 half, 0 empty. (x, y) = bottom-left of the dish."""
    s = Sprite()
    s.rect(x, y - 1, x + 3, y, 'W'); s.rect(x + 3, y - 1, x + 3, y, 's'); s.rect(x - 1, y - 2, x + 4, y - 2, 's')
    if level >= 1: s.rect(x, y - 2, x + 3, y - 2, 'W')
    if level == 2: s.rect(x + 1, y - 3, x + 2, y - 3, 'W')
    if level == 0: s.rect(x, y - 2, x + 3, y - 2, 'e')
    s.outline()
    return s


def pepper_mill(level, x=16, y=19):
    """Tiny wooden mill with a glass band showing the peppercorns. (x, y) = bottom-left."""
    s = Sprite()
    s.rect(x, y - 6, x + 1, y, 'B'); s.rect(x + 1, y - 6, x + 1, y, 'b'); s.set(x, y - 7, 't')
    s.rect(x, y - 4, x + 1, y - 2, 'p')
    if level >= 1: s.rect(x, y - (4 if level == 2 else 3), x + 1, y - 2, 'K')
    s.outline()
    return s


def table_set(level):
    t = dining_table()
    for over in (salt_cellar(level), pepper_mill(level)):
        for yy in range(over.h):
            for xx in range(over.w):
                c = over.get(xx, yy)
                if c: t.set(xx, yy, c)
    return t


TABLEWARE = ([(f'salt_cellar_{lv}', (lambda l=l: salt_cellar(l))) for l, lv in LEVELS]
             + [(f'pepper_mill_{lv}', (lambda l=l: pepper_mill(l))) for l, lv in LEVELS]
             + [(f'dining_table_set_{lv}', (lambda l=l: table_set(l))) for l, lv in LEVELS])
