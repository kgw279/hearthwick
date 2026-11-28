"""Inn supplies: what the rooms and hall use up, as opposed to the kitchen's ingredients and tableware.
They're bought at the General Store and kept in the inn's chests, crates and wardrobes, where they show
under the Inn tab of the inventory (kitchen things show under Kitchen)."""
from art_supplies import ITEMS

SELLER = 'grocer'                      # the General Store
SUPPLIES = {                           # id: (name, value)
    'pillow': ('Pillow', 6), 'bed_linens': ('Bed linens', 8), 'candles': ('Candles', 3), 'soap': ('Soap', 2),
}
assert set(SUPPLIES) == {n for n, _ in ITEMS}


def items():
    return {iid: {'name': name, 'kind': 'supply', 'tags': [], 'value': v, 'shelf_life_days': None,
                  'sprite': {'sheet': 'supply_items', 'frame': iid}, 'made_by': [],
                  'used_in': {'items': [], 'dishes': []},
                  'sources': [{'type': 'shop', 'shop': SELLER, 'price': v}]}
            for iid, (name, v) in SUPPLIES.items()}


def stock():
    return [(iid, v) for iid, (_n, v) in SUPPLIES.items()]
