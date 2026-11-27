/**
 * The town of Hearthwick: ground map and everything placed on it. Pure layout data plus small
 * interactions (talk, read, harvest) that prove the engine end to end. Shops and forage nodes come
 * from gamedata.json, so their names, stock and sprites stay in sync with the content pipeline.
 */
import type { Assets } from '../core/assets';
import type { Rect } from '../core/geom';
import { Prop, type PropSpec } from '../world/entity';
import { TILE } from '../world/tilemap';
import type { Content } from './data';

export const TOWN_MAP = [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '....D....D...D..........D...D...D...D...',
  '....p....p...p..........p...p...p...p...',
  'dddddddddddddddddddddddddddddddddddddddd',
  '........p...........d......p............',
  '........p...........d......p............',
  '........p...........d......p............',
  '.....ppppppp........d......p............',
  '....................d......p............',
  '....................d....wwwwww.........',
  '....................d....wwwwww.........',
  '....................d....wwwwww.........',
  '....................d....wwwwww.........',
  '....................d....wwwwww.........',
  '....................d...................',
  '....................d...................',
  '....................d...................',
  '....................d...................',
];

export const SPAWN = { x: 4 * TILE, y: 7 * TILE };

/** Hooks the town uses to talk back to the game (dialog, emotes, floating text). */
export interface TownHooks {
  say(text: string, speaker?: string): void;
  emote(name: string): void;
  float(text: string): void;
}

// Colliders for props, relative to the 32x32 sprite.
const SOLID: Record<string, Rect> = {
  tree: { x: 11, y: 22, w: 10, h: 7 }, bush: { x: 6, y: 18, w: 20, h: 10 }, barrel: { x: 9, y: 19, w: 14, h: 9 },
  crate: { x: 7, y: 17, w: 18, h: 11 }, fence: { x: 0, y: 21, w: 32, h: 6 }, lamppost: { x: 13, y: 24, w: 6, h: 5 },
  well: { x: 6, y: 16, w: 20, h: 12 }, signpost: { x: 13, y: 24, w: 6, h: 4 }, market_stall: { x: 2, y: 14, w: 28, h: 14 },
  house: { x: 2, y: 12, w: 28, h: 16 }, forage: { x: 9, y: 21, w: 14, h: 7 }, npc: { x: 10, y: 22, w: 12, h: 6 },
  hitching_post: { x: 4, y: 16, w: 24, h: 10 }, chicken_coop: { x: 5, y: 12, w: 22, h: 16 }, hay_bale: { x: 6, y: 13, w: 20, h: 13 },
  feed_trough: { x: 5, y: 18, w: 22, h: 8 }, big_animal: { x: 7, y: 20, w: 18, h: 8 },
};

// Shops along the high street: shop id (gamedata.json) -> door column.
const SHOP_DOORS: Array<[string | null, number]> = [
  [null, 4], ['mill', 9], ['butcher', 13], ['grocer', 24], ['dairy', 28], ['fish', 32], ['spice', 36],
];

const t = (n: number) => n * TILE;

export function buildTown(assets: Assets, content: Content, hooks: TownHooks): Prop[] {
  const props: Prop[] = [];
  const add = (spec: PropSpec) => props.push(new Prop(assets, spec));
  const deco = (frames: string | string[], tx: number, ty: number, solid?: keyof typeof SOLID, extra: Partial<PropSpec> = {}) =>
    add({ frames, x: t(tx), y: t(ty), solid: solid ? SOLID[solid] : undefined, ...extra });

  // ---- high street: the inn and the shops, all from gamedata.json
  for (const [shopId, col] of SHOP_DOORS) {
    const building = shopId ? content.shop(shopId).building! : 'hearthwick_inn';
    const name = shopId ? content.shop(shopId).name : 'The Hearthwick Inn';
    add({
      frames: building, x: t(col) - 16, y: t(5), solid: { x: 4, y: 30, w: 56, h: 30 }, sortOffset: 60,
      use: { x: 16, y: 54, w: 32, h: 22 },
      interaction: {
        label: shopId ? 'Shop' : 'Enter',
        use: () => {
          if (!shopId) return hooks.say('Warm light spills from the windows. Your inn: soon there will be guests to feed.', name);
          const stock = content.shop(shopId).stock.map((s) => `${content.itemName(s.item)} ${s.price}`).join(', ');
          hooks.say(`Today's stock: ${stock}.`, name);
        },
      },
    });
  }

  // ---- houses and trees
  for (const [k, x, y] of [['house_red', 1, 2], ['house_blue', 11, 2], ['house_green', 16, 3], ['house_red', 27, 2], ['house_blue', 34, 2]] as const) {
    deco(k, x, y, 'house');
  }
  const trees: Array<[number, number]> = [
    [0, 0], [3, 0], [6, 0], [9, 1], [14, 0], [19, 1], [22, 0], [25, 0], [31, 1], [37, 0], [39, 2],
    [0, 4], [0, 11], [0, 15], [0, 19], [39, 6], [39, 11], [39, 22],
    [1, 22], [4, 23], [9, 22], [13, 23], [17, 22], [23, 22], [26, 23], [30, 22], [15, 16], [17, 12],
  ];
  for (const [x, y] of trees) deco('tree', x, y, 'tree');

  // ---- town square
  deco('well', 18, 6, 'well', { interaction: { label: 'Draw water', use: () => { hooks.emote('emote_happy'); hooks.float('+ Water'); } } });
  const market = content.shop('market');
  deco('market_stall', 22, 6, 'market_stall', {
    interaction: { label: 'Browse', use: () => hooks.say(`Fresh today: ${market.stock.map((s) => content.itemName(s.item)).join(', ')}.`, market.name) },
  });
  deco('signpost', 21, 8, 'signpost', {
    interaction: { label: 'Read', use: () => hooks.say('HEARTHWICK. West: the Sunny Meadow. South: the pond. East: the farm.') },
  });
  for (const x of [7, 17, 26, 34]) deco('lamppost', x, 7, 'lamppost');
  deco('barrel', 11, 7, 'barrel');
  deco('crate', 15, 7, 'crate');
  deco('barrel', 30, 7, 'barrel');

  // ---- townsfolk (Talk)
  const npc = (frame: string, tx: number, ty: number, line: string, who: string) =>
    deco(frame, tx, ty, 'npc', { interaction: { label: 'Talk', use: () => hooks.say(line, who) } });
  npc('baker_down_idle', 10, 7, 'Fresh loaves every morning! The mill sells flour, eggs and oats.', 'Baker');
  npc('elder_down_idle', 19, 7, 'Welcome to Hearthwick. The inn has stood here longer than I have.', 'Elder');
  npc('dwarf_left_idle', 6, 10, "Is the ale ready yet? I walked all the way from the mountains for it.", 'Dwarf traveler');

  // ---- by the inn: hitching post, horse, cat
  deco('hitching_post', 1, 7, 'hitching_post');
  deco(assets.animation('horse_graze_left'), 2, 7, 'big_animal', { fps: 1, interaction: { label: 'Pet', use: () => hooks.emote('emote_love') } });
  deco(assets.animation('cat_walk_down').slice(0, 1).concat(['cat_left_sleep']), 3, 10, undefined, {
    fps: 0.5, interaction: { label: 'Pet', use: () => hooks.emote('emote_love') },
  });

  // ---- forage nodes (Harvest swaps the sprite to its harvested state)
  const forage = (node: string, tx: number, ty: number) => {
    const data = content.forageNode(node);
    let ready = true;
    const prop = new Prop(assets, {
      frames: data.states.ready, x: t(tx), y: t(ty), solid: SOLID.forage,
      interaction: {
        label: 'Harvest',
        use: () => {
          if (!ready) return;
          ready = false;
          prop.setFrames(data.states.harvested);
          prop.setInteraction(null);
          hooks.emote('emote_happy');
          hooks.float(`+ ${content.itemName(data.yields)}`);
        },
      },
    });
    props.push(prop);
  };
  for (const [n, x, y] of [
    ['wild_wheat', 2, 15], ['wild_wheat', 3, 15], ['herb_patch', 5, 16], ['bird_nest', 10, 15], ['beehive', 12, 17],
    ['oat_patch', 2, 18], ['oat_patch', 3, 18], ['carrot_patch', 7, 18], ['potato_patch', 9, 19], ['berry_bush', 6, 20],
    ['mushroom_patch', 4, 21], ['apple_tree', 13, 20], ['cress_patch', 24, 16], ['onion_patch', 31, 18],
  ] as const) forage(n, x, y);
  deco(assets.animation('bees'), 12, 17, undefined, { fps: 8, sortOffset: 40 });

  // ---- pond
  deco('fishing_spot_ready', 27, 15, undefined, {
    interaction: { label: 'Fish', use: () => { hooks.emote('emote_exclaim'); hooks.float(`+ ${content.itemName('trout')}`); } },
  });
  deco(assets.animation('jumping_trout'), 29, 17, undefined, { fps: 3, sortOffset: 40 });
  deco('duck_left_swim', 26, 17);
  deco('duck_right_swim', 29, 16);

  // ---- farm
  for (let x = 32; x <= 38; x++) {
    deco('fence', x, 12, 'fence');
    deco('fence', x, 21, 'fence');
  }
  deco('chicken_coop', 33, 13, 'chicken_coop');
  deco('hay_bale', 38, 14, 'hay_bale');
  deco('feed_trough', 36, 16, 'feed_trough');
  const animal = (anim: string, tx: number, ty: number, fps: number, big = false) =>
    deco(assets.animation(anim), tx, ty, big ? 'big_animal' : undefined, { fps, interaction: { label: 'Pet', use: () => hooks.emote('emote_love') } });
  animal('hen_peck_left', 34, 15, 2);
  animal('hen_peck_right', 36, 14, 2);
  animal('rooster_idle_down', 33, 16, 1);
  animal('cow_graze_left', 35, 18, 1, true);
  animal('pig_root_right', 37, 19, 1.5, true);
  animal('sheep_graze_left', 33, 19, 1, true);
  deco('wagon_parked_left', 35, 10, undefined, { solid: { x: 14, y: 16, w: 32, h: 12 } });

  return props;
}
