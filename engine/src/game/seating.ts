/**
 * Where guests sit and trays rest, worked out from a map's pieces (so moving furniture in the editor or
 * in play moves them too):
 *  - a seat is a chair facing a table: the chair's art is just short of a table's in the way it faces,
 *    and overlaps it across that way; or a stool just in front of the bar (a bar counter that isn't a
 *    shop's), facing it. Everyone at the bar is at one "table", the bar;
 *  - tray spots are the top of a plating station: room for two trays side by side.
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
const STOOL = /^stool$/;
const PLATING = /^plating_station$/;

/** The key all the bar's seats share as their "table". */
export const barKey = (layout: string) => `${layout}:bar`;

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

/** Spots for trays: two on top of each plating station, in map order. */
export function traySpots(layout: Layout, assets: Assets, content: Content): Spot[] {
  const out: Spot[] = [];
  layout.props.forEach((p, i) => {
    if (typeof p.sprite !== 'string' || !PLATING.test(p.sprite)) return;
    const a = artRect(p, propFrames(p, assets, content)[0], assets);
    for (const k of [0.25, 0.75]) out.push({ layout: layout.id, prop: i, x: Math.round(a.x + a.w * k), y: a.y + 11 });
  });
  return out;
}

/** Which tray spots belong to the plating station at prop index `prop`. */
export function spotsAt(spots: Spot[], prop: number): number[] {
  return spots.map((s, i) => (s.prop === prop ? i : -1)).filter((i) => i >= 0);
}
