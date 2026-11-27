"""Batch 4: folk guests (4-dir), signature dishes + their ingredients, shop buildings."""
import random
from core import Sprite
from sprites import _with_shadow, ground_shadow
from sprites3 import character, LOOKS, _extras, mirror, ball, _bowl, _plate, kid_left, kid, kid_up, _lift_leg, _bob

# =====================================================================
# Folk guests — built on the shared body, so they share every walk frame
# =====================================================================

def paint(s, pts, color=None):
    """Set pixels then outline only around the new pixels."""
    new = []
    for p in pts:
        x, y, c = (p[0], p[1], color) if color else p
        s.set(x, y, c); new.append((x, y))
    for x, y in new:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if s.get(x + dx, y + dy) is None and 0 <= x + dx < 32 and 0 <= y + dy < 32:
                s.set(x + dx, y + dy, 'O')


FOLK_LOOKS = {
    'dwarf':    {'U': 'B', 'c': 't', 'p': 'k', 'B': 'r', 't': 'y', 'n': 'e'},
    'elf':      {'U': 'T', 'c': 'L', 'p': 'W', 'B': 'D', 't': 'u', 'n': 'g'},
    'beetle':   {'k': 'U', 'P': 'c', 'B': 'n', 't': 'c', 'U': 'H', 'c': 'y', 'p': 't', 'n': 'b'},
    'frog':     {'k': 'G', 'B': 'G', 't': 'L', 'U': 'H', 'c': 't', 'p': 'k', 'n': 'o'},
    'minotaur': {'k': 'B', 'P': 'R', 'B': 'b', 't': 't', 'U': 'h', 'c': 'k', 'p': 't', 'n': 'b'},
}


def folk_extras(s, look, view):
    s.set(16, 5, None); s.set(17, 4, None)
    if look == 'dwarf':
        if view == 'down':
            s.rect(12, 15, 19, 20, 'r'); s.rect(13, 21, 18, 21, 'r'); s.rect(14, 22, 17, 22, 'r')
            s.rect(13, 19, 18, 21, 'B') if False else None
            for x in (13, 15, 17): s.set(x, 18, 'y')
            s.rect(14, 15, 17, 15, 'y')                            # moustache highlight
            s.set(12, 15, 'r'); s.set(19, 15, 'r')
        elif view == 'left':
            s.rect(11, 15, 15, 20, 'r'); s.rect(12, 21, 14, 21, 'r'); s.set(12, 17, 'y'); s.set(13, 15, 'y')
        s.rect(12, 6, 19, 7, 'S'); s.rect(13, 6, 18, 6, 's')       # little iron cap rim
    elif look == 'elf':
        if view in ('down', 'up'):
            paint(s, [(9, 11, 'k'), (8, 10, 'k'), (10, 12, 'k'), (22, 11, 'k'), (23, 10, 'k'), (21, 12, 'k')])
            s.set(10, 11, 'k'); s.set(21, 11, 'k')
        else:
            paint(s, [(18, 12, 'k'), (19, 11, 'k'), (20, 10, 'k')])
        for y in range(16, 22):                                    # long hair falls past shoulders
            for x in ((11, 20) if view == 'down' else (11, 12, 19, 20) if view == 'up' else (18, 19)):
                if s.get(x, y) not in (None,): s.set(x, y, 'D')
    elif look == 'beetle':
        tips = {'down': [(13, 5), (12, 4), (11, 3), (18, 5), (19, 4), (20, 3)],
                'up': [(13, 5), (12, 4), (11, 3), (18, 5), (19, 4), (20, 3)],
                'left': [(13, 5), (12, 4), (11, 3), (15, 5), (15, 4), (14, 3)]}[view]
        paint(s, [(x, y, 'n') for x, y in tips])
        for x, y in tips[2::3]: s.set(x, y, 'y')
        if view == 'up':                                           # wing-case seam on the back
            s.rect(15, 18, 16, 22, 'b'); s.rect(13, 19, 13, 21, 'y')
    elif look == 'frog':
        if view == 'down':
            s.rect(13, 13, 14, 14, 'G'); s.rect(17, 13, 18, 14, 'G')
            for ex in (12, 17):
                paint(s, [(ex, 6, 'W'), (ex + 1, 6, 'W'), (ex + 2, 6, 'W'), (ex, 7, 'W'), (ex + 1, 7, 'K'), (ex + 2, 7, 'W'),
                          (ex + 1, 5, 'G'), (ex, 5, 'G'), (ex + 2, 5, 'G')])
            s.rect(13, 15, 18, 15, 'g'); s.set(12, 14, 'g'); s.set(19, 14, 'g')
        elif view == 'up':
            for ex in (12, 17):
                paint(s, [(ex, 6, 'G'), (ex + 1, 6, 'G'), (ex + 2, 6, 'G'), (ex + 1, 5, 'G')])
            s.rect(13, 9, 18, 9, 'L')
        else:
            s.rect(12, 13, 13, 14, 'G')
            paint(s, [(12, 6, 'W'), (13, 6, 'W'), (14, 6, 'W'), (12, 7, 'K'), (13, 7, 'W'), (14, 7, 'W'),
                      (12, 5, 'G'), (13, 5, 'G'), (14, 5, 'G')])
            s.rect(11, 15, 14, 15, 'g')
        for x in range(11, 21):                                    # spotted head
            if s.get(x, 9) == 'G' and x % 3 == 0: s.set(x, 9, 'g')
    elif look == 'minotaur':
        if view in ('down', 'up'):
            horn = [(10, 8, 'k'), (9, 7, 'k'), (8, 6, 'k'), (8, 5, 'W'), (21, 8, 'k'), (22, 7, 'k'), (23, 6, 'k'), (23, 5, 'W')]
            paint(s, horn)
            s.set(10, 9, 'k'); s.set(21, 9, 'k')
            if view == 'down':
                s.rect(13, 15, 18, 16, 't'); s.set(14, 16, 'b'); s.set(17, 16, 'b'); s.set(15, 17, 'y'); s.set(16, 17, 'y')
                s.set(12, 15, 'B'); s.set(19, 15, 'B')
        else:
            paint(s, [(15, 6, 'k'), (14, 5, 'k'), (13, 4, 'k'), (13, 3, 'W')])
            paint(s, [(10, 14, 't'), (10, 15, 't'), (10, 16, 't'), (11, 16, 't')])
            s.rect(11, 14, 13, 16, 't'); s.set(10, 15, 'b'); s.set(12, 17, 'y')
    return s


def folk(look, view, frame):
    remap = FOLK_LOOKS[look]
    if view in ('down', 'up'):
        base = kid() if view == 'down' else kid_up()
        s = folk_extras(base.remap(remap), look, view)
        if frame == 'idle':
            return s
        return _bob(_lift_leg(s, 'L' if frame == 'walk1' else 'R'), top=0)
    left = folk_extras(kid_left(frame).remap(remap), look, 'left')
    return left if view == 'left' else mirror(left)


FOLK_NAMES = ['dwarf', 'elf', 'beetle', 'frog', 'minotaur']
FOLK = [(f'{c}_{v}_{f}', (lambda c=c, v=v, f=f: folk(c, v, f)))
        for c in FOLK_NAMES for v in ('down', 'up', 'left', 'right') for f in ('idle', 'walk1', 'walk2')]

# =====================================================================
# Ingredients for the signature dishes
# =====================================================================

def item_venison():
    s = Sprite()
    ball(s, 14, 17, 7.5, 6, 'b', 'R', 'P', spec=None)
    for x, y in [(11, 15), (13, 18), (16, 16)]: s.set(x, y, 'P')
    s.rect(20, 17, 24, 19, 'k'); s.rect(20, 19, 24, 19, 't')                     # bone
    s.rect(24, 15, 25, 17, 'k'); s.rect(24, 19, 25, 21, 'k'); s.set(25, 16, 'W')
    s.outline(); return s


def item_cheese():
    s = Sprite()
    for i in range(10):
        s.rect(8 + i, 20 - i, 24, 20 - i, 'y')
    s.rect(8, 21, 24, 24, 'H'); s.rect(8, 21, 24, 21, 'y')
    s.rect(8, 21, 24, 24, 'r') if False else None
    for y in range(21, 25):
        for x in range(8, 25):
            s.set(x, y, 'y' if (x + y) % 9 else 'H')
    s.rect(8, 24, 24, 24, 'H')
    for x, y in [(19, 16), (14, 19), (21, 13), (11, 22), (17, 23)]: s.set(x, y, 'H'); s.set(x + 1, y, 'r') if y > 20 else None
    s.rect(9, 20, 24, 20, 'W') if False else None
    s.outline(); return s


def item_tomato():
    s = Sprite()
    ball(s, 16, 18, 8, 6.5, 'b', 'R', 'r', spec='W')
    for x, y in [(14, 11), (15, 12), (16, 11), (17, 12), (18, 11), (16, 10), (13, 12), (19, 12)]: s.set(x, y, 'G')
    s.set(16, 9, 'g')
    s.outline(); return s


# =====================================================================
# Signature dishes
# =====================================================================

def dish_river_chowder():
    s = Sprite(); _bowl(s, 'p', 'u', 'n', 't', 'k', 'W')
    for x, y, c in [(12, 15, 'P'), (17, 14, 'P'), (20, 15, 'r'), (14, 16, 'G'), (19, 16, 'v'), (11, 14, 'y')]:
        s.set(x, y, c)
    s.rect(21, 12, 25, 12, 'B'); s.set(26, 11, 'B')                              # spoon
    for x, y in [(13, 10), (14, 9), (13, 8), (18, 10), (19, 9), (18, 8)]: s.set(x, y, 'p')
    s.outline(); return s


def dish_venison_pie():
    s = Sprite()
    s.ellipse(16, 19, 11, 5.5, 'S'); s.ellipse(16, 18, 10, 4.6, 'B'); s.ellipse(16, 17.5, 9, 3.6, 't')
    s.ellipse(14, 16.5, 4, 1.4, 'k')
    for x in (12, 16, 20): s.set(x, 17, 'B'); s.set(x + 1, 18, 'B')             # vents
    s.ellipse(16, 17.5, 1.6, 0.8, 'R')
    for x in range(6, 27):
        for y in range(13, 25):
            if s.get(x, y) == 'B' and s.get(x, y - 1) == 't' and (x % 2): s.set(x, y, 't')
    for x, y in [(15, 12), (16, 11), (15, 10), (17, 13), (18, 12)]: s.set(x, y, 'p')
    s.outline(); return s


def dish_shepherds_supper():
    s = Sprite(); _plate(s, y=19, rx=12)
    ball(s, 13, 17, 5, 3.5, 'b', 'B', 't', spec=None)                           # roast mutton
    s.rect(11, 15, 14, 15, 't')
    s.rect(18, 15, 23, 18, 'r'); s.rect(18, 15, 23, 15, 't'); s.rect(19, 16, 22, 17, 'k')   # toast
    for x, y in [(17, 20), (19, 20), (21, 19), (15, 21)]: s.set(x, y, 'm'); s.set(x + 1, y, 'v')  # onions
    s.set(10, 19, 'G'); s.set(11, 20, 'L')
    s.outline(); return s


def dish_herb_omelette():
    s = Sprite(); _plate(s)
    for y in range(14, 21):
        for x in range(8, 25):
            nx, ny = (x + 0.5 - 16) / 8, (y + 0.5 - 17.5) / 3.5
            if nx * nx + ny * ny <= 1 and y >= 14 + abs(x - 16) // 6:
                s.set(x, y, 'y' if ny < 0.2 else 'H')
    s.rect(10, 15, 22, 15, 'k')
    for x, y in [(11, 16), (14, 15), (17, 16), (20, 15), (13, 17), (19, 17)]: s.set(x, y, 'G')
    s.set(16, 16, 'L')
    s.outline(); return s


def dish_cheese_toast():
    s = Sprite(); _plate(s)
    s.rect(9, 13, 22, 19, 'B'); s.rect(10, 13, 21, 18, 't')
    s.rect(10, 13, 21, 15, 'y'); s.rect(11, 16, 13, 17, 'y'); s.rect(17, 16, 19, 17, 'y'); s.set(15, 16, 'y')
    s.rect(12, 14, 14, 14, 'W'); s.set(18, 13, 'H'); s.set(15, 15, 'H')
    s.outline(); return s


def dish_berries_and_cream():
    s = Sprite(); _bowl(s, 'p', 'W', 's', 's', 'W', 'W')
    for x, y in [(11, 14), (13, 13), (15, 14), (18, 13), (20, 14), (16, 12), (14, 15)]:
        s.set(x, y, 'v'); s.set(x + 1, y, 'm')
    s.rect(15, 11, 17, 11, 'W'); s.set(16, 10, 'W'); s.set(17, 9, 'G')
    s.outline(); return s


def dish_honeyed_porridge():
    s = Sprite(); _bowl(s, 't', 'B', 'b', 't', 'k', 'W')
    for x, y in [(12, 14), (13, 15), (14, 14), (18, 15), (19, 14)]: s.set(x, y, 't')
    for x in range(13, 20): s.set(x, 15 if x % 2 else 14, 'r')                  # honey swirl
    s.set(16, 13, 'y'); s.set(15, 13, 'y')
    s.rect(21, 12, 25, 12, 's'); s.set(26, 11, 's')                              # spoon
    s.outline(); return s


FOOD3 = [
    ('venison', item_venison, 'raw', [], None),
    ('cheese', item_cheese, 'raw', [], None),
    ('tomato', item_tomato, 'raw', [], None),
    ('herb_omelette', dish_herb_omelette, 'processed', ['whisked_egg', 'chopped_herbs'], 'fry'),
    ('cheese_toast', dish_cheese_toast, 'processed', ['toast', 'cheese'], 'grill'),
    ('berries_and_cream', dish_berries_and_cream, 'processed', ['berries', 'whipped_cream'], 'mix'),
    ('honeyed_porridge', dish_honeyed_porridge, 'processed', ['wheat', 'milk', 'honey'], 'boil'),
    ('river_chowder', dish_river_chowder, 'processed', ['fish', 'milk', 'onion'], 'boil'),
    ('venison_pie', dish_venison_pie, 'processed', ['venison', 'flour', 'onion'], 'bake'),
    ('shepherds_supper', dish_shepherds_supper, 'processed', ['venison', 'onion', 'toast'], 'grill'),
]

# =====================================================================
# Shops (64x64, same build language as the inn)
# =====================================================================

def _shop(roof, roof_hi, roof_dk, wall, wall_dk, awn_a, awn_b, sign_icon, window_goods, brick=False):
    s = Sprite(64, 64)
    # roof
    s.rect(6, 10, 57, 30, roof); s.rect(6, 10, 57, 16, roof_dk); s.rect(6, 17, 57, 17, roof_hi)
    for y in range(20, 30, 3):
        s.rect(6, y, 57, y, roof_dk)
        for x in range(6 + (y % 2) * 2, 58, 4): s.set(x, y + 1, roof_dk)
    for y in (12, 14):
        for x in range(6 + (y % 4), 58, 4): s.set(x, y, roof)
    s.rect(6, 30, 57, 30, 'b')
    s.rect(42, 3, 47, 14, 'S'); s.rect(42, 3, 47, 3, 'd'); s.rect(46, 4, 47, 14, 'd'); s.rect(43, 2, 45, 2, 'K')
    # walls
    s.rect(8, 31, 55, 57, wall); s.rect(8, 31, 55, 32, wall_dk)
    if brick:
        for row, y in enumerate(range(34, 57, 3)):
            s.rect(8, y, 55, y, wall_dk)
            for x in range(8 + (row % 2) * 3, 56, 6): s.set(x, y + 1, wall_dk); s.set(x, y + 2, wall_dk)
    else:
        for x in (8, 31, 55): s.rect(x, 31, x, 57, 'b')
        s.rect(8, 43, 55, 43, 'b')
    s.rect(8, 55, 55, 57, 'S'); s.rect(8, 55, 55, 55, 's'); s.rect(8, 57, 55, 57, 'e')
    # shop window with goods
    s.rect(11, 40, 30, 53, 'b'); s.rect(12, 41, 29, 52, 'C'); s.rect(12, 41, 29, 41, 'p')
    s.rect(12, 49, 29, 52, 'B'); s.rect(12, 49, 29, 49, 't')
    for i, c in enumerate(window_goods):
        x = 13 + i * 4
        s.rect(x, 46, x + 2, 48, c); s.set(x, 46, 'W')
    s.rect(20, 41, 20, 48, 'b'); s.set(13, 42, 'W'); s.set(14, 42, 'W')
    # door
    s.rect(36, 40, 45, 57, 'b'); s.rect(37, 41, 44, 57, 'B'); s.rect(38, 43, 43, 47, 'y'); s.rect(40, 43, 41, 47, 'b')
    s.set(43, 51, 'y'); s.rect(35, 58, 46, 58, 'd')
    # striped awning over window
    for x in range(9, 33):
        c = awn_a if ((x - 9) // 3) % 2 == 0 else awn_b
        s.rect(x, 35, x, 38, c)
        s.set(x, 39, c if (x % 2) else None)
    s.rect(9, 35, 32, 35, 'k') if awn_b == 'W' else None
    s.rect(9, 34, 32, 34, 'b')
    # hanging sign
    s.rect(47, 33, 60, 33, 'e'); s.set(49, 34, 'e'); s.set(58, 34, 'e')
    s.rect(48, 35, 59, 42, 't'); s.rect(48, 35, 59, 35, 'k'); s.rect(48, 42, 59, 42, 'B')
    for x, y, c in sign_icon: s.set(48 + x, 35 + y, c)
    # flower pots
    for px in (32, 49):
        s.rect(px, 54, px + 2, 57, 'r'); s.set(px, 53, 'G'); s.set(px + 1, 52, 'P'); s.set(px + 2, 53, 'G')
    s.outline()
    return ground_shadow(s, 60)


BREAD_ICON = [(3, 3, 'O'), (4, 2, 'O'), (5, 2, 'O'), (6, 2, 'O'), (7, 2, 'O'), (8, 3, 'O'),
              (3, 4, 'O'), (8, 4, 'O'), (3, 5, 'O'), (4, 5, 'O'), (5, 5, 'O'), (6, 5, 'O'), (7, 5, 'O'), (8, 5, 'O'),
              (4, 3, 'r'), (5, 3, 'k'), (6, 3, 'r'), (7, 3, 'k'), (4, 4, 'r'), (5, 4, 'r'), (6, 4, 'r'), (7, 4, 'r')]
HAM_ICON = [(3, 2, 'O'), (4, 2, 'O'), (5, 2, 'O'), (2, 3, 'O'), (6, 3, 'O'), (2, 4, 'O'), (6, 4, 'O'), (3, 5, 'O'), (4, 5, 'O'), (5, 5, 'O'),
            (3, 3, 'R'), (4, 3, 'P'), (5, 3, 'R'), (3, 4, 'R'), (4, 4, 'R'), (5, 4, 'R'),
            (7, 4, 'O'), (8, 4, 'k'), (9, 3, 'k'), (9, 5, 'k'), (8, 3, 'O'), (8, 5, 'O')]
SACK_ICON = [(4, 1, 'O'), (5, 1, 'O'), (6, 1, 'O'), (3, 2, 'O'), (7, 2, 'O'), (4, 2, 'b'), (5, 2, 'b'), (6, 2, 'b'),
             (3, 3, 'O'), (2, 4, 'O'), (2, 5, 'O'), (8, 4, 'O'), (8, 5, 'O'), (7, 3, 'O'), (3, 6, 'O'), (4, 6, 'O'), (5, 6, 'O'), (6, 6, 'O'), (7, 6, 'O'),
             (4, 3, 'k'), (5, 3, 'k'), (6, 3, 'k'), (3, 4, 'k'), (4, 4, 'k'), (5, 4, 'H'), (6, 4, 'k'), (7, 4, 'k'),
             (3, 5, 'k'), (4, 5, 'k'), (5, 5, 'k'), (6, 5, 'k'), (7, 5, 't')]


def bakery():
    return _shop('r', 't', 'B', 'k', 't', 'r', 'W', BREAD_ICON, ['r', 't', 'k', 'r'])


def butcher():
    return _shop('R', 'P', 'b', 'W', 's', 'R', 'W', HAM_ICON, ['R', 'P', 'R', 'k'], brick=False)


def general_store():
    return _shop('T', 'L', 'g', 'R', 'b', 'G', 'k', SACK_ICON, ['k', 'G', 'y', 'B'], brick=True)


MILK_ICON = [(4, 1, 'O'), (5, 1, 'O'), (6, 1, 'O'), (4, 2, 'O'), (6, 2, 'O'), (3, 3, 'O'), (7, 3, 'O'), (3, 4, 'O'), (7, 4, 'O'),
             (3, 5, 'O'), (7, 5, 'O'), (3, 6, 'O'), (4, 6, 'O'), (5, 6, 'O'), (6, 6, 'O'), (7, 6, 'O'), (5, 2, 'W'),
             (4, 3, 'W'), (5, 3, 'W'), (6, 3, 's'), (4, 4, 'c'), (5, 4, 'c'), (6, 4, 'u'), (4, 5, 'W'), (5, 5, 'W'), (6, 5, 's')]
FISH_ICON = [(2, 3, 'O'), (3, 2, 'O'), (4, 2, 'O'), (5, 2, 'O'), (6, 2, 'O'), (7, 3, 'O'), (3, 5, 'O'), (4, 5, 'O'), (5, 5, 'O'), (6, 5, 'O'),
             (2, 4, 'O'), (7, 4, 'O'), (8, 2, 'O'), (8, 5, 'O'), (9, 2, 'O'), (9, 3, 'O'), (9, 4, 'O'), (9, 5, 'O'),
             (3, 3, 'c'), (4, 3, 'p'), (5, 3, 'c'), (6, 3, 'c'), (3, 4, 'u'), (4, 4, 'c'), (5, 4, 'u'), (6, 4, 'u'), (8, 3, 'c'), (8, 4, 'u'), (3, 3, 'K')]
PEPPER_ICON = [(5, 1, 'O'), (6, 1, 'G'), (5, 2, 'O'), (4, 2, 'O'), (6, 2, 'O'), (3, 3, 'O'), (7, 3, 'O'), (3, 4, 'O'), (7, 4, 'O'),
               (4, 5, 'O'), (6, 5, 'O'), (5, 6, 'O'), (4, 3, 'R'), (5, 3, 'r'), (6, 3, 'R'), (4, 4, 'R'), (5, 4, 'R'), (6, 4, 'b'), (5, 5, 'R')]


def dairy():
    return _shop('u', 'p', 'n', 'W', 's', 'c', 'W', MILK_ICON, ['W', 'y', 'W', 'k'])


def fishmonger():
    return _shop('S', 's', 'd', 'k', 't', 'u', 'W', FISH_ICON, ['c', 'p', 'u', 'c'], brick=True)


def spice_shop():
    return _shop('v', 'm', 'n', 'H', 'B', 'v', 'y', PEPPER_ICON, ['R', 'H', 'G', 'r'])


SHOPS = [('bakery', bakery), ('butcher', butcher), ('general_store', general_store),
         ('dairy', dairy), ('fishmonger', fishmonger), ('spice_shop', spice_shop)]
