"""Guest rooms: what a guest who stays the night might want in their room. A room is one of the inn's
bedroom maps (inn_..._room...). It needs a bed made up with clean linens before a guest can be given it;
beyond that, each guest asks for a few comforts (more as the inn's renown grows). Met, they pay more and
speak well of the inn; missed, less. Things that are used up (soap, candles) go with the guest.

  id: (how a guest asks for it, renown level from which it's asked, what meets it)
  what meets it:  {'props': [...]}  a piece in the room (its art name)
                  {'item': id, 'count': n, 'in': 'bed' | 'room', 'uses': bool}  things kept in the bed or anywhere
                                                                                 in the room; 'uses': used up
"""
COMFORTS = {
    'two_pillows': ('two pillows', 1, {'item': 'pillow', 'count': 2, 'in': 'bed'}),
    'rug': ('a rug', 1, {'props': ['rug']}),
    'plant': ('a plant', 1, {'props': ['potted_plant']}),
    'nightstand': ('a nightstand', 1, {'props': ['nightstand']}),
    'lamp': ('a lamp', 1, {'props': ['floor_lamp', 'deco_sconce']}),
    'soap': ('a bar of soap', 2, {'item': 'soap', 'count': 1, 'in': 'room', 'uses': True}),
    'wardrobe': ('a wardrobe', 2, {'props': ['wardrobe']}),
    'chest': ('a chest for their things', 2, {'props': ['chest']}),
    'candles': ('candles', 2, {'item': 'candles', 'count': 1, 'in': 'room', 'uses': True}),
    'armchair': ('an armchair', 3, {'props': ['armchair']}),
    'painting': ('something on the walls', 3, {'props': ['deco_painting']}),
    'hearth': ('a hearth', 3, {'props': ['fireplace']}),
    'books': ('something to read', 3, {'props': ['bookshelf']}),
}
# what every room must have before it can be given: a bed, made up with clean linens and a pillow
BED = {'prop': 'bed', 'linens': 'bed_linens', 'pillow': 'pillow'}
# a night's stay: the base price, and more for each comfort they asked for that the room had
PRICE = {'base': 8, 'per_comfort': 3}
# how many comforts a guest asks for, by the inn's renown: (fewest, most); past the list, the last
ASKS = [(0, 1), (1, 2), (2, 3), (2, 4)]


def data():
    return {'comforts': {k: {'want': w, 'level': lv, **m} for k, (w, lv, m) in COMFORTS.items()},
            'bed': BED, 'price': PRICE, 'asks': ASKS}
