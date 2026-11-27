"""Wheat content pack: new wheat-derived items, prep steps and dishes.

Uses the same shapes as design_src (legacy-style ids; gamedata.py makes readable ids).
Every new step uses a (station, input) pair that was unused, so existing recipes are untouched.
"""

# id: (name, base, tags, value, shelf_life_days, method)
ITEMS = {
    'dumplings':   ('Dumplings', None, ['hearty', 'warm'], 5, 1, 'boil'),
    'doughballs':  ('Dough balls', None, ['hearty'], 4, 2, 'chop'),
    'rolls':       ('Bread rolls', None, ['hearty', 'warm'], 6, 3, 'bake'),
    'fritters':    ('Fritters', None, ['hearty', 'warm', 'sweet'], 5, 1, 'fry'),
    'crackers':    ('Crackers', None, ['hearty', 'savory'], 4, 9, 'bake'),
    'crumbs':      ('Breadcrumbs', None, ['hearty'], 3, 8, 'grind'),
    'croutons':    ('Croutons', None, ['hearty', 'savory', 'warm'], 4, 4, 'fry'),
    'pudding':     ('Bread pudding', None, ['sweet', 'hearty', 'warm'], 9, 2, 'bake'),
    'stuffing':    ('Herb stuffing', None, ['savory', 'hearty', 'fresh'], 6, 2, 'mix'),
    'crumbtrout':  ('Crumbed trout', 'trout', ['fish', 'warm', 'savory', 'hearty'], 8, 1, 'fry'),
    'granola':     ('Granola', None, ['sweet', 'hearty'], 6, 9, 'mix'),
}

# station -> {input: output}
TX = {
    'pot':     {'dough': 'dumplings'},
    'board':   {'dough': 'doughballs'},
    'oven':    {'doughballs': 'rolls', 'flatdough': 'crackers'},
    'skillet': {'dough': 'fritters', 'slices': 'croutons'},
    'mill':    {'slices': 'crumbs', 'toast': 'crumbs'},
}

# station -> [(inputs..., output)]
COMBO = {
    'oven':    [('slices', 'warmmilk', 'egg', 'pudding')],
    'bowl':    [('crumbs', 'chherbs', 'dicedonion', 'stuffing'), ('toastgrain', 'honey', 'chnuts', 'granola')],
    'skillet': [('fillet', 'crumbs', 'crumbtrout')],
}

# (name, components, value) — listed roughly simple -> complex
RECIPES = [
    ('Bread & Honey', ['slices', 'honey'], 9),
    ('Egg on Toast', ['toast', 'friedegg'], 10),
    ('Crackers & Cheese', ['crackers', 'cheese'], 9),
    ('Grain Salad', ['boilgrain', 'chherbs', 'dicedtom'], 10),
    ('Dumpling Broth', ['dumplings', 'herbbroth'], 11),
    ('Honey Fritters', ['fritters', 'glaze'], 11),
    ('Warm Rolls', ['rolls', 'honey'], 11),
    ('Onion Noodle Pan', ['friednoodles', 'caronion', 'chherbs'], 14),
    ('Granola & Cream', ['granola', 'cream'], 12),
    ('Hearthwick Onion Soup', ['onionbroth', 'croutons', 'melted'], 16),
    ('Crumbed Trout', ['crumbtrout', 'chherbs'], 15),
    ('Bread Pudding', ['pudding', 'syrup'], 16),
    ('Stuffed Mutton Roast', ['roastmut', 'stuffing', 'roastcarrot'], 24),
]
