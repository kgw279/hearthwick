"""Art for the pork content pack (registers into items_art.RAW / PREP / DISH)."""
from items_art import raw, prep, dish, board, woodbowl, skillet, plate, tray, jar, cubes, pile, steam, glaze, coins, ball, _fried_egg_on

RAWP = ('R', 'P', 'k')
CRISP = ('b', 'R', 'r')
SAUS = ('b', 'B', 'r')


def _chop(s, cx, cy, c, fat='W', bone=True):
    d, b, l = c
    s.ellipse(cx, cy, 7, 4, fat); s.ellipse(cx - 1, cy, 5.6, 3, b); s.ellipse(cx - 2, cy - 1, 3, 1.4, l)
    s.rect(int(cx) - 6, int(cy) + 3, int(cx) + 5, int(cy) + 3, d)
    if bone: s.rect(int(cx) + 4, int(cy) - 2, int(cx) + 5, int(cy) + 1, 'W'); s.set(int(cx) + 5, int(cy) + 2, 's')


def _rasher(s, x, y, c=('R', 'P', 'W'), w=12):
    d, b, l = c
    for i in range(w):
        dy = (i // 3) % 2
        s.set(x + i, y + dy, b); s.set(x + i, y + dy + 1, l); s.set(x + i, y + dy + 2, b); s.set(x + i, y + dy + 3, d)


def _sausage(s, x, y, c=SAUS, n=6):
    d, b, l = c
    s.rect(x, y, x + n, y + 2, b); s.rect(x, y + 2, x + n, y + 2, d); s.rect(x + 1, y, x + n - 2, y, l)
    s.set(x - 1, y + 1, d); s.set(x + n + 1, y + 1, d)


def _ham(s, cx, cy):
    ball(s, cx, cy, 8, 5, 'b', 'R', 'r', spec=None)
    for i in range(-6, 7, 3):
        for k in range(-3, 4):
            s.set(cx + i + k, cy + k, 'b') if s.get(cx + i + k, cy + k) in ('R', 'r') else None
    glaze(s, cx, cy - 3, 5)
    s.rect(cx + 6, cy - 1, cx + 9, cy, 'W'); s.set(cx + 10, cy - 1, 'W')


def _pie(s, cx, cy, top='t'):
    s.ellipse(cx, cy + 4, 7, 2.4, 'b'); s.rect(cx - 7, cy - 2, cx + 7, cy + 4, 'B'); s.rect(cx - 7, cy - 2, cx - 6, cy + 4, top)
    s.ellipse(cx, cy - 2, 7, 2.4, top); s.ellipse(cx, cy - 2, 5, 1.4, 'k'); s.set(cx, cy - 2, 'B')
    for x in range(cx - 6, cx + 7, 2): s.set(x, cy - 4 + (1 if abs(x - cx) > 4 else 0), 'B')


def _roll(s, x, y, w=7):
    s.rect(x, y, x + w, y + 3, 't'); s.rect(x, y, x + w, y, 'k'); s.rect(x, y + 3, x + w, y + 3, 'B')
    s.ellipse(x, y + 1.5, 1.4, 1.4, 'P'); s.set(x, y + 1, 'R')
    for i in range(2, w, 3): s.set(x + i, y, 'B')


# ---------------- raw ----------------
@raw('pork')
def _(s): s.ellipse(16, 22, 10, 4, 'u'); s.ellipse(16, 21, 9, 3, 'W'); _chop(s, 16, 18, RAWP)


# ---------------- items ----------------
@prep('diced_pork')
def _(s): cx, cy = board(s); cubes(s, cx, cy, ('R', 'P', 'W'), n=7)
@prep('sausage_meat')
def _(s): cx, cy = woodbowl(s, ('R', 'P', 'k')); pile(s, cx, cy, 'RPk', n=20, rx=6, ry=1)
@prep('fried_sausages')
def _(s):
    cx, cy = skillet(s)
    for x, y in ((cx - 7, cy - 2), (cx - 1, cy - 1), (cx - 5, cy + 1)): _sausage(s, x, y)
@prep('bacon')
def _(s): cx, cy = board(s); _rasher(s, cx - 7, cy - 4); _rasher(s, cx - 5, cy - 1)
@prep('crispy_bacon')
def _(s): cx, cy = skillet(s); _rasher(s, cx - 7, cy - 3, CRISP); _rasher(s, cx - 5, cy, CRISP)
@prep('grilled_pork_chop')
def _(s):
    cx, cy = plate(s); _chop(s, cx, cy - 1, ('b', 'B', 't'), fat='k')
    for x in range(cx - 4, cx + 3, 2): s.set(x, cy - 1, 'b'); s.set(x + 1, cy - 2, 'b')
@prep('roast_pork')
def _(s):
    cx, cy = tray(s); ball(s, cx, cy, 8, 4.4, 'b', 'B', 't', spec=None)
    for x in range(cx - 6, cx + 7, 2): s.set(x, cy - 2, 'k')
    s.ellipse(cx + 6, cy, 2.4, 3, 'P'); s.set(cx + 6, cy, 'k'); s.set(cx - 7, cy + 3, 'G')
@prep('honey_baked_ham')
def _(s): cx, cy = tray(s); _ham(s, cx - 1, cy)
@prep('lard')
def _(s): jar(s, 's', 'W', 'W', lid='B'); s.rect(12, 14, 19, 14, 'p')
@prep('hot_water_pastry')
def _(s): cx, cy = board(s); s.ellipse(cx + 1, cy, 7, 3, 'k'); s.ellipse(cx, cy - 0.6, 5, 1.8, 'W'); s.set(cx + 4, cy + 1, 't')
@prep('pork_pie')
def _(s): _pie(s, 16, 17)
@prep('sausage_rolls')
def _(s): cx, cy = tray(s); _roll(s, cx - 8, cy - 2); _roll(s, cx + 1, cy - 1); _roll(s, cx - 4, cy + 2)
@prep('pork_and_apple_stew')
def _(s):
    cx, cy = woodbowl(s, ('b', 'B', 't')); cubes(s, cx, cy, ('b', 'R', 'P'), n=4, spread=(5, 1))
    for x, y in ((cx + 3, cy - 1), (cx - 4, cy)): s.set(x, y, 'k'); s.set(x + 1, y, 'W')
    steam(s)


# ---------------- dishes ----------------
@dish('dish_bacon_and_eggs')
def _(s): cx, cy = plate(s); _fried_egg_on(s, cx - 4, cy - 1); _rasher(s, cx + 1, cy - 3, CRISP, w=7); _rasher(s, cx + 2, cy, CRISP, w=6)
@dish('dish_bacon_sandwich')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 7, cy - 1, cx + 6, cy + 1, 'B'); s.rect(cx - 7, cy - 3, cx + 6, cy - 2, 'R'); s.set(cx - 4, cy - 3, 'W'); s.set(cx + 2, cy - 2, 'W')
    s.rect(cx - 7, cy - 6, cx + 6, cy - 4, 'B'); s.rect(cx - 6, cy - 6, cx + 5, cy - 6, 't')
@dish('dish_bangers_and_mash')
def _(s):
    cx, cy = plate(s); s.ellipse(cx - 2, cy, 6, 3, 'k'); s.ellipse(cx - 3, cy - 1, 4, 1.6, 'W')
    _sausage(s, cx - 6, cy - 4, n=7); _sausage(s, cx + 1, cy - 1, n=6); s.ellipse(cx + 3, cy + 2, 4, 1, 'b')
@dish('dish_pork_chop_and_applesauce')
def _(s):
    cx, cy = plate(s); _chop(s, cx - 2, cy - 1, ('b', 'B', 't'), fat='k')
    s.ellipse(cx + 6, cy + 1, 3, 1.6, 'k'); s.ellipse(cx + 6, cy + 0.6, 2, 0.9, 'y')
@dish('dish_sausage_rolls')
def _(s): cx, cy = plate(s); _roll(s, cx - 8, cy - 3); _roll(s, cx + 1, cy - 2); _roll(s, cx - 3, cy + 1)
@dish('dish_sausages_and_onions_on_toast')
def _(s):
    cx, cy = plate(s)
    s.rect(cx - 7, cy - 3, cx + 6, cy + 1, 'B'); s.rect(cx - 6, cy - 2, cx + 5, cy, 'r')
    pile(s, cx, cy - 2, 'Brt', n=14, rx=6, ry=1); _sausage(s, cx - 5, cy - 5, n=5); _sausage(s, cx + 1, cy - 4, n=5)
@dish('dish_bacon_and_cheese_omelette')
def _(s):
    cx, cy = plate(s); s.ellipse(cx, cy, 7, 3, 'H'); s.ellipse(cx, cy - 0.5, 6.4, 2.4, 'y')
    s.rect(cx - 5, cy, cx + 5, cy, 'H'); _rasher(s, cx - 3, cy - 4, CRISP, w=6)
@dish('dish_honey_ham_and_potatoes')
def _(s):
    cx, cy = plate(s, 22, 12); _ham(s, cx - 2, cy - 2)
    for x in (cx - 6, cx + 5): ball(s, x, cy + 3, 2, 1.6, 'H', 'k', 'W', spec=None)
@dish('dish_pork_and_apple_stew')
def _(s):
    cx, cy = woodbowl(s, ('b', 'B', 't')); cubes(s, cx, cy, ('b', 'R', 'P'), n=4, spread=(5, 1))
    s.set(cx + 3, cy - 1, 'k'); s.set(cx - 4, cy, 'k'); steam(s)
    ball(s, 24, 21, 3.4, 2.8, 'B', 't', 'k', spec=None)
@dish('dish_pork_pie_and_pickles')
def _(s):
    cx, cy = plate(s, 22, 11); _pie(s, cx - 3, cy - 3)
    for x, y in ((cx + 6, cy - 1), (cx + 8, cy + 1)): ball(s, x, y, 1.6, 1.4, 'm', 'W', 'W', spec=None)
@dish('dish_roast_pork_supper')
def _(s):
    cx, cy = plate(s, 22, 12)
    for i, x in enumerate((cx - 7, cx - 3, cx + 1)):
        s.rect(x, cy - 4, x + 3, cy + 1, 'P'); s.rect(x, cy - 4, x + 3, cy - 4, 'B'); s.rect(x + 3, cy - 4, x + 3, cy + 1, 'R')
    coins(s, cx + 6, cy - 1, ('B', 'r', 'y'), n=3, spread=(2, 1), r=1.2)
    s.ellipse(cx + 5, cy + 3, 2.4, 1.2, 'k'); s.set(cx + 5, cy + 3, 'y')
