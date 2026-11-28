/**
 * Serving, as seen in the world: trays on the plating station (and their meals), guests in their seats,
 * and on each table (and the bar) what's being eaten and what's been left dirty. What guests ordered is
 * shown in the table's menu, not over their heads. Rebuilt from the service state whenever it's drawn;
 * none of it is in the map.
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import type { Rect } from '../core/geom';
import { Entity, type Interaction } from '../world/entity';
import type { Content } from './data';
import type { Guest, Meal, Tray } from '../state/service';
import type { Seat, Spot } from './seating';

/** The small piece shown for a served part, or a dirty piece. */
function mini(content: Content, item: string, part: 'food' | 'drink' | 'cutlery' | 'dirty'): string {
  const kind = content.items[item]?.tableware?.kind ?? 'plate';
  if (part === 'dirty') return kind === 'cutlery' ? 'mini_cutlery_dirty' : `mini_${kind}_dirty`;
  if (part === 'cutlery') return 'mini_cutlery';
  if (part === 'drink') return 'mini_mug_full';
  if (!content.items[item]?.tableware) return ''; // a snack, served as it is
  return kind === 'bowl' ? 'mini_bowl_food' : 'mini_plate_food';
}

/** A meal's pieces, small, with the top-left of the plate at (x, y). */
export function drawMeal(r: Renderer, content: Content, m: Meal, x: number, y: number): void {
  if (m.cutlery) r.sprite(mini(content, m.cutlery, 'cutlery'), x + 4, y - 2);
  if (m.food?.ware) r.sprite(mini(content, m.food.ware, 'food'), x, y);
  if (m.drink) r.sprite(mini(content, m.drink.ware, 'drink'), x + 3, y - 6);
}

export class TrayEntity extends Entity {
  constructor(
    private readonly tray: Tray,
    spot: Spot,
    private readonly station: Entity,
    private readonly content: Content,
    private readonly action: Interaction,
  ) {
    super(spot.x - 16, spot.y - 24);
  }

  get sortY(): number {
    return this.station.sortY + 0.02;
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

  /** At a table facing away from the camera, the chair's back is in front of them; otherwise (and on a stool) behind. */
  get sortY(): number {
    return this.chair.sortY + (this.seat.facing === 'up' && !this.seat.bar ? -0.1 : 0.1);
  }

  draw(r: Renderer, camX: number, camY: number): void {
    const frame = `${this.guest.look}_${this.seat.facing}_idle`;
    r.sprite(this.assets.has(frame) ? frame : `${this.guest.look}_down_idle`, this.x - camX, this.y - camY);
  }
}

/** What's on a table or the bar: each eater's meal in front of them, and a pile of what's been left. */
export class TopEntity extends Entity {
  /** under: what it sits on (it draws just after that). */
  constructor(
    private readonly under: { readonly sortY: number },
    private readonly meals: Array<{ meal: Meal; x: number; y: number }>,
    private readonly pile: { items: string[]; x: number; y: number },
    private readonly content: Content,
  ) {
    super(pile.x, pile.y);
  }

  get sortY(): number {
    return this.under.sortY + 0.02;
  }

  draw(r: Renderer, camX: number, camY: number): void {
    for (const m of this.meals) drawMeal(r, this.content, m.meal, m.x - camX, m.y - camY);
    this.pile.items.forEach((item, i) => {
      r.sprite(mini(this.content, item, 'dirty'), Math.round(this.pile.x - 8 + (i % 3) * 5) - camX, this.pile.y + Math.floor(i / 3) * 3 - camY);
    });
  }
}
