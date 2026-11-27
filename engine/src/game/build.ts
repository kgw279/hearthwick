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
import { cellExit, spawnAt, type Exit, type Scene, type Spawn } from '../world/scene';
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

/**
 * Named colliders, relative to the sprite's top-left, for props whose footprint isn't simply their art's
 * base. Like footprints, they're only the strip a thing stands on (a few px deep), so pieces go right up
 * to walls and each other and the player walks round and behind them; buildings keep their full depth.
 */
export const COLLIDERS: Record<string, Rect> = {
  tree: { x: 11, y: 23, w: 10, h: 6 }, bush: { x: 6, y: 22, w: 20, h: 6 }, barrel: { x: 9, y: 22, w: 14, h: 6 },
  crate: { x: 7, y: 22, w: 18, h: 6 }, fence: { x: 0, y: 21, w: 32, h: 6 }, lamppost: { x: 13, y: 24, w: 6, h: 5 },
  well: { x: 6, y: 20, w: 20, h: 8 }, signpost: { x: 13, y: 24, w: 6, h: 4 }, market_stall: { x: 2, y: 20, w: 28, h: 8 },
  house: { x: 2, y: 12, w: 28, h: 16 }, forage: { x: 9, y: 22, w: 14, h: 6 }, npc: { x: 10, y: 22, w: 12, h: 6 },
  hitching_post: { x: 4, y: 20, w: 24, h: 6 }, chicken_coop: { x: 5, y: 20, w: 22, h: 8 }, hay_bale: { x: 6, y: 18, w: 20, h: 8 },
  feed_trough: { x: 5, y: 20, w: 22, h: 6 }, big_animal: { x: 7, y: 22, w: 18, h: 6 },
  block: { x: 2, y: 22, w: 28, h: 8 }, small: { x: 8, y: 23, w: 16, h: 6 }, table: { x: 0, y: 20, w: 32, h: 8 },
  bench: { x: 0, y: 20, w: 32, h: 6 },
};

/** Default footprint depth (px) for colliders worked out from the art: the strip it stands on. */
export const FOOTPRINT_DEPTH = 6;

export function buildGround(g: LayoutGround, assets: Assets): Ground {
  return g.type === 'tiles' ? new TileMap(g.rows, assets) : new RoomMap(g, assets);
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
    case 'stairs':
    case 'door':
      return {}; // an exit, not a button: see passageLink
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

/**
 * Depth bands: everything on the floor draws before everything on a wall, which draws before anything
 * standing in the room (within a band, lower on screen draws later).
 */
const LAYER_SORT = { floor: -200000, wall: -100000 } as const;

export function placeProp(p: PlacedProp, frame: string, assets: Assets): Placement {
  const b = assets.bounds(frame);
  const x = p.x - (b.x + Math.floor(b.w / 2));
  const y = p.y - (b.y + b.h);
  if (p.layer) return { x, y, sortOffset: LAYER_SORT[p.layer] };
  return { x, y, solid: resolveCollider(p, frame, assets), sortOffset: p.sortOffset };
}

/** Where a prop's art is drawn, in world pixels (unturned). */
export function artRect(p: PlacedProp, frame: string, assets: Assets): Rect {
  const at = placeProp(p, frame, assets);
  const b = assets.bounds(frame);
  return { x: at.x + b.x, y: at.y + b.y, w: b.w, h: b.h };
}

/** The spawn a map's stairs or door to `from` put you on when you arrive from there. */
export const passageSpawn = (kind: 'stairs' | 'door', from: string) => `${kind}:${from}`;

/** How a passage (stairs or a door) sits in the map: its way through, where you arrive, and what walls it in. */
export interface PassageLink { exit: Exit; spawn: Spawn; rails: Rect[] }

const RAIL = 5; // px: the sides and top of a stairwell
const WELL = 32; // px: the stairwell is the lower part of the stairs' art, this deep

/**
 * Stairs and doors to another map.
 *  - Stairs: their lower 32px is the stairwell, railed in on its sides and top (stairs up also block the
 *    wall they climb into), so they can only be walked onto from below; the way through is inside it.
 *  - A door hangs on a wall face: walking up into it from the floor in front goes through.
 * Either way you arrive just in front, facing into the room. (The player's feet are rows 22-28 of its sprite.)
 */
export function passageLink(p: PlacedProp, here: string, assets: Assets, content: Content): PassageLink | null {
  const b = p.behavior;
  if (b?.type !== 'stairs' && b?.type !== 'door') return null;
  const a = artRect(p, propFrames(p, assets, content)[0], assets);
  const bottom = a.y + a.h;
  const to = { to: b.to, spawn: passageSpawn(b.type, here) };
  const arrive = (feetY: number): Spawn => ({ x: Math.round(a.x + a.w / 2 - 16), y: feetY - 22, facing: 'down' });
  if (b.type === 'door') {
    return { exit: { area: { x: a.x, y: bottom, w: a.w, h: 6 }, ...to, dir: 'up' }, spawn: arrive(bottom + 12), rails: [] };
  }
  const top = Math.max(a.y, bottom - WELL);
  const rails: Rect[] = [
    { x: a.x, y: top, w: RAIL, h: bottom - top },
    { x: a.x + a.w - RAIL, y: top, w: RAIL, h: bottom - top },
    { x: a.x, y: top, w: a.w, h: RAIL },
  ];
  if (top > a.y) rails.push({ x: a.x, y: a.y, w: a.w, h: top - a.y }); // the wall stairs up climb into
  return {
    exit: { area: { x: a.x + RAIL, y: top + RAIL, w: a.w - RAIL * 2, h: 14 }, ...to },
    spawn: arrive(bottom + 2),
    rails,
  };
}

/** Every spawn a layout offers: its own, plus one in front of each of its stairs and doors. */
export function layoutSpawns(layout: Layout, assets: Assets, content: Content): Record<string, Spawn> {
  const out: Record<string, Spawn> = Object.fromEntries(Object.entries(layout.spawns).map(([k, s]) => [k, spawnAt(s.x, s.y, s.facing)]));
  for (const p of layout.props) {
    const link = passageLink(p, layout.id, assets, content);
    if (link) out[passageSpawn(p.behavior!.type as 'stairs' | 'door', link.exit.to)] = link.spawn;
  }
  return out;
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
    frames, x: at.x, y: at.y, solid: at.solid, sortOffset: at.sortOffset, fps: p.fps, use: p.use, rot: p.rot,
  });
  if (wired?.interaction) prop.setInteraction(wired.interaction(prop));
  return prop;
}

/** `ground`: reuse an already-built ground (the editor does when only props changed). */
export function buildScene(layout: Layout, assets: Assets, content: Content, hooks: SceneHooks, ground?: Ground): Scene {
  const exits: Exit[] = layout.exits.map((e) =>
    'cell' in e ? cellExit(e.cell[0], e.cell[1], e.to, e.spawn, e.dir) : { area: { ...e.area }, to: e.to, spawn: e.spawn, dir: e.dir });
  const blockers: Rect[] = [];
  for (const p of layout.props) {
    const link = passageLink(p, layout.id, assets, content);
    if (link) {
      exits.push(link.exit);
      blockers.push(...link.rails);
    }
  }
  return {
    id: layout.id,
    ground: ground ?? buildGround(layout.ground, assets),
    props: layout.props.map((p) => buildProp(p, assets, content, hooks)),
    spawns: layoutSpawns(layout, assets, content),
    exits,
    blockers,
    backdrop: layout.backdrop,
  };
}
