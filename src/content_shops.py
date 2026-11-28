"""What each shop might have out: a themed pool, of which a handful is on the shelves at a time. As the
day goes on things sell (to other folk) and run out, and something else from the pool takes their place:
a different selection on each visit, never in a hurry. Some things a shop always carries.

  POOL    extra things a shop might carry, beyond what it's always stocked (gamedata merges them)
  SHELF   how many things from the pool are out at once
  ALWAYS  kinds of item a shop always has out, whatever else is on the shelves
"""

POOL = {
    'mill': ['rolled_oats', 'bread_loaf', 'bread_rolls', 'flatbread', 'oatcakes', 'shortbread', 'butter', 'honey'],
    'grocer': ['apple', 'mushroom', 'herbs', 'pickled_onions', 'pickled_carrots', 'berries'],
    'dairy': ['butter', 'clotted_cream', 'whipped_cream', 'egg', 'grated_cheese'],
    'butcher': ['bacon', 'sausage_meat', 'salt_beef'],
    'fish': [],
    'spice': ['cracked_pepper', 'herbs', 'chopped_herbs', 'honey_syrup'],
    'market': [],
}
SHELF = {'mill': 5, 'grocer': 5, 'dairy': 4, 'butcher': 4, 'fish': 3, 'spice': 4, 'market': 6}
ALWAYS = {'grocer': ('tableware', 'supply')}   # the General Store always has plates, mugs, pillows...
MARKUP = 1.5                                   # a pool extra's price: its worth, marked up
