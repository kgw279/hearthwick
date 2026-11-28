/**
 * Layouts: every map (the town, each floor of a building) is a JSON file in src/maps, not code.
 * The game builds scenes from them and the layout editor reads and writes them, so a map made in the
 * editor is exactly the map the game plays.
 *
 * Ground: outdoors, a grid of 16px cells of terrain; indoors, a grid of 32px cells of walls and floor
 * (the structure) plus a 16px grid of floor materials. Props are placed freely: a prop's x, y is the world pixel at the middle
 * of the bottom of its art (where it stands on the ground), so placement follows the art, not a grid.
 * Its collider is a preset, a rect relative to the sprite, or by default its footprint: the bottom
 * `depth` px of its art.
 *
 * Layers: a prop stands in the room (the default: it has a collider and is depth-sorted with the player),
 * lies on the floor (layer "floor": rugs, mats, stairs; no collider, drawn under everything standing), or
 * hangs on a wall (layer "wall": paintings, windows, shelves; no collider, drawn over the wall it's on),
 * or sits on top of furniture (layer "top": place settings on a table; no collider, drawn over it).
 * Floor, wall and top props can be turned to any angle (rot, degrees clockwise).
 * Props can carry a behavior (talk, shop, forage, stairs, door, storage, wash...) that the game wires up when it builds the scene.
 */
import type { Rect } from '../core/geom';
import type { Facing } from './scene';

export type Behavior =
  | { type: 'talk'; who: string; line: string }
  | { type: 'read'; text: string }
  | { type: 'enter'; to: string; spawn: string }
  | { type: 'shop'; shop: string }
  | { type: 'market'; shop: string }
  | { type: 'pet' }
  | { type: 'draw_water' }
  | { type: 'forage'; node: string }
  | { type: 'fish'; item: string }
  /** Stairs or a door to another map: walking onto / into them goes there, arriving by that map's way back. */
  | { type: 'stairs'; to: string }
  | { type: 'door'; to: string }
  /** A container: `slots` of storage the player can put things in and take them out of, by its id. */
  | { type: 'storage'; id: string; slots: number; contents?: Array<{ item: string; count: number }> }
  /** Washes the dirty tableware the player carries. */
  | { type: 'wash' }
  /** A clock: tells the time. */
  | { type: 'clock' }
  /** A plaque by a guest room's door: the room's map, and the name the player gave it. */
  | { type: 'plaque'; room: string; name?: string };

export type PropLayer = 'floor' | 'wall' | 'top';
export const PROP_LAYERS: PropLayer[] = ['floor', 'wall', 'top'];

export interface PlacedProp {
  /** Frame name, a list of frames to loop, or "anim:<name>" for an atlas animation. Shops and forage take theirs from gamedata. */
  sprite?: string | string[];
  /** World pixel at the middle of the bottom of the art. */
  x: number;
  y: number;
  /** Lies on the floor, hangs on a wall or sits on furniture (no collider); omitted: stands in the room. */
  layer?: PropLayer;
  /** Turned clockwise by this many degrees (floor, wall and top props). */
  rot?: number;
  /** Collider preset name, a rect relative to the sprite, or null for walk-through. Omitted: the art's footprint. */
  collider?: string | Rect | null;
  /** Footprint depth in px when the collider is the art's footprint. */
  depth?: number;
  fps?: number;
  sortOffset?: number;
  use?: Rect;
  behavior?: Behavior;
}

/**
 * Outdoor ground: rows of 16px terrain cells (see world/tilemap.ts).
 * Interior: rows of 32px structure cells (walls, floor, outside; see world/room.ts) and `floor`, rows of
 * 16px floor-material cells, twice as many each way.
 */
export type LayoutGround = { type: 'tiles'; rows: string[] } | { type: 'room'; rows: string[]; floor: string[] };

export interface LayoutSpawn { x: number; y: number; facing: Facing }

export type LayoutExit = ({ cell: [number, number] } | { area: Rect }) & { to: string; spawn: string; dir?: Facing };

export interface Layout {
  id: string;
  backdrop?: string;
  ground: LayoutGround;
  spawns: Record<string, LayoutSpawn>;
  exits: LayoutExit[];
  props: PlacedProp[];
}

/**
 * The brushes each kind of ground offers (what the editor's Ground tab shows). `fine` brushes paint the
 * 16px grid (terrain, floor materials); the others paint the 32px structure grid (walls, clearing).
 */
export interface GroundBrush { ch: string; name: string; sample: string; fine: boolean }
export const GROUND_CHARS: Record<LayoutGround['type'], GroundBrush[]> = {
  tiles: [
    { ch: '.', name: 'Grass', sample: 'grass', fine: true },
    { ch: 'd', name: 'Dirt', sample: 'dirt_path', fine: true },
    { ch: 'f', name: 'Farmland', sample: 'farmland', fine: true },
    { ch: 'c', name: 'Cobblestone', sample: 'cobble_v0', fine: true },
    { ch: 's', name: 'Square pavers', sample: 'pavers_v0', fine: true },
    { ch: 'w', name: 'Water', sample: 'water', fine: true },
    { ch: 'r', name: 'Rock wall', sample: 'cliff_face', fine: true },
    { ch: 'k', name: 'Earth bank', sample: 'cliff_earth', fine: true },
  ],
  room: [
    { ch: 'w', name: 'Wood floor', sample: 'floor_wood_flagstone_00', fine: true },
    { ch: 's', name: 'Stone floor', sample: 'floor_wood_flagstone_15', fine: true },
    { ch: 'W', name: 'Plaster wall', sample: 'face_plaster_plain', fine: false },
    { ch: 'I', name: 'Interior wall, plaster', sample: 'iwall_wood_H', fine: false },
    { ch: 'S', name: 'Stone wall', sample: 'face_stone_plain', fine: false },
    { ch: 'J', name: 'Interior wall, stone', sample: 'iwall_stone_H', fine: false },
    { ch: '.', name: 'Clear', sample: '', fine: false },
  ],
};

/** Characters allowed in each grid. */
const TILE_CHARS = new Set(['.', 'd', 'f', 'c', 's', 'w', 'r', 'k']);
const STRUCTURE_CHARS = new Set(['.', 'f', 'W', 'I', 'S', 'J']);
const FLOOR_CHARS = new Set(['w', 's']);

const FACINGS = new Set(['down', 'up', 'left', 'right']);
/** Each behavior's fields: s = non-empty string, n = whole number above 0; ? = may be left out. */
const BEHAVIOR_FIELDS: Record<Behavior['type'], Record<string, 's' | 's?' | 'n' | 'contents?'>> = {
  talk: { who: 's', line: 's' }, read: { text: 's' }, enter: { to: 's', spawn: 's' }, shop: { shop: 's' }, market: { shop: 's' },
  pet: {}, draw_water: {}, forage: { node: 's' }, fish: { item: 's' }, stairs: { to: 's' }, door: { to: 's' },
  storage: { id: 's', slots: 'n', contents: 'contents?' }, wash: {}, clock: {}, plaque: { room: 's', name: 's?' },
};
const PROP_KEYS = new Set(['sprite', 'x', 'y', 'layer', 'rot', 'collider', 'depth', 'fps', 'sortOffset', 'use', 'behavior']);

/** Strict check of a layout's shape; throws with the exact path of the first problem. */
export function checkLayout(l: Layout, file = l?.id ?? '?'): Layout {
  const fail = (path: string, msg: string): never => {
    throw new Error(`Layout ${file}: ${path} ${msg}`);
  };
  const num = (v: unknown, path: string) => typeof v === 'number' && Number.isFinite(v) ? v : fail(path, 'must be a number');
  const str = (v: unknown, path: string) => typeof v === 'string' && v.length > 0 ? v : fail(path, 'must be a non-empty string');
  const rect = (v: unknown, path: string) => {
    const r = v as Rect;
    if (!r || typeof r !== 'object') fail(path, 'must be {x, y, w, h}');
    for (const k of ['x', 'y', 'w', 'h'] as const) num(r[k], `${path}.${k}`);
  };

  str(l.id, 'id');
  const g = l.ground;
  if (!g || (g.type !== 'tiles' && g.type !== 'room')) fail('ground.type', 'must be "tiles" or "room"');
  const grid = (rows: unknown, name: string, chars: Set<string>, h?: number, w?: number) => {
    const r = rows as string[];
    if (!Array.isArray(r) || r.length === 0) fail(name, 'must be a non-empty list of strings');
    if (h !== undefined && r.length !== h) fail(name, `must have ${h} rows`);
    const width = w ?? r[0].length;
    r.forEach((row, i) => {
      if (typeof row !== 'string' || row.length !== width) fail(`${name}[${i}]`, `must be ${width} characters`);
      for (const ch of row) if (!chars.has(ch)) fail(`${name}[${i}]`, `has unknown ground "${ch}"`);
    });
  };
  if (g.type === 'tiles') {
    grid(g.rows, 'ground.rows', TILE_CHARS);
    if (g.rows.length % 2 || g.rows[0].length % 2) fail('ground.rows', 'must be whole tiles (an even number of 16px cells each way)');
  } else {
    grid(g.rows, 'ground.rows', STRUCTURE_CHARS);
    grid(g.floor, 'ground.floor', FLOOR_CHARS, g.rows.length * 2, g.rows[0].length * 2);
  }
  const fields = g.type === 'room' ? ['type', 'rows', 'floor'] : ['type', 'rows'];
  for (const k of Object.keys(g)) if (!fields.includes(k)) fail(`ground.${k}`, 'is not a ground field');

  if (!l.spawns || typeof l.spawns !== 'object') fail('spawns', 'must be an object');
  if (Object.keys(l.spawns).length === 0 && !l.props?.some((p) => p.behavior?.type === 'stairs' || p.behavior?.type === 'door')) {
    fail('spawns', 'needs at least one spawn (or stairs or a door to arrive by)');
  }
  for (const [k, s] of Object.entries(l.spawns)) {
    num(s.x, `spawns.${k}.x`);
    num(s.y, `spawns.${k}.y`);
    if (!FACINGS.has(s.facing)) fail(`spawns.${k}.facing`, 'must be down/up/left/right');
  }

  if (!Array.isArray(l.exits)) fail('exits', 'must be a list');
  l.exits.forEach((e, i) => {
    const p = `exits[${i}]`;
    if ('cell' in e) {
      if (!Array.isArray(e.cell) || e.cell.length !== 2) fail(`${p}.cell`, 'must be [x, y]');
    } else if ('area' in e) rect(e.area, `${p}.area`);
    else fail(p, 'needs a cell or an area');
    str(e.to, `${p}.to`);
    str(e.spawn, `${p}.spawn`);
    if (e.dir !== undefined && !FACINGS.has(e.dir)) fail(`${p}.dir`, 'must be down/up/left/right');
  });

  if (!Array.isArray(l.props)) fail('props', 'must be a list');
  l.props.forEach((pr, i) => {
    const p = `props[${i}]`;
    for (const k of Object.keys(pr)) if (!PROP_KEYS.has(k)) fail(`${p}.${k}`, 'is not a prop field');
    num(pr.x, `${p}.x`);
    num(pr.y, `${p}.y`);
    for (const k of ['depth', 'fps', 'sortOffset', 'rot'] as const) if (pr[k] !== undefined) num(pr[k], `${p}.${k}`);
    if (pr.layer !== undefined && !PROP_LAYERS.includes(pr.layer)) fail(`${p}.layer`, 'must be "floor", "wall", "top" or left out');
    if (pr.rot !== undefined && pr.layer === undefined) fail(`${p}.rot`, 'only floor, wall and top props turn');
    if (pr.layer !== undefined && pr.collider !== undefined) fail(`${p}.collider`, 'floor, wall and top props have no collider');
    if (pr.sprite !== undefined) {
      if (Array.isArray(pr.sprite)) pr.sprite.forEach((s, j) => str(s, `${p}.sprite[${j}]`));
      else str(pr.sprite, `${p}.sprite`);
    }
    if (pr.collider !== undefined && pr.collider !== null && typeof pr.collider !== 'string') rect(pr.collider, `${p}.collider`);
    if (pr.use !== undefined) rect(pr.use, `${p}.use`);
    if (pr.behavior !== undefined) {
      const fields = BEHAVIOR_FIELDS[pr.behavior.type];
      if (!fields) fail(`${p}.behavior.type`, `"${pr.behavior.type}" is not a behavior`);
      const b = pr.behavior as unknown as Record<string, unknown>;
      for (const k of Object.keys(b)) if (k !== 'type' && !(k in fields)) fail(`${p}.behavior.${k}`, `is not a ${pr.behavior.type} field`);
      for (const [f, kind] of Object.entries(fields)) {
        const at = `${p}.behavior.${f}`;
        if (kind === 's' || (kind === 's?' && b[f] !== undefined)) str(b[f], at);
        else if (kind === 'n' && !(Number.isInteger(b[f]) && (b[f] as number) > 0)) fail(at, 'must be a whole number above 0');
        else if (kind === 'contents?' && b[f] !== undefined) {
          if (!Array.isArray(b[f])) fail(at, 'must be a list of {item, count}');
          (b[f] as Array<{ item: unknown; count: unknown }>).forEach((c, j) => {
            str(c?.item, `${at}[${j}].item`);
            if (!(Number.isInteger(c.count) && (c.count as number) > 0)) fail(`${at}[${j}].count`, 'must be a whole number above 0');
          });
        }
      }
    }
    const ownsSprite = pr.behavior?.type === 'shop' || pr.behavior?.type === 'forage';
    if (pr.sprite === undefined && !ownsSprite) fail(`${p}.sprite`, 'is required (only shop and forage props take theirs from gamedata)');
  });
  return l;
}

/** The editor's file format: one row, wall, exit or prop per line, so maps diff cleanly in git. */
export function formatLayout(l: Layout): string {
  // One-line JSON with a space after , and : (matches Python's json.dumps(separators=(', ', ': '))).
  const j = (v: unknown): string => {
    if (Array.isArray(v)) return `[${v.map(j).join(', ')}]`;
    if (v && typeof v === 'object') {
      return `{${Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${JSON.stringify(k)}: ${j(x)}`).join(', ')}}`;
    }
    return JSON.stringify(v);
  };
  const out = ['{', `  "id": ${j(l.id)},`];
  if (l.backdrop) out.push(`  "backdrop": ${j(l.backdrop)},`);
  const g = l.ground;
  out.push('  "ground": {', `    "type": ${j(g.type)},`);
  const rows = g.rows.map((r) => `      ${j(r)}`).join(',\n');
  if (g.type === 'room') {
    out.push(`    "rows": [\n${rows}\n    ],`);
    out.push(`    "floor": [\n${g.floor.map((r) => `      ${j(r)}`).join(',\n')}\n    ]`);
  } else out.push(`    "rows": [\n${rows}\n    ]`);
  out.push('  },');
  out.push(`  "spawns": ${j(l.spawns)},`);
  const list = (items: unknown[]) => (items.length ? `[\n${items.map((x) => `    ${j(x)}`).join(',\n')}\n  ]` : '[]');
  out.push(`  "exits": ${list(l.exits)},`);
  out.push(`  "props": ${list(l.props)}`);
  out.push('}');
  return out.join('\n') + '\n';
}

/** Every layout shipped with the game (src/maps/*.json), checked at startup. */
export function loadLayouts(): Map<string, Layout> {
  const files = import.meta.glob<Layout>('../maps/*.json', { eager: true, import: 'default' });
  const out = new Map<string, Layout>();
  for (const [path, l] of Object.entries(files)) {
    const name = path.split('/').pop()!.replace(/\.json$/, '');
    checkLayout(l, name + '.json');
    if (l.id !== name) throw new Error(`Layout ${name}.json has id "${l.id}"; they must match`);
    out.set(l.id, structuredClone(l));
  }
  return out;
}
