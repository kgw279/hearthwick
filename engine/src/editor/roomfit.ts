/**
 * Rooms fit what's built. An interior's grids are only as big as its walls and floor: building past an
 * edge grows them, and clearing what's at an edge shrinks them, so the room is always framed (and in
 * play, centred) on what's actually there. Growing or shrinking at the top or left moves everything on
 * the map with the walls (pieces, spawns, exits), by whole 32px cells.
 */
import type { Layout } from '../world/layout';

const CELL_PX = 32;
type Room = Extract<Layout['ground'], { type: 'room' }>;

/** A shift applied to the map, in 32px cells (positive: content moved right / down). */
export interface Shift { dx: number; dy: number }

function room(l: Layout): Room {
  if (l.ground.type !== 'room') throw new Error(`${l.id} is not an interior`);
  return l.ground;
}

/** Move everything placed on the map by (dx, dy) cells. */
function shiftContent(l: Layout, dx: number, dy: number): void {
  if (!dx && !dy) return;
  for (const p of l.props) {
    p.x += dx * CELL_PX;
    p.y += dy * CELL_PX;
  }
  for (const s of Object.values(l.spawns)) {
    s.x += dx;
    s.y += dy;
  }
  for (const e of l.exits) {
    if ('cell' in e) e.cell = [e.cell[0] + dx, e.cell[1] + dy];
    else e.area = { ...e.area, x: e.area.x + dx * CELL_PX, y: e.area.y + dy * CELL_PX };
  }
}

/** Make the room's grids cover structure cells (x0, y0)-(x1, y1), adding outside (and wood floor under it). */
export function growRoom(l: Layout, x0: number, y0: number, x1: number, y1: number): Shift {
  const g = room(l);
  const w = g.rows[0].length;
  const h = g.rows.length;
  const left = Math.max(0, -x0);
  const top = Math.max(0, -y0);
  const right = Math.max(0, x1 - (w - 1));
  const bottom = Math.max(0, y1 - (h - 1));
  if (!left && !top && !right && !bottom) return { dx: 0, dy: 0 };
  const pad = (rows: string[], k: number, ch: string) => {
    const nw = (w + left + right) * k;
    return [
      ...Array.from({ length: top * k }, () => ch.repeat(nw)),
      ...rows.map((r) => ch.repeat(left * k) + r + ch.repeat(right * k)),
      ...Array.from({ length: bottom * k }, () => ch.repeat(nw)),
    ];
  };
  g.rows = pad(g.rows, 1, '.');
  g.floor = pad(g.floor, 2, 'w');
  shiftContent(l, left, top);
  return { dx: left, dy: top };
}

/** Crop the room to what's built (no border of outside); a room with nothing built is left as it is. */
export function trimRoom(l: Layout): Shift {
  const g = room(l);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  g.rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (r[x] === '.') continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  });
  if (x1 < 0) return { dx: 0, dy: 0 };
  if (x0 === 0 && y0 === 0 && x1 === g.rows[0].length - 1 && y1 === g.rows.length - 1) return { dx: 0, dy: 0 };
  g.rows = g.rows.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1));
  g.floor = g.floor.slice(y0 * 2, (y1 + 1) * 2).map((r) => r.slice(x0 * 2, (x1 + 1) * 2));
  shiftContent(l, -x0, -y0);
  return { dx: -x0, dy: -y0 };
}
