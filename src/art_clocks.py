"""Clocks and plaques for the inn (furniture sheet): there's no clock on the screen, so the time is read off
a clock in the inn; a brass plaque by each guest room's door carries the room's name."""
from core import Sprite
from sprites import _with_shadow


def _face(s, cx, cy, r):
    s.ellipse(cx, cy, r, r, 'b'); s.ellipse(cx, cy, r - 1, r - 1, 'k'); s.ellipse(cx, cy, r - 2, r - 2, 'W')
    for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):                     # the hours, at the quarters
        s.set(round(cx + dx * (r - 2)), round(cy + dy * (r - 2)), 'O')
    s.rect(cx, cy - (r - 3), cx, cy, 'K'); s.rect(cx, cy, cx + r - 4, cy, 'K')   # hands
    s.set(cx, cy, 'R')


def wall_clock():
    """A round clock to hang on a wall."""
    s = Sprite()
    s.rect(15, 3, 16, 5, 'e')                                              # hook
    _face(s, 16, 12, 7)
    s.outline()
    return s


def standing_clock():
    """A tall case clock, with its pendulum behind glass."""
    s = Sprite()
    s.rect(10, 1, 21, 27, 'b'); s.rect(9, 1, 22, 2, 'B'); s.rect(9, 27, 22, 28, 'B')
    s.rect(11, 3, 20, 26, 'B'); s.rect(11, 3, 20, 3, 't')
    _face(s, 16, 8, 5)
    s.rect(13, 15, 18, 25, 'D'); s.rect(13, 15, 18, 15, 'u')               # the glass
    s.rect(16, 15, 16, 21, 'H'); s.ellipse(16, 22, 1.6, 1.6, 'y')          # pendulum
    s.outline()
    return _with_shadow(s, 16, 29, 8, 1.0)


def room_plaque():
    """A small brass plaque for a door's side: the room's name is written on it."""
    s = Sprite()
    s.rect(11, 8, 20, 14, 'H'); s.rect(11, 8, 20, 8, 'y'); s.rect(11, 14, 20, 14, 'b')
    s.rect(13, 10, 18, 10, 'b'); s.rect(13, 12, 17, 12, 'b')               # the lettering
    s.outline()
    return s


CLOCKS = [('wall_clock', wall_clock), ('standing_clock', standing_clock), ('room_plaque', room_plaque)]
