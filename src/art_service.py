"""Serving pieces seen in the world (sheet "service", 32x32 cells): the serving tray, and the small
plates, bowls, mugs and cutlery shown on a tray or left on a table. The small pieces sit in the
top-left of their cell (about 10x8) so they can be laid out on whatever they're on."""
from core import Sprite


def serving_tray():
    s = Sprite()
    s.rect(3, 22, 28, 28, 'B'); s.rect(3, 22, 28, 22, 't'); s.rect(4, 23, 27, 27, 't')   # rim, then the bed
    s.rect(5, 24, 26, 26, 'k'); s.rect(3, 28, 28, 28, 'b')
    s.rect(1, 24, 2, 26, 'B'); s.rect(29, 24, 30, 26, 'B')                               # handles
    s.outline()
    return s


def _plate(food):
    s = Sprite()
    s.ellipse(5, 5, 4.6, 2.6, 'p'); s.ellipse(5, 4.6, 3.6, 1.8, 'W')
    if food: s.ellipse(5, 4.2, 2.4, 1.3, food[0]); s.set(4, 3, food[1])
    else: s.set(3, 5, 'h'); s.set(6, 4, 'b'); s.set(5, 6, 'h')                           # crumbs and smears
    s.outline()
    return s


def _bowl(food):
    s = Sprite()
    s.rect(1, 4, 8, 6, 'B'); s.rect(2, 7, 7, 7, 'b')
    s.ellipse(4.5, 3.6, 3.8, 1.3, food[0] if food else 'b')
    if not food: s.set(3, 3, 'h')
    s.outline()
    return s


def _mug(full):
    s = Sprite()
    s.rect(2, 2, 6, 8, 'B'); s.rect(2, 2, 2, 8, 't'); s.rect(7, 4, 8, 6, 'B')
    s.rect(3, 1, 5, 1, 'W' if full else 'b')                                             # froth, or dregs
    s.outline()
    return s


def _cutlery(dirty):
    s = Sprite()
    s.rect(2, 1, 2, 8, 's'); s.rect(1, 1, 1, 3, 's'); s.rect(3, 1, 3, 3, 's')            # fork
    s.rect(6, 1, 7, 8, 's'); s.rect(6, 1, 6, 4, 'W')                                     # knife
    if dirty: s.set(2, 5, 'h'); s.set(7, 3, 'b')
    s.outline()
    return s


SERVICE = [
    ('serving_tray', serving_tray),
    ('mini_plate_food', lambda: _plate(('r', 'G'))), ('mini_bowl_food', lambda: _bowl(('t',))),
    ('mini_mug_full', lambda: _mug(True)), ('mini_cutlery', lambda: _cutlery(False)),
    ('mini_plate_dirty', lambda: _plate(None)), ('mini_bowl_dirty', lambda: _bowl(None)),
    ('mini_mug_dirty', lambda: _mug(False)), ('mini_cutlery_dirty', lambda: _cutlery(True)),
]
