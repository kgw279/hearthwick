"""Batch 7: UI kit — 9-slice frames, icons, emotes, number font.

Designed at 1x on a 16px icon grid; scale the whole game by an integer (2x/3x/4x).
"""
import math
from core import Sprite, check_rows

# =====================================================================
# 9-slice frames.  Each entry: (name, builder, border px)
# =====================================================================

def _frame(w, h, outer, fill, hi, lo, border=1, corner_cut=True):
    s = Sprite(w, h)
    s.rect(0, 0, w - 1, h - 1, outer)
    s.rect(1, 1, w - 2, h - 2, lo)
    s.rect(1, 1, w - 3, h - 3, hi)
    s.rect(2, 2, w - 3, h - 3, fill)
    if corner_cut:
        for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
            s.set(x, y, None)
    return s


def panel_parchment():
    s = _frame(24, 24, 'O', 'k', 'W', 't')
    s.rect(3, 3, 20, 20, 'k')
    for x, y in ((3, 3), (20, 3), (3, 20), (20, 20)): s.set(x, y, 't')
    return s


def panel_wood():
    s = _frame(24, 24, 'O', 'B', 't', 'b')
    for y in (7, 15): s.rect(2, y, 21, y, 'b')
    for x, y in ((3, 3), (20, 3), (3, 20), (20, 20)): s.set(x, y, 'H'); s.set(x, y, 'y') if False else None
    for x, y in ((3, 3), (20, 3), (3, 20), (20, 20)): s.set(x, y, 'S')
    return s


def panel_dark():
    s = _frame(24, 24, 'O', 'K', 'v', 'K')
    s.rect(1, 1, 22, 1, 'v'); s.rect(1, 1, 1, 22, 'v')
    return s


def panel_inset():
    """Recessed area inside a panel (lists, text fields)."""
    s = Sprite(24, 24)
    s.rect(0, 0, 23, 23, 't'); s.rect(0, 0, 23, 0, 'B'); s.rect(0, 0, 0, 23, 'B'); s.rect(1, 1, 22, 22, 'k')
    s.rect(1, 1, 22, 1, 't')
    return s


def _button(top, body, shade, lip, pressed=False):
    s = Sprite(24, 16)
    off = 1 if pressed else 0
    s.rect(1, off, 22, 15, 'O'); s.rect(0, 1 + off, 23, 14, 'O')
    if not pressed:
        s.rect(1, 12, 22, 14, lip)                                  # chunky bottom lip
        s.rect(1, 1, 22, 11, body); s.rect(1, 1, 22, 2, top); s.rect(1, 9, 22, 11, shade)
    else:
        s.rect(1, 2, 22, 14, body); s.rect(1, 2, 22, 3, top); s.rect(1, 12, 22, 14, shade)
        s.set(0, 1, None); s.set(23, 1, None)
    s.set(2, 2 + off, 'W')
    return s


BUTTON_STYLES = {
    'primary': ('y', 'y', 'r', 'H'),       # honey
    'secondary': ('k', 't', 'B', 'b'),     # wood
    'danger': ('P', 'P', 'R', 'b'),        # berry
    'success': ('L', 'G', 'T', 'g'),       # mint
    'disabled': ('s', 's', 'S', 'd'),
}


def slot(kind='normal'):
    s = Sprite(24, 24)
    s.rect(1, 0, 22, 23, 'O'); s.rect(0, 1, 23, 22, 'O')
    s.rect(1, 1, 22, 22, 'b'); s.rect(2, 2, 22, 22, 'B'); s.rect(2, 2, 21, 21, 't'); s.rect(3, 3, 21, 21, 'k')
    s.rect(3, 3, 21, 3, 't'); s.rect(3, 3, 3, 21, 't')
    if kind == 'selected':
        for x in range(24):
            for y in range(24):
                if s.px[y][x] == 'O': s.px[y][x] = 'r'
        s.rect(1, 1, 22, 1, 'y'); s.rect(1, 1, 1, 22, 'y'); s.rect(22, 1, 22, 22, 'y'); s.rect(1, 22, 22, 22, 'y')
    if kind == 'locked':
        s.rect(3, 3, 21, 21, 's'); s.rect(3, 3, 21, 3, 'S'); s.rect(3, 3, 3, 21, 'S')
        s.rect(9, 12, 15, 17, 'H'); s.rect(9, 12, 15, 12, 'y'); s.rect(10, 8, 10, 11, 'e'); s.rect(14, 8, 14, 11, 'e'); s.rect(11, 7, 13, 7, 'e')
        s.set(12, 14, 'K'); s.set(12, 15, 'K')
    return s


def bar_frame():
    s = Sprite(16, 8)
    s.rect(1, 0, 14, 7, 'O'); s.rect(0, 1, 15, 6, 'O'); s.rect(1, 1, 14, 6, 'K'); s.rect(1, 1, 14, 1, 'O')
    return s


def bar_fill(color):
    hi, base, lo = {'green': ('L', 'G', 'T'), 'honey': ('y', 'y', 'r'), 'red': ('P', 'R', 'b'),
                    'blue': ('c', 'U', 'n'), 'pink': ('m', 'P', 'R')}[color]
    s = Sprite(4, 4)
    s.rect(0, 0, 3, 3, base); s.rect(0, 0, 3, 0, hi); s.rect(0, 3, 3, 3, lo)
    return s


def speech_bubble():
    """9-slice body (border 6); the tail is a separate sprite."""
    s = Sprite(24, 20)
    s.rect(2, 0, 21, 19, 'O'); s.rect(0, 2, 23, 17, 'O'); s.rect(1, 1, 22, 18, 'O')
    s.rect(2, 1, 21, 18, 'W'); s.rect(1, 2, 22, 17, 'W'); s.rect(2, 17, 21, 18, 'p'); s.rect(21, 2, 22, 17, 'p')
    s.set(1, 1, None); s.set(22, 1, None); s.set(1, 18, None); s.set(22, 18, None)
    s.set(0, 1, None) if False else None
    return s


def bubble_tail():
    s = Sprite(8, 6)
    rows = check_rows('tail', ["OWWWWO..", ".OWWpO..", "..OWpO..", "...OWO..", "....OO..", "........"])
    s.stamp(rows, 0, 0)
    return s


def tag_pill(color):
    s = Sprite(16, 10)
    s.rect(1, 0, 14, 9, 'O'); s.rect(0, 1, 15, 8, 'O')
    s.rect(1, 1, 14, 8, color); s.rect(2, 1, 13, 1, 'W') if False else None
    hi = {'b': 'B', 'P': 'm', 'r': 'y', 'G': 'L', 'R': 'P', 'u': 'c', 'v': 'm', 'B': 't'}.get(color, color)
    s.rect(2, 1, 13, 1, hi)
    return s


def selection_bracket():
    s = Sprite(32, 32)
    for (x, y, dx, dy) in ((0, 0, 1, 1), (31, 0, -1, 1), (0, 31, 1, -1), (31, 31, -1, -1)):
        for i in range(6):
            s.set(x + dx * i, y, 'y'); s.set(x, y + dy * i, 'y')
            s.set(x + dx * i, y + dy, 'r'); s.set(x + dx, y + dy * i, 'r')
    return s


FRAMES = [
    ('panel_parchment', panel_parchment, 8), ('panel_wood', panel_wood, 8), ('panel_dark', panel_dark, 8),
    ('panel_inset', panel_inset, 3),
    *[(f'button_{k}', (lambda v=v: _button(*v)), (6, 5, 6, 7)) for k, v in BUTTON_STYLES.items()],
    *[(f'button_{k}_pressed', (lambda v=v: _button(*v, pressed=True)), (6, 5, 6, 7)) for k, v in BUTTON_STYLES.items() if k != 'disabled'],
    ('slot', slot, 6), ('slot_selected', lambda: slot('selected'), 6), ('slot_locked', lambda: slot('locked'), 6),
    ('bar_frame', bar_frame, 3),
    ('speech_bubble', speech_bubble, 6),
]
SMALL = [
    ('bar_fill_green', lambda: bar_fill('green')), ('bar_fill_honey', lambda: bar_fill('honey')),
    ('bar_fill_red', lambda: bar_fill('red')), ('bar_fill_blue', lambda: bar_fill('blue')), ('bar_fill_pink', lambda: bar_fill('pink')),
    ('bubble_tail', bubble_tail),
]
TAG_COLORS = {'savory': 'B', 'sweet': 'P', 'hearty': 'r', 'fresh': 'G', 'warm': 'R', 'fish': 'u', 'meat': 'b', 'odd': 'v'}
PILLS = [(f'tag_pill_{k}', (lambda c=c: tag_pill(c))) for k, c in TAG_COLORS.items()]

# =====================================================================
# 16x16 icons (outlined, centred)
# =====================================================================

def _icon(rows=None, legend=None):
    s = Sprite(16, 16)
    if rows:
        s.stamp(rows, legend=legend)
    return s


def _done(s):
    s.outline(); return s


HEART = check_rows('heart', [
    ".RRR...RRR.",
    "RPWRR.RRRRR",
    "RWPRRRRRRRR",
    "RPRRRRRRRRR",
    "RRRRRRRRRRb",
    ".RRRRRRRRb.",
    "..RRRRRRb..",
    "...RRRRb...",
    "....RRb....",
    ".....b.....",
])
STAR = check_rows('star', [
    ".....y.....",
    "....yyy....",
    "....yWy....",
    "yyyyyWyyyyy",
    ".yyyyyyyyy.",
    "..yyyyyyy..",
    "...yyyyy...",
    "..yyyHyyy..",
    "..yyH.Hyy..",
    ".yyH...Hyy.",
    ".yH.....Hy.",
])


def icon_coin():
    s = _icon(); s.ellipse(8, 8, 5.5, 5.5, 'H'); s.ellipse(7.6, 7.6, 4.8, 4.8, 'y')
    s.ellipse(8, 8, 3, 3, 'r'); s.ellipse(8, 8, 2.2, 2.2, 'y'); s.set(5, 5, 'W'); s.set(6, 4, 'W')
    return _done(s)


def icon_coins():
    s = _icon()
    for cx, cy in ((6, 10), (10, 10), (8, 6)):
        s.ellipse(cx, cy, 3.6, 3.6, 'H'); s.ellipse(cx - 0.3, cy - 0.3, 3, 3, 'y'); s.set(int(cx), int(cy), 'r')
    return _done(s)


def icon_heart(): return _done(_icon(HEART))
def icon_heart_empty(): return _done(_icon(HEART, {'R': 'd', 'P': 'S', 'W': 's', 'b': 'e'}))
def icon_star(): return _done(_icon(STAR))
def icon_star_empty(): return _done(_icon(STAR, {'y': 'd', 'W': 'S', 'H': 'e'}))


def icon_friendship():
    s = _icon(HEART, {'R': 'm', 'P': 'W', 'W': 'W', 'b': 'v'})
    s.set(4, 3, 'W'); s.rect(7, 5, 8, 6, 'y')
    return _done(s)


def icon_clock():
    s = _icon(); s.ellipse(8, 8, 6, 6, 'B'); s.ellipse(8, 8, 4.8, 4.8, 'k')
    s.rect(8, 4, 8, 8, 'b'); s.rect(8, 8, 10, 8, 'b'); s.set(8, 8, 'R')
    return _done(s)


def icon_sun():
    s = _icon()
    for a in range(8):
        dx, dy = math.cos(a * math.pi / 4), math.sin(a * math.pi / 4)
        s.set(round(8 + dx * 6.4), round(8 + dy * 6.4), 'r'); s.set(round(8 + dx * 5.4), round(8 + dy * 5.4), 'y')
    s.ellipse(8, 8, 3.8, 3.8, 'y'); s.ellipse(7, 7, 1.6, 1.6, 'W')
    return _done(s)


def icon_moon():
    s = _icon(); s.ellipse(8, 8, 5.5, 5.5, 'p')
    s.ellipse(10.5, 6, 4.5, 4.5, None) if False else None
    for y in range(16):
        for x in range(16):
            if ((x - 10.5) ** 2 + (y - 6) ** 2) <= 4.6 ** 2: s.set(x, y, None)
    s.set(5, 9, 'c'); s.set(6, 11, 'c')
    return _done(s)


def _cloud(s, oy=0, c='W', sh='p'):
    for cx, cy, r in ((6, 8, 3), (10, 7, 3.6), (8, 6, 3)):
        s.ellipse(cx, cy + oy, r, r * 0.85, c)
    s.rect(3, 9 + oy, 13, 10 + oy, c); s.rect(4, 10 + oy, 12, 10 + oy, sh)


def icon_cloud(): s = _icon(); _cloud(s, 1); return _done(s)


def icon_rain():
    s = _icon(); _cloud(s, -2, 'p', 's')
    for x, y in ((5, 11), (8, 12), (11, 11), (6, 14), (10, 14)): s.set(x, y, 'c'); s.set(x, y + 1, 'U') if y < 14 else None
    return _done(s)


def icon_snow():
    s = _icon(); _cloud(s, -2)
    for x, y in ((5, 12), (8, 13), (11, 12)):
        s.set(x, y, 'W'); s.set(x - 1, y, 'p'); s.set(x + 1, y, 'p'); s.set(x, y - 1, 'p'); s.set(x, y + 1, 'p')
    return _done(s)


def icon_bag():
    s = _icon(); s.ellipse(8, 10, 5, 4.5, 'B'); s.ellipse(7, 9, 3, 2.5, 't')
    s.rect(6, 4, 10, 6, 'B'); s.rect(6, 6, 10, 6, 'b'); s.rect(5, 3, 11, 3, 't'); s.set(8, 7, 'y')
    return _done(s)


def icon_book():
    s = _icon(); s.rect(3, 3, 12, 13, 'R'); s.rect(3, 3, 12, 3, 'P'); s.rect(4, 12, 12, 13, 'k'); s.rect(12, 4, 12, 13, 'k')
    s.rect(3, 3, 3, 13, 'b'); s.rect(6, 6, 10, 9, 'y'); s.rect(7, 7, 9, 8, 'r')
    return _done(s)


def icon_map():
    s = _icon(); s.rect(2, 4, 13, 12, 'k')
    for x in (5, 9): s.rect(x, 4, x, 12, 't')
    s.rect(2, 4, 13, 4, 'W'); s.set(6, 7, 'G'); s.set(7, 8, 'G'); s.set(3, 10, 'c'); s.set(4, 10, 'c')
    s.set(10, 7, 'R'); s.set(12, 9, 'R'); s.set(11, 8, 'R'); s.set(10, 9, 'R'); s.set(12, 7, 'R')
    s.rect(1, 4, 1, 12, 'B'); s.rect(14, 4, 14, 12, 'B')
    return _done(s)


def icon_pot():
    s = _icon(); s.ellipse(8, 10, 5.5, 4, 'e'); s.ellipse(7, 9, 2.5, 2, 'd')
    s.ellipse(8, 6.5, 5.5, 1.6, 'd'); s.ellipse(8, 6.5, 4.2, 0.9, 't')
    s.set(2, 7, 'e'); s.set(13, 7, 'e')
    for x, y in ((6, 3), (7, 2), (10, 3), (9, 2)): s.set(x, y, 'p')
    return _done(s)


def icon_inn():
    s = _icon()
    for i in range(6): s.rect(2 + i, 7 - i, 13 - i, 7 - i, 'H')
    s.rect(2, 7, 13, 7, 'b'); s.rect(3, 8, 12, 13, 'k'); s.rect(7, 10, 8, 13, 'B'); s.rect(4, 9, 5, 10, 'y'); s.rect(10, 9, 11, 10, 'y')
    s.rect(11, 1, 12, 4, 'S')
    return _done(s)


def icon_person():
    s = _icon(); s.ellipse(8, 5, 3, 3, 'k'); s.ellipse(8, 4, 3, 2, 'B')
    s.ellipse(8, 13, 5, 3.5, 'U'); s.rect(3, 13, 13, 14, 'U'); s.set(6, 11, 'c')
    s.set(7, 5, 'K'); s.set(9, 5, 'K')
    return _done(s)


def icon_gear():
    s = _icon(); s.ellipse(8, 8, 4.6, 4.6, 'S')
    for a in range(8):
        dx, dy = math.cos(a * math.pi / 4), math.sin(a * math.pi / 4)
        cx, cy = 8 + dx * 5.4, 8 + dy * 5.4
        s.rect(round(cx - 0.6), round(cy - 0.6), round(cx + 0.4), round(cy + 0.4), 'S')
    s.ellipse(7.5, 7.5, 3, 3, 's'); s.ellipse(8, 8, 1.6, 1.6, None)
    for y in range(16):
        for x in range(16):
            if (x + 0.5 - 8) ** 2 + (y + 0.5 - 8) ** 2 <= 2.4: s.set(x, y, None)
    return _done(s)


def _thick_line(s, pts, c):
    for x, y in pts: s.rect(x, y, x + 1, y + 1, c)


def icon_close():
    s = _icon(); _thick_line(s, [(4 + i, 4 + i) for i in range(7)] + [(10 - i, 4 + i) for i in range(7)], 'R')
    s.set(4, 4, 'P'); s.set(10, 4, 'P'); return _done(s)


def icon_check():
    s = _icon(); _thick_line(s, [(3, 8), (4, 9), (5, 10), (6, 11)] + [(7, 10), (8, 9), (9, 8), (10, 7), (11, 6), (12, 5)], 'G')
    s.set(3, 8, 'L'); s.set(12, 5, 'L'); return _done(s)


def icon_plus():
    s = _icon(); s.rect(7, 3, 8, 12, 'G'); s.rect(3, 7, 12, 8, 'G'); s.rect(7, 3, 8, 3, 'L'); s.rect(3, 7, 3, 8, 'L'); return _done(s)


def icon_minus():
    s = _icon(); s.rect(3, 7, 12, 8, 'R'); s.rect(3, 7, 12, 7, 'P'); return _done(s)


def icon_arrow(direction):
    s = _icon()
    rows = ["....yy....", "...yyyy...", "..yyyyyy..", ".yyyyyyyy.", "yyyyyyyyyy", "...yyyy...", "...yyyy...", "...yrry...", "...rrrr..."]
    s.stamp(check_rows('arrow', rows))
    if direction == 'down': s.px = s.px[::-1]
    if direction in ('left', 'right'):
        s.px = [list(r) for r in zip(*s.px)]
        if direction == 'right': s.px = [r[::-1] for r in s.px]
    return _done(s)


def icon_lock():
    s = _icon(); s.rect(4, 7, 11, 13, 'H'); s.rect(4, 7, 11, 7, 'y'); s.rect(5, 3, 5, 6, 'e'); s.rect(10, 3, 10, 6, 'e'); s.rect(6, 2, 9, 2, 'e')
    s.rect(7, 9, 8, 11, 'K'); return _done(s)


def icon_bell():
    s = _icon(); s.ellipse(8, 8, 4.5, 5, 'y'); s.rect(3, 9, 12, 11, 'y'); s.rect(3, 11, 12, 11, 'H'); s.set(6, 5, 'W')
    s.rect(7, 2, 8, 3, 'H'); s.rect(7, 12, 8, 13, 'r'); return _done(s)


def icon_exclaim():
    s = _icon(); s.rect(7, 2, 8, 9, 'r'); s.rect(7, 2, 7, 9, 'y'); s.rect(7, 11, 8, 12, 'r'); return _done(s)


def icon_question():
    s = _icon(); rows = [".cccc.", "cc..cc", "....cc", "...cc.", "..cc..", "..cc..", "......", "..cc.."]
    s.stamp(check_rows('q', rows)); return _done(s)


def icon_hand():
    rows = check_rows('hand', [
        "...kk......",
        "...kk......",
        "...kk......",
        "...kkkkkk..",
        "...kkkkkkk.",
        ".k.kkkkkkk.",
        ".kkkkkkkkk.",
        ".kkkkkkkkt.",
        "..kkkkkkt..",
        "...kkkkt...",
        "...UUUUU...",
    ])
    s = _icon(rows); return _done(s)


def icon_sparkle():
    s = _icon()
    for i in range(-5, 6):
        s.set(8 + i, 8, 'y' if abs(i) < 3 else 'W'); s.set(8, 8 + i, 'y' if abs(i) < 3 else 'W')
    s.rect(7, 7, 9, 9, 'y'); s.set(8, 8, 'W'); s.set(12, 3, 'y'); s.set(3, 12, 'W')
    return _done(s)


def icon_fire():
    rows = check_rows('fire', [
        "....r....",
        "...rr....",
        "...rrr.r.",
        "..rryrr..",
        ".rryyyrr.",
        ".ryyWyyr.",
        "rryyWWyrr",
        "rryyyyyrr",
        ".rrryrrr.",
        "..rrrrr..",
    ])
    return _done(_icon(rows))


def icon_speech():
    s = _icon(); s.rect(2, 3, 13, 10, 'W'); s.rect(2, 10, 13, 10, 'p'); s.rect(4, 11, 6, 11, 'W'); s.set(4, 12, 'W')
    for x in (5, 8, 11): s.set(x, 6, 'S'); s.set(x, 7, 'S')
    return _done(s)


# ---- cooking methods (match the kitchen stations) ----

def method_grind():
    s = _icon(); s.ellipse(8, 10, 6, 3, 'S'); s.rect(2, 10, 14, 12, 'd'); s.ellipse(8, 12, 6, 1.4, 'd')
    s.ellipse(8, 10, 6, 3, 'S'); s.ellipse(7, 9, 4, 1.5, 's'); s.set(8, 10, 'K'); s.rect(11, 3, 12, 9, 'B'); s.set(11, 3, 't')
    return _done(s)


def method_mix():
    s = _icon(); s.ellipse(8, 8, 6, 1.8, 'U'); s.ellipse(8, 8, 4.5, 1, 'k')
    for y in range(9, 13):
        half = 6 - (y - 9)
        s.rect(8 - half, y, 8 + half, y, 'U'); s.set(8 + half, y, 'n')
    s.rect(9, 2, 9, 7, 's'); s.set(10, 1, 's'); s.set(8, 1, 's')
    return _done(s)


def method_chop():
    s = _icon(); s.rect(2, 7, 11, 9, 's'); s.rect(2, 7, 11, 7, 'W'); s.rect(3, 6, 10, 6, 's'); s.rect(12, 7, 14, 9, 'b'); s.set(12, 8, 'B')
    s.rect(2, 11, 13, 13, 't'); s.rect(2, 13, 13, 13, 'H'); s.set(5, 11, 'r'); s.set(7, 11, 'G'); s.set(9, 11, 'r')
    return _done(s)


def method_fry():
    s = _icon(); s.ellipse(7, 9, 5.5, 3, 'K'); s.ellipse(7, 9, 4.3, 2, 'd'); s.rect(12, 8, 15, 9, 'b')
    s.ellipse(6, 8.6, 2.5, 1.3, 'W'); s.set(6, 8, 'y'); s.set(7, 8, 'y')
    for x, y in ((3, 4), (7, 3), (10, 4)): s.set(x, y, 'p')
    return _done(s)


def method_grill():
    s = _icon()
    for x, h in ((4, 3), (6, 4), (8, 5), (10, 4), (12, 3)):
        for i in range(h): s.set(x, 14 - i, 'y' if i < 2 else 'r')
    s.rect(2, 8, 13, 8, 'e'); s.rect(2, 10, 13, 10, 'e')
    for x in (3, 7, 11): s.rect(x, 7, x, 11, 'd')
    s.ellipse(8, 6, 4, 1.4, 't'); s.set(6, 6, 'b'); s.set(9, 6, 'b')
    return _done(s)


def method_bake():
    s = _icon(); s.ellipse(8, 9, 6.5, 6, 'R'); s.rect(1, 11, 15, 14, 'S'); s.rect(1, 11, 15, 11, 's')
    s.ellipse(8, 11, 3, 2.6, 'K'); s.rect(5, 11, 11, 12, 'K'); s.rect(6, 12, 10, 12, 'r'); s.set(8, 11, 'y')
    for y in (6, 9):
        for x in range(2, 15):
            if s.get(x, y) == 'R': s.set(x, y, 'b')
    return _done(s)


def method_boil():
    s = _icon(); s.ellipse(8, 10, 5.5, 4, 'e'); s.ellipse(8, 7, 5.5, 1.6, 'd'); s.ellipse(8, 7, 4.2, 0.9, 'c')
    for x, y in ((5, 4), (8, 2), (11, 4), (7, 5), (10, 3)): s.set(x, y, 'p')
    s.set(6, 7, 'W'); s.set(10, 7, 'W')
    s.set(5, 14, 'r'); s.set(8, 14, 'y'); s.set(11, 14, 'r')
    return _done(s)

def method_ferment():
    s = _icon()
    for y in range(3, 14):
        b = 1 if 5 <= y <= 11 else 0
        s.rect(4 - b, y, 12 + b, y, 'B')
    s.rect(3, 5, 13, 5, 'S'); s.rect(3, 11, 13, 11, 'S'); s.rect(4, 3, 12, 3, 't'); s.rect(5, 4, 5, 13, 't')
    s.rect(8, 6, 8, 10, 'b'); s.rect(13, 8, 15, 8, 's'); s.set(15, 9, 'H'); s.set(15, 11, 'H')
    return _done(s)



# ---- flavour tags (Hearthwick: savory sweet hearty fresh warm fish meat odd) ----

def tag_savory():
    s = _icon(); s.rect(6, 3, 9, 4, 'S'); s.rect(5, 5, 10, 12, 'W'); s.rect(5, 5, 5, 12, 'p'); s.rect(10, 5, 10, 12, 's')
    s.set(7, 3, 'K'); s.set(8, 4, 'K'); s.rect(6, 8, 9, 9, 'B')
    return _done(s)


def tag_sweet():
    s = _icon(); s.ellipse(8, 9, 3.5, 3.5, 'P'); s.ellipse(7, 8, 1.4, 1.4, 'W')
    s.set(3, 7, 'm'); s.set(3, 11, 'm'); s.set(4, 9, 'P'); s.set(13, 7, 'm'); s.set(13, 11, 'm'); s.set(12, 9, 'P')
    s.set(9, 10, 'R'); s.set(10, 9, 'R')
    return _done(s)


def tag_hearty():
    s = _icon(); s.ellipse(7, 7, 4.5, 4, 'r'); s.ellipse(6, 6, 2, 1.5, 'y')
    s.rect(10, 10, 12, 11, 'k'); s.set(13, 12, 'k'); s.set(13, 10, 'k'); s.set(11, 12, 'k')
    return _done(s)


def tag_fresh():
    rows = check_rows('leaf', ["......GG", "....GGGG", "..GGLGGG", ".GLGGGGG", ".GLGGGg.", "GLGGGg..", "GGGgg...", "Gggg....", "g.......", "........"])
    return _done(_icon(rows))


def tag_warm():
    return icon_fire()


def tag_fish():
    rows = check_rows('fish', ["...uuuu......", ".uuccccuu..uu", "uccWcccccuucu", "cccKcccccccc.", "ucccccccccuuc", ".uppppppuu.uu", "...pppp......"])
    return _done(_icon(rows))


def tag_meat():
    s = _icon(); s.ellipse(7, 8, 5, 4, 'R'); s.ellipse(6, 7, 2, 1.4, 'P'); s.rect(4, 11, 10, 11, 'k')
    s.rect(11, 9, 13, 10, 'k'); s.set(14, 8, 'k'); s.set(14, 11, 'k')
    return _done(s)


def tag_odd():
    s = _icon()
    pts = [(8, 8), (9, 8), (9, 7), (8, 6), (7, 6), (6, 7), (6, 8), (6, 9), (7, 10), (8, 11), (9, 11), (10, 10), (11, 9), (11, 8), (11, 7),
           (11, 6), (10, 5), (9, 4), (8, 4), (7, 4), (6, 4), (5, 5), (4, 6), (4, 7)]
    for i, (x, y) in enumerate(pts): s.set(x, y, 'm' if i % 3 else 'v')
    s.set(12, 3, 'y'); s.set(3, 12, 'y')
    return _done(s)


ICONS = [
    ('coin', icon_coin), ('coins', icon_coins), ('heart', icon_heart), ('heart_empty', icon_heart_empty),
    ('star', icon_star), ('star_empty', icon_star_empty), ('friendship', icon_friendship), ('clock', icon_clock),
    ('sun', icon_sun), ('moon', icon_moon), ('cloud', icon_cloud), ('rain', icon_rain), ('snow', icon_snow),
    ('bag', icon_bag), ('recipe_book', icon_book), ('map', icon_map), ('kitchen', icon_pot), ('inn', icon_inn),
    ('person', icon_person), ('settings', icon_gear), ('close', icon_close), ('check', icon_check),
    ('plus', icon_plus), ('minus', icon_minus), ('arrow_up', lambda: icon_arrow('up')), ('arrow_down', lambda: icon_arrow('down')),
    ('arrow_left', lambda: icon_arrow('left')), ('arrow_right', lambda: icon_arrow('right')), ('lock', icon_lock),
    ('bell', icon_bell), ('exclaim', icon_exclaim), ('question', icon_question), ('hand', icon_hand),
    ('sparkle', icon_sparkle), ('fire', icon_fire), ('speech', icon_speech),
    ('method_grind', method_grind), ('method_mix', method_mix), ('method_chop', method_chop), ('method_fry', method_fry),
    ('method_grill', method_grill), ('method_bake', method_bake), ('method_boil', method_boil), ('method_ferment', method_ferment),
    ('kind_food', lambda: icon_food()), ('kind_drink', lambda: icon_drink()),
    ('tag_savory', tag_savory), ('tag_sweet', tag_sweet), ('tag_hearty', tag_hearty), ('tag_fresh', tag_fresh),
    ('tag_warm', tag_warm), ('tag_fish', tag_fish), ('tag_meat', tag_meat), ('tag_odd', tag_odd),
]

# =====================================================================
# Emotes (20x20 bubble that floats over a character's head)
# =====================================================================

def _emote_base():
    s = Sprite(20, 20)
    s.ellipse(10, 8.5, 9, 7.6, 'O'); s.ellipse(10, 8.5, 8, 6.6, 'W'); s.ellipse(11, 10, 6, 4.4, 'W')
    for y in range(9, 15):
        for x in range(3, 18):
            if s.get(x, y) == 'W' and (x - 10) ** 2 / 64 + (y - 8.5) ** 2 / 43 > 0.55: s.set(x, y, 'p')
    s.rect(8, 15, 11, 16, 'O'); s.rect(9, 15, 10, 15, 'W'); s.set(9, 17, 'O'); s.set(10, 17, 'O') if False else None
    s.set(9, 16, 'W'); s.set(9, 17, 'O'); s.set(10, 16, 'O')
    return s


def _emote(symbol_pts):
    s = _emote_base()
    for x, y, c in symbol_pts: s.set(x, y, c)
    return s


def _small(rows, ox, oy):
    pts = []
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            if c != '.': pts.append((ox + i, oy + j, c))
    return pts


EMOTES = [
    ('emote_love', lambda: _emote(_small(["RR.RR", "RPRRR", "RRRRR", ".RRR.", "..R.."], 8, 6))),
    ('emote_happy', lambda: _emote(_small(["K...K", ".....", "R...R", ".RRR."], 8, 6))),
    ('emote_angry', lambda: _emote(_small(["R.R.R", ".RRR.", "RR.RR", ".RRR.", "R.R.R"], 8, 5))),
    ('emote_sweat', lambda: _emote(_small(["..c..", ".cpc.", "cpccc", "ccccu", ".cuu."], 8, 5))),
    ('emote_sleep', lambda: _emote(_small(["nnn..", "..n..", ".n...", "nnn..", "...UU", "....U", "...UU"], 7, 4))),
    ('emote_exclaim', lambda: _emote(_small(["rr", "rr", "rr", "rr", "..", "rr"], 9, 4))),
    ('emote_question', lambda: _emote(_small([".uuu.", "u...u", "...u.", "..u..", ".....", "..u.."], 8, 4))),
    ('emote_music', lambda: _emote(_small(["..vvv", "..v.v", "..v.v", "vvv.v", "vv.vv", "...vv"], 7, 5))),
    ('emote_hungry', lambda: _emote(_small(["s.S.s", "s.S.s", "sSSSs", ".SSS.", "..S..", "..S..", "..S.."], 8, 4))),
    ('emote_request', _emote_base),          # empty bubble: draw a food icon inside it at runtime
]

# =====================================================================
# Number font: 5x7 glyphs, white with plum outline (7x9 cells)
# =====================================================================

GLYPHS = {
    '0': [".WWW.", "W...W", "W..WW", "W.W.W", "WW..W", "W...W", ".WWW."],
    '1': ["..W..", ".WW..", "..W..", "..W..", "..W..", "..W..", ".WWW."],
    '2': [".WWW.", "W...W", "....W", "...W.", "..W..", ".W...", "WWWWW"],
    '3': ["WWWW.", "....W", "....W", ".WWW.", "....W", "....W", "WWWW."],
    '4': ["...W.", "..WW.", ".W.W.", "W..W.", "WWWWW", "...W.", "...W."],
    '5': ["WWWWW", "W....", "WWWW.", "....W", "....W", "W...W", ".WWW."],
    '6': [".WWW.", "W....", "W....", "WWWW.", "W...W", "W...W", ".WWW."],
    '7': ["WWWWW", "....W", "...W.", "..W..", ".W...", ".W...", ".W..."],
    '8': [".WWW.", "W...W", "W...W", ".WWW.", "W...W", "W...W", ".WWW."],
    '9': [".WWW.", "W...W", "W...W", ".WWWW", "....W", "....W", ".WWW."],
    '+': [".....", "..W..", "..W..", "WWWWW", "..W..", "..W..", "....."],
    '-': [".....", ".....", ".....", "WWWWW", ".....", ".....", "....."],
    'x': [".....", ".....", "W...W", ".W.W.", "..W..", ".W.W.", "W...W"],
    '/': ["....W", "....W", "...W.", "..W..", ".W...", "W....", "W...."],
    ':': [".....", "..W..", "..W..", ".....", "..W..", "..W..", "....."],
    '%': ["WW..W", "WW..W", "...W.", "..W..", ".W...", "W..WW", "W..WW"],
    '.': [".....", ".....", ".....", ".....", ".....", ".WW..", ".WW.."],
}


def glyph(ch, color='W'):
    s = Sprite(7, 9)
    for j, r in enumerate(GLYPHS[ch]):
        for i, c in enumerate(r):
            if c == 'W': s.set(1 + i, 1 + j, color if j < 4 else ('p' if color == 'W' else color))
    s.outline()
    return s


FONT = [(f'digit_{"plus" if c == "+" else "minus" if c == "-" else "times" if c == "x" else "slash" if c == "/" else "colon" if c == ":" else "percent" if c == "%" else "dot" if c == "." else c}', (lambda c=c: glyph(c)))
        for c in GLYPHS]
FONT_CHARS = list(GLYPHS)


# Letter font: same 5x7 grid and styling as the digits. Capitals only (a small-caps UI face).
LETTER_GLYPHS = {
    'A': [".WWW.", "W...W", "W...W", "WWWWW", "W...W", "W...W", "W...W"],
    'B': ["WWWW.", "W...W", "W...W", "WWWW.", "W...W", "W...W", "WWWW."],
    'C': [".WWW.", "W...W", "W....", "W....", "W....", "W...W", ".WWW."],
    'D': ["WWWW.", "W...W", "W...W", "W...W", "W...W", "W...W", "WWWW."],
    'E': ["WWWWW", "W....", "W....", "WWWW.", "W....", "W....", "WWWWW"],
    'F': ["WWWWW", "W....", "W....", "WWWW.", "W....", "W....", "W...."],
    'G': [".WWW.", "W...W", "W....", "W.WWW", "W...W", "W...W", ".WWWW"],
    'H': ["W...W", "W...W", "W...W", "WWWWW", "W...W", "W...W", "W...W"],
    'I': [".WWW.", "..W..", "..W..", "..W..", "..W..", "..W..", ".WWW."],
    'J': ["..WWW", "...W.", "...W.", "...W.", "...W.", "W..W.", ".WW.."],
    'K': ["W...W", "W..W.", "W.W..", "WW...", "W.W..", "W..W.", "W...W"],
    'L': ["W....", "W....", "W....", "W....", "W....", "W....", "WWWWW"],
    'M': ["W...W", "WW.WW", "W.W.W", "W.W.W", "W...W", "W...W", "W...W"],
    'N': ["W...W", "WW..W", "W.W.W", "W..WW", "W...W", "W...W", "W...W"],
    'O': [".WWW.", "W...W", "W...W", "W...W", "W...W", "W...W", ".WWW."],
    'P': ["WWWW.", "W...W", "W...W", "WWWW.", "W....", "W....", "W...."],
    'Q': [".WWW.", "W...W", "W...W", "W...W", "W.W.W", "W..W.", ".WW.W"],
    'R': ["WWWW.", "W...W", "W...W", "WWWW.", "W.W..", "W..W.", "W...W"],
    'S': [".WWWW", "W....", "W....", ".WWW.", "....W", "....W", "WWWW."],
    'T': ["WWWWW", "..W..", "..W..", "..W..", "..W..", "..W..", "..W.."],
    'U': ["W...W", "W...W", "W...W", "W...W", "W...W", "W...W", ".WWW."],
    'V': ["W...W", "W...W", "W...W", "W...W", "W...W", ".W.W.", "..W.."],
    'W': ["W...W", "W...W", "W...W", "W.W.W", "W.W.W", "WW.WW", "W...W"],
    'X': ["W...W", "W...W", ".W.W.", "..W..", ".W.W.", "W...W", "W...W"],
    'Y': ["W...W", "W...W", ".W.W.", "..W..", "..W..", "..W..", "..W.."],
    'Z': ["WWWWW", "....W", "...W.", "..W..", ".W...", "W....", "WWWWW"],
    '!': ["..W..", "..W..", "..W..", "..W..", "..W..", ".....", "..W.."],
    '?': [".WWW.", "W...W", "....W", "...W.", "..W..", ".....", "..W.."],
    ',': [".....", ".....", ".....", ".....", ".WW..", "..W..", ".W..."],
    "'": ["..W..", "..W..", ".W...", ".....", ".....", ".....", "....."],
    '&': [".WW..", "W..W.", "W.W..", ".W...", "W.W.W", "W..W.", ".WW.W"],
    '(': ["...W.", "..W..", ".W...", ".W...", ".W...", "..W..", "...W."],
    ')': [".W...", "..W..", "...W.", "...W.", "...W.", "..W..", ".W..."],
}
LETTER_NAMES = {'!': 'bang', '?': 'question', ',': 'comma', "'": 'apostrophe', '&': 'amp', '(': 'lparen', ')': 'rparen'}


def letter(ch, color='W'):
    s = Sprite(7, 9)
    for j, r in enumerate(LETTER_GLYPHS[ch]):
        for i, c in enumerate(r):
            if c == 'W': s.set(1 + i, 1 + j, color if j < 4 else ('p' if color == 'W' else color))
    s.outline()
    return s


LETTERS = [(f'letter_{LETTER_NAMES.get(c, c)}', (lambda c=c: letter(c))) for c in LETTER_GLYPHS]
LETTER_CHARS = list(LETTER_GLYPHS)


# Food / drink markers for menus (dish 'kind')
def icon_food():
    s = _icon(); s.ellipse(8, 10, 6.5, 3, 's'); s.ellipse(8, 9.6, 5.5, 2.2, 'W')
    s.ellipse(8, 8, 3.4, 2, 'B'); s.ellipse(7, 7.4, 2, 0.9, 't'); s.set(10, 6, 'p'); s.set(6, 5, 'p')
    return _done(s)


def icon_drink():
    s = _icon(); s.rect(4, 5, 10, 13, 'B'); s.rect(4, 5, 4, 13, 't'); s.rect(10, 5, 10, 13, 'b')
    s.rect(4, 7, 10, 7, 'S'); s.rect(4, 11, 10, 11, 'S'); s.rect(11, 7, 13, 7, 'S'); s.rect(13, 7, 13, 10, 'S'); s.rect(11, 10, 13, 10, 'S')
    s.ellipse(7, 4, 3.6, 1.4, 'W'); s.set(4, 5, 'W'); s.set(9, 3, 'W')
    return _done(s)


# Lowercase: same 5px width and baseline as the capitals (glyph row 6). Rows 0-1 are ascender space,
# x-height is rows 2-6, and row 7 holds descenders (g j p q y), so the cell is 7x10 instead of 7x9.
LOWER_GLYPHS = {
    'a': [".....", ".....", ".WWW.", "....W", ".WWWW", "W...W", ".WWWW", "....."],
    'b': ["W....", "W....", "WWWW.", "W...W", "W...W", "W...W", "WWWW.", "....."],
    'c': [".....", ".....", ".WWW.", "W....", "W....", "W...W", ".WWW.", "....."],
    'd': ["....W", "....W", ".WWWW", "W...W", "W...W", "W...W", ".WWWW", "....."],
    'e': [".....", ".....", ".WWW.", "W...W", "WWWWW", "W....", ".WWW.", "....."],
    'f': ["..WW.", ".W...", ".W...", "WWW..", ".W...", ".W...", ".W...", "....."],
    'g': [".....", ".....", ".WWWW", "W...W", "W...W", ".WWWW", "....W", ".WWW."],
    'h': ["W....", "W....", "WWWW.", "W...W", "W...W", "W...W", "W...W", "....."],
    'i': ["..W..", ".....", ".WW..", "..W..", "..W..", "..W..", ".WWW.", "....."],
    'j': ["...W.", ".....", "..WW.", "...W.", "...W.", "...W.", "W..W.", ".WW.."],
    'k': ["W....", "W....", "W..W.", "W.W..", "WW...", "W.W..", "W..W.", "....."],
    'l': [".WW..", "..W..", "..W..", "..W..", "..W..", "..W..", ".WWW.", "....."],
    'm': [".....", ".....", "WW.W.", "W.W.W", "W.W.W", "W.W.W", "W...W", "....."],
    'n': [".....", ".....", "WWWW.", "W...W", "W...W", "W...W", "W...W", "....."],
    'o': [".....", ".....", ".WWW.", "W...W", "W...W", "W...W", ".WWW.", "....."],
    'p': [".....", ".....", "WWWW.", "W...W", "W...W", "WWWW.", "W....", "W...."],
    'q': [".....", ".....", ".WWWW", "W...W", "W...W", ".WWWW", "....W", "....W"],
    'r': [".....", ".....", "W.WW.", "WW..W", "W....", "W....", "W....", "....."],
    's': [".....", ".....", ".WWWW", "W....", ".WWW.", "....W", "WWWW.", "....."],
    't': [".W...", ".W...", "WWW..", ".W...", ".W...", ".W..W", "..WW.", "....."],
    'u': [".....", ".....", "W...W", "W...W", "W...W", "W..WW", ".WW.W", "....."],
    'v': [".....", ".....", "W...W", "W...W", "W...W", ".W.W.", "..W..", "....."],
    'w': [".....", ".....", "W...W", "W...W", "W.W.W", "W.W.W", ".W.W.", "....."],
    'x': [".....", ".....", "W...W", ".W.W.", "..W..", ".W.W.", "W...W", "....."],
    'y': [".....", ".....", "W...W", "W...W", "W...W", ".WWWW", "....W", ".WWW."],
    'z': [".....", ".....", "WWWWW", "...W.", "..W..", ".W...", "WWWWW", "....."],
}


def lower(ch, color='W'):
    s = Sprite(7, 10)
    for j, r in enumerate(LOWER_GLYPHS[ch]):
        for i, c in enumerate(r):
            if c == 'W': s.set(1 + i, 1 + j, color if j < 4 else ('p' if color == 'W' else color))
    s.outline()
    return s


LOWERCASE = [(f'lower_{c}', (lambda c=c: lower(c))) for c in LOWER_GLYPHS]
LOWER_CHARS = list(LOWER_GLYPHS)
