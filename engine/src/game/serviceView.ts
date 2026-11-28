/**
 * Serving, as seen in the world: what's ready on the plating station, guests in their seats,
 * and on each table (and the bar) what's being eaten and what's been left dirty. What guests ordered is
 * shown in the table's menu, not over their heads. Rebuilt from the service state whenever it's drawn;
 * none of it is in the map.
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import { Entity } from '../world/entity';
import type { Content } from './data';
import type { Guest, Meal, Served } from '../state/service';
import type { Seat } from './seating';
import type { Rect } from '../core/geom';

/** The small piece shown for a served part, or a dirty piece. */
function mini(content: Content, item: string, part: 'food' | 'drink' | 'cutlery' | 'dirty'): string {
  if (part !== 'dirty' && part !== 'cutlery' && !content.items[item]?.tableware) return '';
  const kind = content.items[item]?.tableware?.kind ?? 'plate';
  if (part === 'dirty') return kind === 'cutlery' ? 'mini_cutlery_dirty' : `mini_${kind}_dirty`;
  if (part === 'cutlery') return 'mini_cutlery';
  if (part === 'drink') return 'mini_mug_full';
  return kind === 'bowl' ? 'mini_bowl_food' : 'mini_plate_food';
}

/** A meal's pieces, small, with the top-left of the plate at (x, y). */
export function drawMeal(r: Renderer, content: Content, m: Meal, x: number, y: number): void {
  if (m.cutlery) r.sprite(mini(content, m.cutlery, 'cutlery'), x + 4, y - 2);
  if (m.snack) r.sprite(mini(content, m.snack.ware, 'food'), x - 4, y + 1);
  if (m.main) r.sprite(mini(content, m.main.ware, 'food'), x, y);
  if (m.drink) r.sprite(mini(content, m.drink.ware, 'drink'), x + 3, y - 6);
}

/** What's ready to serve, set out along the top of the plating station. */
export class ReadyEntity extends Entity {
  constructor(
    private readonly ready: Served[],
    private readonly art: Rect,
    private readonly station: Entity,
    private readonly content: Content,
  ) {
    super(art.x, art.y);
  }

  get sortY(): number {
    return this.station.sortY + 0.02;
  }

  draw(r: Renderer, camX: number, camY: number): void {
    const gap = (this.art.w - 16) / Math.max(1, this.ready.length);
    this.ready.forEach((s, i) => {
      const meal: Meal = { [this.content.course(s.dish)]: s };
      drawMeal(r, this.content, meal, Math.round(this.art.x + 8 + i * gap + gap / 2 - 5) - camX, this.art.y + 7 - camY);
    });
  }
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
