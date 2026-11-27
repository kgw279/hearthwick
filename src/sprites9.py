"""Animals: the livestock and wildlife behind the ingredients, plus an inn cat, and farmyard props.

Each animal has side (left; right = mirror), front (down) and back (up) views. Side view has
idle, walk1, walk2 and an action frame (peck / graze / root / groom). Front and back views
have idle, walk1 and walk2 (legs step).

  hen, rooster, chick -> egg, chicken      cow   -> milk, beef (and cheese)
  pig                 -> pork              sheep -> mutton
  deer                -> venison           trout -> (fishing spot) jumping-fish loop
  bees                -> honey (swarm loop for the beehive)      cat -> lives at the inn
  horse -> pulls travelers' wagons          duck, duckling -> the river

Carts: covered wagon (64x32, horse hitched, rolling wheels; also parked), handcart and wheelbarrow.
"""
from core import Sprite
from sprites import _with_shadow
from sprites3 import mirror

VIEWS = ('left', 'right', 'down', 'up')


# ------------------------------------------------------------------ helpers
def _legs(s, xs, top, bottom, col, hoof, frame):
    """Vertical legs at the given x positions. Walk frames swing alternate legs 1px."""
    for i, x in enumerate(xs):
        dx = 0
        if frame == 'walk1': dx = -1 if i % 2 == 0 else 1
        if frame == 'walk2': dx = 1 if i % 2 == 0 else -1
        s.rect(x, top, x, bottom - 1, col)
        s.set(x + dx, bottom, hoof)
        if dx: s.set(x + dx, bottom - 1, col)


def _shade_body(s, cx, cy, rx, ry, base, shade, light=None):
    s.ellipse(cx, cy, rx, ry, base)
    s.ellipse(cx, cy + ry * 0.55, rx * 0.85, ry * 0.45, shade)
    s.ellipse(cx, cy - ry * 0.25, rx * 0.8, ry * 0.55, base)
    if light: s.ellipse(cx - rx * 0.3, cy - ry * 0.5, rx * 0.35, ry * 0.25, light)


def _done(s, cx, cy, rx, ry=1.4):
    s.outline()
    return _with_shadow(s, cx, cy, rx, ry)


# ------------------------------------------------------------------ hen / rooster / chick
def _bird_side(frame, body, shade, tail, comb, size=1.0, wattle=True, feet='y'):
    s = Sprite()
    cy = 21
    _legs(s, [15, 18], 24, 26, feet, feet, frame)
    s.rect(21, 14, 23, 19, tail); s.rect(22, 13, 24, 15, tail); s.set(24, 16, tail)            # tail
    _shade_body(s, 17, cy, 6 * size, 4 * size, body, shade)
    s.rect(18, 19, 21, 20, shade)                                                                 # wing
    hx, hy = (11, 14) if frame != 'action' else (10, 21)
    s.ellipse(hx, hy, 2.6, 2.6, body); s.rect(hx + 1, hy + 1, 14, hy + 3 if frame != 'action' else hy + 1, body)
    s.set(hx - 1, hy - 1, 'K'); s.rect(hx - 4, hy, hx - 3, hy, 'y'); s.set(hx - 3, hy + 1, 'H')   # eye, beak
    if comb: s.rect(hx - 1, hy - 3, hx + 1, hy - 3, comb); s.set(hx, hy - 4, comb)
    if wattle and comb: s.set(hx - 2, hy + 2, comb)
    return _done(s, 17, 27, 6)


def _bird_front(frame, body, shade, comb, back=False, feet='y'):
    s = Sprite()
    _legs(s, [14, 17], 24, 26, feet, feet, frame)
    _shade_body(s, 16, 20, 5, 4.4, body, shade)
    s.ellipse(16, 13, 2.8, 2.8, body)
    if comb: s.rect(15, 9, 17, 10, comb); s.set(16, 8, comb)
    if not back:
        s.set(15, 12, 'K'); s.set(18, 12, 'K'); s.rect(16, 14, 17, 14, 'y'); s.set(16, 15, 'H')
        if comb: s.set(16, 16, comb)
    else:
        s.rect(14, 16, 18, 18, shade); s.rect(15, 15, 17, 15, shade)                              # tail seen from behind
    return _done(s, 16, 27, 5)


def hen(view, frame='idle'):
    if view in ('left', 'right'):
        s = _bird_side(frame, 'W', 's', 'W', 'R')
        return s if view == 'left' else mirror(s)
    return _bird_front(frame if frame != 'action' else 'idle', 'W', 's', 'R', back=view == 'up')


def rooster(view, frame='idle'):
    if view in ('left', 'right'):
        s = _bird_side(frame, 'r', 'R', 'g', 'R')
        s.rect(21, 11, 23, 13, 'G'); s.set(24, 12, 'g')                                           # tall tail
        s.ellipse(12, 17, 2, 1.6, 'y') if frame != 'action' else None                             # golden neck
        return s if view == 'left' else mirror(s)
    s = _bird_front(frame if frame != 'action' else 'idle', 'r', 'R', 'R', back=view == 'up')
    if view == 'up': s.rect(14, 13, 18, 18, 'g'); s.rect(15, 12, 17, 12, 'G')
    return s


def chick(view, frame='idle'):
    s = Sprite()
    if view in ('left', 'right'):
        _legs(s, [16], 25, 26, 'H', 'H', frame)
        s.ellipse(17, 22, 3.4, 2.6, 'y'); s.set(19, 23, 'H')
        hy = 18 if frame != 'action' else 22
        s.ellipse(14, hy, 2, 2, 'y'); s.set(13, hy - 1, 'K'); s.set(11, hy, 'r'); s.set(12, hy, 'r')
        s.outline(); s = _with_shadow(s, 16, 27, 3, 1)
        return s if view == 'left' else mirror(s)
    _legs(s, [15, 17], 25, 26, 'H', 'H', frame if frame != 'action' else 'idle')
    s.ellipse(16, 22, 3.4, 2.8, 'y'); s.ellipse(16, 18, 2.4, 2.2, 'y')
    if view == 'down': s.set(15, 17, 'K'); s.set(17, 17, 'K'); s.set(16, 18, 'r')
    s.outline()
    return _with_shadow(s, 16, 27, 3, 1)


# ------------------------------------------------------------------ cow / pig / sheep / deer (four-legged)
def _quad_side(frame, body, shade, legc, hoof, head, extra, leg_x=(8, 11, 20, 23), body_box=(7, 11, 25, 21), graze_dy=6,
               leg_top=21, leg_bottom=27, light=None):
    s = Sprite()
    _legs(s, list(leg_x), leg_top, leg_bottom, legc, hoof, frame if frame != 'action' else 'idle')
    x0, y0, x1, y1 = body_box
    _shade_body(s, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, body, shade, light)
    head(s, graze_dy if frame == 'action' else 0)
    extra(s, frame)
    return _done(s, 16, 28, 11)


def _quad_end(frame, body, shade, legc, hoof, face, rx=7.5, ry=5.5, cy=18, legs=(12, 14, 18, 20), back=False, tail=None):
    s = Sprite()
    _legs(s, list(legs), cy + 3, 27, legc, hoof, frame if frame != 'action' else 'idle')
    _shade_body(s, 16, cy, rx, ry, body, shade)
    if back:
        if tail: tail(s)
    else:
        face(s)
    return _done(s, 16, 28, 8)


# cow: white with brown patches, pink muzzle, short horns
def _cow_head(s, dy):
    y = 9 + dy
    s.rect(3, y, 9, y + 7, 'W'); s.rect(3, y + 5, 7, y + 8, 'P'); s.set(4, y + 6, 'R'); s.set(6, y + 6, 'R')
    s.set(5, y + 2, 'K'); s.rect(8, y - 1, 10, y, 's'); s.set(10, y - 2, 's')                    # eye, horn
    s.rect(9, y + 1, 11, y + 2, 'B'); s.rect(9, y + 3, 10, y + 5, 'W')                             # ear, neck
    s.rect(9, 12, 11, 17, 'W')


def _cow_extra(s, frame):
    for x0, y0, x1, y1 in ((12, 12, 16, 15), (19, 14, 22, 17), (15, 17, 17, 19)): s.rect(x0, y0, x1, y1, 'B')
    s.rect(17, 21, 20, 22, 'P'); s.set(18, 23, 'P'); s.set(20, 23, 'P')                            # udder
    s.rect(26, 12, 26, 18, 'W'); s.rect(26, 19, 27, 20, 'B')                                       # tail


def cow(view, frame='idle'):
    if view in ('left', 'right'):
        s = _quad_side(frame, 'W', 's', 'W', 'b', _cow_head, _cow_extra)
        return s if view == 'left' else mirror(s)
    def face(s):
        s.rect(12, 9, 20, 18, 'W'); s.rect(12, 9, 14, 12, 'B'); s.rect(13, 15, 19, 19, 'P')
        s.set(14, 17, 'R'); s.set(18, 17, 'R'); s.set(13, 12, 'K'); s.set(19, 12, 'K')
        s.rect(9, 10, 11, 11, 'B'); s.rect(21, 10, 23, 11, 'B'); s.rect(11, 7, 12, 8, 's'); s.rect(20, 7, 21, 8, 's')
    def tail(s):
        s.rect(13, 13, 15, 16, 'B'); s.rect(18, 17, 20, 19, 'B'); s.rect(16, 15, 16, 22, 'W'); s.rect(16, 23, 16, 24, 'B')
    return _quad_end(frame, 'W', 's', 'W', 'b', face, back=view == 'up', tail=tail)


# pig: peach-pink (the palette's softest pink), round, snout, floppy ears, curly tail
def _pig_head(s, dy):
    y = 12 + dy
    s.ellipse(8, y + 3, 4, 3.4, 'k'); s.rect(3, y + 2, 5, y + 5, 'P'); s.set(3, y + 3, 'R'); s.set(3, y + 4, 'R')
    s.set(7, y + 2, 'K'); s.rect(9, y - 1, 11, y + 1, 't'); s.set(10, y + 1, 'P')


def _pig_extra(s, frame):
    s.set(26, 14, 't'); s.set(27, 13, 't'); s.set(27, 15, 't'); s.set(26, 16, 't')               # curly tail
    s.set(15, 19, 't'); s.set(18, 20, 't')


def pig(view, frame='idle'):
    if view in ('left', 'right'):
        s = _quad_side(frame, 'k', 't', 'k', 'B', _pig_head, _pig_extra, leg_x=(9, 12, 19, 22),
                       body_box=(7, 12, 26, 22), graze_dy=4, leg_top=22, light='W')
        return s if view == 'left' else mirror(s)
    def face(s):
        s.ellipse(16, 14, 5, 4, 'k'); s.rect(14, 15, 18, 17, 'P'); s.set(15, 16, 'R'); s.set(17, 16, 'R')
        s.set(13, 13, 'K'); s.set(19, 13, 'K'); s.rect(10, 10, 12, 12, 't'); s.rect(20, 10, 22, 12, 't')
    def tail(s): s.set(16, 15, 'B'); s.set(17, 14, 'B'); s.set(16, 13, 'B')
    return _quad_end(frame, 'k', 't', 'k', 'B', face, back=view == 'up', tail=tail)


# sheep: woolly cloud body, dark face and legs
def _wool(s, cx, cy, rx, ry):
    for dx, dy in ((-rx * 0.6, 0), (0, -ry * 0.5), (rx * 0.6, 0), (0, ry * 0.3), (-rx * 0.3, -ry * 0.4), (rx * 0.3, -ry * 0.4)):
        s.ellipse(cx + dx, cy + dy, rx * 0.55, ry * 0.7, 'W')
    s.ellipse(cx, cy + ry * 0.55, rx * 0.8, ry * 0.35, 's')
    for x, y in ((cx - 3, cy - 2), (cx + 2, cy - 3), (cx + 4, cy), (cx - 5, cy + 1)): s.set(int(x), int(y), 's')


def _sheep_head(s, dy):
    y = 11 + dy
    s.ellipse(6, y + 3, 3, 3.4, 'e'); s.set(5, y + 2, 'W'); s.set(4, y + 5, 'd')
    s.rect(8, y + 1, 10, y + 2, 'e'); s.ellipse(8, y, 2, 1.4, 'W')


def sheep(view, frame='idle'):
    if view in ('left', 'right'):
        s = Sprite()
        _legs(s, [10, 13, 19, 22], 21, 27, 'e', 'd', frame if frame != 'action' else 'idle')
        _wool(s, 16, 16, 9.5, 6)
        _sheep_head(s, 5 if frame == 'action' else 0)
        s.ellipse(26, 15, 1.6, 1.6, 'W')
        s = _done(s, 16, 28, 11)
        return s if view == 'left' else mirror(s)
    s = Sprite()
    _legs(s, [12, 14, 18, 20], 21, 27, 'e', 'd', frame if frame != 'action' else 'idle')
    _wool(s, 16, 17, 8, 6)
    if view == 'down':
        s.ellipse(16, 15, 3, 3.6, 'e'); s.set(15, 14, 'W'); s.set(17, 14, 'W'); s.set(16, 17, 'd')
        s.rect(11, 13, 12, 14, 'e'); s.rect(20, 13, 21, 14, 'e'); s.ellipse(16, 11, 2.4, 1.4, 'W')
    else:
        s.ellipse(16, 12, 3, 2, 'W'); s.set(16, 18, 's')
    return _done(s, 16, 28, 8)


# deer: slender brown body, pale belly, white tail, antlers
def _deer_head(s, dy):
    y = 6 + dy
    s.rect(9, y + 5, 11, 15, 'B')                                                                 # neck
    s.ellipse(7, y + 4, 3, 2.4, 'B'); s.rect(3, y + 4, 5, y + 6, 'B'); s.set(3, y + 5, 'K'); s.set(7, y + 3, 'K')
    s.rect(9, y + 1, 10, y + 2, 't'); s.set(8, y + 2, 'k')                                         # ear
    for x, yy in ((7, y + 1), (7, y), (6, y - 1), (8, y - 1), (8, y - 2), (5, y - 2), (9, y - 3)): s.set(x, yy, 't')  # antler


def _deer_extra(s, frame):
    s.rect(11, 18, 22, 19, 't'); s.rect(24, 12, 26, 14, 'W'); s.set(25, 11, 'B')
    for x, y in ((15, 13), (18, 14), (20, 12)): s.set(x, y, 't')                                   # dapples


def deer(view, frame='idle'):
    if view in ('left', 'right'):
        s = _quad_side(frame, 'B', 'b', 'B', 'K', _deer_head, _deer_extra, leg_x=(11, 13, 21, 23),
                       body_box=(9, 11, 25, 19), graze_dy=8, leg_top=18, light='t')
        return s if view == 'left' else mirror(s)
    def face(s):
        s.rect(13, 8, 18, 15, 'B'); s.rect(14, 13, 17, 15, 't'); s.set(15, 15, 'K'); s.set(16, 15, 'K')
        s.set(13, 10, 'K'); s.set(18, 10, 'K'); s.rect(10, 8, 12, 9, 't'); s.rect(19, 8, 21, 9, 't')
        for x, y in ((12, 6), (11, 5), (12, 4), (10, 4), (19, 6), (20, 5), (19, 4), (21, 4), (13, 7), (18, 7)): s.set(x, y, 't')
    def tail(s): s.rect(15, 13, 17, 16, 'W'); s.ellipse(16, 10, 2.6, 2, 'B'); s.set(14, 8, 't'); s.set(18, 8, 't')
    return _quad_end(frame, 'B', 'b', 'B', 'K', face, rx=6.5, ry=5, cy=17, legs=(13, 14, 18, 19), back=view == 'up', tail=tail)


# ------------------------------------------------------------------ horse (travelers' and the wagon's)
def _horse_head(s, dy):
    y = 4 + dy
    s.rect(8, y + 4, 11, 14, 'B'); s.rect(9, y + 3, 12, y + 9, 'K')                              # neck + mane
    s.rect(3, y + 4, 8, y + 8, 'B'); s.rect(2, y + 6, 4, y + 9, 'b'); s.set(2, y + 7, 'K')         # head, muzzle
    s.set(6, y + 5, 'K'); s.rect(8, y + 2, 8, y + 3, 'B'); s.set(9, y + 2, 'B')                    # eye, ear
    s.rect(4, y + 3, 6, y + 3, 'W') if dy == 0 else None                                           # blaze


def _horse_extra(s, frame):
    s.rect(24, 11, 26, 13, 'K'); s.rect(25, 14, 26, 20, 'K'); s.set(27, 19, 'K')                  # tail
    for x in (10, 13, 21, 24): s.set(x, 25, 'W'); s.set(x, 24, 'W')                                # white socks


def horse(view, frame='idle'):
    if view in ('left', 'right'):
        s = _quad_side(frame, 'B', 'b', 'B', 'K', _horse_head, _horse_extra, leg_x=(10, 13, 21, 24),
                       body_box=(8, 10, 26, 19), graze_dy=9, leg_top=18, light='t')
        return s if view == 'left' else mirror(s)
    def face(s):
        s.rect(13, 5, 18, 16, 'B'); s.rect(14, 13, 17, 17, 'b'); s.set(14, 16, 'K'); s.set(17, 16, 'K')
        s.rect(15, 6, 16, 11, 'W'); s.set(13, 8, 'K'); s.set(18, 8, 'K')
        s.rect(12, 3, 13, 5, 'B'); s.rect(18, 3, 19, 5, 'B'); s.rect(14, 3, 17, 5, 'K')
    def tail(s): s.rect(14, 4, 17, 8, 'K'); s.rect(15, 14, 16, 22, 'K'); s.ellipse(16, 8, 3, 2.4, 'B')
    return _quad_end(frame, 'B', 'b', 'B', 'K', face, rx=6.5, ry=5.5, cy=17, legs=(12, 14, 18, 20), back=view == 'up', tail=tail)


# ------------------------------------------------------------------ duck (river)
def duck(view, frame='idle'):
    s = Sprite()
    swim = frame == 'action'
    if view in ('left', 'right'):
        if not swim: _legs(s, [16, 18], 24, 26, 'r', 'r', frame)
        cy = 21 if not swim else 23
        s.rect(21, cy - 3, 23, cy - 1, 'W'); s.set(24, cy - 3, 'W')                                  # tail tip
        _shade_body(s, 17, cy, 6, 3.4, 'W', 's')
        s.rect(16, cy - 1, 21, cy, 's'); s.set(20, cy - 1, 'u')                                        # wing + speculum
        s.rect(12, cy - 7, 14, cy - 2, 'W'); s.ellipse(12, cy - 7, 2.6, 2.2, 'W')                       # neck, head
        s.rect(7, cy - 7, 9, cy - 6, 'r'); s.set(11, cy - 8, 'K')                                       # bill, eye
        if swim:
            s.rect(8, cy + 3, 25, cy + 4, None)
            for x in range(9, 25, 3): s.set(x, cy + 3, 'p')
            s.outline()
            return s if view == 'left' else mirror(s)
        s = _done(s, 17, 27, 6)
        return s if view == 'left' else mirror(s)
    if not swim: _legs(s, [14, 17], 24, 26, 'r', 'r', frame if frame != 'action' else 'idle')
    _shade_body(s, 16, 20, 5, 4, 'W', 's')
    s.ellipse(16, 13, 2.6, 2.6, 'W')
    if view == 'down': s.set(15, 12, 'K'); s.set(17, 12, 'K'); s.rect(15, 14, 17, 15, 'r')
    else: s.rect(15, 17, 17, 19, 's'); s.set(16, 20, 'W')
    return _done(s, 16, 27, 5)


def duckling(view, frame='idle'):
    s = chick(view, frame if frame != 'action' else 'idle')
    for y in range(32):
        for x in range(32):
            c = s.get(x, y)
            if c == 'y': s.set(x, y, 'H' if (x + y) % 5 == 0 else 'y')
            if c == 'r': s.set(x, y, 'r')
    return s


# ------------------------------------------------------------------ inn cat
def cat(view, frame='idle'):
    s = Sprite()
    if frame == 'action':                                          # curled up asleep
        s.ellipse(16, 22, 7, 4, 'r'); s.ellipse(16, 23.6, 6, 2, 'H'); s.ellipse(11, 21, 3, 2.6, 'r')
        s.set(9, 19, 'r'); s.set(12, 19, 'r'); s.rect(10, 21, 11, 21, 'b')
        for x in (15, 18, 21): s.set(x, 20, 'H')
        s.rect(18, 25, 23, 25, 'r'); s.set(23, 24, 'k')
        s.outline()
        s = _with_shadow(s, 16, 26, 7, 1.2)
        return s if view != 'right' else mirror(s)
    if view in ('left', 'right'):
        _legs(s, [12, 14, 19, 21], 22, 26, 'r', 'k', frame)
        s.ellipse(17, 20, 6, 3, 'r'); s.ellipse(17, 21.4, 5, 1.4, 'k')
        for x in (16, 19): s.set(x, 18, 'H')
        s.ellipse(10, 16, 3, 2.6, 'r'); s.set(8, 13, 'r'); s.set(11, 13, 'r'); s.set(8, 14, 'r'); s.set(11, 14, 'r')
        s.set(9, 16, 'g'); s.set(7, 17, 'P')
        s.rect(23, 15, 23, 19, 'r'); s.set(24, 14, 'r'); s.set(24, 13, 'k')
        s.outline(); s = _with_shadow(s, 16, 27, 7, 1.1)
        return s if view == 'left' else mirror(s)
    _legs(s, [14, 18], 23, 26, 'r', 'k', frame)
    s.ellipse(16, 20, 4, 4, 'r'); s.ellipse(16, 14, 3.6, 3, 'r')
    s.rect(13, 10, 13, 12, 'r'); s.rect(19, 10, 19, 12, 'r')
    if view == 'down':
        s.set(14, 14, 'g'); s.set(18, 14, 'g'); s.set(16, 16, 'P'); s.ellipse(16, 21, 2, 2.4, 'k')
    else:
        for y in (13, 15, 19): s.rect(15, y, 17, y, 'H')
        s.rect(20, 18, 21, 18, 'r'); s.rect(21, 14, 21, 17, 'r')
    s.outline()
    return _with_shadow(s, 16, 27, 5, 1.1)


# ------------------------------------------------------------------ ambient loops
def bees(frame):
    """Small swarm to hover over a beehive; 4-frame loop."""
    s = Sprite()
    pts = [(10, 8), (16, 5), (21, 9), (13, 13), (19, 14)]
    off = [(0, 0), (1, -1), (0, -2), (-1, -1)][frame]
    for i, (x, y) in enumerate(pts):
        dx, dy = off if i % 2 == 0 else (-off[0], off[1] // 2)
        x, y = x + dx, y + dy
        s.set(x, y, 'y'); s.set(x + 1, y, 'K'); s.set(x, y - 1, 'W')
    return s


def jumping_trout(frame):
    """Fish leaping at a fishing spot; 4-frame loop (rings, leap, top, splash)."""
    s = Sprite()
    if frame == 0:
        s.ellipse(16, 22, 6, 2, 'p'); s.ellipse(16, 22, 4.4, 1.2, None)
    elif frame in (1, 2):
        y = 15 if frame == 1 else 11
        s.ellipse(16, y, 4, 1.8, 'S'); s.ellipse(16, y - 0.6, 3, 1, 's'); s.rect(15, y + 1, 18, y + 1, 'P')
        s.rect(20, y - 1, 21, y + 1, 'S'); s.set(13, y - 1, 'K')
        s.outline()
        if frame == 1: s.set(15, 21, 'p'); s.set(17, 20, 'p')
    else:
        for x, y in ((12, 19), (20, 19), (14, 17), (18, 17), (16, 18)): s.set(x, y, 'p')
        s.ellipse(16, 22, 5, 1.6, 'p'); s.ellipse(16, 22, 3.6, 0.8, None)
    return s


# ------------------------------------------------------------------ farmyard props
def chicken_coop():
    s = Sprite()
    s.rect(6, 14, 25, 25, 'B'); s.rect(6, 14, 7, 25, 't'); s.rect(24, 14, 25, 25, 'b')
    for x in range(9, 24, 3): s.rect(x, 15, x, 25, 'b')
    for i in range(7): s.rect(5 + i, 13 - i, 26 - i, 13 - i, 'R' if i % 2 == 0 else 'r')         # roof
    s.rect(13, 19, 18, 25, 'K'); s.rect(12, 26, 19, 27, 't'); s.rect(13, 28, 18, 28, 't')        # door + ramp
    s.rect(20, 17, 22, 18, 'y'); s.set(21, 17, 'H')                                                # hen peeking? straw
    s.set(16, 22, 'W'); s.set(15, 22, 'W'); s.set(14, 21, 'R')
    s.outline()
    return _with_shadow(s, 16, 28, 11, 1.6)


def feed_trough():
    s = Sprite()
    s.rect(5, 18, 26, 23, 'B'); s.rect(5, 18, 26, 18, 't'); s.rect(6, 19, 25, 20, 'b')
    for x in range(7, 25, 2): s.set(x, 19, 'H' if x % 4 else 'y')
    s.rect(6, 24, 7, 26, 'b'); s.rect(24, 24, 25, 26, 'b')
    s.outline()
    return _with_shadow(s, 16, 27, 11, 1.3)


def hay_bale():
    s = Sprite()
    s.rect(6, 13, 25, 25, 'H'); s.rect(6, 13, 25, 15, 'y'); s.rect(6, 23, 25, 25, 'B')
    for x in (11, 20): s.rect(x, 13, x, 25, 'b')
    for x, y in ((8, 18), (14, 20), (17, 17), (23, 19), (9, 22), (22, 22)): s.set(x, y, 'y')
    s.set(5, 14, 'y'); s.set(26, 16, 'y'); s.set(4, 13, 'H')
    s.outline()
    return _with_shadow(s, 16, 26, 11, 1.4)


def milk_pail():
    s = Sprite()
    s.rect(13, 19, 19, 25, 's'); s.rect(13, 19, 13, 25, 'W'); s.rect(18, 19, 19, 25, 'S'); s.rect(13, 22, 19, 22, 'S')
    s.ellipse(16, 19, 3.4, 1.2, 'S'); s.ellipse(16, 19, 2.6, 0.8, 'W')
    for x, y in ((13, 17), (14, 16), (16, 15), (18, 16), (19, 17)): s.set(x, y, 'e')
    s.outline()
    return _with_shadow(s, 16, 26, 4, 1)


# ------------------------------------------------------------------ carts
def _wheel(s, cx, cy, r, frame, rim='b', spoke='B', hub='K'):
    s.ellipse(cx, cy, r, r, rim); s.ellipse(cx, cy, r - 1.2, r - 1.2, None)
    if frame % 2 == 0:
        s.rect(cx - r + 1, cy, cx + r - 1, cy, spoke); s.rect(cx, cy - r + 1, cx, cy + r - 1, spoke)
    else:
        for k in range(-r + 2, r - 1): s.set(cx + k, cy + k, spoke); s.set(cx + k, cy - k, spoke)
    s.set(cx, cy, hub)


def _shadow(s, cx, cy, rx, ry=1.4):
    sh = Sprite(s.w, s.h); sh.ellipse(cx, cy, rx, ry, 'K')
    for y in range(s.h):
        for x in range(s.w):
            if s.px[y][x] is None and sh.px[y][x]: s.px[y][x] = 'K'
    return s


def wagon(frame=0, hitched=True):
    """Covered travelers' wagon, side view facing left, 64x32. With the horse hitched, frames 0-2 roll."""
    s = Sprite(64, 32)
    ox = 26 if hitched else 14
    s.rect(ox, 18, ox + 30, 22, 'B'); s.rect(ox, 18, ox + 30, 18, 't'); s.rect(ox, 22, ox + 30, 22, 'b')   # bed
    for x in range(ox + 4, ox + 30, 6): s.rect(x, 19, x, 21, 'b')
    for i in range(10):                                                                            # canvas hood
        w = 13 - abs(i - 4) // 2
        s.rect(ox + 2, 17 - i, ox + 28, 17 - i, 'k' if i < 8 else 't')
    s.rect(ox + 2, 8, ox + 28, 9, 'W')
    for x in (ox + 8, ox + 15, ox + 22): s.rect(x, 8, x, 17, 't')                                   # hoops
    s.ellipse(ox + 2, 13, 1.6, 4.6, 'b')                                                           # opening
    _wheel(s, ox + 7, 24, 5, frame); _wheel(s, ox + 24, 24, 5, frame)
    if hitched:
        s.rect(15, 20, ox, 20, 'b')                                                                # shaft
        s.rect(ox - 3, 14, ox, 16, 'B'); s.set(ox - 2, 13, 'B')                                     # driver's bench
        h = horse('left', ('idle', 'walk1', 'walk2')[frame % 3])
        for y in range(32):
            for x in range(32):
                c = h.get(x, y)
                if c and c != 'K' or (c == 'K' and y < 27): s.set(x - 2, y, c)
        s.rect(13, 14, 22, 14, 'b')                                                                # harness strap
    s.outline()
    return _shadow(s, ox + 15, 29, 17)


def handcart(frame=0):
    s = Sprite()
    s.rect(6, 15, 22, 21, 'B'); s.rect(6, 15, 22, 15, 't'); s.rect(6, 21, 22, 21, 'b')
    for x in (10, 14, 18): s.rect(x, 16, x, 20, 'b')
    for x, y, c in ((8, 13, 'r'), (10, 12, 'R'), (12, 13, 'y'), (15, 12, 'G'), (17, 13, 'r'), (19, 12, 'H'), (14, 14, 'k')):
        s.ellipse(x, y, 1.8, 1.6, c)                                                               # produce
    s.rect(23, 17, 28, 17, 'b'); s.rect(28, 16, 29, 16, 'b')                                       # handles
    _wheel(s, 14, 23, 4, frame)
    s.rect(7, 22, 7, 26, 'b')                                                                      # prop leg
    s.outline()
    return _with_shadow(s, 15, 28, 10, 1.2)


def wheelbarrow(frame=0):
    s = Sprite()
    for i in range(6): s.rect(9 + i, 16 + i, 24 - i // 2, 16 + i, 'S' if i else 's')               # tray
    s.rect(11, 16, 22, 16, 'e'); s.ellipse(17, 15, 4, 1.4, 'b'); s.set(15, 14, 'B')                # soil
    s.rect(24, 17, 29, 17, 'b'); s.rect(23, 18, 23, 25, 'b')                                       # handle + leg
    _wheel(s, 9, 23, 3, frame)
    s.outline()
    return _with_shadow(s, 16, 27, 9, 1.1)


def _edge_wheel(s, x0, y0, y1, frame):
    """A wheel seen edge-on (front/back views); tread marks scroll as it rolls."""
    s.rect(x0, y0, x0 + 2, y1, 'b'); s.rect(x0 + 1, y0, x0 + 1, y1, 'B')
    for y in range(y0, y1 + 1):
        if (y + frame) % 3 == 0: s.set(x0 + 1, y, 'K')


def wagon_end(view, frame=0, hitched=True):
    """Covered wagon heading south (down: horse nearest the viewer) or north (up: tailgate nearest), 32x64."""
    s = Sprite(32, 64)
    if view == 'up' and hitched:
        h = horse('up', ('idle', 'walk1', 'walk2')[frame % 3])
        for y in range(27):
            for x in range(32):
                c = h.get(x, y)
                if c: s.set(x, y + 2, c)
    top = 6 if view == 'down' else 28
    # canvas hood
    s.ellipse(16, top + 5, 11, 5, 'k'); s.rect(5, top + 5, 26, top + 22, 'k')
    s.rect(5, top + 5, 6, top + 22, 't'); s.rect(25, top + 5, 26, top + 22, 't'); s.ellipse(16, top + 3, 8, 2, 'W')
    s.ellipse(16, top + 13, 6, 7, 'b'); s.ellipse(16, top + 14, 4.6, 5.6, 'K')
    if view == 'up':                                   # cargo seen through the back
        s.rect(12, top + 15, 15, top + 19, 'B'); s.rect(12, top + 15, 15, top + 15, 't')
        s.ellipse(18.5, top + 17, 2.4, 2.6, 't'); s.set(18, top + 15, 'H')
    else:                                              # driver's bench
        s.rect(10, top + 19, 21, top + 20, 'B')
    s.rect(4, top + 22, 27, top + 27, 'B'); s.rect(4, top + 22, 27, top + 22, 't'); s.rect(4, top + 27, 27, top + 27, 'b')
    for x in (9, 16, 22): s.rect(x, top + 23, x, top + 26, 'b')
    _edge_wheel(s, 1, top + 18, top + 30, frame); _edge_wheel(s, 28, top + 18, top + 30, frame)
    if view == 'down' and hitched:
        s.rect(10, top + 28, 10, top + 33, 'b'); s.rect(21, top + 28, 21, top + 33, 'b')     # shafts
        h = horse('down', ('idle', 'walk1', 'walk2')[frame % 3])
        for y in range(32):
            for x in range(32):
                c = h.get(x, y)
                if c and not (c == 'K' and y >= 27): s.set(x, y + 30, c)
    s.outline()
    if view == 'down':
        return _shadow(s, 16, top + 32, 14, 1.6) if not hitched else _shadow(_shadow(s, 16, top + 32, 14, 1.6), 16, 58, 9)
    return _shadow(s, 16, top + 32, 14, 1.6)


def handcart_end(view, frame=0):
    s = Sprite()
    if view == 'down':                                 # heading south: wheel toward the viewer
        s.rect(8, 12, 23, 20, 'B'); s.rect(8, 12, 23, 13, 't'); s.rect(8, 20, 23, 20, 'b')
        for x, y, c in ((11, 11, 'r'), (14, 10, 'G'), (17, 11, 'y'), (20, 10, 'R'), (15, 12, 'H')): s.ellipse(x, y, 1.8, 1.4, c)
        _edge_wheel(s, 14, 19, 26, frame)
    else:                                              # heading north: handles toward the viewer
        s.rect(8, 10, 23, 18, 'B'); s.rect(8, 10, 23, 11, 't'); s.rect(8, 18, 23, 18, 'b')
        for x, y, c in ((11, 9, 'r'), (14, 8, 'G'), (17, 9, 'y'), (20, 8, 'R')): s.ellipse(x, y, 1.8, 1.4, c)
        s.rect(10, 19, 10, 26, 'b'); s.rect(21, 19, 21, 26, 'b'); s.set(9, 26, 'b'); s.set(22, 26, 'b')
        _edge_wheel(s, 14, 14, 18, frame)
    s.outline()
    return _with_shadow(s, 16, 27, 9, 1.1)


def wheelbarrow_end(view, frame=0):
    s = Sprite()
    if view == 'down':                                 # wheel leads, toward the viewer
        for i in range(7): s.rect(9 + i // 2, 11 + i, 22 - i // 2, 11 + i, 'S' if i else 's')
        s.ellipse(16, 11, 5, 1.4, 'b'); s.set(14, 10, 'B')
        s.rect(9, 9, 9, 11, 'b'); s.rect(22, 9, 22, 11, 'b')                                       # handles, far end
        _edge_wheel(s, 14, 18, 25, frame)
    else:                                              # handles toward the viewer
        for i in range(7): s.rect(9 + i // 2, 9 + i, 22 - i // 2, 9 + i, 'S' if i else 's')
        s.ellipse(16, 9, 5, 1.4, 'b')
        s.rect(10, 16, 10, 26, 'b'); s.rect(21, 16, 21, 26, 'b'); s.rect(12, 16, 12, 21, 'b'); s.rect(19, 16, 19, 21, 'b')
        _edge_wheel(s, 14, 8, 10, frame)
    s.outline()
    return _with_shadow(s, 16, 27, 8, 1.1)


def hitching_post():
    s = Sprite()
    s.rect(5, 16, 26, 17, 'B'); s.rect(5, 16, 26, 16, 't')
    for x in (7, 24): s.rect(x - 1, 14, x + 1, 26, 'B'); s.rect(x - 1, 14, x - 1, 26, 't'); s.rect(x - 1, 13, x + 1, 13, 'b')
    s.rect(13, 17, 13, 22, 'H'); s.set(14, 23, 'H'); s.set(12, 23, 'H')                            # tied rope
    s.ellipse(20, 25, 4, 1.2, 'H'); s.ellipse(20, 24.4, 3, 0.8, 'c')                                # water trough
    s.outline()
    return _with_shadow(s, 16, 27, 11, 1.2)


# ------------------------------------------------------------------ registry
SPECIES = [('hen', hen), ('rooster', rooster), ('chick', chick), ('cow', cow), ('pig', pig), ('sheep', sheep),
           ('deer', deer), ('horse', horse), ('duck', duck), ('duckling', duckling), ('cat', cat)]
SIDE_FRAMES = ('idle', 'walk1', 'walk2', 'action')
END_FRAMES = ('idle', 'walk1', 'walk2')
ACTION_NAME = {'hen': 'peck', 'rooster': 'peck', 'chick': 'peck', 'cow': 'graze', 'pig': 'root', 'sheep': 'graze',
               'deer': 'graze', 'horse': 'graze', 'duck': 'swim', 'duckling': 'peck', 'cat': 'sleep'}

ANIMALS = ([(f'{n}_{v}_{fr if fr != "action" else ACTION_NAME[n]}', (lambda f=f, v=v, fr=fr: f(v, fr)))
            for n, f in SPECIES for v in ('left', 'right') for fr in SIDE_FRAMES]
           + [(f'{n}_{v}_{fr}', (lambda f=f, v=v, fr=fr: f(v, fr))) for n, f in SPECIES for v in ('down', 'up') for fr in END_FRAMES])
AMBIENT = [(f'bees_f{i}', (lambda i=i: bees(i))) for i in range(4)] + [(f'jumping_trout_f{i}', (lambda i=i: jumping_trout(i))) for i in range(4)]
FARM_PROPS = [('chicken_coop', chicken_coop), ('feed_trough', feed_trough), ('hay_bale', hay_bale), ('milk_pail', milk_pail),
              ('hitching_post', hitching_post)]
CARTS = ([(f'handcart_{v}_f{i}', (lambda v=v, i=i: handcart(i) if v == 'left' else mirror(handcart(i)))) for v in ('left', 'right') for i in (0, 1)]
         + [(f'handcart_{v}_f{i}', (lambda v=v, i=i: handcart_end(v, i))) for v in ('down', 'up') for i in (0, 1)]
         + [(f'wheelbarrow_{v}_f{i}', (lambda v=v, i=i: wheelbarrow(i) if v == 'left' else mirror(wheelbarrow(i)))) for v in ('left', 'right') for i in (0, 1)]
         + [(f'wheelbarrow_{v}_f{i}', (lambda v=v, i=i: wheelbarrow_end(v, i))) for v in ('down', 'up') for i in (0, 1)])
WAGONS = ([(f'wagon_{v}_f{i}', (lambda v=v, i=i: wagon(i) if v == 'left' else mirror(wagon(i)))) for v in ('left', 'right') for i in range(3)]
          + [(f'wagon_parked_{v}', (lambda v=v: wagon(0, False) if v == 'left' else mirror(wagon(0, False)))) for v in ('left', 'right')])
WAGONS_NS = ([(f'wagon_{v}_f{i}', (lambda v=v, i=i: wagon_end(v, i))) for v in ('down', 'up') for i in range(3)]
             + [(f'wagon_parked_{v}', (lambda v=v: wagon_end(v, 0, False))) for v in ('down', 'up')])
