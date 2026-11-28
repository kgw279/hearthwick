"""Inn supplies: what the rooms and hall use up, as opposed to the kitchen's ingredients and tableware.
They're bought at the General Store and kept in the inn's chests, crates and wardrobes, where they show
under the Inn tab of the inventory (kitchen things show under Kitchen)."""
from art_supplies import BEDDING, ITEMS

SELLER = 'grocer'                      # the General Store
SUPPLIES = {                           # id: (name, value)
    'pillow': ('Pillow', 6), 'bed_linens': ('Bed linens', 8), 'candles': ('Candles', 3), 'soap': ('Soap', 2),
}
# Bedding (pillows, linens) is made up in a bed; a guest who sleeps there leaves it used, and it goes
# to the wash tub like tableware: used -> wet -> clean.
#   used_<id>  slept in; washing gives a wet one
#   wet_<id>   washed; drying gives back the clean one
# Soap and candles are used up by a guest who wanted them.
assert set(SUPPLIES) | {f'{k}_{b}' for b in BEDDING for k in ('used', 'wet')} == {n for n, _ in ITEMS}


def items():
    base = lambda iid: {'kind': 'supply', 'tags': [], 'shelf_life_days': None, 'made_by': [],
                        'used_in': {'items': [], 'dishes': []}, 'sprite': {'sheet': 'supply_items', 'frame': iid}}
    out = {}
    for iid, (name, v) in SUPPLIES.items():
        out[iid] = dict(base(iid), name=name, value=v, sources=[{'type': 'shop', 'shop': SELLER, 'price': v}])
        if iid in BEDDING:
            out[iid]['dirty'] = f'used_{iid}'
            out[f'used_{iid}'] = dict(base(f'used_{iid}'), name=f'Used {name.lower()}', value=0, washes_to=f'wet_{iid}',
                                      sources=[{'type': 'used', 'note': 'slept on by a guest'}])
            out[f'wet_{iid}'] = dict(base(f'wet_{iid}'), name=f'Wet {name.lower()}', value=0, dries_to=iid,
                                     sources=[{'type': 'washed', 'note': 'washed at the wash tub, still to dry'}])
    return out


def stock():
    return [(iid, v) for iid, (_n, v) in SUPPLIES.items()]
