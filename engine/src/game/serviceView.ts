/**
 * Serving, as seen in the world: what's ready on the plating station, guests in their seats,
 * and on each table (and the bar) what's being eaten and what's been left dirty. What guests ordered is
 * shown in the table's menu, not over their heads. Rebuilt from the service state whenever it's drawn;
 * none of it is in the map.
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import { Entity, type Interaction } from '../world/entity';
import type { Content } from './data';
import { isSetting, type Guest, type Meal, type ReadySlot } from '../state/service';
import { loopFrame } from '../core/anim';
import { drawText, measure } from '../ui/text';
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
  if (m.snack?.ware) r.sprite(mini(content, m.snack.ware, 'food'), x - 4, y + 1);
  if (m.main) r.sprite(mini(content, m.main.ware, 'food'), x, y);
  if (m.dessert) r.sprite(mini(content, m.dessert.ware, 'food'), x + 5, y + 2);
  if (m.drink) r.sprite(mini(content, m.drink.ware, 'drink'), x + 3, y - 6);
}

/** What's ready to serve, set out along the top of the plating station. */
export class ReadyEntity extends Entity {
  constructor(
    private readonly ready: ReadySlot[],
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
      if (isSetting(s)) return; // cleared dishes are carried, not set out here
      const meal: Meal = { [this.content.course(s.dish)]: s };
      drawMeal(r, this.content, meal, Math.round(this.art.x + 8 + i * gap + gap / 2 - 5) - camX, this.art.y + 7 - camY);
    });
  }
}

/** A guest walking (in from the door, or out to it): straight across, then along, at a stroll. */
export class WalkerEntity extends Entity {
  private readonly facing: 'up' | 'down' | 'left' | 'right';

  /** t: how far along, 0 to 1. Feet go from `from` to `to`: up or down first, then across. */
  /** says: words shown over their head as they go (what they thought of it). */
  constructor(
    private readonly look: string, from: { x: number; y: number }, to: { x: number; y: number }, t: number,
    private readonly assets: Assets, private readonly time: number, private readonly says?: string,
  ) {
    const dy = to.y - from.y;
    const dx = to.x - from.x;
    const len = Math.abs(dx) + Math.abs(dy) || 1;
    const along = Math.max(0, Math.min(1, t)) * len;
    const first = Math.min(along, Math.abs(dy));
    const fx = from.x + Math.sign(dx) * Math.max(0, along - Math.abs(dy));
    const fy = from.y + Math.sign(dy) * first;
    super(Math.round(fx - 16), Math.round(fy - 28));
    this.facing = along < Math.abs(dy) ? (dy < 0 ? 'up' : 'down') : dx < 0 ? 'left' : 'right';
  }

  get sortY(): number {
    return this.y + 28;
  }

  draw(r: Renderer, camX: number, camY: number): void {
    const anim = `${this.look}_walk_${this.facing}`;
    const frames = this.assets.hasAnimation(anim) ? this.assets.animation(anim) : [`${this.look}_${this.facing}_idle`];
    r.sprite(loopFrame(frames, this.time, 6, 0), this.x - camX, this.y - camY);
    if (this.says) {
      const t = `"${this.says}"`;
      const tx = Math.round(this.x - camX + 16 - measure(t) / 2);
      const ty = Math.round(this.y - camY - 10);
      r.rect(tx - 3, ty - 2, measure(t) + 6, 12, '#45283c', true);
      drawText(r, this.assets, t, tx, ty);
    }
  }
}

/** A guest in their seat; or standing by the hearth, where the player can walk up and see to them (open). */
export class GuestEntity extends Entity {
  constructor(
    private readonly guest: Guest,
    private readonly seat: Seat,
    private readonly chair: Entity,
    private readonly assets: Assets,
    private readonly open?: () => void,
  ) {
    // sat on the chair: their feet just above its base (standing: at the spot)
    super(Math.round(seat.art.x + seat.art.w / 2 - 16), seat.art.y + seat.art.h - 34);
  }

  /** At a table facing away from the camera, the chair's back is in front of them; otherwise (and on a stool) behind. */
  get sortY(): number {
    if (this.seat.hearth) return this.y + 28;
    return this.chair.sortY + (this.seat.facing === 'up' && !this.seat.bar ? -0.1 : 0.1);
  }

  interaction(): Interaction | null {
    if (!this.open) return null;
    const label = { checkout: 'Settle up', room: 'A room?', settled: 'Chat' }[this.guest.state as string] ?? 'Guest';
    return { label, use: this.open };
  }

  useArea(): Rect | null {
    return this.open ? { x: this.x + 6, y: this.y + 6, w: 20, h: 24 } : null;
  }

  draw(r: Renderer, camX: number, camY: number): void {
    const frame = `${this.guest.look}_${this.seat.facing}_idle`;
    r.sprite(this.assets.has(frame) ? frame : `${this.guest.look}_down_idle`, this.x - camX, this.y - camY);
  }
}

/** What's on a table or the bar: each eater's meal in front of them, and the dishes left at each seat. */
export class TopEntity extends Entity {
  /** under: what it sits on (it draws just after that). */
  constructor(
    private readonly under: { readonly sortY: number },
    private readonly meals: Array<{ meal: Meal; x: number; y: number }>,
    private readonly piles: Array<{ items: string[]; x: number; y: number }>,
    private readonly content: Content,
  ) {
    super(0, 0);
  }

  get sortY(): number {
    return this.under.sortY + 0.02;
  }

  draw(r: Renderer, camX: number, camY: number): void {
    for (const m of this.meals) drawMeal(r, this.content, m.meal, m.x - camX, m.y - camY);
    for (const p of this.piles) {
      p.items.forEach((item, i) => r.sprite(mini(this.content, item, 'dirty'), p.x - 2 + (i % 2) * 5 - camX, p.y - 2 + Math.floor(i / 2) * 3 - camY));
    }
  }
}
