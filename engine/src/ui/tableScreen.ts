/**
 * Serving a table. Left: its seats, each with who's sitting there and what they ordered (a dish and/or
 * a drink; what's been brought shows as served). Right: the tray you're carrying, one row per meal.
 * Choose a meal on the tray, then the seat to serve it to: everything in it must be what that guest is
 * still waiting for (cutlery goes with an ordered dish). Once they have all they ordered they eat, pay
 * and leave, and what they ate from is left dirty on the table: X clears it into your bag.
 * B / Esc puts down a chosen meal, or leaves.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Seat } from '../game/seating';
import { TRAY_MEALS, type Guest, type Service, type Tray } from '../state/service';
import { drawItem, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText, measure } from './text';
import { drawTrayGrid, TRAY_COLS, trayCell } from './trayGrid';

const W = 464;
const H = 240;
const ROW = 40;
const LIST_W = 250;
const TOP = 44;

export class TableScreen implements Screen {
  private pane: 'tray' | 'seats';
  private seat = 0;
  private cell = { row: 0, col: 0 };
  /** The meal (tray row) chosen to serve. */
  private picked: number | null = null;
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;

  constructor(
    private readonly table: string,
    private readonly seats: Seat[],
    private readonly service: Service,
    private readonly tray: Tray | undefined,
    /** Put a dirty piece in the bag; false if it doesn't fit. */
    private readonly toBag: (item: string) => boolean,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {
    this.pane = tray?.meals.length ? 'tray' : 'seats';
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
    if (input.pressed('back') || input.pressed('menu')) {
      if (this.picked === null) return false;
      this.picked = null;
      this.pane = 'tray';
      return true;
    }
    const d = this.nav.step(input, dt);
    if (d) this.move(d);
    if (input.pressed('interact')) this.choose();
    if (input.pressed('cook')) this.clear();
    return true;
  }

  private move(d: { x: number; y: number }): void {
    if (this.pane === 'seats') {
      if (d.x > 0 && this.tray) {
        this.pane = 'tray';
        return;
      }
      if (d.y) this.seat = Math.max(0, Math.min(this.seats.length - 1, this.seat + d.y));
      return;
    }
    if (d.x < 0 && this.cell.col === 0) {
      this.pane = 'seats';
      return;
    }
    this.cell = {
      row: Math.max(0, Math.min(TRAY_MEALS - 1, this.cell.row + d.y)),
      col: Math.max(0, Math.min(TRAY_COLS - 1, this.cell.col + d.x)),
    };
  }

  private choose(): void {
    if (this.pane === 'tray') {
      if (!this.tray?.meals[this.cell.row]) return this.say('Nothing there');
      this.picked = this.cell.row;
      this.pane = 'seats';
      this.say('Now choose who to serve it to');
      return;
    }
    if (this.picked === null) return this.say(this.tray ? 'Choose a meal on your tray first' : 'Bring a serving tray to serve');
    const seat = this.seats[this.seat];
    if (!seat || !this.tray) return;
    const why = this.service.serve(this.tray, this.picked, seat.key);
    if (why) return this.say(why);
    this.say('Served!');
    this.picked = null;
    this.pane = this.tray.meals.length ? 'tray' : 'seats';
    this.cell = { row: 0, col: 0 };
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
    return { x: this.x + 10, y: this.y + TOP - 12 + i * ROW };
  }

  private get gridX(): number {
    return this.x + W - 12 - TRAY_COLS * (SLOT + 2);
  }

  pointer(px: number, py: number, button: number): boolean {
    for (let i = 0; i < this.seats.length; i++) {
      const p = this.rowAt(i);
      if (px >= p.x && px < p.x + LIST_W && py >= p.y && py < p.y + ROW - 2) {
        this.pane = 'seats';
        this.seat = i;
        if (button === 0) this.choose();
        return true;
      }
    }
    if (this.tray) {
      for (let row = 0; row < TRAY_MEALS; row++) {
        for (let col = 0; col < TRAY_COLS; col++) {
          const p = trayCell(this.gridX, this.y + TOP, row, col);
          if (px < p.x || py < p.y || px >= p.x + SLOT || py >= p.y + SLOT) continue;
          this.pane = 'tray';
          this.cell = { row, col };
          if (button === 0) this.choose();
          return true;
        }
      }
    }
    if (button === 2) this.clear();
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  draw(r: Renderer): void {
    const { assets, content } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, 'Table', this.x + 12, this.y + 10);

    if (!this.seats.length) {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'No chairs at this table yet', this.x + 12, this.y + TOP);
      r.ctx.globalAlpha = 1;
    }
    this.seats.forEach((_, i) => {
      const p = this.rowAt(i);
      const g = this.guest(i);
      r.nine(this.pane === 'seats' && i === this.seat ? 'slot_selected' : 'slot', p.x, p.y, LIST_W, ROW - 2);
      if (!g) {
        r.ctx.globalAlpha = 0.6;
        drawText(r, assets, 'Empty seat', p.x + 38, p.y + 13);
        r.ctx.globalAlpha = 1;
        return;
      }
      r.sprite(`${g.look}_down_idle`, p.x + 2, p.y + 3);
      drawText(r, assets, content.folk[g.folk]?.name ?? g.folk, p.x + 38, p.y + 7);
      const status = g.state === 'eating' ? 'Eating' : 'Waiting';
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, status, p.x + 38, p.y + 21);
      r.ctx.globalAlpha = 1;
      // the order: each thing, dimmed once it's been brought
      let ox = p.x + LIST_W - 4;
      for (const part of ['drink', 'food'] as const) {
        const dish = g.order[part];
        if (!dish) continue;
        ox -= SLOT + 2;
        drawSlot(r, ox, p.y + 1, false);
        drawItem(r, assets, content, dish, ox, p.y + 1, 1, !!g.got[part]);
      }
    });
    // what the chosen guest ordered, by name
    const g = this.guest(this.seat);
    if (g && this.pane === 'seats') {
      const want = [g.order.food, g.order.drink].filter((d): d is string => !!d).map((d) => content.itemName(d)).join(' and ');
      drawText(r, assets, `Ordered ${want}`, this.x + 12, this.y + H - 44);
    }

    if (this.tray) {
      drawTrayGrid(r, assets, content, this.tray, this.gridX, this.y + TOP, this.pane === 'tray' ? this.cell : null, this.picked);
    } else {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'Bring a serving tray', this.gridX - 20, this.y + TOP + 10);
      r.ctx.globalAlpha = 1;
    }

    // what's been left dirty here
    const dirty = this.service.dirty.get(this.table) ?? [];
    if (dirty.length) {
      const label = 'Left on the table:';
      drawText(r, assets, label, this.x + 12, this.y + H - 30);
      dirty.slice(0, 12).forEach((item, i) => {
        const { sheet, frame } = content.item(item).sprite;
        r.sprite(`${sheet}/${frame}`, this.x + 16 + measure(label) + i * 16, this.y + H - 40);
      });
    }
    const msg = this.time < this.message.until;
    const hint = msg ? this.message.text
      : this.picked !== null ? 'Choose who to serve   B: put it back'
      : dirty.length ? 'Choose a meal, then a seat   X: clear the table'
      : 'Choose a meal, then a seat';
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, hint, this.x + 12, this.y + H - 16);
    r.ctx.globalAlpha = 1;
  }
}
