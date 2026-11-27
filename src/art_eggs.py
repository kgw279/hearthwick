"""Art for the egg content pack (registers into items_art.PREP / DISH)."""
from items_art import (prep, dish, board, mixbowl, creambowl, woodbowl, skillet, plate, tray, cubes, pile, mound,
                       wholes, steam, glaze, noodles, slab, COL, _fried_egg_on, ball)


def _ramekin(s, cx=16, cy=19):
    s.ellipse(cx, cy + 3, 8, 3, 'b'); s.rect(cx - 8, cy - 1, cx + 8, cy + 3, 'R'); s.ellipse(cx, cy - 1, 8, 2.6, 'P')
    s.ellipse(cx, cy - 1, 6.6, 1.8, 'k')
    return cx, cy - 1


def _meringue(s, x, y):
    s.ellipse(x, y, 2.6, 1.6, 's'); s.ellipse(x - 0.3, y - 0.6, 2.2, 1.3, 'W'); s.set(int(x), int(y - 2), 'W'); s.set(int(x), int(y - 3), 'p')


def _wedge(s, cx, cy, fill, top, crust='t'):
    for i in range(8):
        s.rect(cx - 7 + i, cy - 3 + i // 3, cx + 6, cy - 3 + i // 3, fill)
    s.rect(cx - 7, cy - 4, cx + 6, cy - 4, top); s.rect(cx + 5, cy - 4, cx + 6, cy, crust); s.rect(cx - 7, cy, cx + 6, cy, crust)


def _scotch(s, x, y):
    ball(s, x, y, 4, 3.6, 'b', 'B', 'r', spec=None)
    s.ellipse(x, y + 0.5, 2.6, 2.4, 'R'); s.ellipse(x, y + 0.5, 1.8, 1.7, 'W'); s.ellipse(x, y + 0.6, 1, 1, 'y')
    s.rect(int(x - 4), int(y + 0.5), int(x - 4), int(y + 0.5), 'b')


# ---------------- items ----------------
@prep('baked_egg')
def _(s): cx, cy = _ramekin(s); s.ellipse(cx, cy, 5, 1.4, 'W'); s.ellipse(cx - 1, cy, 1.8, 1, 'r'); s.set(cx - 2, cy - 1, 'y')
@prep('egg_mash')
def _(s): cx, cy = mixbowl(s, ('H', 'y', 'k')); pile(s, cx, cy, 'Wk', n=8, rx=6, ry=1)
@prep('whipped_egg_whites')
def _(s):
    cx, cy = mixbowl(s, ('s', 'W', 'W'))
    for x, h in ((11, 2), (13, 4), (15, 5), (17, 4), (19, 3)):
        for i in range(h): s.set(x, cy - i, 'W' if i < h - 1 else 'p')
@prep('meringues')
def _(s):
    cx, cy = board(s)
    for x, y in ((cx - 5, cy), (cx, cy - 1), (cx + 5, cy), (cx - 2, cy + 2), (cx + 3, cy + 2)): _meringue(s, x, y)
@prep('custard')
def _(s): cx, cy = creambowl(s, ('H', 'y', 'y')); s.ellipse(cx - 2, cy - 0.5, 2, 0.6, 'k'); s.set(cx + 3, cy, 'r'); s.set(cx - 4, cy, 'H')
@prep('mushroom_frittata')
def _(s):
    s.ellipse(15, 18, 10, 5, 'K'); s.ellipse(15, 17.5, 8.6, 3.8, 'H'); s.ellipse(15, 17, 8, 3.2, 'y')   # in an iron pan
    s.rect(25, 16, 29, 17, 'b')
    for x, y in ((11, 16), (16, 18), (19, 16)): s.set(x, y, 'B'); s.set(x + 1, y, 'k')
    pile(s, 15, 17, 'G', n=6, rx=6, ry=2)
@prep('cheese_omelette')
def _(s):
    cx, cy = skillet(s); s.ellipse(cx, cy, 6.5, 2.6, 'H'); s.ellipse(cx, cy - 0.5, 6, 2, 'y')
    s.rect(cx - 4, cy, cx + 4, cy, 'H'); s.set(cx + 5, cy + 1, 'y'); s.set(cx + 6, cy + 2, 'y')
@prep('cheese_quiche')
def _(s):
    s.ellipse(16, 19, 11, 5, 'B'); s.ellipse(16, 18.5, 10, 4.2, 't')
    for x in range(6, 27, 2): s.set(x, 19 + (x % 4 == 0), 'k')
    s.ellipse(16, 18, 8.4, 3.2, 'y'); s.ellipse(14, 17, 3, 1, 'k')
    for x, y in ((12, 18), (18, 17), (20, 19)): s.set(x, y, 'H')
@prep('scotch_egg')
def _(s): cx, cy = plate(s); _scotch(s, cx - 4, cy - 1); ball(s, cx + 5, cy, 3.6, 3.2, 'b', 'B', 'r', spec=None)


# ---------------- dishes ----------------
@dish('dish_meringue_kisses')
def _(s):
    cx, cy = tray(s); cy -= 1
    for x, y in ((cx - 5, cy), (cx, cy - 1), (cx + 5, cy), (cx - 2, cy + 2), (cx + 3, cy + 2)): _meringue(s, x, y)
    s.set(cx - 1, cy - 4, 'P'); s.set(cx + 4, cy - 2, 'P')
@dish('dish_baked_egg_and_herbs')
def _(s):
    plate(s, 22, 11)
    cx, cy = _ramekin(s, 16, 18); s.ellipse(cx, cy, 5, 1.4, 'W'); s.ellipse(cx - 1, cy, 1.8, 1, 'r')
    pile(s, cx, cy, 'GL', n=6, rx=5, ry=1)
@dish('dish_stuffed_eggs')
def _(s):
    cx, cy = plate(s)
    for x in (cx - 5, cx, cx + 5):
        s.ellipse(x, cy, 2.4, 1.8, 'W'); s.ellipse(x, cy - 0.6, 1.4, 1, 'y'); s.set(x, cy - 2, 'G')
@dish('dish_cheesy_omelette')
def _(s):
    cx, cy = plate(s); s.ellipse(cx, cy, 7, 3, 'H'); s.ellipse(cx, cy - 0.5, 6.4, 2.4, 'y')
    s.rect(cx - 5, cy, cx + 5, cy, 'H'); s.set(cx + 6, cy + 1, 'y'); pile(s, cx, cy - 2, 'GL', n=5, rx=5, ry=1)
@dish('dish_egg_mash_on_toast')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 6, cy - 4, cx + 5, cy + 1, 'B'); s.rect(cx - 5, cy - 3, cx + 4, cy, 'r')
    mound(s, cx, cy - 3, ('H', 'y', 'k'), rx=4.5, ry=1.8); s.set(cx - 2, cy - 4, 'W'); s.set(cx + 2, cy - 4, 'G')
@dish('dish_egg_noodle_broth')
def _(s):
    cx, cy = woodbowl(s, ('g', 'h', 'L')); noodles(s, cx, cy + 1, COL['noodle'], rows=2)
    s.ellipse(cx + 3, cy - 1, 2.2, 1.4, 'W'); s.ellipse(cx + 3, cy - 1, 1, 0.8, 'y'); steam(s)
@dish('dish_custard_and_compote')
def _(s): cx, cy = creambowl(s, ('H', 'y', 'y')); s.ellipse(cx + 1, cy, 3.4, 1, 'v'); s.set(cx, cy, 'm'); s.set(cx + 3, cy, 'n'); s.set(cx - 4, cy, 'k')
@dish('dish_frittata_and_greens')
def _(s):
    cx, cy = plate(s, 21, 12); _wedge(s, cx - 2, cy, 'y', 'H', crust='H')
    for x, y in ((cx - 6, cy - 2), (cx - 2, cy - 1)): s.set(x, y, 'B')
    pile(s, cx + 6, cy - 1, 'GLg', n=10, rx=3, ry=2)
@dish('dish_berry_meringue_mess')
def _(s):
    cx, cy = creambowl(s, ('s', 'W', 'W'))
    pile(s, cx, cy, 'vmPn', n=22, rx=7, ry=1); _meringue(s, cx - 3, cy - 2); _meringue(s, cx + 3, cy - 2); s.set(cx, cy - 4, 'v'); s.set(cx + 1, cy - 4, 'm')
@dish('dish_tavern_scotch_egg')
def _(s):
    cx, cy = plate(s); _scotch(s, cx - 3, cy - 1)
    ball(s, cx + 5, cy, 2.6, 2.4, 'b', 'R', 'r', spec=None); s.set(cx + 5, cy - 3, 'g')
@dish('dish_apple_pie_and_custard')
def _(s):
    cx, cy = plate(s, 22, 11); _wedge(s, cx, cy - 1, 'r', 't')
    for x in range(cx - 7, cx + 7, 3): s.set(x, cy - 5, 'B')
    s.ellipse(cx - 4, cy + 2, 4, 1.2, 'y'); s.set(cx - 6, cy + 2, 'k')
@dish('dish_quiche_and_garden_salad')
def _(s):
    cx, cy = plate(s, 21, 12); _wedge(s, cx - 3, cy, 'y', 'H')
    pile(s, cx + 6, cy - 1, 'GLg', n=8, rx=3, ry=2); s.set(cx + 5, cy - 1, 'R'); s.set(cx + 7, cy, 'R')
@dish('dish_full_hearthwick_breakfast')
def _(s):
    cx, cy = plate(s, 21, 12)
    _fried_egg_on(s, cx - 4, cy - 2)
    s.rect(cx + 2, cy - 4, cx + 7, cy - 1, 'B'); s.rect(cx + 3, cy - 3, cx + 6, cy - 2, 'r')
    wholes(s, [(cx - 6, cy + 2), (cx - 3, cy + 2)], ('b', 'B', 't'), r=1.6)
    ball(s, cx + 4, cy + 2, 2.2, 1.8, 'b', 'R', 'r', spec=None)
