"""Art for the drinks content pack. Items are drinks in their keeping vessel (jug, bottle, glass);
dishes are the same drink served (tankard, goblet, mug) the way it reaches the table."""
from items_art import prep, dish, plate, board, steam, ball, wholes, pile

AMBER = ('H', 'r', 'y')      # ale, cider, mead: dark, base, light
STOUT = ('K', 'b', 'B')
WINE = ('n', 'v', 'm')
PINK = ('R', 'P', 'k')
CREAM = ('t', 'k', 'W')
APPLE = ('H', 'y', 'k')


def _jug(s, fill, foam=None, clay=('P', 'R', 'b')):
    d, b, l = fill
    hi, mid, lo = clay
    s.ellipse(15, 25, 7, 1.6, 'b')
    s.rect(9, 12, 21, 24, mid); s.rect(9, 12, 10, 24, hi); s.rect(19, 12, 21, 24, lo); s.rect(9, 16, 21, 16, 'k')
    s.ellipse(15, 12, 6, 1.8, 'b'); s.ellipse(15, 12, 4.8, 1.2, foam or b); s.set(8, 11, mid); s.set(7, 11, mid)
    s.rect(22, 14, 24, 14, 'b'); s.rect(24, 14, 24, 20, 'b'); s.rect(22, 20, 24, 20, 'b')
    if foam: s.set(13, 11, foam); s.set(16, 11, foam)


def _bottle(s, fill, label='k'):
    d, b, l = fill
    s.ellipse(16, 25, 6, 1.4, 'b')
    s.rect(11, 13, 21, 24, d); s.rect(12, 13, 13, 24, l); s.rect(14, 13, 19, 24, b); s.rect(20, 13, 21, 24, d)
    s.rect(14, 6, 18, 12, d); s.rect(15, 7, 15, 12, l); s.rect(14, 4, 18, 5, 'B'); s.rect(14, 4, 18, 4, 't')
    s.rect(12, 17, 20, 21, label); s.rect(13, 18, 19, 20, 'W'); s.set(15, 19, b); s.set(17, 19, b)


def _glass(s, fill, x=12, y=10, h=14):
    d, b, l = fill
    s.ellipse(x + 4, y + h + 1, 6, 1.4, 'b')
    s.rect(x, y, x + 8, y + h, 'p'); s.rect(x + 1, y + 3, x + 7, y + h, b); s.rect(x + 1, y + 3, x + 2, y + h, l); s.rect(x + 6, y + 3, x + 7, y + h, d)
    s.rect(x + 1, y + 3, x + 7, y + 3, l); s.rect(x, y + h, x + 8, y + h, 's')


def _tankard(s, fill, foam='W', x=10, y=11):
    d, b, l = fill
    s.ellipse(x + 6, y + 14, 7, 1.6, 'b')
    s.rect(x, y, x + 11, y + 13, 'B'); s.rect(x, y, x + 1, y + 13, 't'); s.rect(x + 10, y, x + 11, y + 13, 'b')
    for yy in (y + 3, y + 10): s.rect(x, yy, x + 11, yy, 'S')
    s.rect(x + 12, y + 3, x + 14, y + 3, 'S'); s.rect(x + 14, y + 3, x + 14, y + 9, 'S'); s.rect(x + 12, y + 9, x + 14, y + 9, 'S')
    s.ellipse(x + 5.5, y, 5.5, 1.6, d); s.ellipse(x + 5.5, y, 4.6, 1, b)
    if foam:
        s.ellipse(x + 5.5, y - 1, 5.8, 1.8, foam); s.set(x + 1, y + 1, foam); s.set(x + 1, y + 2, foam); s.set(x + 9, y + 1, foam)
        s.set(x + 3, y - 2, foam); s.set(x + 7, y - 2, foam)


def _goblet(s, fill, x=16, y=10):
    d, b, l = fill
    s.ellipse(x, y + 15, 5, 1.4, 'S'); s.rect(x - 1, y + 9, x, y + 14, 'S'); s.set(x - 1, y + 10, 's')
    for i in range(9):
        w = 6 - i // 2
        s.rect(x - w, y + i, x + w - 1, y + i, 'S')
    for i in range(1, 5):                                   # liquid seen through the cup
        w = 5 - i // 2
        s.rect(x - w, y + i, x + w - 2, y + i, b); s.set(x + w - 2, y + i, d)
    s.ellipse(x - 0.5, y, 6, 1.6, 's'); s.ellipse(x - 0.5, y, 5, 1, l)
    s.rect(x - 5, y + 2, x - 5, y + 5, 's')


def _mug(s, fill, x=11, y=12, body=('P', 'R', 'b')):
    d, b, l = fill
    hi, mid, lo = body
    s.ellipse(x + 5, y + 13, 6, 1.4, 'b')
    s.rect(x, y, x + 9, y + 12, mid); s.rect(x, y, x + 1, y + 12, hi); s.rect(x + 8, y, x + 9, y + 12, lo)
    s.rect(x + 10, y + 3, x + 12, y + 3, lo); s.rect(x + 12, y + 3, x + 12, y + 8, lo); s.rect(x + 10, y + 8, x + 12, y + 8, lo)
    s.ellipse(x + 4.5, y, 4.5, 1.2, b); s.set(x + 3, y, l)


def _coaster(s):
    s.ellipse(16, 25, 10, 2.6, 'b'); s.ellipse(16, 24.6, 9, 2, 'B')


# ---------------- items ----------------
@prep('apple_juice')
def _(s): _glass(s, APPLE, h=14); s.set(14, 14, 'W')
@prep('hearth_ale')
def _(s): _jug(s, AMBER, foam='W')
@prep('oat_stout')
def _(s): _jug(s, STOUT, foam='k', clay=('s', 'e', 'd'))
@prep('orchard_cider')
def _(s): _bottle(s, ('H', 'y', 'k'))
@prep('honey_mead')
def _(s): _bottle(s, AMBER); s.set(16, 19, 'H'); s.set(15, 20, 'y')
@prep('berry_wine')
def _(s): _bottle(s, WINE)
@prep('mulled_cider')
def _(s): _mug(s, ('H', 'r', 'y'), body=('k', 't', 'B')); s.set(14, 12, 'R'); steam(s, 11, 5)
@prep('mulled_wine')
def _(s): _mug(s, WINE, body=('k', 't', 'B')); s.set(15, 12, 'y'); steam(s, 11, 5)
@prep('berry_milk')
def _(s): _glass(s, PINK)
@prep('eggnog')
def _(s): _mug(s, CREAM, body=('W', 's', 'e')); s.set(13, 12, 'B'); s.set(16, 12, 'B')


# ---------------- dishes ----------------
@dish('dish_glass_of_apple_juice')
def _(s): _coaster(s); _glass(s, APPLE, x=12, y=9); ball(s, 22, 10, 2, 1.8, 'b', 'R', 'P', spec=None); s.set(22, 8, 'G')
@dish('dish_berry_milk')
def _(s): _coaster(s); _glass(s, PINK, x=12, y=9); wholes(s, [(15, 11), (18, 11)], WINE, r=1.2); s.set(19, 7, 'G')
@dish('dish_tankard_of_ale')
def _(s): _coaster(s); _tankard(s, AMBER)
@dish('dish_mug_of_cider')
def _(s): _coaster(s); _mug(s, ('H', 'y', 'k'), x=10, y=11); s.set(13, 10, 'W')
@dish('dish_pint_of_oat_stout')
def _(s): _coaster(s); _tankard(s, STOUT, foam='k')
@dish('dish_goblet_of_berry_wine')
def _(s): _coaster(s); _goblet(s, WINE)
@dish('dish_goblet_of_mead')
def _(s): _coaster(s); _goblet(s, AMBER)
@dish('dish_mulled_cider')
def _(s):
    _coaster(s); _mug(s, ('H', 'r', 'y'), x=10, y=12, body=('k', 't', 'B')); steam(s, 10, 5)
    s.ellipse(14, 12, 2, 0.8, 'k'); s.set(13, 12, 'R')
@dish('dish_eggnog')
def _(s): _coaster(s); _glass(s, CREAM, x=12, y=9); pile(s, 16, 12, 'B', n=4, rx=3, ry=1, seed=4)
@dish('dish_mulled_wine')
def _(s): _coaster(s); _goblet(s, WINE); steam(s, 12, 3); s.set(18, 10, 'y'); s.set(19, 9, 'y')
@dish('dish_pie_and_a_pint')
def _(s):
    _coaster(s); _tankard(s, AMBER, x=3, y=11)
    s.ellipse(23, 24, 6, 1.6, 'b'); s.rect(18, 17, 28, 23, 'B'); s.ellipse(23, 17, 5, 1.8, 't'); s.ellipse(23, 17, 3.4, 1, 'k')
    for x in range(19, 28, 2): s.set(x, 16, 'B')
@dish('dish_cheese_and_wine_board')
def _(s):
    cx, cy = board(s)
    s.rect(cx - 7, cy - 3, cx - 2, cy + 1, 'y'); s.rect(cx - 7, cy - 3, cx - 2, cy - 3, 'W'); s.rect(cx - 2, cy - 3, cx - 2, cy + 1, 'H')
    for x in (cx, cx + 4): s.ellipse(x, cy, 2.2, 1.4, 'B'); s.ellipse(x, cy - 0.4, 2, 1.1, 't')
    _goblet(s, WINE, x=24, y=6)
