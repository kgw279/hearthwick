"""Build every sprite sheet, the JSON atlas and review images.

    python3 src/build.py            -> writes into ./dist
"""
import json, os, random, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from core import PAL  # noqa: E402
from art_ground import GROUND_TILES, VARIANTS as PAVE_VARIANTS  # noqa: E402
from art_town import TOWN_BUILDINGS, TOWN_PROPS, TOWN_ANIMATIONS  # noqa: E402
from art_iwalls import IWALLS  # noqa: E402
from art_walldecor import WALL_DECOR  # noqa: E402
from art_clocks import CLOCKS  # noqa: E402
from art_kitchen import PLATING, KITCHEN, BAR  # noqa: E402
from art_tableware import ITEMS as TABLEWARE_ITEMS, TABLES, CHAIRS  # noqa: E402
from art_supplies import ITEMS as SUPPLY_ITEMS  # noqa: E402
from art_service import SERVICE  # noqa: E402
from art_tags import ICONS as TAG_ICONS  # noqa: E402
from art_cliffs import CLIFFS  # noqa: E402
from art_houses import HOUSES  # noqa: E402
from sprites import TILES, PROPS, grass  # noqa: E402
from sprites2 import AUTOTILES, BUILDINGS, STATIONS, VARIANTS, grass_v, dirt_v, water_v, corner_mask  # noqa: E402
from sprites3 import CHARACTERS, CHAR_LOOKS, CHAR_VIEWS, INTERIOR  # noqa: E402
from sprites4 import FOLK, FOLK_NAMES, SHOPS  # noqa: E402
import gamedata  # noqa: E402
from items_art import sprite_for  # noqa: E402
from sprites5 import PATHS, PATH_VARIANTS, CONNECTORS, connector, path_mask, WALL_KIT, FORAGE  # noqa: E402
from ui_build import build_ui, mock_hud, mock_menus, mock_prompts, mock_ui_kit  # noqa: E402
from sprites7 import TABLEWARE  # noqa: E402
from sprites8 import ACTIONS, ANIMATED, LOOPS, SITTERS  # noqa: E402
from sprites9 import ANIMALS, AMBIENT, FARM_PROPS, SPECIES, ACTION_NAME, CARTS, WAGONS, WAGONS_NS  # noqa: E402
from sprites6 import WALL_KIT2, FLOOR_TRANSITIONS, FURNITURE, STAIRS, STAIRS_SMALL, CAP_KINDS, FLOOR_PAIRS  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'dist')
CELL = 32
TILE_VARIANTS = [(f'{n}_v{v}', (lambda f=f, v=v: f(v))) for n, f in (('grass', grass_v), ('dirt_path', dirt_v), ('water', water_v)) for v in (1, 2)]
CONNECTOR_TILES = {(n, v): connector(idx, conn, v) for n, idx, conn in CONNECTORS for v in range(PATH_VARIANTS)}


def vpick(x, y, n):
    """Deterministic per-cell variant choice (same one every time the map is drawn)."""
    return (x * 73856093 ^ y * 19349663) % 97 % n


def food_entries(data):
    """Every item then every dish, in game-data order: raw, prepared, dishes."""
    order = ([i for i, it in data['items'].items() if it['kind'] == 'raw'] +
             [i for i, it in data['items'].items() if it['kind'] == 'prepared'] + list(data['dishes']))
    return [(i, sprite_for(i)) for i in order]


def build_groups(data):
    """name -> (list of (key, Sprite), cell_w, cell_h, cols, preview background)"""
    return {
        'tiles': ([(n, f()) for n, f in TILES] + [(n, f()) for n, f in TILE_VARIANTS] + GROUND_TILES + [(n, f()) for n, f in CLIFFS], 32, 32, 8, None),
        'terrain_grass_dirt': ([(f'grass_dirt_{i:02d}_v{v}', AUTOTILES['grass_dirt'][v][i]) for v in range(VARIANTS) for i in range(16)], 32, 32, 16, None),
        'terrain_grass_water': ([(f'grass_water_{i:02d}_v{v}', AUTOTILES['grass_water'][v][i]) for v in range(VARIANTS) for i in range(16)], 32, 32, 16, None),
        'terrain_path': ([(f'path_{i:02d}_v{v}', PATHS[v][i]) for v in range(PATH_VARIANTS) for i in range(16)]
                         + [(f'{n}_v{v}', CONNECTOR_TILES[(n, v)]) for v in range(PATH_VARIANTS) for n, _, _ in CONNECTORS], 32, 32, 16, None),
        'buildings': ([(n, f()) for n, f in BUILDINGS + SHOPS + TOWN_BUILDINGS + HOUSES], 64, 64, 4, 'grass'),
        # the houses are drawn at building size now (art_houses.py), not with the small props
        'props': ([(n, f()) for n, f in PROPS + TOWN_PROPS if not n.startswith('house_')], 32, 32, 8, 'grass'),
        'forage': ([(f'{n}_{st}', f(st == 'ready')) for n, f, _ in FORAGE for st in ('ready', 'harvested')], 32, 32, 8, 'grass'),
        'walls': ([(n, f()) for n, f in WALL_KIT], 32, 32, 10, 'floor'),
        'interior_walls': ([(n, f()) for n, f in WALL_KIT2 + IWALLS], 32, 32, 18, 'void'),
        'floor_transitions': ([(n, f()) for n, f in FLOOR_TRANSITIONS], 32, 32, 16, None),
        'furniture': ([(n, f()) for n, f in FURNITURE + STAIRS_SMALL + WALL_DECOR + CLOCKS], 32, 32, 8, 'floor'),
        'stairs': ([(n, f()) for n, f in STAIRS], 32, 64, 4, 'floor'),
        'stations': ([(n, f()) for n, f, _ in STATIONS] + [(n, f()) for n, f in KITCHEN], 32, 32, 8, 'floor'),
        'tableware': ([(n, f()) for n, f in TABLEWARE], 32, 32, 6, 'floor'),
        'actions': ([(n, f()) for n, f in ACTIONS], 32, 32, 12, 'floor'),
        'animated': ([(n, f()) for n, f in ANIMATED], 32, 32, 12, 'floor'),
        'animals': ([(n, f()) for n, f in ANIMALS], 32, 32, 14, 'grass'),
        'ambient': ([(n, f()) for n, f in AMBIENT], 32, 32, 8, 'grass'),
        'farm': ([(n, f()) for n, f in FARM_PROPS], 32, 32, 5, 'grass'),
        'carts': ([(n, f()) for n, f in CARTS], 32, 32, 4, 'grass'),
        'wagons': ([(n, f()) for n, f in WAGONS], 64, 32, 3, 'grass'),
        'wagons_ns': ([(n, f()) for n, f in WAGONS_NS], 32, 64, 4, 'grass'),
        'interior': ([(n, f()) for n, f in INTERIOR if n != 'bar_counter'] + [(n, f()) for n, f in BAR], 32, 32, 8, 'floor'),
        'characters': ([(n, f()) for n, f in CHARACTERS], 32, 32, 12, 'grass'),
        'guests': ([(n, f()) for n, f in FOLK], 32, 32, 12, 'grass'),
        'food': (food_entries(data), 32, 32, 16, 'cream'),
        'tableware_items': ([(n, f()) for n, f in TABLEWARE_ITEMS], 32, 32, 12, 'cream'),
        'supply_items': ([(n, f()) for n, f in SUPPLY_ITEMS], 32, 32, 4, 'cream'),
        'service': ([(n, f()) for n, f in SERVICE], 32, 32, 9, 'floor'),
        'plating': ([(n, f()) for n, f in PLATING], 64, 32, 1, 'floor'),
        'tags': ([(n, f()) for n, f in TAG_ICONS], 12, 12, 16, 'cream'),
        'tables': ([(n, f()) for n, f in TABLES], 64, 48, 3, 'floor'),
        'chairs': ([(n, f()) for n, f in CHAIRS], 32, 32, 5, 'floor'),
    }


def write_sheet(name, entries, cw, ch, cols):
    rows = (len(entries) + cols - 1) // cols
    im = Image.new('RGBA', (cols * cw, rows * ch), (0, 0, 0, 0))
    frames = {}
    for i, (key, spr) in enumerate(entries):
        x, y = (i % cols) * cw, (i // cols) * ch
        im.paste(spr.image(), (x, y))
        frames[key] = {'x': x, 'y': y, 'w': cw, 'h': ch}
    im.save(os.path.join(OUT, f'{name}.png'))
    return frames


def preview(groups):
    S, pad, label_h, title_h = 3, 10, 14, 22
    font = ImageFont.load_default()
    gt = grass().image()
    floor = dict((n, f) for n, f in TILES)['wood_floor']().image()
    blocks = []
    for g, (entries, cw, ch, cols, bgk) in groups.items():
        if g.startswith('terrain') or g in ('floor_transitions', 'food'):
            continue                                     # these have their own review images                                     # terrain has its own check images
        cols = min(len(entries), cols if g in ('characters', 'guests', 'walls', 'interior_walls', 'food') else max(cols, 8))
        rows = (len(entries) + cols - 1) // cols
        b = Image.new('RGB', (cols * (cw * S + pad) + pad, title_h + rows * (ch * S + label_h + pad) + pad), (42, 27, 45))
        d = ImageDraw.Draw(b)
        d.text((pad, 5), g.upper().replace('_', ' '), fill=(255, 182, 39), font=font)
        for i, (key, spr) in enumerate(entries):
            cx = pad + (i % cols) * (cw * S + pad)
            cy = title_h + (i // cols) * (ch * S + label_h + pad)
            bg = Image.new('RGBA', (cw, ch), (255, 248, 239, 255) if bgk == 'cream' else (0, 0, 0, 0))
            if bgk == 'void':
                bg = Image.new('RGBA', (cw, ch), (34, 32, 52, 255))
            if bgk in ('grass', 'floor'):
                src = gt if bgk == 'grass' else floor
                for ty in range(0, ch, 32):
                    for tx in range(0, cw, 32):
                        bg.paste(src, (tx, ty))
            bg.alpha_composite(spr.image())
            b.paste(bg.resize((cw * S, ch * S), Image.NEAREST), (cx, cy))
            d.text((cx, cy + ch * S + 2), key[:22], fill=(255, 243, 224), font=font)
        blocks.append(b)
    colw = max(b.width for b in blocks)
    left, right, hl, hr = [], [], 0, 0
    for b in blocks:
        if hl <= hr: left.append(b); hl += b.height
        else: right.append(b); hr += b.height
    out = Image.new('RGB', (colw * 2, max(hl, hr)), (42, 27, 45))
    for col, lst in ((0, left), (1, right)):
        y = 0
        for b in lst:
            out.paste(b, (col * colw, y)); y += b.height
    out.save(os.path.join(OUT, 'preview.png'))


# ---------------------------------------------------------------------
# Mock town: corner map for road + pond, a cell map for narrow paths
# ---------------------------------------------------------------------

def write_terrain(out):
    """terrain.json: the shapes behind every ground transition, so the engine can composite any mix of
    grass, road, path and water per pixel (layered: grass < road/path < water) instead of needing a
    pre-drawn tile for every combination. Masks are 32 rows of 8 hex digits (bit 31 = leftmost pixel)."""
    def enc(m):
        return [format(sum(1 << (31 - x) for x in range(32) if row[x]), '08x') for row in m]
    data = {
        'note': 'Ground compositing data for the engine. Layers bottom to top: grass, dirt (road + paths), farmland, cobble, pavers, water, rock wall, earth bank. '
                'corner[v][index]: natural corner-autotile shapes (index TL*1+TR*2+BL*4+BR*8). corner_paved[index]: '
                'the clean-edged shapes laid paving uses. path[v][conn]: narrow-path shapes (conn N*1+E*2+S*4+W*8). '
                'bases: plain textures per variant. edge colours: dirt lip under grass, grass fringe beside dirt and paving, '
                'kerb along cobble and paver edges, earth bank above water (2 rows), foam and shallows.',
        'bases': {'grass': [f'grass_dirt_00_v{v}' for v in range(VARIANTS)],
                  'dirt': [f'grass_dirt_15_v{v}' for v in range(VARIANTS)],
                  'cobble': [f'cobble_v{v}' for v in range(PAVE_VARIANTS)],
                  'pavers': [f'pavers_v{v}' for v in range(PAVE_VARIANTS)],
                  'water': [f'grass_water_15_v{v}' for v in range(VARIANTS)],
                  'cliff_face': 'cliff_face', 'cliff_earth': 'cliff_earth'},
        'edges': {'dirt_lip': PAL['B'], 'grass_fringe': PAL['g'], 'bank': PAL['b'], 'bank_low': PAL['B'],
                  'foam': PAL['p'], 'shallows': PAL['c'], 'cobble_kerb': PAL['d'], 'pavers_kerb': PAL['B'],
                  'flagstone_edge': PAL['e'],
                  # rock: its outline, the dark ledge where its grassy top meets its face, the shade at its foot
                  'rock_outline': PAL['O'], 'rock_ledge': PAL['e'], 'rock_shadow': PAL['g']},
        'floors': {'wood': 'floor_wood_flagstone_00', 'stone': 'floor_wood_flagstone_15'},
        'corner': [[enc(corner_mask(i, v)) for i in range(16)] for v in range(VARIANTS)],
        'corner_paved': [enc(corner_mask(i, 0, amp=0.0)) for i in range(16)],
        'path': [[enc(path_mask(c, v)) for c in range(16)] for v in range(PATH_VARIANTS)],
    }
    with open(os.path.join(out, 'terrain.json'), 'w') as f:
        json.dump(data, f)


def corner_map(w, h):
    """Corner grid (w+1)x(h+1): 0 grass, 1 dirt, 2 water."""
    c = [[0] * (w + 1) for _ in range(h + 1)]
    for x in range(w + 1):
        for y in (7, 8):
            c[y][x] = 1
    for y in range(10, 13):
        for x in range(12, 16):
            c[y][x] = 2
    return c


def corner_tile(c, x, y):
    tl, tr, bl, br = c[y][x], c[y][x + 1], c[y + 1][x], c[y + 1][x + 1]
    kinds = {v for v in (tl, tr, bl, br) if v}
    assert len(kinds) <= 1, 'dirt and water may not share a tile'
    k = kinds.pop() if kinds else 1
    idx = sum(bit << i for i, bit in enumerate(int(v == k) for v in (tl, tr, bl, br)))
    return ('grass_dirt' if k == 1 else 'grass_water'), idx


def path_cells():
    """Narrow paths: set of cells, plus cells whose north side opens into a door."""
    cells, doors = set(), set()
    for col, top in ((3, 2), (8, 2), (11, 4), (14, 4)):           # door paths down to the road
        for y in range(top, 6):
            cells.add((col, y))
        doors.add((col, top))
    for p in [(6, 9), (6, 10), (7, 10), (8, 10), (9, 10), (10, 10), (10, 11)]:   # path to the pond
        cells.add(p)
    return cells, doors


def render_map(w, h, c, cells, doors):
    auto = {k: [[t.image() for t in vv] for vv in v] for k, v in AUTOTILES.items()}
    paths = [[t.image() for t in v] for v in PATHS]
    sc = Image.new('RGBA', (w * 32, h * 32))
    for y in range(h):
        for x in range(w):
            k, idx = corner_tile(c, x, y)
            if (x, y) in cells:
                conn = 0
                for bit, (dx, dy) in ((1, (0, -1)), (2, (1, 0)), (4, (0, 1)), (8, (-1, 0))):
                    nb = (x + dx, y + dy)
                    if nb in cells:
                        conn |= bit
                    elif k == 'grass_dirt' and idx == 0 and 0 <= nb[1] < h:
                        nk, nidx = corner_tile(c, *nb)
                        if nk == 'grass_dirt' and nidx and bit in (1, 4):
                            conn |= bit                            # opens onto a road tile
                if (x, y) in doors:
                    conn |= 1
                v = vpick(x, y, PATH_VARIANTS)
                # a path cell that touches the road becomes a connector
                if idx in (12, 3) and k == 'grass_dirt':
                    name = 'path_into_road_below' if idx == 12 else 'path_into_road_above'
                    tile = CONNECTOR_TILES[(name, v)].image()
                else:
                    tile = paths[v][conn]
                sc.paste(tile, (x * 32, y * 32))
            else:
                sc.paste(auto[k][vpick(x, y, VARIANTS)][idx], (x * 32, y * 32))
    return sc


def mock_town(groups):
    w, h = 16, 12
    c = corner_map(w, h)
    cells, doors = path_cells()
    for x, y in ((3, 6), (8, 6), (11, 6), (14, 6), (6, 8)):
        cells.add((x, y))                                         # connector cells on the road edge
    sc = render_map(w, h, c, cells, doors)
    P = {k: s.image() for k, s in groups['props'][0]}
    B = {k: v.image() for k, v in groups['buildings'][0]}
    Fg = {k: v.image() for k, v in groups['forage'][0]}
    C = {k: s.image() for k, s in groups['characters'][0] + groups['guests'][0]}
    sc.alpha_composite(B['hearthwick_inn'], (2 * 32 + 16, 0))
    sc.alpha_composite(B['bakery'], (8 * 32 - 24, 0))
    for k, x, y in [('tree', 0, 0), ('tree', 5, 0), ('tree', 15, 0), ('bush', 0, 3), ('lamppost', 4, 5), ('lamppost', 10, 5),
                    ('house_red', 11, 3), ('house_blue', 14, 3), ('signpost', 7, 4), ('well', 5, 3), ('tree', 12, 1),
                    ('fence', 0, 9), ('fence', 1, 9), ('barrel', 9, 3)]:
        big = k.startswith('house')                                  # houses are building-sized
        sc.alpha_composite((B if big else P)[k], (x * 32 - (16 if big else 0), y * 32 - (32 if big else 0)))
    for k, x, y in [('wild_wheat_ready', 0, 10), ('wild_wheat_harvested', 1, 10), ('berry_bush_ready', 2, 9),
                    ('mushroom_patch_ready', 0, 11), ('herb_patch_ready', 3, 11), ('carrot_patch_ready', 7, 11),
                    ('potato_patch_harvested', 8, 11), ('apple_tree_ready', 4, 9), ('beehive_ready', 5, 11),
                    ('bird_nest_ready', 9, 11), ('fishing_spot_ready', 13, 10), ('tomato_vine_ready', 2, 11),
                    ('onion_patch_ready', 11, 9)]:
        sc.alpha_composite(Fg[k], (x * 32, y * 32))
    for k, x, y in [('kid_down_walk1', 3, 4), ('baker_down_idle', 8, 7), ('elder_left_idle', 12, 7),
                    ('minotaur_right_walk1', 1, 7), ('frog_down_idle', 9, 9), ('elf_down_idle', 14, 7)]:
        sc.alpha_composite(C[k], (x * 32, y * 32 - 4))
    sc.resize((sc.width * 2, sc.height * 2), Image.NEAREST).save(os.path.join(OUT, 'mock_town.png'))


def mock_interior(groups):
    """A complete room built only from the wall kit, floors and furniture."""
    W = {k: v.image() for k, v in groups['walls'][0]}
    I = {k: v.image() for k, v in groups['interior'][0]}
    St = {k: v.image() for k, v in groups['stations'][0]}
    C = {k: s.image() for k, s in groups['characters'][0] + groups['guests'][0]}
    F = {k: s.image() for k, s in groups['food'][0]}
    floor = dict((n, f) for n, f in TILES)['wood_floor']().image()
    w, h = 12, 9
    sc = Image.new('RGBA', (w * 32, h * 32), (34, 32, 52, 255))
    def put(img, x, y, dx=0, dy=0): sc.alpha_composite(img, (x * 32 + dx, y * 32 + dy))
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            put(W['floor_flagstone'] if x >= 8 else floor, x, y)
    put(W['wall_cap_TL'], 0, 0); put(W['wall_cap_TR'], w - 1, 0)
    for x in range(1, w - 1): put(W['wall_cap_T'], x, 0)
    faces = ['wall_face', 'wall_face_window', 'wall_face', 'wall_face_door', 'wall_face', 'wall_face_window', 'wall_face',
             'wall_face_stone', 'wall_face_shelf', 'wall_face_stone']
    for x, f in enumerate(faces, start=1): put(W[f], x, 1)
    for y in range(1, h - 1): put(W['wall_cap_L'], 0, y); put(W['wall_cap_R'], w - 1, y)
    put(W['wall_cap_BL'], 0, h - 1); put(W['wall_cap_BR'], w - 1, h - 1)
    for x in range(1, w - 1):
        if x == 4: put(W['wall_cap_B_end_L'], x, h - 1)
        elif x == 6: put(W['wall_cap_B_end_R'], x, h - 1)
        elif x != 5: put(W['wall_cap_B'], x, h - 1)
    put(I['rug'], 3, 4); put(I['rug'], 4, 4)
    put(I['fireplace'], 2, 2); put(I['bar_counter'], 5, 3); put(I['bar_counter'], 6, 3); put(I['keg'], 7, 2)
    put(St['stove'], 8, 2); put(St['oven'], 9, 2); put(St['cutting_board'], 10, 2)
    put(St['cauldron'], 10, 4); put(St['mixing_table'], 9, 5)
    for x in (2, 5):
        put(St['dining_table'], x, 6); put(St['stool'], x - 1, 6, 10, 4); put(St['stool'], x + 1, 6, -10, 4)
    put(F['dish_river_chowder'], 2, 6, 0, -12); put(F['dish_honey_cake'], 5, 6, 2, -12)
    put(I['potted_plant'], 1, 2); put(I['potted_plant'], 7, 6); put(I['chest'], 1, 7, 0, -6)
    put(C['baker_down_idle'], 9, 3, 0, 6); put(C['kid_up_walk1'], 5, 6, 0, 18)
    put(C['dwarf_down_idle'], 1, 5); put(C['elf_right_idle'], 3, 7, 0, -8); put(C['beetle_left_idle'], 6, 6, 8, -4)
    sc.resize((sc.width * 2, sc.height * 2), Image.NEAREST).save(os.path.join(OUT, 'mock_interior.png'))


def mock_floors(groups):
    """Two linked rooms: an L-shaped ground floor (wood hall + stone kitchen) and the guest floor above."""
    W = {k: v.image() for k, v in groups['interior_walls'][0]}
    FT = {k: v.image() for k, v in groups['floor_transitions'][0]}
    Fu = {k: v.image() for k, v in groups['furniture'][0]}
    St = {k: v.image() for k, v in groups['stations'][0]}
    In = {k: v.image() for k, v in groups['interior'][0]}
    C = {k: s.image() for k, s in groups['characters'][0] + groups['guests'][0]}
    Fd = {k: s.image() for k, s in groups['food'][0]}
    up = groups['stairs'][0][0][1].image()
    VOID = (34, 32, 52, 255)

    def scene(w, h):
        return Image.new('RGBA', (w * 32, h * 32), VOID)

    def put(sc, img, x, y, dx=0, dy=0):
        sc.alpha_composite(img, (x * 32 + dx, y * 32 + dy))

    # ---------------- ground floor (14 x 10) ----------------
    g = scene(14, 10)
    stone_corner = lambda cx, cy: cx >= 9 and cy >= 4
    for y in range(2, 9):
        for x in range(1, 13):
            if y < 4 and x >= 9:
                continue
            idx = sum(int(stone_corner(cx, cy)) << i for i, (cx, cy) in enumerate(((x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1))))
            put(g, FT[f'floor_wood_flagstone_{idx:02d}'], x, y)
    put(g, FT['floor_wood_flagstone_00'], 0, 5)                                   # side doorway
    put(g, FT['floor_wood_flagstone_00'], 4, 9)                                   # front doorway
    put(g, W['cap_wood_TL'], 0, 0)
    for x in range(1, 9): put(g, W['cap_wood_T'], x, 0)
    put(g, W['cap_wood_TR'], 9, 0)
    faces = ['face_plaster_plain', 'face_plaster_window', 'face_plaster_plain', 'face_plaster_plain', 'face_plaster_shelf',
             'face_plaster_plain', 'face_plaster_window', 'face_plaster_plain']
    for x, f in enumerate(faces, start=1): put(g, W[f], x, 1)
    put(g, W['cap_wood_R'], 9, 1)
    put(g, W['cap_wood_inner_T_R'], 9, 2); put(g, W['cap_T_wood_to_stone'], 10, 2)
    for x in (11, 12): put(g, W['cap_stone_T'], x, 2)
    put(g, W['cap_stone_TR'], 13, 2)
    for x, f in zip(range(9, 13), ['face_plaster_to_stone', 'face_stone_shelf', 'face_stone_window', 'face_stone_plain']):
        put(g, W[f], x, 3)
    for y in range(3, 9): put(g, W['cap_stone_R'], 13, y)
    for y in range(1, 9):
        if y == 4: put(g, W['cap_wood_L_end_bottom'], 0, y)
        elif y == 6: put(g, W['cap_wood_L_end_top'], 0, y)
        elif y != 5: put(g, W['cap_wood_L'], 0, y)
    put(g, W['cap_wood_BL'], 0, 9)
    for x in range(1, 9):
        if x == 3: put(g, W['cap_wood_B_end_L'], x, 9)
        elif x == 5: put(g, W['cap_wood_B_end_R'], x, 9)
        elif x != 4: put(g, W['cap_wood_B'], x, 9)
    put(g, W['cap_B_wood_to_stone'], 9, 9)
    for x in (10, 11, 12): put(g, W['cap_stone_B'], x, 9)
    put(g, W['cap_stone_BR'], 13, 9)
    put(g, Fu['doormat'], 4, 8, 0, 6)
    put(g, Fu['deco_painting'], 3, 1); put(g, Fu['deco_sconce'], 1, 1); put(g, Fu['deco_menu_board'], 8, 1); put(g, Fu['deco_banner'], 6, 1)
    put(g, Fu['deco_sconce'], 12, 3)
    g.alpha_composite(up, (5 * 32, 1 * 32))                                      # stairs up
    put(g, Fu['bookshelf'], 1, 2); put(g, In['fireplace'], 3, 2); put(g, Fu['armchair'], 3, 3, 0, 4)
    put(g, Fu['barrel_stack'], 7, 2); put(g, Fu['floor_lamp'], 8, 3)
    for x, part in ((2, 'left'), (3, 'middle'), (4, 'middle'), (5, 'right')):
        put(g, Fu[f'bench_{part}'], x, 4, 0, 4)
        put(g, Fu[f'long_table_{part}'], x, 5)
        put(g, Fu[f'bench_{part}'], x, 5, 0, 8)
    for x, part in ((1, 'left'), (2, 'middle'), (3, 'middle'), (4, 'middle'), (5, 'middle'), (6, 'right')):
        put(g, Fu[f'runner_{part}'], x, 7)
    put(g, Fd['dish_venison_pie'], 3, 5, 0, -12); put(g, Fd['bread_loaf'], 4, 5, 0, -12)
    put(g, St['stove'], 10, 4); put(g, St['oven'], 11, 4); put(g, St['cutting_board'], 12, 4)
    put(g, St['cauldron'], 12, 6); put(g, St['mixing_table'], 10, 7); put(g, Fu['cupboard'], 9, 4)
    put(g, C['baker_down_idle'], 11, 5, 0, 4); put(g, C['kid_up_walk1'], 5, 3, 0, 10)
    put(g, C['dwarf_down_idle'], 2, 4, 0, -2); put(g, C['minotaur_right_idle'], 6, 5, 0, 2); put(g, C['elf_left_idle'], 8, 6)

    # ---------------- upper floor (10 x 7) ----------------
    u = scene(10, 7)
    for y in range(2, 6):
        for x in range(1, 9):
            put(u, FT['floor_wood_flagstone_00'], x, y)
    put(u, W['cap_wood_TL'], 0, 0); put(u, W['cap_wood_TR'], 9, 0)
    for x in range(1, 9): put(u, W['cap_wood_T'], x, 0)
    for x, f in enumerate(['face_plaster_plain', 'face_plaster_window', 'face_plaster_plain', 'face_plaster_plain',
                           'face_plaster_window', 'face_plaster_plain', 'face_plaster_plain', 'face_plaster_window'], start=1):
        put(u, W[f], x, 1)
    for y in range(1, 6): put(u, W['cap_wood_L'], 0, y); put(u, W['cap_wood_R'], 9, y)
    put(u, W['cap_wood_BL'], 0, 6); put(u, W['cap_wood_BR'], 9, 6)
    for x in range(1, 9): put(u, W['cap_wood_B'], x, 6)
    put(u, Fu['deco_painting'], 3, 1); put(u, Fu['deco_sconce'], 6, 1); put(u, Fu['deco_sconce'], 1, 1)
    put(u, In['bed'], 1, 2); put(u, In['nightstand'], 2, 2); put(u, In['bed'], 3, 2)
    put(u, Fu['wardrobe'], 4, 2); put(u, Fu['armchair'], 8, 2); put(u, Fu['floor_lamp'], 7, 2)
    for x, part in ((1, 'left'), (2, 'middle'), (3, 'middle'), (4, 'right')):
        put(u, Fu[f'runner_{part}'], x, 4)
    put(u, Fu['stairs_down'], 6, 4)
    put(u, In['chest'], 8, 5, 0, -6); put(u, In['potted_plant'], 1, 5, 0, -8)
    put(u, C['kid_down_idle'], 6, 3, 0, 6); put(u, C['frog_right_idle'], 2, 4, 0, -4)

    font = ImageFont.load_default()
    S = 2
    out = Image.new('RGBA', ((14 + 10) * 32 * S + 48, 10 * 32 * S + 40), (42, 27, 45, 255))
    out.alpha_composite(g.resize((g.width * S, g.height * S), Image.NEAREST), (16, 32))
    out.alpha_composite(u.resize((u.width * S, u.height * S), Image.NEAREST), (14 * 32 * S + 32, 32))
    d = ImageDraw.Draw(out)
    d.text((16, 10), 'GROUND FLOOR - stairs_up (top) leads to ->', fill=(255, 182, 39), font=font)
    d.text((14 * 32 * S + 32, 10), 'UPPER FLOOR - arrive at stairs_down; it leads back down', fill=(255, 182, 39), font=font)
    out.save(os.path.join(OUT, 'mock_floors.png'))


def mock_kitchen(groups):
    w, h = 10, 5
    floor = dict((n, f) for n, f in TILES)['wood_floor']().image()
    sc = Image.new('RGBA', (w * 32, h * 32))
    for y in range(h):
        for x in range(w):
            sc.paste(floor, (x * 32, y * 32))
    St = {k: s.image() for k, s in groups['stations'][0]}
    F = {k: s.image() for k, s in groups['food'][0]}
    C = {k: s.image() for k, s in groups['characters'][0]}
    for i, k in enumerate(['hand_mill', 'mixing_table', 'cutting_board', 'stove', 'grill', 'oven', 'cauldron', 'brewing_cask']):
        sc.alpha_composite(St[k], ((i + 1) * 32, 0))
    TW = {k: s.image() for k, s in groups['tableware'][0]}
    for x, lv in ((2, 'full'), (5, 'half')):
        sc.alpha_composite(TW[f'dining_table_set_{lv}'], (x * 32, 3 * 32))
        sc.alpha_composite(St['stool'], ((x - 1) * 32 + 8, 3 * 32 + 4))
        sc.alpha_composite(St['stool'], ((x + 1) * 32 - 8, 3 * 32 + 4))
    sc.alpha_composite(C['baker_up_idle'], (4 * 32, 32 + 10))
    sc.alpha_composite(C['kid_right_idle'], (1 * 32, 2 * 32 + 6))
    sc.alpha_composite(F['bread_loaf'], (6 * 32 + 2, 1 * 32 + 6))
    sc.resize((sc.width * 3, sc.height * 3), Image.NEAREST).save(os.path.join(OUT, 'mock_kitchen.png'))


def mock_shops(groups):
    """Market street: every shop building with its keeper out front."""
    T = dict((n, f) for n, f in TILES)
    grass, cobble = T['grass']().image(), T['cobblestone']().image()
    B = {k: s.image() for k, s in groups['buildings'][0]}
    C = {k: s.image() for k, s in groups['characters'][0]}
    row = [('bakery', 'baker'), ('butcher', 'butcher'), ('general_store', 'elder'),
           ('dairy', 'dairymaid'), ('fishmonger', 'fishmonger'), ('spice_shop', 'spicer')]
    w, h = len(row) * 2 + 1, 4
    sc = Image.new('RGBA', (w * 32, h * 32))
    for y in range(h):
        for x in range(w):
            sc.paste(cobble if y == 3 else grass, (x * 32, y * 32))
    for i, (b, keeper) in enumerate(row):
        x = 16 + i * 64
        sc.alpha_composite(B[b], (x, 8))
        sc.alpha_composite(C[f'{keeper}_down_idle'], (x + 34, 2 * 32 + 22))
    sc.resize((sc.width * 3, sc.height * 3), Image.NEAREST).save(os.path.join(OUT, 'mock_shops.png'))


def mock_service(groups):
    """Dinner service: guests seated and eating, the player carrying a tray, the baker at the oven, fire and candles flickering."""
    W = {k: v.image() for k, v in groups['walls'][0]}
    I = {k: v.image() for k, v in groups['interior'][0]}
    St = {k: v.image() for k, v in groups['stations'][0]}
    A = {k: v.image() for k, v in groups['actions'][0]}
    N = {k: v.image() for k, v in groups['animated'][0]}
    floor = dict((n, f) for n, f in TILES)['wood_floor']().image()
    w, h = 11, 7
    eaters = [  # look, view, tile x, tile y, dx, dy, phase
        ('dwarf', 'right', 1, 3, 8, -8, 0), ('elf', 'left', 3, 3, -8, -8, 1),
        ('frog', 'down', 2, 2, 0, 12, 1),
        ('girl', 'right', 6, 4, 8, -8, 1), ('minotaur', 'left', 8, 4, -8, -8, 0),
        ('beetle', 'up', 7, 5, 0, -14, 0)]
    frames = []
    for f in range(8):
        sc = Image.new('RGBA', (w * 32, h * 32), (34, 32, 52, 255))
        def put(img, x, y, dx=0, dy=0): sc.alpha_composite(img, (x * 32 + dx, y * 32 + dy))
        for y in range(1, h):
            for x in range(w): put(floor, x, y)
        for x in range(w): put(W['wall_face'], x, 0)
        put(N[f'fireplace_f{f % 3}'], 1, 0)
        put(I['shelf_jars'], 3, 0)
        put(N[f'oven_f{f % 3}'], 6, 0); put(N[f'stove_f{(f + 1) % 3}'], 7, 0)
        put(N[f'cauldron_f{f % 3}'], 8, 0); put(N[f'brewing_cask_f{f % 3}'], 10, 0)
        put(A[f'baker_work_up_{f % 2 + 1}'], 6, 1, 8, -6)
        # far-side sitters go behind their table, everyone else in front
        for lk, v, x, y, dx, dy, ph in eaters:
            if v == 'down':
                put(A[f'{lk}_sit_{v}_{"eat1" if (f + ph) % 2 else "eat2"}'], x, y, dx, dy)
        for tx, ty in ((2, 3), (7, 4)):
            put(N[f'dining_table_set_candle_f{(f + tx) % 3}'], tx, ty)
        for lk, v, x, y, dx, dy, ph in eaters:
            if v == 'down': continue
            if v in ('left', 'right'): put(St['stool'], x, y, dx, 4)
            put(A[f'{lk}_sit_{v}_{"eat1" if (f + ph) % 2 else "eat2"}'], x, y, dx, dy)
        step = ['walk1', 'idle', 'walk2', 'idle'][f % 4]
        put(A[f'kid_carry_right_{step}'], 0, 5, 12 + f * 10, 4)
        frames.append(sc.resize((sc.width * 3, sc.height * 3), Image.NEAREST))
    frames[0].save(os.path.join(OUT, 'mock_service.png'))
    pal = [fr.convert('P', palette=Image.ADAPTIVE) for fr in frames]
    pal[0].save(os.path.join(OUT, 'mock_service.gif'), save_all=True, append_images=pal[1:], duration=170, loop=0)


def mock_farm(groups):
    """Farmyard: hens pecking by the coop, cow and sheep grazing, pig rooting, deer at the wood's edge."""
    T = dict((n, f) for n, f in TILES)
    grass, dirt = T['grass']().image(), T['dirt_path']().image()
    A = {k: v.image() for k, v in groups['animals'][0]}
    F = {k: v.image() for k, v in groups['farm'][0]}
    P = {k: v.image() for k, v in groups['props'][0]}
    w, h = 10, 6
    actors = [  # name, view, x, y, dx, dy, action, phase
        ('hen', 'left', 2, 1, 4, 6, 'peck', 0), ('hen', 'right', 3, 2, -4, 2, 'peck', 1), ('chick', 'left', 2, 2, 10, 8, 'peck', 1),
        ('rooster', 'right', 1, 2, 4, 2, None, 0), ('cow', 'left', 5, 1, 0, 6, 'graze', 0), ('sheep', 'left', 7, 2, 0, 4, 'graze', 1),
        ('sheep', 'right', 6, 3, 8, 6, 'graze', 0), ('pig', 'left', 4, 4, 0, 0, 'root', 1), ('deer', 'left', 9, 4, -4, -4, 'graze', 0),
        ('cat', 'down', 0, 4, 8, 6, None, 0)]
    frames = []
    for f in range(8):
        sc = Image.new('RGBA', (w * 32, h * 32))
        def put(img, x, y, dx=0, dy=0): sc.alpha_composite(img, (x * 32 + dx, y * 32 + dy))
        for y in range(h):
            for x in range(w): put(dirt if (y == 5 and x < 8) else grass, x, y)
        for x in range(w - 1): put(P['fence'], x, 0, 0, -14)
        put(F['chicken_coop'], 0, 1); put(F['feed_trough'], 3, 3); put(F['hay_bale'], 6, 1, 6, -4); put(F['milk_pail'], 4, 1, 8, 6)
        put(P['tree'], 9, 2, 0, -8)
        for n, v, x, y, dx, dy, act, ph in sorted(actors, key=lambda a: a[3] * 32 + a[5]):
            if act and (f // 2 + ph) % 2:
                fr = f'{n}_{v}_{act}'
            elif n == 'cat':
                fr = 'cat_left_sleep' if f < 4 else 'cat_down_idle'
            else:
                fr = f'{n}_{v}_idle'
            put(A[fr], x, y, dx, dy)
        frames.append(sc.resize((sc.width * 3, sc.height * 3), Image.NEAREST))
    frames[0].save(os.path.join(OUT, 'mock_farm.png'))
    pal = [fr.convert('P', palette=Image.ADAPTIVE) for fr in frames]
    pal[0].save(os.path.join(OUT, 'mock_farm.gif'), save_all=True, append_images=pal[1:], duration=260, loop=0)


def mock_road(groups):
    """A traveler's wagon rolls past the inn; a horse waits at the hitching post, ducks paddle on the pond."""
    T = dict((n, f) for n, f in TILES)
    grass, dirt, water = T['grass']().image(), T['dirt_path']().image(), T['water']().image()
    A = {k: v.image() for k, v in groups['animals'][0]}
    F = {k: v.image() for k, v in groups['farm'][0]}
    Cr = {k: v.image() for k, v in groups['carts'][0]}
    Wg = {k: v.image() for k, v in groups['wagons'][0]}
    Wn = {k: v.image() for k, v in groups['wagons_ns'][0]}
    B = {k: v.image() for k, v in groups['buildings'][0]}
    w, h = 12, 6
    frames = []
    for f in range(12):
        sc = Image.new('RGBA', (w * 32, h * 32))
        def put(img, x, y, dx=0, dy=0): sc.alpha_composite(img, (x * 32 + dx, y * 32 + dy))
        for y in range(h):
            for x in range(w):
                put(dirt if (y == 4 or x == 8) else water if (x in (9, 10) and y in (1, 2)) else grass, x, y)
        put(B['hearthwick_inn'], 1, 1, 0, -32)
        put(F['hitching_post'], 4, 2, 0, 8)
        put(A[f'horse_left_{"graze" if (f // 3) % 2 else "idle"}'], 5, 2, -6, 4)
        put(Cr['handcart_left_f0'], 7, 2, 0, 8)
        put(A[f'duck_{"left" if f < 6 else "right"}_swim'], 9, 1, 8 + (f if f < 6 else 11 - f) * 2, 4)
        put(A[f'duckling_{"left" if f < 6 else "right"}_{"walk1" if f % 2 else "walk2"}'], 11, 2, -(f if f < 6 else 11 - f) * 2, 8)
        put(A['duck_left_idle'], 11, 3, 0, 0)
        put(A['cat_down_idle' if f % 6 < 3 else 'cat_left_sleep'], 3, 3, 4, 6)
        put(Wn[f'wagon_up_f{f % 3}'], 8, 4, 0, 40 - f * 16)
        put(Wg[f'wagon_left_f{f % 3}'], 11, 4, 140 - f * 22, -8)
        frames.append(sc.resize((sc.width * 3, sc.height * 3), Image.NEAREST))
    frames[0].save(os.path.join(OUT, 'mock_road.png'))
    pal = [fr.convert('P', palette=Image.ADAPTIVE) for fr in frames]
    pal[0].save(os.path.join(OUT, 'mock_road.gif'), save_all=True, append_images=pal[1:], duration=150, loop=0)


def autotile_check():
    """Random corner fields with random variants, plus a random path network: any seam bug shows as a hard line."""
    out = Image.new('RGBA', (3 * 12 * 32 + 32, 8 * 32), (42, 27, 45, 255))
    for p, key in enumerate(('grass_dirt', 'grass_water')):
        rnd = random.Random(9 + p)
        c = [[rnd.random() < 0.45 for _ in range(13)] for _ in range(9)]
        for y in range(8):
            for x in range(12):
                idx = c[y][x] | c[y][x + 1] << 1 | c[y + 1][x] << 2 | c[y + 1][x + 1] << 3
                out.paste(AUTOTILES[key][rnd.randrange(VARIANTS)][idx].image(), (p * (12 * 32 + 16) + x * 32, y * 32))
    rnd = random.Random(4)
    cells = {(x, y) for x in range(12) for y in range(8) if rnd.random() < 0.55}
    ox = 2 * (12 * 32 + 16)
    for y in range(8):
        for x in range(12):
            if (x, y) in cells:
                conn = sum(bit for bit, (dx, dy) in ((1, (0, -1)), (2, (1, 0)), (4, (0, 1)), (8, (-1, 0))) if (x + dx, y + dy) in cells)
                out.paste(PATHS[rnd.randrange(PATH_VARIANTS)][conn].image(), (ox + x * 32, y * 32))
            else:
                out.paste(AUTOTILES['grass_dirt'][rnd.randrange(VARIANTS)][0].image(), (ox + x * 32, y * 32))
    out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(os.path.join(OUT, 'autotile_check.png'))


def variants_compare():
    """Same straight road edge drawn with one variant vs mixed variants."""
    out = Image.new('RGBA', (12 * 32, 4 * 32 + 8), (42, 27, 45, 255))
    for row, mixed in enumerate((False, True)):
        for x in range(12):
            for y, idx in enumerate((12, 3)):
                v = vpick(x, y, VARIANTS) if mixed else 0
                out.paste(AUTOTILES['grass_dirt'][v][idx].image(), (x * 32, row * (2 * 32 + 8) + y * 32))
    out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(os.path.join(OUT, 'variants_compare.png'))


def codex(data, groups):
    """Every item and dish with its name and how it's obtained or made."""
    F = {k: v.image() for k, v in groups['food'][0]}
    St = data['stations']
    font = ImageFont.load_default()
    S, cw, ch, cols, pad = 2, 196, 84, 7, 8

    def how(iid):
        if iid in data['dishes']:
            d = data['dishes'][iid]
            return ['Plate: ' + ' + '.join(data['items'][c]['name'] for c in d['components'])]
        it = data['items'][iid]
        if it['kind'] == 'raw':
            src = []
            for s_ in it['sources']:
                if s_['type'] == 'forage': src.append(data['forage_spots'][s_['spot']]['name'])
                elif s_['type'] == 'shop': src.append(data['shops'][s_['shop']]['name'] + f" ({s_['price']}c)")
                else: src.append(s_['node'].replace('_', ' '))
            return [', '.join(dict.fromkeys(src))]
        m = it['made_by'][0]
        lines = [St[m['station']]['verb'] + ': ' + ' + '.join(data['items'][i]['name'] for i in m['inputs'])]
        if len(it['made_by']) > 1: lines.append(f"(+{len(it['made_by']) - 1} other way{'s' if len(it['made_by']) > 2 else ''})")
        return lines

    def wrap(t, n=28):
        out, cur = [], ''
        for w in t.split(' '):
            if len(cur) + len(w) + 1 > n: out.append(cur); cur = w
            else: cur = (cur + ' ' + w).strip()
        return out + [cur]

    sections = [('RAW INGREDIENTS', [i for i, it in data['items'].items() if it['kind'] == 'raw']),
                ('PREPARED', [i for i, it in data['items'].items() if it['kind'] == 'prepared']),
                ('DISHES', list(data['dishes']))]
    H = sum(28 + ((len(ids) + cols - 1) // cols) * ch for _, ids in sections) + pad
    out = Image.new('RGB', (cols * cw + 2 * pad, H), (42, 27, 45))
    d = ImageDraw.Draw(out); y = pad
    for title, ids in sections:
        d.text((pad, y + 6), f'{title} ({len(ids)})', fill=(255, 182, 39), font=font); y += 28
        for k, iid in enumerate(ids):
            x0, y0 = pad + (k % cols) * cw, y + (k // cols) * ch
            card = Image.new('RGBA', (64, 64), (255, 248, 239, 255)); card.alpha_composite(F[iid].resize((64, 64), Image.NEAREST))
            out.paste(card, (x0, y0))
            name = (data['dishes'][iid] if iid in data['dishes'] else data['items'][iid])['name']
            d.text((x0 + 70, y0 + 2), gamedata.slug(name).replace('_', ' ').capitalize() if not name.isascii() else name, fill=(255, 243, 224), font=font)
            ty = y0 + 16
            for line in (l.encode('ascii', 'ignore').decode() for l in how(iid)):
                for part in wrap(line):
                    if ty > y0 + 70: break
                    d.text((x0 + 70, ty), part, fill=(200, 180, 190), font=font); ty += 12
        y += ((len(ids) + cols - 1) // cols) * ch
    out.save(os.path.join(OUT, 'codex.png'))


def simple_meals_map(data, groups, count=26):
    dish_paths_map(data, groups, list(data['dishes'])[:count],
                   'SIMPLEST MEALS  -  ingredient > station > item > ... > plate', 'simple_meals.png')


def dish_paths_map(data, groups, dish_ids, title, filename, prefer=None):
    """Each dish drawn as its full path: ingredient -> station -> item -> ... -> plated dish.
    prefer: an ingredient whose path should be shown when an item can be made several ways."""
    from ui import ICONS
    F = {k: v.image() for k, v in groups['food'][0]}
    IC = {n: f().image() for n, f in ICONS}
    items, St = data['items'], data['stations']
    font = ImageFont.load_default()
    station_icon = {sid: IC['method_' + st['method']] for sid, st in St.items() if st['method'] != 'serve'}

    def best(iid):
        opts = items[iid]['made_by']
        if prefer:
            via = [m for m in opts if any(i == prefer or prefer in gamedata.ancestors(i, items) for i in m['inputs'])]
            opts = via or opts
        return min(opts, key=lambda m: sum(gamedata.item_steps(i, items) for i in m['inputs']))

    def tree(iid):
        """Image of the cheapest path that makes iid (raw items are just their sprite)."""
        if items[iid]['kind'] == 'raw':
            return F[iid]
        m = best(iid)
        parts = [tree(i) for i in m['inputs']]
        h = max(p.height for p in parts)
        w = sum(p.width for p in parts) + 10 * (len(parts) - 1) + 22 + 32
        im = Image.new('RGBA', (w, max(h, 32)))
        x = 0
        for k, p in enumerate(parts):
            im.alpha_composite(p, (x, (im.height - p.height) // 2)); x += p.width
            if k < len(parts) - 1:
                ImageDraw.Draw(im).text((x + 2, im.height // 2 - 6), '+', fill=(255, 243, 224), font=font); x += 10
        im.alpha_composite(station_icon[m['station']], (x + 3, im.height // 2 - 8)); x += 22
        im.alpha_composite(F[iid], (x, (im.height - 32) // 2))
        return im

    rows = []
    for did in dish_ids:
        d = data['dishes'][did]
        parts = [tree(c) for c in d['components']]
        h = max(p.height for p in parts)
        row = Image.new('RGBA', (sum(p.width for p in parts) + 14 * len(parts) + 40 + 32 + 190, h + 8))
        dr = ImageDraw.Draw(row)
        x = 0
        for k, p in enumerate(parts):
            row.alpha_composite(p, (x, 4 + (h - p.height) // 2)); x += p.width
            dr.text((x + 3, row.height // 2 - 6), '+' if k < len(parts) - 1 else '', fill=(255, 243, 224), font=font); x += 14
        row.alpha_composite(IC['inn'], (x, row.height // 2 - 8)); x += 22
        card = Image.new('RGBA', (32, 32), (255, 248, 239, 255)); card.alpha_composite(F[did])
        row.alpha_composite(card, (x, (row.height - 32) // 2)); x += 38
        steps = gamedata.dish_steps(d, items)
        dr.text((x, row.height // 2 - 12), d['name'], fill=(255, 182, 39), font=font)
        dr.text((x, row.height // 2 + 1), f"{steps} prep step{'s' if steps != 1 else ''}" + ('  (new)' if d['pack'] != 'prototype' else ''),
                fill=(200, 180, 190), font=font)
        rows.append(row)
    W = max(r.width for r in rows) + 20
    out = Image.new('RGBA', (W, sum(r.height + 6 for r in rows) + 40), (42, 27, 45, 255))
    d = ImageDraw.Draw(out)
    d.text((10, 10), title, fill=(255, 182, 39), font=font)
    y = 32
    for i, r in enumerate(rows):
        if i % 2 == 0:
            out.alpha_composite(Image.new('RGBA', (W, r.height + 6), (52, 35, 56, 255)), (0, y - 3))
        out.alpha_composite(r, (10, y)); y += r.height + 6
    out = out.resize((out.width * 2, out.height * 2), Image.NEAREST)
    out.save(os.path.join(OUT, filename))


def ingredient_report(data, groups, ing):
    """Everything that can be made from one ingredient: a stage tree, a dish map and a written plan."""
    from ui import ICONS
    os.makedirs(os.path.join(OUT, 'paths'), exist_ok=True)
    items, St = data['items'], data['stations']
    desc = gamedata.descendants(ing, items)
    depth = {ing: 0}
    for _ in range(12):
        for iid in desc:
            for m in items[iid]['made_by']:
                ins = [i for i in m['inputs'] if i in depth]
                if ins and len(ins) == len([i for i in m['inputs'] if i in desc or i == ing]):
                    dd = 1 + max(depth[i] for i in ins)
                    if dd < depth.get(iid, 99): depth[iid] = dd
    dishes = [did for did, d in data['dishes'].items() if any(c in depth for c in d['components'])]

    # ---- stage tree ----
    F = {k: v.image() for k, v in groups['food'][0]}
    IC = {n: f().image() for n, f in ICONS}
    font = ImageFont.load_default()
    cols = {}
    for iid, dd in depth.items(): cols.setdefault(dd, []).append(iid)
    for dd in cols: cols[dd].sort(key=lambda i: (items[i]['pack'] != 'prototype', items[i]['name']))
    NW, NH, GX, GY = 150, 46, 70, 8
    H = max(len(v) for v in cols.values()) * (NH + GY) + 60
    W = len(cols) * (NW + GX) + 20
    out = Image.new('RGBA', (W, H), (42, 27, 45, 255)); d = ImageDraw.Draw(out)
    pos = {}
    for dd in sorted(cols):
        for k, iid in enumerate(cols[dd]):
            pos[iid] = (10 + dd * (NW + GX), 40 + k * (NH + GY))
    scol = {'board': (155, 173, 183), 'mill': (132, 126, 135), 'bowl': (91, 110, 225), 'skillet': (105, 106, 106),
            'pot': (95, 205, 228), 'grill': (223, 113, 38), 'oven': (172, 50, 50)}
    for iid in depth:
        for m in items[iid]['made_by']:
            for i in m['inputs']:
                if i in pos and depth[i] < depth[iid]:
                    x0, y0 = pos[i][0] + NW, pos[i][1] + NH // 2
                    x1, y1 = pos[iid][0], pos[iid][1] + NH // 2
                    d.line([(x0, y0), (x0 + 16, y0), (x1 - 22, y1), (x1, y1)], fill=scol.get(m['station'], (200, 200, 200)), width=2)
    for iid, (x, y) in pos.items():
        new = items[iid]['pack'] != 'prototype'
        d.rectangle([x, y, x + NW, y + NH], fill=(66, 46, 70) if not new else (78, 60, 30), outline=(255, 182, 39) if new else (110, 90, 120))
        card = Image.new('RGBA', (32, 32), (255, 248, 239, 255)); card.alpha_composite(F[iid])
        out.alpha_composite(card, (x + 6, y + 7))
        d.text((x + 44, y + 6), items[iid]['name'][:17], fill=(255, 243, 224), font=font)
        if iid != ing:
            m = next((m for m in items[iid]['made_by'] if any(i in depth for i in m['inputs'])), items[iid]['made_by'][0])
            out.alpha_composite(IC['method_' + St[m['station']]['method']], (x + 44, y + 22))
            others = [i for i in m['inputs'] if i not in depth]
            ox = x + 64
            for o in others[:4]:
                out.alpha_composite(F[o].resize((16, 16), Image.NEAREST), (ox, y + 22)); ox += 17
    for dd in sorted(cols):
        d.text((10 + dd * (NW + GX), 14), 'RAW' if dd == 0 else f'STAGE {dd}', fill=(255, 182, 39), font=font)
    d.text((10, H - 18), 'gold border = new content (not in the prototype)   |   small icons = the other ingredients that step needs   |   line colour = station',
           fill=(200, 180, 190), font=font)
    out = out.resize((out.width * 2, out.height * 2), Image.NEAREST)
    out.save(os.path.join(OUT, 'paths', f'{ing}_tree.png'))

    # ---- dish map ----
    order = sorted(dishes, key=lambda x: (gamedata.dish_steps(data['dishes'][x], items), len(data['dishes'][x]['components'])))
    dish_paths_map(data, groups, order, f'{ing.upper()} DISHES  -  simple to complex', os.path.join('paths', f'{ing}_dishes.png'), prefer=ing)

    # ---- written plan ----
    L = [f'# {items[ing]["name"]} paths', '',
         f'Everything that can be made from {items[ing]["name"].lower()}, from simple to complex. '
         'Generated from gamedata.json — edit the content files, not this page.', '',
         f'- **{len(depth) - 1} items** made from {items[ing]["name"].lower()}, '
         f'**{len(dishes)} dishes** use them',
         '- New items and dishes (from any content pack) are marked *new*', '']
    for dd in sorted(cols):
        if dd == 0: continue
        L += [f'## Stage {dd}', '', '| Item | Made by | Tags |', '|---|---|---|']
        for iid in cols[dd]:
            ways = '<br>'.join(f"{St[m['station']]['verb']}: " + ' + '.join(items[i]['name'] for i in m['inputs'])
                               for m in items[iid]['made_by'])
            mark = ' *new*' if items[iid]['pack'] != 'prototype' else ''
            L.append(f"| {items[iid]['name']}{mark} | {ways} | {', '.join(items[iid]['tags'])} |")
        L.append('')
    L += ['## Dishes, simple to complex', '', '| Dish | Components | Prep steps | Tags | Value |', '|---|---|---|---|---|']
    for did in order:
        dd = data['dishes'][did]
        mark = ' *new*' if dd['pack'] != 'prototype' else ''
        L.append(f"| {dd['name']}{mark} | {' + '.join(items[c]['name'] for c in dd['components'])} | "
                 f"{gamedata.dish_steps(dd, items)} | {', '.join(dd['tags'])} | {dd['value']} |")
    with open(os.path.join(OUT, 'paths', f'{ing}.md'), 'w') as f:
        f.write('\n'.join(L) + '\n')


def walk_gif(groups):
    C = {k: v for k, v in groups['characters'][0] + groups['guests'][0]}
    names = CHAR_LOOKS + FOLK_NAMES
    gt = grass().image()
    frames = []
    for f in ['walk1', 'idle', 'walk2', 'idle']:
        im = Image.new('RGBA', (4 * 32, len(names) * 32))
        for r, c in enumerate(names):
            for i, v in enumerate(CHAR_VIEWS):
                im.paste(gt, (i * 32, r * 32)); im.alpha_composite(C[f'{c}_{v}_{f}'].image(), (i * 32, r * 32))
        frames.append(im.resize((im.width * 4, im.height * 4), Image.NEAREST).convert('P', palette=Image.ADAPTIVE))
    frames[0].save(os.path.join(OUT, 'walk_cycles.gif'), save_all=True, append_images=frames[1:], duration=125, loop=0)


def main():
    os.makedirs(OUT, exist_ok=True)
    data = gamedata.write(OUT)
    groups = build_groups(data)
    atlas = {'palette': 'DawnBringer 32', 'outline': '#45283c', 'sheets': {}}
    for g, (entries, cw, ch, cols, _) in groups.items():
        atlas['sheets'][g] = {'image': f'{g}.png', 'cell': [cw, ch], 'frames': write_sheet(g, entries, cw, ch, cols)}
    for sheet, names in (('characters', CHAR_LOOKS), ('guests', FOLK_NAMES)):
        anims = {}
        for c in names:
            for v in CHAR_VIEWS:
                anims[f'{c}_idle_{v}'] = [f'{c}_{v}_idle']
                anims[f'{c}_walk_{v}'] = [f'{c}_{v}_walk1', f'{c}_{v}_idle', f'{c}_{v}_walk2', f'{c}_{v}_idle']
        atlas['sheets'][sheet]['animations'] = anims
    atlas['sheets']['characters']['note'] = 'right = mirrored left (both included); suggested walk speed 8 fps'
    anims = {}
    for lk in SITTERS:
        for v in CHAR_VIEWS:
            anims[f'{lk}_sit_{v}'] = [f'{lk}_sit_{v}_idle']
            anims[f'{lk}_eat_{v}'] = [f'{lk}_sit_{v}_eat1', f'{lk}_sit_{v}_eat2']
    for lk in CHAR_LOOKS:
        for v in CHAR_VIEWS:
            anims[f'{lk}_carry_idle_{v}'] = [f'{lk}_carry_{v}_idle']
            anims[f'{lk}_carry_walk_{v}'] = [f'{lk}_carry_{v}_walk1', f'{lk}_carry_{v}_idle', f'{lk}_carry_{v}_walk2', f'{lk}_carry_{v}_idle']
        anims[f'{lk}_work'] = [f'{lk}_work_up_1', f'{lk}_work_up_2']
    atlas['sheets']['actions']['animations'] = anims
    atlas['sheets']['actions']['note'] = ('sit: hips sit 8px above the frame bottom of a stool (draw the sitter 8px higher than the stool); '
                                          'sit_down is seen over the far side of a table (legs hidden), sit_up from behind. '
                                          'eat ~3 fps, carry walk 8 fps, work ~4 fps (stand one tile below the station)')
    atlas['sheets']['animated']['animations'] = {n: [f'{n}_f{i}' for i in range(k)] for n, _, k in LOOPS}
    anims = {}
    for n, _ in SPECIES:
        for v in CHAR_VIEWS:
            anims[f'{n}_idle_{v}'] = [f'{n}_{v}_idle']
            anims[f'{n}_walk_{v}'] = [f'{n}_{v}_walk1', f'{n}_{v}_idle', f'{n}_{v}_walk2', f'{n}_{v}_idle']
        for v in ('left', 'right'):
            anims[f'{n}_{ACTION_NAME[n]}_{v}'] = [f'{n}_{v}_idle', f'{n}_{v}_{ACTION_NAME[n]}']
    atlas['sheets']['animals']['animations'] = anims
    atlas['sheets']['animals']['note'] = 'walk ~6 fps; peck/graze/root ~2 fps; the cat sleep frame is a pose, not a loop'
    atlas['sheets']['carts']['animations'] = {f'{c}_roll_{v}': [f'{c}_{v}_f0', f'{c}_{v}_f1'] for c in ('handcart', 'wheelbarrow') for v in CHAR_VIEWS}
    atlas['sheets']['wagons_ns']['animations'] = {f'wagon_roll_{v}': [f'wagon_{v}_f{i}' for i in range(3)] for v in ('down', 'up')}
    atlas['sheets']['wagons_ns']['note'] = '32x64 north/south views. down = heading south (horse at the bottom, nearest the viewer); up = heading north (horse at the top).'
    atlas['sheets']['wagons']['animations'] = {f'wagon_roll_{v}': [f'wagon_{v}_f{i}' for i in range(3)] for v in ('left', 'right')}
    atlas['sheets']['wagons']['note'] = '64x32 east/west views; the horse is hitched in the rolling frames (~6 fps). wagon_parked_* has no horse. North/south views are in wagons_ns.'
    atlas['sheets']['props']['animations'] = dict(TOWN_ANIMATIONS)
    atlas['sheets']['ambient']['animations'] = {'bees': [f'bees_f{i}' for i in range(4)], 'jumping_trout': [f'jumping_trout_f{i}' for i in range(4)]}
    atlas['sheets']['ambient']['note'] = 'overlays: bees over a beehive (~8 fps), jumping trout over a fishing spot (~4 fps, then pause)'
    atlas['sheets']['animated']['note'] = 'fire, candle and cask loops ~6 fps; water ~3 fps (ping-pong highlights, stays seamless)'
    atlas['sheets']['tiles']['seamless'] = [n for n, _ in TILES] + [n for n, _ in TILE_VARIANTS]
    for k in ('terrain_grass_dirt', 'terrain_grass_water'):
        atlas['sheets'][k]['autotile'] = {
            'type': 'corner', 'variants': VARIANTS,
            'index': 'TL*1 + TR*2 + BL*4 + BR*8; bit = corner is ' + k.split('_')[-1] + ', 0 = grass',
            'name': f"{k.replace('terrain_', '')}_<index:02d>_v<variant>",
            'variant_rule': 'any variant fits any neighbour; pick per cell, e.g. hash(x, y) % variants'}
    atlas['sheets']['terrain_path']['autotile'] = {
        'type': 'edge', 'variants': PATH_VARIANTS,
        'index': 'N*1 + E*2 + S*4 + W*8; bit = path continues that way',
        'name': 'path_<index:02d>_v<variant>',
        'connectors': {n: {'road_corner_index': idx, 'path_index': conn} for n, idx, conn in CONNECTORS},
        'note': 'use a connector where a narrow path meets the wide road; open the north bit under a door'}
    atlas['sheets']['walls']['layout'] = [
        'TL  T    T    T    TR',
        'L   FACE FACE FACE R',
        'L   floor ...      R',
        'BL  B  B_end_L  (doorway)  B_end_R  B  BR']
    atlas['sheets']['interior_walls']['notes'] = {
        'materials': ['wood', 'stone'],
        'caps': 'cap_<material>_<kind>; kinds: ' + ', '.join(CAP_KINDS),
        'inner_corners': 'inner_A_B = the A cap and the B cap in one tile (e.g. inner_T_R where a right-hand wall turns into a top wall)',
        'side_doorways': 'L_end_bottom above the gap, L_end_top below it (same for R)',
        'cap_transitions': 'cap_<T|B|L|R>_<from>_to_<to>: T/B change left->right, L/R change top->bottom',
        'faces': 'face_<plaster|stone>_<plain|window|door|shelf>, face_plaster_to_stone, face_stone_to_plaster'}
    atlas['sheets']['floor_transitions']['autotile'] = {
        'type': 'dual-grid corner', 'pairs': [f'{a}->{b}' for a, b in FLOOR_PAIRS],
        'index': 'TL*1 + TR*2 + BL*4 + BR*8; bit = corner is the second material',
        'name': 'floor_<a>_<b>_<index:02d>',
        'note': 'tile 0 = all first material, 15 = all second; seams run along tile midlines'}
    atlas['sheets']['stairs']['link'] = {'stairs_up': 'stairs_down', 'stairs_down': 'stairs_up',
                                         'note': 'stairs_up covers a wall-face cell and the floor cell below it; walking into its top half loads the linked room and places the player on the paired stairs'}
    atlas['note'] = 'Pictures only. What things are (items, recipes, sources, shops, folk) lives in gamedata.json.'
    atlas['ui'] = build_ui(OUT)
    with open(os.path.join(OUT, 'atlas.json'), 'w') as f:
        json.dump(atlas, f, indent=2)
    write_terrain(OUT)
    preview(groups)
    mock_town(groups)
    mock_interior(groups)
    mock_floors(groups)
    mock_kitchen(groups)
    mock_shops(groups)
    mock_service(groups)
    mock_farm(groups)
    mock_road(groups)
    autotile_check()
    variants_compare()
    walk_gif(groups)
    codex(data, groups)
    simple_meals_map(data, groups)
    ingredient_report(data, groups, 'wheat')
    ingredient_report(data, groups, 'egg')
    ingredient_report(data, groups, 'milk')
    ingredient_report(data, groups, 'water')
    ingredient_report(data, groups, 'salt')
    ingredient_report(data, groups, 'peppercorns')
    ingredient_report(data, groups, 'chicken')
    ingredient_report(data, groups, 'pork')
    ingredient_report(data, groups, 'oats')
    drinks = [d for d, v in data['dishes'].items() if v['kind'] == 'drink']
    dish_paths_map(data, groups, drinks, 'DRINKS  -  simple to complex', os.path.join('paths', 'drinks.png'))
    food_sheet = Image.open(os.path.join(OUT, 'food.png')).convert('RGBA')
    mock_hud(OUT, os.path.join(OUT, 'mock_town.png'), food_sheet, atlas['sheets']['food']['frames'])
    mock_menus(OUT, os.path.join(OUT, 'mock_interior.png'), food_sheet, atlas['sheets']['food']['frames'])
    mock_ui_kit(OUT)
    mock_prompts(OUT, os.path.join(OUT, 'mock_town.png'), os.path.join(OUT, 'mock_floors.png'))
    print('ok', {g: len(v[0]) for g, v in groups.items()})


if __name__ == '__main__':
    main()
