"""Drinks content pack: a brewing cask station plus brewed, pressed and mixed drinks.

The cask is a new station ('ferment'). Everything brewed in it starts from ingredients the
game already has: toasted grain or oats for ale and stout, pressed apple for cider, honey for
mead, crushed berries for wine.
"""

# new stations: id -> (name, verb, method, sprite in stations sheet)
STATIONS = {
    'cask': ('Brewing cask', 'Brew', 'ferment', 'brewing_cask'),
}

# id: (name, base, tags, value, shelf_life_days, method)
ITEMS = {
    'applejuice':  ('Apple juice', 'apple', ['sweet', 'fresh'], 4, 3, 'grind'),
    'ale':         ('Hearth ale', None, ['hearty'], 6, 20, 'ferment'),
    'oatstout':    ('Oat stout', None, ['hearty', 'warm'], 7, 20, 'ferment'),
    'cider':       ('Orchard cider', None, ['sweet', 'fresh'], 6, 20, 'ferment'),
    'mead':        ('Honey mead', None, ['sweet'], 9, 40, 'ferment'),
    'berrywine':   ('Berry wine', None, ['sweet'], 8, 40, 'ferment'),
    'mulledcider': ('Mulled cider', None, ['sweet', 'warm'], 8, 1, 'boil'),
    'mulledwine':  ('Mulled wine', None, ['sweet', 'warm'], 10, 1, 'boil'),
    'berrymilk':   ('Berry milk', None, ['sweet', 'fresh'], 5, 1, 'mix'),
    'eggnog':      ('Eggnog', None, ['sweet', 'hearty'], 7, 2, 'mix'),
}

# station -> {input: output}
TX = {
    'mill': {'apple': 'applejuice'},          # pressed in the mill
    'cask': {'applejuice': 'cider', 'crushed': 'berrywine'},
}

# station -> [(inputs..., output)]
COMBO = {
    'cask': [('water', 'toastgrain', 'ale'), ('water', 'toastedoats', 'oatstout'), ('water', 'honey', 'mead')],
    'pot':  [('cider', 'honey', 'mulledcider'), ('berrywine', 'honey', 'mulledwine')],
    'bowl': [('milk', 'crushed', 'berrymilk'), ('whisked', 'milk', 'syrup', 'eggnog')],
}

# (name, components, value) — roughly simple -> complex
RECIPES = [
    ('Glass of Apple Juice', ['applejuice'], 6),
    ('Berry Milk', ['berrymilk'], 7),
    ('Tankard of Ale', ['ale'], 8),
    ('Mug of Cider', ['cider'], 8),
    ('Pint of Oat Stout', ['oatstout'], 9),
    ('Goblet of Berry Wine', ['berrywine'], 10),
    ('Goblet of Mead', ['mead'], 11),
    ('Mulled Cider', ['mulledcider'], 11),
    ('Eggnog', ['eggnog'], 11),
    ('Mulled Wine', ['mulledwine'], 13),
    ('Pie & a Pint', ['porkpie', 'ale'], 22),
    ('Cheese & Wine Board', ['cheese', 'oatcakes', 'berrywine'], 20),
]

# Which of these dishes are drinks (dish 'kind': 'drink'). Pairings with food stay 'food'.
DRINKS = [n for n, _, _ in RECIPES if n not in ('Pie & a Pint', 'Cheese & Wine Board')]
