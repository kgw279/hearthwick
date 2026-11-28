/**
 * Serving, as seen in the world: trays on the counter (and their meals), guests in their seats (with
 * what they're waiting for over their heads), and on each table what's being eaten and what's been left
 * dirty. Rebuilt from the service state whenever it's drawn; none of it is in the map.
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import type { Rect } from '../core/geom';
import { Entity, type Interaction } from '../world/entity';
import type { Content } from './data';
import type { Guest, Meal, Tray } from '../state/service';
import type { Seat, Spot, Table } from './seating';

/** The small piece shown for a served part, or a dirty piece. */
function mini(content: Content, item: string, part: 'food' | 'drink' | 'cutlery' | 'dirty'): string {
  const kind = content.items[item]?.tableware?.kind ?? 'plate';
  if (part === 'dirty') return kind === 'cutlery' ? 'mini_cutlery_dirty' : `mini_${kind}_dirty`;
  if (part === 'cutlery') return 'mini_cutlery';
  if (part === 'drink') return 'mini_mug_full';
  return kind === 'bowl' ? 'mini_bowl_food' : 'mini_plate_food';
}

/** A meal's pieces, small, with the top-left of the plate at (x, y). */
export function drawMeal(r: Renderer, content: Content, m: Meal, x: number, y: number): void {
  if (m.cutlery) r.sprite(mini(content, m.cutlery, 'cutlery'), x + 4, y - 2);
  if (m.food) r.sprite(mini(content, m.food.ware, 'food'), x, y);
  if (m.drink) r.sprite(mini(content, m.drink.ware, 'drink'), x + 3, y - 6);
}

export class TrayEntity extends Entity {
  constructor(
    private readonly tray: Tray,
    spot: Spot,
    private readonly counter: Entity,
    private readonly content: Content,
    private readonly action: Interaction,
  ) {
    super(spot.x - 16, spot.y - 24);
  }

  get sortY(): number {
    return this.counter.sortY + 0.02;
  }

  useArea(): Rect {
    return { x: this.x + 4, y: this.y + 20, w: 24, h: 28 };
  }

  interaction(): Interaction {
    return this.action;
  }

  draw(r: Renderer, camX: number, camY: number): void {
    drawTray(r, this.content, this.tray, this.x - camX, this.y - camY);
  }
}

/** A tray and its meals, its frame's top-left at (x, y) on screen. */
export function drawTray(r: Renderer, content: Content, tray: Tray, x: number, y: number): void {
  r.sprite('serving_tray', x, y);
  tray.meals.forEach((m, i) => drawMeal(r, content, m, x + 4 + i * 6, y + 19));
}

export class GuestEntity extends Entity {
  constructor(
    private readonly guest: Guest,
    private readonly seat: Seat,
    private readonly chair: Entity,
    private readonly assets: Assets,
  ) {
    // sat on the chair: their feet just above its base
    super(Math.round(seat.art.x + seat.art.w / 2 - 16), seat.art.y + seat.art.h - 34);
  }

  /** Facing a table away from the camera, the chair's back is in front of them; otherwise behind. */
  get sortY(): number {
    return this.chair.sortY + (this.seat.facing === 'up' ? -0.1 : 0.1);
  }

  draw(r: Renderer, camX: number, camY: number, time: number): void {
    const x = this.x - camX;
    const y = this.y - camY;
    const frame = `${this.guest.look}_${this.seat.facing}_idle`;
    r.sprite(this.assets.has(frame) ? frame : `${this.guest.look}_down_idle`, x, y);
    if (this.guest.state !== 'waiting') return;
    // what they're still waiting for, bobbing over their head
    const bob = Math.floor(time * 2) % 2;
    const want: string[] = [];
    if (this.guest.order.food && !this.guest.got.food) want.push('mini_plate_food');
    if (this.guest.order.drink && !this.guest.got.drink) want.push('mini_mug_full');
    want.forEach((m, i) => r.sprite(m, x + 10 + i * 8 - (want.length - 1) * 4, y - 6 + bob));
  }
}

export class TableTopEntity extends Entity {
  constructor(
    private readonly table: Table,
    private readonly prop: Entity,
    /** Guests eating here, with where they sit. */
    private readonly eating: Array<{ guest: Guest; seat: Seat }>,
    private readonly dirty: string[],
    private readonly content: Content,
  ) {
    super(table.art.x, table.art.y);
  }

  get sortY(): number {
    return this.prop.sortY + 0.02;
  }

  draw(r: Renderer, camX: number, camY: number): void {
    const t = this.table.art;
    const top = t.y + 4; // the table top's back edge
    const cx = t.x + t.w / 2;
    // each eater's meal on the table's edge nearest them
    for (const { guest, seat } of this.eating) {
      const side = seat.facing === 'right' ? t.x + 2 : seat.facing === 'left' ? t.x + t.w - 12 : cx - 5;
      const y = seat.facing === 'down' ? top + 2 : seat.facing === 'up' ? top + 10 : top + 6;
      drawMeal(r, this.content, guest.got, side - camX, y - camY);
    }
    // what's been left, in a little pile in the middle
    this.dirty.forEach((item, i) => {
      r.sprite(mini(this.content, item, 'dirty'), Math.round(cx - 8 + (i % 3) * 5) - camX, top + 4 + Math.floor(i / 3) * 3 - camY);
    });
  }
}
