"""Revisions to the transcribed prototype (and earlier packs) that change existing steps.

Content packs may only ADD steps. Changes to steps that already exist live here, applied
last in gamedata.merged(), so the prototype transcription in design_src.py stays faithful
and every deviation from it is listed in one place.
"""

# Steps that cook in (or mix with) water. Each (station, input) single-input step becomes a
# two-input step: (water, input) -> same output.
NEEDS_WATER = {
    'pot': ['wheat', 'potato', 'dicedpot', 'carrot', 'slcarrot', 'noodles', 'egg', 'dough',
            'herbs', 'chherbs', 'mushroom', 'slmush', 'trout', 'fillet', 'onion', 'dicedonion',
            'beef', 'dicedbeef', 'venison', 'dicedven', 'mutton', 'dicedmut', 'honey'],
    'bowl': ['flour'],
}


def apply(tx, combo):
    for st, inputs in NEEDS_WATER.items():
        for src in inputs:
            if src not in tx.get(st, {}):
                raise ValueError(f'revisions: {st}+{src} is not an existing step')
            out = tx[st].pop(src)
            combo.setdefault(st, []).append(('water', src, out))


# Shops the prototype left without a building sprite: shop id -> frame in buildings.png
SHOP_BUILDINGS = {'dairy': 'dairy', 'fish': 'fishmonger', 'spice': 'spice_shop'}
