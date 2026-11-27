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
import { TileMap } from '../world/tilemap';
import type { Content } from './data';

/** Ways a scene talks back to the game (dialog, emotes, floating text, changing scene). */
export interface SceneHooks {
  say(text: string, speaker?: string): void;
  emote(name: string): void;
  float(text: string): void;
  go(scene: string, spawn: string): void;
  /** Put items in the player's bag (shows what was picked up); false if there was no room. */
  give(item: string, n: number): boolean;
  openShop(shop: string): void;
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

/** Default footprint depth (px) for colliders worked out from the art. */
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
      return {
        frames: shop.building ? [shop.building] : undefined, // a shop prop without a sprite is its building
        interaction: () => ({ label: 'Shop', use: () => hooks.openShop(b.shop) }),
      };
    }
    case 'market':
      return { interaction: () => ({ label: 'Browse', use: () => hooks.openShop(b.shop) }) };
    case 'pet':
      return { interaction: () => ({ label: 'Pet', use: () => hooks.emote('emote_love') }) };
    case 'draw_water':
      return { interaction: () => ({ label: 'Draw water', use: () => void hooks.give('water', 1) }) };
    case 'fish':
      return { interaction: () => ({ label: 'Fish', use: () => void hooks.give(b.item, 1) }) };
    case 'forage': {
      const node = content.forageNode(b.node);
      return {
        frames: [node.states.ready],
        interaction: (prop) => ({
          label: 'Harvest',
          use: () => {
            if (!hooks.give(node.yields, 1)) return; // bag full: leave it growing
            prop.setFrames(node.states.harvested);
            prop.setInteraction(null);
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

const NO_HOOKS: SceneHooks = { say() {}, emote() {}, float() {}, go() {}, give: () => false, openShop() {} };

/** Where a placed prop's sprite goes and what it blocks, in world pixels (solid is sprite-relative). */
export interface Placement { x: number; y: number; solid?: Rect; sortOffset?: number }

export function placeProp(p: PlacedProp, frame: string, assets: Assets): Placement {
  const b = assets.bounds(frame);
  const x = p.x - (b.x + Math.floor(b.w / 2));
  const y = p.y - (b.y + b.h);
  if (p.flat) return { x, y, sortOffset: p.sortOffset ?? -1000 };
  return { x, y, solid: resolveCollider(p, frame, assets), sortOffset: p.sortOffset };
}

/** A prop's collider relative to its sprite: a named preset, an explicit rect, none, or (by default) its footprint. */
export function resolveCollider(p: PlacedProp, frame: string, assets: Assets): Rect | undefined {
  const c = p.collider;
  if (c === null) return undefined;
  if (typeof c === 'string') {
    const r = COLLIDERS[c];
    if (!r) throw new Error(`Unknown collider preset "${c}"`);
    return r;
  }
  if (c) return c;
  const b = assets.bounds(frame);
  const depth = Math.min(p.depth ?? FOOTPRINT_DEPTH, b.h);
  return { x: b.x, y: b.y + b.h - depth, w: b.w, h: depth };
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
