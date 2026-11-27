"""Wall pieces: windows, shelves and doors as pieces that hang on any wall face, instead of whole wall tiles.

Each is the difference between a decorated wall face and the plain one, so it lines up with the
wall kit exactly: hung on a face cell, it looks like the old windowed or shelved tile."""
from core import Sprite
from sprites6 import face


def _diff(kind, mat, solid=False):
    """The pixels where the decorated face differs from the plain one. solid: the whole rectangle they
    span (for doors and windows, which are rectangles: matching colours inside them mustn't become holes)."""
    plain, deco = face('plain', mat), face(kind, mat)
    s = Sprite()
    changed = [(x, y) for y in range(32) for x in range(32) if deco.px[y][x] != plain.px[y][x]]
    if solid:
        xs, ys = [p[0] for p in changed], [p[1] for p in changed]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        box = {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}
        # wall showing round a shaped edge (a door's rounded top) is wall, not part of the piece: drop
        # unchanged pixels reachable from the rectangle's border; unchanged pixels inside it stay
        same = {p for p in box if deco.px[p[1]][p[0]] == plain.px[p[1]][p[0]]}
        edge = [p for p in same if p[0] in (x0, x1) or p[1] in (y0, y1)]
        outside = set(edge)
        while edge:
            x, y = edge.pop()
            for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if q in same and q not in outside:
                    outside.add(q)
                    edge.append(q)
        changed = sorted(box - outside)
    for x, y in changed:
        s.px[y][x] = deco.px[y][x]
    return s


WALL_DECOR = [
    # the window and door frames are the same on plaster and stone, so one of each hangs on either
    ('wall_window', lambda: _diff('window', 'plaster', True)),
    ('wall_shelf', lambda: _diff('shelf', 'plaster')),
    # doors through a wall to another room (the engine links them like stairs)
    ('wall_door', lambda: _diff('door', 'plaster', True)),
]
