/**
 * The plating station: making up dishes and drinks, which then wait here ready to serve (up to four at
 * a time; tables and the bar are served from them).
 *  - Left: the ingredients to hand (the inn's stores and the bag) that go into some dish, by name.
 *  - Middle: the plate being made up. What dish its ingredients make shows only once they're exactly a
 *    dish's components (venison and honey glaze...); a raw snack on its own (an apple) is plated as it
 *    is. Plating takes a clean plate (a mug for a drink; a bowl if there are no plates). The plate stays
 *    made up, so it can be plated again.
 *  - Right: what's ready to serve.
 * Controls as at the prep stations: A (E, click) puts on; X (F, right-click) takes off (on what's ready:
 * unplates it, back to the stores); RT (X key, click the result) plates it; Y (R) clears the plate; View
 * (M) opens the recipe book of known dishes; B (Esc) leaves. Plating something new writes it in.
 * Plating empties the plate (with a pop); under the result, a ribbon says RT plates another of the same.
 */
import type { Assets } from '../core/assets';
import type { Device, Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Cookbook } from '../state/cookbook';
import type { Stack } from '../state/inventory';
import type { Kitchen } from '../state/kitchen';
import { READY_MAX, type ReadySlot } from '../state/service';
import { buttonName, hint } from './buttons';
import { Pops } from './fx';
import { drawItem, drawSlot, SLOT } from './items';
import { drawReady, readyName } from './ready';
import { gridMove } from './inventoryScreen';
import { RecipeBook } from './recipeBook';
import { Nav, type Screen } from './screen';
import { drawText, measure, wrap } from './text';

const W = 464;
const H = 248;
const COLS = 5;
const ROWS = 5;
const TOP = 44;
const PAD = 12;
const BOOK_ROWS = 5;

type Pane = 'grid' | 'plate' | 'ready';

export class PlatingScreen implements Screen {
  private pane: Pane = 'grid';
  private sel = 0;
  private scroll = 0;
  private plateSel = 0;
  private readySel = 0;
  /** What's on the plate being made up, in order. */
  private plate: string[] = [];
  private readonly size: number;
  private readonly usable: Set<string>;
  private readonly book: RecipeBook;
  private readonly pops = new Pops();
  /** What last went on the plate, to plate again with RT once it's been emptied. */
  private again: string[] = [];
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;
  private device: Device = 'keyboard';

  /** ready: what's plated and waiting here. changed: tell the world to redraw it. */
  constructor(
    private readonly ready: ReadySlot[],
    private readonly kitchen: Kitchen,
    private readonly cookbook: Cookbook,
    private readonly changed: () => void,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {
    this.size = content.mostComponents();
    this.usable = new Set([...content.dishComponents(), ...content.snacks]);
    this.book = new RecipeBook(() => cookbook.at('plate'), (i) => kitchen.have(i), content, assets);
  }

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  /** Ingredients to hand that go into some dish (or are a snack), with how many are left off the plate. */
  private stock(): Stack[] {
    return [...this.usable]
      .map((item) => ({ item, count: this.kitchen.have(item) - this.plate.filter((p) => p === item).length }))
      .filter((s) => s.count > 0 || this.plate.includes(s.item))
      .sort((a, b) => this.content.itemName(a.item).localeCompare(this.content.itemName(b.item)));
  }

  /** Whether what's on the plate is part of some dish (more goes with it). */
  private partOfSomething(): boolean {
    const n = (list: string[], x: string) => list.filter((i) => i === x).length;
    return Object.values(this.content.dishes).some((d) => d.components.length > this.plate.length && this.plate.every((p) => n(d.components, p) >= n(this.plate, p)));
  }

  private dish(): string | undefined {
    return this.plate.length ? this.kitchen.plated(this.plate) : undefined;
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
    if (input.pressed('cook')) this.takeOff();
    if (input.pressed('cat_next')) this.make();
    if (input.pressed('recipes')) {
      this.plate = [];
      this.again = [];
    }
    return true;
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
      if (d.y > 0) this.pane = 'ready';
      else if (d.x < 0 && this.plateSel === 0) this.pane = 'grid';
      else if (d.x) this.plateSel = Math.max(0, Math.min(this.size - 1, this.plateSel + d.x));
      return;
    }
    if (d.y < 0) this.pane = 'plate';
    else if (d.x < 0 && this.readySel === 0) this.pane = 'grid';
    else if (d.x) this.readySel = Math.max(0, Math.min(READY_MAX - 1, this.readySel + d.x));
  }

  private add(): void {
    if (this.pane !== 'grid') return;
    const s = this.stock()[this.sel];
    if (!s) return;
    if (s.count <= 0) return this.say(`No more ${this.content.itemName(s.item)}`);
    if (this.plate.length >= this.size) return this.say('The plate is full: take something off first');
    this.plate.push(s.item);
    this.keepSelection();
  }

  /** Take one of the chosen ingredient off the plate; on the plate, the chosen one; on what's ready, unplate it. */
  private takeOff(): void {
    if (this.pane === 'ready') {
      const why = this.kitchen.unplate(this.ready, this.readySel);
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

  private fill(inputs: string[]): void {
    const short = inputs.find((i) => this.kitchen.have(i) < inputs.filter((x) => x === i).length);
    this.plate = [...inputs];
    if (short) this.say(`Not enough ${this.content.itemName(short)} to hand`);
  }

  private make(): void {
    if (!this.plate.length && this.again.length) this.fill(this.again);
    const dish = this.dish();
    if (!dish) return this.say(this.plate.length ? "That isn't a dish" : 'Put some ingredients on the plate first');
    const why = this.kitchen.plate(dish, this.ready);
    if (why) return this.say(why);
    const name = this.content.itemName(dish);
    const learned = !!this.content.dishes[dish] && this.cookbook.learn('plate', dish, this.content.dish(dish).components);
    const slot = this.readySlot(this.ready.length - 1);
    this.pops.pop(slot.x + SLOT / 2, slot.y + SLOT / 2, this.time, { item: dish, text: learned ? `New dish! ${name}` : `${name} is ready`, big: learned });
    this.say(learned ? `${name} is in your recipe book` : `${name} is ready to serve`);
    this.again = [...this.plate];
    this.plate = [];
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
    return this.x + PAD + COLS * (SLOT + 2) + 16;
  }

  private plateSlot(i: number): { x: number; y: number } {
    return { x: this.midX + i * (SLOT + 2), y: this.y + TOP };
  }

  private resultSlot(): { x: number; y: number } {
    return { x: this.midX, y: this.y + TOP + SLOT + 24 };
  }

  private readySlot(i: number): { x: number; y: number } {
    return { x: this.midX + i * (SLOT + 2), y: this.y + TOP + SLOT * 2 + 60 };
  }

  private bookAt(): { x: number; y: number; w: number } {
    return { x: this.x + 30, y: this.y + 26, w: W - 60 };
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
    for (let i = 0; i < READY_MAX; i++) {
      if (!hit(this.readySlot(i))) continue;
      this.pane = 'ready';
      this.readySel = i;
      if (button === 2) this.takeOff();
      return true;
    }
    if (hit(this.resultSlot())) {
      if (button === 0) this.make();
      return true;
    }
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  draw(r: Renderer): void {
    const { assets, content, kitchen } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, content.stations.plate?.name ?? 'Plating station', this.x + PAD, this.y + 10);
    const stock = this.stock();
    const chosen = this.pane === 'grid' ? stock[this.sel]?.item
      : this.pane === 'plate' ? this.plate[this.plateSel] : readyName(this.ready[this.readySel]);
    if (chosen) {
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, chosen.startsWith('(') ? chosen : content.itemName(chosen), this.x + PAD + 110, this.y + 10);
      r.ctx.globalAlpha = 1;
    }

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

    drawText(r, assets, 'On the plate', this.midX, this.y + TOP - 12);
    for (let i = 0; i < this.size; i++) {
      const p = this.plateSlot(i);
      drawSlot(r, p.x, p.y, this.pane === 'plate' && i === this.plateSel);
      const item = this.plate[i];
      if (item) drawItem(r, assets, content, item, p.x, p.y, 1, kitchen.have(item) < this.plate.filter((x) => x === item).length);
    }
    const res = this.resultSlot();
    drawSlot(r, res.x, res.y, false);
    const dish = this.dish();
    const tx = res.x + SLOT + 6;
    const width = this.x + W - PAD - tx;
    if (dish) {
      drawItem(r, assets, content, dish, res.x, res.y);
      drawText(r, assets, content.itemName(dish), tx, res.y + 4);
      const why = kitchen.canPlate(dish, this.ready);
      const ware = kitchen.ware(dish);
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, why ?? `On a ${content.itemName(ware!).toLowerCase()}`, tx, res.y + 18);
      r.ctx.globalAlpha = 1;
    } else {
      if (this.plate.length) drawText(r, assets, '?', res.x + (SLOT - measure('?')) / 2, res.y + 12);
      r.ctx.globalAlpha = 0.7;
      wrap(this.plate.length ? (this.partOfSomething() ? 'Something more goes with it...' : "That isn't a dish") : this.again.length ? '' : 'Put ingredients on the plate', width).slice(0, 2)
        .forEach((l, i) => drawText(r, assets, l, tx, res.y + 6 + i * 11));
      r.ctx.globalAlpha = 1;
    }

    drawText(r, assets, `In hand  ${this.ready.length}/${READY_MAX}`, this.midX, this.readySlot(0).y - 12);
    for (let i = 0; i < READY_MAX; i++) {
      const p = this.readySlot(i);
      drawSlot(r, p.x, p.y, this.pane === 'ready' && i === this.readySel);
      drawReady(r, assets, content, this.ready[i], p.x, p.y);
    }

    // made a moment ago: what RT makes again, shown faintly in the result, with a ribbon saying so
    const again = !this.plate.length && this.again.length ? this.kitchen.plated(this.again) : undefined;
    if (again) {
      const res = this.resultSlot();
      drawItem(r, assets, content, again, res.x, res.y, 1, true);
      const tag = `${buttonName(this.device, 'cat_next')}: plate another ${content.itemName(again)}`;
      r.nine('ribbon_banner', res.x - 4, res.y + SLOT + 4, measure(tag) + 14, 14);
      drawText(r, assets, tag, res.x + 3, res.y + SLOT + 6);
    }
    const msg = this.time < this.message.until;
    const help = msg ? this.message.text
      : hint(this.device, [['interact', 'add'], ['cook', 'take off'], ['cat_next', 'plate'], ['recipes', 'clear'], ['map', 'recipes'], ['back', 'leave']]);
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
