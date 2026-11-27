"""Wall decor: windows and shelves as pieces that hang on any wall face, instead of whole wall tiles.

Each is the difference between a decorated wall face and the plain one, so it lines up with the
wall kit exactly: hung on a face cell, it looks like the old windowed or shelved tile."""
from core import Sprite
from sprites6 import face


def _diff(kind, mat):
    plain, deco = face('plain', mat), face(kind, mat)
    s = Sprite()
    for y in range(32):
        for x in range(32):
            if deco.px[y][x] != plain.px[y][x]:
                s.px[y][x] = deco.px[y][x]
    return s


WALL_DECOR = [
    ('wall_window', lambda: _diff('window', 'plaster')),
    ('wall_window_stone', lambda: _diff('window', 'stone')),
    ('wall_shelf', lambda: _diff('shelf', 'plaster')),
]
