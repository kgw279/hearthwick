"""Art for the wheat content pack (registers into items_art.PREP / DISH)."""
from items_art import (prep, dish, PREP, board, mixbowl, creambowl, woodbowl, skillet, plate, tray, cubes, pile,
                       mound, fillet, wholes, steam, glaze, noodles, leaves, COL, _fried_egg_on, ball)
from sprites import TOAST


def _rolls(s, pts, r=2.8):
    for x, y in pts:
        ball(s, x, y, r + 0.4, r, 'B', 't', 'k', spec=None)
        s.set(int(x - 1), int(y - 1), 'k'); s.set(int(x), int(y - 1), 'B')


def _fritter(s, x, y):
    s.ellipse(x, y, 3.4, 2.2, 'B'); s.ellipse(x - 0.3, y - 0.3, 2.8, 1.7, 'r'); s.ellipse(x - 0.6, y - 0.6, 1.4, 0.8, 'y')
    s.set(int(x), int(y), 'B')


def _cracker(s, x, y):
    s.rect(x, y, x + 4, y + 3, 't'); s.rect(x, y, x + 4, y, 'k'); s.rect(x + 4, y, x + 4, y + 3, 'B')
    s.set(x + 1, y + 1, 'B'); s.set(x + 3, y + 2, 'B')


# ---------------- items ----------------
@prep('dumplings')
def _(s): cx, cy = plate(s); wholes(s, [(cx - 4, cy), (cx + 3, cy), (cx - 1, cy - 2)], ('t', 'k', 'W'), r=3)
@prep('dough_balls')
def _(s): cx, cy = board(s); wholes(s, [(cx - 5, cy), (cx - 1, cy - 1), (cx + 3, cy), (cx + 1, cy + 1)], ('t', 'k', 'W'), r=1.8)
@prep('bread_rolls')
def _(s): cx, cy = tray(s); _rolls(s, [(cx - 5, cy - 1), (cx, cy - 2), (cx + 5, cy - 1)])
@prep('fritters')
def _(s):
    cx, cy = plate(s)
    for x, y in ((cx - 4, cy), (cx + 3, cy + 1), (cx, cy - 2)): _fritter(s, x, y)
@prep('crackers')
def _(s):
    cx, cy = plate(s)
    for x, y in ((cx - 7, cy - 1), (cx - 2, cy - 2), (cx + 3, cy - 1), (cx - 4, cy + 1)): _cracker(s, x, y)
@prep('breadcrumbs')
def _(s): cx, cy = creambowl(s, ('B', 't', 'k')); pile(s, cx, cy, 'tBkH', n=24, rx=7, ry=1)
@prep('croutons')
def _(s): cx, cy = skillet(s); cubes(s, cx, cy, ('B', 'r', 'y'), n=8, spread=(6, 2))
@prep('bread_pudding')
def _(s):
    s.rect(6, 15, 25, 24, 'R'); s.rect(6, 15, 25, 15, 'P'); s.rect(6, 24, 25, 24, 'b')       # baking dish
    s.rect(8, 16, 23, 21, 'k'); s.rect(8, 16, 23, 16, 'W')
    for x, y in ((9, 17), (13, 18), (17, 17), (21, 18), (11, 20), (19, 20)): s.rect(x, y, x + 1, y, 'B'); s.set(x, y - 1, 't')
    s.rect(4, 17, 5, 19, 'R'); s.rect(26, 17, 27, 19, 'R')                                       # handles
@prep('herb_stuffing')
def _(s): cx, cy = mixbowl(s, ('b', 'B', 't')); pile(s, cx, cy, 'GgtL', n=14, rx=7, ry=1)
@prep('crumbed_trout')
def _(s): cx, cy = plate(s); fillet(s, cx, cy, ('B', 't', 'y')); pile(s, cx, cy - 1, 'Hk', n=10, rx=6, ry=2)
@prep('granola')
def _(s): cx, cy = creambowl(s, ('B', 't', 'k')); pile(s, cx, cy, 'HBtb', n=22, rx=7, ry=1); s.set(cx - 2, cy - 1, 'y'); s.set(cx + 3, cy, 'r')


# ---------------- dishes ----------------
@dish('dish_bread_and_honey')
def _(s):
    cx, cy = plate(s)
    for ox in (-4, 3):
        s.rect(cx - 4 + ox, cy - 4, cx + 2 + ox, cy + 1, 'B'); s.rect(cx - 3 + ox, cy - 3, cx + 1 + ox, cy, 'k')
    glaze(s, cx, cy - 2, 5)
@dish('dish_egg_on_toast')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 6, cy - 4, cx + 5, cy + 1, 'B'); s.rect(cx - 5, cy - 3, cx + 4, cy, 'r'); s.rect(cx - 5, cy - 3, cx + 4, cy - 3, 't')
    _fried_egg_on(s, cx, cy - 2)
@dish('dish_crackers_and_cheese')
def _(s):
    cx, cy = plate(s)
    for x, y in ((cx - 8, cy - 1), (cx - 4, cy + 1), (cx - 6, cy - 3)): _cracker(s, x, y)
    for i in range(6): s.rect(cx + 1 + i, cy - i // 2, cx + 7, cy - i // 2, 'y')
    s.rect(cx + 1, cy + 1, cx + 7, cy + 1, 'H'); s.set(cx + 5, cy - 1, 'H')
@dish('dish_grain_salad')
def _(s): cx, cy = creambowl(s, ('t', 'k', 'W')); pile(s, cx, cy, 'tkH', n=12, rx=7, ry=1); pile(s, cx, cy, 'GL', n=6, rx=6, ry=1, seed=4); cubes(s, cx, cy - 1, ('b', 'R', 'r'), n=3, spread=(5, 1))
@dish('dish_dumpling_broth')
def _(s): cx, cy = woodbowl(s, ('g', 'h', 'L')); wholes(s, [(cx - 4, cy), (cx + 3, cy), (cx, cy - 1)], ('t', 'k', 'W'), r=2); s.set(cx + 6, cy, 'G'); steam(s)
@dish('dish_honey_fritters')
def _(s):
    cx, cy = plate(s)
    for x, y in ((cx - 4, cy), (cx + 3, cy + 1), (cx, cy - 2)): _fritter(s, x, y)
    glaze(s, cx, cy - 4, 4)
@dish('dish_warm_rolls')
def _(s):
    s.ellipse(16, 21, 11, 4, 'H'); s.ellipse(16, 20, 10, 3, 'B'); s.rect(5, 18, 27, 21, 'H')     # basket
    for x in range(6, 27, 3): s.set(x, 19, 't'); s.set(x + 1, 21, 'b')
    s.rect(7, 16, 25, 17, 'R'); s.rect(7, 16, 10, 16, 'W') ; s.rect(14, 16, 17, 16, 'W'); s.rect(21, 16, 24, 16, 'W')   # cloth
    _rolls(s, [(11, 14), (16, 13), (21, 14), (14, 16), (19, 16)], r=2.6)
@dish('dish_onion_noodle_pan')
def _(s): cx, cy = skillet(s); noodles(s, cx, cy + 1, ('b', 'H', 'y'), rows=2); pile(s, cx, cy, 'Brt', n=10, rx=6, ry=1); pile(s, cx, cy - 1, 'GL', n=5, rx=5, ry=1, seed=8)
@dish('dish_granola_and_cream')
def _(s): cx, cy = creambowl(s, ('B', 't', 'k')); pile(s, cx, cy, 'HBtb', n=16, rx=7, ry=1); s.ellipse(cx + 2, cy - 2, 3, 1.4, 'W'); s.set(cx + 2, cy - 4, 'W'); s.set(cx - 4, cy - 1, 'v')
@dish('dish_hearthwick_onion_soup')
def _(s):
    cx, cy = woodbowl(s, ('b', 'B', 't'))
    s.ellipse(cx, cy, 6, 1.4, 'y'); s.ellipse(cx - 1, cy - 0.4, 3, 0.6, 'W')
    cubes(s, cx, cy - 1, ('B', 'r', 'y'), n=4, spread=(6, 1)); steam(s)
@dish('dish_crumbed_trout')
def _(s):
    cx, cy = plate(s, 21, 12); fillet(s, cx - 1, cy, ('B', 't', 'y')); pile(s, cx - 1, cy - 1, 'Hk', n=10, rx=6, ry=2)
    pile(s, cx, cy - 3, 'GL', n=5, rx=4, ry=1); s.ellipse(cx + 8, cy + 1, 1.6, 1.2, 'y'); s.set(cx + 8, cy + 1, 'W')
@dish('dish_bread_pudding')
def _(s):
    plate(s, 22, 10)
    s.rect(9, 13, 22, 20, 'k'); s.rect(9, 13, 22, 14, 'B'); s.rect(19, 13, 22, 20, 't')
    for x, y in ((11, 16), (15, 17), (13, 18)): s.set(x, y, 'B')
    glaze(s, 15, 12, 4); s.set(10, 20, 'r'); s.set(21, 21, 'r')
@dish('dish_stuffed_mutton_roast')
def _(s):
    cx, cy = plate(s, 21, 12)
    ball(s, cx - 2, cy - 1, 6, 3.6, 'b', 'B', 'r', spec=None); s.rect(cx - 6, cy - 3, cx + 1, cy - 3, 't')
    pile(s, cx - 7, cy + 1, 'BtGg', n=12, rx=3, ry=1)
    for i in range(3): s.rect(cx + 4, cy - 1 + i * 2, cx + 8, cy - 1 + i * 2, 'r'); s.set(cx + 8, cy - 1 + i * 2, 'B')
    s.set(cx, cy - 5, 'G'); s.set(cx + 1, cy - 6, 'L')
