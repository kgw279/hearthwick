"""Art for the water content pack (registers into items_art.RAW / PREP / DISH)."""
from items_art import raw, prep, dish, board, creambowl, woodbowl, plate, cubes, coins, pile, wholes, steam, glaze, fillet, COL


def _bucket(s, fill=('c', 'u')):
    s.ellipse(16, 25, 8, 2, 'b')
    s.rect(9, 13, 23, 24, 'B'); s.rect(9, 13, 10, 24, 't'); s.rect(21, 13, 23, 24, 'b')
    s.rect(9, 16, 23, 16, 'K'); s.rect(9, 21, 23, 21, 'K')
    s.ellipse(16, 13, 7, 2, 't'); s.ellipse(16, 13, 6, 1.4, fill[0]); s.set(14, 13, fill[1]); s.set(15, 13, fill[1])
    for x, y in ((9, 11), (9, 10), (10, 9), (11, 8), (12, 7), (13, 7), (14, 6), (15, 6), (16, 6), (17, 6), (18, 6),
                 (19, 7), (20, 7), (21, 8), (22, 9), (23, 10), (23, 11)): s.set(x, y, 'K')


def _mug(s, x=11, y=11, fill='c', hi='u', body='B'):
    s.ellipse(x + 5, y + 13, 6, 1.4, 'b')
    s.rect(x, y, x + 9, y + 12, body); s.rect(x, y, x + 1, y + 12, 't' if body == 'B' else 'W'); s.rect(x + 8, y, x + 9, y + 12, 'b' if body == 'B' else 's')
    s.rect(x + 10, y + 3, x + 12, y + 3, 'b'); s.rect(x + 12, y + 3, x + 12, y + 8, 'b'); s.rect(x + 10, y + 8, x + 12, y + 8, 'b')
    s.ellipse(x + 4.5, y, 4.5, 1.2, fill); s.set(x + 3, y, hi)


def _teacup(s, cx=16, cy=17, fill=('o', 'g'), leaf='G'):
    s.ellipse(cx, cy + 6, 10, 2.6, 's'); s.ellipse(cx, cy + 5.5, 9, 2, 'W')         # saucer
    s.ellipse(cx, cy + 3, 6, 3, 'p'); s.rect(cx - 6, cy - 1, cx + 6, cy + 3, 'W'); s.rect(cx + 4, cy - 1, cx + 6, cy + 3, 's')
    s.rect(cx + 7, cy, cx + 8, cy, 'p'); s.rect(cx + 8, cy, cx + 8, cy + 2, 'p'); s.rect(cx + 7, cy + 2, cx + 8, cy + 2, 'p')
    s.ellipse(cx, cy - 1, 6, 1.6, 'p'); s.ellipse(cx, cy - 1, 5, 1.1, fill[0]); s.set(cx - 2, cy - 1, fill[1])
    if leaf: s.set(cx + 1, cy - 1, leaf)
    return cx, cy


def _bottle(s, fill=('n', 'v', 'm')):
    s.ellipse(16, 25, 6, 1.4, 'b')
    s.rect(11, 12, 21, 24, 'p'); s.rect(12, 14, 20, 24, fill[1]); s.rect(12, 14, 13, 24, fill[2]); s.rect(19, 14, 20, 24, fill[0])
    s.rect(14, 6, 18, 11, 'p'); s.rect(15, 8, 17, 11, fill[1]); s.rect(14, 4, 18, 6, 'B'); s.rect(14, 4, 18, 4, 't')
    s.rect(12, 18, 20, 21, 'k'); s.rect(13, 19, 19, 20, 'W'); s.set(15, 19, 'm'); s.set(17, 20, 'm')


def _poached(s, x, y):
    s.ellipse(x, y, 3.2, 2.2, 'W'); s.ellipse(x - 0.5, y - 0.6, 2.2, 1.3, 'W'); s.set(int(x) + 2, int(y) + 1, 's')
    s.ellipse(x, y - 0.5, 1.4, 1, 'y'); s.set(int(x) - 1, int(y) - 1, 'k')


# ---------------- raw ----------------
@raw('water')
def _(s): _bucket(s)


# ---------------- items ----------------
@prep('boiling_water')
def _(s):
    s.ellipse(16, 25, 10, 2.4, 'b'); s.ellipse(16, 21, 10, 5, 'K'); s.rect(6, 14, 26, 21, 'K'); s.rect(7, 14, 9, 21, 'd')
    s.ellipse(16, 14, 10, 2.6, 'd'); s.ellipse(16, 14, 8.4, 1.8, 'c')
    for x, y in ((12, 14), (16, 13), (19, 14), (14, 15)): s.set(x, y, 'u')
    s.rect(4, 15, 5, 16, 'K'); s.rect(27, 15, 28, 16, 'K'); steam(s, 12, 7)
@prep('herb_tea')
def _(s): _teacup(s); steam(s, 12, 7)
@prep('spiced_apple_tea')
def _(s): _mug(s, fill='r', hi='y'); s.set(13, 11, 'k'); steam(s, 11, 4)
@prep('berry_cordial')
def _(s): _bottle(s)
@prep('poached_egg')
def _(s): cx, cy = creambowl(s, ('c', 'u', 'u')); _poached(s, cx, cy - 1)
@prep('poached_trout')
def _(s): cx, cy = woodbowl(s, ('c', 'u', 'p')); fillet(s, cx, cy, ('P', 'W', 'W')); s.set(cx + 3, cy - 1, 'G'); steam(s)
@prep('vegetable_stock')
def _(s):
    cx, cy = woodbowl(s, ('H', 't', 'k'))
    for x, y in ((12, 14), (18, 15)): s.set(x, y, 'r')
    s.set(15, 13, 'm'); s.set(20, 13, 'G'); steam(s)
@prep('garden_soup')
def _(s):
    cx, cy = woodbowl(s, ('H', 't', 'k'))
    cubes(s, cx, cy, ('B', 't', 'k'), n=4, spread=(5, 1)); coins(s, cx, cy, ('B', 'r', 'y'), n=3, spread=(5, 1), r=1.2)
    s.set(cx + 2, cy - 1, 'G'); s.set(cx - 3, cy, 'G'); steam(s)


# ---------------- dishes ----------------
@dish('dish_cup_of_well_water')
def _(s):
    s.ellipse(16, 25, 7, 1.6, 'b')
    s.rect(11, 9, 20, 24, 'p'); s.rect(12, 12, 19, 24, 'c'); s.rect(18, 12, 19, 24, 'u'); s.rect(11, 24, 20, 24, 's')
    s.rect(12, 12, 19, 12, 'W'); s.set(13, 14, 'W'); s.set(13, 15, 'W')
@dish('dish_herb_tea')
def _(s): _teacup(s); s.set(9, 22, 'G'); s.set(10, 22, 'g'); steam(s, 12, 7)
@dish('dish_honey_herb_tea')
def _(s):
    _teacup(s, cx=14); steam(s, 10, 7)
    s.ellipse(25, 22, 3, 1.2, 'b'); s.rect(22, 16, 27, 22, 'H'); s.rect(22, 16, 23, 22, 'y'); s.rect(22, 14, 27, 15, 'B'); s.set(27, 19, 'r')
@dish('dish_berry_cordial')
def _(s):
    s.ellipse(16, 25, 6, 1.4, 'b')
    s.rect(11, 10, 20, 24, 'p'); s.rect(12, 13, 19, 24, 'v'); s.rect(12, 13, 13, 24, 'm'); s.rect(18, 13, 19, 24, 'n')
    s.rect(12, 13, 19, 13, 'P'); wholes(s, [(14, 12), (17, 11)], ('n', 'v', 'm'), r=1.2); s.set(19, 9, 'G'); s.set(20, 8, 'G')
@dish('dish_spiced_apple_tea')
def _(s):
    _mug(s, x=8, fill='r', hi='y'); steam(s, 8, 4)
    s.ellipse(24, 21, 3.4, 2.4, 'R'); s.ellipse(23.5, 20.5, 2.4, 1.6, 'P'); s.set(24, 18, 'b'); s.set(25, 18, 'G')
@dish('dish_poached_egg_on_toast')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 6, cy - 4, cx + 5, cy + 1, 'B'); s.rect(cx - 5, cy - 3, cx + 4, cy, 'r')
    _poached(s, cx, cy - 3); s.set(cx + 3, cy - 4, 'G')
@dish('dish_poached_egg_and_cress')
def _(s):
    cx, cy = plate(s); pile(s, cx, cy, 'GLg', n=26, rx=7, ry=2)
    s.ellipse(cx - 1, cy - 1.6, 4, 2.6, 's'); _poached(s, cx - 1, cy - 2)
@dish('dish_tea_and_shortbread')
def _(s):
    _teacup(s, cx=11, cy=15); steam(s, 7, 5)
    for x, y in ((19, 19), (21, 22)):
        s.rect(x, y, x + 7, y + 2, 'k'); s.rect(x, y + 2, x + 7, y + 2, 'H'); s.rect(x + 7, y, x + 7, y + 2, 'H')
        s.set(x + 2, y + 1, 'H'); s.set(x + 5, y + 1, 'H')
@dish('dish_poached_trout_and_greens')
def _(s):
    cx, cy = plate(s); pile(s, cx + 4, cy, 'GLg', n=14, rx=4, ry=2)
    fillet(s, cx - 2, cy - 1, ('P', 'W', 'W')); s.set(cx - 4, cy - 2, 'G'); s.set(cx, cy - 3, 'y')
@dish('dish_garden_soup_and_bread')
def _(s):
    cx, cy = woodbowl(s, ('H', 't', 'k'))
    cubes(s, cx, cy, ('B', 't', 'k'), n=4, spread=(5, 1)); coins(s, cx, cy, ('B', 'r', 'y'), n=3, spread=(5, 1), r=1.2)
    s.set(cx + 2, cy - 1, 'G'); steam(s)
    s.rect(21, 17, 28, 23, 'B'); s.rect(22, 18, 27, 22, 'r'); s.rect(21, 17, 28, 17, 'b')
