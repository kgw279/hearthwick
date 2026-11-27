"""Egg content pack: new egg-derived items, prep steps and dishes.

Every new step uses a (station, input) pair or combo that was unused,
so existing recipes are untouched.
"""

# id: (name, base, tags, value, shelf_life_days, method)
ITEMS = {
    'bakedegg':   ('Baked egg', 'egg', ['hearty', 'warm'], 4, 1, 'bake'),
    'eggmash':    ('Egg mash', 'egg', ['hearty', 'savory'], 4, 1, 'mix'),
    'eggfoam':    ('Whipped egg whites', None, ['fresh'], 3, 1, 'mix'),
    'meringues':  ('Meringues', None, ['sweet'], 5, 6, 'bake'),
    'custard':    ('Custard', None, ['sweet', 'hearty', 'warm'], 7, 2, 'boil'),
    'frittata':   ('Mushroom frittata', None, ['hearty', 'savory', 'warm'], 9, 1, 'bake'),
    'cheeseomelette': ('Cheese omelette', None, ['hearty', 'savory', 'warm'], 7, 1, 'fry'),
    'quiche':     ('Cheese quiche', None, ['hearty', 'savory', 'warm'], 11, 2, 'bake'),
    'scotchegg':  ('Scotch egg', None, ['hearty', 'savory', 'meat', 'warm'], 10, 2, 'fry'),
}

# station -> {input: output}
TX = {
    'oven': {'egg': 'bakedegg', 'eggfoam': 'meringues'},
    'bowl': {'hbegg': 'eggmash', 'whisked': 'eggfoam'},
}

# station -> [(inputs..., output)]
COMBO = {
    'pot':     [('whisked', 'warmmilk', 'syrup', 'custard')],
    'oven':    [('whisked', 'slmush', 'chherbs', 'frittata'), ('dough', 'whisked', 'grated', 'quiche')],
    'skillet': [('whisked', 'grated', 'cheeseomelette'), ('hbegg', 'mince', 'crumbs', 'scotchegg')],
}

# (name, components, value) — roughly simple -> complex
RECIPES = [
    ('Meringue Kisses', ['meringues'], 6),
    ('Baked Egg & Herbs', ['bakedegg', 'chherbs'], 6),
    ('Stuffed Eggs', ['eggmash', 'chherbs'], 7),
    ('Cheesy Omelette', ['cheeseomelette', 'chherbs'], 10),
    ('Egg Mash on Toast', ['eggmash', 'toast'], 10),
    ('Egg Noodle Broth', ['cnoodles', 'herbbroth', 'hbegg'], 12),
    ('Custard & Compote', ['custard', 'compote'], 13),
    ('Frittata & Greens', ['frittata', 'chcress'], 13),
    ('Berry Meringue Mess', ['meringues', 'crushed', 'cream'], 13),
    ('Tavern Scotch Egg', ['scotchegg', 'roasttom'], 15),
    ('Apple Pie & Custard', ['applepie', 'custard'], 16),
    ('Quiche & Garden Salad', ['quiche', 'chcress', 'dicedtom'], 16),
    ('Full Hearthwick Breakfast', ['friedegg', 'toast', 'sautemush', 'roasttom'], 20),
]
