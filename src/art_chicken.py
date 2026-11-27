"""Art for the chicken content pack (registers into items_art.RAW / PREP / DISH)."""
from items_art import raw, prep, dish, board, woodbowl, skillet, plate, tray, cubes, pile, steam, glaze, noodles, coins, sticks, COL, ball

RAWC = ('P', 'k', 'W')      # raw skin: dark, base, light
GOLD = ('b', 'B', 'r')      # roasted
GRILL = ('B', 'r', 'y')


def _bird(s, cx, cy, c, scale=1.0):
    """Whole plucked/roast bird seen from 3/4: round body, two drumsticks pointing forward with bone tips."""
    d, b, l = c
    ball(s, cx, cy, 8 * scale, 5 * scale, d, b, l, spec=None)
    for sx in (-1, 1):
        x, y = cx + sx * 4.5 * scale, cy + 2 * scale
        s.ellipse(x, y - 0.6, 3.4 * scale, 2.8 * scale, d)          # crease between leg and body
        ball(s, x, y, 3 * scale, 2.4 * scale, d, b, l, spec=None)
        bx = int(round(x + sx * 3 * scale)); by = int(round(y + 2 * scale))
        s.set(bx, by, 'W'); s.set(bx + sx, by + 1, 'W'); s.set(bx + sx, by, 'p')
    s.rect(int(cx - 1), int(cy - 3 * scale), int(cx + 1), int(cy - 3 * scale), l)


def _drumstick(s, x, y, c, flip=False):
    d, b, l = c
    ball(s, x, y, 3.6, 2.8, d, b, l, spec=None)
    dx = -1 if flip else 1
    for k in range(1, 4): s.set(x + dx * (2 + k), y - k // 2, 'W')
    s.set(x + dx * 6, y - 2, 'W'); s.set(x + dx * 6, y - 1, 'W')


def _chunks(s, cx, cy, c, n=6, seed=12):
    """Bite-size pieces: rounded 4x3 lumps with a lit top edge."""
    d, b, l = c
    spots = [(-5, -1), (0, -2), (5, -1), (-3, 1), (2, 1), (-7, 1), (6, 2)][:n]
    for dx, dy in spots:
        x, y = cx + dx, cy + dy
        s.rect(x - 1, y - 1, x + 2, y + 1, b); s.rect(x - 1, y + 1, x + 2, y + 1, d); s.rect(x, y - 1, x + 1, y - 1, l)
        s.set(x - 1, y - 1, None if s.get(x - 1, y - 2) is None else s.get(x - 1, y - 2))


# ---------------- raw ----------------
@raw('chicken')
def _(s): s.ellipse(16, 24, 9, 2, 'b'); _bird(s, 16, 18, RAWC)


# ---------------- items ----------------
@prep('chicken_pieces')
def _(s): cx, cy = board(s); _chunks(s, cx, cy, ('R', 'P', 'k'))
@prep('grilled_chicken')
def _(s):
    cx, cy = plate(s); _drumstick(s, cx - 3, cy - 1, GRILL); _drumstick(s, cx + 3, cy + 1, GRILL, flip=True)
    for x in (cx - 4, cx - 2, cx + 3): s.set(x, cy - 1 + (x > cx) * 2, 'b')
@prep('roast_chicken')
def _(s): cx, cy = tray(s); _bird(s, cx, cy, GOLD); s.set(cx - 6, cy + 3, 'G'); s.set(cx + 6, cy + 3, 'G')
@prep('pan_fried_chicken')
def _(s): cx, cy = skillet(s); _chunks(s, cx, cy, GRILL, n=6)
@prep('chicken_stock')
def _(s): cx, cy = woodbowl(s, ('H', 'y', 'k')); s.set(12, 14, 'k'); s.set(18, 15, 'k'); s.set(15, 13, 'G'); steam(s)
@prep('chicken_noodle_soup')
def _(s):
    cx, cy = woodbowl(s, ('H', 'y', 'k')); noodles(s, cx, cy + 1, COL['noodle'], rows=2)
    for x, y in ((12, 13), (18, 14)): s.set(x, y, 'r'); s.set(x + 1, y, 'r')
    s.set(15, 14, 'k'); s.set(16, 14, 'k'); s.set(20, 13, 'G'); steam(s)
@prep('chicken_pie')
def _(s):
    s.ellipse(16, 21, 11, 4, 'b'); s.rect(5, 16, 27, 21, 'B'); s.ellipse(16, 16, 11, 4, 'B'); s.ellipse(16, 15.5, 10, 3.4, 't')
    s.ellipse(15, 15, 7, 2, 'k'); s.rect(15, 13, 17, 14, 'B'); s.set(10, 16, 'B'); s.set(22, 16, 'B')
@prep('honey_glazed_chicken')
def _(s): cx, cy = skillet(s); _chunks(s, cx, cy, ('B', 'r', 'y'), n=6); glaze(s, cx, cy - 1, 5)
@prep('ember_chicken')
def _(s):
    cx, cy = plate(s)
    for x0 in (cx - 6, cx + 1):
        s.rect(x0 - 1, cy - 2, x0 + 6, cy - 2, 't')                      # skewer
        for i in range(3): s.rect(x0 + i * 2, cy - 3, x0 + i * 2 + 1, cy - 1, 'r' if i % 2 else 'R')
    s.set(cx - 3, cy + 1, 'R'); s.set(cx + 4, cy + 1, 'y')


# ---------------- dishes ----------------
@dish('dish_cup_of_chicken_broth')
def _(s):
    s.ellipse(16, 23, 9, 2.4, 's'); s.ellipse(16, 22.5, 8, 1.8, 'W')
    s.ellipse(16, 20, 5.4, 2.6, 'p'); s.rect(11, 15, 21, 20, 'W'); s.rect(19, 15, 21, 20, 's')
    s.ellipse(16, 15, 5.4, 1.4, 'p'); s.ellipse(16, 15, 4.4, 1, 'H'); s.set(15, 15, 'y'); s.set(17, 15, 'G'); steam(s, 12, 7)
@dish('dish_grilled_chicken_and_cress')
def _(s):
    cx, cy = plate(s); pile(s, cx + 3, cy, 'GLg', n=14, rx=4, ry=2)
    _drumstick(s, cx - 3, cy - 1, GRILL); s.set(cx - 4, cy - 1, 'b')
@dish('dish_fried_chicken_and_fries')
def _(s): cx, cy = plate(s); _chunks(s, cx - 3, cy - 1, GRILL, n=4); sticks(s, cx + 5, cy + 1, ('H', 'y', 'k'), n=6, seed=8)
@dish('dish_honey_glazed_chicken')
def _(s): cx, cy = plate(s); _chunks(s, cx, cy - 1, ('B', 'r', 'y'), n=6); glaze(s, cx, cy - 2, 5); pile(s, cx, cy - 2, 'GL', n=5, rx=5, ry=1)
@dish('dish_chicken_noodle_soup')
def _(s):
    cx, cy = woodbowl(s, ('H', 'y', 'k')); noodles(s, cx, cy + 1, COL['noodle'], rows=2)
    for x, y in ((12, 13), (18, 14)): s.set(x, y, 'r'); s.set(x + 1, y, 'r')
    s.set(15, 14, 'k'); s.set(16, 14, 'k'); s.set(20, 13, 'G'); s.set(11, 14, 'G'); steam(s)
@dish('dish_chicken_and_dumplings')
def _(s):
    cx, cy = woodbowl(s, ('H', 'y', 'k'))
    for x, y in ((cx - 4, cy - 1), (cx + 1, cy - 2), (cx + 4, cy)): ball(s, x, y, 2.4, 1.8, 't', 'k', 'W', spec=None)
    s.set(cx - 1, cy, 'G'); steam(s)
@dish('dish_chicken_and_cress_sandwich')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 7, cy - 1, cx + 6, cy + 1, 'B'); s.rect(cx - 7, cy - 2, cx + 6, cy - 2, 'G'); s.rect(cx - 6, cy - 3, cx + 5, cy - 3, 'k')
    s.set(cx - 5, cy - 2, 'L'); s.set(cx + 2, cy - 2, 'L'); s.rect(cx - 7, cy - 6, cx + 6, cy - 4, 'B'); s.rect(cx - 6, cy - 6, cx + 5, cy - 6, 't')
@dish('dish_ember_chicken_and_flatbread')
def _(s):
    cx, cy = plate(s)
    s.ellipse(cx, cy, 8, 3, 'b'); s.ellipse(cx, cy - 0.4, 7.4, 2.6, 'B')
    for x0 in (cx - 5, cx):
        s.rect(x0 - 1, cy - 1, x0 + 6, cy - 1, 't')
        for i in range(3): s.rect(x0 + i * 2, cy - 2, x0 + i * 2 + 1, cy, 'r' if i % 2 else 'R')
@dish('dish_chicken_in_mushroom_cream')
def _(s):
    cx, cy = plate(s); s.ellipse(cx, cy, 7, 3, 'k'); s.ellipse(cx - 1, cy - 0.5, 5, 2, 'W')
    _chunks(s, cx - 1, cy - 1, GRILL, n=4)
    for x in (cx - 5, cx + 4): ball(s, x, cy, 1.8, 1.4, 'b', 'B', 't', spec=None)
    s.set(cx + 1, cy - 3, 'G')
@dish('dish_chicken_pie_and_mash')
def _(s):
    cx, cy = plate(s, 22, 11)
    for i in range(8): s.rect(cx - 9 + i, cy - 4 + i // 3, cx - 1, cy - 4 + i // 3, 'k')
    s.rect(cx - 9, cy - 5, cx - 1, cy - 5, 'B'); s.rect(cx - 9, cy - 1, cx - 1, cy - 1, 't'); s.set(cx - 5, cy - 3, 'P')
    s.ellipse(cx + 5, cy - 1, 4, 2.4, 'k'); s.ellipse(cx + 4, cy - 2, 2.6, 1.2, 'W'); s.set(cx + 5, cy - 3, 'y')
@dish('dish_roast_chicken_supper')
def _(s):
    cx, cy = plate(s, 22, 12); _bird(s, cx - 1, cy - 2, GOLD, scale=0.8)
    coins(s, cx - 6, cy + 2, ('B', 'r', 'y'), n=3, spread=(2, 1), r=1.2)
    ball(s, cx + 6, cy + 2, 2.2, 1.6, 'b', 'B', 't', spec=None); s.set(cx + 6, cy + 1, 'k'); s.set(cx + 1, cy + 3, 'G')
