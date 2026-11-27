"""Art for the milk content pack (registers into items_art.PREP / DISH)."""
from items_art import (prep, dish, board, mixbowl, creambowl, woodbowl, skillet, plate, tray, cubes, coins, pile,
                       mound, wholes, steam, glaze, slab, fillet, noodles, COL, ball)


def _butter(s, x0, y0, w=10, h=5):
    """A butter block: pale top face, golden front, a knife curl."""
    s.rect(x0, y0 + 2, x0 + w, y0 + h, 'y'); s.rect(x0, y0 + h, x0 + w, y0 + h, 'H')
    s.rect(x0, y0, x0 + w, y0 + 2, 'k'); s.rect(x0 + w, y0, x0 + w, y0 + h, 'H')
    s.set(x0 + 2, y0 + 1, 'W'); s.set(x0 + 3, y0 + 1, 'W')


def _ramekin(s, cx=16, cy=19, fill='W', crust=None):
    s.ellipse(cx, cy + 3, 8, 3, 'b'); s.rect(cx - 8, cy - 1, cx + 8, cy + 3, 'B'); s.rect(cx - 8, cy, cx + 8, cy, 't'); s.ellipse(cx, cy - 1, 8, 2.6, 't')
    s.ellipse(cx, cy - 1, 6.6, 1.8, fill)
    if crust: s.ellipse(cx, cy - 1.3, 5.6, 1.4, crust); s.ellipse(cx + 1, cy - 1.5, 2.4, 0.7, 'H'); s.set(cx - 3, cy - 2, 'W')
    return cx, cy - 1


def _jug(s, fill='W'):
    s.ellipse(15, 24, 6, 1.6, 'b')
    s.rect(10, 11, 20, 24, 'p'); s.rect(10, 11, 11, 24, 'W'); s.rect(18, 11, 20, 24, 's')
    s.ellipse(15, 11, 5.5, 1.8, 's'); s.ellipse(15, 11, 4.4, 1.2, fill); s.set(9, 10, 'p'); s.set(8, 10, 'p')
    s.rect(21, 14, 23, 14, 's'); s.rect(23, 14, 23, 19, 's'); s.rect(21, 19, 23, 19, 's')
    s.rect(10, 16, 20, 16, 'u')


def _dish(s, fill, top):
    s.ellipse(16, 21, 11, 4, 'b'); s.rect(5, 15, 27, 21, 'B'); s.ellipse(16, 15, 11, 4, 't')
    s.ellipse(16, 15, 9.4, 3.2, fill); s.ellipse(15, 14.6, 7, 2.2, top)
    return 16, 15


def _scone(s, x, y):
    ball(s, x, y, 3.4, 2.8, 'B', 't', 'k', spec=None); s.rect(int(x) - 3, int(y), int(x) + 3, int(y), 'B'); s.set(int(x) - 1, int(y) - 2, 'b')


def _finger(s, x, y):
    s.rect(x, y, x + 7, y + 2, 'k'); s.rect(x, y + 2, x + 7, y + 2, 'H'); s.rect(x + 7, y, x + 7, y + 2, 'H')
    s.set(x + 2, y + 1, 'H'); s.set(x + 5, y + 1, 'H')


def _glass(s, x=19, y=8, fill='W'):
    s.rect(x, y, x + 5, y + 12, 'p'); s.rect(x + 1, y + 2, x + 4, y + 12, fill); s.rect(x + 4, y + 2, x + 4, y + 12, 's')
    s.rect(x, y + 12, x + 5, y + 12, 's')


# ---------------- items ----------------
@prep('butter')
def _(s): cx, cy = board(s); _butter(s, cx - 6, cy - 4, w=11, h=5); s.rect(cx + 5, cy + 2, cx + 8, cy + 2, 'k')
@prep('brown_butter')
def _(s):
    cx, cy = skillet(s); s.ellipse(cx, cy, 6, 2.4, 'r'); s.ellipse(cx - 1, cy - 0.5, 4, 1.4, 'H')
    for x, y in ((cx - 3, cy), (cx + 2, cy + 1), (cx + 3, cy - 1)): s.set(x, y, 'b')
    s.set(cx - 2, cy - 1, 'k')
@prep('fresh_curds')
def _(s): cx, cy = creambowl(s, ('s', 'W', 'W')); wholes(s, [(12, 14), (15, 13), (18, 14), (20, 15), (14, 15), (17, 15)], ('s', 'k', 'W'), r=1.8); s.set(15, 12, 'W')
@prep('cream_sauce')
def _(s): _jug(s, 'k'); s.set(8, 11, 'k'); s.set(8, 12, 'k')
@prep('clotted_cream')
def _(s): _ramekin(s, fill='k', crust='y')
@prep('grain_pudding')
def _(s):
    cx, cy = _dish(s, 'k', 'y'); pile(s, cx, cy, 'Ht', n=14, rx=7, ry=2)
    s.ellipse(cx - 2, cy - 1, 2.4, 0.8, 'r')
@prep('potato_soup')
def _(s): cx, cy = woodbowl(s, ('t', 'k', 'W')); cubes(s, cx, cy, ('H', 'y', 'k'), n=4, spread=(5, 1)); s.set(cx + 3, cy - 1, 'G'); steam(s)
@prep('scones')
def _(s):
    cx, cy = tray(s)
    for x, y in ((cx - 6, cy + 1), (cx, cy), (cx + 6, cy + 1), (cx - 3, cy + 3), (cx + 3, cy + 3)): _scone(s, x, y)
@prep('shortbread')
def _(s):
    cx, cy = plate(s)
    for x, y in ((cx - 9, cy - 3), (cx + 1, cy - 3), (cx - 4, cy + 1)): _finger(s, x, y)


# ---------------- dishes ----------------
@dish('dish_cold_milk')
def _(s):
    s.ellipse(16, 25, 7, 1.6, 'b')
    s.rect(11, 9, 20, 24, 'p'); s.rect(12, 12, 19, 24, 'W'); s.rect(18, 12, 19, 24, 's'); s.rect(11, 24, 20, 24, 's')
    s.rect(12, 12, 19, 12, 's'); s.set(13, 14, 'p'); s.set(13, 15, 'p')
@dish('dish_curds_and_honey')
def _(s):
    cx, cy = creambowl(s, ('s', 'W', 'W'))
    wholes(s, [(12, 14), (15, 13), (18, 14), (20, 15), (14, 15)], ('s', 'k', 'W'), r=1.8); glaze(s, cx, cy - 2, 4)
@dish('dish_fresh_curds_and_herbs')
def _(s):
    cx, cy = plate(s); wholes(s, [(cx - 4, cy), (cx, cy - 1), (cx + 4, cy), (cx - 2, cy + 1), (cx + 2, cy + 1)], ('s', 'k', 'W'), r=2.2)
    pile(s, cx, cy - 1, 'GLg', n=10, rx=6, ry=2, seed=7)
@dish('dish_buttered_carrots')
def _(s):
    cx, cy = plate(s); coins(s, cx, cy, ('B', 'r', 'y'), n=7, spread=(6, 2))
    s.rect(cx - 1, cy - 3, cx + 2, cy - 2, 'k'); s.rect(cx - 1, cy - 2, cx + 2, cy - 2, 'y'); s.set(cx + 4, cy - 2, 'G')
@dish('dish_buttered_toast')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 6, cy - 4, cx + 5, cy + 1, 'B'); s.rect(cx - 5, cy - 3, cx + 4, cy, 'r')
    s.rect(cx - 2, cy - 3, cx + 1, cy - 1, 'k'); s.rect(cx - 2, cy - 1, cx + 1, cy - 1, 'y'); s.set(cx - 4, cy - 1, 'y'); s.set(cx + 3, cy - 2, 'y')
@dish('dish_berries_and_clotted_cream')
def _(s):
    cx, cy = creambowl(s, ('n', 'v', 'm'))
    wholes(s, [(12, 14), (19, 14), (20, 15), (12, 15)], ('n', 'v', 'm'), r=1.6)
    s.ellipse(cx, cy - 1, 3.6, 1.8, 'k'); s.ellipse(cx - 0.5, cy - 1.6, 2.4, 1, 'W'); s.set(cx + 1, cy - 2, 'y')
@dish('dish_shortbread_and_milk')
def _(s):
    plate(s, 23, 9); _finger(s, 4, 17); _finger(s, 6, 20); _glass(s, 19, 7)
@dish('dish_creamy_mushrooms')
def _(s):
    cx, cy = plate(s); s.ellipse(cx, cy, 7, 3, 'k'); s.ellipse(cx - 1, cy - 0.5, 5, 2, 'W')
    wholes(s, [(cx - 4, cy), (cx, cy - 1), (cx + 4, cy), (cx - 1, cy + 1)], ('b', 'B', 't'), r=2); s.set(cx + 2, cy - 2, 'G')
@dish('dish_cheesy_noodles')
def _(s):
    cx, cy = creambowl(s, ('H', 'y', 'k')); noodles(s, cx, cy + 1, COL['noodle'], rows=2)
    glaze(s, cx, cy - 1, 5); s.set(cx - 3, cy, 'r'); s.set(cx + 2, cy - 1, 'r'); steam(s)
@dish('dish_grain_pudding_and_berries')
def _(s):
    cx, cy = creambowl(s, ('H', 'k', 'k')); pile(s, cx, cy, 'Ht', n=10, rx=7, ry=1)
    s.ellipse(cx + 1, cy - 1, 3.4, 1.2, 'v'); s.set(cx, cy - 1, 'm'); s.set(cx + 2, cy - 2, 'n'); steam(s)
@dish('dish_fireside_potato_soup')
def _(s):
    cx, cy = woodbowl(s, ('t', 'k', 'W'))
    cubes(s, cx, cy, ('b', 'B', 'r'), n=5, spread=(5, 1), seed=6); s.set(cx + 2, cy - 1, 'G'); s.set(cx - 3, cy, 'G'); steam(s)
@dish('dish_brown_butter_trout')
def _(s):
    cx, cy = plate(s); fillet(s, cx, cy - 1, ('B', 'r', 'y'))
    s.ellipse(cx + 1, cy + 2, 6, 1, 'r'); s.set(cx - 3, cy + 2, 'b'); s.set(cx + 4, cy + 2, 'b')
    pile(s, cx, cy - 2, 'GLg', n=6, rx=4, ry=1, seed=9)
@dish('dish_cream_tea')
def _(s):
    cx, cy = plate(s, 22, 11)
    _scone(s, cx - 5, cy - 1); _scone(s, cx + 3, cy - 2)
    s.ellipse(cx + 3, cy - 4, 2.2, 0.9, 'k'); s.set(cx + 3, cy - 5, 'v'); s.set(cx + 4, cy - 5, 'm')
    s.ellipse(cx + 5, cy + 2, 2.6, 1.2, 'v'); s.ellipse(cx - 2, cy + 2, 2.6, 1.2, 'k'); s.set(cx - 2, cy + 1, 'W')
@dish('dish_venison_in_cream_sauce')
def _(s):
    cx, cy = plate(s); s.ellipse(cx, cy + 1, 8, 2.6, 'k'); s.ellipse(cx - 2, cy + 1, 5, 1.4, 'W')
    slab(s, cx, cy - 1, ('b', 'R', 'B'), marks=None, rx=5.5, ry=2.6); s.set(cx + 4, cy - 3, 'G'); s.set(cx - 5, cy + 1, 'G')
