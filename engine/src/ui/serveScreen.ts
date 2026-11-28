/**
 * Loading serving trays at the counter. Left: every dish you have the components for, and cutlery
 * (like a shop's shelf). Right: the tray, one row per meal (dish, drink, cutlery); LB / RB (Q / C) or a
 * click switch between the trays on the counter. Choosing a dish plates it onto the tray, into the first
 * meal still without one of its kind; it takes the dish's components and a clean plate (a mug for a
 * drink; a bowl if there are no plates). Choosing something on the tray takes it back off (unplated: its
 * components and what it was on go back to the stores). Right from the list crosses to the tray, left
 * from the tray's first column back; B / Esc leave. The trays stay on the counter, loaded, to be picked
 * up and carried to the tables.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Blocker, Kitchen } from '../state/kitchen';
import { PARTS, TRAY_MEALS, type Tray } from '../state/service';
import { drawItem, drawItemInfo, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText } from './text';
import { drawTrayGrid, TRAY_COLS, trayCell } from './trayGrid';

const W = 464;
const H = 240;
const ROW = 36;
const ROWS = 5;
const LIST_W = 200;
const TOP = 44;

/** A line on the list: a dish to plate, or cutlery to lay. */
interface Line { item: string; cutlery: boolean; blocked: Blocker }

export class ServeScreen implements Screen {
  private pane: 'list' | 'tray' = 'list';
  private sel = 0;
  private scroll = 0;
  private cell = { row: 0, col: 0 };
  private lines: Line[] = [];
  private tray: number; // index into the trays on the counter
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;

  /** trays: those on the counter; first: which to show first. changed: tell the world to redraw them. */
  constructor(
    private readonly trays: Tray[],
    first: Tray | undefined,
    private readonly kitchen: Kitchen,
    private readonly changed: () => void,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {
    this.tray = Math.max(0, first ? trays.indexOf(first) : 0);
    this.refresh();
  }

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  private get current(): Tray | undefined {
    return this.trays[this.tray];
  }

  private refresh(): void {
    const k = this.kitchen;
    const t = this.current;
    const keep = this.lines[this.sel]?.item;
    this.lines = t ? k.plateable().map((d) => ({ item: d, cutlery: false, blocked: k.canPlate(d, t) })) : [];
    const set = k.cutlery();
    if (t && set) this.lines.push({ item: set, cutlery: true, blocked: t.freeMeal('cutlery') < 0 ? `The tray is full (${TRAY_MEALS} meals)` : null });
    const i = keep ? this.lines.findIndex((l) => l.item === keep) : -1;
    this.sel = Math.max(0, Math.min(i >= 0 ? i : this.sel, this.lines.length - 1));
    this.keepVisible();
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    if (input.pressed('back') || input.pressed('menu')) return false;
    if (input.pressed('tab_prev')) this.switchTray(-1);
    if (input.pressed('tab_next')) this.switchTray(1);
    const d = this.nav.step(input, dt);
    if (d) this.move(d);
    if (input.pressed('interact')) this.choose();
    return true;
  }

  private switchTray(d: number): void {
    if (this.trays.length < 2) return;
    this.tray = (this.tray + d + this.trays.length) % this.trays.length;
    this.refresh();
  }

  private move(d: { x: number; y: number }): void {
    if (this.pane === 'list') {
      if (d.x > 0) {
        this.pane = 'tray';
        this.cell = { row: Math.min(TRAY_MEALS - 1, Math.max(0, this.sel - this.scroll)), col: 0 };
        return;
      }
      if (d.y) this.sel = Math.max(0, Math.min(this.lines.length - 1, this.sel + d.y));
      this.keepVisible();
      return;
    }
    if (d.x < 0 && this.cell.col === 0) {
      this.pane = 'list';
      return;
    }
    this.cell = {
      row: Math.max(0, Math.min(TRAY_MEALS - 1, this.cell.row + d.y)),
      col: Math.max(0, Math.min(TRAY_COLS - 1, this.cell.col + d.x)),
    };
  }

  private keepVisible(): void {
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + ROWS) this.scroll = this.sel - ROWS + 1;
  }

  private choose(): void {
    const t = this.current;
    if (!t) return;
    if (this.pane === 'tray') {
      const why = this.kitchen.takeOff(t, this.cell.row, PARTS[this.cell.col]);
      if (why) this.say(why);
    } else {
      const line = this.lines[this.sel];
      if (!line) return;
      const why = line.cutlery ? this.kitchen.addCutlery(t) : this.kitchen.plate(line.item, t);
      this.say(why ?? `${line.cutlery ? 'Laid' : 'Plated'} ${this.content.itemName(line.item)}`);
    }
    this.changed();
    this.refresh();
  }

  private say(text: string): void {
    this.message = { text, until: this.time + 2 };
  }

  private rowAt(i: number): { x: number; y: number } {
    return { x: this.x + 10, y: this.y + TOP - 12 + (i - this.scroll) * ROW };
  }

  private get gridX(): number {
    return this.x + W - 12 - TRAY_COLS * (SLOT + 2);
  }

  private tabAt(i: number): { x: number; y: number; w: number } {
    return { x: this.gridX + i * 54, y: this.y + 6, w: 50 };
  }

  pointer(px: number, py: number, button: number): boolean {
    this.trays.forEach((_, i) => {
      const t = this.tabAt(i);
      if (button === 0 && px >= t.x && px < t.x + t.w && py >= t.y && py < t.y + 18 && i !== this.tray) {
        this.tray = i;
        this.refresh();
      }
    });
    for (let i = this.scroll; i < Math.min(this.lines.length, this.scroll + ROWS); i++) {
      const p = this.rowAt(i);
      if (px >= p.x && px < p.x + LIST_W && py >= p.y && py < p.y + ROW - 2) {
        this.pane = 'list';
        this.sel = i;
        if (button === 0) this.choose();
        return true;
      }
    }
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
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  draw(r: Renderer): void {
    const { assets, content } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, 'Serving counter', this.x + 12, this.y + 10);
    this.trays.forEach((t, i) => {
      const p = this.tabAt(i);
      r.nine(i === this.tray ? 'slot_selected' : 'slot', p.x, p.y, p.w, 18);
      drawText(r, assets, `Tray ${t.id + 1}`, p.x + 6, p.y + 4);
    });
    const t = this.current;
    if (!t) {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'No serving tray on the counter: bring one back here', this.x + 12, this.y + 40);
      r.ctx.globalAlpha = 1;
      return;
    }

    if (!this.lines.length) {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'Nothing to plate: prep some food first', this.x + 12, this.rowAt(0).y + 8);
      r.ctx.globalAlpha = 1;
    }
    for (let i = this.scroll; i < Math.min(this.lines.length, this.scroll + ROWS); i++) {
      const line = this.lines[i];
      const p = this.rowAt(i);
      r.nine(this.pane === 'list' && i === this.sel ? 'slot_selected' : 'slot', p.x, p.y, LIST_W, ROW - 2);
      drawItem(r, assets, content, line.item, p.x, p.y, 1, !!line.blocked);
      if (line.blocked) r.ctx.globalAlpha = 0.6;
      drawText(r, assets, line.cutlery ? 'Cutlery' : content.itemName(line.item), p.x + 38, p.y + 6);
      drawText(r, assets, line.blocked ?? (line.cutlery ? 'Lay a set' : 'Ready to plate'), p.x + 38, p.y + 19);
      r.ctx.globalAlpha = 1;
    }
    if (this.scroll > 0) r.sprite('arrow_up', this.x + LIST_W - 8, this.rowAt(this.scroll).y - 10);
    if (this.scroll + ROWS < this.lines.length) r.sprite('arrow_down', this.x + LIST_W - 8, this.rowAt(this.scroll + ROWS).y - 4);

    // what's chosen on the list, between the list and the tray
    const line = this.lines[this.sel];
    if (this.pane === 'list' && line && !line.cutlery) {
      const ix = this.x + LIST_W + 18;
      let iy = this.y + TOP;
      iy += drawItemInfo(r, assets, content, line.item, ix, iy) + 4;
      const ware = this.kitchen.ware(line.item);
      drawText(r, assets, ware ? `On a ${content.itemName(ware).toLowerCase()}` : 'Nothing clean', ix, iy);
    }

    drawTrayGrid(r, assets, content, t, this.gridX, this.y + TOP, this.pane === 'tray' ? this.cell : null);
    const msg = this.time < this.message.until;
    const hint = msg ? this.message.text : this.pane === 'list' ? 'Choose: put on the tray   LB / RB: other tray' : 'Choose: take it back off';
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, hint, this.x + 12, this.y + H - 18);
    r.ctx.globalAlpha = 1;
  }
}
