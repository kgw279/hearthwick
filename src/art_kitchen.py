"""Kitchen and bar pieces.

  wash_tub            a washing-up station: a wooden stand with a basin of soapy water, a stack of
                      clean plates and a cloth
  bar_counter         the inn's bar, one tileable length: a deep plain top (room to set things on) over
                      a panelled front
  bar_counter_end_l/r the bar's ends: the same, closed off with an end post
"""
from core import Sprite
from sprites import _with_shadow
from sprites2 import _table_base


def wash_tub():
    s = Sprite()
    _table_base(s, x0=4, x1=27)
    # basin: a wooden tub sunk in the stand, full of soapy water
    s.ellipse(12, 14, 7.5, 3.6, 'b'); s.ellipse(12, 14, 6.5, 2.8, 'B')
    s.ellipse(12, 14, 5.4, 2.0, 'u'); s.ellipse(11.5, 13.6, 4.2, 1.3, 'c')
    for x, y in [(9, 13), (12, 13), (14, 14), (10, 15), (13, 15)]: s.set(x, y, 'W')       # suds
    s.set(11, 12, 'p'); s.set(15, 13, 'p')
    s.rect(4, 17, 19, 19, 'B'); s.rect(4, 17, 19, 17, 'b')                                  # tub side over the stand
    # clean plates stacked on the right, a cloth hanging off the front
    for i, y in enumerate((15, 13, 11)):
        s.ellipse(23, y, 3.6, 1.3, 's'); s.ellipse(23, y - 0.4, 2.8, 0.9, 'W')
    s.rect(18, 19, 21, 25, 'p'); s.rect(18, 19, 21, 19, 'W'); s.rect(21, 20, 21, 25, 'c')  # cloth
    s.outline()
    return _with_shadow(s, 16, 28, 12, 1.2)


TOP, FRONT, BOTTOM = 7, 18, 28   # bar counter: top surface rows TOP..FRONT-1, front panel FRONT..BOTTOM


def _bar(end=None):
    s = Sprite()
    s.rect(0, TOP, 31, FRONT - 1, 't'); s.rect(0, TOP, 31, TOP, 'k'); s.rect(0, FRONT - 1, 31, FRONT - 1, 'B')
    for y in (TOP + 3, TOP + 7): s.rect(0, y, 31, y, 'H')                                  # top boards
    s.rect(0, FRONT, 31, BOTTOM, 'B'); s.rect(0, FRONT, 31, FRONT, 'b'); s.rect(0, BOTTOM, 31, BOTTOM, 'b')
    for x0 in (2, 18):                                                                      # front panels
        s.rect(x0, FRONT + 2, x0 + 11, BOTTOM - 2, 'b'); s.rect(x0 + 1, FRONT + 3, x0 + 10, BOTTOM - 3, 'B')
        s.rect(x0 + 1, FRONT + 3, x0 + 10, FRONT + 3, 't')
    if end == 'l':
        s.rect(0, FRONT, 3, BOTTOM, 'b'); s.rect(1, FRONT, 1, BOTTOM, 'B')                  # end post
        s.rect(0, TOP, 0, FRONT - 1, 'B')
    if end == 'r':
        s.rect(28, FRONT, 31, BOTTOM, 'b'); s.rect(30, FRONT, 30, BOTTOM, 'B')
        s.rect(31, TOP, 31, FRONT - 1, 'B')
    s.outline()
    # an open side joins the next length of bar: no outline there
    for x, open_ in ((0, end != 'l'), (31, end != 'r')):
        if not open_: continue
        inner = 1 if x == 0 else 30
        for y in range(32):
            if s.px[y][x] == 'O' and TOP <= y <= BOTTOM: s.px[y][x] = s.px[y][inner]
    s.rect(0 if end != 'l' else 1, BOTTOM + 1, 31 if end != 'r' else 30, BOTTOM + 1, 'K')  # shadow
    return s


KITCHEN = [('wash_tub', wash_tub)]
BAR = [('bar_counter', _bar), ('bar_counter_end_l', lambda: _bar('l')), ('bar_counter_end_r', lambda: _bar('r'))]
