"""Animals: who they are, where they live, and which ingredients they stand behind.

Reference content only (no behaviour). `related_items` are raw ingredient ids;
`home` says where they are found; sprites are in animals.png (see atlas animations).
"""

ANIMALS = {
    'hen':     {'name': 'Hen', 'home': 'farm', 'related_items': ['egg', 'chicken']},
    'rooster': {'name': 'Rooster', 'home': 'farm', 'related_items': []},
    'chick':   {'name': 'Chick', 'home': 'farm', 'related_items': []},
    'cow':     {'name': 'Cow', 'home': 'farm', 'related_items': ['milk', 'beef', 'cheese']},
    'pig':     {'name': 'Pig', 'home': 'farm', 'related_items': ['pork']},
    'sheep':   {'name': 'Sheep', 'home': 'farm', 'related_items': ['mutton']},
    'deer':    {'name': 'Deer', 'home': 'forest', 'related_items': ['venison']},
    'horse':   {'name': 'Horse', 'home': 'inn', 'related_items': []},
    'duck':    {'name': 'Duck', 'home': 'river', 'related_items': []},
    'duckling': {'name': 'Duckling', 'home': 'river', 'related_items': []},
    'cat':     {'name': 'Inn cat', 'home': 'inn', 'related_items': []},
}

# Ambient loops tied to existing forage nodes: loop -> node it plays over
AMBIENT = {'bees': 'beehive', 'jumping_trout': 'fishing_spot'}
