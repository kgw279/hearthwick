/**
 * Serving a table, or the bar (it works the same). Left: the seats, each with who's sitting there, what
 * they ordered (dimmed once it's been brought; a traveller orders nothing and takes anything ready) and,
 * while they wait, their patience as a row of chits, marked off one at a time over a good few minutes.
 * Right: what's ready at the plating station. Choose
 * something ready, then the guest to serve it to: it must be something they ordered. A dish brings a
 * clean set of cutlery with it, if there's one to hand. Once they have all they ordered they eat, pay and
 * leave, and what they ate from is left dirty where they sat: Y clears it into your bag. X politely
 * dismisses the chosen guest (they pay nothing, and mind less the sooner it's done). B puts back what you
 * chose to serve, or leaves.
 */
import type { Assets } from '../core/assets';
import type { Device, Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Seat } from '../game/seating';
import { CHITS, READY_MAX, type Guest, type Leaving, type Service } from '../state/service';
import { Pops } from './fx';
import { hint } from './buttons';
import { drawItem, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText, measure } from './text';

const W = 464;
const H = 248;
const ROW = 42;
const LIST_W = 300;
const TOP = 32;

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
    private readonly table: string,
    private readonly seats: Seat[],
    private readonly service: Service,
    /** Put a dirty piece in the bag; false if it doesn't fit. */
    private readonly toBag: (item: string) => boolean,
    /** A clean set of cutlery to go with a dish, if there's one. */
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

  private guest(i: number): Guest | undefined {
    const s = this.seats[i];
    return s && this.service.guests.get(s.key);
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
    if (input.pressed('recipes')) this.clear();
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
    if (this.picked === null) return this.say(this.service.ready.length ? 'Choose something ready first' : 'Nothing ready: plate something at the plating station');
    const seat = this.seats[this.seat];
    if (!seat) return;
    const dish = this.service.ready[this.picked]?.dish;
    const why = this.service.serve(this.picked, seat.key, this.cutlery);
    if (why) return this.say(why);
    const p = this.rowAt(this.seat);
    this.pops.pop(p.x + LIST_W - 40, p.y + 20, this.time, { item: dish, text: 'Served!' });
    this.say(`Served ${dish ? this.content.itemName(dish) : ''}`);
    this.picked = null;
    this.readySel = 0;
    this.pane = this.service.ready.length ? 'ready' : 'seats';
  }

  private dismiss(): void {
    const seat = this.seats[this.seat];
    const l = seat && this.service.dismiss(seat);
    if (!l) return this.say('Nobody is sitting there');
    this.left(l);
    this.say(l.mood >= 0.8 ? 'They nod and go on their way' : 'They leave, a little put out');
  }

  private clear(): void {
    const n = this.service.clear(this.table, this.toBag);
    const left = this.service.dirty.get(this.table)?.length ?? 0;
    this.say(n ? `Cleared ${n} into your bag${left ? ' (your bag is full)' : ''}` : left ? 'Your bag is full' : 'Nothing to clear');
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
    for (let i = 0; i < this.seats.length; i++) {
      const p = this.rowAt(i);
      if (px >= p.x && px < p.x + LIST_W && py >= p.y && py < p.y + ROW - 2) {
        this.pane = 'seats';
        this.seat = i;
        if (button === 0) this.choose();
        if (button === 2) this.dismiss();
        return true;
      }
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

  draw(r: Renderer): void {
    const { assets, content } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, this.title, this.x + 12, this.y + 10);

    if (!this.seats.length) {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'No seats here yet', this.x + 12, this.y + TOP + 4);
      r.ctx.globalAlpha = 1;
    }
    this.seats.forEach((_, i) => {
      const p = this.rowAt(i);
      const g = this.guest(i);
      r.nine(this.pane === 'seats' && i === this.seat ? 'slot_selected' : 'slot', p.x, p.y, LIST_W, ROW - 2);
      if (!g) {
        r.ctx.globalAlpha = 0.6;
        drawText(r, assets, 'Empty seat', p.x + 38, p.y + 15);
        r.ctx.globalAlpha = 1;
        return;
      }
      r.sprite(`${g.look}_down_idle`, p.x + 2, p.y + 4);
      drawText(r, assets, content.folk[g.folk]?.name ?? g.folk, p.x + 38, p.y + 6);
      if (g.state === 'eating') {
        r.ctx.globalAlpha = 0.7;
        drawText(r, assets, 'Enjoying their meal', p.x + 38, p.y + 22);
        r.ctx.globalAlpha = 1;
      } else {
        // patience: chits, marked off one by one
        const left = this.service.chits(g);
        for (let c = 0; c < CHITS; c++) {
          const cx = p.x + 38 + c * 10;
          const cy = p.y + 21;
          r.rect(cx, cy, 8, 8, '#45283c', true);
          r.rect(cx + 1, cy + 1, 6, 6, c < left ? '#d9a066' : '#663931', true);
          if (c < left) r.rect(cx + 2, cy + 2, 2, 2, '#eec39a', true);
        }
      }
      // the order: each thing, dimmed once it's been brought
      let ox = p.x + LIST_W - 4;
      if (g.traveller && g.state === 'waiting') {
        const t = 'Anything ready';
        r.ctx.globalAlpha = 0.7;
        drawText(r, assets, t, ox - measure(t) - 4, p.y + 15);
        r.ctx.globalAlpha = 1;
      }
      for (const part of ['drink', 'food'] as const) {
        const dish = g.order[part];
        if (!dish) continue;
        ox -= SLOT + 2;
        drawSlot(r, ox, p.y + 3, false);
        drawItem(r, assets, content, dish, ox, p.y + 3, 1, !!g.got[part]);
      }
    });
    const g = this.guest(this.seat);
    if (g && this.pane === 'seats') {
      const want = g.traveller ? 'anything (just passing through)' : [g.order.food, g.order.drink].filter((d): d is string => !!d).map((d) => content.itemName(d)).join(' and ');
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, `Ordered ${want}`, this.x + 20 + measure(this.title), this.y + 10);
      r.ctx.globalAlpha = 1;
    }

    // what's ready at the plating station
    const label = 'Ready';
    drawText(r, assets, label, this.readySlot(0).x + (SLOT - measure(label)) / 2, this.y + TOP - 8);
    for (let i = 0; i < READY_MAX; i++) {
      const p = this.readySlot(i);
      if (this.picked === i) r.nine('slot_selected', p.x - 3, p.y - 3, SLOT + 6, SLOT + 6);
      drawSlot(r, p.x, p.y, this.pane === 'ready' && i === this.readySel);
      const s = this.service.ready[i];
      if (s) drawItem(r, assets, content, s.dish, p.x, p.y);
    }
    const chosen = this.pane === 'ready' ? this.service.ready[this.readySel] : undefined;
    if (chosen) {
      const name = content.itemName(chosen.dish);
      drawText(r, assets, name, this.readySlot(0).x - measure(name) - 8, this.readySlot(this.readySel).y + 12);
    }

    // what's been left dirty here
    const dirty = this.service.dirty.get(this.table) ?? [];
    if (dirty.length) {
      const label2 = 'Left here:';
      drawText(r, assets, label2, this.x + 12, this.y + H - 30);
      dirty.slice(0, 12).forEach((item, i) => {
        const { sheet, frame } = content.item(item).sprite;
        r.sprite(`${sheet}/${frame}`, this.x + 16 + measure(label2) + i * 16, this.y + H - 40);
      });
    }
    const msg = this.time < this.message.until;
    const help = msg ? this.message.text
      : this.picked !== null ? hint(this.device, [['interact', 'serve them'], ['back', 'put it back']])
      : hint(this.device, [['interact', 'choose'], ['cook', 'dismiss'], ...(dirty.length ? [['recipes', 'clear'] as ['recipes', string]] : []), ['back', 'leave']]);
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, help, this.x + 12, this.y + H - 16);
    r.ctx.globalAlpha = 1;
    this.pops.draw(r, assets, content, this.time);
  }
}
