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
  /** Open a storage container (its contents beside the bag). */
  /** art: the frame the container shows (its title, and what it holds: see world/containers.ts). */
  openStorage(box: { id: string; slots: number; contents?: Array<{ item: string; count: number }> }, art: string): void;
  /** Work at a cooking station (by its gamedata id). */
  openStation(station: string): void;
  /** A plating station (by its position in this map): set a carried tray down on it, or plate onto its trays. */
  openPlating(at: string): void;
  /** The bar: serve the guests sat at it. */
  openBar(): void;
  /** Serve a table (by its key in this map: see seating.ts). */
  openTable(key: string): void;
  /** Whether the player is carrying a serving tray (what the counter and tables offer depends on it). */
  carryingTray(): boolean;
  /** Wash the dirty tableware the player carries. */
  wash(): void;
}

/**
 * Named colliders, relative to the sprite's top-left, for props whose footprint isn't simply their art's
 * base. Like footprints, they're only the strip a thing stands on (a few px deep), so pieces go right up
 * to walls and each other and the player walks round and behind them; buildings keep their full depth.
 */
export const COLLIDERS: Record<string, Rect> = {
  tree: { x: 11, y: 23, w: 10, h: 6 }, bush: { x: 6, y: 22, w: 20, h: 6 }, barrel: { x: 9, y: 22, w: 14, h: 6 },
  crate: { x: 7, y: 22, w: 18, h: 6 }, fence: { x: 0, y: 21, w: 32, h: 6 },
  fence_end_l: { x: 14, y: 21, w: 18, h: 6 }, fence_end_r: { x: 0, y: 21, w: 18, h: 6 }, fence_v: { x: 13, y: 0, w: 6, h: 32 }, lamppost: { x: 13, y: 24, w: 6, h: 5 },
  well: { x: 6, y: 20, w: 20, h: 8 }, signpost: { x: 13, y: 24, w: 6, h: 4 }, market_stall: { x: 2, y: 20, w: 28, h: 8 },
  // houses and shops: the lower half of their 64x64 art
  house: { x: 4, y: 30, w: 56, h: 30 }, forage: { x: 9, y: 22, w: 14, h: 6 }, npc: { x: 10, y: 22, w: 12, h: 6 },
  hitching_post: { x: 4, y: 20, w: 24, h: 6 }, chicken_coop: { x: 5, y: 20, w: 22, h: 8 }, hay_bale: { x: 6, y: 18, w: 20, h: 8 },
  feed_trough: { x: 5, y: 20, w: 22, h: 6 }, big_animal: { x: 7, y: 22, w: 18, h: 6 },
  block: { x: 2, y: 22, w: 28, h: 8 }, small: { x: 8, y: 23, w: 16, h: 6 }, table: { x: 0, y: 20, w: 32, h: 8 },
  bench: { x: 0, y: 20, w: 32, h: 6 },
  // tables: the floor under their whole top, back to front up from the feet of their legs (art in a 64x48
  // cell: legs end on row 43)
  table_1: { x: 22, y: 32, w: 20, h: 12 },
  table_2: { x: 17, y: 28, w: 30, h: 16 },
  table_4: { x: 7, y: 24, w: 50, h: 20 },
};

/** Default footprint depth (px) for colliders worked out from the art: the strip it stands on. */
export const FOOTPRINT_DEPTH = 6;

export function buildGround(g: LayoutGround, assets: Assets): Ground {
  return g.type === 'tiles' ? new TileMap(g.rows, assets) : new RoomMap(g, assets);
}

/** A behavior resolved for one prop: the frames it supplies (if any) and how it reacts to the player. */
interface Wired { frames?: string[]; interaction?: (prop: Prop) => Interaction }

/** A piece's art name as a title: "barrel_stack" -> "Barrel stack". */
export function titleOf(frame: string): string {
  const t = frame.replace(/^anim:/, '').replace(/_f\d+$/, '').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** `art`: the frame the prop shows (names a container's window). */
function wire(b: Behavior, content: Content, hooks: SceneHooks, art = ''): Wired {
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
    case 'storage':
      return { interaction: () => ({ label: 'Open', use: () => hooks.openStorage(b, art) }) };
    case 'wash':
      return { interaction: () => ({ label: 'Wash dishes', use: () => hooks.wash() }) };
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

/** The bar (a bar counter with no shop on it), and tables. */
const COUNTER = /^bar_counter/;
const TABLE = /^table_\d$/;

/**
 * Kitchen and dining pieces work by what they are, wherever they're placed: a cooking station's art
 * opens that station (the plating station, plating and the serving trays), a bar counter that isn't a
 * shop's serves the guests at the bar, a table serves its guests.
 */
function workplace(p: PlacedProp, frame: string, content: Content, hooks: SceneHooks): Interaction | null {
  const at = `${Math.round(p.x)},${Math.round(p.y)}`;
  const station = content.stationOfArt(frame);
  if (station === 'plate') {
    return { get label() { return hooks.carryingTray() ? 'Set tray down' : content.stations.plate.verb; }, use: () => hooks.openPlating(at) };
  }
  if (station) return { label: content.stations[station].verb, use: () => hooks.openStation(station) };
  if (COUNTER.test(frame)) return { label: 'Serve', use: () => hooks.openBar() };
  if (TABLE.test(frame)) {
    return { get label() { return hooks.carryingTray() ? 'Serve' : 'Table'; }, use: () => hooks.openTable(at) };
  }
  return null;
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

const NO_HOOKS: SceneHooks = {
  say() {}, emote() {}, float() {}, go() {}, give: () => false, openShop() {}, openStorage() {}, wash() {}, openStation() {}, openPlating() {}, openBar() {}, openTable() {}, carryingTray: () => false,
};

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
  if (p.layer === 'top') return { x, y }; // no collider; drawn over what it sits on (see seatTops)
  if (p.layer) return { x, y, sortOffset: LAYER_SORT[p.layer] };
  return { x, y, solid: resolveCollider(p, frame, assets), sortOffset: p.sortOffset };
}

/** Where a prop's art is drawn, in world pixels (unturned). */
export function artRect(p: PlacedProp, frame: string, assets: Assets): Rect {
  const at = placeProp(p, frame, assets);
  const b = assets.bounds(frame);
  return { x: at.x + b.x, y: at.y + b.y, w: b.w, h: b.h };
}

/** The spawn a map's stairs, door or building door to `from` puts you on when you arrive from there. */
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
  if (b?.type === 'enter') return entrance(p, b, assets, content);
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

/**
 * A building's way in: its doorstep is just below what it blocks (or its base, if it blocks nothing).
 * Walking up into the doorstep goes inside; coming back out, you arrive on it, facing out. Both come
 * from the building, so they move with it. (Inside, the way out leads to spawn "door:<interior>".)
 */
function entrance(p: PlacedProp, b: { to: string; spawn: string }, assets: Assets, content: Content): PassageLink {
  const frame = propFrames(p, assets, content)[0];
  const at = placeProp(p, frame, assets);
  const front = at.solid ? at.y + at.solid.y + at.solid.h : p.y;
  return {
    exit: { area: { x: Math.round(p.x) - 14, y: Math.round(front) - 2, w: 28, h: 8 }, to: b.to, spawn: b.spawn, dir: 'up' },
    spawn: { x: Math.round(p.x) - 16, y: Math.round(front) + 8 - 22, facing: 'down' },
    rails: [],
  };
}

/** What a passage's arrival spawn is called in the map it leads from: stairs, doors and buildings' doors. */
function passageKey(p: PlacedProp): 'stairs' | 'door' {
  return p.behavior?.type === 'stairs' ? 'stairs' : 'door';
}

/** Every spawn a layout offers: its own, plus one in front of each of its stairs, doors and buildings. */
export function layoutSpawns(layout: Layout, assets: Assets, content: Content): Record<string, Spawn> {
  const out: Record<string, Spawn> = Object.fromEntries(Object.entries(layout.spawns).map(([k, s]) => [k, spawnAt(s.x, s.y, s.facing)]));
  for (const p of layout.props) {
    const link = passageLink(p, layout.id, assets, content);
    if (link) out[passageSpawn(passageKey(p), link.exit.to)] = link.spawn;
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
  const wired = p.behavior ? wire(p.behavior, content, hooks, frames[0]) : undefined;
  const prop = new Prop(assets, {
    frames, x: at.x, y: at.y, solid: at.solid, sortOffset: at.sortOffset, fps: p.fps, use: p.use, rot: p.rot,
  });
  if (wired?.interaction) prop.setInteraction(wired.interaction(prop));
  else if (!p.behavior) {
    const use = workplace(p, frames[0], content, hooks);
    if (use) prop.setInteraction(use);
  }
  return prop;
}

/**
 * Things on top of furniture (place settings) draw just after what they sit on, so they're always over
 * their table, at the front of it or the back, and behind anyone in front of the table. What they sit on
 * is the front-most standing piece whose art is under the middle of theirs (the editor flags ones on nothing).
 */
function seatTops(layout: Layout, props: Prop[], assets: Assets, content: Content): Prop[] {
  const art = layout.props.map((p) => artRect(p, propFrames(p, assets, content)[0], assets));
  layout.props.forEach((p, i) => {
    if (p.layer !== 'top') return;
    const cx = art[i].x + art[i].w / 2;
    const cy = art[i].y + art[i].h / 2;
    let best = -1;
    layout.props.forEach((q, j) => {
      const a = art[j];
      if (q.layer || cx < a.x || cy < a.y || cx >= a.x + a.w || cy >= a.y + a.h) return;
      if (best < 0 || props[j].sortY > props[best].sortY) best = j;
    });
    if (best >= 0) props[i].setOn(props[best]);
  });
  return props;
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
    props: seatTops(layout, layout.props.map((p) => buildProp(p, assets, content, hooks)), assets, content),
    spawns: layoutSpawns(layout, assets, content),
    exits,
    blockers,
    backdrop: layout.backdrop,
  };
}
