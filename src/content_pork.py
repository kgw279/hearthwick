"""Pork content pack: pork as a raw ingredient (sold by the butcher) and what it makes.

Bacon and ham use salt because curing is the point of them. Lard is rendered here and
used where it matters: hot-water pastry for pork pie.
"""

# new raw ingredients: id -> (name, shelf_life_days, tags, value)
RAW = {
    'pork': ('Pork', 2, ['meat'], 5),
}

SHOP_STOCK = {
    'butcher': [('pork', 8)],
}

# id: (name, base, tags, value, shelf_life_days, method)
ITEMS = {
    'dicedpork':    ('Diced pork', 'pork', ['meat'], 5, 2, 'chop'),
    'sausagemeat':  ('Sausage meat', 'pork', ['meat', 'savory'], 5, 2, 'grind'),
    'sausages':     ('Fried sausages', None, ['meat', 'savory', 'warm'], 7, 1, 'fry'),
    'bacon':        ('Bacon', None, ['meat', 'savory'], 6, 10, 'mix'),
    'crispbacon':   ('Crispy bacon', None, ['meat', 'savory', 'warm'], 7, 1, 'fry'),
    'porkchop':     ('Grilled pork chop', 'pork', ['meat', 'savory', 'warm'], 8, 1, 'grill'),
    'roastpork':    ('Roast pork', 'pork', ['meat', 'hearty', 'savory', 'warm'], 10, 2, 'bake'),
    'ham':          ('Honey-baked ham', None, ['meat', 'sweet', 'savory'], 12, 6, 'bake'),
    'lard':         ('Lard', None, ['hearty'], 3, 20, 'boil'),
    'pastry':       ('Hot-water pastry', None, ['hearty'], 4, 2, 'mix'),
    'porkpie':      ('Pork pie', None, ['meat', 'hearty', 'savory'], 12, 4, 'bake'),
    'sausagerolls': ('Sausage rolls', None, ['meat', 'hearty', 'warm'], 9, 2, 'bake'),
    'porkstew':     ('Pork & apple stew', None, ['meat', 'hearty', 'warm', 'sweet'], 10, 1, 'boil'),
}

# station -> {input: output}
TX = {
    'board':   {'pork': 'dicedpork'},
    'mill':    {'pork': 'sausagemeat'},
    'skillet': {'sausagemeat': 'sausages', 'bacon': 'crispbacon'},
    'grill':   {'pork': 'porkchop'},
    'oven':    {'pork': 'roastpork'},
    'pot':     {'dicedpork': 'lard'},
}

# station -> [(inputs..., output)]
COMBO = {
    'bowl': [('pork', 'salt', 'bacon'), ('flour', 'lard', 'water', 'pastry')],
    'oven': [('pork', 'salt', 'honey', 'ham'), ('pastry', 'dicedpork', 'porkpie'), ('sausagemeat', 'dough', 'sausagerolls')],
    'pot':  [('water', 'dicedpork', 'slapple', 'porkstew')],
}

# (name, components, value) — roughly simple -> complex
RECIPES = [
    ('Bacon & Eggs', ['crispbacon', 'friedegg'], 11),
    ('Bacon Sandwich', ['crispbacon', 'slices'], 10),
    ('Bangers & Mash', ['sausages', 'mashed'], 12),
    ('Pork Chop & Applesauce', ['porkchop', 'applesauce'], 12),
    ('Sausage Rolls', ['sausagerolls'], 11),
    ('Sausages & Onions on Toast', ['sausages', 'caronion', 'toast'], 14),
    ('Bacon & Cheese Omelette', ['cheeseomelette', 'crispbacon'], 14),
    ('Honey Ham & Potatoes', ['ham', 'boilpot'], 16),
    ('Pork & Apple Stew', ['porkstew', 'rolls'], 16),
    ('Pork Pie & Pickles', ['porkpie', 'pickledonion'], 17),
    ('Roast Pork Supper', ['roastpork', 'roastcarrot', 'applesauce'], 20),
]
