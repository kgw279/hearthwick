# Hearthwick pixel pack (v0.28)

32×32 grid (the inn is 64×64), DawnBringer-32 palette, 1px plum outline (#45283c), top-down ¾ view.

## Sheets (`dist/`)
| Sheet | Contents |
|---|---|
| `tiles.png` | Seamless terrain: grass, grass_flowers, dirt_path, cobblestone, wood_floor, water, farmland, wheat_crop, plus 2 extra variants each of grass, dirt and water (`grass_v1`, `grass_v2`, …) |
| `terrain_grass_dirt.png`, `terrain_grass_water.png` | Corner autotiles for grass↔dirt and grass↔water: 16 tiles × 3 variants (one row per variant), named `grass_dirt_<index>_v<variant>` |
| `terrain_path.png` | Narrow 1-tile dirt path: 16 edge-connected tiles × 2 variants, plus 4 connectors where a path meets the wide road |
| `walls.png` | Room kit: wall caps (TL, T, TR, L, R, BL, B, BR, B_end_L, B_end_R), wall faces (plain, window, door, shelf, stone), floors (flagstone, terracotta tiles) |
| `interior_walls.png` | The full room kit in wood and stone. For each material: outer corners, straight caps, inner corners (`inner_T_L`, `inner_T_R`, `inner_B_L`, `inner_B_R`) for L-shaped rooms, front-wall door ends, side-wall door ends (`L_end_top` / `L_end_bottom`, `R_end_*`). Plus caps that change material (`cap_T_wood_to_stone`, …) and wall faces in plaster and stone (plain, window, door, shelf), with `face_plaster_to_stone` / `face_stone_to_plaster`. |
| `floor_transitions.png` | 16-tile floor transitions for wood→flagstone and wood→terracotta, with a threshold strip at the join |
| `furniture.png` | long_table and bench (left, middle, right; repeat the middle for any length), bookshelf, cupboard, wardrobe, armchair, runner rug (left, middle, right), doormat, floor_lamp, barrel_stack, stairs_down. Wall decorations you lay over any wall face: painting, sconce, menu_board, banner |
| `stairs.png` | stairs_up (32×64) |
| `forage.png` | Wild crops, each with a `_ready` and a `_harvested` state: wild_wheat, berry_bush, mushroom_patch, herb_patch, carrot_patch, potato_patch, onion_patch, tomato_vine, apple_tree, oak_tree (acorns), cress_patch, game_trail (venison), bird_nest (eggs), beehive (honey), fishing_spot (trout), water_well (water: bucket on the rim when ready, lowered when harvested), oat_patch (wild oats: drooping golden spikelets) |
| `buildings.png` | 64×64: hearthwick_inn, bakery, butcher, general_store, dairy, fishmonger, spice_shop |
| `props.png` | Houses (red/blue/green roof), tree, bush, barrel, crate, fence, lamppost, well, signpost, market_stall |
| `stations.png` | Kitchen stations, one per cooking method: hand_mill (grind), mixing_table (mix), cutting_board (chop), stove (fry), grill (grill), oven (bake), cauldron (boil). Also dining_table and stool |
| `interior.png` | inn_wall (tiles horizontally), fireplace, bar_counter (tiles horizontally), keg, shelf_jars, rug, bed, nightstand, potted_plant, chest |
| `characters.png` | kid, baker, elder, girl, plus shopkeepers butcher, fishmonger, dairymaid, spicer. Each has 4 directions (down, up, left, right) × 3 frames (idle, walk1, walk2). Rows = characters, columns = direction then frame. Right is the left view mirrored. |
| `guests.png` | Folk guests, laid out the same way: dwarf, elf, beetle (beetle-folk), frog (frog-folk), minotaur |
| `food.png` | Every item and dish in `gamedata.json` (354 sprites), named by game id: 26 raw ingredients, 179 prepared items and 149 dishes (`dish_*`). `codex.png` shows each one with its name and how it's made. `simple_meals.png` maps the simplest dishes step by step |

## Ingredient packs
New content is added as packs on top of the prototype design (`src/content_<ingredient>.py`). A pack can add items, prep steps, combos and dishes. It can't change an existing step: the build stops if a pack reuses a station + input pair. Every item and dish records its `pack`: `prototype`, `simple_meals` or the pack name.

Each pack gets a report in `dist/paths/`:
- `<ingredient>_tree.png` — every item made from the ingredient, stage by stage. Lines are coloured by station, small icons show the other ingredients each step needs, and gold borders mark new content
- `<ingredient>_dishes.png` — every dish that uses it, simple to complex, with the full path drawn
- `<ingredient>.md` — the written plan: each stage's items with every way to make them, then the dishes with prep-step counts

**Wheat pack:** 11 new items (dumplings, dough balls, bread rolls, fritters, crackers, breadcrumbs, croutons, bread pudding, herb stuffing, crumbed trout, granola) and 13 new dishes. Wheat now leads to 32 items and 31 dishes.

**Egg pack:** 9 new items (baked egg, egg mash, whipped egg whites, meringues, custard, mushroom frittata, cheese omelette, cheese quiche, Scotch egg) and 13 new dishes, from Meringue Kisses up to the Full Hearthwick Breakfast.

**Milk pack:** 9 new items (butter, brown butter, fresh curds, cream sauce, clotted cream, grain pudding, potato soup, scones, shortbread) and 14 new dishes, from Cold Milk up to Venison in Cream Sauce. Milk now leads to 35 items and 46 dishes.

**Water pack:** water becomes the 21st raw ingredient, drawn from the new `water_well` forage node. Packs can now add raw ingredients (`RAW` in a content file, `@raw` for its sprite). 8 new items (boiling water, herb tea, spiced apple tea, berry cordial, poached egg, poached trout, vegetable stock, garden soup) and 10 new dishes, from Cup of Well Water up to Garden Soup & Bread.

**Water in existing recipes:** every boiled or braised step now needs water: broths and stocks, boiled grain, potatoes, carrots, noodles and eggs, dumplings, braised meats and honey syrup. So does flatbread dough. These changes to existing steps live in `src/revisions.py`, applied last, so `design_src.py` still matches the prototype exactly.

**Seasoning pack:** salt and peppercorns become raw ingredients, sold at Zephra's Spices and the Greengrocer (salt). Everyday seasoning is implied; salt and pepper only appear where they're the point of the dish: brine, pickled onions and carrots, salt beef, salt-crusted trout, salted acorns, cracked pepper and pepper steak. 8 new dishes, from Salted Acorns up to Pepper Steak & Fries, including a Ploughman's Lunch.

**Chicken pack:** chicken becomes a raw ingredient, sold at Hollin's Butchery. 9 new items (chicken pieces, grilled, roast and pan-fried chicken, chicken stock, chicken noodle soup, chicken pie, honey-glazed chicken, ember chicken skewers) and 11 new dishes, from Cup of Chicken Broth up to Roast Chicken Supper.

**Pork pack:** pork becomes a raw ingredient, sold at Hollin's Butchery. 13 new items: diced pork, sausage meat, fried sausages, bacon (cured with salt), crispy bacon, grilled pork chop, roast pork, honey-baked ham, lard, hot-water pastry (flour, lard and water), pork pie, sausage rolls, and pork & apple stew. 11 new dishes, from Bacon Sandwich up to Roast Pork Supper.

**Oats pack:** oats become a raw ingredient, from wild oat patches or Willowmill Bakery. 10 new items: rolled oats, toasted oats, oat porridge, oatcakes, honey flapjacks, crumble topping, apple and berry crumble, skirlie (oats fried with onion) and oat-crusted trout. 10 new dishes, from Bowl of Porridge up to Apple Crumble & Custard.

**Drinks pack:** a new station, the **brewing cask** (method `ferment`, sprite `brewing_cask` in `stations.png`, icon `method_ferment`). 10 new items: apple juice (pressed in the mill), hearth ale (water + toasted grain), oat stout (water + toasted oats), orchard cider (apple juice), honey mead (water + honey), berry wine (crushed berries), mulled cider, mulled wine, berry milk and eggnog. 12 new dishes, including two pairings: Pie & a Pint, and a Cheese & Wine Board. Kept drinks are drawn in jugs, bottles and glasses; served drinks in tankards, goblets and mugs on a coaster. Every dish now has `kind: "food"` or `"drink"` (17 drinks in all, counting the earlier teas, milks, cordial and water); `paths/drinks.png` maps them all.

**Art catch-up:** every shop now has a building: `dairy`, `fishmonger` and `spice_shop` join the bakery, butcher and general store in `buildings.png` (linked from `gamedata.json` via `src/revisions.py`). Four shopkeepers join the characters sheet, each with 4 directions and walk frames: `butcher`, `fishmonger`, `dairymaid` and `spicer`. There's a capital-letter font, `ui_font_letters.png` (A–Z plus ! ? , ' & ( )), matching the digit font. New icons `kind_food` and `kind_drink` mark dishes on menus. `mock_shops.png` shows the market street with each keeper; `mock_kitchen.png` now includes the brewing cask and tables set with salt and pepper.

**Actions and animation:** `actions.png` adds poses built on the shared character skeleton:
- **Sit** for every townsperson, shopkeeper and guest folk, in all 4 views, each with two eating frames (fork to mouth). From the side the sitter perches on a stool, `sit_down` sits on the far side of a table (legs hidden) and `sit_up` is seen from behind.
- **Carry** a tray with a plate and mug, for the townsfolk, in all 4 views, walking.
- **Work** at a station, seen from behind, with arms alternating.

`animated.png` adds looping frames: fire in the stove, oven, grill and hearth, the cauldron (fire and rising steam), the candle on a set table, the cask drip, and drifting water highlights. `atlas.json` lists every animation and suggests a speed for each. `mock_service.gif` shows dinner service with all of it running.

**Animals:** `animals.png` has the creatures behind the ingredients: hen, rooster and chick (eggs, chicken), cow (milk, beef, cheese), pig (pork), sheep (mutton) and deer (venison), plus an inn cat. Each has side views with idle, two walk frames and an action (peck, graze, root, or sleep for the cat), and front and back views with walk frames. `ambient.png` has overlay loops: bees over the beehive and a trout leaping at the fishing spot. `farm.png` has a chicken coop, feed trough, hay bale and milk pail. `gamedata.json` gains `animals` (home and related ingredients) and `ambient` (which forage node each loop plays over). `mock_farm.gif` shows the farmyard.

**Horse, ducks and carts:** the horse (pulls travelers' wagons), duck (with a swim frame) and duckling join `animals.png`. `wagons.png` (64×32) has a covered wagon with the horse hitched and rolling wheels (3 frames, left and right) and a parked version. `carts.png` has a handcart of produce and a wheelbarrow (2 rolling frames each, left and right). `farm.png` adds a hitching post with a water trough. `wagons_ns.png` (32×64) adds the wagon heading north (horse at the top) and south (horse at the bottom), rolling and parked. The handcart and wheelbarrow also have north and south views, so all carts move in all four directions. `mock_road.gif` shows wagons on east–west and north–south roads past the inn.

`tableware.png`: a salt cellar and pepper mill for the dining tables, each drawn full, half and empty, plus `dining_table_set_full/half/empty` with both already on the table.

## Two data files
- **`atlas.json`** says where each picture is: sheet, rectangle, animations, tiling rules.
- **`gamedata.json`** says what things are: items, recipes, sources, shops and folk. It's built from the Hearthwick Inn prototype's design (`src/design_src.py`).

### gamedata.json (`schema: hearthwick.gamedata/1`)
| Key | Contents |
|---|---|
| `items` | Each item's `name`, `kind` (raw or prepared), `tags`, `value`, `shelf_life_days` and `sprite`. Also `sources` (forage spot, shop and price, or forage node), `made_by` (every station and input combination that produces it), `used_in` (items and dishes it feeds) and `legacy_id` (the prototype's id) |
| `dishes` | Listed simplest-first (fewest prep steps from raw). 35 come from the prototype and 12 are new simple meals (`legacy_id: null`). Each dish's `name`, `components`, `station: plate`, `tags`, `value`, `origin_folk`, `starter` and `sprite` |
| `stations` | chop / grind / mix / fry / boil / grill / bake / plate, each linked to its station sprite |
| `forage_spots`, `forage_nodes` | What each wild spot gives, and which harvestable node sprite stands for it |
| `shops`, `folk`, `tags`, `rules` | Shop stock and prices; each folk's likes, hates and attitude to odd food; tag colours and icons; the odd-tag rule |
| `validation` | Results of the build's checks. Every input exists, every raw item has a source, every prepared item has a recipe, every item is obtainable, every dish is cookable, no two dishes share the same components, and every item has a sprite. The build stops if any check fails. Warnings list items no recipe uses |

`atlas.json` has the frame rect for every sprite, plus:
- walk and idle animations for every character and direction (`kid_walk_left` = walk1, idle, walk2, idle; about 8 fps)
- the autotile index rule

## UI kit
Drawn at 1x on a 16px icon grid. Scale the whole game by a whole number (2x, 3x or 4x) so pixels stay crisp.

| Sheet | Contents |
|---|---|
| `ui_frames.png` | Stretchable frames: panel_parchment, panel_wood, panel_dark, panel_inset. Buttons in primary (honey), secondary (wood), danger (berry), success (mint) and disabled, each with a pressed version. Inventory slot (normal, selected, locked). Progress bar frame plus fills (green, honey, red, blue, pink). Speech bubble and its tail. A tag pill for each flavour |
| `ui_cursor.png` | selection_bracket (32×32 tile highlight) |
| `ui_icons.png` | 16×16 icons. **General:** coin(s), heart / heart_empty, star / star_empty, friendship, clock, sun, moon, cloud, rain, snow, bag, recipe_book, map, kitchen, inn, person, settings, close, check, plus, minus, the four arrows, lock, bell, exclaim, question, hand, sparkle, fire, speech. **Cooking methods** (one per station): method_grind, method_mix, method_chop, method_fry, method_grill, method_bake, method_boil. **Flavour tags:** tag_savory, tag_sweet, tag_hearty, tag_fresh, tag_warm, tag_fish, tag_meat, tag_odd |
| `ui_emotes.png` | 20×20 bubbles shown over a guest's head: love, happy, angry, sweat, sleep, exclaim, question, music, hungry, and request. Request is empty so you can draw the dish the guest wants inside it |
| `ui_xbox.png` | Controller button prompts (Xbox layout), 16×16, each with a `_pressed` frame. Face buttons xb_a, xb_b, xb_x, xb_y. Shoulders and triggers xb_lb, xb_rb, xb_lt, xb_rt. D-pad (xb_dpad, plus _up, _down, _left, _right, _horizontal, _vertical). Sticks: press (xb_ls, xb_rs) and move (xb_ls_move, xb_rs_move). xb_view, xb_menu. Swap between a button and its pressed frame about 3 times a second to make a prompt pulse |
| `ui_font_digits.png` | Number font for counters and timers: 0–9 + - x / : % . as 5×7 glyphs with an outline. Space characters 6px apart |
| `ui_font_letters.png` | Capital letters A–Z plus ! ? , ' & ( ), in the same 5×7 style as the digits. Use the two sheets together; a space is 4px. |
| `ui_font_lower.png` | Lowercase a–z in the same style, in 7×10 cells. Draw every font sheet at the same y so they share a baseline; the extra bottom row holds the descenders of g, j, p, q and y. |
| `ui_font_ink.png` | Every character (digits, capitals, lowercase) in dark brown ink with no outline, for light panels like parchment, cards and text fields. Same spacing and baseline as the other fonts. |
| `ui_frames2.png` | More 9-slice pieces (slice borders are in the atlas): active and inactive tabs, text field (plain and focused), dropdown field, tooltip, toast notification, ribbon title banner, slider track and fill, scroll track, card, divider. |
| `ui_portrait_frame.png` | 40×40 ornate frame for dialogue portraits; the 32×32 opening starts at (4, 4). |
| `ui_controls.png` | 16×16 controls: checkbox (off, on, disabled), radio, toggle, slider knob, scroll thumb, scroll arrows, dropdown button, plus/minus steppers, close button, badge, text caret. Also mouse cursors (arrow, hand, grab, text, busy) with hotspots listed in the atlas. |
| `ui_icons2.png` | 16×16 system icons: save, trash, info, search, home, back, refresh, sound and music on/off, play, pause, fullscreen, gamepad, keyboard, calendar, the four seasons, quest, trophy, gift, mail, half heart and half star. |
| `ui_keys.png` / `ui_keys_wide.png` | Keyboard and mouse prompts: W A S D E F Q R I M C Z X, 1–9 and the arrow keys; Space, Shift, Enter, Tab, Esc, Ctrl, Alt and Backspace; mouse left, right, middle and scroll. Each has a `_pressed` version, plus suggested key bindings. |
| `ui_loading.png` | 8-frame loading spinner and a timer ring in 9 steps from empty to full. |
| `mock_ui_kit.png` | A settings screen built only from these pieces and the game's own fonts. |

**Button prompts.** `atlas.json` suggests a default control layout:
- A: interact, harvest, talk
- B: back
- X: cook at a station
- Y: recipe book
- LB / RB: switch tabs
- Left stick: move
- Right stick: camera or cursor
- D-pad: quick select
- View: map
- Menu: pause
- Hold RT: run

A prompt is a dark panel holding the button and a word, such as "Harvest" or "Cook". `mock_prompts.png` shows prompts over the world and a bar of control hints.

**Stretching frames.** Each frame's `slice` value in `atlas.json` gives the border widths that stay fixed. Repeat the edges and centre rather than stretching them. Buttons use a separate top and bottom border (`[6, 5, 6, 7]`) so their bottom lip stays the same at any height.

There's no letter font. A free pixel font such as m5x7 or Pixel Operator suits the art; the mocks just use a placeholder font.

`mock_hud.png` and `mock_menus.png` show the kit in use: a coin counter, friendship meter, clock and weather, a tab bar, a guest asking for a dish, a pickup toast, a pantry grid and a recipe card.

## Variants
Every variant fits next to every other variant. Pick one per cell with a stable hash, e.g. `hash(x, y) % variants`, so the map looks the same each time it's drawn. `variants_compare.png` shows the same road edge drawn with one variant and with mixed variants.

## Narrow paths
Tile index = `N*1 + E*2 + S*4 + W*8`, where each bit means the path continues that way. A path always crosses a tile edge at the same 12px, so any two tiles that connect line up.
- Under a door, set the N bit so the path runs up into the doorstep.
- Where a path meets the wide road, use a connector instead: `path_into_road_below`, `path_into_road_above`, `path_into_road_left` or `path_into_road_right`.

## Rooms
```
TL  T     T     T     TR
L   FACE  FACE  FACE  R
L   floor ...         R
BL  B  B_end_L  ·  B_end_R  B  BR    (· = doorway, leave the floor showing)
```
`mock_interior.png` shows a full inn room built from these pieces.

## Floor transitions
Keep a corner grid of floor materials. Each tile takes its index from its four corners: `TL*1 + TR*2 + BL*4 + BR*8`, where a bit is 1 for the second material. Tile 0 is all wood and tile 15 is all stone or terracotta. Joins always run along the middle of a tile, so neighbouring tiles always match.

## Stairs between rooms
`stairs_up` covers two cells: a wall-face cell and the floor cell below it. Walking into its top half loads the linked room and puts the player on that room's `stairs_down`. Walking onto `stairs_down` leads back. `mock_floors.png` shows both rooms: an L-shaped ground floor (wood hall and stone kitchen, with a side doorway and a front doorway) and the guest floor upstairs.

## Corner autotiles
A tile's index comes from its four corners: `TL*1 + TR*2 + BL*4 + BR*8`. A bit is 1 where that corner is the other terrain (dirt or water) and 0 where it's grass. Tile 0 is all grass and tile 15 is all dirt or water. Keep a corner grid one cell bigger than your map in each direction, then pick each tile from its four corners. Dirt and water must not meet inside a single tile.

## Review images
`codex.png`, `simple_meals.png`, `preview.png`, `walk_cycles.gif`, `mock_town.png`, `mock_interior.png`, `mock_floors.png`, `mock_hud.png`, `mock_menus.png`, `mock_prompts.png`, `mock_prompts_pulse.gif`, `mock_kitchen.png`, `variants_compare.png`, `autotile_check.png` (random corner fields and a random path network with mixed variants, so seam bugs show up as hard lines), `tiles_seamless_check.png`

## Opening in Aseprite
File → Import Sprite Sheet → choose the sheet → Type: By Rows, 32×32 (64×64 for buildings). Each sprite becomes a frame.

## Editing
All sprites are code in `src/` (`sprites.py` for batch 1, `sprites2.py` for autotiles, the inn and stations, `sprites3.py` for characters, interior and food wave 2, `sprites4.py` for guests, signature dishes and shops, `sprites5.py` for paths, the wall kit and forage, `sprites6.py` for the interior kit, floor transitions, stairs and furniture, `ui.py`, `xbox.py` and `ui_build.py` for the UI kit, `design_src.py` + `gamedata.py` for the game data, `items_art.py` for every item and dish sprite). After any change, run `python3 src/build.py` to rebuild every sheet, the atlas and the previews.

## Game engine

**Play it live:** https://kgw279.github.io/hearthwick/ (rebuilt and published automatically on every push to `main`).

`engine/` is the TypeScript engine that runs this pack (PC, Xbox controller or keyboard). It reads `dist/atlas.json` and `dist/gamedata.json` directly. See `engine/README.md`; double-click `engine/start.bat` to play.
