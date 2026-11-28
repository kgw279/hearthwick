/**
 * Where guests sit and trays rest, worked out from a map's pieces (so moving furniture in the editor or
 * in play moves them too):
 *  - a seat is a chair facing a table: the chair's art is just short of a table's in the way it faces,
 *    and overlaps it across that way; or a stool just in front of the bar (a bar counter that isn't a
 *    shop's), facing it. Everyone at the bar is at one "table", the bar;
 *  - guests who've come just for a room (and guests settling up for their room in the morning) stand by
 *    the hearth: a few spots in front of it, all one "table". The inn always has a hearth;
 *  - what's ready to serve is shown on top of the plating station.
 * Keys name a seat or table by its map and position.
 */
import type { Assets } from '../core/assets';
import type { Rect } from '../core/geom';
import type { Layout, PlacedProp } from '../world/layout';
import type { Facing } from '../world/scene';
import { artRect, propFrames } from './build';
import type { Content } from './data';

export interface Seat {
  key: string;
  layout: string;
  /** At a table (on a chair), or at the bar (on a stool). */
  bar: boolean;
  /** Standing by the hearth (waiting for a room, or to settle up). */
  hearth?: boolean;
  /** The chair (for a spot by the hearth, the hearth): its index in the layout, its art (where the guest is), which way they face. */
  chair: number;
  art: Rect;
  facing: Facing;
  /** The table's key. */
  table: string;
}

export interface Table { key: string; layout: string; prop: number; art: Rect }

const REACH = 14; // px a chair can be from its table
const CHAIR = /^chair_(down|up|left|right)$/;
const TABLE = /^table_\d$/;
const COUNTER = /^bar_counter/;
const STOOL = /^stool$/;
const PLATING = /^plating_station$/;

/** The key all the bar's seats share as their "table". */
export const barKey = (layout: string) => `${layout}:bar`;
/** The key the spots by a map's hearth share. */
export const hearthKey = (layout: string) => `${layout}:hearth`;
const HEARTH = /^(anim:)?fireplace$/;
/** Whether a piece is a hearth. */
export const isHearth = (p: PlacedProp) => typeof p.sprite === 'string' && HEARTH.test(p.sprite);
const HEARTH_SPOTS = [-22, 0, 22]; // px across from the hearth's middle where guests stand
const HEARTH_GAP = 14; // px in front of it

const keyOf = (layout: string, p: PlacedProp) => `${layout}:${Math.round(p.x)},${Math.round(p.y)}`;

export function seating(layout: Layout, assets: Assets, content: Content): { seats: Seat[]; tables: Table[] } {
  const art = (p: PlacedProp) => artRect(p, propFrames(p, assets, content)[0], assets);
  const tables: Table[] = [];
  layout.props.forEach((p, i) => {
    if (typeof p.sprite === 'string' && TABLE.test(p.sprite)) tables.push({ key: keyOf(layout.id, p), layout: layout.id, prop: i, art: art(p) });
  });
  const counters = layout.props.filter((p) => !p.behavior && typeof p.sprite === 'string' && COUNTER.test(p.sprite)).map(art);
  const seats: Seat[] = [];
  layout.props.forEach((p, i) => {
    if (typeof p.sprite !== 'string') return;
    const m = CHAIR.exec(p.sprite);
    const c = m || STOOL.test(p.sprite) ? art(p) : null;
    if (!c) return;
    if (m) {
      const facing = m[1] as Facing;
      const t = tables.find((t) => faces(c, t.art, facing));
      if (t) seats.push({ key: keyOf(layout.id, p), layout: layout.id, bar: false, chair: i, art: c, facing, table: t.key });
    } else if (counters.some((k) => faces(c, k, 'up'))) {
      seats.push({ key: keyOf(layout.id, p), layout: layout.id, bar: true, chair: i, art: c, facing: 'up', table: barKey(layout.id) });
    }
  });
  // the spots by the (first) hearth
  const h = layout.props.findIndex(isHearth);
  if (h >= 0) {
    const a = art(layout.props[h]);
    HEARTH_SPOTS.forEach((dx, n) => {
      const feet = { x: Math.round(a.x + a.w / 2 + dx), y: a.y + a.h + HEARTH_GAP };
      seats.push({
        key: `${hearthKey(layout.id)}:${n}`, layout: layout.id, bar: false, hearth: true, chair: h,
        art: { x: feet.x - 16, y: feet.y - 26, w: 32, h: 32 }, facing: 'up', table: hearthKey(layout.id),
      });
    });
  }
  return { seats, tables };
}

/** Whether a chair's art faces a table's: close in front of it, and level with it across. */
function faces(c: Rect, t: Rect, facing: Facing): boolean {
  const across = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0) > 4;
  switch (facing) {
    case 'right': return t.x - (c.x + c.w) > -REACH && t.x - (c.x + c.w) < REACH && across(c.y, c.y + c.h, t.y, t.y + t.h);
    case 'left': return c.x - (t.x + t.w) > -REACH && c.x - (t.x + t.w) < REACH && across(c.y, c.y + c.h, t.y, t.y + t.h);
    case 'down': return t.y - (c.y + c.h) > -REACH * 2 && t.y - (c.y + c.h) < REACH && across(c.x, c.x + c.w, t.x, t.x + t.w);
    case 'up': return c.y - (t.y + t.h) > -REACH * 2 && c.y - (t.y + t.h) < REACH && across(c.x, c.x + c.w, t.x, t.x + t.w);
  }
}

/** The plating stations in a map: their index in the layout and their art. */
export function platingStations(layout: Layout, assets: Assets, content: Content): Array<{ prop: number; art: Rect }> {
  const out: Array<{ prop: number; art: Rect }> = [];
  layout.props.forEach((p, i) => {
    if (typeof p.sprite === 'string' && PLATING.test(p.sprite)) out.push({ prop: i, art: artRect(p, propFrames(p, assets, content)[0], assets) });
  });
  return out;
}
