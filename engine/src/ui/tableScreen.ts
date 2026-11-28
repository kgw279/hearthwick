/**
 * Serving a table, or the bar (it works the same). Left, one row per seat: guests first, in the order
 * they sat down, then seats with dishes left on them, then empty ones.
 *  - A guest: who they are, a slot per course they want (a drink, a snack, a main, a dessert: anything
 *    of that course, something of a kind like "baked", or something in particular), filled as each is
 *    brought, and their patience as a row of small chits marked off one at a time over a good few
 *    minutes. Courses can be served in any order.
 *  - Dishes left behind: one guest's place setting. Nobody sits there till it's cleared: choose it to
 *    take the dishes one by one (or click each); they go together into one of your ready slots, to carry
 *    to the wash station.
 * Right: what you have in hand (the ready slots): dishes plated at the plating station, and cleared
 * settings. Serving: choose the guest, then which of their requests (left / right, or click it), then
 * what in hand to serve it with. Anything can go in any request, but the wrong course or not what they
 * asked for leaves them less happy (and the inn less renowned); the line at the top says how it fits. A
 * main brings clean cutlery with it, if there's some to hand. X politely dismisses the chosen guest (they
 * pay nothing, and mind less the sooner it's done). A guest sitting back after their meal may be in the
 * mood to talk (their row shows the button, Y): what they say is said once, and can lead somewhere. A guest asking
 * for a room: choose them, then one of the inn's rooms (each shown with whether it's ready, and which of
 * the comforts they'd like it has). By the hearth (the same menu): guests in for just a room, and guests
 * down from their rooms to settle up (choose them to take their payment). B steps back, or leaves.
 */
import type { Assets } from '../core/assets';
import type { Device, Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import { COURSE_NAMES, type Content } from '../game/data';
import type { Seat } from '../game/seating';
import { CHITS, isSetting, READY_MAX, type Guest, type Outcome, type Service } from '../state/service';
import { drawReady } from './ready';
import type { Course } from '../game/data';
import { hint } from './buttons';
import { Pops } from './fx';
import { drawItem, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText, measure, wrap } from './text';
import { drawTag, TAG_SIZE } from './tags';

const W = 464;
const H = 248;
const ROW = 42;
const LIST_W = 320;
const TOP = 32;
const DISH = 18; // spacing of dirty dishes in a row
const TALK_TIME = 6; // seconds what a guest said stays up

/** A guest room, as the table needs it: whether it's ready (why not), and which comforts it has. */
export interface RoomChoice { id: string; name: string; why: string | null; has: (comfort: string) => boolean }

export class TableScreen implements Screen {
  private pane: 'ready' | 'seats' | 'slots' | 'rooms';
  /** Which room (when giving one). */
  private room = 0;
  /** What the guest last said, and till when it's shown. */
  private speech = { text: '', until: 0 };
  /** Which of the chosen guest's course slots (when placing). */
  private slot = 0;
  private seat = 0;
  private readySel = 0;
  /** The ready dish chosen to serve. */
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;
  private device: Device = 'keyboard';
  private readonly pops = new Pops();

  constructor(
    private readonly title: string,
    private readonly seats: Seat[],
    private readonly service: Service,
    /** A clean set of cutlery to go with a main, if there's one. */
    private readonly cutlery: () => string | null,
    /** A guest has left (dismissed). */
    private readonly left: (g: Guest, o: Outcome) => void,
    /** A word with a guest in the mood to talk: what they say. */
    private readonly talk: (g: Guest) => string,
    /** Settle up with a guest down from their room: why not, or null. */
    private readonly collect: (seat: Seat) => string | null,
    /** The inn's guest rooms. */
    private readonly rooms: () => RoomChoice[],
    private readonly content: Content,
    private readonly assets: Assets,
  ) {
    this.pane = 'seats';
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
    if (this.seats.every((s) => s.hearth)) return this.seats.filter(g).sort((a, b) => g(a)!.seated - g(b)!.seated); // by the hearth: just who's there
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
      // a step back: from the meal to the request, from the request (or rooms) to the guests, then out
      if (this.pane === 'ready') this.pane = 'slots';
      else if (this.pane === 'slots' || this.pane === 'rooms') this.pane = 'seats';
      else return false;
      return true;
    }
    const d = this.nav.step(input, dt);
    if (d) this.move(d);
    if (input.pressed('interact')) this.choose();
    if (input.pressed('cook') && this.pane === 'seats') this.dismiss();
    if (input.pressed('recipes')) this.chat();
    return true;
  }

  /** Have a word with the chosen guest, if they're in the mood. */
  private chat(): void {
    const g = this.guestAt(this.seat);
    if (!g?.chatty) return;
    this.speech = { text: `"${this.talk(g)}"`, until: this.time + TALK_TIME };
  }

  private move(d: { x: number; y: number }): void {
    if (this.pane === 'rooms') {
      if (d.y) this.room = Math.max(0, Math.min(this.rooms().length - 1, this.room + d.y));
      return;
    }
    if (this.pane === 'slots') {
      const g = this.guestAt(this.seat);
      if (g && d.x) this.slot = Math.max(0, Math.min(this.service.wants(g).length - 1, this.slot + d.x));
      return;
    }
    if (this.pane === 'ready') {
      if (d.y) this.readySel = Math.max(0, Math.min(READY_MAX - 1, this.readySel + d.y));
      return;
    }
    if (d.y) this.seat = Math.max(0, Math.min(this.rows().length - 1, this.seat + d.y));
  }

  private guestAt(row: number): Guest | undefined {
    const seat = this.rows()[row];
    return seat && this.service.guests.get(seat.key);
  }

  /**
   * A: the guest (or the dishes left at a seat); then which of their requests; then what in hand
   * to serve it with.
   */
  private choose(): void {
    const seat = this.rows()[this.seat];
    if (!seat) return;
    const g = this.service.guests.get(seat.key);
    if (this.pane === 'ready') {
      const r = this.service.ready[this.readySel];
      if (!r) return this.say(this.service.ready.length ? 'Nothing there' : 'Nothing in hand: plate something at the plating station');
      if (isSetting(r)) return this.say("Dirty dishes: they're for the wash station");
      if (g) this.place(seat.key, this.service.wants(g)[this.slot]);
      return;
    }
    if (!g && this.service.dirty.get(seat.key)?.length) return this.clear(seat, 0);
    if (g?.state === 'room') return this.chooseRoom(seat);
    if (g?.state === 'checkout') return this.settleUp(seat);
    if (g?.state === 'settled') return this.say(g.chatty ? "They've settled up, and would like a word" : "They've settled up");
    if (!g) return this.say('Nobody is sitting there');
    if (g.state === 'arriving') return this.say("They're still coming in");
    if (g.state !== 'waiting') return this.say(g.state === 'eating' ? "They're enjoying their meal" : "They're sitting back, content");
    if (this.pane === 'seats') {
      // their first request still to come
      const wants = this.service.wants(g);
      this.slot = Math.max(0, wants.findIndex((c) => !g.got[c]));
      this.pane = 'slots';
      return;
    }
    const c = this.service.wants(g)[this.slot];
    if (g.got[c]) return this.say(`They already have their ${c}`);
    if (!this.service.ready.some((r) => !isSetting(r))) return this.say('Nothing in hand: plate something at the plating station');
    // the first thing in hand of that course, if there is one
    const own = this.service.ready.findIndex((r) => !isSetting(r) && this.content.course(r.dish) === c);
    this.readySel = own >= 0 ? own : Math.max(0, this.service.ready.findIndex((r) => !isSetting(r)));
    this.pane = 'ready';
  }

  /** Take payment from a guest down from their room. */
  private settleUp(seat: Seat): void {
    const why = this.collect(seat);
    if (why) return this.say(why);
    const stay = [...this.service.visits].reverse().find((v) => v.seat === seat.key && v.stay);
    if (stay?.stay) this.say(`+${stay.stay.coins} coins. "${stay.stay.remark}"`);
  }

  /** A guest asking for a room: choosing one of the inn's, then giving it to them. */
  private chooseRoom(seat: Seat): void {
    const rooms = this.rooms();
    if (!rooms.length) return this.say('The inn has no guest rooms');
    if (this.pane !== 'rooms') {
      this.pane = 'rooms';
      this.room = Math.max(0, rooms.findIndex((r) => !r.why && !this.service.taken(r.id)));
      return;
    }
    const r = rooms[this.room];
    if (r.why) return this.say(r.why);
    const why = this.service.lodge(seat, r.id);
    if (why) return this.say(why);
    this.say(`${r.name} it is: "Goodnight!"`);
    this.pane = 'seats';
  }

  /** Serve what's chosen in hand into a guest's slot for a course; then their next request, if any. */
  private place(seatKey: string, c: Course): void {
    const dish = (this.service.ready[this.readySel] as { dish: string }).dish;
    const why = this.service.serve(this.readySel, seatKey, c, this.cutlery);
    if (why) return this.say(why);
    const p = this.rowAt(this.seat);
    this.pops.pop(p.x + LIST_W - 50, p.y + 20, this.time, { item: dish, text: 'Served!' });
    this.say(`Served ${this.content.itemName(dish)}`);
    this.readySel = 0;
    const g = this.service.guests.get(seatKey);
    const next = g?.state === 'waiting' ? this.service.wants(g).findIndex((w) => !g.got[w]) : -1;
    if (next >= 0) {
      this.slot = next;
      this.pane = 'slots';
    } else this.pane = 'seats';
  }

  /** Take one dirty dish from a seat into the ready slots (the seat's setting). */
  private clear(seat: Seat, i: number): void {
    const p = this.rowAt(this.rows().indexOf(seat));
    const res = this.service.clearOne(seat.key, i);
    if ('why' in res) return this.say(res.why);
    this.pops.pop(p.x + 46 + i * DISH + 8, p.y + 18, this.time, { item: res.item, text: 'Cleared' });
  }

  private dismiss(): void {
    const seat = this.rows()[this.seat];
    const g = seat && this.service.dismiss(seat, this.left);
    if (!g) return this.say('Nobody is sitting there');
    this.pane = 'seats';
    this.say(`"${g.outcome!.remark}"`);
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
    if (this.pane === 'rooms') {
      // a room clicked: chosen, and given
      const i = Math.floor((py - (this.y + TOP + 6)) / 30);
      if (i >= 0 && i < this.rooms().length && px >= this.x + 16 && px < this.x + W - SLOT - 32) {
        this.room = i;
        if (button === 0) this.choose();
      } else if (button === 2) this.pane = 'seats';
      return true;
    }
    const rows = this.rows();
    for (let i = 0; i < rows.length; i++) {
      const p = this.rowAt(i);
      if (px < p.x || px >= p.x + LIST_W || py < p.y || py >= p.y + ROW - 2) continue;
      if (this.seat !== i || button === 0) this.pane = 'seats';
      this.seat = i;
      const seat = rows[i];
      const pile = !this.service.guests.has(seat.key) ? this.service.dirty.get(seat.key) : undefined;
      if (pile?.length && button === 0) {
        // the dish clicked on
        const k = Math.floor((px - (p.x + 46)) / DISH);
        if (k >= 0 && k < pile.length) this.clear(seat, k);
        return true;
      }
      // a guest's request, clicked: chosen (then what's in hand to serve it with)
      const g = this.service.guests.get(seat.key);
      if (g?.state === 'waiting' && button === 0) {
        const wants = this.service.wants(g);
        const k = wants.findIndex((_, j) => {
          const sx = p.x + LIST_W - 4 - (wants.length - j) * (SLOT + 2);
          return px >= sx && px < sx + SLOT;
        });
        if (k >= 0) {
          this.slot = k;
          this.pane = 'slots';
          this.choose();
          return true;
        }
      }
      if (button === 0) this.choose();
      if (button === 2) this.dismiss();
      return true;
    }
    for (let i = 0; i < READY_MAX; i++) {
      const p = this.readySlot(i);
      if (px < p.x || py < p.y || px >= p.x + SLOT || py >= p.y + SLOT) continue;
      if (this.pane !== 'ready') return true; // a guest's request first
      this.readySel = i;
      if (button === 0) this.choose();
      return true;
    }
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  /** A guest's row: who, their patience, a slot per course they want (the chosen one outlined, when placing). */
  private drawGuest(r: Renderer, g: Guest, p: { x: number; y: number }, placing: number | null): void {
    const { assets, content, service } = this;
    r.sprite(`${g.look}_down_idle`, p.x + 2, p.y + 4);
    drawText(r, assets, content.folk[g.folk]?.name ?? g.folk, p.x + 38, p.y + 6);
    if (g.state === 'room') {
      // asking for a room: their patience, and what they'd like in it
      this.drawChits(r, g, p);
      const wants = g.room!.wants.map((w) => content.rooms.comforts[w].want);
      r.ctx.globalAlpha = 0.85;
      wrap(`Wants a room${wants.length ? `, with ${wants.join(', ')}` : ''}`, LIST_W - 110).slice(0, 2)
        .forEach((line, k) => drawText(r, assets, line, p.x + 104, p.y + 6 + k * 11));
      r.ctx.globalAlpha = 1;
      return;
    }
    if (g.state === 'checkout' || g.state === 'settled') {
      r.ctx.globalAlpha = 0.85;
      drawText(r, assets, g.state === 'checkout' ? 'Ready to settle up for the night' : 'Settled up', p.x + 104, p.y + 6);
      r.ctx.globalAlpha = 1;
      if (g.state === 'checkout') this.drawChits(r, g, p);
      this.drawChatty(r, g, p);
      return;
    }
    if (g.state === 'eating' || g.state === 'relaxing' || g.state === 'arriving') {
      r.ctx.globalAlpha = 0.7;
      const doing = { eating: 'Enjoying their meal', relaxing: 'Sitting back, content', arriving: 'Coming in...' }[g.state];
      drawText(r, assets, doing, p.x + 38, p.y + 22);
      r.ctx.globalAlpha = 1;
    } else this.drawChits(r, g, p);
    this.drawChatty(r, g, p);
    const wants = service.wants(g);
    wants.forEach((c, k) => {
      const sx = p.x + LIST_W - 4 - (wants.length - k) * (SLOT + 2);
      drawSlot(r, sx, p.y + 3, placing === k);
      const got = g.got[c];
      const w = g.order[c]!;
      if (got) drawItem(r, assets, content, got.dish, sx, p.y + 3);
      else if (w.dish) drawItem(r, assets, content, w.dish, sx, p.y + 3, 1, true);
      else {
        // the course's icon, and beside it the kind they'd like; or the icon alone, for anything
        if (w.trait) {
          drawTag(r, c, sx + 3, p.y + 6);
          drawTag(r, w.trait, sx + SLOT - TAG_SIZE - 3, p.y + 6);
        } else drawTag(r, c, sx + Math.round((SLOT - TAG_SIZE) / 2), p.y + 6);
        r.ctx.globalAlpha = 0.75;
        const label = w.trait ?? 'any';
        drawText(r, assets, label, sx + Math.round((SLOT - measure(label)) / 2), p.y + 21);
        r.ctx.globalAlpha = 1;
      }
    });
  }

  /** In the mood to talk: the talk button, by their name. */
  private drawChatty(r: Renderer, g: Guest, p: { x: number; y: number }): void {
    if (!g.chatty) return;
    const glyph = this.device === 'gamepad' ? 'xb_y' : 'key_r';
    const bob = Math.floor(this.time * 2) % 2;
    const x = p.x + 38 + measure(this.content.folk[g.folk]?.name ?? g.folk) + 6;
    r.sprite(glyph, x, p.y + 2 - bob);
  }

  /** A waiting guest's patience: a row of chits, marked off one at a time. */
  private drawChits(r: Renderer, g: Guest, p: { x: number; y: number }): void {
    const left = this.service.chits(g);
    for (let c = 0; c < CHITS; c++) {
      const cx = p.x + 38 + c * 6;
      const cy = p.y + 23;
      r.rect(cx, cy, 5, 5, '#45283c', true);
      r.rect(cx + 1, cy + 1, 3, 3, c < left ? '#df7126' : '#eec39a', true);
    }
  }

  /** Giving a room: the inn's rooms, each ready or not, with the comforts the guest wants ticked off. */
  private drawRooms(r: Renderer, g: Guest): void {
    const { assets, content } = this;
    const x = this.x + 16;
    const y = this.y + TOP + 6;
    const w = W - SLOT - 48;
    const rooms = this.rooms();
    r.nine('panel_dark', x - 6, y - 6, w + 12, 16 + rooms.length * 30);
    rooms.forEach((room, i) => {
      const ry = y + i * 30;
      r.nine(i === this.room ? 'slot_selected' : 'slot', x, ry, w, 28);
      const taken = this.service.taken(room.id);
      drawText(r, assets, room.name, x + 6, ry + 4);
      r.ctx.globalAlpha = 0.85;
      drawText(r, assets, taken ? 'Someone is staying here' : room.why ?? 'Ready', x + 6, ry + 15);
      r.ctx.globalAlpha = 1;
      let cx = x + 150;
      for (const want of g.room!.wants) {
        const ok = room.has(want);
        const t = `${ok ? '+' : '-'} ${content.rooms.comforts[want].want}`;
        r.ctx.globalAlpha = ok ? 1 : 0.5;
        drawText(r, assets, t, cx, ry + 9);
        r.ctx.globalAlpha = 1;
        cx += measure(t) + 10;
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
      drawText(r, assets, this.seats.some((s) => s.hearth) ? 'Nobody waiting by the hearth' : 'No seats here yet', this.x + 12, this.y + TOP + 4);
      r.ctx.globalAlpha = 1;
    }
    rows.forEach((seat, i) => {
      const p = this.rowAt(i);
      r.nine(this.pane === 'seats' && i === this.seat ? 'slot_selected' : 'slot', p.x, p.y, LIST_W, ROW - 2);
      const g = service.guests.get(seat.key);
      const pile = service.dirty.get(seat.key);
      if (g) this.drawGuest(r, g, p, (this.pane === 'slots' || this.pane === 'ready') && i === this.seat ? this.slot : null);
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
    // placing: how what's picked fits the chosen slot; else what the chosen guest wants, in words
    const chosen = rows[this.seat] && service.guests.get(rows[this.seat].key);
    const inHand = this.pane === 'ready' ? service.ready[this.readySel] : undefined;
    if (chosen && inHand && !isSetting(inHand)) {
      const c = service.wants(chosen)[this.slot];
      const dish = inHand.dish;
      const fit = service.fit(chosen, c, dish);
      const says = fit === 'right' ? `Their ${c}: just right` : fit === 'not asked' ? `Their ${c}: not what they asked for` : `Their ${c}: but it's not a ${c}!`;
      r.ctx.globalAlpha = 0.9;
      drawText(r, assets, says, this.x + 20 + measure(this.title), this.y + 10);
      r.ctx.globalAlpha = 1;
    } else if (chosen && this.pane === 'slots' && chosen.state === 'waiting') {
      const c = service.wants(chosen)[this.slot];
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, `Their ${COURSE_NAMES[c]}: ${service.describe(c, chosen.order[c]!)}`, this.x + 20 + measure(this.title), this.y + 10);
      r.ctx.globalAlpha = 1;
    } else if (chosen && ['room', 'checkout', 'settled'].includes(chosen.state) && this.pane === 'seats') {
      const says = chosen.state === 'room' ? 'Wants a room for the night' : chosen.state === 'checkout' ? 'Down from their room, to settle up' : 'All settled';
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, says, this.x + 20 + measure(this.title), this.y + 10);
      r.ctx.globalAlpha = 1;
    } else if (chosen && this.pane === 'seats') {
      const want = service.wants(chosen).map((c) => service.describe(c, chosen.order[c]!)).join(', ');
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, `Wants ${want}`, this.x + 20 + measure(this.title), this.y + 10);
      r.ctx.globalAlpha = 1;
    }

    // what's ready at the plating station
    const label = 'In hand';
    drawText(r, assets, label, this.readySlot(0).x + (SLOT - measure(label)) / 2, this.y + TOP - 8);
    for (let i = 0; i < READY_MAX; i++) {
      const p = this.readySlot(i);
      drawSlot(r, p.x, p.y, this.pane === 'ready' && i === this.readySel);
      drawReady(r, assets, content, service.ready[i], p.x, p.y);
    }
    const sel = this.pane === 'ready' && !chosen ? service.ready[this.readySel] : undefined;
    if (sel) {
      // what's chosen, in the header: what it is and which course
      const name = isSetting(sel) ? 'Dirty dishes, for the wash station' : `${content.itemName(sel.dish)}, a ${COURSE_NAMES[content.course(sel.dish)]}`;
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, name, this.x + 20 + measure(this.title), this.y + 10);
      r.ctx.globalAlpha = 1;
    }

    if (this.time < this.speech.until && this.pane !== 'rooms') {
      // what the guest said, over the list
      const lines = wrap(this.speech.text, LIST_W - 24).slice(0, 3);
      const bx = this.x + 16;
      const by = this.y + H - 30 - lines.length * 11;
      r.nine('panel_dark', bx, by - 6, LIST_W - 12, lines.length * 11 + 10);
      lines.forEach((line, k) => drawText(r, assets, line, bx + 6, by + k * 11));
    }
    if (this.pane === 'rooms' && chosen?.state === 'room') this.drawRooms(r, chosen);

    const msg = this.time < this.message.until;
    const seat = rows[this.seat];
    const onDirty = seat && !service.guests.has(seat.key) && !!service.dirty.get(seat.key)?.length;
    const help = msg ? this.message.text
      : this.pane === 'rooms' ? hint(this.device, [['interact', 'give them this room'], ['back', 'not yet']])
      : chosen?.state === 'room' && this.pane === 'seats' ? hint(this.device, [['interact', 'give a room'], ['cook', 'no room'], ['back', 'leave']])
      : chosen?.state === 'checkout' && this.pane === 'seats' ? hint(this.device, [['interact', 'settle up'], ['back', 'leave']])
      : this.pane === 'ready' ? hint(this.device, [['interact', 'serve this'], ['back', 'another request']])
      : this.pane === 'slots' ? `${hint(this.device, [['interact', 'serve this request'], ['back', 'another guest']])}   Left / right: request`
      : onDirty && this.pane === 'seats' ? hint(this.device, [['interact', 'clear a dish'], ['back', 'leave']])
      : hint(this.device, [['interact', 'choose'], ['cook', 'dismiss'], ['back', 'leave']]);
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, help, this.x + 12, this.y + H - 16);
    r.ctx.globalAlpha = 1;
    this.pops.draw(r, assets, content, this.time);
  }
}
