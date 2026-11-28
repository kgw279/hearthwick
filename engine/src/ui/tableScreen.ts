/**
 * Serving a table, or the bar (it works the same). Left, one row per seat: guests first, in the order
 * they sat down, then seats with dishes left on them, then empty ones.
 *  - A guest: who they are, a slot per course they want (a drink, a snack, a main, a dessert: anything
 *    of that course, something of a kind like "baked", or something in particular), filled as each is
 *    brought, and their patience as a row of small chits marked off one at a time over a good few
 *    minutes. Courses can be served in any order.
 *  - Dishes left behind: one guest's place setting. Nobody sits there till it's cleared: choose it to
 *    take the dishes one by one (or click each) into your bag.
 * Right: what's ready at the plating station. Choose something ready, then the guest to serve it to: it
 * must be what they want for its course. A main brings a clean set of cutlery with it, if there's one to
 * hand. X politely dismisses the chosen guest (they pay nothing, and mind less the sooner it's done).
 * B puts back what you chose to serve, or leaves.
 */
import type { Assets } from '../core/assets';
import type { Device, Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import { COURSE_NAMES, type Content } from '../game/data';
import type { Seat } from '../game/seating';
import { CHITS, READY_MAX, type Guest, type Leaving, type Service } from '../state/service';
import { hint } from './buttons';
import { Pops } from './fx';
import { drawItem, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText, measure } from './text';

const W = 464;
const H = 248;
const ROW = 42;
const LIST_W = 320;
const TOP = 32;
const DISH = 18; // spacing of dirty dishes in a row

export class TableScreen implements Screen {
  private pane: 'ready' | 'seats';
  private seat = 0;
  private readySel = 0;
  /** The ready dish chosen to serve. */
  private picked: number | null = null;
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;
  private device: Device = 'keyboard';
  private readonly pops = new Pops();

  constructor(
    private readonly title: string,
    private readonly seats: Seat[],
    private readonly service: Service,
    /** Put a dirty piece in the bag; false if it doesn't fit. */
    private readonly toBag: (item: string) => boolean,
    /** A clean set of cutlery to go with a main, if there's one. */
    private readonly cutlery: () => string | null,
    /** A guest has left (dismissed). */
    private readonly left: (l: Leaving) => void,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {
    this.pane = service.ready.length ? 'ready' : 'seats';
  }

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  /** The seats in the order they're listed: guests by when they sat, then dishes left, then empty. */
  private rows(): Seat[] {
    const g = (s: Seat) => this.service.guests.get(s.key);
    const dirty = (s: Seat) => !!this.service.dirty.get(s.key)?.length;
    return [
      ...this.seats.filter(g).sort((a, b) => g(a)!.seated - g(b)!.seated),
      ...this.seats.filter((s) => !g(s) && dirty(s)),
      ...this.seats.filter((s) => !g(s) && !dirty(s)),
    ];
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    this.device = input.device;
    if (input.pressed('back') || input.pressed('menu')) {
      if (this.picked === null) return false;
      this.picked = null;
      this.pane = 'ready';
      return true;
    }
    const d = this.nav.step(input, dt);
    if (d) this.move(d);
    if (input.pressed('interact')) this.choose();
    if (input.pressed('cook')) this.dismiss();
    return true;
  }

  private move(d: { x: number; y: number }): void {
    if (this.pane === 'seats') {
      if (d.x > 0) this.pane = 'ready';
      else if (d.y) this.seat = Math.max(0, Math.min(this.seats.length - 1, this.seat + d.y));
      return;
    }
    if (d.x < 0) this.pane = 'seats';
    else if (d.y) this.readySel = Math.max(0, Math.min(READY_MAX - 1, this.readySel + d.y));
  }

  private choose(): void {
    if (this.pane === 'ready') {
      if (!this.service.ready[this.readySel]) return this.say(this.service.ready.length ? 'Nothing there' : 'Nothing ready: plate something at the plating station');
      this.picked = this.readySel;
      this.pane = 'seats';
      this.say('Now choose who to serve it to');
      return;
    }
    const seat = this.rows()[this.seat];
    if (!seat) return;
    if (!this.service.guests.has(seat.key) && this.service.dirty.get(seat.key)?.length) return this.clear(seat, 0);
    if (this.picked === null) return this.say(this.service.ready.length ? 'Choose something ready first' : 'Nothing ready: plate something at the plating station');
    const dish = this.service.ready[this.picked]?.dish;
    const why = this.service.serve(this.picked, seat.key, this.cutlery);
    if (why) return this.say(why);
    const p = this.rowAt(this.seat);
    this.pops.pop(p.x + LIST_W - 50, p.y + 20, this.time, { item: dish, text: 'Served!' });
    this.say(`Served ${dish ? this.content.itemName(dish) : ''}`);
    this.picked = null;
    this.readySel = 0;
    this.pane = this.service.ready.length ? 'ready' : 'seats';
  }

  /** Take one dirty dish from a seat into the bag. */
  private clear(seat: Seat, i: number): void {
    const p = this.rowAt(this.rows().indexOf(seat));
    const item = this.service.clearOne(seat.key, i, this.toBag);
    if (!item) return this.say('Your bag is full');
    this.pops.pop(p.x + 46 + i * DISH + 8, p.y + 18, this.time, { item, text: 'Cleared' });
  }

  private dismiss(): void {
    const seat = this.rows()[this.seat];
    const l = seat && this.service.dismiss(seat);
    if (!l) return this.say('Nobody is sitting there');
    this.left(l);
    this.say(l.mood >= 0.8 ? 'They nod and go on their way' : 'They leave, a little put out');
  }

  private say(text: string): void {
    this.message = { text, until: this.time + 2 };
  }

  private rowAt(i: number): { x: number; y: number } {
    return { x: this.x + 10, y: this.y + TOP + i * ROW };
  }

  private readySlot(i: number): { x: number; y: number } {
    return { x: this.x + W - 12 - SLOT, y: this.y + TOP + 4 + i * (SLOT + 4) };
  }

  pointer(px: number, py: number, button: number): boolean {
    const rows = this.rows();
    for (let i = 0; i < rows.length; i++) {
      const p = this.rowAt(i);
      if (px < p.x || px >= p.x + LIST_W || py < p.y || py >= p.y + ROW - 2) continue;
      this.pane = 'seats';
      this.seat = i;
      const seat = rows[i];
      const pile = !this.service.guests.has(seat.key) ? this.service.dirty.get(seat.key) : undefined;
      if (pile?.length && button === 0) {
        // the dish clicked on
        const k = Math.floor((px - (p.x + 46)) / DISH);
        if (k >= 0 && k < pile.length) this.clear(seat, k);
        return true;
      }
      if (button === 0) this.choose();
      if (button === 2) this.dismiss();
      return true;
    }
    for (let i = 0; i < READY_MAX; i++) {
      const p = this.readySlot(i);
      if (px < p.x || py < p.y || px >= p.x + SLOT || py >= p.y + SLOT) continue;
      this.pane = 'ready';
      this.readySel = i;
      if (button === 0) this.choose();
      return true;
    }
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  /** A guest's row: who, their patience, a slot per course they want. */
  private drawGuest(r: Renderer, g: Guest, p: { x: number; y: number }): void {
    const { assets, content, service } = this;
    r.sprite(`${g.look}_down_idle`, p.x + 2, p.y + 4);
    drawText(r, assets, content.folk[g.folk]?.name ?? g.folk, p.x + 38, p.y + 6);
    if (g.state === 'eating') {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'Enjoying their meal', p.x + 38, p.y + 22);
      r.ctx.globalAlpha = 1;
    } else {
      const left = service.chits(g);
      for (let c = 0; c < CHITS; c++) {
        const cx = p.x + 38 + c * 6;
        const cy = p.y + 23;
        r.rect(cx, cy, 5, 5, '#45283c', true);
        r.rect(cx + 1, cy + 1, 3, 3, c < left ? '#df7126' : '#eec39a', true);
      }
    }
    const wants = service.wants(g);
    wants.forEach((c, k) => {
      const sx = p.x + LIST_W - 4 - (wants.length - k) * (SLOT + 2);
      drawSlot(r, sx, p.y + 3, false);
      const got = g.got[c];
      const w = g.order[c]!;
      if (got) drawItem(r, assets, content, got.dish, sx, p.y + 3);
      else if (w.dish) drawItem(r, assets, content, w.dish, sx, p.y + 3, 1, true);
      else {
        // "Any / drink", or "baked / snack"
        const top = w.trait ?? 'Any';
        r.ctx.globalAlpha = 0.75;
        drawText(r, assets, top, sx + Math.round((SLOT - measure(top)) / 2), p.y + 8);
        drawText(r, assets, c, sx + Math.round((SLOT - measure(c)) / 2), p.y + 19);
        r.ctx.globalAlpha = 1;
      }
    });
  }

  draw(r: Renderer): void {
    const { assets, content, service } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, this.title, this.x + 12, this.y + 10);

    const rows = this.rows();
    if (!rows.length) {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'No seats here yet', this.x + 12, this.y + TOP + 4);
      r.ctx.globalAlpha = 1;
    }
    rows.forEach((seat, i) => {
      const p = this.rowAt(i);
      r.nine(this.pane === 'seats' && i === this.seat ? 'slot_selected' : 'slot', p.x, p.y, LIST_W, ROW - 2);
      const g = service.guests.get(seat.key);
      const pile = service.dirty.get(seat.key);
      if (g) this.drawGuest(r, g, p);
      else if (pile?.length) {
        // one guest's place setting, left behind: each dish to be cleared
        r.ctx.globalAlpha = 0.7;
        drawText(r, assets, 'Left', p.x + 8, p.y + 9);
        drawText(r, assets, 'here', p.x + 8, p.y + 20);
        r.ctx.globalAlpha = 1;
        pile.forEach((item, k) => drawItem(r, assets, content, item, p.x + 46 + k * DISH - 8, p.y + 3));
      } else {
        r.ctx.globalAlpha = 0.6;
        drawText(r, assets, 'Empty seat', p.x + 38, p.y + 15);
        r.ctx.globalAlpha = 1;
      }
    });
    // what the chosen guest wants, in words
    const chosen = rows[this.seat] && service.guests.get(rows[this.seat].key);
    if (chosen && this.pane === 'seats') {
      const want = service.wants(chosen).map((c) => service.describe(c, chosen.order[c]!)).join(', ');
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, `Wants ${want}`, this.x + 20 + measure(this.title), this.y + 10);
      r.ctx.globalAlpha = 1;
    }

    // what's ready at the plating station
    const label = 'Ready';
    drawText(r, assets, label, this.readySlot(0).x + (SLOT - measure(label)) / 2, this.y + TOP - 8);
    for (let i = 0; i < READY_MAX; i++) {
      const p = this.readySlot(i);
      if (this.picked === i) r.nine('slot_selected', p.x - 3, p.y - 3, SLOT + 6, SLOT + 6);
      drawSlot(r, p.x, p.y, this.pane === 'ready' && i === this.readySel);
      const s = service.ready[i];
      if (s) drawItem(r, assets, content, s.dish, p.x, p.y);
    }
    const sel = this.pane === 'ready' ? service.ready[this.readySel] : undefined;
    if (sel) {
      // what's chosen, in the header: what it is and which course
      const name = `${content.itemName(sel.dish)}, a ${COURSE_NAMES[content.course(sel.dish)]}`;
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, name, this.x + 20 + measure(this.title), this.y + 10);
      r.ctx.globalAlpha = 1;
    }

    const msg = this.time < this.message.until;
    const seat = rows[this.seat];
    const onDirty = seat && !service.guests.has(seat.key) && !!service.dirty.get(seat.key)?.length;
    const help = msg ? this.message.text
      : this.picked !== null ? hint(this.device, [['interact', 'serve them'], ['back', 'put it back']])
      : onDirty && this.pane === 'seats' ? hint(this.device, [['interact', 'clear a dish'], ['back', 'leave']])
      : hint(this.device, [['interact', 'choose'], ['cook', 'dismiss'], ['back', 'leave']]);
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, help, this.x + 12, this.y + H - 16);
    r.ctx.globalAlpha = 1;
    this.pops.draw(r, assets, content, this.time);
  }
}
