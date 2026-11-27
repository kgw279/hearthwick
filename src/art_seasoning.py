"""Art for the seasoning content pack (registers into items_art.RAW / PREP / DISH)."""
from items_art import raw, prep, dish, board, mixbowl, skillet, plate, tray, jar, pile, wholes, slab, coins, sticks


def _crock(s, fill='W'):
    """Squat salt crock with a wooden scoop."""
    s.ellipse(16, 25, 8, 2, 'b')
    s.rect(9, 14, 23, 24, 'k'); s.rect(9, 14, 10, 24, 'W'); s.rect(21, 14, 23, 24, 't'); s.rect(9, 18, 23, 18, 'u')
    s.ellipse(16, 14, 7, 2, 't'); s.ellipse(16, 13.6, 6, 1.4, fill); s.ellipse(15, 12.6, 3, 1, fill)
    s.rect(19, 8, 20, 13, 'B'); s.ellipse(19.5, 8, 1.6, 1, 'B')


def _pouch(s):
    s.rect(10, 13, 21, 23, 'k'); s.ellipse(15.5, 22, 6, 3, 'k'); s.rect(19, 13, 21, 23, 't')
    s.rect(12, 11, 19, 12, 'b'); s.ellipse(15.5, 10, 4, 1.6, 't')
    for x, y in ((22, 24), (24, 23), (25, 25), (8, 25), (23, 26)): s.set(x, y, 'K')
    s.ellipse(15.5, 9.6, 2.6, 0.8, 'K')


def _pickle_jar(s, items):
    jar(s, 'u', 'c', 'p', lid='B')
    for x, y, c in items: s.set(x, y, c); s.set(x + 1, y, c)


def _salt_specks(s, pts):
    for x, y in pts: s.set(x, y, 'W')


def _pepper_specks(s, pts):
    for x, y in pts: s.set(x, y, 'K')


def _corned(s, cx, cy):
    for i, x in enumerate((cx - 5, cx, cx + 5)):
        s.rect(x - 2, cy - 2 + i % 2, x + 2, cy + 2 + i % 2, 'P'); s.rect(x - 2, cy - 2 + i % 2, x + 2, cy - 2 + i % 2, 'k')
        s.rect(x + 2, cy - 2 + i % 2, x + 2, cy + 2 + i % 2, 'R'); s.set(x - 1, cy + i % 2, 'k')


def _salt_crust(s, cx, cy):
    s.ellipse(cx, cy, 9, 3.6, 's'); s.ellipse(cx - 1, cy - 0.6, 8, 3, 'W')
    s.rect(cx + 7, cy - 2, cx + 10, cy + 2, 's'); s.set(cx + 10, cy - 3, 's'); s.set(cx + 10, cy + 3, 's')   # tail
    s.rect(cx - 3, cy - 1, cx + 2, cy, 'P'); s.set(cx - 2, cy - 1, 'R')                                       # crack showing fish
    for x, y in ((cx - 6, cy), (cx + 4, cy - 2), (cx + 1, cy + 2)): s.set(x, y, 'p')


def _steak(s, cx, cy):
    slab(s, cx, cy, ('b', 'B', 'r'), marks=None, rx=6, ry=3)
    _pepper_specks(s, [(cx - 4, cy - 1), (cx - 1, cy - 2), (cx + 2, cy - 1), (cx + 4, cy), (cx, cy + 1), (cx - 3, cy + 1)])


# ---------------- raw ----------------
@raw('salt')
def _(s): _crock(s)
@raw('peppercorns')
def _(s): _pouch(s)


# ---------------- items ----------------
@prep('brine')
def _(s): jar(s, 'u', 'c', 'p', lid='B'); _salt_specks(s, [(14, 21), (17, 22), (16, 19)])
@prep('pickled_onions')
def _(s):
    jar(s, 'u', 'c', 'p', lid='B')
    wholes(s, [(14, 16), (17.5, 17.5), (14.5, 20), (17.5, 22)], ('m', 'W', 'W'), r=1.6)
@prep('pickled_carrots')
def _(s):
    jar(s, 'u', 'c', 'p', lid='B')
    for x in (13, 15, 17): s.rect(x, 15, x, 23, 'r'); s.set(x, 15, 'y')
@prep('salt_beef')
def _(s): cx, cy = board(s); _corned(s, cx, cy - 1)
@prep('salt_crusted_trout')
def _(s): cx, cy = tray(s); _salt_crust(s, cx - 1, cy + 1)
@prep('salted_acorns')
def _(s):
    cx, cy = skillet(s)
    wholes(s, [(cx - 4, cy), (cx, cy - 1), (cx + 4, cy), (cx - 1, cy + 1), (cx + 2, cy + 1)], ('b', 'B', 'r'), r=1.8)
    _salt_specks(s, [(cx - 3, cy - 1), (cx + 1, cy - 2), (cx + 4, cy - 1), (cx - 1, cy)])
@prep('cracked_pepper')
def _(s): cx, cy = board(s); pile(s, cx, cy, 'KKde', n=34, rx=5, ry=2)
@prep('pepper_steak')
def _(s): cx, cy = skillet(s); _steak(s, cx, cy)


# ---------------- dishes ----------------
@dish('dish_salted_acorns')
def _(s):
    cx, cy = plate(s)
    wholes(s, [(cx - 5, cy), (cx - 1, cy - 1), (cx + 3, cy), (cx - 3, cy + 1), (cx + 1, cy + 1), (cx + 5, cy - 1)], ('b', 'B', 'r'), r=1.8)
    _salt_specks(s, [(cx - 4, cy - 1), (cx, cy - 2), (cx + 4, cy - 1), (cx - 2, cy)])
@dish('dish_pickled_onions_and_cheese')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 7, cy - 3, cx - 1, cy + 1, 'y'); s.rect(cx - 7, cy - 3, cx - 1, cy - 3, 'W'); s.rect(cx - 1, cy - 3, cx - 1, cy + 1, 'H')
    wholes(s, [(cx + 3, cy - 1), (cx + 6, cy), (cx + 4, cy + 2)], ('m', 'W', 'W'), r=1.6)
@dish('dish_pickled_carrots_and_cress')
def _(s):
    cx, cy = plate(s); pile(s, cx - 3, cy, 'GLg', n=14, rx=4, ry=2)
    for x in (cx + 2, cx + 4, cx + 6): s.rect(x, cy - 3, x, cy + 1, 'r'); s.set(x, cy - 3, 'y')
@dish('dish_ploughmans_lunch')
def _(s):
    cx, cy = plate(s, 22, 12)
    s.rect(cx - 9, cy - 4, cx - 3, cy + 1, 'B'); s.rect(cx - 8, cy - 3, cx - 4, cy, 'r')
    s.rect(cx - 1, cy - 3, cx + 4, cy + 1, 'y'); s.rect(cx - 1, cy - 3, cx + 4, cy - 3, 'W'); s.rect(cx + 4, cy - 3, cx + 4, cy + 1, 'H')
    wholes(s, [(cx + 7, cy - 1), (cx + 8, cy + 2), (cx + 2, cy + 3)], ('m', 'W', 'W'), r=1.5)
@dish('dish_salt_crusted_trout')
def _(s): cx, cy = plate(s, 21, 12); _salt_crust(s, cx - 1, cy); s.set(cx - 5, cy + 3, 'G'); s.set(cx + 3, cy + 3, 'G')
@dish('dish_salt_beef_and_mash')
def _(s):
    cx, cy = plate(s)
    s.ellipse(cx - 3, cy, 5, 3, 'k'); s.ellipse(cx - 4, cy - 1, 3, 1.6, 'W'); s.set(cx - 3, cy - 2, 'y')
    s.rect(cx + 1, cy - 3, cx + 7, cy + 1, 'P'); s.rect(cx + 1, cy - 3, cx + 7, cy - 3, 'k'); s.rect(cx + 7, cy - 3, cx + 7, cy + 1, 'R')
@dish('dish_salt_beef_sandwich')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 7, cy - 1, cx + 6, cy + 1, 'B'); s.rect(cx - 7, cy - 3, cx + 6, cy - 2, 'P'); s.set(cx - 4, cy - 3, 'm'); s.set(cx + 3, cy - 3, 'W')
    s.rect(cx - 7, cy - 6, cx + 6, cy - 4, 'B'); s.rect(cx - 6, cy - 6, cx + 5, cy - 6, 't')
@dish('dish_pepper_steak_and_fries')
def _(s):
    cx, cy = plate(s); _steak(s, cx - 2, cy - 1)
    sticks(s, cx + 5, cy + 1, ('H', 'y', 'k'), n=6, seed=7)
