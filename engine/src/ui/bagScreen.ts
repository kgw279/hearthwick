/**
 * The bag (Tab / I / Menu button): every slot, the selected item's details, and the purse.
 * D-pad, stick or arrows move; B / Esc / Tab close; the mouse hovers to inspect.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Bag } from '../state/bag';
import { drawCoins, drawItem, drawItemInfo, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText } from './text';

const COLS = 6;
const W = 390;
const H = 196;

export class BagScreen implements Screen {
  private sel = 0;
  private readonly nav = new Nav();
  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  constructor(private readonly bag: Bag, private readonly content: Content, private readonly assets: Assets) {}

  update(input: Input, dt: number): boolean {
    if (input.pressed('back') || input.pressed('menu')) return false;
    const d = this.nav.step(input, dt);
    if (d) this.sel = gridMove(this.sel, d, COLS, this.bag.slots.length);
    return true;
  }

  private slotAt(i: number): { x: number; y: number } {
    return { x: this.x + 12 + (i % COLS) * (SLOT + 2), y: this.y + 30 + Math.floor(i / COLS) * (SLOT + 2) };
  }

  pointer(px: number, py: number, button: number): boolean {
    const i = this.bag.slots.findIndex((_, k) => inside(px, py, this.slotAt(k)));
    if (i >= 0) this.sel = i;
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  draw(r: Renderer): void {
    const { assets, content, bag } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    r.sprite('bag', this.x + 10, this.y + 8);
    drawText(r, assets, 'Bag', this.x + 30, this.y + 12);
    drawCoins(r, assets, bag.coins, this.x + W - 70, this.y + 8);
    bag.slots.forEach((s, i) => {
      const p = this.slotAt(i);
      drawSlot(r, p.x, p.y, i === this.sel);
      if (s) drawItem(r, assets, content, s.item, p.x, p.y, s.count);
    });
    const ix = this.x + 12 + COLS * (SLOT + 2) + 10;
    const s = bag.slots[this.sel];
    if (s) {
      const h = drawItemInfo(r, assets, content, s.item, ix, this.y + 32);
      drawText(r, assets, `x${s.count}`, ix, this.y + 36 + h);
      drawText(r, assets, `Worth ${content.sellPrice(s.item)} each`, ix, this.y + 48 + h);
    } else {
      r.ctx.globalAlpha = 0.6;
      drawText(r, assets, 'Empty slot', ix, this.y + 32);
      r.ctx.globalAlpha = 1;
    }
    const used = bag.slots.filter(Boolean).length;
    drawText(r, assets, `${used}/${bag.slots.length} slots`, ix, this.y + H - 20);
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
