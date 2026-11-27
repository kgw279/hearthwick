"""Milk content pack: new dairy items, prep steps and dishes.

Every new step uses a (station, input) pair or combo that was unused,
so existing recipes are untouched.
"""

# id: (name, base, tags, value, shelf_life_days, method)
ITEMS = {
    'butter':       ('Butter', 'milk', ['hearty'], 4, 6, 'mix'),
    'brownbutter':  ('Brown butter', None, ['savory', 'warm'], 5, 2, 'fry'),
    'curds':        ('Fresh curds', 'milk', ['fresh', 'hearty'], 4, 2, 'boil'),
    'creamsauce':   ('Cream sauce', None, ['savory', 'hearty', 'warm'], 5, 1, 'boil'),
    'clotted':      ('Clotted cream', None, ['sweet', 'hearty'], 5, 3, 'bake'),
    'grainpudding': ('Grain pudding', None, ['sweet', 'hearty', 'warm'], 7, 2, 'bake'),
    'potatosoup':   ('Potato soup', None, ['hearty', 'warm', 'savory'], 7, 1, 'boil'),
    'scones':       ('Scones', None, ['hearty', 'warm'], 6, 3, 'bake'),
    'shortbread':   ('Shortbread', None, ['sweet', 'hearty'], 6, 8, 'bake'),
}

# station -> {input: output}
TX = {
    'bowl':    {'cream': 'butter'},
    'skillet': {'butter': 'brownbutter'},
    'pot':     {'warmmilk': 'curds', 'cream': 'creamsauce'},
    'oven':    {'cream': 'clotted'},
}

# station -> [(inputs..., output)]
COMBO = {
    'oven': [('boilgrain', 'milk', 'honey', 'grainpudding'), ('flour', 'butter', 'milk', 'scones'),
             ('flour', 'butter', 'syrup', 'shortbread')],
    'pot':  [('warmmilk', 'dicedpot', 'dicedonion', 'potatosoup')],
}

# (name, components, value) — roughly simple -> complex
RECIPES = [
    ('Cold Milk', ['milk'], 3),
    ('Curds & Honey', ['curds', 'honey'], 6),
    ('Fresh Curds & Herbs', ['curds', 'chherbs'], 7),
    ('Buttered Carrots', ['sautecarrot', 'butter'], 9),
    ('Buttered Toast', ['toast', 'butter'], 9),
    ('Berries & Clotted Cream', ['berries', 'clotted'], 9),
    ('Shortbread & Milk', ['shortbread', 'milk'], 10),
    ('Creamy Mushrooms', ['sautemush', 'creamsauce'], 11),
    ('Cheesy Noodles', ['cnoodles', 'cheesesauce'], 12),
    ('Grain Pudding & Berries', ['grainpudding', 'crushed'], 12),
    ('Fireside Potato Soup', ['potatosoup', 'croutons'], 13),
    ('Brown Butter Trout', ['panfillet', 'brownbutter', 'chherbs'], 15),
    ('Cream Tea', ['scones', 'clotted', 'compote'], 16),
    ('Venison in Cream Sauce', ['searven', 'creamsauce'], 17),
]

# Which of these dishes are drinks (dish 'kind': 'drink')
DRINKS = ['Cold Milk']
