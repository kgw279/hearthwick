"""Kitchen and bar pieces.

  wash_tub            a washing-up station: a wooden stand with a basin of soapy water, a stack of
                      clean plates and a cloth
  bar_counter         the inn's bar, one tileable length: a deep plain top (room to set things on) over
                      a panelled front
  bar_counter_end_l/r the bar's ends: the same, closed off with an end post
  pantry_shelf        a free-standing open shelf of jars, crocks and loaves: where prepped food is kept
  plating_station     (64x32) a long work counter, top clear for two serving trays, with clean plates
                      and mugs stacked on the open shelf beneath
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


def pantry_shelf():
    s = Sprite()
    s.rect(4, 1, 27, 28, 'b'); s.rect(5, 2, 26, 27, 'B'); s.rect(4, 1, 27, 1, 't')
    for y0 in (3, 11, 19):                                                                  # three open shelves
        s.rect(6, y0, 25, y0 + 6, 'o')
        s.rect(6, y0 + 7, 25, y0 + 7, 't')
    # jars (lids), crocks, a loaf, bundles of herbs
    for x, c, lid in ((7, 'y', 'R'), (11, 'G', 'B'), (15, 'r', 'R'), (19, 'P', 'B'), (22, 'C', 'R')):
        s.rect(x, 6, x + 2, 9, c); s.rect(x, 5, x + 2, 5, lid); s.set(x, 7, 'W')
    s.ellipse(9.5, 15.5, 3, 2, 'H'); s.ellipse(9.5, 15, 2.4, 1.4, 't')                     # loaf
    for x in (15, 19): s.rect(x, 13, x + 2, 17, 'S'); s.rect(x, 13, x + 2, 13, 's')         # crocks
    s.rect(22, 13, 24, 17, 'g'); s.set(23, 12, 'G')                                         # herbs
    for x, c in ((8, 'k'), (12, 'W'), (16, 'k'), (20, 'W')):                               # cheese rounds, eggs
        s.ellipse(x + 1, 24, 1.8, 1.6, c)
    s.outline()
    return _with_shadow(s, 16, 29, 12, 1.0)


def plating_station():
    s = Sprite(64, 32)
    s.rect(1, 6, 62, 13, 'k'); s.rect(1, 6, 62, 6, 'W'); s.rect(1, 13, 62, 13, 't')         # a pale scrubbed top
    for x in range(6, 62, 9): s.rect(x, 7, x, 12, 't')                                       # its boards
    s.rect(1, 14, 62, 28, 'B'); s.rect(1, 14, 62, 14, 'b'); s.rect(1, 28, 62, 28, 'b')       # the body
    s.rect(4, 16, 59, 26, 'o')                                                              # an open shelf
    s.rect(4, 21, 59, 21, 't')
    for i in range(4):                                                                      # stacks of plates
        x = 7 + i * 7
        for k, y in enumerate((19, 18, 17)): s.ellipse(x + 2, y, 2.8, 0.9, 'W' if k % 2 else 's')
    for x in (37, 43, 49, 55):                                                              # mugs
        s.rect(x, 17, x + 3, 20, 'B'); s.rect(x, 17, x, 20, 't'); s.rect(x + 4, 18, x + 4, 19, 'B')
    for x in (8, 18, 28, 38, 48):                                                           # bowls below
        s.rect(x, 24, x + 5, 25, 'H'); s.rect(x + 1, 23, x + 4, 23, 't')
    s.rect(1, 6, 2, 28, 'b'); s.rect(61, 6, 62, 28, 'b')                                    # end posts
    s.outline()
    s.rect(2, 29, 61, 29, 'K')                                                              # shadow
    return s


KITCHEN = [('wash_tub', wash_tub), ('pantry_shelf', pantry_shelf)]
PLATING = [('plating_station', plating_station)]
BAR = [('bar_counter', _bar), ('bar_counter_end_l', lambda: _bar('l')), ('bar_counter_end_r', lambda: _bar('r'))]
