"""Water content pack: water as a raw ingredient (drawn from the town well) and what it makes.

Water is new, so every (station, water) step is free. Other new steps use combos
that didn't exist, so existing recipes are untouched.
"""

# new raw ingredients: id -> (name, shelf_life_days, tags, value)
RAW = {
    'water': ('Water', 30, ['fresh'], 1),
}

# id: (name, base, tags, value, shelf_life_days, method)
ITEMS = {
    'hotwater':     ('Boiling water', 'water', ['warm'], 1, 1, 'boil'),
    'herbtea':      ('Herb tea', None, ['fresh', 'warm'], 4, 1, 'boil'),
    'appletea':     ('Spiced apple tea', None, ['sweet', 'warm'], 5, 1, 'boil'),
    'cordial':      ('Berry cordial', None, ['sweet', 'fresh'], 5, 5, 'mix'),
    'poachedegg':   ('Poached egg', None, ['hearty', 'warm'], 4, 1, 'boil'),
    'poachedtrout': ('Poached trout', None, ['fish', 'warm'], 7, 1, 'boil'),
    'vegstock':     ('Vegetable stock', None, ['savory', 'warm'], 4, 2, 'boil'),
    'gardensoup':   ('Garden soup', None, ['hearty', 'savory', 'warm', 'fresh'], 8, 1, 'boil'),
}

# station -> {input: output}
TX = {
    'pot': {'water': 'hotwater'},
}

# station -> [(inputs..., output)]
COMBO = {
    'pot':  [('hotwater', 'herbs', 'herbtea'), ('hotwater', 'slapple', 'honey', 'appletea'),
             ('hotwater', 'egg', 'poachedegg'), ('hotwater', 'fillet', 'chherbs', 'poachedtrout'),
             ('water', 'slcarrot', 'dicedonion', 'vegstock'), ('vegstock', 'dicedpot', 'chherbs', 'gardensoup')],
    'bowl': [('crushed', 'water', 'honey', 'cordial')],
}

# (name, components, value) — roughly simple -> complex
RECIPES = [
    ('Cup of Well Water', ['water'], 1),
    ('Herb Tea', ['herbtea'], 5),
    ('Honey Herb Tea', ['herbtea', 'honey'], 7),
    ('Berry Cordial', ['cordial'], 7),
    ('Spiced Apple Tea', ['appletea'], 8),
    ('Poached Egg on Toast', ['poachedegg', 'toast'], 10),
    ('Poached Egg & Cress', ['poachedegg', 'chcress'], 9),
    ('Tea & Shortbread', ['herbtea', 'shortbread'], 11),
    ('Poached Trout & Greens', ['poachedtrout', 'chcress'], 13),
    ('Garden Soup & Bread', ['gardensoup', 'slices'], 14),
]

# Which of these dishes are drinks (dish 'kind': 'drink')
DRINKS = ['Cup of Well Water', 'Herb Tea', 'Honey Herb Tea', 'Berry Cordial', 'Spiced Apple Tea']
