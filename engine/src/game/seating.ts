/**
 * Where guests sit and trays rest, worked out from a map's pieces (so moving furniture in the editor or
 * in play moves them too):
 *  - a seat is a chair facing a table: the chair's art is just short of a table's in the way it faces,
 *    and overlaps it across that way;
 *  - a tray spot is the top of a serving counter piece (a bar counter that isn't a shop's).
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
  /** The chair: its index in the layout, its art, which way the sitter faces. */
  chair: number;
  art: Rect;
  facing: Facing;
  /** The table's key. */
  table: string;
}

export interface Table { key: string; layout: string; prop: number; art: Rect }

export interface Spot { layout: string; prop: number; x: number; y: number }

const REACH = 14; // px a chair can be from its table
const CHAIR = /^chair_(down|up|left|right)$/;
const TABLE = /^table_\d$/;
const COUNTER = /^bar_counter/;

const keyOf = (layout: string, p: PlacedProp) => `${layout}:${Math.round(p.x)},${Math.round(p.y)}`;

export function seating(layout: Layout, assets: Assets, content: Content): { seats: Seat[]; tables: Table[] } {
  const art = (p: PlacedProp) => artRect(p, propFrames(p, assets, content)[0], assets);
  const tables: Table[] = [];
  layout.props.forEach((p, i) => {
    if (typeof p.sprite === 'string' && TABLE.test(p.sprite)) tables.push({ key: keyOf(layout.id, p), layout: layout.id, prop: i, art: art(p) });
  });
  const seats: Seat[] = [];
  layout.props.forEach((p, i) => {
    const m = typeof p.sprite === 'string' ? CHAIR.exec(p.sprite) : null;
    if (!m) return;
    const facing = m[1] as Facing;
    const c = art(p);
    const t = tables.find((t) => faces(c, t.art, facing));
    if (t) seats.push({ key: keyOf(layout.id, p), layout: layout.id, chair: i, art: c, facing, table: t.key });
  });
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

/** Spots for trays: the top of each serving counter piece, in map order. */
export function traySpots(layout: Layout, assets: Assets, content: Content): Spot[] {
  const out: Spot[] = [];
  layout.props.forEach((p, i) => {
    if (p.behavior || typeof p.sprite !== 'string' || !COUNTER.test(p.sprite)) return;
    const a = artRect(p, propFrames(p, assets, content)[0], assets);
    out.push({ layout: layout.id, prop: i, x: Math.round(a.x + a.w / 2), y: a.y + 8 });
  });
  return out;
}
