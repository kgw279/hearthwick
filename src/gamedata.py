"""Build dist/gamedata.json from design_src.py and validate the whole recipe graph.

The atlas says where pictures are. This file says what things ARE.
Every item's `sprite` points at a frame in the atlas.
"""
import json, math, os, re, unicodedata
import content_economy
import design_src as D
import content_wheat
import content_eggs
import content_milk
import content_water
import content_seasoning
import content_chicken
import content_pork
import content_oats
import content_drinks
import revisions
import content_animals
import content_tableware
import content_supplies
import art_supplies
import art_tableware

# Content packs layered on top of the prototype design. Each may add items,
# prep steps (TX), combos and dishes, but may never change an existing step.
PACKS = {'wheat': content_wheat, 'eggs': content_eggs, 'milk': content_milk, 'water': content_water, 'seasoning': content_seasoning, 'chicken': content_chicken, 'pork': content_pork, 'oats': content_oats, 'drinks': content_drinks}


def merged():
    ing, cdef = dict(D.ING), dict(D.CDEF)
    tx, combo = {k: dict(v) for k, v in D.TX.items()}, {k: list(v) for k, v in D.COMBO.items()}
    item_pack = {k: 'prototype' for k in list(D.ING) + list(D.CDEF)}
    for pname, P in PACKS.items():
        for k, v in getattr(P, 'RAW', {}).items():     # new raw ingredients: id -> (name, life, tags, value)
            if k in cdef or k in ing: raise ValueError(f'{pname}: raw item {k} already exists')
            ing[k] = v; item_pack[k] = pname
        for k, v in P.ITEMS.items():
            if k in cdef or k in ing: raise ValueError(f'{pname}: item {k} already exists')
            cdef[k] = v; item_pack[k] = pname
        for st, table in P.TX.items():
            for src, out in table.items():
                if src in tx.setdefault(st, {}): raise ValueError(f'{pname}: {st}+{src} already makes {tx[st][src]}')
                tx[st][src] = out
        for st, combos in P.COMBO.items():
            combo.setdefault(st, []).extend(combos)
    revisions.apply(tx, combo)   # changes to existing steps (e.g. boiling needs water)
    return ing, cdef, tx, combo, item_pack
from items_art import has_sprite
import art_wheat  # noqa: F401  (registers the wheat pack's sprites)
import art_eggs  # noqa: F401
import art_milk  # noqa: F401
import art_water  # noqa: F401
import art_seasoning  # noqa: F401
import art_chicken  # noqa: F401
import art_pork  # noqa: F401
import art_oats  # noqa: F401
import art_drinks  # noqa: F401

SCHEMA = 'hearthwick.gamedata/1'
RAW_RENAME = {'nuts': 'acorns', 'pepper': 'ember_pepper'}


def slug(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    s = s.replace('&', 'and').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


def build_ids(ing, cdef):
    ids = {}
    for lid, (name, *_r) in ing.items():
        ids[lid] = RAW_RENAME.get(lid, slug(name))
    for lid, (name, *_r) in cdef.items():
        ids[lid] = slug(name)
    if len(set(ids.values())) != len(ids):
        raise ValueError('item id collision')
    return ids


def dish_tags(components, explicit, item_tags):
    if explicit:
        return [t for t in D.TAGS if t in explicit]
    t = set()
    for c in components:
        t |= set(item_tags[c])
    if ('sweet' in t and 'fish' in t) or ('fish' in t and 'meat' in t):
        t.add('odd')
    return [x for x in D.TAGS if x in t]


FORAGE_NODES = {   # node -> (yields, spot or None if not part of the prototype's spots)
    'wild_wheat': ('wheat', 'meadow'), 'herb_patch': ('herbs', 'meadow'), 'bird_nest': ('egg', 'meadow'),
    'beehive': ('honey', 'meadow'), 'berry_bush': ('berries', 'forest'), 'mushroom_patch': ('mushroom', 'forest'),
    'oak_tree': ('acorns', 'forest'), 'game_trail': ('venison', 'forest'), 'fishing_spot': ('trout', 'river'),
    'cress_patch': ('cress', 'river'), 'onion_patch': ('onion', 'river'), 'apple_tree': ('apple', 'orchard'),
    'carrot_patch': ('carrot', None), 'potato_patch': ('potato', None), 'tomato_vine': ('tomato', None),
    'water_well': ('water', None),
    'oat_patch': ('oats', None),
}


def item_steps(iid, items, seen=()):
    """Fewest prep steps to make an item from raw ingredients (0 for raw)."""
    it = items[iid]
    if it['kind'] == 'raw':
        return 0
    best = None
    for m in it['made_by']:
        if any(i in seen or i == iid for i in m['inputs']):
            continue
        n = 1 + sum(item_steps(i, items, seen + (iid,)) for i in m['inputs'])
        best = n if best is None else min(best, n)
    return best if best is not None else 99


def descendants(ing, items):
    """Every item that has a recipe path starting from `ing`."""
    out, changed = {ing}, True
    while changed:
        changed = False
        for iid, it in items.items():
            if iid not in out and any(any(i in out for i in m['inputs']) for m in it['made_by']):
                out.add(iid); changed = True
    return out


def ancestors(iid, items, seen=None):
    """Every item that appears anywhere in some recipe for iid."""
    seen = set() if seen is None else seen
    for m in items[iid]['made_by']:
        for i in m['inputs']:
            if i not in seen:
                seen.add(i); ancestors(i, items, seen)
    return seen


def dish_steps(d, items):
    return sum(item_steps(c, items) for c in d['components'])


def build():
    ING, CDEF, TX, COMBO, item_pack = merged()
    ids = build_ids(ING, CDEF)
    items, dishes = {}, {}
    item_tags = {}
    for lid, (name, life, tags, value) in ING.items():
        iid = ids[lid]
        items[iid] = {'name': name, 'kind': 'raw', 'tags': tags, 'value': value, 'shelf_life_days': life,
                      'sprite': {'sheet': 'food', 'frame': iid},
                      'legacy_id': lid if item_pack[lid] == 'prototype' else None, 'pack': item_pack[lid],
                      'sources': [], 'made_by': [], 'used_in': {'items': [], 'dishes': []}}
        item_tags[lid] = tags
    for lid, (name, base, tags, value, life, method) in CDEF.items():
        iid = ids[lid]
        items[iid] = {'name': name, 'kind': 'prepared', 'tags': tags, 'value': value, 'shelf_life_days': life,
                      'method': method, 'base': ids[base] if base else None,
                      'sprite': {'sheet': 'food', 'frame': iid}, 'legacy_id': lid if item_pack[lid] == 'prototype' else None,
                      'pack': item_pack[lid],
                      'sources': [], 'made_by': [], 'used_in': {'items': [], 'dishes': []}}
        item_tags[lid] = tags

    stations = {}
    all_stations = dict(D.STATIONS)
    for pname, P in PACKS.items():   # packs may add stations
        for sid, v in getattr(P, 'STATIONS', {}).items():
            if sid in all_stations: raise ValueError(f'{pname}: station {sid} already exists')
            all_stations[sid] = v
    for sid, (name, verb, method, sprite) in all_stations.items():
        stations[sid] = {'name': name, 'verb': verb, 'method': method, 'sprite': {'sheet': 'stations', 'frame': sprite}}

    for st, table in TX.items():
        for src, out in table.items():
            items[ids[out]]['made_by'].append({'station': st, 'inputs': [ids[src]]})
            items[ids[src]]['used_in']['items'].append(ids[out])
    for st, combos in COMBO.items():
        for c in combos:
            *ins, out = c
            items[ids[out]]['made_by'].append({'station': st, 'inputs': sorted(ids[i] for i in ins)})
            for i in ins:
                if ids[out] not in items[ids[i]]['used_in']['items']:
                    items[ids[i]]['used_in']['items'].append(ids[out])

    for lid, name, comps, tags, value, origin in D.RECIPES:
        did = 'dish_' + slug(name)
        dishes[did] = {'name': name, 'components': sorted(ids[c] for c in comps), 'station': 'plate',
                       'tags': dish_tags(comps, tags, item_tags), 'value': value, 'origin_folk': origin,
                       'starter': lid in D.START_RECIPES, 'sprite': {'sheet': 'food', 'frame': did}, 'legacy_id': lid,
                       'pack': 'prototype'}
        for c in comps:
            items[ids[c]]['used_in']['dishes'].append(did)

    extra = [(n, c, v, 'simple_meals') for n, c, v in D.SIMPLE_RECIPES]
    for pname, P in PACKS.items():
        extra += [(n, c, v, pname) for n, c, v in P.RECIPES]
    for name, comps, value, pack in extra:
        did = 'dish_' + slug(name)
        if did in dishes:
            raise ValueError(f'duplicate dish {did}')
        dishes[did] = {'name': name, 'components': sorted(ids[c] for c in comps), 'station': 'plate',
                       'tags': dish_tags(comps, None, item_tags), 'value': value, 'origin_folk': None,
                       'starter': False, 'sprite': {'sheet': 'food', 'frame': did}, 'legacy_id': None, 'pack': pack}
        for c in comps:
            items[ids[c]]['used_in']['dishes'].append(did)

    # food or drink: each source lists its drink dishes by name
    drink_names = list(D.SIMPLE_DRINKS) + [n for P in PACKS.values() for n in getattr(P, 'DRINKS', [])]
    drinks = {'dish_' + slug(n) for n in drink_names}
    missing = drinks - set(dishes)
    if missing: raise ValueError(f'DRINKS names that are not dishes: {sorted(missing)}')
    for did, d in dishes.items():
        d['kind'] = 'drink' if did in drinks else 'food'

    # list dishes simplest-first: fewest prep steps from raw ingredients
    order = sorted(dishes, key=lambda d: (dish_steps(dishes[d], items), len(dishes[d]['components'])))
    dishes = {d: dishes[d] for d in order}

    spots = {}
    for sid, (name, finds) in D.SPOTS.items():
        spots[sid] = {'name': name, 'finds': {ids[k]: v for k, v in finds.items()},
                      'nodes': [n for n, (y, sp) in FORAGE_NODES.items() if sp == sid]}
        for k in finds:
            items[ids[k]]['sources'].append({'type': 'forage', 'spot': sid})
    nodes = {}
    for n, (y, sp) in FORAGE_NODES.items():
        nodes[n] = {'yields': y, 'spot': sp, 'states': {'ready': f'{n}_ready', 'harvested': f'{n}_harvested'},
                    'sprite_sheet': 'forage'}
        if sp is None:
            items[y]['sources'].append({'type': 'forage_node', 'node': n, 'note': 'extra node, not in the prototype spots'})
    # orchard also grows acorns + honey: point those nodes at the orchard too
    spots['orchard']['nodes'] += ['oak_tree', 'beehive']

    shops = {}
    for sh, (name, stock, building) in D.SHOPS.items():
        building = building or revisions.SHOP_BUILDINGS.get(sh)
        if stock == 'rotating':
            shops[sh] = {'name': name, 'stock': 'rotating', 'pool': [ids[i] for i in D.MARKET_POOL], 'building': building}
            continue
        shops[sh] = {'name': name, 'stock': [{'item': ids[i], 'price': p} for i, p in stock], 'building': building}
        for i, p in stock:
            items[ids[i]]['sources'].append({'type': 'shop', 'shop': sh, 'price': p})
    # tableware: bought at the General Store, left dirty by guests, washed back (content_tableware.py)
    for iid, it in content_tableware.items().items():
        if iid in items: raise ValueError(f'tableware {iid} already exists')
        items[iid] = it
    for iid, p in content_tableware.stock():
        shops[content_tableware.SELLER]['stock'].append({'item': iid, 'price': p})
    # inn supplies: pillows, linens... kept in the inn's chests and wardrobes (content_supplies.py)
    for iid, it in content_supplies.items().items():
        if iid in items: raise ValueError(f'supply {iid} already exists')
        items[iid] = it
    for iid, p in content_supplies.stock():
        shops[content_supplies.SELLER]['stock'].append({'item': iid, 'price': p})
    for pname, P in PACKS.items():   # packs may add stock to existing shops
        for sh, stock in getattr(P, 'SHOP_STOCK', {}).items():
            for i, p in stock:
                shops[sh]['stock'].append({'item': ids[i], 'price': p, 'pack': pname})
                items[ids[i]]['sources'].append({'type': 'shop', 'shop': sh, 'price': p})

    # economy: daily quantities, what each shop buys back, market pool prices
    cheapest = {}
    for sh in shops.values():
        if sh['stock'] == 'rotating': continue
        for st in sh['stock']:
            st['daily_qty'] = content_economy.daily_qty(st['price'])
            cheapest[st['item']] = min(st['price'], cheapest.get(st['item'], st['price']))
        sh['buys'] = sorted({st['item'] for st in sh['stock']})
    E = content_economy.ECONOMY
    for sh in shops.values():
        if sh['stock'] != 'rotating': continue
        pool = []
        for i in sh['pool']:
            price = cheapest.get(i) or math.ceil(items[i]['value'] * E['market_markup'])
            pool.append({'item': i, 'price': price, 'daily_qty': content_economy.daily_qty(price)})
        sh['pool'] = pool
        sh['daily_items'] = E['market_daily_items']
        sh['buys'] = sorted(i for i, it in items.items() if it['kind'] == 'raw')

    animals = {}
    for aid, a in content_animals.ANIMALS.items():
        bad = [i for i in a['related_items'] if i not in items]
        if bad: raise ValueError(f'animal {aid}: unknown items {bad}')
        animals[aid] = dict(a, sprite={'sheet': 'animals', 'animations_prefix': aid})
    for loop, node in content_animals.AMBIENT.items():
        if node not in nodes: raise ValueError(f'ambient {loop}: unknown forage node {node}')

    for iid, it in items.items(): it['store'] = store_class(it, dishes)
    data = {
        'schema': SCHEMA,
        'animals': animals,
        'ambient': {k: {'plays_over_node': v, 'sheet': 'ambient', 'animation': k} for k, v in content_animals.AMBIENT.items()},
        'tags': {t: {'color': c, 'icon': f'tag_{t}'} for t, c in D.TAGS.items()},
        'stations': stations,
        'items': items,
        'dishes': dishes,
        'forage_spots': spots,
        'forage_nodes': nodes,
        'shops': shops,
        'folk': {f: {'name': n, 'likes': l, 'hates': h, 'odd': o} for f, (n, l, h, o) in D.FOLK.items()},
        'economy': {k: v for k, v in content_economy.ECONOMY.items() if not k.startswith('market_')},
        'rules': {'odd_tag': D.ODD_RULE,
                  'recipe_match': 'a dish is made on the plate station from exactly its components, in any order'},
    }
    return data


STORES = {
    'pantry': 'raw ingredients: crates, chests and cupboards',
    'shelf': 'prepped food: shelves',
    'cask': 'drinks: barrels and kegs',
    'tableware': 'plates, bowls, mugs, cutlery: crates, chests and cupboards',
    'supply': "the inn's supplies: crates, chests and wardrobes",
}


def store_class(it, dishes):
    """Where an item is kept in the inn (STORES). A prepared item is a drink if it's brewed, or every dish
    it goes into is a drink."""
    if it['kind'] in ('tableware', 'supply'): return it['kind']
    if it['kind'] == 'raw': return 'pantry'
    into = [dishes[d]['kind'] for d in it['used_in']['dishes']]
    if it.get('method') == 'ferment' or (into and all(k == 'drink' for k in into)): return 'cask'
    return 'shelf'


def validate(data):
    errs, warns = [], []
    items, dishes = data['items'], data['dishes']
    for iid, it in items.items():
        for m in it['made_by']:
            for i in m['inputs']:
                if i not in items: errs.append(f'{iid}: unknown input {i}')
            if m['station'] not in data['stations']: errs.append(f'{iid}: unknown station {m["station"]}')
        if it['kind'] == 'raw' and not it['sources']:
            errs.append(f'{iid}: raw item has no source')
        if it['kind'] == 'prepared' and not it['made_by']:
            errs.append(f'{iid}: prepared item has no recipe')
        if it.get('store') not in STORES: errs.append(f'{iid}: unknown store {it.get("store")}')
        if it['kind'] == 'supply':
            if not art_supplies.has(iid): errs.append(f'{iid}: missing sprite')
            continue
        if it['kind'] == 'tableware':
            if not art_tableware.has(iid): errs.append(f'{iid}: missing sprite')
            if it.get('washes_to') and it['washes_to'] not in items: errs.append(f'{iid}: washes to unknown {it["washes_to"]}')
            continue
        if not it['used_in']['items'] and not it['used_in']['dishes']:
            warns.append(f'{iid}: not used in anything (sell-only / future content)')
        if not has_sprite(iid): errs.append(f'{iid}: missing sprite')
    for did, d in dishes.items():
        for c in d['components']:
            if c not in items: errs.append(f'{did}: unknown component {c}')
        if not has_sprite(did): errs.append(f'{did}: missing sprite')
    keys = {}
    for did, d in dishes.items():
        k = '+'.join(d['components'])
        if k in keys: errs.append(f'{did} and {keys[k]} have the same components')
        keys[k] = did
    # reachability: everything must be obtainable from raw sources
    have = {i for i, it in items.items() if it['sources']}
    changed = True
    while changed:
        changed = False
        for iid, it in items.items():
            if iid not in have and any(all(i in have for i in m['inputs']) for m in it['made_by']):
                have.add(iid); changed = True
    for iid in items:
        if iid not in have: errs.append(f'{iid}: cannot be obtained')
    for did, d in dishes.items():
        if not all(c in have for c in d['components']): errs.append(f'{did}: cannot be cooked')
    return errs, warns


def write(out_dir):
    data = build()
    errs, warns = validate(data)
    data['validation'] = {'errors': errs, 'warnings': warns,
                          'counts': {'raw': sum(1 for i in data['items'].values() if i['kind'] == 'raw'),
                                     'prepared': sum(1 for i in data['items'].values() if i['kind'] == 'prepared'),
                                     'dishes': len(data['dishes'])}}
    with open(os.path.join(out_dir, 'gamedata.json'), 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    if errs:
        raise SystemExit('gamedata errors:\n  ' + '\n  '.join(errs))
    return data


if __name__ == '__main__':
    d = write(os.path.join(os.path.dirname(__file__), '..', 'dist'))
    print(d['validation']['counts'], len(d['validation']['warnings']), 'warnings')
