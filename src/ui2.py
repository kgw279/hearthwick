"""UI kit, part 2: the common widgets a game UI ends up needing.

  FRAMES2   9-slice pieces: tabs, text fields, dropdown, tooltip, toast, ribbon banner, slider & scroll tracks,
            card, divider, portrait frame
  CONTROLS  16x16: checkbox, radio, toggle, slider knob, scroll thumb/arrows, dropdown arrow, steppers,
            close button, badge, text caret, mouse cursors
  ICONS2    16x16 system icons: save, trash, info, search, home, back, refresh, sound, music, play/pause,
            fullscreen, gamepad, keyboard, calendar, seasons, quest, trophy, gift, mail, half heart/star
  KEYS      keyboard & mouse prompts, 16x16 (and 32x16 for wide keys), each with a _pressed variant
  LOADING   spinner (8 frames) and a timer ring (9 steps, empty to full)

Same palette, outline and style as ui.py; designed at 1x for integer scaling.
"""
import math
from core import Sprite
from ui import _frame, _icon, _done, LETTER_GLYPHS, LOWER_GLYPHS, LETTER_NAMES, GLYPHS as DIGIT_GLYPHS

# =====================================================================
# 9-slice frames (name, builder, slice) - slice = one border or (l, t, r, b)
# =====================================================================


def tab(active):
    s = Sprite(24, 16)
    fill, hi = ('k', 'W') if active else ('t', 'k')
    s.rect(1, 0, 22, 15, 'O'); s.rect(0, 1, 23, 15, 'O')
    s.rect(1, 1, 22, 15, fill); s.rect(1, 1, 22, 1, hi); s.rect(1, 1, 1, 15, hi)
    if not active: s.rect(0, 15, 23, 15, 'O'); s.rect(1, 13, 22, 14, 'B')
    s.set(0, 0, None); s.set(23, 0, None)
    return s


def text_field(focus=False):
    s = Sprite(24, 16)
    s.rect(0, 0, 23, 15, 'U' if focus else 'O')
    s.rect(1, 1, 22, 14, 'W'); s.rect(1, 1, 22, 2, 's'); s.rect(1, 1, 1, 14, 's')
    if focus: s.rect(0, 0, 23, 0, 'c'); s.rect(0, 15, 23, 15, 'c')
    return s


def dropdown_field():
    s = text_field()
    s.rect(15, 1, 15, 14, 's')
    for i, w in enumerate((3, 2, 1, 0)):
        s.rect(19 - w, 6 + i, 19 + w, 6 + i, 'B')
    return s


def tooltip():
    s = _frame(16, 16, 'O', 'K', 'n', 'K')
    s.rect(1, 1, 14, 1, 'n')
    return s


def toast():
    """Notification card: parchment with a coloured accent strip on the left."""
    s = _frame(24, 24, 'O', 'k', 'W', 't')
    s.rect(2, 2, 4, 21, 'G'); s.rect(2, 2, 2, 21, 'L')
    return s


def ribbon():
    """Title banner with folded ribbon ends; slice (10, 4, 10, 6), centre repeats."""
    s = Sprite(32, 16)
    s.rect(6, 1, 25, 12, 'O'); s.rect(7, 2, 24, 11, 'R'); s.rect(7, 2, 24, 3, 'P'); s.rect(7, 10, 24, 11, 'b')
    for side in (0, 1):                                   # tails
        x0 = 0 if side == 0 else 25
        s.rect(x0, 5, x0 + 6, 14, 'O'); s.rect(x0 + 1, 6, x0 + 5, 13, 'R'); s.rect(x0 + 1, 6, x0 + 5, 6, 'b')
        notch_x = x0 + (0 if side == 0 else 6)
        s.set(notch_x, 10, None); s.set(notch_x + (1 if side == 0 else -1), 10, 'O')
        s.set(x0 + (5 if side == 0 else 1), 12, 'b'); s.set(x0 + (5 if side == 0 else 1), 13, 'b')
    return s


def slider_track():
    s = Sprite(24, 8)
    s.rect(0, 2, 23, 5, 'O'); s.rect(1, 3, 22, 4, 'B'); s.rect(1, 3, 22, 3, 'b')
    s.set(0, 2, None); s.set(23, 2, None); s.set(0, 5, None); s.set(23, 5, None)
    return s


def slider_fill():
    s = Sprite(24, 8)
    s.rect(1, 3, 22, 4, 'y'); s.rect(1, 4, 22, 4, 'H')
    return s


def scroll_track():
    s = Sprite(8, 24)
    s.rect(1, 0, 6, 23, 'O'); s.rect(2, 1, 5, 22, 'B'); s.rect(2, 1, 2, 22, 'b')
    return s


def card():
    """Recipe / item card: parchment with a double rule under a header strip."""
    s = _frame(24, 24, 'O', 'k', 'W', 't')
    s.rect(2, 2, 21, 6, 't'); s.rect(2, 7, 21, 7, 'B'); s.rect(2, 9, 21, 9, 'B')
    return s


def divider():
    s = Sprite(24, 4)
    s.rect(0, 1, 23, 1, 'B'); s.rect(0, 2, 23, 2, 'k')
    return s


def portrait_frame():
    """Ornate 40x40 frame for dialogue portraits (not 9-slice; 32x32 opening at (4, 4))."""
    s = Sprite(40, 40)
    s.rect(0, 0, 39, 39, 'O'); s.rect(1, 1, 38, 38, 'H'); s.rect(1, 1, 38, 1, 'y'); s.rect(1, 1, 1, 38, 'y')
    s.rect(2, 2, 37, 37, 'B'); s.rect(3, 3, 36, 36, 'O'); s.rect(4, 4, 35, 35, None)
    for x, y in ((1, 1), (38, 1), (1, 38), (38, 38)):
        s.set(x, y, 'W')
    for x, y in ((19, 1), (20, 1), (1, 19), (1, 20), (38, 19), (38, 20), (19, 38), (20, 38)): s.set(x, y, 'y')
    return s


FRAMES2 = [
    ('tab_active', lambda: tab(True), (4, 4, 4, 1)), ('tab_inactive', lambda: tab(False), (4, 4, 4, 3)),
    ('text_field', text_field, 3), ('text_field_focus', lambda: text_field(True), 3),
    ('dropdown_field', dropdown_field, (3, 3, 10, 3)), ('tooltip', tooltip, 4), ('toast', toast, (6, 4, 4, 4)),
    ('ribbon_banner', ribbon, (10, 4, 10, 6)), ('slider_track', slider_track, (3, 0, 3, 0)),
    ('slider_fill', slider_fill, (1, 0, 1, 0)), ('scroll_track', scroll_track, (0, 3, 0, 3)),
    ('card', card, (4, 10, 4, 4)), ('divider', divider, (0, 0, 0, 0)),
]
PORTRAIT = [('portrait_frame', portrait_frame)]


# =====================================================================
# 16x16 controls
# =====================================================================

def checkbox(state):
    s = _icon()
    s.rect(2, 2, 13, 13, 'O'); s.rect(3, 3, 12, 12, 'W' if state != 'disabled' else 's'); s.rect(3, 3, 12, 4, 's' if state != 'disabled' else 'S')
    if state == 'on':
        for x, y in ((4, 8), (5, 9), (6, 10), (7, 9), (8, 8), (9, 7), (10, 6), (11, 5)):
            s.set(x, y, 'G'); s.set(x, y + 1, 'g')
    return s


def radio(on):
    s = _icon()
    s.ellipse(7.5, 7.5, 6, 6, 'O'); s.ellipse(7.5, 7.5, 5, 5, 'W'); s.ellipse(7.5, 6.5, 4, 2, 's')
    s.ellipse(7.5, 7.5, 4, 4, 'W')
    if on: s.ellipse(7.5, 7.5, 2.4, 2.4, 'G'); s.set(7, 6, 'L')
    return s


def toggle(on):
    s = _icon()
    s.rect(1, 4, 14, 11, 'O'); s.rect(2, 5, 13, 10, 'G' if on else 'S'); s.rect(2, 5, 13, 5, 'g' if on else 'd')
    kx = 10 if on else 5
    s.ellipse(kx, 7.5, 3.4, 3.4, 'O'); s.ellipse(kx, 7.5, 2.4, 2.4, 'W'); s.set(kx - 1, 6, 'W'); s.rect(kx - 1, 9, kx + 1, 9, 's')
    return s


def slider_knob(pressed=False):
    s = _icon()
    s.ellipse(7.5, 7.5, 5, 5, 'O'); s.ellipse(7.5, 7.5, 4, 4, 'k' if not pressed else 't')
    s.ellipse(6.5, 6.5, 2, 1.6, 'W' if not pressed else 'k'); s.rect(5, 10, 10, 10, 't' if not pressed else 'B')
    return s


def scroll_thumb():
    s = _icon()
    s.rect(4, 1, 11, 14, 'O'); s.rect(5, 2, 10, 13, 't'); s.rect(5, 2, 5, 13, 'k'); s.rect(10, 2, 10, 13, 'B')
    for y in (6, 8, 10): s.rect(6, y, 9, y, 'B')
    return s


def small_button(glyph, body='t', top='k', shade='B'):
    s = _icon()
    s.rect(1, 1, 14, 14, 'O'); s.rect(2, 2, 13, 13, body); s.rect(2, 2, 13, 3, top); s.rect(2, 11, 13, 13, shade)
    for x, y in glyph: s.set(x, y, 'O')
    return s


ARROW_UP = [(7, 5), (8, 5), (6, 6), (7, 6), (8, 6), (9, 6), (5, 7), (6, 7), (9, 7), (10, 7), (4, 8), (5, 8), (10, 8), (11, 8)]
ARROW_DOWN = [(x, 13 - y) for x, y in ARROW_UP]
PLUS = [(7, y) for y in range(4, 11)] + [(8, y) for y in range(4, 11)] + [(x, 7) for x in range(4, 12)] + [(x, 6) for x in range(4, 12)]
MINUS = [(x, 7) for x in range(4, 12)] + [(x, 6) for x in range(4, 12)]
CROSS = [(4 + i, 4 + i) for i in range(7)] + [(5 + i, 4 + i) for i in range(6)] + [(10 - i, 4 + i) for i in range(7)] + [(11 - i, 4 + i) for i in range(7)]


def close_button():
    return small_button(CROSS, 'R', 'P', 'b')


def badge(empty=False):
    s = _icon()
    s.ellipse(7.5, 7.5, 5.4, 5.4, 'O'); s.ellipse(7.5, 7.5, 4.4, 4.4, 'R'); s.ellipse(6.5, 5.5, 2, 1.2, 'P')
    if not empty:
        for x, y in ((7, 4), (8, 4), (7, 5), (8, 5), (7, 6), (8, 6), (7, 7), (8, 7), (7, 10), (8, 10)): s.set(x, y, 'W')
    return s


def caret():
    s = _icon()
    s.rect(7, 2, 8, 13, 'K'); s.rect(6, 2, 9, 2, 'K'); s.rect(6, 13, 9, 13, 'K')
    return s


def cursor_arrow():
    rows = ["O...........",
            "OO..........",
            "OWO.........",
            "OWWO........",
            "OWWWO.......",
            "OWWWWO......",
            "OWWWWWO.....",
            "OWWWWWWO....",
            "OWWWWWWWO...",
            "OWWWWOOOOO..",
            "OWWOWO......",
            "OWO.OWO.....",
            "OO..OWO.....",
            "O....OWO....",
            ".....OOO...."]
    s = _icon()
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != '.': s.set(x + 1, y, c)
    return s


def cursor_hand(grab=False):
    s = _icon()
    if not grab:
        s.rect(5, 1, 6, 7, 'W'); s.rect(4, 1, 4, 7, 'O'); s.rect(7, 1, 7, 6, 'O'); s.rect(5, 0, 6, 0, 'O')   # pointing finger
        s.rect(4, 7, 11, 12, 'W'); s.rect(7, 6, 11, 6, 'O'); s.set(9, 7, 'O'); s.set(11, 7, 'O')
    else:
        s.rect(4, 5, 11, 12, 'W'); s.rect(4, 4, 11, 4, 'O')
        for x in (6, 8, 10): s.set(x, 5, 'O')
    s.rect(3, 7, 3, 12, 'O'); s.rect(12, 6, 12, 12, 'O'); s.rect(4, 13, 11, 13, 'O'); s.rect(4, 12, 11, 12, 's')
    s.rect(2, 8, 2, 10, 'O'); s.set(3, 8, 'W')
    return s


def cursor_text():
    s = _icon()
    s.rect(7, 2, 8, 13, 'W'); s.rect(5, 1, 6, 1, 'W'); s.rect(9, 1, 10, 1, 'W'); s.rect(5, 14, 6, 14, 'W'); s.rect(9, 14, 10, 14, 'W')
    return _done(s)


def cursor_busy():
    s = _icon()
    s.rect(4, 1, 11, 2, 'B'); s.rect(4, 13, 11, 14, 'B')
    for i in range(5):
        s.rect(5 + i // 1 // 2, 3 + i, 10 - i // 2, 3 + i, 'p'); s.rect(5 + i // 2, 12 - i, 10 - i // 2, 12 - i, 'p')
    s.rect(7, 7, 8, 8, 'y'); s.rect(6, 10, 9, 12, 'y')
    return _done(s)


CONTROLS = [
    ('checkbox_off', lambda: checkbox('off')), ('checkbox_on', lambda: checkbox('on')), ('checkbox_disabled', lambda: checkbox('disabled')),
    ('radio_off', lambda: radio(False)), ('radio_on', lambda: radio(True)),
    ('toggle_off', lambda: toggle(False)), ('toggle_on', lambda: toggle(True)),
    ('slider_knob', slider_knob), ('slider_knob_pressed', lambda: slider_knob(True)), ('scroll_thumb', scroll_thumb),
    ('scroll_up', lambda: small_button(ARROW_UP)), ('scroll_down', lambda: small_button(ARROW_DOWN)),
    ('dropdown_button', lambda: small_button(ARROW_DOWN)),
    ('stepper_plus', lambda: small_button(PLUS)), ('stepper_minus', lambda: small_button(MINUS)),
    ('close_button', close_button), ('badge', badge), ('badge_empty', lambda: badge(True)), ('text_caret', caret),
    ('cursor_arrow', cursor_arrow), ('cursor_hand', cursor_hand), ('cursor_grab', lambda: cursor_hand(True)),
    ('cursor_text', cursor_text), ('cursor_busy', cursor_busy),
]
CURSOR_HOTSPOTS = {'cursor_arrow': [1, 0], 'cursor_hand': [5, 0], 'cursor_grab': [7, 6], 'cursor_text': [7, 7], 'cursor_busy': [7, 7]}


# =====================================================================
# 16x16 system icons
# =====================================================================

def i_save():
    s = _icon(); s.rect(2, 2, 13, 13, 'u'); s.rect(4, 2, 11, 6, 's'); s.rect(9, 3, 10, 5, 'u'); s.rect(4, 9, 11, 13, 'W')
    s.rect(5, 10, 10, 10, 's'); s.rect(5, 12, 10, 12, 's'); return _done(s)


def i_trash():
    s = _icon(); s.rect(3, 4, 12, 4, 'S'); s.rect(6, 2, 9, 3, 'S'); s.rect(4, 5, 11, 14, 's'); s.rect(4, 5, 4, 14, 'W')
    for x in (6, 8, 10): s.rect(x, 7, x, 12, 'S')
    return _done(s)


def i_info():
    s = _icon(); s.ellipse(7.5, 7.5, 6, 6, 'U'); s.ellipse(6.5, 5.5, 2.4, 1.4, 'c'); s.rect(7, 4, 8, 5, 'W'); s.rect(7, 7, 8, 11, 'W'); s.rect(6, 11, 9, 11, 'W')
    return _done(s)


def i_search():
    s = _icon(); s.ellipse(6, 6, 4.4, 4.4, 'S'); s.ellipse(6, 6, 3, 3, 'p'); s.set(5, 4, 'W')
    for i in range(4): s.rect(9 + i, 10 + i, 10 + i, 10 + i, 'B')
    return _done(s)


def i_home():
    s = _icon()
    for i in range(6): s.rect(7 - i, 2 + i, 8 + i, 2 + i, 'R')
    s.rect(3, 8, 12, 14, 'k'); s.rect(3, 8, 12, 8, 't'); s.rect(7, 10, 9, 14, 'B'); s.rect(4, 10, 5, 11, 'c'); return _done(s)


def i_back():
    s = _icon()
    s.rect(5, 6, 10, 7, 'k'); s.rect(10, 7, 12, 11, 'k'); s.rect(7, 11, 11, 12, 'k')
    for i in range(4): s.rect(5 - i, 6 - i + i, 5 - i, 7 + i - i, 'k')
    s.set(4, 5, 'k'); s.set(4, 8, 'k'); s.set(3, 6, 'k'); s.set(3, 7, 'k'); s.set(5, 4, 'k'); s.set(5, 9, 'k')
    return _done(s)


def i_refresh():
    s = _icon()
    for a in range(30, 330, 12):
        r = math.radians(a); s.set(round(7.5 + 5 * math.cos(r)), round(7.5 - 5 * math.sin(r)), 'G')
        s.set(round(7.5 + 4 * math.cos(r)), round(7.5 - 4 * math.sin(r)), 'G')
    s.rect(11, 2, 13, 2, 'G'); s.rect(13, 2, 13, 5, 'G'); s.set(12, 3, 'G')
    return _done(s)


def _speaker(s):
    s.rect(2, 6, 4, 9, 'S'); s.rect(5, 5, 5, 10, 'S'); s.rect(6, 4, 6, 11, 'S'); s.rect(7, 3, 7, 12, 'S'); s.set(3, 6, 's')


def i_sound(on):
    s = _icon(); _speaker(s)
    if on:
        for y in range(6, 10): s.set(9, y, 'W')
        for y in range(4, 12): s.set(11, y, 'W')
        s.set(10, 5, 'W'); s.set(10, 10, 'W'); s.set(12, 5, 'W'); s.set(12, 10, 'W')
    else:
        for i in range(5): s.set(9 + i, 5 + i, 'R'); s.set(13 - i, 5 + i, 'R')
    return _done(s)


def i_music(on):
    s = _icon(); s.rect(5, 3, 5, 11, 'v'); s.rect(11, 2, 11, 10, 'v'); s.rect(5, 3, 11, 4, 'v'); s.rect(5, 2, 11, 2, 'v')
    s.ellipse(4, 12, 2, 1.6, 'v'); s.ellipse(10, 11, 2, 1.6, 'v')
    if not on:
        for i in range(12): s.set(2 + i, 2 + i, 'R')
    return _done(s)


def i_play():
    s = _icon()
    for i in range(6): s.rect(5, 2 + i, 5 + i * 1, 2 + i, 'G'); s.rect(5, 13 - i, 5 + i, 13 - i, 'G')
    s.rect(5, 2, 5, 13, 'L'); return _done(s)


def i_pause():
    s = _icon(); s.rect(4, 3, 6, 12, 'k'); s.rect(9, 3, 11, 12, 'k'); s.rect(4, 3, 4, 12, 'W'); s.rect(9, 3, 9, 12, 'W'); return _done(s)


def i_fullscreen():
    s = _icon()
    for x0, y0, dx, dy in ((2, 2, 1, 1), (13, 2, -1, 1), (2, 13, 1, -1), (13, 13, -1, -1)):
        s.rect(min(x0, x0 + 3 * dx), y0, max(x0, x0 + 3 * dx), y0, 'W'); s.rect(x0, min(y0, y0 + 3 * dy), x0, max(y0, y0 + 3 * dy), 'W')
    return _done(s)


def i_gamepad():
    s = _icon(); s.rect(2, 5, 13, 10, 'S'); s.rect(1, 7, 14, 11, 'S'); s.rect(2, 11, 4, 12, 'S'); s.rect(11, 11, 13, 12, 'S')
    s.rect(3, 7, 5, 7, 'K'); s.rect(4, 6, 4, 8, 'K'); s.set(11, 6, 'G'); s.set(12, 7, 'R'); s.set(10, 7, 'U'); s.set(11, 8, 'y'); s.rect(2, 5, 13, 5, 's')
    return _done(s)


def i_keyboard():
    s = _icon(); s.rect(1, 4, 14, 11, 'S'); s.rect(1, 4, 14, 4, 's')
    for y in (6, 8):
        for x in range(2, 14, 2): s.set(x, y, 'W')
    s.rect(4, 10, 11, 10, 'W'); return _done(s)


def i_calendar():
    s = _icon(); s.rect(2, 3, 13, 13, 'W'); s.rect(2, 3, 13, 5, 'R'); s.set(5, 2, 'S'); s.set(10, 2, 'S')
    for y in (7, 9, 11):
        for x in (4, 6, 8, 10): s.set(x, y, 'S')
    s.set(12, 11, 'R'); return _done(s)


def i_season(which):
    s = _icon()
    if which == 'spring':
        for dx, dy in ((0, -3), (3, 0), (0, 3), (-3, 0)): s.ellipse(7.5 + dx, 7.5 + dy, 2.2, 2.2, 'm')
        s.ellipse(7.5, 7.5, 1.6, 1.6, 'y'); s.rect(7, 12, 8, 14, 'G')
    elif which == 'summer':
        s.ellipse(7.5, 7.5, 3.4, 3.4, 'y'); s.set(7, 6, 'W')
        for a in range(0, 360, 45):
            r = math.radians(a); s.set(round(7.5 + 5.6 * math.cos(r)), round(7.5 + 5.6 * math.sin(r)), 'r')
    elif which == 'autumn':
        for i in range(6): s.rect(7 - i // 2, 2 + i, 8 + i // 2 + (1 if i > 2 else 0), 2 + i, 'r')
        for i in range(5): s.rect(5 + i // 2, 8 + i, 10 - i // 2, 8 + i, 'r')
        s.rect(7, 4, 7, 14, 'B'); s.set(5, 6, 'H'); s.set(10, 9, 'H')
    else:
        for i in range(-5, 6):
            s.set(7 + i, 7, 'p'); s.set(7, 7 + i, 'p'); s.set(7 + i, 7 + i, 'W') if abs(i) < 4 else None; s.set(7 + i, 7 - i, 'W') if abs(i) < 4 else None
    return _done(s)


def i_quest():
    s = _icon(); s.rect(3, 3, 12, 12, 'k'); s.rect(2, 2, 13, 3, 't'); s.rect(2, 12, 13, 13, 't')
    for y in (5, 7, 9): s.rect(5, y, 10, y, 'B')
    s.set(2, 1, 'B'); s.set(13, 14, 'B'); return _done(s)


def i_trophy():
    s = _icon(); s.rect(4, 2, 11, 7, 'y'); s.rect(5, 8, 10, 8, 'y'); s.rect(7, 9, 8, 11, 'H'); s.rect(5, 12, 10, 13, 'B')
    s.rect(2, 3, 3, 5, 'H'); s.rect(12, 3, 13, 5, 'H'); s.rect(5, 3, 5, 6, 'W'); return _done(s)


def i_gift():
    s = _icon(); s.rect(2, 6, 13, 13, 'R'); s.rect(2, 5, 13, 7, 'P'); s.rect(7, 5, 8, 13, 'y')
    s.rect(4, 3, 6, 4, 'y'); s.rect(9, 3, 11, 4, 'y'); s.rect(2, 6, 2, 13, 'P'); return _done(s)


def i_mail():
    s = _icon(); s.rect(2, 4, 13, 12, 'W'); s.rect(2, 12, 13, 12, 's')
    for i in range(6): s.set(2 + i, 4 + i // 1 if i < 5 else 9, 's'); s.set(13 - i, 4 + i if i < 5 else 9, 's')
    s.ellipse(7.5, 9, 1.4, 1.2, 'R'); return _done(s)


def i_half(kind):
    from ui import ICONS
    full = dict(ICONS)[kind]()
    empty = dict(ICONS)[kind + '_empty']()
    s = empty.copy()
    for y in range(16):
        for x in range(8):
            c = full.get(x, y)
            if c: s.set(x, y, c)
    return s


ICONS2 = [
    ('save', i_save), ('trash', i_trash), ('info', i_info), ('search', i_search), ('home', i_home), ('back', i_back),
    ('refresh', i_refresh), ('sound_on', lambda: i_sound(True)), ('sound_off', lambda: i_sound(False)),
    ('music_on', lambda: i_music(True)), ('music_off', lambda: i_music(False)), ('play', i_play), ('pause', i_pause),
    ('fullscreen', i_fullscreen), ('gamepad', i_gamepad), ('keyboard', i_keyboard), ('calendar', i_calendar),
    ('season_spring', lambda: i_season('spring')), ('season_summer', lambda: i_season('summer')),
    ('season_autumn', lambda: i_season('autumn')), ('season_winter', lambda: i_season('winter')),
    ('quest', i_quest), ('trophy', i_trophy), ('gift', i_gift), ('mail', i_mail),
    ('heart_half', lambda: i_half('heart')), ('star_half', lambda: i_half('star')),
]


# =====================================================================
# keyboard & mouse prompts
# =====================================================================

def _keycap(w, pressed):
    s = Sprite(w, 16)
    off = 1 if pressed else 0
    s.rect(1, off, w - 2, 15, 'O'); s.rect(0, 1 + off, w - 1, 14, 'O')
    s.rect(1, 1 + off, w - 2, 14, 'W' if not pressed else 's'); s.rect(1, 1 + off, w - 2, 1 + off, 'W')
    if not pressed: s.rect(1, 12, w - 2, 14, 's'); s.rect(1, 14, w - 2, 14, 'S')
    else: s.rect(1, 14, w - 2, 14, 'S')
    return s, off


def _stamp_glyph(s, rows, x0, y0, col='O'):
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            if c == 'W': s.set(x0 + i, y0 + j, col)


def key(label, pressed=False):
    """A key with a 1-character label (letter or digit) or a short label drawn in tiny caps."""
    if len(label) == 1:
        s, off = _keycap(16, pressed)
        rows = LETTER_GLYPHS.get(label) or DIGIT_GLYPHS.get(label)
        _stamp_glyph(s, rows, 5, 3 + off)
        return s
    w = 32
    s, off = _keycap(w, pressed)
    x = (w - (len(label) * 4 - 1)) // 2
    for ch in label:
        for j, r in enumerate(TINY[ch]):
            for i, c in enumerate(r):
                if c == '#': s.set(x + i, 5 + j + off, 'O')
        x += 4
    return s


def arrow_key(direction, pressed=False):
    s, off = _keycap(16, pressed)
    pts = {'up': ARROW_UP, 'down': ARROW_DOWN}.get(direction)
    if pts is None:
        pts = [(y, x) for x, y in (ARROW_UP if direction == 'left' else ARROW_DOWN)]
    for x, y in pts: s.set(x, y - 1 + off, 'O')
    return s


def mouse(button, pressed=False):
    s = _icon()
    s.ellipse(7.5, 9, 5, 6, 'O'); s.ellipse(7.5, 9, 4, 5, 'W'); s.rect(4, 4, 11, 8, 'W'); s.rect(3, 5, 3, 12, 'O'); s.rect(12, 5, 12, 12, 'O')
    s.rect(4, 3, 11, 3, 'O'); s.rect(7, 4, 8, 8, 's'); s.rect(4, 8, 11, 8, 's')
    hl = 'y' if not pressed else 'H'
    if button == 'left': s.rect(4, 4, 6, 7, hl)
    elif button == 'right': s.rect(9, 4, 11, 7, hl)
    elif button == 'middle': s.rect(7, 4, 8, 6, hl)
    elif button == 'scroll':
        s.rect(7, 4, 8, 6, hl); s.set(7, 1, 'O'); s.set(8, 1, 'O'); s.set(6, 2, 'O'); s.set(9, 2, 'O')
        s.set(6, 15, 'O'); s.set(9, 15, 'O')
    return s


# 3x5 tiny caps for wide key labels
TINY = {
    'S': ["###", "#..", "###", "..#", "###"], 'P': ["###", "#.#", "###", "#..", "#.."], 'A': ["###", "#.#", "###", "#.#", "#.#"],
    'C': ["###", "#..", "#..", "#..", "###"], 'E': ["###", "#..", "##.", "#..", "###"], 'H': ["#.#", "#.#", "###", "#.#", "#.#"],
    'I': ["###", ".#.", ".#.", ".#.", "###"], 'F': ["###", "#..", "##.", "#..", "#.."], 'T': ["###", ".#.", ".#.", ".#.", ".#."],
    'N': ["##.", "#.#", "#.#", "#.#", "#.#"], 'R': ["##.", "#.#", "##.", "#.#", "#.#"], 'B': ["##.", "#.#", "##.", "#.#", "##."],
    'L': ["#..", "#..", "#..", "#..", "###"], 'K': ["#.#", "#.#", "##.", "#.#", "#.#"], 'D': ["##.", "#.#", "#.#", "#.#", "##."],
}
WIDE_KEYS = {'space': 'SPACE', 'shift': 'SHIFT', 'enter': 'ENTER', 'tab': 'TAB', 'esc': 'ESC', 'ctrl': 'CTRL', 'alt': 'ALT', 'back': 'BKSP'}
TINY.update({'O': ["###", "#.#", "#.#", "#.#", "###"]})

SMALL_KEYS = list('WASDEFQRIMCZX') + list('123456789')
KEYS = ([(f'key_{c.lower()}', (lambda c=c: key(c))) for c in SMALL_KEYS]
        + [(f'key_{d}', (lambda d=d: arrow_key(d))) for d in ('up', 'down', 'left', 'right')]
        + [(f'mouse_{b}', (lambda b=b: mouse(b))) for b in ('left', 'right', 'middle', 'scroll', 'none')])
KEYS = KEYS + [(n + '_pressed', (lambda n=n: _pressed_of(n))) for n, _ in KEYS]
KEYS_WIDE = [(f'key_{k}', (lambda v=v: key(v))) for k, v in WIDE_KEYS.items()]
KEYS_WIDE = KEYS_WIDE + [(f'key_{k}_pressed', (lambda v=v: key(v, True))) for k, v in WIDE_KEYS.items()]


def _pressed_of(name):
    kind, val = name.split('_', 1)
    if kind == 'mouse': return mouse(val, True)
    if val in ('up', 'down', 'left', 'right'): return arrow_key(val, True)
    return key(val.upper(), True)


DEFAULT_KEY_BINDINGS = {'interact': 'key_e', 'back': 'key_esc', 'cook': 'key_f', 'recipes': 'key_r', 'inventory': 'key_i',
                        'map': 'key_m', 'move': ['key_w', 'key_a', 'key_s', 'key_d'], 'menu': 'key_esc',
                        'tabs': ['key_q', 'key_e'], 'click': 'mouse_left'}


# =====================================================================
# loading spinner & timer ring
# =====================================================================

def spinner(frame):
    s = _icon()
    for i in range(8):
        a = math.radians(90 - i * 45)
        x, y = 7.5 + 5 * math.cos(a), 7.5 - 5 * math.sin(a)
        age = (frame - i) % 8
        col = 'W' if age == 0 else 'y' if age == 1 else 'H' if age == 2 else 'B'
        s.ellipse(x, y, 1.3 if age < 2 else 1, 1.3 if age < 2 else 1, col)
    return s


def timer_ring(step):
    """step 0..8: ring fills clockwise from 12 o'clock."""
    s = _icon()
    s.ellipse(7.5, 7.5, 6.6, 6.6, 'O'); s.ellipse(7.5, 7.5, 5.6, 5.6, 'b'); s.ellipse(7.5, 7.5, 3.4, 3.4, 'O'); s.ellipse(7.5, 7.5, 2.6, 2.6, 'k')
    for y in range(16):
        for x in range(16):
            dx, dy = x + 0.5 - 8, y + 0.5 - 8
            d = math.hypot(dx, dy)
            if 3.6 < d < 6.2:
                ang = (math.degrees(math.atan2(dx, -dy)) + 360) % 360
                if ang < step * 45: s.set(x, y, 'G' if d < 5 else 'L')
    return s


LOADING = [(f'spinner_f{i}', (lambda i=i: spinner(i))) for i in range(8)] + [(f'timer_ring_{i}', (lambda i=i: timer_ring(i))) for i in range(9)]


# =====================================================================
# ink font: every glyph in dark brown with no outline, for text on parchment and other light panels
# =====================================================================
DIGIT_NAMES = {'+': 'plus', '-': 'minus', 'x': 'times', '/': 'slash', ':': 'colon', '%': 'percent', '.': 'dot'}


def ink(ch, color='b'):
    rows = LOWER_GLYPHS.get(ch) or LETTER_GLYPHS.get(ch) or DIGIT_GLYPHS[ch]
    s = Sprite(7, 10)
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            if c == 'W': s.set(1 + i, 1 + j, color)
    return s


def _ink_name(ch):
    if ch in LOWER_GLYPHS: return f'ink_lower_{ch}'
    if ch in LETTER_GLYPHS: return f'ink_{LETTER_NAMES.get(ch, ch)}'
    return f'ink_digit_{DIGIT_NAMES.get(ch, ch)}'


INK_CHARS = [c for c in DIGIT_GLYPHS] + [c for c in LETTER_GLYPHS] + [c for c in LOWER_GLYPHS]
INK = [(_ink_name(c), (lambda c=c: ink(c))) for c in INK_CHARS]
INK_MAP = {c: _ink_name(c) for c in INK_CHARS}
