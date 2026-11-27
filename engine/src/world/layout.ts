/**
 * Layouts: every map (the town, each floor of a building) is a JSON file in src/maps, not code.
 * The game builds scenes from them and the layout editor reads and writes them, so a map made in the
 * editor is exactly the map the game plays.
 *
 * Ground is a grid of 32px cells. Props are placed freely: a prop's x, y is the world pixel at the middle
 * of the bottom of its art (where it stands on the ground), so placement follows the art, not a grid.
 * Its collider is a preset, a rect relative to the sprite, or by default its footprint: the bottom
 * `depth` px of its art. Flat props (rugs, mats, stairs holes) have no collider and draw under everything.
 * Props can carry a behavior (talk, shop, forage...) that the game wires up when it builds the scene.
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
  | { type: 'fish'; item: string };

export interface PlacedProp {
  /** Frame name, a list of frames to loop, or "anim:<name>" for an atlas animation. Shops and forage take theirs from gamedata. */
  sprite?: string | string[];
  /** World pixel at the middle of the bottom of the art. */
  x: number;
  y: number;
  /** Lies on the floor: no collider, drawn under everything. */
  flat?: boolean;
  /** Collider preset name, a rect relative to the sprite, or null for walk-through. Omitted: the art's footprint. */
  collider?: string | Rect | null;
  /** Footprint depth in px when the collider is the art's footprint. */
  depth?: number;
  fps?: number;
  sortOffset?: number;
  use?: Rect;
  behavior?: Behavior;
}

/** Outdoor ground (terrain characters) or an interior (floors and autotiled walls, see world/room.ts). */
export type LayoutGround = { type: 'tiles'; rows: string[] } | { type: 'room'; rows: string[] };

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

/** Ground characters each ground type understands (what the editor's ground brush offers). */
export const GROUND_CHARS: Record<LayoutGround['type'], Array<{ ch: string; name: string; sample: string }>> = {
  tiles: [
    { ch: '.', name: 'Grass', sample: 'grass' },
    { ch: 'd', name: 'Road', sample: 'dirt_path' },
    { ch: 'p', name: 'Path', sample: 'path_00_v0' },
    { ch: 'D', name: 'Path to door', sample: 'path_00_v0' },
    { ch: 'c', name: 'Cobblestone', sample: 'cobble_v0' },
    { ch: 's', name: 'Square pavers', sample: 'pavers_v0' },
    { ch: 'w', name: 'Water', sample: 'water' },
  ],
  room: [
    { ch: 'w', name: 'Wood floor', sample: 'floor_wood_flagstone_00' },
    { ch: 's', name: 'Stone floor', sample: 'floor_wood_flagstone_15' },
    { ch: 'W', name: 'Plaster wall', sample: 'face_plaster_plain' },
    { ch: 'N', name: 'Plaster wall, window', sample: 'face_plaster_window' },
    { ch: 'S', name: 'Stone wall', sample: 'face_stone_plain' },
    { ch: 'M', name: 'Stone wall, window', sample: 'face_stone_window' },
    { ch: '.', name: 'Clear', sample: '' },
  ],
};

const FACINGS = new Set(['down', 'up', 'left', 'right']);
const BEHAVIOR_FIELDS: Record<Behavior['type'], string[]> = {
  talk: ['who', 'line'], read: ['text'], enter: ['to', 'spawn'], shop: ['shop'], market: ['shop'],
  pet: [], draw_water: [], forage: ['node'], fish: ['item'],
};
const PROP_KEYS = new Set(['sprite', 'x', 'y', 'flat', 'collider', 'depth', 'fps', 'sortOffset', 'use', 'behavior']);

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
  if (!Array.isArray(g.rows) || g.rows.length === 0) fail('ground.rows', 'must be a non-empty list of strings');
  const allowed = new Set(GROUND_CHARS[g.type].map((c) => c.ch));
  g.rows.forEach((row, i) => {
    if (typeof row !== 'string' || row.length !== g.rows[0].length) fail(`ground.rows[${i}]`, `must be ${g.rows[0].length} characters`);
    for (const ch of row) if (!allowed.has(ch)) fail(`ground.rows[${i}]`, `has unknown ground "${ch}"`);
  });
  for (const k of Object.keys(g)) if (k !== 'type' && k !== 'rows') fail(`ground.${k}`, 'is not a ground field');

  if (!l.spawns || typeof l.spawns !== 'object' || Object.keys(l.spawns).length === 0) fail('spawns', 'needs at least one spawn');
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
    for (const k of ['depth', 'fps', 'sortOffset'] as const) if (pr[k] !== undefined) num(pr[k], `${p}.${k}`);
    if (pr.flat !== undefined && pr.flat !== true) fail(`${p}.flat`, 'must be true or left out');
    if (pr.sprite !== undefined) {
      if (Array.isArray(pr.sprite)) pr.sprite.forEach((s, j) => str(s, `${p}.sprite[${j}]`));
      else str(pr.sprite, `${p}.sprite`);
    }
    if (pr.collider !== undefined && pr.collider !== null && typeof pr.collider !== 'string') rect(pr.collider, `${p}.collider`);
    if (pr.use !== undefined) rect(pr.use, `${p}.use`);
    if (pr.behavior !== undefined) {
      const fields = BEHAVIOR_FIELDS[pr.behavior.type];
      if (!fields) fail(`${p}.behavior.type`, `"${pr.behavior.type}" is not a behavior`);
      for (const f of fields) str((pr.behavior as unknown as Record<string, unknown>)[f], `${p}.behavior.${f}`);
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
  out.push(`    "rows": [\n${rows}\n    ]`);
  out.push('  },');
  out.push(`  "spawns": ${j(l.spawns)},`);
  out.push(`  "exits": [\n${l.exits.map((e) => `    ${j(e)}`).join(',\n')}\n  ],`);
  out.push(`  "props": [\n${l.props.map((p) => `    ${j(p)}`).join(',\n')}\n  ]`);
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
