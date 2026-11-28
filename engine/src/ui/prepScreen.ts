/**
 * Working at a prep station. On the left, a grid of the ingredients to hand (the inn's stores and the
 * bag) that this station can do something with. Choose ingredients to put them into the station's tray
 * (right); what they'll become shows only once the tray holds exactly what a recipe takes, so working
 * out what a station makes is part of the cooking. X (or clicking the result) makes one, and the tray
 * stays filled, so pressing again makes another. What's made goes straight into the inn's stores
 * (prepped food onto shelves, drinks into barrels), or isn't made if there's no room.
 *
 * D-pad / stick / arrows move (across from the grid's right edge into the tray and back). A (E, click)
 * puts the chosen ingredient in; X (F, right-click) takes one of it back out (in the tray: the chosen
 * one); RT (X key, click the result) makes one; Y (R) empties the tray; View (M) opens the recipe book
 * (known recipes; choosing one puts its ingredients in); B (Esc) leaves the station. Working out
 * something new writes it in the book.
 *
 * Making something empties the tray (with a pop, and the new thing's name), and pins a card of what went
 * in over the tray: RT again puts those same ingredients back in and makes another, while there are any.
 */
import type { Assets } from '../core/assets';
import type { Device, Input } from '../core/input';
import { buttonName, hint } from './buttons';
import { Pops } from './fx';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content, Recipe } from '../game/data';
import type { Stack } from '../state/inventory';
import { InnStores, type Kitchen } from '../state/kitchen';
import { drawItem, drawItemInfo, drawSlot, SLOT } from './items';
import { gridMove } from './inventoryScreen';
import { Nav, type Screen } from './screen';
import { RecipeBook } from './recipeBook';
import type { Cookbook } from '../state/cookbook';
import { drawText, measure } from './text';

const W = 464;
const H = 240;
const COLS = 6;
const ROWS = 5;
const TOP = 30;
const PAD = 12;
const BOOK_ROWS = 5;

type Pane = 'grid' | 'tray';

export class PrepScreen implements Screen {
  private pane: Pane = 'grid';
  private sel: Record<Pane, number> = { grid: 0, tray: 0 };
  private scroll = 0; // grid rows
  /** What's been put in, in order (an ingredient can go in more than once). */
  private tray: string[] = [];
  private readonly size: number;
  private readonly usable: Set<string>;
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;
  private device: Device = 'keyboard';
  private readonly book: RecipeBook;
  private readonly pops = new Pops();
  /** What last went in, to make it again with RT once the tray's been emptied. */
  private again: string[] = [];

  constructor(
    private readonly station: string,
    private readonly kitchen: Kitchen,
    private readonly cookbook: Cookbook,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {
    this.size = content.mostInputsAt(station);
    this.usable = content.ingredientsAt(station);
    this.book = new RecipeBook(() => cookbook.at(station), (i) => kitchen.have(i), content, assets);
  }

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  /** The ingredients to hand that go into something here, each with how many are left out of the tray. */
  private stock(): Stack[] {
    return [...this.usable]
      .map((item) => ({ item, count: this.kitchen.have(item) - this.tray.filter((t) => t === item).length }))
      .filter((s) => s.count > 0 || this.tray.includes(s.item))
      .sort((a, b) => this.content.itemName(a.item).localeCompare(this.content.itemName(b.item)));
  }

  /** The recipe the tray holds exactly, if any. */
  private recipe(): Recipe | undefined {
    return this.tray.length ? this.content.recipeFor(this.station, this.tray) : undefined;
  }

  /** Whether more could still go in to make something (the tray is part of some recipe here). */
  private partOfSomething(): boolean {
    const need = (inputs: string[]) => this.tray.every((t) => inputs.filter((i) => i === t).length >= this.tray.filter((x) => x === t).length);
    return this.content.recipesAt(this.station).some((r) => r.inputs.length > this.tray.length && need(r.inputs));
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    this.device = input.device;
    if (this.book.open) {
      const pick = this.book.update(input, dt, BOOK_ROWS);
      if (pick) this.fill(pick.inputs);
      return true;
    }
    if (input.pressed('back') || input.pressed('menu')) return false;
    if (input.pressed('map')) this.book.open = true;
    const d = this.nav.step(input, dt);
    if (d) this.move(d);
    if (input.pressed('interact')) this.add();
    if (input.pressed('cook')) this.takeOut();
    if (input.pressed('cat_next')) this.make();
    if (input.pressed('recipes')) {
      this.tray = [];
      this.again = [];
    }
    return true;
  }

  private move(d: { x: number; y: number }): void {
    if (this.pane === 'grid') {
      const n = this.stock().length;
      const i = this.sel.grid;
      if (d.x > 0 && (i % COLS === COLS - 1 || i + 1 >= n)) {
        this.pane = 'tray';
        this.sel.tray = 0;
        return;
      }
      if (!n) return;
      this.sel.grid = gridMove(i, d, COLS, n);
      const row = Math.floor(this.sel.grid / COLS);
      if (row < this.scroll) this.scroll = row;
      if (row >= this.scroll + ROWS) this.scroll = row - ROWS + 1;
      return;
    }
    if (d.x < 0 && this.sel.tray === 0) {
      this.pane = 'grid';
      return;
    }
    if (d.x) this.sel.tray = Math.max(0, Math.min(this.size - 1, this.sel.tray + d.x));
  }

  /** Put one of the chosen ingredient into the tray. */
  private add(): void {
    if (this.pane === 'tray') return;
    const s = this.stock()[this.sel.grid];
    if (!s) return;
    if (s.count <= 0) return this.say(`No more ${this.content.itemName(s.item)}`);
    if (this.tray.length >= this.size) return this.say('The tray is full: take something out first');
    this.tray.push(s.item);
    this.keepSelection();
  }

  /** Take one of the chosen ingredient back out of the tray (in the tray: the chosen one). */
  private takeOut(): void {
    if (this.pane === 'tray') {
      if (this.sel.tray < this.tray.length) this.tray.splice(this.sel.tray, 1);
      return;
    }
    const s = this.stock()[this.sel.grid];
    const i = s ? this.tray.lastIndexOf(s.item) : -1;
    if (i >= 0) this.tray.splice(i, 1);
  }

  /** Put a recipe's ingredients in (from the book), as far as there are any to hand. */
  private fill(inputs: string[]): void {
    const short = inputs.find((i) => this.kitchen.have(i) < inputs.filter((x) => x === i).length);
    this.tray = [...inputs];
    if (short) this.say(`Not enough ${this.content.itemName(short)} to hand`);
  }

  /** Make one of what the tray holds (or, with it empty, of what went in last); the tray empties. */
  private make(): void {
    if (!this.tray.length && this.again.length) this.fill(this.again);
    const r = this.recipe();
    if (!r) return this.say(this.tray.length ? 'That makes nothing here' : 'Put some ingredients in first');
    const why = this.kitchen.make(r);
    if (why) return this.say(why);
    const name = this.content.itemName(r.out);
    const isNew = this.cookbook.learn(this.station, r.out, r.inputs);
    const res = this.resultSlot();
    this.pops.pop(res.x + SLOT / 2, res.y + SLOT / 2, this.time, { item: r.out, text: isNew ? `New recipe! ${name}` : `+1 ${name}`, big: isNew });
    this.say(isNew ? `${name} is in your recipe book` : `Made ${name}`);
    this.again = [...this.tray];
    this.tray = [];
    this.keepSelection();
  }

  private keepSelection(): void {
    this.sel.grid = Math.min(this.sel.grid, Math.max(0, this.stock().length - 1));
  }

  private say(text: string): void {
    this.message = { text, until: this.time + 2 };
  }

  private cellAt(i: number): { x: number; y: number } {
    return { x: this.x + PAD + (i % COLS) * (SLOT + 2), y: this.y + TOP + (Math.floor(i / COLS) - this.scroll) * (SLOT + 2) };
  }

  private get trayX(): number {
    return this.x + PAD + COLS * (SLOT + 2) + 24;
  }

  private traySlot(i: number): { x: number; y: number } {
    return { x: this.trayX + i * (SLOT + 4), y: this.y + TOP + 14 };
  }

  private resultSlot(): { x: number; y: number } {
    return { x: this.trayX, y: this.y + TOP + 14 + SLOT + 36 };
  }

  pointer(px: number, py: number, button: number): boolean {
    if (this.book.open) {
      const b = this.bookAt();
      const pick = button === 0 ? this.book.pointer(px, py, b.x, b.y, b.w, BOOK_ROWS) : null;
      if (pick) this.fill(pick.inputs);
      return true;
    }
    const hit = (p: { x: number; y: number }) => px >= p.x && py >= p.y && px < p.x + SLOT && py < p.y + SLOT;
    const n = this.stock().length;
    for (let i = this.scroll * COLS; i < Math.min(n, (this.scroll + ROWS) * COLS); i++) {
      if (!hit(this.cellAt(i))) continue;
      this.pane = 'grid';
      this.sel.grid = i;
      if (button === 0) this.add();
      if (button === 2) this.takeOut();
      return true;
    }
    for (let i = 0; i < this.size; i++) {
      if (!hit(this.traySlot(i))) continue;
      this.pane = 'tray';
      this.sel.tray = i;
      if (button === 0 || button === 2) this.takeOut();
      return true;
    }
    if (hit(this.resultSlot())) {
      if (button === 0) this.make();
      return true;
    }
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  private bookAt(): { x: number; y: number; w: number } {
    return { x: this.x + 30, y: this.y + 26, w: W - 60 };
  }

  draw(r: Renderer): void {
    const { assets, content, kitchen } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, content.stations[this.station].name, this.x + PAD, this.y + 10);
    // the chosen ingredient, by name
    const chosen = this.pane === 'grid' ? this.stock()[this.sel.grid]?.item : this.tray[this.sel.tray];
    if (chosen) {
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, content.itemName(chosen), this.x + PAD + 110, this.y + 10);
      r.ctx.globalAlpha = 1;
    }

    // the ingredients to hand
    const stock = this.stock();
    for (let i = this.scroll * COLS; i < (this.scroll + ROWS) * COLS; i++) {
      const p = this.cellAt(i);
      drawSlot(r, p.x, p.y, this.pane === 'grid' && i === this.sel.grid && i < stock.length);
      const s = stock[i];
      if (s) drawItem(r, assets, content, s.item, p.x, p.y, s.count, s.count <= 0);
    }
    const gridR = this.x + PAD + COLS * (SLOT + 2);
    if (this.scroll > 0) r.sprite('arrow_up', gridR - 10, this.y + TOP - 8);
    if ((this.scroll + ROWS) * COLS < stock.length) r.sprite('arrow_down', gridR - 10, this.y + TOP + ROWS * (SLOT + 2) - 4);
    if (!stock.length) {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'Nothing to hand that goes in here', this.x + PAD + 4, this.y + TOP + 12);
      r.ctx.globalAlpha = 1;
    }

    // the tray, then what it makes
    drawText(r, assets, 'In the tray', this.trayX, this.y + TOP);
    for (let i = 0; i < this.size; i++) {
      const p = this.traySlot(i);
      drawSlot(r, p.x, p.y, this.pane === 'tray' && i === this.sel.tray);
      const item = this.tray[i];
      if (item) drawItem(r, assets, content, item, p.x, p.y, 1, kitchen.have(item) < this.tray.filter((t) => t === item).length);
    }
    if (!this.tray.length && this.again.length) {
      // the last recipe, pinned over the tray like a card: RT makes it again
      const p0 = this.traySlot(0);
      const w = this.size * (SLOT + 4) + 4;
      r.nine('panel_parchment', p0.x - 4, p0.y - 4, w, SLOT + 8);
      this.again.forEach((item, i) => drawItem(r, assets, content, item, this.traySlot(i).x, p0.y, 1, kitchen.have(item) < this.again.filter((x) => x === item).length));
      const tag = `${buttonName(this.device, 'cat_next')}: again`;
      // a ribbon tied on at the card's foot: what makes it again
      r.nine('ribbon_banner', p0.x - 4, p0.y + SLOT + 4, measure(tag) + 14, 14);
      drawText(r, assets, tag, p0.x + 3, p0.y + SLOT + 6);
    }
    const res = this.resultSlot();
    drawText(r, assets, 'Makes', res.x, res.y - 12);
    drawSlot(r, res.x, res.y, false);
    const rec = this.recipe();
    const tx = res.x + SLOT + 8;
    if (rec) {
      drawItem(r, assets, content, rec.out, res.x, res.y);
      const h = drawItemInfo(r, assets, content, rec.out, tx, res.y);
      const why = kitchen.canMake(rec);
      const where = `Goes ${InnStores.placeFor(content.item(rec.out).store)}  (room for ${kitchen.stores.room(rec.out)})`;
      drawText(r, assets, why ?? where, res.x, res.y + Math.max(SLOT, h) + 6);
    } else {
      const q = '?';
      if (this.tray.length) drawText(r, assets, q, res.x + (SLOT - measure(q)) / 2, res.y + 12);
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, !this.tray.length ? (this.again.length ? 'Ready to make again' : 'Put ingredients in') : this.partOfSomething() ? 'Something more goes in...' : 'Nothing comes of that', tx, res.y + 12);
      r.ctx.globalAlpha = 1;
    }

    const msg = this.time < this.message.until;
    const help = msg ? this.message.text
      : hint(this.device, [['interact', 'add'], ['cook', 'take out'], ['cat_next', 'make'], ['recipes', 'clear'], ['map', 'recipes'], ['back', 'leave']]);
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, help, this.x + PAD, this.y + H - 18);
    r.ctx.globalAlpha = 1;
    this.pops.draw(r, assets, content, this.time);
    if (this.book.open) {
      const b = this.bookAt();
      this.book.draw(r, b.x, b.y, b.w, BOOK_ROWS);
    }
  }
}
