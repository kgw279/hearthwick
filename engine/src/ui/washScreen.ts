/**
 * The wash station. Left: the dirty and wet tableware to hand (the inn's stores and the bag). Right, two
 * sections: the washing tub (dirty pieces in, wet ones out) and the drying rack (wet in, clean out), each
 * with what's waiting and a bar for the piece being done (about a second each). Finished pieces go back
 * into the stores (or the bag), and carry on while you're away.
 * A (E, click) puts one of the chosen pieces in its section; Y (R) puts in all of them; X (F, right-click)
 * takes one back out; B (Esc) leaves.
 */
import type { Assets } from '../core/assets';
import type { Device, Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Stack } from '../state/inventory';
import type { Kitchen } from '../state/kitchen';
import { DRY_TIME, WASH_TIME, type Line, type Washing } from '../state/washing';
import { hint } from './buttons';
import { drawItem, drawSlot, SLOT } from './items';
import { gridMove } from './inventoryScreen';
import { Nav, type Screen } from './screen';
import { drawText } from './text';

const W = 440;
const H = 236;
const COLS = 5;
const ROWS = 4;
const TOP = 44;
const PAD = 12;
const SHOWN = 5; // waiting pieces shown per section

export class WashScreen implements Screen {
  private sel = 0;
  private scroll = 0;
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;
  private device: Device = 'keyboard';

  constructor(
    private readonly washing: Washing,
    private readonly kitchen: Kitchen,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {}

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  /** Dirty pieces first, then wet ones, each with how many are to hand. */
  private stock(): Stack[] {
    const of = (test: (id: string) => boolean) => Object.keys(this.content.items).filter(test)
      .map((item) => ({ item, count: this.kitchen.have(item) })).filter((s) => s.count > 0);
    return [...of((i) => !!this.content.items[i].washes_to), ...of((i) => !!this.content.items[i].dries_to)];
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    this.device = input.device;
    if (input.pressed('back') || input.pressed('menu')) return false;
    const d = this.nav.step(input, dt);
    if (d) {
      const n = this.stock().length;
      if (n) this.sel = gridMove(this.sel, d, COLS, n);
      const row = Math.floor(this.sel / COLS);
      if (row < this.scroll) this.scroll = row;
      if (row >= this.scroll + ROWS) this.scroll = row - ROWS + 1;
    }
    if (input.pressed('interact')) this.putIn(1);
    if (input.pressed('recipes')) this.putIn(Infinity);
    if (input.pressed('cook')) this.takeOut();
    this.sel = Math.min(this.sel, Math.max(0, this.stock().length - 1));
    return true;
  }

  /** Put up to n of the chosen piece into its section. */
  private putIn(n: number): void {
    const s = this.stock()[this.sel];
    const line = s && this.washing.lineFor(s.item);
    if (!s || !line) return;
    let k = 0;
    while (k < n && this.kitchen.take(s.item)) {
      line.queue.push(s.item);
      k++;
    }
    this.say(`${k} ${this.content.itemName(s.item).toLowerCase()} ${line === this.washing.washing ? 'into the tub' : 'onto the rack'}`);
  }

  /** Take one of the chosen piece back out of its section (the last one waiting). */
  private takeOut(): void {
    const s = this.stock()[this.sel];
    const line = s && this.washing.lineFor(s.item);
    const i = line ? line.queue.lastIndexOf(s.item) : -1;
    if (!line || i <= 0) return this.say('None of those waiting');
    if (!this.kitchen.put(s.item)) return this.say('No room to put it back');
    line.queue.splice(i, 1);
  }

  private say(text: string): void {
    this.message = { text, until: this.time + 1.6 };
  }

  private cellAt(i: number): { x: number; y: number } {
    return { x: this.x + PAD + (i % COLS) * (SLOT + 2), y: this.y + TOP + (Math.floor(i / COLS) - this.scroll) * (SLOT + 2) };
  }

  pointer(px: number, py: number, button: number): boolean {
    const n = this.stock().length;
    for (let i = this.scroll * COLS; i < Math.min(n, (this.scroll + ROWS) * COLS); i++) {
      const p = this.cellAt(i);
      if (px < p.x || py < p.y || px >= p.x + SLOT || py >= p.y + SLOT) continue;
      this.sel = i;
      if (button === 0) this.putIn(1);
      if (button === 2) this.takeOut();
      return true;
    }
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  /** A section: its name, the piece being done with its bar, and what's waiting. */
  private drawLine(r: Renderer, title: string, line: Line, time: number, x: number, y: number): void {
    const { assets, content } = this;
    drawText(r, assets, `${title}  (${line.queue.length})`, x, y);
    const by = y + 14;
    drawSlot(r, x, by, false);
    if (line.queue[0]) drawItem(r, assets, content, line.queue[0], x, by);
    const bw = 120;
    r.rect(x + SLOT + 6, by + 14, bw, 6, '#45283c', true);
    r.rect(x + SLOT + 6, by + 14, Math.round((bw * line.t) / time), 6, '#5fcde4', true);
    line.queue.slice(1, 1 + SHOWN).forEach((item, i) => drawItem(r, assets, content, item, x + SLOT + 6 + i * 16, by + SLOT - 10));
  }

  draw(r: Renderer): void {
    const { assets, content } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, 'Wash station', this.x + PAD, this.y + 10);
    const stock = this.stock();
    const chosen = stock[this.sel];
    if (chosen) {
      r.ctx.globalAlpha = 0.8;
      drawText(r, assets, content.itemName(chosen.item), this.x + PAD + 100, this.y + 10);
      r.ctx.globalAlpha = 1;
    }
    drawText(r, assets, 'To wash and dry', this.x + PAD, this.y + TOP - 12);
    for (let i = this.scroll * COLS; i < (this.scroll + ROWS) * COLS; i++) {
      const p = this.cellAt(i);
      drawSlot(r, p.x, p.y, i === this.sel && i < stock.length);
      const s = stock[i];
      if (s) drawItem(r, assets, content, s.item, p.x, p.y, s.count);
    }
    if (!stock.length) {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'Nothing dirty or wet to hand', this.x + PAD + 4, this.y + TOP + 12);
      r.ctx.globalAlpha = 1;
    }
    const sx = this.x + PAD + COLS * (SLOT + 2) + 16;
    this.drawLine(r, 'Washing', this.washing.washing, WASH_TIME, sx, this.y + TOP - 12);
    this.drawLine(r, 'Drying', this.washing.drying, DRY_TIME, sx, this.y + TOP + 62);

    const msg = this.time < this.message.until;
    const help = msg ? this.message.text
      : hint(this.device, [['interact', 'put in one'], ['recipes', 'put in all'], ['cook', 'take out'], ['back', 'leave']]);
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, help, this.x + PAD, this.y + H - 18);
    r.ctx.globalAlpha = 1;
  }
}
