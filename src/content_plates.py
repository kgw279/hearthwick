"""Plates: dishes made by putting things together at the plating station, filled out so that most sensible
pairings of what the player can have to hand are a dish with a name (and can be served), rather than
"that isn't a dish". Pairings that aren't a meal (milk and water, raw meat and anything) are left out.

Hand-written dishes (design_src.py and the packs) come first; these only fill in what they don't cover
(a set of components that already makes a dish is skipped). Each is named from what's in it.

  RAW_PLATES        raw things that are good together just as they are (salads, fruit, cheese plates)
  RAW_DRINKS        raw things stirred into a drink
  PAIRS             role lists: every main with each side that suits it, breads with what goes on them,
                    puddings with what goes over them, soups with what goes alongside
  ON_THEIR_OWN      finished things that are a dish by themselves (a roast, a pie, a pudding)
"""

RAW_PLATES = [
    ('Tomato & Cress Salad', ['tomato', 'cress']),
    ('Tomato & Onion Salad', ['tomato', 'onion']),
    ('Tomatoes & Cheese', ['tomato', 'cheese']),
    ('Herbed Tomatoes', ['tomato', 'herbs']),
    ('Salted Tomatoes', ['tomato', 'salt']),
    ('Peppered Tomatoes', ['tomato', 'peppercorns']),
    ('Fiery Tomato Salad', ['tomato', 'ember_pepper']),
    ('Garden Salad', ['tomato', 'cress', 'onion']),
    ('Cheese & Garden Salad', ['tomato', 'cress', 'cheese']),
    ('Cheese & Apple', ['cheese', 'apple']),
    ('Cheese & Cress', ['cheese', 'cress']),
    ('Cheese & Onion', ['cheese', 'onion']),
    ('Cheese & Honey', ['cheese', 'honey']),
    ('Cheese & Berries', ['cheese', 'berries']),
    ('Herbed Cheese', ['cheese', 'herbs']),
    ('Cheese & Fruit Plate', ['cheese', 'apple', 'berries']),
    ('Fruit Bowl', ['apple', 'berries']),
    ('Honeyed Fruit Bowl', ['apple', 'berries', 'honey']),
    ('Apple & Honey', ['apple', 'honey']),
    ('Carrot & Apple Slaw', ['carrot', 'apple']),
    ('Carrot & Cress Salad', ['carrot', 'cress']),
    ('Salted Carrot Sticks', ['carrot', 'salt']),
    ('Honeyed Carrots', ['carrot', 'honey']),
    ('Cress & Herb Salad', ['cress', 'herbs']),
    ('Ember Relish', ['onion', 'ember_pepper']),
]

RAW_DRINKS = [
    ('Milk & Honey', ['milk', 'honey']),
    ('Honey Water', ['water', 'honey']),
    ('Herb Water', ['water', 'herbs']),
]

# --- mains and what goes beside them
MEATS = ['grilled_venison', 'roast_venison', 'braised_venison', 'seared_venison', 'grilled_mutton_chop', 'braised_mutton',
         'roast_mutton', 'grilled_steak', 'roast_beef', 'braised_beef', 'seared_beef', 'beef_patty', 'pepper_steak', 'salt_beef',
         'grilled_chicken', 'roast_chicken', 'pan_fried_chicken', 'honey_glazed_chicken', 'ember_chicken', 'fried_sausages',
         'grilled_pork_chop', 'roast_pork', 'honey_baked_ham']
FISH = ['grilled_trout', 'pan_fried_trout', 'crumbed_trout', 'poached_trout', 'salt_crusted_trout', 'oat_crusted_trout']
EGGS = ['fried_egg', 'poached_egg', 'scrambled_eggs', 'cheese_omelette', 'mushroom_frittata', 'baked_egg']
PIES = ['venison_pie', 'chicken_pie', 'pork_pie', 'cheese_quiche', 'scotch_egg', 'sausage_rolls']

MEAT_SIDES = ['mashed_potatoes', 'baked_potato', 'fried_potatoes', 'boiled_potato', 'boiled_carrots', 'roast_carrots',
              'glazed_carrots', 'sauteed_mushrooms', 'grilled_mushroom', 'wilted_cress', 'caramelized_onion', 'charred_onion',
              'roasted_tomato', 'dumplings', 'herb_stuffing', 'bread_rolls', 'skirlie', 'boiled_grain', 'pickled_onions',
              'pickled_carrots', 'charred_pepper', 'cress', 'tomato']
SWEET_SIDES = ['applesauce', 'grilled_apple', 'baked_apple']   # with pork, ham and chicken
SWEET_MEATS = ['grilled_pork_chop', 'roast_pork', 'honey_baked_ham', 'fried_sausages', 'roast_chicken', 'grilled_chicken']
FISH_SIDES = ['mashed_potatoes', 'boiled_potato', 'fried_potatoes', 'baked_potato', 'wilted_cress', 'boiled_carrots',
              'roasted_tomato', 'bread_rolls', 'pickled_onions', 'boiled_grain', 'cooked_noodles', 'cress', 'tomato']
EGG_SIDES = ['toast', 'bread_slices', 'flatbread', 'fried_potatoes', 'sauteed_mushrooms', 'grilled_mushroom', 'roasted_tomato',
             'wilted_cress', 'crispy_bacon', 'fried_sausages', 'cress', 'tomato']
PIE_SIDES = ['mashed_potatoes', 'boiled_carrots', 'roast_carrots', 'pickled_onions', 'pickled_carrots', 'wilted_cress',
             'caramelized_onion', 'fried_potatoes', 'cress', 'tomato', 'cheese']
# what goes over a main
SAUCES = ['cheese_sauce', 'cream_sauce', 'tomato_sauce', 'brown_butter', 'chopped_herbs', 'crispy_herbs', 'cracked_pepper']
SAUCED = MEATS + FISH

# --- bread and what goes on it
BREADS = {
    'toast': ['butter', 'honey', 'cheese', 'melted_cheese', 'berry_compote', 'scrambled_eggs', 'poached_egg', 'fried_egg',
              'sauteed_mushrooms', 'caramelized_onion', 'roasted_tomato', 'tomato', 'crispy_bacon', 'fried_mince', 'honey_syrup'],
    'bread_slices': ['butter', 'honey', 'cheese', 'tomato', 'berry_compote', 'crispy_bacon', 'roast_beef', 'roast_chicken',
                     'honey_baked_ham', 'salt_beef', 'chopped_egg', 'egg_mash', 'cress', 'pickled_onions'],
    'flatbread': ['cheese', 'melted_cheese', 'tomato', 'diced_tomato', 'tomato_sauce', 'fried_mince', 'grilled_chicken',
                  'charred_pepper', 'caramelized_onion', 'honey', 'butter', 'fire_oil'],
    'bread_rolls': ['butter', 'cheese', 'honey', 'beef_patty', 'fried_sausages', 'crispy_bacon', 'roast_pork', 'honey_baked_ham'],
    'oatcakes': ['cheese', 'butter', 'honey', 'clotted_cream', 'berry_compote', 'pickled_onions'],
    'crackers': ['cheese', 'grated_cheese', 'butter', 'pickled_onions', 'pickled_carrots', 'salt_beef'],
    'scones': ['clotted_cream', 'butter', 'honey', 'berry_compote', 'whipped_cream', 'crushed_berries'],
    'pancakes': ['honey', 'honey_syrup', 'berry_compote', 'crushed_berries', 'berries', 'whipped_cream', 'butter', 'sliced_apple',
                 'crispy_bacon'],
}

# --- puddings and what goes over them
PUDDINGS = ['sponge_cake', 'carrot_cake', 'apple_pie', 'berry_cake', 'bread_pudding', 'apple_crumble', 'berry_crumble',
            'baked_apple', 'grilled_apple', 'meringues', 'grain_pudding', 'oat_porridge', 'fritters', 'shortbread', 'honey_flapjacks']
TOPPINGS = ['whipped_cream', 'clotted_cream', 'custard', 'honey', 'honey_syrup', 'berry_compote', 'crushed_berries', 'toasted_nuts',
            'berries', 'sliced_apple', 'granola']

# --- soups and stews, and what goes alongside
SOUPS = ['potato_soup', 'garden_soup', 'chicken_noodle_soup', 'mushroom_broth', 'onion_broth', 'herb_broth', 'pork_and_apple_stew']
ALONGSIDE = ['bread_rolls', 'toast', 'croutons', 'bread_slices', 'flatbread', 'crackers', 'dumplings', 'grated_cheese', 'chopped_herbs']

# finished things that are a dish just as they are (things served as snacks already aren't repeated), and
# which of them are a meal in themselves (a main, not a snack)
ON_THEIR_OWN = MEATS + FISH + EGGS + PIES + PUDDINGS + SOUPS + ['custard', 'pancakes', 'scones']
MAIN_ALONE = set(MEATS + FISH + PIES + SOUPS)

# pairings that don't go, though their roles would allow them
NOT = {frozenset(p) for p in [
    ('honey_glazed_chicken', 'honey_syrup'), ('ember_chicken', 'charred_pepper'), ('baked_apple', 'sliced_apple'),
    ('grilled_apple', 'sliced_apple'), ('berry_crumble', 'berries'), ('berry_cake', 'berries'), ('apple_pie', 'sliced_apple'),
    ('apple_crumble', 'sliced_apple'), ('pepper_steak', 'cracked_pepper'), ('honey_flapjacks', 'granola'),
    ('oat_porridge', 'granola'), ('cheese_quiche', 'cheese'), ('mushroom_frittata', 'sauteed_mushrooms'),
    ('mushroom_frittata', 'grilled_mushroom'), ('mushroom_broth', 'chopped_herbs'),
]}

SMALL = {'and', 'of', 'with', 'on', 'in', 'a', 'the'}


def title(name):
    """'Grilled steak' -> 'Grilled Steak'."""
    return ' '.join(w if w in SMALL or w == '&' else w[:1].upper() + w[1:] for w in name.replace('&', ' & ').split())


def generated(items):
    """(name, components, is a drink) for every plate here. items: gamedata's items (for names)."""
    n = lambda i: title(items[i]['name'])
    out = [(name, comps, False) for name, comps in RAW_PLATES] + [(name, comps, True) for name, comps in RAW_DRINKS]
    pair = lambda a, b, name: out.append((name, [a, b], False)) if frozenset((a, b)) not in NOT and a != b else None
    for m in MEATS:
        for s in MEAT_SIDES + (SWEET_SIDES if m in SWEET_MEATS else []): pair(m, s, f'{n(m)} & {n(s)}')
    for m in FISH:
        for s in FISH_SIDES: pair(m, s, f'{n(m)} & {n(s)}')
    for m in EGGS:
        for s in EGG_SIDES: pair(m, s, f'{n(m)} & {n(s)}')
    for m in PIES:
        for s in PIE_SIDES: pair(m, s, f'{n(m)} & {n(s)}')
    for m in SAUCED:
        for s in SAUCES: pair(m, s, f'{n(m)} with {n(s)}')
    for b, tops in BREADS.items():
        for t in tops: pair(b, t, f'{n(t)} on {n(b)}' if b == 'toast' else f'{n(b)} with {n(t)}')
    for p in PUDDINGS:
        for t in TOPPINGS: pair(p, t, f'{n(p)} with {n(t)}')
    for s in SOUPS:
        for a in ALONGSIDE: pair(s, a, f'{n(s)} with {n(a)}')
    for i in ON_THEIR_OWN: out.append((n(i), [i], False))
    return out
