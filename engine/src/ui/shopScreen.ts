/**
 * A shop: its shelf (left) and your bag (right). Choose on the shelf to buy one; choose in your bag
 * to sell one, if this shop buys it. X (or Shift-click) trades five at a time. Left/right cross between
 * shelf and bag; B / Esc leave.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Bag } from '../state/inventory';
import type { Shops, TradeResult } from '../state/shops';
import { gridMove, inside } from './inventoryScreen';
import { drawCoins, drawItem, drawItemInfo, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText, measure } from './text';

const COLS = 6;
const W = 464;
const H = 240;
const ROW = 36;
const ROWS = 5;
const LIST_W = 214;

export class ShopScreen implements Screen {
  private pane: 'shelf' | 'bag' = 'shelf';
  private shelfSel = 0;
  private bagSel = 0;
  private scroll = 0;
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;
  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  constructor(
    private readonly shopId: string,
    private readonly shops: Shops,
    private readonly bag: Bag,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {}

  private get shelf() {
    return this.shops.shelf(this.shopId);
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    if (input.pressed('back') || input.pressed('menu')) return false;
    const d = this.nav.step(input, dt);
    if (d) this.move(d);
    if (input.pressed('interact')) this.trade(1);
    if (input.pressed('cook')) this.trade(5);
    return true;
  }

  private move(d: { x: number; y: number }): void {
    if (this.pane === 'shelf') {
      if (d.x > 0) {
        this.pane = 'bag';
        this.bagSel = Math.min(this.bag.slots.length - 1, Math.floor(this.bagSel / COLS) * COLS);
        return;
      }
      if (d.y) this.shelfSel = Math.max(0, Math.min(this.shelf.length - 1, this.shelfSel + d.y));
      this.keepVisible();
      return;
    }
    if (d.x < 0 && this.bagSel % COLS === 0) {
      this.pane = 'shelf';
      return;
    }
    this.bagSel = gridMove(this.bagSel, d, COLS, this.bag.slots.length);
  }

  private keepVisible(): void {
    if (this.shelfSel < this.scroll) this.scroll = this.shelfSel;
    if (this.shelfSel >= this.scroll + ROWS) this.scroll = this.shelfSel - ROWS + 1;
  }

  private trade(n: number): void {
    let res: TradeResult;
    let done = '';
    if (this.pane === 'shelf') {
      const line = this.shelf[this.shelfSel];
      if (!line) return;
      const k = Math.max(1, Math.min(n, line.left, Math.floor(this.bag.coins / line.price), this.bag.room(line.item)));
      res = this.shops.buy(this.shopId, line.item, k, this.bag);
      done = `Bought ${k} ${this.content.itemName(line.item)}`;
    } else {
      const s = this.bag.slots[this.bagSel];
      if (!s) return;
      const k = Math.min(n, this.bag.count(s.item));
      const name = this.content.itemName(s.item);
      res = this.shops.sell(this.shopId, s.item, k, this.bag);
      done = `Sold ${k} ${name}`;
    }
    this.say(res.ok ? done : res.reason);
  }

  private say(text: string): void {
    this.message = { text, until: this.time + 1.8 };
  }

  private rowAt(i: number): { x: number; y: number } {
    return { x: this.x + 10, y: this.y + 30 + (i - this.scroll) * ROW };
  }

  private slotAt(i: number): { x: number; y: number } {
    return { x: this.x + LIST_W + 30 + (i % COLS) * (SLOT + 2), y: this.y + 30 + Math.floor(i / COLS) * (SLOT + 2) };
  }

  pointer(px: number, py: number, button: number, shift: boolean): boolean {
    if (button === 0 && (px < this.x || py < this.y || px >= this.x + W || py >= this.y + H)) return false;
    for (let i = this.scroll; i < Math.min(this.shelf.length, this.scroll + ROWS); i++) {
      const p = this.rowAt(i);
      if (px >= p.x && px < p.x + LIST_W && py >= p.y && py < p.y + ROW - 2) {
        this.pane = 'shelf';
        this.shelfSel = i;
        if (button === 0) this.trade(shift ? 5 : 1);
        return true;
      }
    }
    const k = this.bag.slots.findIndex((_, i) => inside(px, py, this.slotAt(i)));
    if (k >= 0) {
      this.pane = 'bag';
      this.bagSel = k;
      if (button === 0) this.trade(shift ? 5 : 1);
    }
    return true;
  }

  draw(r: Renderer): void {
    const { assets, content, bag } = this;
    const shop = content.shop(this.shopId);
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, shop.name, this.x + 12, this.y + 10);
    drawCoins(r, assets, bag.coins, this.x + W - 70, this.y + 6);
    drawText(r, assets, 'Your bag', this.x + LIST_W + 30, this.y + 18);

    // shelf
    const shelf = this.shelf;
    for (let i = this.scroll; i < Math.min(shelf.length, this.scroll + ROWS); i++) {
      const line = shelf[i];
      const p = this.rowAt(i);
      const sel = this.pane === 'shelf' && i === this.shelfSel;
      r.nine(sel ? 'slot_selected' : 'slot', p.x, p.y, LIST_W, ROW - 2);
      drawItem(r, assets, content, line.item, p.x, p.y, 1, line.left === 0);
      drawText(r, assets, content.itemName(line.item), p.x + 38, p.y + 6);
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, line.left ? `${line.left} left` : 'Sold out', p.x + 38, p.y + 19);
      r.ctx.globalAlpha = 1;
      const price = String(line.price);
      r.sprite('coin', p.x + LIST_W - 26 - measure(price), p.y + 9);
      drawText(r, assets, price, p.x + LIST_W - 8 - measure(price), p.y + 13);
    }
    if (this.scroll > 0) r.sprite('arrow_up', this.x + LIST_W - 8, this.y + 14);
    if (this.scroll + ROWS < shelf.length) r.sprite('arrow_down', this.x + LIST_W - 8, this.y + 30 + ROWS * ROW - 4);

    // bag
    bag.slots.forEach((s, i) => {
      const p = this.slotAt(i);
      drawSlot(r, p.x, p.y, this.pane === 'bag' && i === this.bagSel);
      if (s) drawItem(r, assets, content, s.item, p.x, p.y, s.count, !this.shops.buys(this.shopId, s.item));
    });

    // the selected thing, and what choosing it would do
    const by = this.y + 30 + 4 * (SLOT + 2) + 6;
    const bx = this.x + LIST_W + 30;
    let item: string | null = null;
    let action = '';
    if (this.pane === 'shelf') {
      const line = shelf[this.shelfSel];
      if (line) {
        item = line.item;
        action = line.left ? `Buy for ${line.price}` : 'Sold out today';
      }
    } else {
      const s = bag.slots[this.bagSel];
      if (s) {
        item = s.item;
        action = this.shops.buys(this.shopId, s.item) ? `Sell for ${content.sellPrice(s.item)}` : "Not bought here";
      }
    }
    if (item) {
      const h = drawItemInfo(r, assets, content, item, bx, by);
      drawText(r, assets, action, bx, by + h);
    }
    const msg = this.time < this.message.until ? this.message.text : '';
    if (msg) drawText(r, assets, msg, this.x + 12, this.y + H - 18);
  }
}
