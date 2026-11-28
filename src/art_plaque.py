"""A brass plaque by each guest room's door (furniture sheet): it carries the room's name."""
from core import Sprite


def room_plaque():
    """A small brass plaque for a door's side: the room's name is written on it."""
    s = Sprite()
    s.rect(11, 8, 20, 14, 'H'); s.rect(11, 8, 20, 8, 'y'); s.rect(11, 14, 20, 14, 'b')
    s.rect(13, 10, 18, 10, 'b'); s.rect(13, 12, 17, 12, 'b')               # the lettering
    s.outline()
    return s


PLAQUES = [('room_plaque', room_plaque)]
