"""Hearthwick game design, transcribed from the Hearthwick Inn prototype.

Legacy ids are the prototype's; gamedata.py turns them into readable ids.
Nothing here is art — see items_art.py for sprites.
"""

TAGS = {'savory': '#a0673a', 'sweet': '#e0559a', 'hearty': '#f07f22', 'fresh': '#38b26a',
        'warm': '#e2453c', 'fish': '#2f8fd1', 'meat': '#9c3324', 'odd': '#7a5af0'}

# id: (name, shelf_life_days, tags, value)
ING = {
    'wheat': ('Wheat', 6, ['hearty'], 2), 'herbs': ('Herbs', 2, ['fresh', 'savory'], 2),
    'honey': ('Honey', 9, ['sweet'], 3), 'egg': ('Egg', 4, ['hearty'], 2),
    'berries': ('Berries', 2, ['sweet', 'fresh'], 2), 'mushroom': ('Mushroom', 3, ['savory'], 3),
    'nuts': ('Acorns', 9, ['hearty'], 2), 'venison': ('Venison', 2, ['meat'], 5),
    'trout': ('Trout', 1, ['fish'], 4), 'cress': ('Cress', 2, ['fresh'], 2),
    'onion': ('Onion', 7, ['savory'], 2), 'milk': ('Milk', 3, ['hearty'], 2),
    'apple': ('Apple', 7, ['sweet', 'fresh'], 3), 'mutton': ('Mutton', 3, ['meat'], 4),
    'cheese': ('Cheese', 9, ['hearty', 'savory'], 4), 'tomato': ('Tomato', 5, ['fresh', 'savory'], 2),
    'potato': ('Potato', 12, ['hearty'], 2), 'carrot': ('Carrot', 9, ['sweet', 'fresh'], 2),
    'beef': ('Beef', 2, ['meat'], 6), 'pepper': ('Ember pepper', 12, ['warm', 'odd'], 5),
}

# id: (name, base ingredient or None, tags, value, shelf_life_days, method)
CDEF = {
    'toastgrain': ('Toasted grain', 'wheat', ['hearty', 'warm'], 2, 3, 'fry'),
    'boilgrain': ('Boiled grain', 'wheat', ['hearty', 'warm'], 2, 1, 'boil'),
    'flour': ('Flour', None, ['hearty'], 3, 8, 'grind'),
    'nutmeal': ('Nut meal', 'nuts', ['hearty'], 3, 6, 'grind'),
    'batter': ('Batter', None, ['hearty'], 4, 1, 'mix'),
    'dough': ('Bread dough', None, ['hearty'], 4, 2, 'mix'),
    'pastadough': ('Pasta dough', None, ['hearty'], 4, 2, 'mix'),
    'flatdough': ('Flatbread dough', None, ['hearty'], 3, 2, 'mix'),
    'noodles': ('Fresh noodles', None, ['hearty'], 4, 2, 'chop'),
    'cnoodles': ('Cooked noodles', None, ['hearty', 'warm'], 5, 1, 'boil'),
    'friednoodles': ('Fried noodles', None, ['hearty', 'warm', 'savory'], 5, 1, 'fry'),
    'tortilla': ('Tortilla', None, ['hearty', 'warm'], 4, 2, 'fry'),
    'flatbread': ('Flatbread', None, ['hearty', 'warm'], 4, 2, 'grill'),
    'loaf': ('Bread loaf', None, ['hearty', 'warm'], 5, 3, 'bake'),
    'slices': ('Bread slices', None, ['hearty'], 5, 2, 'chop'),
    'toast': ('Toast', None, ['hearty', 'warm'], 5, 1, 'grill'),
    'sponge': ('Sponge cake', None, ['sweet', 'hearty', 'warm'], 6, 2, 'bake'),
    'pancakes': ('Pancakes', None, ['sweet', 'hearty', 'warm'], 5, 1, 'fry'),
    'hbegg': ('Hard-boiled egg', 'egg', ['hearty'], 3, 3, 'boil'),
    'chegg': ('Chopped egg', 'egg', ['hearty', 'savory'], 3, 2, 'chop'),
    'friedegg': ('Fried egg', 'egg', ['hearty', 'warm', 'savory'], 3, 1, 'fry'),
    'whisked': ('Whisked egg', None, ['hearty'], 2, 1, 'mix'),
    'scrambled': ('Scrambled eggs', None, ['hearty', 'warm', 'savory'], 4, 1, 'fry'),
    'glaze': ('Honey glaze', 'honey', ['sweet', 'warm'], 4, 2, 'fry'),
    'syrup': ('Honey syrup', 'honey', ['sweet', 'warm'], 4, 3, 'boil'),
    'chherbs': ('Chopped herbs', 'herbs', ['fresh', 'savory'], 2, 1, 'chop'),
    'crispherbs': ('Crispy herbs', 'herbs', ['savory', 'warm'], 2, 1, 'fry'),
    'herbbroth': ('Herb broth', 'herbs', ['savory', 'warm'], 3, 1, 'boil'),
    'crushed': ('Crushed berries', 'berries', ['sweet', 'fresh'], 3, 1, 'mix'),
    'compote': ('Berry compote', 'berries', ['sweet', 'warm'], 4, 2, 'boil'),
    'slmush': ('Sliced mushroom', 'mushroom', ['savory'], 3, 2, 'chop'),
    'sautemush': ('Sautéed mushrooms', 'mushroom', ['savory', 'warm'], 4, 1, 'fry'),
    'grillmush': ('Grilled mushroom', 'mushroom', ['savory', 'warm'], 4, 1, 'grill'),
    'mushbroth': ('Mushroom broth', 'mushroom', ['savory', 'warm', 'hearty'], 4, 1, 'boil'),
    'chnuts': ('Chopped nuts', 'nuts', ['hearty'], 2, 6, 'chop'),
    'toastnuts': ('Toasted nuts', 'nuts', ['hearty', 'warm'], 3, 4, 'fry'),
    'dicedven': ('Diced venison', 'venison', ['meat'], 5, 1, 'chop'),
    'grillven': ('Grilled venison', 'venison', ['meat', 'warm', 'savory'], 7, 1, 'grill'),
    'roastven': ('Roast venison', 'venison', ['meat', 'warm', 'hearty'], 7, 1, 'bake'),
    'braiseven': ('Braised venison', 'venison', ['meat', 'warm', 'hearty'], 7, 1, 'boil'),
    'searven': ('Seared venison', 'venison', ['meat', 'warm', 'savory'], 7, 1, 'fry'),
    'fillet': ('Trout fillet', 'trout', ['fish', 'fresh'], 4, 1, 'chop'),
    'grilltrout': ('Grilled trout', 'trout', ['fish', 'warm', 'savory'], 6, 1, 'grill'),
    'panfillet': ('Pan-fried trout', 'trout', ['fish', 'warm', 'savory'], 6, 1, 'fry'),
    'fishstock': ('Fish stock', 'trout', ['fish', 'warm'], 5, 1, 'boil'),
    'chcress': ('Chopped cress', 'cress', ['fresh'], 2, 1, 'chop'),
    'wilted': ('Wilted cress', 'cress', ['savory', 'warm'], 2, 1, 'fry'),
    'dicedonion': ('Diced onion', 'onion', ['savory'], 2, 5, 'chop'),
    'caronion': ('Caramelized onion', 'onion', ['savory', 'sweet', 'warm'], 4, 2, 'fry'),
    'onionbroth': ('Onion broth', 'onion', ['savory', 'warm'], 3, 1, 'boil'),
    'charonion': ('Charred onion', 'onion', ['savory', 'warm'], 3, 1, 'grill'),
    'warmmilk': ('Warm milk', 'milk', ['hearty', 'warm'], 2, 1, 'boil'),
    'cream': ('Whipped cream', None, ['sweet', 'fresh'], 3, 1, 'mix'),
    'cheesesauce': ('Cheese sauce', None, ['savory', 'hearty', 'warm'], 6, 1, 'boil'),
    'slapple': ('Sliced apple', 'apple', ['sweet', 'fresh'], 3, 2, 'chop'),
    'bakedapple': ('Baked apple', 'apple', ['sweet', 'warm'], 4, 1, 'bake'),
    'applesauce': ('Applesauce', 'apple', ['sweet', 'warm'], 4, 2, 'boil'),
    'grillapple': ('Grilled apple', 'apple', ['sweet', 'warm'], 4, 1, 'grill'),
    'dicedmut': ('Diced mutton', 'mutton', ['meat'], 4, 1, 'chop'),
    'grillchop': ('Grilled mutton chop', 'mutton', ['meat', 'warm', 'savory'], 6, 1, 'grill'),
    'braisemut': ('Braised mutton', 'mutton', ['meat', 'warm', 'hearty'], 6, 1, 'boil'),
    'roastmut': ('Roast mutton', 'mutton', ['meat', 'warm', 'hearty'], 6, 1, 'bake'),
    'grated': ('Grated cheese', 'cheese', ['savory', 'hearty'], 4, 4, 'chop'),
    'melted': ('Melted cheese', 'cheese', ['savory', 'hearty', 'warm'], 5, 1, 'grill'),
    'friedcheese': ('Fried cheese', 'cheese', ['savory', 'hearty', 'warm'], 5, 1, 'fry'),
    'minced': ('Minced pepper', 'pepper', ['warm', 'odd'], 5, 5, 'chop'),
    'charpepper': ('Charred pepper', 'pepper', ['warm', 'odd', 'savory'], 6, 2, 'grill'),
    'fireoil': ('Fire oil', 'pepper', ['warm', 'odd'], 6, 3, 'fry'),
    'dicedtom': ('Diced tomato', 'tomato', ['fresh', 'savory'], 3, 2, 'chop'),
    'tomsauce': ('Tomato sauce', 'tomato', ['savory', 'warm'], 4, 3, 'boil'),
    'roasttom': ('Roasted tomato', 'tomato', ['savory', 'warm', 'sweet'], 4, 1, 'grill'),
    'dicedpot': ('Diced potato', 'potato', ['hearty'], 2, 3, 'chop'),
    'boilpot': ('Boiled potato', 'potato', ['hearty', 'warm'], 3, 1, 'boil'),
    'mashed': ('Mashed potatoes', None, ['hearty', 'warm'], 4, 1, 'mix'),
    'bakedpot': ('Baked potato', 'potato', ['hearty', 'warm'], 4, 1, 'bake'),
    'fries': ('Fried potatoes', 'potato', ['hearty', 'warm', 'savory'], 4, 1, 'fry'),
    'slcarrot': ('Sliced carrot', 'carrot', ['sweet', 'fresh'], 2, 3, 'chop'),
    'boilcarrot': ('Boiled carrots', 'carrot', ['sweet', 'warm'], 3, 1, 'boil'),
    'roastcarrot': ('Roast carrots', 'carrot', ['sweet', 'warm', 'hearty'], 3, 1, 'bake'),
    'sautecarrot': ('Glazed carrots', 'carrot', ['sweet', 'warm', 'savory'], 3, 1, 'fry'),
    'dicedbeef': ('Diced beef', 'beef', ['meat'], 6, 1, 'chop'),
    'steak': ('Grilled steak', 'beef', ['meat', 'warm', 'savory'], 9, 1, 'grill'),
    'roastbeef': ('Roast beef', 'beef', ['meat', 'warm', 'hearty'], 9, 1, 'bake'),
    'braisebeef': ('Braised beef', 'beef', ['meat', 'warm', 'hearty'], 9, 1, 'boil'),
    'searbeef': ('Seared beef', 'beef', ['meat', 'warm', 'savory'], 9, 1, 'fry'),
    'mince': ('Ground beef', 'beef', ['meat'], 6, 1, 'grind'),
    'patty': ('Beef patty', 'beef', ['meat', 'warm', 'savory', 'hearty'], 8, 1, 'grill'),
    'friedmince': ('Fried mince', 'beef', ['meat', 'warm', 'savory'], 7, 1, 'fry'),
    'carrotcake': ('Carrot cake', None, ['sweet', 'hearty', 'warm'], 8, 2, 'bake'),
    'venpie': ('Venison pie', None, ['meat', 'hearty', 'warm'], 12, 2, 'bake'),
    'applepie': ('Apple pie', None, ['sweet', 'hearty', 'warm'], 9, 2, 'bake'),
    'berrycake': ('Berry cake', None, ['sweet', 'hearty', 'warm'], 8, 2, 'bake'),
}

# station -> {input: output}   (single-ingredient transforms)
TX = {
    'mill': {'wheat': 'flour', 'nuts': 'nutmeal', 'toastnuts': 'nutmeal', 'beef': 'mince', 'dicedbeef': 'mince'},
    'board': {'pastadough': 'noodles', 'tomato': 'dicedtom', 'potato': 'dicedpot', 'carrot': 'slcarrot', 'beef': 'dicedbeef',
              'hbegg': 'chegg', 'herbs': 'chherbs', 'mushroom': 'slmush', 'nuts': 'chnuts', 'venison': 'dicedven', 'trout': 'fillet',
              'cress': 'chcress', 'onion': 'dicedonion', 'apple': 'slapple', 'mutton': 'dicedmut', 'cheese': 'grated',
              'pepper': 'minced', 'loaf': 'slices', 'toastnuts': 'chnuts'},
    'bowl': {'egg': 'whisked', 'berries': 'crushed', 'milk': 'cream', 'flour': 'flatdough', 'boilpot': 'mashed'},
    'skillet': {'flatdough': 'tortilla', 'noodles': 'friednoodles', 'cnoodles': 'friednoodles', 'potato': 'fries', 'dicedpot': 'fries',
                'carrot': 'sautecarrot', 'slcarrot': 'sautecarrot', 'beef': 'searbeef', 'dicedbeef': 'searbeef', 'mince': 'friedmince',
                'wheat': 'toastgrain', 'batter': 'pancakes', 'egg': 'friedegg', 'whisked': 'scrambled', 'honey': 'glaze',
                'herbs': 'crispherbs', 'chherbs': 'crispherbs', 'mushroom': 'sautemush', 'slmush': 'sautemush', 'nuts': 'toastnuts',
                'chnuts': 'toastnuts', 'venison': 'searven', 'dicedven': 'searven', 'fillet': 'panfillet', 'trout': 'panfillet',
                'cress': 'wilted', 'chcress': 'wilted', 'onion': 'caronion', 'dicedonion': 'caronion', 'cheese': 'friedcheese',
                'grated': 'friedcheese', 'pepper': 'fireoil', 'minced': 'fireoil'},
    'pot': {'noodles': 'cnoodles', 'tomato': 'tomsauce', 'dicedtom': 'tomsauce', 'potato': 'boilpot', 'dicedpot': 'boilpot',
            'carrot': 'boilcarrot', 'slcarrot': 'boilcarrot', 'beef': 'braisebeef', 'dicedbeef': 'braisebeef', 'wheat': 'boilgrain',
            'egg': 'hbegg', 'honey': 'syrup', 'herbs': 'herbbroth', 'chherbs': 'herbbroth', 'berries': 'compote', 'crushed': 'compote',
            'mushroom': 'mushbroth', 'slmush': 'mushbroth', 'venison': 'braiseven', 'dicedven': 'braiseven', 'trout': 'fishstock',
            'fillet': 'fishstock', 'onion': 'onionbroth', 'dicedonion': 'onionbroth', 'milk': 'warmmilk', 'apple': 'applesauce',
            'slapple': 'applesauce', 'mutton': 'braisemut', 'dicedmut': 'braisemut'},
    'grill': {'flatdough': 'flatbread', 'tomato': 'roasttom', 'dicedtom': 'roasttom', 'beef': 'steak', 'mince': 'patty',
              'mushroom': 'grillmush', 'slmush': 'grillmush', 'venison': 'grillven', 'trout': 'grilltrout', 'fillet': 'grilltrout',
              'onion': 'charonion', 'slices': 'toast', 'loaf': 'toast', 'apple': 'grillapple', 'slapple': 'grillapple',
              'mutton': 'grillchop', 'cheese': 'melted', 'grated': 'melted', 'pepper': 'charpepper'},
    'oven': {'potato': 'bakedpot', 'carrot': 'roastcarrot', 'slcarrot': 'roastcarrot', 'beef': 'roastbeef', 'dough': 'loaf',
             'batter': 'sponge', 'venison': 'roastven', 'apple': 'bakedapple', 'mutton': 'roastmut', 'slices': 'toast'},
}

# station -> [(inputs..., output)]   (multi-ingredient combos)
COMBO = {
    'bowl': [('egg', 'flour', 'milk', 'batter'), ('egg', 'flour', 'pastadough'), ('flour', 'milk', 'dough')],
    'pot': [('cheese', 'milk', 'cheesesauce'), ('grated', 'milk', 'cheesesauce'), ('crushed', 'honey', 'compote')],
    'oven': [('dicedven', 'dough', 'venpie'), ('dough', 'slapple', 'applepie'), ('batter', 'crushed', 'berrycake'),
             ('batter', 'berries', 'berrycake'), ('batter', 'slcarrot', 'carrotcake')],
}

STATIONS = {   # legacy id: (name, verb, method, sprite in stations sheet)
    'board': ('Cutting board', 'Chop', 'chop', 'cutting_board'),
    'mill': ('Grain mill', 'Grind', 'grind', 'hand_mill'),
    'bowl': ('Mixing bowl', 'Mix', 'mix', 'mixing_table'),
    'skillet': ('Skillet', 'Fry', 'fry', 'stove'),
    'pot': ('Stock pot', 'Boil', 'boil', 'cauldron'),
    'grill': ('Grill', 'Grill', 'grill', 'grill'),
    'oven': ('Hearth oven', 'Bake', 'bake', 'oven'),
    'plate': ('Plating station', 'Plate', 'serve', 'plating_station'),
}

# Dishes: (legacy id, name, components, explicit tags or None, value, origin folk or None)
RECIPES = [
    ('bread', 'Farmhouse Loaf', ['loaf', 'glaze'], ['hearty', 'warm', 'sweet'], 12, None),
    ('omelette', 'Herb Omelette', ['scrambled', 'chherbs'], ['hearty', 'savory', 'warm', 'fresh'], 9, None),
    ('salad', 'Garden Greens', ['chcress', 'chherbs', 'chegg'], ['fresh', 'savory', 'hearty'], 10, None),
    ('stew', 'Mushroom Stew', ['mushbroth', 'caronion'], ['savory', 'hearty', 'warm'], 12, None),
    ('meadow', 'Meadow Salad', ['cress', 'crushed'], ['fresh', 'sweet'], 8, None),
    ('tart', 'Berry Cake & Cream', ['berrycake', 'cream'], ['sweet', 'hearty', 'warm', 'fresh'], 16, None),
    ('cake', 'Honey Cake', ['sponge', 'syrup'], ['sweet', 'hearty', 'warm'], 14, None),
    ('forager', "Forager's Plate", ['sautemush', 'toastnuts', 'chherbs'], ['savory', 'hearty', 'warm', 'fresh'], 13, None),
    ('trout', 'Grilled Trout', ['grilltrout', 'chherbs'], ['fish', 'savory', 'warm', 'fresh'], 12, None),
    ('chowder', 'River Chowder', ['fishstock', 'warmmilk', 'dicedonion'], ['fish', 'hearty', 'warm', 'savory'], 16, None),
    ('cream', 'Berries & Cream', ['crushed', 'cream'], ['sweet', 'fresh'], 9, None),
    ('porridge', 'Honeyed Porridge', ['boilgrain', 'warmmilk', 'syrup'], ['sweet', 'hearty', 'warm'], 12, None),
    ('glazedven', 'Honey-Glazed Venison', ['grillven', 'glaze'], ['meat', 'sweet', 'savory', 'warm'], 16, None),
    ('roast', "Hunter's Roast", ['roastven', 'crispherbs'], ['meat', 'savory', 'warm', 'hearty'], 15, None),
    ('pie', 'Venison Pie', ['venpie', 'caronion'], ['meat', 'hearty', 'savory', 'warm'], 20, None),
    ('crumble', 'Apple Pie & Cream', ['applepie', 'cream'], ['sweet', 'warm', 'hearty', 'fresh'], 16, None),
    ('cider', 'Orchard Salad', ['slapple', 'chherbs', 'chnuts'], ['sweet', 'fresh', 'hearty'], 11, None),
    ('muttonstew', 'Mutton Stew', ['braisemut', 'onionbroth'], ['meat', 'hearty', 'savory', 'warm'], 15, None),
    ('toast', 'Cheese Toast', ['toast', 'melted'], ['hearty', 'savory', 'warm'], 12, None),
    ('tomnoodles', 'Noodles in Tomato Sauce', ['cnoodles', 'tomsauce'], None, 13, None),
    ('beefnoodle', 'Beef Noodle Soup', ['braisebeef', 'cnoodles', 'onionbroth'], None, 20, None),
    ('steakpot', 'Steak & Potatoes', ['bakedpot', 'steak'], None, 20, None),
    ('roastdinner', 'Sunday Roast', ['mashed', 'roastbeef', 'roastcarrot'], None, 24, None),
    ('wrap', 'Tavern Wrap', ['dicedtom', 'friedmince', 'tortilla'], None, 17, None),
    ('tomflat', 'Tomato Flatbread', ['flatbread', 'melted', 'roasttom'], None, 15, None),
    ('beefstew', 'Beef Stew', ['boilcarrot', 'boilpot', 'braisebeef'], None, 20, None),
    ('carrotcake', 'Carrot Cake & Cream', ['carrotcake', 'cream'], None, 16, None),
    ('patty', 'Patty on Bread', ['dicedtom', 'patty', 'slices'], None, 18, None),
    ('frites', 'Crispy Potatoes & Herbs', ['crispherbs', 'fries'], None, 10, None),
    ('pancakes', 'Honey Pancakes', ['glaze', 'pancakes'], None, 12, None),
    ('stonebread', 'Dwarven Stonebread', ['slices', 'toastnuts', 'friedegg'], ['hearty', 'warm', 'savory'], 15, 'dwarf'),
    ('bogbroth', 'Bog Broth', ['fishstock', 'chcress', 'minced'], ['fish', 'fresh', 'odd', 'warm'], 18, 'frog'),
    ('nectar', 'Elven Nectar Bowl', ['crushed', 'syrup', 'chcress'], ['sweet', 'fresh', 'warm'], 14, 'elf'),
    ('comb', 'Ember Honeycomb', ['glaze', 'charpepper'], ['sweet', 'warm', 'odd', 'savory'], 15, 'beetle'),
    ('supper', "Shepherd's Supper", ['roastmut', 'caronion', 'toast'], ['meat', 'hearty', 'warm', 'savory'], 20, 'human'),
]
START_RECIPES = ['omelette', 'salad', 'stew', 'toast', 'meadow']

SPOTS = {   # wild forage spots and their find weights
    'meadow': ('Sunny Meadow', {'wheat': 4, 'herbs': 4, 'egg': 3, 'honey': 2}),
    'forest': ('Mosswood', {'berries': 4, 'mushroom': 4, 'nuts': 3, 'venison': 1.5}),
    'river': ('Willow River', {'trout': 3, 'cress': 4, 'onion': 4}),
    'orchard': ('Old Orchard', {'apple': 5, 'honey': 3, 'nuts': 1}),
}

SHOPS = {   # shop id: (name, [(item, price)], building sprite or None)
    'mill': ('Willowmill Bakery', [('wheat', 3), ('flour', 6), ('egg', 4)], 'bakery'),
    'grocer': ('General Store', [('tomato', 4), ('potato', 3), ('carrot', 3), ('onion', 3), ('cress', 3)], 'general_store'),
    'dairy': ('Clover Dairy', [('milk', 4), ('cheese', 6)], None),
    'butcher': ("Hollin's Butchery", [('beef', 9), ('venison', 10), ('mutton', 8)], 'butcher'),
    'fish': ('The Fishmonger', [('trout', 8), ('fillet', 10), ('fishstock', 10)], None),
    'spice': ("Zephra's Spices", [('pepper', 12), ('honey', 7)], None),
    'market': ('Market Square', 'rotating', 'market_stall'),
}
MARKET_POOL = ['egg', 'onion', 'tomato', 'potato', 'carrot', 'honey', 'cheese', 'milk', 'apple', 'berries', 'mushroom',
               'pepper', 'nuts', 'herbs', 'cress', 'wheat', 'flour', 'beef', 'trout']

FOLK = {   # likes / hates / attitude to 'odd' food (-1 dislikes, 0 neutral, 1 loves)
    'human': ('Human', ['savory', 'hearty', 'warm', 'sweet', 'fresh'], None, -1),
    'dwarf': ('Dwarf', ['hearty', 'meat', 'warm', 'savory'], 'fresh', 0),
    'elf': ('Elf', ['fresh', 'sweet', 'savory'], 'meat', -1),
    'beetle': ('Beetle-folk', ['sweet', 'odd', 'hearty'], 'fish', 1),
    'frog': ('Frog-folk', ['fish', 'fresh', 'odd'], 'warm', 1),
    'minotaur': ('Minotaur', ['meat', 'hearty', 'savory', 'warm'], 'sweet', 0),
}
ODD_RULE = 'a dish gains the odd tag when it mixes sweet+fish or fish+meat'

# ---------------------------------------------------------------------
# SIMPLE MEALS (new content, not in the prototype)
# The simplest dishes: one or two prep steps from raw ingredients.
# (name, components as legacy ids, value). A dish may be one prepared item on a plate.
# ---------------------------------------------------------------------
SIMPLE_RECIPES = [
    ('Sunny Fried Egg', ['friedegg'], 4),
    ('Boiled Egg', ['hbegg'], 4),
    ('Meadow Herb Broth', ['herbbroth'], 4),
    ('Honey Grain Bowl', ['boilgrain', 'honey'], 5),
    ('Berries & Honey', ['berries', 'honey'], 5),
    ('Herb Fried Egg', ['friedegg', 'chherbs'], 6),
    ('Egg & Herb Salad', ['chegg', 'chherbs'], 6),
    ('Crunchy Honey Grain', ['toastgrain', 'glaze'], 6),
    ('Warm Honey Milk', ['warmmilk', 'honey'], 5),
    ('Soft Scramble', ['scrambled'], 5),
    ('Wilted Greens & Egg', ['wilted', 'friedegg'], 7),
    ('Pan-Fried Trout', ['panfillet', 'chherbs'], 9),
]

# Which simple meals are drinks (dish 'kind': 'drink')
SIMPLE_DRINKS = ['Warm Honey Milk']
