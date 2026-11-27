# Hearthwick engine

A small TypeScript engine that brings the Hearthwick art pack to life. PC first, Xbox controller or keyboard.
It reads everything from the art pipeline's output (`../dist`): `atlas.json` says where every sprite and
animation is, `gamedata.json` holds the content (items, shops, forage nodes, animals...).

## Play online

https://kgw279.github.io/hearthwick/ is published by `.github/workflows/pages.yml` on every push to `main`. The published site only includes the sheets and data the game loads; the art pipeline's mockups stay out.

## Run it locally

1. Install Node.js (LTS) from https://nodejs.org once.
2. Double-click `start.bat`, or in this folder run:

   ```
   npm install
   npm run dev
   ```

   Your browser opens the game at http://localhost:5173. Press F11 for fullscreen.

`npm run check` type-checks; `npm run build` makes a static copy in `build/`.

## Controls

| Action | Xbox controller | Keyboard |
|---|---|---|
| Move | Left stick / D-pad | WASD / arrow keys |
| Interact (talk, harvest, shop, read) | A | E / Space / Enter |
| Back / close | B | Esc |
| Cook | X | F |
| Recipes | Y | R |
| Tabs | LB / RB | Q / C |
| Menu | Menu | Tab |
| Map | View | M |
| Debug overlay (colliders, FPS) | – | F3 |

On-screen prompts switch between Xbox and keyboard glyphs to match whatever you touched last.

## How it's built

```
src/
  main.ts            boot: load assets, start the loop
  core/
    assets.ts        reads atlas.json + gamedata.json, loads sheets, sprites/animations by name
    loop.ts          fixed 60 Hz update, render every display frame
    renderer.ts      480x270 virtual screen, whole-number scaling, depth-sorted draw queue, 9-slice
    input.ts         keyboard + Xbox (Gamepad API) -> actions, pressed/held, last-used device + glyphs
    anim.ts          animation player and looping frames
    camera.ts        smooth follow, clamped to the world, pixel-snapped
    geom.ts          rectangles, deterministic hash for tile variants
  world/
    tilemap.ts       character-grid map -> autotiled ground (roads, water, narrow paths), animated water
    entity.ts        Entity base + Prop (sprite or loop, collider, interaction, depth line)
  ui/
    text.ts          pixel fonts (outlined and ink), measuring, word wrap
    widgets.ts       button prompt chip, dialog box with speaker ribbon, emotes, floating text
  game/
    data.ts          typed views of gamedata.json
    player.ts        walking, facing, sliding collision, "what am I facing" probe
    town.ts          the town layout: map, buildings, shops, forage, farm, townsfolk
    game.ts          ties it together: update, interact, render, debug
```

Rules the engine follows:
- **Art and content come only from `../dist`.** Sprites are looked up by name; nothing hard-codes pixel
  positions in sheets. Rebuilding the art pack updates the game.
- **Pixel-perfect.** Everything draws at native size into a 480x270 buffer that is scaled by a whole
  number (4x on a 1080p screen).
- **Depth by feet.** World sprites sort by their bottom edge, so you walk behind and in front of things.
- **Actions, not buttons.** Game code asks `input.pressed('interact')`, never "was A pressed".

## Milestone 1 (this version)

Walk around Hearthwick: the inn and six shops along the high street, the town square, the meadow with
forage, the pond with ducks and a leaping trout, and the farm. Talk to townsfolk, read the signpost, browse
shop stock (live from `gamedata.json`), harvest forage, pet the animals.
