/**
 * Turns a layout (src/maps/*.json) into a playable scene: the ground, every prop with its placement
 * and collider resolved from the art, and behaviors wired to the game (talk, shop, forage...).
 * The editor uses the same functions, so what it shows is exactly what the game builds.
 */
import type { Assets } from '../core/assets';
import type { Rect } from '../core/geom';
import { Prop, type Interaction } from '../world/entity';
import type { Ground } from '../world/ground';
import type { Behavior, Layout, LayoutGround, PlacedProp } from '../world/layout';
import { RoomMap } from '../world/room';
import { cellExit, spawnAt, type Exit, type Scene } from '../world/scene';
import { TileMap, TILE } from '../world/tilemap';
import type { Content } from './data';

/** Ways a scene talks back to the game (dialog, emotes, floating text, changing scene). */
export interface SceneHooks {
  say(text: string, speaker?: string): void;
  emote(name: string): void;
  float(text: string): void;
  go(scene: string, spawn: string): void;
}

/** Named colliders, relative to the sprite's top-left, for props whose footprint isn't simply their art's base. */
export const COLLIDERS: Record<string, Rect> = {
  tree: { x: 11, y: 22, w: 10, h: 7 }, bush: { x: 6, y: 18, w: 20, h: 10 }, barrel: { x: 9, y: 19, w: 14, h: 9 },
  crate: { x: 7, y: 17, w: 18, h: 11 }, fence: { x: 0, y: 21, w: 32, h: 6 }, lamppost: { x: 13, y: 24, w: 6, h: 5 },
  well: { x: 6, y: 16, w: 20, h: 12 }, signpost: { x: 13, y: 24, w: 6, h: 4 }, market_stall: { x: 2, y: 14, w: 28, h: 14 },
  house: { x: 2, y: 12, w: 28, h: 16 }, forage: { x: 9, y: 21, w: 14, h: 7 }, npc: { x: 10, y: 22, w: 12, h: 6 },
  hitching_post: { x: 4, y: 16, w: 24, h: 10 }, chicken_coop: { x: 5, y: 12, w: 22, h: 16 }, hay_bale: { x: 6, y: 13, w: 20, h: 13 },
  feed_trough: { x: 5, y: 18, w: 22, h: 8 }, big_animal: { x: 7, y: 20, w: 18, h: 8 },
  block: { x: 2, y: 14, w: 28, h: 16 }, small: { x: 8, y: 20, w: 16, h: 9 }, table: { x: 0, y: 12, w: 32, h: 16 },
  bench: { x: 0, y: 20, w: 32, h: 6 },
};

/** Default footprint depth (px) for wall furniture and for colliders worked out from the art. */
export const FOOTPRINT_DEPTH = 14;

export function buildGround(g: LayoutGround, assets: Assets): Ground {
  return g.type === 'tiles' ? new TileMap(g.rows, assets) : new RoomMap({ floor: g.rows, walls: g.walls }, assets);
}

/** A behavior resolved for one prop: the frames it supplies (if any) and how it reacts to the player. */
interface Wired { frames?: string[]; interaction?: (prop: Prop) => Interaction }

function wire(b: Behavior, content: Content, hooks: SceneHooks): Wired {
  switch (b.type) {
    case 'talk':
      return { interaction: () => ({ label: 'Talk', use: () => hooks.say(b.line, b.who) }) };
    case 'read':
      return { interaction: () => ({ label: 'Read', use: () => hooks.say(b.text) }) };
    case 'enter':
      return { interaction: () => ({ label: 'Enter', use: () => hooks.go(b.to, b.spawn) }) };
    case 'shop': {
      const shop = content.shop(b.shop);
      if (!shop.building) throw new Error(`Shop "${b.shop}" has no building sprite in gamedata`);
      return {
        frames: [shop.building],
        interaction: () => ({
          label: 'Shop',
          use: () => hooks.say(`Today's stock: ${shop.stock.map((s) => `${content.itemName(s.item)} ${s.price}`).join(', ')}.`, shop.name),
        }),
      };
    }
    case 'market': {
      const shop = content.shop(b.shop);
      return { interaction: () => ({ label: 'Browse', use: () => hooks.say(`Fresh today: ${shop.stock.map((s) => content.itemName(s.item)).join(', ')}.`, shop.name) }) };
    }
    case 'pet':
      return { interaction: () => ({ label: 'Pet', use: () => hooks.emote('emote_love') }) };
    case 'draw_water':
      return { interaction: () => ({ label: 'Draw water', use: () => { hooks.emote('emote_happy'); hooks.float('+ Water'); } }) };
    case 'fish':
      return { interaction: () => ({ label: 'Fish', use: () => { hooks.emote('emote_exclaim'); hooks.float(`+ ${content.itemName(b.item)}`); } }) };
    case 'forage': {
      const node = content.forageNode(b.node);
      return {
        frames: [node.states.ready],
        interaction: (prop) => ({
          label: 'Harvest',
          use: () => {
            prop.setFrames(node.states.harvested);
            prop.setInteraction(null);
            hooks.emote('emote_happy');
            hooks.float(`+ ${content.itemName(node.yields)}`);
          },
        }),
      };
    }
  }
}

/** The frames a placed prop shows (its own sprite, an atlas animation, or what its behavior supplies). */
export function propFrames(p: PlacedProp, assets: Assets, content: Content): string[] {
  if (p.sprite !== undefined) {
    if (Array.isArray(p.sprite)) return p.sprite;
    return p.sprite.startsWith('anim:') ? assets.animation(p.sprite.slice(5)) : [p.sprite];
  }
  const fromBehavior = p.behavior && wire(p.behavior, content, NO_HOOKS).frames;
  if (!fromBehavior) throw new Error('Prop has no sprite');
  return fromBehavior;
}

const NO_HOOKS: SceneHooks = { say() {}, emote() {}, float() {}, go() {} };

/** Where a placed prop's sprite goes and what it blocks, all in world pixels. */
export interface Placement { x: number; y: number; solid?: Rect; sortOffset?: number }

export function placeProp(p: PlacedProp, frame: string, assets: Assets): Placement {
  const dx = p.dx ?? 0;
  const dy = p.dy ?? 0;
  const place = p.place ?? 'floor';
  const b = assets.bounds(frame);
  const base = b.y + b.h; // bottom of the art, relative to the sprite's top
  const depth = p.depth ?? FOOTPRINT_DEPTH;
  const footprint: Rect = { x: b.x, y: base - Math.min(depth, b.h), w: b.w, h: Math.min(depth, b.h) };
  const named = (c: string | Rect | null | undefined, fallback: Rect | undefined): Rect | undefined => {
    if (c === null) return undefined;
    if (c === undefined) return fallback;
    if (typeof c === 'string') {
      const r = COLLIDERS[c];
      if (!r) throw new Error(`Unknown collider preset "${c}"`);
      return r;
    }
    return c;
  };
  if (place === 'flat') return { x: p.x * TILE + dx, y: p.y * TILE + dy, sortOffset: p.sortOffset ?? -1000 };
  if (place === 'wall') {
    return { x: p.x * TILE + dx, y: p.y * TILE + depth - base + dy, solid: named(p.collider, footprint), sortOffset: p.sortOffset };
  }
  return { x: p.x * TILE + dx, y: p.y * TILE + dy, solid: named(p.collider, footprint), sortOffset: p.sortOffset };
}

export function buildProp(p: PlacedProp, assets: Assets, content: Content, hooks: SceneHooks): Prop {
  const frames = propFrames(p, assets, content);
  const at = placeProp(p, frames[0], assets);
  const wired = p.behavior ? wire(p.behavior, content, hooks) : undefined;
  const prop = new Prop(assets, {
    frames, x: at.x, y: at.y, solid: at.solid, sortOffset: at.sortOffset, fps: p.fps, use: p.use,
  });
  if (wired?.interaction) prop.setInteraction(wired.interaction(prop));
  return prop;
}

export function buildScene(layout: Layout, assets: Assets, content: Content, hooks: SceneHooks): Scene {
  const exits: Exit[] = layout.exits.map((e) =>
    'cell' in e ? cellExit(e.cell[0], e.cell[1], e.to, e.spawn, e.dir) : { area: { ...e.area }, to: e.to, spawn: e.spawn, dir: e.dir });
  return {
    id: layout.id,
    ground: buildGround(layout.ground, assets),
    props: layout.props.map((p) => buildProp(p, assets, content, hooks)),
    spawns: Object.fromEntries(Object.entries(layout.spawns).map(([k, s]) => [k, spawnAt(s.x, s.y, s.facing)])),
    exits,
    backdrop: layout.backdrop,
  };
}
