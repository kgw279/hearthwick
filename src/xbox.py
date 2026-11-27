"""Controller button prompts (Xbox layout), 16x16, each with a normal and a pressed frame.

Drawn in the pack's own style — not copies of any official artwork.
"""
from core import Sprite

LETTERS = {          # 5x5 glyphs for face buttons
    'A': [".WWW.", "W...W", "WWWWW", "W...W", "W...W"],
    'B': ["WWWW.", "W...W", "WWWW.", "W...W", "WWWW."],
    'X': ["W...W", ".W.W.", "..W..", ".W.W.", "W...W"],
    'Y': ["W...W", ".W.W.", "..W..", "..W..", "..W.."],
}
TINY = {             # 3x5 glyphs for shoulder / stick labels
    'L': ["W..", "W..", "W..", "W..", "WWW"],
    'R': ["WW.", "W.W", "WW.", "W.W", "W.W"],
    'B': ["WW.", "W.W", "WW.", "W.W", "WW."],
    'T': ["WWW", ".W.", ".W.", ".W.", ".W."],
    'S': [".WW", "W..", ".W.", "..W", "WW."],
}
FACE_COLORS = {      # base, light, dark
    'A': ('G', 'L', 'T'),
    'B': ('R', 'P', 'b'),
    'X': ('U', 'c', 'n'),
    'Y': ('y', 'W', 'H'),
}


def _text(s, glyphs, text, x, y, color='W', gap=1):
    for ch in text:
        rows = glyphs[ch]
        for j, r in enumerate(rows):
            for i, c in enumerate(r):
                if c == 'W':
                    s.set(x + i, y + j, color)
        x += len(rows[0]) + gap


def _finish(s, pressed):
    s.outline()
    if pressed:                                         # sink 1px: drop everything, darken the top rim
        out = Sprite(16, 16)
        for y in range(15):
            out.px[y + 1] = s.px[y][:]
        return out
    return s


def face(letter, pressed=False):
    base, light, dark = FACE_COLORS[letter]
    s = Sprite(16, 16)
    s.ellipse(8, 8, 6.6, 6.6, dark)                     # rim / bottom shade
    s.ellipse(8, 7.4 if not pressed else 8, 6.2, 5.8, base)
    if not pressed:
        s.set(4, 4, light); s.set(5, 3, light); s.set(3, 5, light)
    ink = 'K' if letter == 'Y' else 'W'
    _text(s, LETTERS, letter, 6, 5 if not pressed else 6, ink)
    return _finish(s, pressed)


def bumper(side, pressed=False):
    s = Sprite(16, 16)
    s.rect(2, 4, 13, 12, 'e'); s.rect(1, 5, 14, 11, 'e')
    s.rect(2, 11, 13, 12, 'K') if not pressed else None
    s.rect(2, 4, 13, 4, 'S') if not pressed else None
    if side == 'L': s.set(1, 5, None); s.rect(2, 4, 4, 4, 'e')   # angled outer corner
    else: s.set(14, 5, None); s.rect(11, 4, 13, 4, 'e')
    _text(s, TINY, side + 'B', 4, 6 if not pressed else 7)
    return _finish(s, pressed)


def trigger(side, pressed=False):
    s = Sprite(16, 16)
    s.rect(3, 3, 12, 13, 'e'); s.ellipse(7.5, 4, 5, 2.4, 'e')
    s.rect(3, 12, 12, 13, 'K') if not pressed else None
    s.rect(4, 2, 11, 2, 'S') if not pressed else None
    _text(s, TINY, side + 'T', 4, 6 if not pressed else 7)
    return _finish(s, pressed)


def dpad(direction=None, pressed=False):
    s = Sprite(16, 16)
    s.rect(6, 2, 9, 13, 'S'); s.rect(2, 6, 13, 9, 'S'); s.rect(6, 6, 9, 9, 'd')
    s.rect(6, 2, 9, 2, 's'); s.rect(2, 6, 2, 9, 's')
    s.rect(6, 13, 9, 13, 'e'); s.rect(13, 6, 13, 9, 'e')
    arms = {'up': (6, 2, 9, 5), 'down': (6, 10, 9, 13), 'left': (2, 6, 5, 9), 'right': (10, 6, 13, 9)}
    lit = {'horizontal': ('left', 'right'), 'vertical': ('up', 'down')}.get(direction, (direction,) if direction else ())
    for a in lit:
        x0, y0, x1, y1 = arms[a]
        s.rect(x0, y0, x1, y1, 'y' if not pressed else 'r')
    for a, (x, y) in {'up': (7, 3), 'down': (7, 11), 'left': (3, 7), 'right': (11, 7)}.items():   # tiny arrow pips
        c = 'H' if a in lit else 'e'
        if a in ('up', 'down'): s.rect(x, y, x + 1, y, c)
        else: s.rect(x, y, x, y + 1, c)
    return _finish(s, pressed)


def stick(side, mode='press', pressed=False):
    s = Sprite(16, 16)
    s.ellipse(8, 8.6, 6.6, 6.2, 'd')                                     # base well
    s.ellipse(8, 7.6 if not pressed else 8.4, 5.2, 4.8, 'S')            # cap
    s.ellipse(8, 7.6 if not pressed else 8.4, 3.8, 3.4, 's')
    _text(s, TINY, side, 7, 5 if not pressed else 6, 'K')
    if mode == 'move':                                                  # four direction pips around the cap
        for x, y in ((8, 0), (8, 15), (0, 8), (15, 8)):
            s.set(x, y, 'y')
    return _finish(s, pressed)


def view_button(pressed=False):
    s = Sprite(16, 16)
    s.ellipse(8, 8, 6, 6, 'e')
    s.rect(4, 5, 9, 9, 'W'); s.rect(5, 6, 8, 8, 'e'); s.rect(7, 7, 11, 11, 'W'); s.rect(8, 8, 10, 10, 'e')
    return _finish(s, pressed)


def menu_button(pressed=False):
    s = Sprite(16, 16)
    s.ellipse(8, 8, 6, 6, 'e')
    for y in (5, 8, 11): s.rect(5, y, 11, y, 'W')
    return _finish(s, pressed)


def _pair(name, fn):
    return [(name, lambda: fn(False)), (f'{name}_pressed', lambda: fn(True))]


XBOX = (
    _pair('xb_a', lambda p: face('A', p)) + _pair('xb_b', lambda p: face('B', p)) +
    _pair('xb_x', lambda p: face('X', p)) + _pair('xb_y', lambda p: face('Y', p)) +
    _pair('xb_lb', lambda p: bumper('L', p)) + _pair('xb_rb', lambda p: bumper('R', p)) +
    _pair('xb_lt', lambda p: trigger('L', p)) + _pair('xb_rt', lambda p: trigger('R', p)) +
    _pair('xb_dpad', lambda p: dpad(None, p)) + _pair('xb_dpad_up', lambda p: dpad('up', p)) +
    _pair('xb_dpad_down', lambda p: dpad('down', p)) + _pair('xb_dpad_left', lambda p: dpad('left', p)) +
    _pair('xb_dpad_right', lambda p: dpad('right', p)) + _pair('xb_dpad_horizontal', lambda p: dpad('horizontal', p)) +
    _pair('xb_dpad_vertical', lambda p: dpad('vertical', p)) +
    _pair('xb_ls', lambda p: stick('L', 'press', p)) + _pair('xb_rs', lambda p: stick('R', 'press', p)) +
    _pair('xb_ls_move', lambda p: stick('L', 'move', p)) + _pair('xb_rs_move', lambda p: stick('R', 'move', p)) +
    _pair('xb_view', view_button) + _pair('xb_menu', menu_button)
)

DEFAULT_BINDINGS = {           # suggested mapping for Hearthwick
    'interact / harvest / talk': 'xb_a', 'back / cancel': 'xb_b', 'cook (at a station)': 'xb_x',
    'recipe book': 'xb_y', 'previous / next tab': 'xb_lb / xb_rb', 'move': 'xb_ls_move',
    'camera / cursor': 'xb_rs_move', 'quick select': 'xb_dpad', 'map': 'xb_view', 'pause menu': 'xb_menu',
    'run (hold)': 'xb_rt',
}
