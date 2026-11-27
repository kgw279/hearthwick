"""Seasoning content pack: salt and peppercorns as raw ingredients.

Everyday seasoning is implied in every dish. Salt and pepper only appear in recipes where
they are the point of the dish: brining, pickling, curing, salt-crusting and pepper steak.
On the dining tables they appear as a salt cellar and pepper mill (art only, see sprites7.py).
"""

# new raw ingredients: id -> (name, shelf_life_days, tags, value)
RAW = {
    'salt':        ('Salt', 365, ['savory'], 1),
    'peppercorns': ('Peppercorns', 365, ['savory', 'warm'], 2),
}

# extra stock for existing shops: shop id -> [(item, price)]
SHOP_STOCK = {
    'spice':  [('salt', 2), ('peppercorns', 4)],
    'grocer': [('salt', 2)],
}

# id: (name, base, tags, value, shelf_life_days, method)
ITEMS = {
    'brine':          ('Brine', None, ['savory'], 1, 30, 'boil'),
    'pickledonion':   ('Pickled onions', None, ['savory', 'fresh'], 4, 30, 'mix'),
    'pickledcarrot':  ('Pickled carrots', None, ['savory', 'fresh', 'sweet'], 4, 30, 'mix'),
    'saltbeef':       ('Salt beef', None, ['meat', 'savory', 'hearty'], 9, 4, 'boil'),
    'saltcrusttrout': ('Salt-crusted trout', None, ['fish', 'savory', 'warm'], 9, 1, 'bake'),
    'saltednuts':     ('Salted acorns', None, ['savory', 'hearty'], 4, 10, 'fry'),
    'crackedpepper':  ('Cracked pepper', 'peppercorns', ['savory', 'warm'], 3, 60, 'grind'),
    'peppersteak':    ('Pepper steak', None, ['meat', 'savory', 'warm'], 11, 1, 'fry'),
}

# station -> {input: output}
TX = {
    'mill': {'peppercorns': 'crackedpepper'},
}

# station -> [(inputs..., output)]
COMBO = {
    'pot':     [('water', 'salt', 'brine'), ('water', 'beef', 'salt', 'saltbeef')],
    'bowl':    [('brine', 'onion', 'pickledonion'), ('brine', 'slcarrot', 'pickledcarrot')],
    'oven':    [('trout', 'salt', 'saltcrusttrout')],
    'skillet': [('toastnuts', 'salt', 'saltednuts'), ('beef', 'crackedpepper', 'peppersteak')],
}

# (name, components, value) — roughly simple -> complex
RECIPES = [
    ('Salted Acorns', ['saltednuts'], 5),
    ('Pickled Onions & Cheese', ['pickledonion', 'cheese'], 8),
    ('Pickled Carrots & Cress', ['pickledcarrot', 'chcress'], 8),
    ("Ploughman's Lunch", ['slices', 'cheese', 'pickledonion'], 12),
    ('Salt-Crusted Trout', ['saltcrusttrout', 'chherbs'], 13),
    ('Salt Beef & Mash', ['saltbeef', 'mashed'], 15),
    ('Salt Beef Sandwich', ['saltbeef', 'slices', 'pickledonion'], 15),
    ('Pepper Steak & Fries', ['peppersteak', 'fries'], 17),
]
