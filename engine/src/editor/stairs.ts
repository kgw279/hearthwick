/**
 * Stairs between maps. Stairs are a prop with a stairs behavior (see game/build.ts stairsLink): walking
 * onto them goes to the other map, where you arrive in front of that map's stairs back. Placing stairs
 * makes the room they lead to (blank, the same size as this one) with stairs back down or up already in
 * it; pointing existing stairs at another room adds stairs back there if it has none.
 */
import type { Layout, LayoutGround, PlacedProp } from '../world/layout';

/** The art for each way, and the other way's. */
const OTHER: Record<string, string> = { stairs_up: 'stairs_down', stairs_down: 'stairs_up' };

export function isStairs(p: PlacedProp): boolean {
  return typeof p.sprite === 'string' && p.sprite in OTHER;
}

/** A blank room: walls all round (cap row and wall-face row at the back), wooden floor, no way out but stairs. */
export function blankRoom(id: string, w: number, h: number): Layout {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) rows.push(y < 2 || y === h - 1 ? 'W'.repeat(w) : 'W' + 'f'.repeat(w - 2) + 'W');
  const ground: LayoutGround = { type: 'room', rows, floor: Array.from({ length: h * 2 }, () => 'w'.repeat(w * 2)) };
  return { id, backdrop: '#221c2c', ground, spawns: {}, exits: [], props: [] };
}

/**
 * Stairs of the given art placed in a room, linked to `to`. Stairs up stand against the back wall (their
 * upper half is the wall they climb into); stairs down are a hole in the floor near the back.
 */
export function stairsIn(room: Layout, sprite: string, to: string): PlacedProp {
  const w = room.ground.rows[0].length;
  const cx = Math.max(1, Math.min(w - 2, Math.floor(w / 2) - 1));
  // base of the art on the first floor row (row 2, under the cap and wall-face rows)
  const y = sprite === 'stairs_up' ? 3 * 32 : 3 * 32 - 1;
  return { sprite, x: cx * 32 + 16, y, layer: 'floor', behavior: { type: 'stairs', to } };
}

/** Make sure `room` has stairs leading back to `from` (of the opposite way to `sprite`); returns true if it added them. */
export function ensureStairsBack(room: Layout, from: string, sprite: string): boolean {
  if (room.props.some((p) => p.behavior?.type === 'stairs' && p.behavior.to === from)) return false;
  room.props.push(stairsIn(room, OTHER[sprite], from));
  return true;
}

export function size(l: Layout): { w: number; h: number } {
  return l.ground.type === 'room' ? { w: l.ground.rows[0].length, h: l.ground.rows.length } : { w: 8, h: 7 };
}
