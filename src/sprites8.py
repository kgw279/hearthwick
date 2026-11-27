"""Action poses and animated loops.

Poses are built from the existing character and guest sprites, which all share one skeleton
(head rows 4-16, body 17-23, legs 24-26, ground shadow 27-28), so every look gets them:
  sit   - seated on a stool/bench, 4 views, with two eating frames (fork to mouth)
  carry - townsfolk carrying a tray (plate + mug), 4 views x idle/walk1/walk2
  work  - townsfolk at a station (seen from behind), two alternating arm frames

Animated loops re-colour the fire, steam and water of existing sprites frame by frame.
"""
from core import Sprite
from sprites2 import STATIONS, dining_table
from sprites3 import character, CHAR_LOOKS, CHAR_VIEWS, INTERIOR, mirror
from sprites4 import FOLK, FOLK_NAMES
from sprites7 import table_set
from sprites import TILES

HIP = 23          # last body row
SEAT_DROP = 3     # how far the body sinks when seated

_FOLK = dict(FOLK)


def base(look, view, frame='idle'):
    if look in CHAR_LOOKS:
        return character(look, view, frame)
    return _FOLK[f'{look}_{view}_{frame}']()


def _pants(s):
    for x in (15, 16, 14, 17):
        c = s.get(x, HIP)
        if c and c != 'O': return c
    return 'b'


def _seat_body(src):
    """Copy head+body down by SEAT_DROP, dropping legs and shadow."""
    s = Sprite()
    for y in range(HIP + 1):
        for x in range(32):
            c = src.get(x, y)
            if c: s.set(x, y + SEAT_DROP, c)
    return s


# ---------------------------------------------------------------- sit / eat
def _fork(s, hx, hy, sleeve, shoulder):
    """Forearm from shoulder to hand, hand at (hx, hy), fork tines just past it."""
    sx, sy = shoulder
    n = max(abs(hx - sx), abs(hy - sy))
    for i in range(n + 1):
        x = round(sx + (hx - sx) * i / max(n, 1)); y = round(sy + (hy - sy) * i / max(n, 1))
        s.set(x, y, sleeve)
    s.set(hx, hy, 'k'); s.set(hx - 1, hy - 1, 'S'); s.set(hx - 1, hy - 2, 's')


def sit(look, view, frame='idle'):
    src = base(look, view)
    s = _seat_body(src)
    pants = _pants(src)
    hip = HIP + SEAT_DROP
    if view == 'left' or view == 'right':
        L = _seat_body(base(look, 'left'))
        # thigh forward (toward the left), shin down, shoe
        L.rect(9, hip - 1, 14, hip, pants); L.rect(9, hip + 1, 10, hip + 2, pants); L.rect(8, hip + 3, 10, hip + 3, 'b')
        if frame != 'idle':
            sleeve = base(look, 'left').get(17, 20) or pants
            up = frame == 'eat2'
            _fork(L, 12, 18 + SEAT_DROP if up else 22 + SEAT_DROP, sleeve, (16, 20 + SEAT_DROP))
        L.outline()
        return L if view == 'left' else mirror(L)
    if view == 'down':                       # facing the viewer, legs hidden behind the table
        if frame != 'idle':
            sleeve = src.get(12, 20) or pants
            up = frame == 'eat2'
            _fork(s, 14, 18 + SEAT_DROP if up else 22 + SEAT_DROP, sleeve, (12, 20 + SEAT_DROP))
        s.outline()
        return s
    # up: seen from behind, knees just showing under the stool
    s.rect(12, hip + 1, 19, hip + 1, pants)
    if frame == 'eat2':                      # elbow lifts
        s.set(10, 19 + SEAT_DROP, s.get(11, 20 + SEAT_DROP) or pants)
    s.outline()
    return s


# ---------------------------------------------------------------- carry
def _tray(s, x0, y, w=11):
    s.rect(x0, y, x0 + w, y + 1, 'S'); s.rect(x0, y, x0 + w, y, 's')
    px = x0 + 3
    s.ellipse(px, y - 1, 3, 1.2, 'W'); s.ellipse(px, y - 1.4, 1.8, 0.8, 'B'); s.set(px - 1, y - 2, 't')   # plate
    s.rect(x0 + 7, y - 4, x0 + 9, y - 1, 'B'); s.rect(x0 + 7, y - 5, x0 + 9, y - 5, 'W')                 # mug
    s.set(px, y - 4, 'p'); s.set(px + 1, y - 5, 'p')                                                       # steam


def carry(look, view, frame='idle'):
    s = base(look, view, frame).copy()
    lift = 1 if frame != 'idle' and s.get(15, 16) is None else 0
    if view == 'down':
        _tray(s, 10, 19 - lift)
        s.set(10, 21 - lift, 'k'); s.set(21, 21 - lift, 'k')
    elif view == 'up':
        s.rect(8, 18, 9, 19, 'S'); s.rect(22, 18, 23, 19, 'S'); s.set(8, 18, 's'); s.set(22, 18, 's')
        s.set(10, 19, 'k'); s.set(21, 19, 'k')
    else:
        L = base(look, 'left', frame).copy()
        _tray(L, 3, 20)
        L.set(12, 21, 'k'); L.set(13, 21, L.get(17, 20) or 'U')
        L.outline()
        return L if view == 'left' else mirror(L)
    s.outline()
    return s


# ---------------------------------------------------------------- work (at a station, from behind)
def work(look, frame):
    s = base(look, 'up').copy()
    sleeve = s.get(13, 20) or 'U'
    side = 11 if frame == 1 else 20
    other = 20 if frame == 1 else 11
    # raised arm: sleeve up the side of the body, hand above shoulder height
    s.set(side, 22, s.get(side + (1 if side < 16 else -1), 22))
    dx = -1 if side < 16 else 1
    for y in range(14, 19): s.set(side + dx, y, sleeve)
    s.set(side + dx, 13, 'k'); s.set(side + dx, 12, 'k')
    s.set(other, 21, 'k')
    s.outline()
    return s


# ---------------------------------------------------------------- animated loops
FIRE_RANK = {'r': 0, 'y': 1, 'W': 2}
FIRE_COL = ['r', 'y', 'W']


def flicker(src, box, frame, tongues=True):
    """Shift flame colours in a box and grow/shrink flame tips. frame 0 = the original sprite."""
    if frame == 0: return src.copy()
    s = src.copy()
    x0, y0, x1, y1 = box
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = src.get(x, y)
            if c in FIRE_RANK:
                d = ((x * 7 + y * 3 + frame * 5) % 3) - 1
                r = max(0, min(1 if c != 'W' else 2, FIRE_RANK[c] + d))
                s.set(x, y, FIRE_COL[r])
            elif tongues and c == 'K' and src.get(x, y + 1) in FIRE_RANK and (x + frame) % 3 == 0:
                s.set(x, y, 'r')
    return s


def rise(src, box, frame, colour='p'):
    """Move steam pixels up one row per frame, wrapping inside the box."""
    if frame == 0: return src.copy()
    s = src.copy()
    x0, y0, x1, y1 = box
    pts = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if src.get(x, y) == colour]
    for x, y in pts: s.set(x, y, None)
    h = y1 - y0 + 1
    for x, y in pts:
        ny = y0 + (y - y0 - frame) % h
        if s.get(x, ny) is None: s.set(x + (frame % 2) * (1 if x % 2 else -1), ny, colour)
    return s


_ST = {n: f for n, f, _ in STATIONS}
_IN = dict(INTERIOR)


def anim_stove(f): return flicker(_ST['stove'](), (11, 17, 20, 22), f)
def anim_oven(f): return flicker(_ST['oven'](), (12, 20, 19, 22), f)
def anim_grill(f): return flicker(_ST['grill'](), (9, 13, 24, 23), f, tongues=False)
def anim_fireplace(f): return flicker(_IN['fireplace'](), (10, 15, 21, 24), f)
def anim_cauldron(f): return rise(flicker(_ST['cauldron'](), (10, 24, 21, 25), f, tongues=False), (10, 2, 22, 8), f)


def anim_candle_table(f):
    s = table_set(2)
    s.set(15, 9, 'r' if f != 1 else 'y'); s.set(15, 8, 'y' if f == 2 else None)
    if f == 2: s.set(14, 8, 'O'); s.set(16, 8, 'O'); s.set(15, 7, 'O')
    return s


def anim_cask(f):
    s = _ST['brewing_cask']()
    s.set(4, 19, None)
    if f < 2: s.set(4, 19 + f, 'H')
    return s


def anim_water(f):
    """Highlights drift one pixel and back (ping-pong), so the tile stays seamless."""
    src = dict(TILES)['water']()
    s = src.copy()
    off = (0, 1, 2, 1)[f]
    pts = [(x, y, src.get(x, y)) for y in range(32) for x in range(32) if src.get(x, y) in ('c', 'p', 'U')]
    for x, y, c in pts: s.set(x, y, 'u')
    for x, y, c in pts: s.set((x + off) % 32, y, c)
    return s


LOOPS = [('stove', anim_stove, 3), ('oven', anim_oven, 3), ('grill', anim_grill, 3), ('cauldron', anim_cauldron, 3),
         ('fireplace', anim_fireplace, 3), ('dining_table_set_candle', anim_candle_table, 3),
         ('brewing_cask', anim_cask, 3), ('water', anim_water, 4)]
ANIMATED = [(f'{n}_f{i}', (lambda fn=fn, i=i: fn(i))) for n, fn, k in LOOPS for i in range(k)]

SITTERS = CHAR_LOOKS + FOLK_NAMES
ACTIONS = ([(f'{lk}_sit_{v}_{fr}', (lambda lk=lk, v=v, fr=fr: sit(lk, v, fr)))
            for lk in SITTERS for v in CHAR_VIEWS for fr in ('idle', 'eat1', 'eat2')]
           + [(f'{lk}_carry_{v}_{fr}', (lambda lk=lk, v=v, fr=fr: carry(lk, v, fr)))
              for lk in CHAR_LOOKS for v in CHAR_VIEWS for fr in ('idle', 'walk1', 'walk2')]
           + [(f'{lk}_work_up_{i}', (lambda lk=lk, i=i: work(lk, i))) for lk in CHAR_LOOKS for i in (1, 2)])
