"""Furniture: pieces the inn can buy, place and rearrange. Each is an item while it's bought and carried
(packed up in the bag, weighing nothing much), and a prop once it's set down in the inn. Their item icon
is the piece itself. Sold at the Furnisher's.

  id       the item (and the prop it becomes; a piece that comes in an animation, like the hearth, names it)
  name     what it's called
  price    what the Furnisher charges
  layer    'floor' (rugs), 'wall' (paintings, sconces) or None (stands on the floor)
  extras   how the prop is placed: its art if it's an animation, footprint depth, collider, what it does (a
           clock tells the time)
"""
SELLER = 'furnisher'
SHOP = ('Hearth & Home Furnishings', 'house_red')   # name, building

FURNITURE = {   # id: (name, price, sheet, frame, layer, prop extras)
    'bed': ('Bed', 40, 'interior', 'bed', None, {'depth': 26}),
    'nightstand': ('Nightstand', 12, 'interior', 'nightstand', None, {}),
    'wardrobe': ('Wardrobe', 30, 'furniture', 'wardrobe', None, {}),
    'chest': ('Chest', 18, 'interior', 'chest', None, {'collider': 'small'}),
    'armchair': ('Armchair', 22, 'furniture', 'armchair', None, {}),
    'floor_lamp': ('Floor lamp', 14, 'furniture', 'floor_lamp', None, {'collider': 'small'}),
    'potted_plant': ('Potted plant', 6, 'interior', 'potted_plant', None, {'collider': 'small'}),
    'rug': ('Rug', 10, 'interior', 'rug', 'floor', {}),
    'hearth': ('Hearth', 60, 'interior', 'fireplace', None, {'sprite': 'anim:fireplace', 'fps': 4}),
    'deco_painting': ('Painting', 15, 'furniture', 'deco_painting', 'wall', {}),
    'deco_sconce': ('Wall sconce', 8, 'furniture', 'deco_sconce', 'wall', {}),
    'bookshelf': ('Bookshelf', 20, 'furniture', 'bookshelf', None, {}),
    'cupboard': ('Cupboard', 20, 'furniture', 'cupboard', None, {}),
    'crate': ('Crate', 6, 'props', 'crate', None, {}),
    'barrel': ('Barrel', 12, 'props', 'barrel', None, {}),
    'keg': ('Keg', 20, 'interior', 'keg', None, {}),
    'wall_clock': ('Wall clock', 16, 'furniture', 'wall_clock', 'wall', {'behavior': {'type': 'clock'}}),
    'standing_clock': ('Standing clock', 35, 'furniture', 'standing_clock', None, {'behavior': {'type': 'clock'}}),
}


def items():
    out = {}
    for iid, (name, price, sheet, frame, layer, extra) in FURNITURE.items():
        prop = {'sprite': extra.get('sprite', frame), **{k: v for k, v in extra.items() if k != 'sprite'}}
        if layer: prop['layer'] = layer
        out[iid] = {'name': name, 'kind': 'furniture', 'tags': [], 'value': price, 'shelf_life_days': None,
                    'sprite': {'sheet': sheet, 'frame': frame}, 'made_by': [], 'used_in': {'items': [], 'dishes': []},
                    'prop': prop, 'sources': [{'type': 'shop', 'shop': SELLER, 'price': price}]}
    return out


def stock():
    return [(iid, price) for iid, (_n, price, *_r) in FURNITURE.items()]

