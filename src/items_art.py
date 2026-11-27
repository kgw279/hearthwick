"""Sprites for every item and dish in the game data.

Hand-drawn sprites from earlier batches are reused where they already show the
item; everything else is built from container + content templates so the whole
set reads as one family:
  chop  -> pieces on a cutting board      grind -> sack or mound
  mix   -> blue mixing bowl               fry   -> in a skillet
  boil  -> cream bowl (broths in wooden)  grill -> on a plate with grill marks
  bake  -> on a baking tray / plate       dish  -> plated or bowled composition
"""
import random
from core import Sprite
from sprites import (_item, EGG, WHEAT, BEEF, FISH, MILK, FLOUR, DOUGH, BREAD, WHISKED, FRIED_EGG, SCRAMBLED,
                     TOAST, grilled_fish, steak)
from sprites3 import (item_herbs, item_berries, item_mushroom, item_honey, item_apple, item_potato, item_carrot,
                      item_onion, ball, _bowl, _plate, dish_chopped_herbs, dish_berry_jam, dish_whipped_cream,
                      dish_mashed_potatoes, dish_baked_potato, dish_apple_pie, dish_honey_cake, dish_mushroom_stew)
from sprites4 import (item_venison, item_cheese, item_tomato, dish_river_chowder, dish_venison_pie,
                      dish_shepherds_supper, dish_herb_omelette, dish_cheese_toast, dish_berries_and_cream,
                      dish_honeyed_porridge)

# (dark, base, light) per ingredient
COL = {
    'wheat': ('H', 'y', 'k'), 'herbs': ('g', 'G', 'L'), 'honey': ('H', 'r', 'y'), 'berries': ('n', 'v', 'm'),
    'mushroom': ('b', 'R', 'P'), 'mushroom_in': ('B', 'k', 'W'), 'acorns': ('b', 'B', 't'), 'venison': ('b', 'R', 'P'),
    'trout': ('u', 'c', 'p'), 'trout_in': ('R', 'P', 'm'), 'cress': ('g', 'G', 'L'), 'onion': ('v', 'm', 'k'),
    'milk': ('s', 'W', 'W'), 'apple': ('b', 'R', 'P'), 'apple_in': ('t', 'k', 'W'), 'mutton': ('R', 'P', 'k'),
    'cheese': ('H', 'y', 'W'), 'pepper': ('b', 'R', 'r'), 'tomato': ('b', 'R', 'r'), 'potato': ('B', 't', 'k'),
    'carrot': ('B', 'r', 'y'), 'beef': ('b', 'R', 'P'), 'cooked': ('b', 'B', 't'), 'roast': ('b', 'B', 'r'),
    'egg': ('t', 'k', 'W'), 'yolk': ('r', 'y', 'W'), 'dough': ('t', 'k', 'W'), 'crust': ('B', 't', 'k'),
    'noodle': ('H', 'y', 'k'),
}

# ---------------------------------------------------------------------
# Containers (each returns the centre of its content area)
# ---------------------------------------------------------------------

def board(s):
    s.rect(6, 16, 23, 24, 't'); s.rect(6, 16, 23, 16, 'k'); s.rect(6, 23, 23, 24, 'H')
    s.rect(24, 19, 27, 21, 't'); s.rect(24, 21, 27, 21, 'H'); s.set(26, 20, 'B')
    return 14, 19


def mixbowl(s, fill):
    d, b, l = fill
    _bowl(s, 'p', 'u', 'n', d, b, l)
    return 16, 14


def creambowl(s, fill):
    d, b, l = fill
    _bowl(s, 'p', 'W', 's', d, b, l)
    return 16, 14


def woodbowl(s, fill):
    d, b, l = fill
    _bowl(s, 't', 'B', 'b', d, b, l)
    return 16, 14


def skillet(s):
    s.ellipse(14, 18, 9.5, 4.6, 'K'); s.ellipse(14, 17.5, 8, 3.4, 'd'); s.rect(23, 16, 28, 17, 'b'); s.set(28, 16, 'B')
    return 14, 17


def plate(s, y=20, rx=11):
    _plate(s, y=y, rx=rx)
    return 16, y - 2


def tray(s):
    s.rect(5, 18, 26, 24, 'S'); s.rect(5, 18, 26, 18, 's'); s.rect(5, 24, 26, 24, 'e'); s.rect(6, 19, 25, 23, 'd')
    return 16, 19


def jar(s, d, b, l, lid='B'):
    s.rect(11, 13, 20, 24, b); s.rect(11, 13, 12, 24, l); s.rect(18, 13, 20, 24, d)
    s.rect(10, 9, 21, 12, lid); s.rect(10, 9, 21, 9, 't' if lid == 'B' else 's'); s.rect(10, 12, 21, 12, 'b' if lid == 'B' else 'e')
    s.set(13, 15, 'W'); s.set(13, 16, 'W')


def sack(s, d, b, l, mark=None):
    s.rect(9, 12, 22, 25, 'k'); s.ellipse(15.5, 22, 7, 4, 'k'); s.rect(20, 12, 22, 25, 't'); s.rect(9, 25, 22, 25, 't')
    s.rect(11, 10, 20, 11, 'b'); s.ellipse(15.5, 9, 4.5, 2, b); s.ellipse(14.5, 8.5, 2.5, 1, l)
    s.ellipse(15.5, 18, 3, 3, d); s.ellipse(15.5, 18, 2, 2, b)


# ---------------------------------------------------------------------
# Content painters
# ---------------------------------------------------------------------

def cubes(s, cx, cy, c, n=6, seed=1, spread=(6, 3)):
    d, b, l = c
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = cx + rnd.randint(-spread[0], spread[0] - 2), cy + rnd.randint(-spread[1], spread[1] - 1)
        s.rect(x, y, x + 1, y + 1, b); s.set(x, y, l); s.set(x + 1, y + 1, d)


def coins(s, cx, cy, c, n=6, seed=2, spread=(6, 3), r=1.5):
    d, b, l = c
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = cx + rnd.randint(-spread[0], spread[0]), cy + rnd.randint(-spread[1], spread[1])
        s.ellipse(x, y, r, r * 0.8, b); s.set(x, y, l); s.set(int(x + r - 0.5), int(y + r * 0.6), d)


def slices(s, cx, cy, c, inner, n=4):
    d, b, l = c
    for i in range(n):
        x = cx - 6 + i * 4
        s.ellipse(x, cy, 2.2, 3, b); s.ellipse(x, cy, 1.4, 2.2, inner[1]); s.set(x - 1, cy - 1, inner[2])


def pile(s, cx, cy, cols, n=30, rx=6, ry=3, seed=3):
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = cx + rnd.randint(-rx, rx), cy + rnd.randint(-ry, ry)
        if ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1:
            s.set(x, y, rnd.choice(cols))


def mound(s, cx, cy, c, rx=6, ry=3.5):
    d, b, l = c
    ball(s, cx, cy, rx, ry, d, b, l, spec=None)


def slab(s, cx, cy, c, marks='b', rx=7, ry=4, fat=None):
    d, b, l = c
    ball(s, cx, cy, rx, ry, d, b, l, spec=None)
    if fat:
        for x in range(int(cx - rx), int(cx + rx) + 1):
            for y in range(int(cy - ry), int(cy + ry) + 1):
                if s.get(x, y) in (d, b, l) and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 0.72:
                    s.set(x, y, fat)
    if marks:
        for x in range(int(cx - rx), int(cx + rx) + 1):
            for y in range(int(cy - ry), int(cy + ry) + 1):
                if s.get(x, y) in (b, l) and (x + y) % 4 == 0:
                    s.set(x, y, marks)


def fillet(s, cx, cy, c, skin=None):
    d, b, l = c
    for i in range(14):
        h = 3 if 2 < i < 11 else 2 if i in (1, 2, 11, 12) else 1
        for k in range(-h, h):
            s.set(cx - 7 + i, cy + k, b if k < h - 1 else d)
        s.set(cx - 7 + i, cy - h, l)
    for i in range(2, 12, 3): s.set(cx - 7 + i, cy, l)
    if skin: s.rect(cx - 5, cy + 2, cx + 4, cy + 2, skin)


def noodles(s, cx, cy, c, rows=3):
    d, b, l = c
    for r in range(rows):
        y0 = cy - rows + r * 2
        for i in range(14):
            x = cx - 7 + i
            s.set(x, y0 + (i // 2) % 2, b if r % 2 == 0 else l)
            if i % 4 == 0: s.set(x, y0 + 1 + (i // 2) % 2, d)


def disc(s, cx, cy, c, specks=None):
    d, b, l = c
    s.ellipse(cx, cy + 1, 9, 3.6, d); s.ellipse(cx, cy, 9, 3.4, b); s.ellipse(cx - 2, cy - 1, 4, 1.2, l)
    if specks:
        for x, y in ((-5, 0), (1, -1), (5, 1), (-2, 1), (3, 0)): s.set(cx + x, cy + y, specks)


def stack(s, cx, cy, c, n=3, top=None):
    d, b, l = c
    for i in range(n):
        y = cy + 3 - i * 2
        s.ellipse(cx, y, 8, 2.4, d); s.ellipse(cx, y - 0.6, 8, 2, b)
    s.ellipse(cx - 2, cy + 3 - (n - 1) * 2 - 1, 3, 0.8, l)
    if top:
        s.rect(cx - 2, cy - 2 * n + 2, cx + 2, cy - 2 * n + 3, top); s.set(cx - 1, cy - 2 * n + 2, 'W')


def sticks(s, cx, cy, c, n=8, seed=4):
    d, b, l = c
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = cx + rnd.randint(-6, 5), cy + rnd.randint(-2, 2)
        horiz = rnd.random() < 0.5
        for k in range(4):
            s.set(x + (k if horiz else 0), y + (0 if horiz else k - 2), b if k < 3 else d)
        s.set(x, y, l)


def leaves(s, cx, cy, c, n=7, seed=5):
    d, b, l = c
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = cx + rnd.randint(-6, 5), cy + rnd.randint(-2, 2)
        s.rect(x, y, x + 2, y, b); s.set(x + 1, y - 1, l); s.set(x + 2, y + 1, d)


def wholes(s, pts, c, r=2.6):
    d, b, l = c
    for x, y in pts:
        ball(s, x, y, r, r * 0.9, d, b, l, spec=None)


def steam(s, x=13, y=10):
    for dx, dy in ((0, 0), (1, -1), (0, -2), (6, 0), (7, -1), (6, -2)):
        s.set(x + dx, y + dy, 'p')


def glaze(s, cx, cy, w=6):
    for i in range(-w, w + 1, 2):
        s.set(cx + i, cy, 'r'); s.set(cx + i, cy + 1 + (i % 4 == 0), 'r')
    s.set(cx - 2, cy, 'y')


def done(s):
    s.outline(); return s


# ---------------------------------------------------------------------
# Raw ingredients that had no sprite yet
# ---------------------------------------------------------------------

def raw_acorns():
    s = Sprite()
    for cx, cy in ((12, 18), (20, 19), (16, 13)):
        ball(s, cx, cy + 1, 3.6, 4, 'b', 'B', 't', spec='k')
        s.ellipse(cx, cy - 2.4, 4, 1.8, 'H'); s.ellipse(cx, cy - 2.6, 3.2, 1, 'o'); s.set(cx, cy - 4, 'b')
    return done(s)


def raw_cress():
    s = Sprite()
    for x in range(10, 23, 2):
        h = 6 + (x * 3) % 4
        for k in range(h): s.set(x, 24 - k, 'L' if k < 2 else 'g')
        s.rect(x - 1, 24 - h, x + 1, 25 - h, 'G'); s.set(x, 23 - h, 'L')
    s.rect(9, 24, 23, 25, 'B'); s.rect(9, 25, 23, 25, 'b')
    return done(s)


def raw_mutton():
    s = Sprite()
    slab(s, 15, 17, COL['mutton'], marks=None, rx=8, ry=5.5, fat='k')
    s.rect(11, 16, 18, 16, 'P'); s.set(13, 15, 'W')
    s.rect(22, 15, 25, 16, 'k'); s.set(26, 14, 'k'); s.set(26, 17, 'k'); s.set(25, 15, 'W')
    return done(s)


def raw_pepper():
    s = Sprite()
    for i in range(13):
        w = max(1, 3 - abs(i - 4) // 3) if i < 10 else 1
        for d in range(-w, w + 1):
            s.set(10 + i, 14 + i // 2 + d, 'R' if d < w else 'b')
        s.set(10 + i, 14 + i // 2 - w, 'r')
    s.set(11, 13, 'y'); s.set(12, 13, 'y')
    s.rect(8, 12, 9, 13, 'G'); s.set(7, 11, 'g'); s.set(6, 10, 'G')
    return done(s)


# ---------------------------------------------------------------------
# Prepared items (built from the templates above)
# ---------------------------------------------------------------------

def _p(fn):
    def build():
        s = Sprite(); fn(s); return done(s)
    return build


RAW = {}    # raw ingredients added by content packs

def raw(name):
    def deco(fn):
        RAW[name] = _p(fn); return fn
    return deco


PREP = {}

def prep(name):
    def deco(fn):
        PREP[name] = _p(fn); return fn
    return deco


# --- grain & flour family ---
@prep('toasted_grain')
def _(s): cx, cy = skillet(s); pile(s, cx, cy, 'HtBy', n=40)
@prep('boiled_grain')
def _(s): cx, cy = creambowl(s, ('t', 'k', 'W')); pile(s, cx, cy, 'tkH', n=24, rx=7, ry=1); steam(s)
@prep('nut_meal')
def _(s): sack(s, 'b', 'B', 't')
@prep('batter')
def _(s): cx, cy = mixbowl(s, ('H', 'y', 'k')); s.set(13, 14, 'W'); s.set(18, 15, 'k')
@prep('pasta_dough')
def _(s): board(s); mound(s, 15, 17, ('H', 'y', 'k'), rx=7, ry=4); s.rect(11, 15, 14, 15, 'k')
@prep('flatbread_dough')
def _(s): disc(s, 16, 19, ('t', 'k', 'W')); pile(s, 16, 19, 'W', n=6, rx=6, ry=2)
@prep('fresh_noodles')
def _(s): cx, cy = board(s); noodles(s, cx, cy, COL['noodle'])
@prep('cooked_noodles')
def _(s): cx, cy = creambowl(s, ('H', 'y', 'k')); noodles(s, cx, cy + 1, COL['noodle'], rows=2); steam(s)
@prep('fried_noodles')
def _(s): cx, cy = skillet(s); noodles(s, cx, cy + 1, ('b', 'H', 'y'), rows=2); s.set(12, 16, 'G'); s.set(17, 17, 'G')
@prep('tortilla')
def _(s): disc(s, 16, 19, ('B', 't', 'k'), specks='B')
@prep('flatbread')
def _(s): disc(s, 16, 19, ('b', 'B', 't'), specks='b'); [s.set(10 + i * 4, 19 + (i % 2), 'b') for i in range(4)]
@prep('bread_slices')
def _(s):
    for ox in (-4, 4):
        s.rect(11 + ox, 12, 20 + ox, 23, 'B'); s.rect(12 + ox, 13, 19 + ox, 22, 'k'); s.rect(12 + ox, 13, 19 + ox, 13, 't')
        s.set(14 + ox, 16, 't'); s.set(17 + ox, 19, 't')
@prep('sponge_cake')
def _(s): plate(s, 22, 10); s.rect(9, 13, 23, 20, 'y'); s.rect(9, 13, 23, 14, 'k'); s.rect(20, 13, 23, 20, 'H'); s.rect(9, 20, 23, 20, 'H')
@prep('pancakes')
def _(s): plate(s); stack(s, 16, 17, ('B', 't', 'k'))

# --- egg family ---
@prep('hard_boiled_egg')
def _(s):
    s.stamp(EGG, 6, 9); s.ellipse(21, 19, 4, 3, 'W'); s.ellipse(21, 19, 2, 1.6, 'y'); s.set(20, 18, 'W')
@prep('chopped_egg')
def _(s): cx, cy = board(s); cubes(s, cx, cy, ('s', 'W', 'W'), n=5); cubes(s, cx, cy, COL['yolk'], n=4, seed=8)

# --- honey ---
@prep('honey_glaze')
def _(s): cx, cy = skillet(s); s.ellipse(cx, cy, 5.5, 2.2, 'r'); s.ellipse(cx - 1, cy - 0.5, 3, 1, 'y'); s.set(cx - 3, cy - 1, 'W')
@prep('honey_syrup')
def _(s): jar(s, 'H', 'r', 'y', lid='S'); s.rect(13, 18, 18, 21, 'k'); s.rect(14, 19, 17, 20, 'H')

# --- herbs ---
@prep('crispy_herbs')
def _(s): cx, cy = skillet(s); leaves(s, cx, cy, ('o', 'g', 'h'))
@prep('herb_broth')
def _(s): cx, cy = woodbowl(s, ('g', 'h', 'L')); pile(s, cx, cy, 'Gg', n=8, rx=6, ry=1); steam(s)

# --- berries ---
@prep('crushed_berries')
def _(s): cx, cy = mixbowl(s, ('n', 'v', 'm')); pile(s, cx, cy, 'mPn', n=10, rx=6, ry=1)

# --- mushroom ---
@prep('sliced_mushroom')
def _(s):
    cx, cy = board(s)
    for i in range(3):
        x = cx - 5 + i * 5
        s.ellipse(x, cy - 1, 2.4, 1.6, 'R'); s.rect(x - 1, cy - 1, x + 1, cy + 2, 'k'); s.set(x, cy + 2, 't')
@prep('sauteed_mushrooms')
def _(s): cx, cy = skillet(s); wholes(s, [(cx - 4, cy), (cx, cy - 1), (cx + 4, cy), (cx - 1, cy + 1)], ('b', 'B', 't'), r=2.2)
@prep('grilled_mushroom')
def _(s):
    cx, cy = plate(s)
    s.ellipse(cx, cy - 1, 7, 3.4, 'b'); s.ellipse(cx, cy - 1.5, 6, 2.6, 'B')
    for x in range(cx - 5, cx + 6, 3): s.rect(x, cy - 3, x, cy, 'b')
    s.rect(cx - 1, cy + 1, cx + 1, cy + 2, 'k')
@prep('mushroom_broth')
def _(s): cx, cy = woodbowl(s, ('b', 'B', 't')); [s.set(x, y, 'k') for x, y in ((12, 14), (18, 15), (15, 13))]; steam(s)

# --- acorns ---
@prep('chopped_nuts')
def _(s): cx, cy = board(s); pile(s, cx, cy, 'Btbk', n=26)
@prep('toasted_nuts')
def _(s): cx, cy = skillet(s); wholes(s, [(cx - 4, cy), (cx, cy - 1), (cx + 4, cy), (cx - 1, cy + 1), (cx + 2, cy + 1)], ('b', 'B', 'r'), r=1.8)

# --- venison ---
@prep('diced_venison')
def _(s): cx, cy = board(s); cubes(s, cx, cy, COL['venison'], n=7)
@prep('grilled_venison')
def _(s): cx, cy = plate(s); slab(s, cx, cy, COL['cooked'], marks='b')
@prep('roast_venison')
def _(s): cx, cy = tray(s); slab(s, cx, cy - 1, COL['roast'], marks=None, rx=8, ry=4.5); s.rect(cx - 4, cy - 4, cx + 2, cy - 4, 't'); s.set(cx + 6, cy - 3, 'G')
@prep('braised_venison')
def _(s): cx, cy = woodbowl(s, ('b', 'B', 't')); cubes(s, cx, cy, COL['cooked'], n=5, spread=(6, 1)); steam(s)
@prep('seared_venison')
def _(s): cx, cy = skillet(s); slab(s, cx, cy, ('b', 'R', 'B'), marks=None, rx=6, ry=2.6)

# --- trout ---
@prep('trout_fillet')
def _(s): cx, cy = board(s); fillet(s, cx, cy, COL['trout_in'], skin='s')
@prep('pan_fried_trout')
def _(s): cx, cy = skillet(s); fillet(s, cx, cy, ('B', 'r', 'y'))
@prep('fish_stock')
def _(s): cx, cy = woodbowl(s, ('s', 'p', 'W')); [s.set(x, y, 'P') for x, y in ((12, 14), (18, 15))]; s.set(15, 13, 'G'); steam(s)

# --- cress ---
@prep('chopped_cress')
def _(s): cx, cy = board(s); pile(s, cx, cy, 'GGLg', n=30)
@prep('wilted_cress')
def _(s): cx, cy = skillet(s); leaves(s, cx, cy, ('o', 'g', 'G'))

# --- onion ---
@prep('diced_onion')
def _(s): cx, cy = board(s); cubes(s, cx, cy, ('m', 'k', 'W'), n=8)
@prep('caramelized_onion')
def _(s): cx, cy = skillet(s); pile(s, cx, cy, 'Brtb', n=36, rx=6, ry=2)
@prep('onion_broth')
def _(s): cx, cy = woodbowl(s, ('H', 't', 'k')); [s.set(x, y, 'm') for x, y in ((12, 14), (18, 15), (15, 13))]; steam(s)
@prep('charred_onion')
def _(s):
    cx, cy = plate(s)
    for x in (cx - 4, cx + 3):
        s.ellipse(x, cy, 3.4, 2.6, 'k'); s.ellipse(x, cy, 2.2, 1.6, 'm'); s.ellipse(x, cy, 1, 0.8, 'k'); s.set(x - 2, cy - 1, 'b'); s.set(x + 1, cy + 1, 'b')

# --- milk & cheese ---
@prep('warm_milk')
def _(s):
    s.rect(10, 12, 20, 24, 'W'); s.rect(10, 12, 20, 13, 'k'); s.rect(18, 12, 20, 24, 'p'); s.rect(10, 24, 20, 24, 's')
    s.rect(21, 15, 23, 15, 'W'); s.rect(23, 15, 23, 20, 'W'); s.rect(21, 20, 23, 20, 'W'); steam(s, 12, 9)
@prep('cheese_sauce')
def _(s): cx, cy = creambowl(s, ('H', 'y', 'W')); steam(s)
@prep('grated_cheese')
def _(s): cx, cy = board(s); pile(s, cx, cy, 'yyHW', n=34)
@prep('melted_cheese')
def _(s): cx, cy = plate(s); mound(s, cx, cy, ('H', 'y', 'W'), rx=7, ry=3); [s.set(cx + i, cy + 3, 'y') for i in (-5, -2, 4)]
@prep('fried_cheese')
def _(s): cx, cy = skillet(s); s.rect(cx - 5, cy - 2, cx + 4, cy + 1, 'r'); s.rect(cx - 5, cy - 2, cx + 4, cy - 2, 'y'); s.rect(cx - 4, cy - 1, cx + 3, cy, 'H')

# --- apple ---
@prep('sliced_apple')
def _(s): cx, cy = board(s); slices(s, cx + 1, cy, COL['apple'], COL['apple_in'])
@prep('baked_apple')
def _(s): cx, cy = tray(s); wholes(s, [(cx, cy - 2)], ('b', 'B', 'R'), r=5); s.rect(cx - 1, cy - 8, cx, cy - 7, 'b'); s.set(cx - 2, cy - 4, 'y')
@prep('applesauce')
def _(s): cx, cy = creambowl(s, ('t', 'k', 'W')); s.set(13, 14, 'r'); s.set(18, 14, 't')
@prep('grilled_apple')
def _(s): cx, cy = plate(s); slices(s, cx + 1, cy, ('b', 'B', 'r'), ('t', 'y', 'W'))

# --- mutton ---
@prep('diced_mutton')
def _(s): cx, cy = board(s); cubes(s, cx, cy, COL['mutton'], n=7)
@prep('grilled_mutton_chop')
def _(s): cx, cy = plate(s); slab(s, cx - 1, cy, COL['cooked'], marks='b', rx=6, ry=3.6, fat='t'); s.rect(cx + 5, cy - 1, cx + 8, cy, 'k')
@prep('braised_mutton')
def _(s): cx, cy = woodbowl(s, ('b', 'B', 't')); cubes(s, cx, cy, ('b', 'B', 'k'), n=5, spread=(6, 1)); steam(s)
@prep('roast_mutton')
def _(s): cx, cy = tray(s); slab(s, cx, cy - 1, COL['roast'], marks=None, rx=8, ry=4.5, fat='t'); s.set(cx + 5, cy - 4, 'G')

# --- ember pepper ---
@prep('minced_pepper')
def _(s): cx, cy = board(s); pile(s, cx, cy, 'RRrb', n=30)
@prep('charred_pepper')
def _(s):
    cx, cy = plate(s)
    for i in range(12):
        s.set(cx - 6 + i, cy - 1 + i // 4, 'R' if i % 3 else 'b'); s.set(cx - 6 + i, cy + i // 4, 'b')
    s.set(cx - 7, cy - 2, 'g')
@prep('fire_oil')
def _(s): jar(s, 'b', 'R', 'r', lid='S'); s.set(15, 18, 'y'); s.set(16, 19, 'y'); s.set(15, 20, 'r')

# --- tomato ---
@prep('diced_tomato')
def _(s): cx, cy = board(s); cubes(s, cx, cy, ('b', 'R', 'r'), n=8)
@prep('tomato_sauce')
def _(s): jar(s, 'b', 'R', 'r'); s.rect(13, 18, 18, 21, 'k'); s.set(15, 19, 'R'); s.set(16, 20, 'G')
@prep('roasted_tomato')
def _(s): cx, cy = plate(s); wholes(s, [(cx - 3, cy), (cx + 3, cy - 1)], ('b', 'R', 'r'), r=3); s.set(cx - 3, cy - 3, 'g'); s.set(cx + 3, cy - 4, 'g')

# --- potato ---
@prep('diced_potato')
def _(s): cx, cy = board(s); cubes(s, cx, cy, ('t', 'k', 'W'), n=8)
@prep('boiled_potato')
def _(s): cx, cy = creambowl(s, ('t', 'k', 'W')); wholes(s, [(cx - 3, cy), (cx + 3, cy)], ('t', 'k', 'W'), r=2.6); steam(s)
@prep('fried_potatoes')
def _(s): cx, cy = skillet(s); sticks(s, cx, cy, ('B', 'y', 'W'))

# --- carrot ---
@prep('sliced_carrot')
def _(s): cx, cy = board(s); coins(s, cx, cy, COL['carrot'])
@prep('boiled_carrots')
def _(s): cx, cy = creambowl(s, ('s', 'p', 'W')); coins(s, cx, cy, COL['carrot'], n=5, spread=(6, 1)); steam(s)
@prep('roast_carrots')
def _(s):
    cx, cy = tray(s)
    for i in range(3):
        y = cy - 2 + i * 2
        s.rect(cx - 6 + i, y, cx + 5 - i, y, 'r'); s.set(cx + 6 - i, y, 'B'); s.set(cx - 6 + i, y, 'y')
    s.set(cx - 7, cy - 3, 'G')
@prep('glazed_carrots')
def _(s): cx, cy = skillet(s); coins(s, cx, cy, ('B', 'r', 'y'), n=6, spread=(5, 1)); s.set(cx, cy - 2, 'W')

# --- beef ---
@prep('diced_beef')
def _(s): cx, cy = board(s); cubes(s, cx, cy, COL['beef'], n=7)
@prep('roast_beef')
def _(s): cx, cy = tray(s); slab(s, cx, cy - 1, COL['roast'], marks=None, rx=8, ry=4.5); s.rect(cx - 3, cy - 1, cx + 3, cy - 1, 'P'); s.set(cx + 6, cy - 4, 'G')
@prep('braised_beef')
def _(s): cx, cy = woodbowl(s, ('b', 'B', 't')); cubes(s, cx, cy, COL['cooked'], n=5, spread=(6, 1)); s.set(cx, cy - 1, 'r'); steam(s)
@prep('seared_beef')
def _(s): cx, cy = skillet(s); slab(s, cx, cy, ('b', 'B', 'R'), marks=None, rx=6, ry=2.6)
@prep('ground_beef')
def _(s):
    s.ellipse(16, 20, 10, 4, 'k'); s.ellipse(16, 19.5, 9, 3.2, 'W')
    pile(s, 16, 18, 'RRPb', n=60, rx=6, ry=3)
@prep('beef_patty')
def _(s): cx, cy = plate(s); s.ellipse(cx, cy, 6.5, 3, 'b'); s.ellipse(cx, cy - 0.5, 6, 2.4, 'B'); [s.set(cx + i, cy - 1, 'b') for i in (-4, -1, 2, 5)]; s.set(cx - 3, cy - 2, 't')
@prep('fried_mince')
def _(s): cx, cy = skillet(s); pile(s, cx, cy, 'bBBt', n=40, rx=6, ry=2)

# --- bakes ---
@prep('carrot_cake')
def _(s):
    plate(s, 22, 10)
    s.rect(9, 12, 23, 20, 'B'); s.rect(9, 12, 23, 14, 'W'); s.rect(9, 16, 23, 16, 'W'); s.rect(20, 12, 23, 20, 'b')
    for x in (11, 15, 19): s.set(x, 18, 'r')
    s.set(16, 10, 'r'); s.set(16, 11, 'r'); s.set(17, 9, 'G')
@prep('berry_cake')
def _(s):
    plate(s, 22, 10)
    s.rect(9, 12, 23, 20, 'y'); s.rect(9, 12, 23, 13, 'm'); s.rect(9, 16, 23, 16, 'v'); s.rect(20, 12, 23, 20, 'H')
    for x in (11, 14, 17, 20): s.set(x, 11, 'v'); s.set(x + 1, 11, 'm')


def prepared_sprite(item_id):
    return PREP[item_id]()


# ---------------------------------------------------------------------
# Dishes (plated compositions)
# ---------------------------------------------------------------------

DISH = {}

def dish(name):
    def deco(fn):
        DISH[name] = _p(fn); return fn
    return deco


@dish('dish_farmhouse_loaf')
def _(s):
    board(s)
    s.stamp(BREAD, 7, 9)
    glaze(s, 16, 11, 5); s.set(10, 12, 'r'); s.set(21, 13, 'r'); s.set(13, 14, 'r')
@dish('dish_garden_greens')
def _(s): cx, cy = woodbowl(s, ('g', 'G', 'L')); pile(s, cx, cy, 'GLg', n=16, rx=7, ry=1); cubes(s, cx, cy - 1, ('s', 'W', 'W'), n=3, spread=(5, 1)); s.set(14, 13, 'y')
@dish('dish_meadow_salad')
def _(s): cx, cy = creambowl(s, ('g', 'G', 'L')); pile(s, cx, cy, 'GL', n=12, rx=7, ry=1); pile(s, cx, cy, 'vm', n=6, rx=6, ry=1, seed=9)
@dish('dish_berry_cake_and_cream')
def _(s):
    plate(s, 22, 10)
    s.rect(9, 14, 23, 20, 'y'); s.rect(9, 14, 23, 15, 'm'); s.rect(9, 17, 23, 17, 'v'); s.rect(20, 14, 23, 20, 'H')
    s.ellipse(16, 12, 4, 2, 'W'); s.rect(15, 9, 17, 11, 'W'); s.set(16, 8, 'v')
@dish('dish_foragers_plate')
def _(s):
    cx, cy = plate(s, 20, 12)
    wholes(s, [(cx - 5, cy), (cx - 2, cy - 1), (cx - 4, cy + 1)], ('b', 'B', 't'), r=2)
    wholes(s, [(cx + 3, cy), (cx + 5, cy - 1), (cx + 6, cy + 1)], ('b', 'B', 'r'), r=1.5)
    pile(s, cx, cy - 2, 'GL', n=6, rx=3, ry=1)
@dish('dish_grilled_trout')
def _(s):
    plate(s, 21, 12)
    f = grilled_fish()
    for y in range(32):
        for x in range(32):
            if f.px[y][x] and f.px[y][x] != 'O' and y < 22: s.set(x, y + 1, f.px[y][x])
    pile(s, 16, 22, 'GL', n=6, rx=6, ry=1)
@dish('dish_honey_glazed_venison')
def _(s): cx, cy = plate(s); slab(s, cx, cy, COL['cooked'], marks='b'); glaze(s, cx, cy - 3, 5); s.set(cx + 6, cy - 2, 'G')
@dish('dish_hunters_roast')
def _(s): cx, cy = plate(s, 21, 12); slab(s, cx, cy, COL['roast'], marks=None, rx=8, ry=4); leaves(s, cx, cy - 3, ('o', 'g', 'h'), n=4)
@dish('dish_venison_pie')
def _(s):
    p = dish_venison_pie()
    s.px = [row[:] for row in p.px]
    for x, y in ((8, 22), (10, 23), (22, 22), (24, 21)): s.set(x, y, 'B'); s.set(x + 1, y, 'r')
@dish('dish_apple_pie_and_cream')
def _(s):
    p = dish_apple_pie()
    s.px = [row[:] for row in p.px]
    s.ellipse(20, 13, 3, 1.6, 'W'); s.rect(19, 10, 21, 12, 'W'); s.set(20, 9, 'W')
@dish('dish_orchard_salad')
def _(s): cx, cy = creambowl(s, ('g', 'G', 'L')); slices(s, cx + 1, cy, COL['apple'], COL['apple_in'], n=3); pile(s, cx, cy + 1, 'Bt', n=6, rx=6, ry=1)
@dish('dish_mutton_stew')
def _(s): cx, cy = woodbowl(s, ('b', 'B', 't')); cubes(s, cx, cy, ('b', 'B', 'k'), n=4, spread=(6, 1)); [s.set(x, y, 'm') for x, y in ((12, 15), (19, 14))]; steam(s)
@dish('dish_noodles_in_tomato_sauce')
def _(s): cx, cy = creambowl(s, ('H', 'y', 'k')); noodles(s, cx, cy + 1, COL['noodle'], rows=2); s.ellipse(cx, cy - 1, 3, 1, 'R'); s.set(cx, cy - 2, 'G')
@dish('dish_beef_noodle_soup')
def _(s): cx, cy = woodbowl(s, ('H', 't', 'k')); noodles(s, cx, cy + 1, COL['noodle'], rows=2); cubes(s, cx, cy - 1, COL['cooked'], n=3, spread=(5, 1)); steam(s)
@dish('dish_steak_and_potatoes')
def _(s):
    cx, cy = plate(s, 21, 12)
    slab(s, cx - 3, cy, COL['cooked'], marks='b', rx=6, ry=3.6)
    s.ellipse(cx + 6, cy, 3.2, 2.6, 'B'); s.ellipse(cx + 6, cy - 0.5, 2, 1.4, 'k'); s.set(cx + 6, cy - 1, 'y')
@dish('dish_sunday_roast')
def _(s):
    cx, cy = plate(s, 21, 12)
    mound(s, cx - 5, cy, ('t', 'k', 'W'), rx=3.4, ry=2.4)
    slab(s, cx + 1, cy - 1, COL['roast'], marks=None, rx=4, ry=2.6); s.rect(cx - 1, cy - 1, cx + 3, cy - 1, 'P')
    for i in range(3): s.rect(cx + 4, cy + 1 + i, cx + 8, cy + 1 + i, 'r')
@dish('dish_tavern_wrap')
def _(s):
    cx, cy = plate(s)
    s.ellipse(cx, cy - 1, 8, 3.6, 't'); s.ellipse(cx, cy - 1.5, 7, 2.6, 'k')
    pile(s, cx + 3, cy - 2, 'BbRr', n=14, rx=4, ry=1); s.rect(cx - 7, cy - 3, cx - 2, cy + 1, 't'); s.set(cx - 4, cy - 1, 'B')
@dish('dish_tomato_flatbread')
def _(s): disc(s, 16, 19, ('b', 'B', 't')); s.ellipse(16, 18.5, 7, 2.4, 'y'); wholes(s, [(12, 18), (17, 17), (20, 19)], ('b', 'R', 'r'), r=1.4); s.set(15, 19, 'G')
@dish('dish_beef_stew')
def _(s): cx, cy = woodbowl(s, ('b', 'B', 't')); cubes(s, cx, cy, COL['cooked'], n=3, spread=(6, 1)); coins(s, cx, cy, COL['carrot'], n=3, spread=(6, 1), r=1); s.set(cx, cy, 'k'); steam(s)
@dish('dish_carrot_cake_and_cream')
def _(s):
    p = PREP['carrot_cake']()
    s.px = [row[:] for row in p.px]
    s.ellipse(16, 8, 3, 1.4, 'W'); s.set(16, 7, 'W')
@dish('dish_patty_on_bread')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 7, cy - 1, cx + 6, cy + 1, 't'); s.rect(cx - 7, cy + 1, cx + 6, cy + 1, 'B')
    s.ellipse(cx, cy - 2.5, 6, 1.8, 'b'); s.ellipse(cx, cy - 3, 5.4, 1.2, 'B')
    for x in (-4, 0, 4): s.set(cx + x, cy - 5, 'R'); s.set(cx + x + 1, cy - 5, 'r')
@dish('dish_crispy_potatoes_and_herbs')
def _(s): cx, cy = plate(s); sticks(s, cx, cy, ('B', 'y', 'W'), n=9); pile(s, cx, cy - 2, 'oh', n=6, rx=5, ry=1)
@dish('dish_honey_pancakes')
def _(s): plate(s); stack(s, 16, 17, ('B', 't', 'k'), n=4, top='y'); glaze(s, 16, 12, 4)
@dish('dish_dwarven_stonebread')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 7, cy - 3, cx + 6, cy + 1, 'B'); s.rect(cx - 6, cy - 3, cx + 5, cy - 3, 't')
    s.ellipse(cx, cy - 4, 4, 1.6, 'W'); s.ellipse(cx, cy - 4, 1.6, 0.8, 'y')
    for x in (-6, -3, 3, 6): s.set(cx + x, cy - 1, 'b'); s.set(cx + x + 1, cy - 1, 'r')
@dish('dish_bog_broth')
def _(s): cx, cy = woodbowl(s, ('o', 'h', 'L')); pile(s, cx, cy, 'GgR', n=10, rx=6, ry=1); s.set(cx + 2, cy, 'v'); steam(s)
@dish('dish_elven_nectar_bowl')
def _(s): cx, cy = creambowl(s, ('v', 'm', 'W')); pile(s, cx, cy, 'GL', n=6, rx=6, ry=1); glaze(s, cx, cy - 1, 3); s.set(cx, cy - 3, 'W')
@dish('dish_ember_honeycomb')
def _(s):
    cx, cy = plate(s)
    for (hx, hy) in ((-5, 0), (-1, -2), (3, 0), (-1, 2), (5, -2)):
        s.ellipse(cx + hx, cy - 1 + hy * 0.6, 2.2, 1.6, 'r'); s.set(cx + hx, cy - 1 + hy * 0.6, 'y')
    for i in range(6): s.set(cx - 3 + i, cy + 2, 'R' if i % 2 else 'b')
@dish('dish_herb_omelette')
def _(s): s.px = [row[:] for row in dish_herb_omelette().px]
@dish('dish_cheese_toast')
def _(s): s.px = [row[:] for row in dish_cheese_toast().px]
@dish('dish_berries_and_cream')
def _(s): s.px = [row[:] for row in dish_berries_and_cream().px]
@dish('dish_honeyed_porridge')
def _(s): s.px = [row[:] for row in dish_honeyed_porridge().px]
@dish('dish_river_chowder')
def _(s): s.px = [row[:] for row in dish_river_chowder().px]
@dish('dish_shepherds_supper')
def _(s): s.px = [row[:] for row in dish_shepherds_supper().px]
@dish('dish_honey_cake')
def _(s): s.px = [row[:] for row in dish_honey_cake().px]
@dish('dish_mushroom_stew')
def _(s): s.px = [row[:] for row in dish_mushroom_stew().px]


# --- simple meals ---
def _fried_egg_on(s, cx, cy):
    s.ellipse(cx, cy, 6, 3.2, 'W'); s.ellipse(cx + 1, cy + 0.5, 5, 2.4, 'p')
    s.ellipse(cx, cy - 0.4, 5.2, 2.6, 'W'); s.ellipse(cx - 1, cy - 0.6, 2, 1.6, 'r'); s.ellipse(cx - 1.4, cy - 1, 1.4, 1, 'y')
    s.set(cx - 2, cy - 2, 'W')


@dish('dish_sunny_fried_egg')
def _(s): cx, cy = plate(s); _fried_egg_on(s, cx, cy - 1)
@dish('dish_boiled_egg')
def _(s):
    plate(s, 23, 9)
    s.rect(12, 17, 19, 22, 'c'); s.rect(12, 17, 12, 22, 'p'); s.rect(18, 17, 19, 22, 'U'); s.rect(13, 22, 18, 23, 'U')   # egg cup
    s.ellipse(15.5, 13, 4, 4.4, 'k'); s.rect(12, 13, 19, 16, 'k'); s.ellipse(14, 11.5, 1.6, 2, 'W')
    s.rect(12, 12, 19, 12, 'W'); s.rect(13, 11, 18, 11, 'W'); s.ellipse(15.5, 11.5, 2, 1, 'y')
    s.rect(21, 14, 21, 20, 's'); s.ellipse(21, 13, 1, 1.4, 's')                                   # spoon
@dish('dish_meadow_herb_broth')
def _(s):
    cx, cy = creambowl(s, ('g', 'h', 'L')); pile(s, cx, cy, 'Gg', n=6, rx=6, ry=1)
    s.rect(18, 12, 19, 13, 'G'); s.set(20, 11, 'L'); steam(s)
@dish('dish_honey_grain_bowl')
def _(s): cx, cy = woodbowl(s, ('t', 'k', 'W')); pile(s, cx, cy, 'tkH', n=16, rx=7, ry=1); glaze(s, cx, cy - 1, 4)
@dish('dish_berries_and_honey')
def _(s): cx, cy = creambowl(s, ('n', 'v', 'm')); wholes(s, [(12, 14), (15, 13), (18, 14), (20, 15), (14, 15)], ('n', 'v', 'm'), r=1.6); glaze(s, cx, cy - 2, 3)
@dish('dish_herb_fried_egg')
def _(s): cx, cy = plate(s); _fried_egg_on(s, cx, cy - 1); pile(s, cx, cy - 1, 'GLg', n=10, rx=6, ry=2, seed=11)
@dish('dish_egg_and_herb_salad')
def _(s): cx, cy = creambowl(s, ('g', 'G', 'L')); cubes(s, cx, cy - 1, ('s', 'W', 'W'), n=4, spread=(6, 1)); cubes(s, cx, cy - 1, COL['yolk'], n=3, seed=6, spread=(6, 1))
@dish('dish_crunchy_honey_grain')
def _(s): cx, cy = plate(s); mound(s, cx, cy, ('B', 't', 'k'), rx=6, ry=3); pile(s, cx, cy, 'HBb', n=14, rx=5, ry=2); glaze(s, cx, cy - 3, 4)
@dish('dish_warm_honey_milk')
def _(s):
    s.rect(10, 12, 20, 24, 'U'); s.rect(10, 12, 12, 24, 'c'); s.rect(18, 12, 20, 24, 'n'); s.rect(10, 24, 20, 24, 'n')
    s.ellipse(15, 12, 5, 1.4, 'W'); s.ellipse(14, 12, 2, 0.6, 'k')
    s.rect(21, 15, 23, 15, 'U'); s.rect(23, 15, 23, 20, 'U'); s.rect(21, 20, 23, 20, 'U')
    s.rect(17, 5, 17, 11, 'B'); s.ellipse(17, 5, 1.6, 1.6, 'r'); s.set(17, 4, 'y')                     # honey dipper
    s.set(12, 8, 'p'); s.set(13, 7, 'p'); s.set(12, 6, 'p')
@dish('dish_soft_scramble')
def _(s): cx, cy = plate(s); mound(s, cx, cy, ('H', 'y', 'k'), rx=6.5, ry=3); pile(s, cx, cy - 1, 'kW', n=8, rx=5, ry=2); s.set(cx + 4, cy - 2, 'G'); s.set(cx + 5, cy - 3, 'G')
@dish('dish_wilted_greens_and_egg')
def _(s): cx, cy = plate(s); leaves(s, cx, cy + 1, ('o', 'g', 'G'), n=9); _fried_egg_on(s, cx, cy - 1)
@dish('dish_pan_fried_trout')
def _(s): cx, cy = plate(s, 21, 12); fillet(s, cx, cy, ('B', 'r', 'y')); pile(s, cx, cy - 3, 'GL', n=6, rx=5, ry=1); s.set(cx + 7, cy + 1, 'y'); s.set(cx + 8, cy + 1, 'W')


def _copy(fn):
    def build():
        s = fn(); return s
    return build


# raw + earlier hand-drawn prepared items, keyed by readable game id
EXISTING = {
    'wheat': lambda: _item(WHEAT), 'herbs': item_herbs, 'honey': item_honey, 'egg': lambda: _item(EGG),
    'berries': item_berries, 'mushroom': item_mushroom, 'acorns': raw_acorns, 'venison': item_venison,
    'trout': lambda: _item(FISH), 'cress': raw_cress, 'onion': item_onion, 'milk': lambda: _item(MILK),
    'apple': item_apple, 'mutton': raw_mutton, 'cheese': item_cheese, 'tomato': item_tomato,
    'potato': item_potato, 'carrot': item_carrot, 'beef': lambda: _item(BEEF), 'ember_pepper': raw_pepper,
    'flour': lambda: _item(FLOUR), 'bread_dough': lambda: _item(DOUGH), 'bread_loaf': lambda: _item(BREAD),
    'toast': lambda: _item(TOAST), 'whisked_egg': lambda: _item(WHISKED), 'fried_egg': lambda: _item(FRIED_EGG),
    'scrambled_eggs': lambda: _item(SCRAMBLED), 'grilled_trout': grilled_fish, 'grilled_steak': steak,
    'chopped_herbs': dish_chopped_herbs, 'berry_compote': dish_berry_jam, 'whipped_cream': dish_whipped_cream,
    'mashed_potatoes': dish_mashed_potatoes, 'baked_potato': dish_baked_potato, 'apple_pie': dish_apple_pie,
    'venison_pie': dish_venison_pie,
}


def sprite_for(item_id):
    if item_id in EXISTING: return EXISTING[item_id]()
    if item_id in RAW: return RAW[item_id]()
    if item_id in PREP: return PREP[item_id]()
    if item_id in DISH: return DISH[item_id]()
    raise KeyError(f'no sprite for {item_id}')


def has_sprite(item_id):
    return item_id in EXISTING or item_id in RAW or item_id in PREP or item_id in DISH
