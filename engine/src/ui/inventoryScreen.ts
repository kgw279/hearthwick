/**
 * The inventory (Tab / I / Menu button), in three tabs: the Bag, the Kitchen (every ingredient, prepped
 * food, drink and piece of tableware in the inn's containers, as one store), and the Inn (the inn's
 * supplies). LB / RB (Q / C) or a click switch tabs; D-pad, stick or arrows move; B / Esc / Tab close.
 * Inside the inn, choosing a stack moves it between the bag and the inn's stores (X / right-click: one):
 * it goes into whichever container takes it and has room, and comes out of them wherever it is.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Bag, Stack } from '../state/inventory';
import { InnStores } from '../state/kitchen';
import { READY_MAX, type ReadySlot } from '../state/service';
import { drawCoins, drawItem, drawItemInfo, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText, measure } from './text';

const COLS = 6;
const ROWS = 5;
const W = 410;
const H = 240;
const TOP = 34;
const TABS = ['Bag', 'Kitchen', 'Inn'] as const;
type Tab = (typeof TABS)[number];

export class InventoryScreen implements Screen {
  private tab: Tab = 'Bag';
  private sel = 0;
  private scroll = 0; // rows
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  /** inInn: whether things can be moved between the bag and the stores (only inside the inn). */
  constructor(
    private readonly bag: Bag,
    private readonly stores: InnStores,
    private readonly ready: ReadySlot[],
    private readonly inInn: boolean,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {}

  /** What the current tab shows: the bag's slots (empty ones too), or a store's stacks. */
  private cells(): Array<Stack | null> {
    if (this.tab === 'Bag') return this.bag.slots;
    return this.stores.contents(this.tab === 'Kitchen' ? 'kitchen' : 'inn');
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    if (input.pressed('back') || input.pressed('menu')) return false;
    if (input.pressed('tab_prev')) this.switchTab(-1);
    if (input.pressed('tab_next')) this.switchTab(1);
    const d = this.nav.step(input, dt);
    if (d) this.move(d);
    if (input.pressed('interact')) this.transfer(Infinity);
    if (input.pressed('cook')) this.transfer(1);
    return true;
  }

  private switchTab(d: number): void {
    this.tab = TABS[(TABS.indexOf(this.tab) + d + TABS.length) % TABS.length];
    this.sel = 0;
    this.scroll = 0;
  }

  private move(d: { x: number; y: number }): void {
    const n = this.cells().length;
    if (!n) return;
    const col = this.sel % COLS;
    if (d.x < 0 && col > 0) this.sel--;
    if (d.x > 0 && col < COLS - 1 && this.sel + 1 < n) this.sel++;
    if (d.y < 0 && this.sel - COLS >= 0) this.sel -= COLS;
    if (d.y > 0 && this.sel + COLS < n) this.sel += COLS;
    const row = Math.floor(this.sel / COLS);
    if (row < this.scroll) this.scroll = row;
    if (row >= this.scroll + ROWS) this.scroll = row - ROWS + 1;
  }

  /** Move up to n of the chosen stack: from the bag into the inn's stores, or out of them into the bag. */
  private transfer(n: number): void {
    const s = this.cells()[this.sel];
    if (!s) return;
    if (!this.inInn) return this.say('Things can only be moved in or out at the inn');
    const name = this.content.itemName(s.item);
    if (this.tab === 'Bag') {
      const store = this.content.items[s.item]?.store;
      if (!store) return this.say(`${name} isn't kept in the inn's stores`);
      const k = Math.min(n, s.count, this.stores.room(s.item));
      if (!k) return this.say(`No room ${InnStores.placeFor(store)} for ${name}`);
      this.bag.remove(s.item, this.stores.add(s.item, k));
      return;
    }
    const k = Math.min(n, s.count, this.bag.stackSize, this.bag.room(s.item));
    if (!k) return this.say(this.bag.why(s.item) ?? 'Your bag is full');
    this.stores.remove(s.item, k);
    this.bag.add(s.item, k);
    this.sel = Math.min(this.sel, Math.max(0, this.cells().length - 1));
  }

  private say(text: string): void {
    this.message = { text, until: this.time + 1.8 };
  }

  private cellAt(i: number): { x: number; y: number } {
    const row = Math.floor(i / COLS) - this.scroll;
    return { x: this.x + 12 + (i % COLS) * (SLOT + 2), y: this.y + TOP + row * (SLOT + 2) };
  }

  private tabAt(i: number): { x: number; y: number; w: number } {
    let x = this.x + 12;
    for (let k = 0; k < i; k++) x += measure(TABS[k]) + 22;
    return { x, y: this.y + 8, w: measure(TABS[i]) + 16 };
  }

  pointer(px: number, py: number, button: number): boolean {
    TABS.forEach((t, i) => {
      const r = this.tabAt(i);
      if (button === 0 && px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + 18 && t !== this.tab) {
        this.tab = t;
        this.sel = 0;
        this.scroll = 0;
      }
    });
    const n = this.cells().length;
    for (let i = this.scroll * COLS; i < Math.min(n, (this.scroll + ROWS) * COLS); i++) {
      const p = this.cellAt(i);
      if (px < p.x || py < p.y || px >= p.x + SLOT || py >= p.y + SLOT) continue;
      this.sel = i;
      if (button === 0) this.transfer(Infinity);
      if (button === 2) this.transfer(1);
      return true;
    }
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  draw(r: Renderer): void {
    const { assets, content } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    TABS.forEach((t, i) => {
      const p = this.tabAt(i);
      r.nine(t === this.tab ? 'slot_selected' : 'slot', p.x, p.y, p.w, 18);
      drawText(r, assets, t, p.x + 8, p.y + 4);
    });
    drawCoins(r, assets, this.bag.coins, this.x + W - 70, this.y + 8);

    const cells = this.cells();
    const shown = this.tab === 'Bag' ? cells.length : Math.max(cells.length, COLS * ROWS);
    for (let i = this.scroll * COLS; i < Math.min(shown, (this.scroll + ROWS) * COLS); i++) {
      const p = this.cellAt(i);
      drawSlot(r, p.x, p.y, i === this.sel && i < cells.length);
      const s = cells[i];
      if (s) drawItem(r, assets, content, s.item, p.x, p.y, s.count);
    }
    const gridR = this.x + 12 + COLS * (SLOT + 2);
    if (this.scroll > 0) r.sprite('arrow_up', gridR - 10, this.y + TOP - 8);
    if ((this.scroll + ROWS) * COLS < cells.length) r.sprite('arrow_down', gridR - 10, this.y + TOP + ROWS * (SLOT + 2) - 4);

    // the selected stack, then what holds this tab's things
    const ix = gridR + 10;
    const s = cells[this.sel];
    if (s) {
      const h = drawItemInfo(r, assets, content, s.item, ix, this.y + TOP + 2);
      drawText(r, assets, `x${s.count}`, ix, this.y + TOP + 6 + h);
    } else {
      r.ctx.globalAlpha = 0.6;
      drawText(r, assets, this.tab === 'Bag' ? 'Empty slot' : 'Nothing stored yet', ix, this.y + TOP + 2);
      r.ctx.globalAlpha = 1;
    }
    let cy = this.y + TOP + 84;
    if (this.tab === 'Bag') {
      drawText(r, assets, `${this.bag.slots.filter(Boolean).length}/${this.bag.slots.length} slots`, ix, cy);
      // how much is carried: a bar filling towards what the player can manage
      const load = this.bag.load;
      drawText(r, assets, `Carrying ${Math.round(load * 10) / 10} of ${this.bag.maxWeight}`, ix, cy + 14);
      const bw = 110;
      r.rect(ix, cy + 27, bw, 5, '#45283c', true);
      r.rect(ix, cy + 27, Math.round((bw * Math.min(1, load / this.bag.maxWeight))), 5, load / this.bag.maxWeight > 0.85 ? '#df7126' : '#99e550', true);
    } else {
      const caps = this.stores.capacity(this.tab === 'Kitchen' ? 'kitchen' : 'inn');
      if (!caps.length) drawText(r, assets, 'No containers for these yet', ix, cy);
      for (const c of caps) {
        drawText(r, assets, `${c.group}  ${c.used}/${c.slots} slots`, ix, cy);
        cy += 12;
      }
      if (this.tab === 'Kitchen') {
        drawText(r, assets, `In hand to serve  ${this.ready.length}/${READY_MAX}`, ix, cy + 4);
      }
    }
    const msg = this.time < this.message.until;
    const hint = msg ? this.message.text
      : !this.inInn ? 'Tabs: LB / RB (Q / C)'
      : this.tab === 'Bag' ? 'Choose: put the stack away in the inn   X: just one'
      : 'Choose: take the stack   X: just one   Tabs: LB / RB';
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, hint, this.x + 12, this.y + H - 18);
    r.ctx.globalAlpha = 1;
  }
}

export function inside(px: number, py: number, p: { x: number; y: number }): boolean {
  return px >= p.x && py >= p.y && px < p.x + SLOT && py < p.y + SLOT;
}

/** Move a selection around a grid; stays put at the edges. Returns the new index. */
export function gridMove(i: number, d: { x: number; y: number }, cols: number, n: number): number {
  const col = i % cols;
  if (d.x < 0 && col > 0) return i - 1;
  if (d.x > 0 && col < cols - 1 && i + 1 < n) return i + 1;
  if (d.y < 0 && i - cols >= 0) return i - cols;
  if (d.y > 0 && i + cols < n) return i + cols;
  return i;
}
