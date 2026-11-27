/**
 * Passages between maps: stairs and doors. Each is a prop with a stairs or door behavior (see
 * game/build.ts passageLink): walking onto the stairs or up into the door goes to the other map, where
 * you arrive in front of that map's way back. Placing one makes the room it leads to (blank, the same
 * size as this one) with the way back already in it; pointing an existing one at another room adds the
 * way back there if it has none.
 */
import type { Assets } from '../core/assets';
import type { Layout, LayoutGround, PlacedProp } from '../world/layout';

/** The art of each passage, the kind of link it makes, and the art of the way back. */
const PASSAGES: Record<string, { kind: 'stairs' | 'door'; back: string; name: string }> = {
  stairs_up: { kind: 'stairs', back: 'stairs_down', name: 'upstairs' },
  stairs_down: { kind: 'stairs', back: 'stairs_up', name: 'downstairs' },
  wall_door: { kind: 'door', back: 'wall_door', name: 'room' },
};

export function isPassage(p: PlacedProp): boolean {
  return typeof p.sprite === 'string' && p.sprite in PASSAGES;
}

export function passageKind(p: PlacedProp): 'stairs' | 'door' {
  return PASSAGES[p.sprite as string].kind;
}

/** What to call a new room a passage leads to: "<this map>_upstairs", "_downstairs" or "_room". */
export function roomNameFor(p: PlacedProp, here: string): string {
  return `${here}_${PASSAGES[p.sprite as string].name}`;
}

/** A blank room: walls all round (cap row and wall-face row at the back), wooden floor, no way out yet. */
export function blankRoom(id: string, w: number, h: number): Layout {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) rows.push(y < 2 || y === h - 1 ? 'W'.repeat(w) : 'W' + 'f'.repeat(w - 2) + 'W');
  const ground: LayoutGround = { type: 'room', rows, floor: Array.from({ length: h * 2 }, () => 'w'.repeat(w * 2)) };
  return { id, backdrop: '#221c2c', ground, spawns: {}, exits: [], props: [] };
}

/**
 * Where a passage's art goes in a room, as the 32px cell its art's top-left sits on: a door hangs on a
 * wall face (a wall cell with floor below); stairs up stand against one (their upper half is that wall);
 * stairs down are a hole in the floor with floor in front. The spot nearest the middle of the back wall wins.
 */
function spot(room: Layout, sprite: string): { x: number; y: number } | null {
  const rows = room.ground.rows;
  const at = (x: number, y: number) => rows[y]?.[x] ?? '.';
  const wall = (x: number, y: number) => 'WS'.includes(at(x, y));
  const floor = (x: number, y: number) => at(x, y) === 'f';
  const taken = room.props.filter(isPassage).map((p) => `${Math.floor(p.x / 32)},${Math.floor((p.y - 1) / 32)}`);
  const ok = (x: number, y: number): boolean => {
    if (sprite === 'stairs_down') return floor(x, y) && floor(x, y + 1) && floor(x - 1, y) && floor(x + 1, y);
    return wall(x, y) && floor(x, y + 1) && (sprite !== 'stairs_up' || floor(x, y + 2));
  };
  const w = rows[0].length;
  const mid = Math.floor(w / 2);
  for (let y = 0; y < rows.length; y++) {
    for (let d = 0; d < w; d++) {
      for (const x of [mid - d, mid + d]) {
        if (x < 0 || x >= w || !ok(x, y)) continue;
        const cell = sprite === 'stairs_up' ? `${x},${y + 1}` : `${x},${y}`;
        if (!taken.includes(cell)) return { x, y };
      }
    }
  }
  return null;
}

/** A passage of the given art placed in a room and linked to `to`, or null if the room has nowhere to put it. */
export function passageIn(room: Layout, sprite: string, to: string, assets: Assets): PlacedProp | null {
  const at = spot(room, sprite);
  if (!at) return null;
  const b = assets.bounds(sprite);
  const kind = PASSAGES[sprite].kind;
  // x, y is the middle of the bottom of the art, which sits in its cell(s) as drawn
  return {
    sprite, x: at.x * 32 + b.x + Math.floor(b.w / 2), y: at.y * 32 + b.y + b.h,
    layer: kind === 'door' ? 'wall' : 'floor', behavior: { type: kind, to },
  };
}

/** Make sure `room` has a way back to `from` for a passage of art `sprite`; returns what it did. */
export function ensureWayBack(room: Layout, from: string, sprite: string, assets: Assets): 'had' | 'added' | 'no room' {
  const kind = PASSAGES[sprite].kind;
  if (room.props.some((p) => p.behavior?.type === kind && p.behavior.to === from)) return 'had';
  const p = passageIn(room, PASSAGES[sprite].back, from, assets);
  if (!p) return 'no room';
  room.props.push(p);
  return 'added';
}

export function size(l: Layout): { w: number; h: number } {
  return l.ground.type === 'room' ? { w: l.ground.rows[0].length, h: l.ground.rows.length } : { w: 8, h: 7 };
}
