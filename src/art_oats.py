"""Art for the oats content pack (registers into items_art.RAW / PREP / DISH)."""
from items_art import raw, prep, dish, board, mixbowl, creambowl, woodbowl, skillet, plate, tray, sack, pile, steam, glaze, fillet, ball, wholes

FLAKE = 'ktW'


def _baking_dish(s, top, fruit):
    s.ellipse(16, 22, 11, 3.6, 'b'); s.rect(5, 16, 27, 22, 'R'); s.rect(5, 16, 6, 22, 'P'); s.rect(5, 19, 27, 19, 'b')
    s.ellipse(16, 16, 11, 3.6, 'P'); s.ellipse(16, 16, 9.6, 2.8, fruit)
    pile(s, 16, 15, top, n=50, rx=8, ry=2)
    for x, y in ((8, 17), (23, 17), (12, 18)): s.set(x, y, fruit)


def _bar(s, x, y, w=7):
    s.rect(x, y, x + w, y + 3, 'H'); s.rect(x, y, x + w, y, 'y'); s.rect(x, y + 3, x + w, y + 3, 'B'); s.rect(x + w, y, x + w, y + 3, 'B')
    for i in range(1, w, 2): s.set(x + i, y + 1 + i % 2, 'k')


def _oatcake(s, x, y):
    s.ellipse(x, y + 0.6, 3.6, 2, 'B'); s.ellipse(x, y, 3.4, 1.8, 't'); s.set(x - 1, y, 'k'); s.set(x + 1, y - 1, 'k'); s.set(x + 2, y, 'B')


# ---------------- raw ----------------
@raw('oats')
def _(s): sack(s, 't', 'k', 'W'); pile(s, 15, 9, 'ktW', n=10, rx=4, ry=1)


# ---------------- items ----------------
@prep('rolled_oats')
def _(s): cx, cy = board(s); s.ellipse(cx, cy, 7, 3, 't'); s.ellipse(cx, cy - 1, 5.6, 2, 'k'); pile(s, cx, cy - 1, 'tWk', n=30, rx=6, ry=2)
@prep('toasted_oats')
def _(s): cx, cy = skillet(s); pile(s, cx, cy, 'BtHk', n=40)
@prep('oat_porridge')
def _(s): cx, cy = woodbowl(s, ('t', 'k', 'W')); pile(s, cx, cy, 'tH', n=12, rx=7, ry=1); steam(s)
@prep('oatcakes')
def _(s): cx, cy = board(s); _oatcake(s, cx - 4, cy - 1); _oatcake(s, cx + 3, cy - 2); _oatcake(s, cx, cy + 2)
@prep('honey_flapjacks')
def _(s): cx, cy = tray(s); _bar(s, cx - 9, cy - 2); _bar(s, cx + 1, cy - 2); _bar(s, cx - 4, cy + 1)
@prep('crumble_topping')
def _(s): cx, cy = mixbowl(s, ('t', 'k', 'k')); pile(s, cx, cy, 'HktB', n=26, rx=7, ry=1)
@prep('apple_crumble')
def _(s): _baking_dish(s, 'HtBk', 'y')
@prep('berry_crumble')
def _(s): _baking_dish(s, 'HtBk', 'v')
@prep('skirlie')
def _(s): cx, cy = skillet(s); pile(s, cx, cy, 'BtHk', n=36); pile(s, cx, cy, 'mk', n=8, seed=9)
@prep('oat_crusted_trout')
def _(s): cx, cy = skillet(s); fillet(s, cx, cy, ('B', 't', 'k')); pile(s, cx, cy - 1, 'Hk', n=8, rx=6, ry=1)


# ---------------- dishes ----------------
@dish('dish_bowl_of_porridge')
def _(s): cx, cy = woodbowl(s, ('t', 'k', 'W')); pile(s, cx, cy, 'tH', n=12, rx=7, ry=1); steam(s)
@dish('dish_porridge_and_honey')
def _(s): cx, cy = woodbowl(s, ('t', 'k', 'W')); pile(s, cx, cy, 'tH', n=10, rx=7, ry=1); glaze(s, cx, cy - 1, 4); steam(s)
@dish('dish_porridge_and_berries')
def _(s):
    cx, cy = woodbowl(s, ('t', 'k', 'W')); pile(s, cx, cy, 'tH', n=8, rx=7, ry=1)
    wholes(s, [(cx - 2, cy - 1), (cx + 1, cy - 2), (cx + 3, cy - 1)], ('n', 'v', 'm'), r=1.3); steam(s)
@dish('dish_toasted_oats_and_milk')
def _(s): cx, cy = creambowl(s, ('s', 'W', 'W')); pile(s, cx, cy, 'BtHk', n=24, rx=6, ry=1)
@dish('dish_oatcakes_and_cheese')
def _(s):
    cx, cy = plate(s); _oatcake(s, cx - 4, cy - 1); _oatcake(s, cx - 2, cy + 2)
    s.rect(cx + 2, cy - 3, cx + 7, cy + 1, 'y'); s.rect(cx + 2, cy - 3, cx + 7, cy - 3, 'W'); s.rect(cx + 7, cy - 3, cx + 7, cy + 1, 'H')
@dish('dish_honey_flapjacks')
def _(s): cx, cy = plate(s); _bar(s, cx - 8, cy - 3); _bar(s, cx + 1, cy - 2); glaze(s, cx, cy - 4, 3)
@dish('dish_skirlie_and_sausages')
def _(s):
    cx, cy = plate(s); pile(s, cx - 2, cy, 'BtHk', n=30, rx=6, ry=2); pile(s, cx - 2, cy, 'm', n=5, rx=5, ry=1, seed=9)
    for x, y in ((cx - 1, cy - 4), (cx + 2, cy)):
        s.rect(x, y, x + 6, y + 2, 'B'); s.rect(x, y + 2, x + 6, y + 2, 'b'); s.rect(x + 1, y, x + 4, y, 'r')
@dish('dish_oat_crusted_trout_and_cress')
def _(s):
    cx, cy = plate(s); pile(s, cx + 5, cy, 'GLg', n=12, rx=3, ry=2)
    fillet(s, cx - 2, cy - 1, ('B', 't', 'k')); pile(s, cx - 2, cy - 2, 'Hk', n=8, rx=6, ry=1)
@dish('dish_berry_crumble_and_cream')
def _(s):
    cx, cy = plate(s, 22, 11)
    s.rect(cx - 8, cy - 4, cx + 1, cy + 1, 'v'); s.rect(cx - 8, cy - 4, cx + 1, cy - 3, 'H'); pile(s, cx - 4, cy - 4, 'HtB', n=10, rx=4, ry=1)
    s.set(cx - 6, cy - 1, 'm'); s.set(cx - 2, cy, 'n'); s.ellipse(cx + 5, cy, 3.4, 1.8, 'W'); s.ellipse(cx + 5, cy - 0.4, 2, 0.9, 'k')
@dish('dish_apple_crumble_and_custard')
def _(s):
    cx, cy = creambowl(s, ('H', 'y', 'y'))
    s.ellipse(cx - 1, cy - 1, 5, 1.8, 'y'); pile(s, cx - 1, cy - 2, 'HtBk', n=24, rx=5, ry=1); s.set(cx + 4, cy - 1, 'k')
