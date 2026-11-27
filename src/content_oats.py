"""Oats content pack: oats as a raw ingredient (wild oat patches, see gamedata.FORAGE_NODES, and the bakery) and what they make."""

# new raw ingredients: id -> (name, shelf_life_days, tags, value)
RAW = {
    'oats': ('Oats', 20, ['hearty'], 2),
}

SHOP_STOCK = {
    'mill': [('oats', 3)],
}

# id: (name, base, tags, value, shelf_life_days, method)
ITEMS = {
    'rolledoats':   ('Rolled oats', 'oats', ['hearty'], 3, 20, 'grind'),
    'toastedoats':  ('Toasted oats', 'oats', ['hearty', 'warm'], 3, 10, 'fry'),
    'porridge':     ('Oat porridge', None, ['hearty', 'warm'], 5, 1, 'boil'),
    'oatcakes':     ('Oatcakes', None, ['hearty', 'savory'], 5, 8, 'bake'),
    'flapjacks':    ('Honey flapjacks', None, ['sweet', 'hearty'], 7, 6, 'bake'),
    'crumble':      ('Crumble topping', None, ['sweet', 'hearty'], 4, 4, 'mix'),
    'applecrumble': ('Apple crumble', None, ['sweet', 'hearty', 'warm'], 10, 2, 'bake'),
    'berrycrumble': ('Berry crumble', None, ['sweet', 'hearty', 'warm'], 10, 2, 'bake'),
    'skirlie':      ('Skirlie', None, ['savory', 'hearty', 'warm'], 5, 1, 'fry'),
    'oattrout':     ('Oat-crusted trout', None, ['fish', 'hearty', 'warm'], 10, 1, 'fry'),
}

# station -> {input: output}
TX = {
    'mill':    {'oats': 'rolledoats'},
    'skillet': {'oats': 'toastedoats'},
}

# station -> [(inputs..., output)]
COMBO = {
    'pot':     [('water', 'rolledoats', 'porridge')],
    'oven':    [('rolledoats', 'butter', 'water', 'oatcakes'), ('rolledoats', 'butter', 'syrup', 'flapjacks'),
                ('crumble', 'slapple', 'applecrumble'), ('crumble', 'berries', 'berrycrumble')],
    'bowl':    [('rolledoats', 'flour', 'butter', 'crumble')],
    'skillet': [('rolledoats', 'dicedonion', 'skirlie'), ('fillet', 'rolledoats', 'oattrout')],
}

# (name, components, value) — roughly simple -> complex
RECIPES = [
    ('Bowl of Porridge', ['porridge'], 6),
    ('Porridge & Honey', ['porridge', 'honey'], 8),
    ('Porridge & Berries', ['porridge', 'berries'], 8),
    ('Toasted Oats & Milk', ['toastedoats', 'milk'], 7),
    ('Oatcakes & Cheese', ['oatcakes', 'cheese'], 10),
    ('Honey Flapjacks', ['flapjacks'], 10),
    ('Skirlie & Sausages', ['skirlie', 'sausages'], 14),
    ('Oat-Crusted Trout & Cress', ['oattrout', 'chcress'], 15),
    ('Berry Crumble & Cream', ['berrycrumble', 'cream'], 16),
    ('Apple Crumble & Custard', ['applecrumble', 'custard'], 18),
]
