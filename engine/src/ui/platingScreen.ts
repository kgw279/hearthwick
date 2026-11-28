/**
 * The plating station: making dishes and loading the serving trays that rest on it.
 *  - Left: the ingredients to hand (the inn's stores and the bag) that go into some dish, and clean
 *    cutlery.
 *  - Middle: the plate being made up. Put ingredients on it; what dish they make shows only once they're
 *    exactly a dish's components (a dish of venison and honey glaze...). Making it takes a clean plate
 *    (a mug for a drink; a bowl if there are no plates) and puts it on the tray, in the first meal
 *    without a dish (or drink) yet. The plate stays made up, so it can be made again.
 *  - Right: the serving tray, one row per meal (dish, drink, cutlery); LB / RB switch trays. Choosing
 *    cutlery on the left lays a set straight onto the tray.
 * Controls as at the prep stations: A (E, click) puts on; B (Esc, right-click) takes off (on the tray:
 * takes it back off the tray, unplated back to the stores); RT (X key, click the dish) makes the dish;
 * Y (R) clears the plate; X (F) leaves.
 */
import type { Assets } from '../core/assets';
import type { Device, Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Stack } from '../state/inventory';
import type { Kitchen } from '../state/kitchen';
import { PARTS, TRAY_MEALS, type Tray } from '../state/service';
import { hint } from './buttons';
import { drawItem, drawSlot, SLOT } from './items';
import { gridMove } from './inventoryScreen';
import { Nav, type Screen } from './screen';
import { drawText, measure, wrap } from './text';
import { drawTrayGrid, TRAY_COLS, trayCell } from './trayGrid';

const W = 464;
const H = 248;
const COLS = 4;
const ROWS = 5;
const TOP = 44;
const PAD = 12;

type Pane = 'grid' | 'plate' | 'tray';

export class PlatingScreen implements Screen {
  private pane: Pane = 'grid';
  private sel = 0;
  private scroll = 0;
  private plateSel = 0;
  private cell = { row: 0, col: 0 };
  /** What's on the plate being made up, in order. */
  private plate: string[] = [];
  private tray: number;
  private readonly size: number;
  private readonly usable: Set<string>;
  private readonly cutlery: Set<string>;
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;
  private device: Device = 'keyboard';

  /** trays: those resting on this station; first: which to show first. changed: tell the world to redraw. */
  constructor(
    private readonly trays: Tray[],
    first: Tray | undefined,
    private readonly kitchen: Kitchen,
    private readonly changed: () => void,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {
    this.tray = Math.max(0, first ? trays.indexOf(first) : 0);
    this.size = content.mostComponents();
    this.usable = content.dishComponents();
    this.cutlery = new Set(Object.keys(content.items).filter((i) => content.items[i].tableware?.kind === 'cutlery' && !content.items[i].washes_to));
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

  /** Ingredients to hand that go into some dish (with how many are left off the plate), then cutlery. */
  private stock(): Stack[] {
    const left = (item: string) => this.kitchen.have(item) - this.plate.filter((p) => p === item).length;
    const food = [...this.usable]
      .map((item) => ({ item, count: left(item) }))
      .filter((s) => s.count > 0 || this.plate.includes(s.item))
      .sort((a, b) => this.content.itemName(a.item).localeCompare(this.content.itemName(b.item)));
    const sets = [...this.cutlery].map((item) => ({ item, count: this.kitchen.have(item) })).filter((s) => s.count > 0);
    return [...food, ...sets];
  }

  private dish(): string | undefined {
    return this.plate.length ? this.content.dishFor(this.plate) : undefined;
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    this.device = input.device;
    if (input.pressed('cook') || input.pressed('menu')) return false;
    if (input.pressed('tab_prev')) this.switchTray(-1);
    if (input.pressed('tab_next')) this.switchTray(1);
    const d = this.nav.step(input, dt);
    if (d) this.move(d);
    if (input.pressed('interact')) this.add();
    if (input.pressed('back')) this.takeOff();
    if (input.pressed('cat_next')) this.make();
    if (input.pressed('recipes')) this.plate = [];
    return true;
  }

  private switchTray(d: number): void {
    if (this.trays.length > 1) this.tray = (this.tray + d + this.trays.length) % this.trays.length;
  }

  private move(d: { x: number; y: number }): void {
    if (this.pane === 'grid') {
      const n = this.stock().length;
      if (d.x > 0 && (this.sel % COLS === COLS - 1 || this.sel + 1 >= n)) {
        this.pane = 'plate';
        this.plateSel = 0;
        return;
      }
      if (!n) return;
      this.sel = gridMove(this.sel, d, COLS, n);
      const row = Math.floor(this.sel / COLS);
      if (row < this.scroll) this.scroll = row;
      if (row >= this.scroll + ROWS) this.scroll = row - ROWS + 1;
      return;
    }
    if (this.pane === 'plate') {
      if (d.x < 0 && this.plateSel === 0) this.pane = 'grid';
      else if (d.x > 0 && this.plateSel === this.size - 1) {
        this.pane = 'tray';
        this.cell = { row: 0, col: 0 };
      } else if (d.x) this.plateSel = Math.max(0, Math.min(this.size - 1, this.plateSel + d.x));
      return;
    }
    if (d.x < 0 && this.cell.col === 0) {
      this.pane = 'plate';
      this.plateSel = this.size - 1;
      return;
    }
    this.cell = {
      row: Math.max(0, Math.min(TRAY_MEALS - 1, this.cell.row + d.y)),
      col: Math.max(0, Math.min(TRAY_COLS - 1, this.cell.col + d.x)),
    };
  }

  /** Put the chosen ingredient on the plate (cutlery goes straight onto the tray). */
  private add(): void {
    if (this.pane !== 'grid') return;
    const s = this.stock()[this.sel];
    if (!s) return;
    if (this.cutlery.has(s.item)) {
      const t = this.current;
      if (!t) return this.say('No serving tray here');
      this.say(this.kitchen.addCutlery(t) ?? 'Laid a set of cutlery');
      this.changed();
      return;
    }
    if (s.count <= 0) return this.say(`No more ${this.content.itemName(s.item)}`);
    if (this.plate.length >= this.size) return this.say('The plate is full: take something off first');
    this.plate.push(s.item);
    this.keepSelection();
  }

  /** Take one of the chosen ingredient off the plate; on the plate, the chosen one; on the tray, what's chosen there. */
  private takeOff(): void {
    if (this.pane === 'tray') {
      const t = this.current;
      if (!t) return;
      const why = this.kitchen.takeOff(t, this.cell.row, PARTS[this.cell.col]);
      if (why) this.say(why);
      this.changed();
      return;
    }
    if (this.pane === 'plate') {
      if (this.plateSel < this.plate.length) this.plate.splice(this.plateSel, 1);
      return;
    }
    const s = this.stock()[this.sel];
    const i = s ? this.plate.lastIndexOf(s.item) : -1;
    if (i >= 0) this.plate.splice(i, 1);
  }

  /** Plate the dish onto the tray. */
  private make(): void {
    const dish = this.dish();
    const t = this.current;
    if (!t) return this.say('No serving tray here: bring one back');
    if (!dish) return this.say(this.plate.length ? "That isn't a dish" : 'Put some ingredients on the plate first');
    const why = this.kitchen.plate(dish, t);
    this.say(why ?? `${this.content.itemName(dish)} is on the tray`);
    this.changed();
    this.keepSelection();
  }

  private keepSelection(): void {
    this.sel = Math.min(this.sel, Math.max(0, this.stock().length - 1));
  }

  private say(text: string): void {
    this.message = { text, until: this.time + 2 };
  }

  private cellAt(i: number): { x: number; y: number } {
    return { x: this.x + PAD + (i % COLS) * (SLOT + 2), y: this.y + TOP + (Math.floor(i / COLS) - this.scroll) * (SLOT + 2) };
  }

  private get midX(): number {
    return this.x + PAD + COLS * (SLOT + 2) + 14;
  }

  private plateSlot(i: number): { x: number; y: number } {
    return { x: this.midX + i * (SLOT + 2), y: this.y + TOP };
  }

  private resultSlot(): { x: number; y: number } {
    return { x: this.midX, y: this.y + TOP + SLOT + 22 };
  }

  private get gridX(): number {
    return this.x + W - PAD - TRAY_COLS * (SLOT + 2) + 2;
  }

  private tabAt(i: number): { x: number; y: number; w: number } {
    return { x: this.gridX + i * 54, y: this.y + 6, w: 50 };
  }

  pointer(px: number, py: number, button: number): boolean {
    const hit = (p: { x: number; y: number }) => px >= p.x && py >= p.y && px < p.x + SLOT && py < p.y + SLOT;
    this.trays.forEach((_, i) => {
      const t = this.tabAt(i);
      if (button === 0 && px >= t.x && px < t.x + t.w && py >= t.y && py < t.y + 18) this.tray = i;
    });
    const n = this.stock().length;
    for (let i = this.scroll * COLS; i < Math.min(n, (this.scroll + ROWS) * COLS); i++) {
      if (!hit(this.cellAt(i))) continue;
      this.pane = 'grid';
      this.sel = i;
      if (button === 0) this.add();
      if (button === 2) this.takeOff();
      return true;
    }
    for (let i = 0; i < this.size; i++) {
      if (!hit(this.plateSlot(i))) continue;
      this.pane = 'plate';
      this.plateSel = i;
      if (button >= 0) this.takeOff();
      return true;
    }
    if (hit(this.resultSlot())) {
      if (button === 0) this.make();
      return true;
    }
    for (let row = 0; row < TRAY_MEALS; row++) {
      for (let col = 0; col < TRAY_COLS; col++) {
        if (!hit(trayCell(this.gridX, this.y + TOP, row, col))) continue;
        this.pane = 'tray';
        this.cell = { row, col };
        if (button >= 0) this.takeOff();
        return true;
      }
    }
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  draw(r: Renderer): void {
    const { assets, content, kitchen } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, content.stations.plate?.name ?? 'Plating station', this.x + PAD, this.y + 10);

    // the ingredients (and cutlery) to hand
    const stock = this.stock();
    drawText(r, assets, 'To hand', this.x + PAD, this.y + TOP - 12);
    for (let i = this.scroll * COLS; i < (this.scroll + ROWS) * COLS; i++) {
      const p = this.cellAt(i);
      drawSlot(r, p.x, p.y, this.pane === 'grid' && i === this.sel && i < stock.length);
      const s = stock[i];
      if (s) drawItem(r, assets, content, s.item, p.x, p.y, s.count, s.count <= 0);
    }
    const gridR = this.x + PAD + COLS * (SLOT + 2);
    if (this.scroll > 0) r.sprite('arrow_up', gridR - 10, this.y + TOP - 8);
    if ((this.scroll + ROWS) * COLS < stock.length) r.sprite('arrow_down', gridR - 10, this.y + TOP + ROWS * (SLOT + 2) - 4);

    // the plate being made up, then the dish it makes
    drawText(r, assets, 'On the plate', this.midX, this.y + TOP - 12);
    for (let i = 0; i < this.size; i++) {
      const p = this.plateSlot(i);
      drawSlot(r, p.x, p.y, this.pane === 'plate' && i === this.plateSel);
      const item = this.plate[i];
      if (item) drawItem(r, assets, content, item, p.x, p.y, 1, kitchen.have(item) < this.plate.filter((x) => x === item).length);
    }
    const res = this.resultSlot();
    drawText(r, assets, 'Makes', res.x, res.y - 12);
    drawSlot(r, res.x, res.y, false);
    const dish = this.dish();
    const tx = res.x + SLOT + 6;
    const width = this.gridX - tx - 10;
    if (dish) {
      drawItem(r, assets, content, dish, res.x, res.y);
      wrap(content.itemName(dish), width).slice(0, 2).forEach((l, i) => drawText(r, assets, l, tx, res.y + 2 + i * 11));
      const why = kitchen.canPlate(dish, this.current);
      const ware = kitchen.ware(dish);
      r.ctx.globalAlpha = 0.7;
      wrap(why ?? `On a ${content.itemName(ware!).toLowerCase()}`, width + SLOT + 6).slice(0, 2)
        .forEach((l, i) => drawText(r, assets, l, res.x, res.y + SLOT + 6 + i * 11));
      r.ctx.globalAlpha = 1;
    } else {
      if (this.plate.length) drawText(r, assets, '?', res.x + (SLOT - measure('?')) / 2, res.y + 12);
      r.ctx.globalAlpha = 0.7;
      wrap(this.plate.length ? "That isn't a dish (yet)" : 'Put ingredients on the plate', width).slice(0, 2)
        .forEach((l, i) => drawText(r, assets, l, tx, res.y + 6 + i * 11));
      r.ctx.globalAlpha = 1;
    }

    // the trays resting here
    this.trays.forEach((t, i) => {
      const p = this.tabAt(i);
      r.nine(i === this.tray ? 'slot_selected' : 'slot', p.x, p.y, p.w, 18);
      drawText(r, assets, `Tray ${t.id + 1}`, p.x + 6, p.y + 4);
    });
    const t = this.current;
    if (t) drawTrayGrid(r, assets, content, t, this.gridX, this.y + TOP, this.pane === 'tray' ? this.cell : null);
    else {
      r.ctx.globalAlpha = 0.7;
      wrap('No serving tray here: bring one back', W - (this.gridX - this.x) - PAD).forEach((l, i) => drawText(r, assets, l, this.gridX, this.y + TOP + i * 11));
      r.ctx.globalAlpha = 1;
    }

    const msg = this.time < this.message.until;
    const help = msg ? this.message.text
      : hint(this.device, [['interact', 'add'], ['back', 'take off'], ['cat_next', 'plate it'], ['recipes', 'clear'], ['tab_next', 'tray'], ['cook', 'leave']]);
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, help, this.x + PAD, this.y + H - 18);
    r.ctx.globalAlpha = 1;
  }
}
