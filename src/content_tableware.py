"""Tableware: what the inn serves on. Plates, bowls, mugs and cutlery are a resource: bought (the
General Store sells every tier), used (a served guest leaves them dirty), washed at the wash tub, and
upgraded by buying a better tier. They're items like any other, so they fill bag and storage slots.

  <material>_<kind>        clean, e.g. wood_plate, clay_mug, pewter_cutlery
  dirty_<material>_<kind>  after use; washing gives back the clean one
Tiers, cheapest first: plates, bowls and mugs in wood, clay, pewter; cutlery in wood, iron, pewter.
"""
from art_tableware import item_ids

SELLER = 'grocer'                      # the General Store
VALUE = {1: 2, 2: 5, 3: 10}            # by tier: what it's worth (and what the shop charges)
NAMES = {'wood': 'Wooden', 'clay': 'Clay', 'iron': 'Iron', 'pewter': 'Pewter'}
KINDS = {'plate': 'plate', 'bowl': 'bowl', 'mug': 'mug', 'cutlery': 'cutlery'}


def items():
    """id -> item record (gamedata's item shape) for every piece, clean and dirty."""
    out = {}
    for iid, kind, mat, tier in item_ids():
        base = {'kind': 'tableware', 'tags': [], 'shelf_life_days': None, 'made_by': [],
                'used_in': {'items': [], 'dishes': []}, 'tableware': {'kind': kind, 'material': mat, 'tier': tier}}
        out[iid] = dict(base, name=f'{NAMES[mat]} {KINDS[kind]}', value=VALUE[tier],
                        sprite={'sheet': 'tableware_items', 'frame': iid}, dirty=f'dirty_{iid}',
                        sources=[{'type': 'shop', 'shop': SELLER, 'price': VALUE[tier]}])
        out[f'dirty_{iid}'] = dict(base, name=f'Dirty {NAMES[mat].lower()} {KINDS[kind]}', value=0,
                                   sprite={'sheet': 'tableware_items', 'frame': f'dirty_{iid}'}, washes_to=iid,
                                   sources=[{'type': 'used', 'note': 'left dirty by a served guest'}])
    return out


def stock():
    """The General Store's tableware stock: every clean piece."""
    return [(iid, VALUE[tier]) for iid, _k, _m, tier in item_ids()]
