"""Chicken content pack: chicken as a raw ingredient (sold by the butcher) and what it makes.

Chicken is new, so every (station, chicken) step is free; other steps are new combos,
so existing recipes are untouched.
"""

# new raw ingredients: id -> (name, shelf_life_days, tags, value)
RAW = {
    'chicken': ('Chicken', 2, ['meat'], 4),
}

# extra stock for existing shops: shop id -> [(item, price)]
SHOP_STOCK = {
    'butcher': [('chicken', 7)],
}

# id: (name, base, tags, value, shelf_life_days, method)
ITEMS = {
    'chickpieces':  ('Chicken pieces', 'chicken', ['meat'], 4, 2, 'chop'),
    'grillchicken': ('Grilled chicken', 'chicken', ['meat', 'savory', 'warm'], 6, 1, 'grill'),
    'roastchicken': ('Roast chicken', 'chicken', ['meat', 'hearty', 'savory', 'warm'], 9, 2, 'bake'),
    'friedchicken': ('Pan-fried chicken', None, ['meat', 'savory', 'warm'], 6, 1, 'fry'),
    'chickenstock': ('Chicken stock', None, ['savory', 'warm'], 5, 2, 'boil'),
    'chickensoup':  ('Chicken noodle soup', None, ['meat', 'hearty', 'warm', 'savory'], 9, 1, 'boil'),
    'chickenpie':   ('Chicken pie', None, ['meat', 'hearty', 'warm'], 11, 2, 'bake'),
    'honeychicken': ('Honey-glazed chicken', None, ['meat', 'sweet', 'warm'], 9, 1, 'fry'),
    'emberchicken': ('Ember chicken', None, ['meat', 'warm', 'odd'], 10, 1, 'grill'),
}

# station -> {input: output}
TX = {
    'board':   {'chicken': 'chickpieces'},
    'grill':   {'chicken': 'grillchicken'},
    'oven':    {'chicken': 'roastchicken'},
    'skillet': {'chickpieces': 'friedchicken'},
}

# station -> [(inputs..., output)]
COMBO = {
    'pot':     [('water', 'chicken', 'chickenstock'), ('chickenstock', 'cnoodles', 'slcarrot', 'chickensoup')],
    'oven':    [('chickpieces', 'dough', 'chickenpie')],
    'skillet': [('chickpieces', 'glaze', 'honeychicken')],
    'grill':   [('chickpieces', 'pepper', 'emberchicken')],
}

# (name, components, value) — roughly simple -> complex
RECIPES = [
    ('Cup of Chicken Broth', ['chickenstock'], 6),
    ('Grilled Chicken & Cress', ['grillchicken', 'chcress'], 9),
    ('Fried Chicken & Fries', ['friedchicken', 'fries'], 11),
    ('Honey-Glazed Chicken', ['honeychicken', 'chherbs'], 12),
    ('Chicken Noodle Soup', ['chickensoup'], 12),
    ('Chicken & Dumplings', ['chickenstock', 'dumplings'], 13),
    ('Chicken & Cress Sandwich', ['grillchicken', 'slices', 'chcress'], 12),
    ('Ember Chicken & Flatbread', ['emberchicken', 'flatbread'], 14),
    ('Chicken in Mushroom Cream', ['friedchicken', 'creamsauce', 'sautemush'], 16),
    ('Chicken Pie & Mash', ['chickenpie', 'mashed'], 17),
    ('Roast Chicken Supper', ['roastchicken', 'roastcarrot', 'bakedpot'], 20),
]
