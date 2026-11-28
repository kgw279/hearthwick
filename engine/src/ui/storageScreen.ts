/**
 * A storage container (crate, chest, cupboard...): its slots (left) and your bag (right). Choose a
 * stack to move all of it across; X (or right-click) moves just one. Left/right cross between the two
 * grids at their edges; B / Esc leave. What doesn't fit on the other side stays where it was.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Bag, Inventory } from '../state/inventory';
import { gridMove, inside } from './inventoryScreen';
import { drawItem, drawItemInfo, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText } from './text';

const BOX_COLS = 4;
const BAG_COLS = 6;
const GAP = 18;
const PAD = 12;
const TOP = 30;

type Pane = 'box' | 'bag';

export class StorageScreen implements Screen {
  private pane: Pane = 'box';
  private sel: Record<Pane, number> = { box: 0, bag: 0 };
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;

  constructor(
    private readonly title: string,
    private readonly box: Inventory,
    private readonly bag: Bag,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {}

  private rows(pane: Pane): number {
    return Math.ceil(this.inv(pane).slots.length / this.cols(pane));
  }

  private inv(pane: Pane): Inventory {
    return pane === 'box' ? this.box : this.bag;
  }

  private cols(pane: Pane): number {
    return pane === 'box' ? BOX_COLS : BAG_COLS;
  }

  private get w(): number {
    return PAD * 2 + (BOX_COLS + BAG_COLS) * (SLOT + 2) + GAP;
  }

  private get h(): number {
    return TOP + Math.max(this.rows('box'), this.rows('bag')) * (SLOT + 2) + 64;
  }

  private get x(): number {
    return Math.round((VIEW_W - this.w) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - this.h) / 2);
  }

  private slotAt(pane: Pane, i: number): { x: number; y: number } {
    const cols = this.cols(pane);
    const x0 = this.x + PAD + (pane === 'box' ? 0 : BOX_COLS * (SLOT + 2) + GAP);
    return { x: x0 + (i % cols) * (SLOT + 2), y: this.y + TOP + Math.floor(i / cols) * (SLOT + 2) };
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    if (input.pressed('back') || input.pressed('menu')) return false;
    const d = this.nav.step(input, dt);
    if (d) this.move(d);
    if (input.pressed('interact')) this.transfer(Infinity);
    if (input.pressed('cook')) this.transfer(1);
    return true;
  }

  private move(d: { x: number; y: number }): void {
    const { pane } = this;
    const cols = this.cols(pane);
    const i = this.sel[pane];
    // across the gap: from the box's right edge to the bag's left, and back, on the same row
    if (pane === 'box' && d.x > 0 && i % cols === cols - 1) return this.cross('bag', Math.floor(i / cols));
    if (pane === 'bag' && d.x < 0 && i % cols === 0) return this.cross('box', Math.floor(i / cols));
    this.sel[pane] = gridMove(i, d, cols, this.inv(pane).slots.length);
  }

  private cross(to: Pane, row: number): void {
    const cols = this.cols(to);
    const r = Math.min(row, this.rows(to) - 1);
    this.pane = to;
    this.sel[to] = Math.min(this.inv(to).slots.length - 1, r * cols + (to === 'bag' ? 0 : cols - 1));
  }

  /** Move up to n of the chosen stack to the other side. */
  private transfer(n: number): void {
    const from = this.inv(this.pane);
    const to = this.inv(this.pane === 'box' ? 'bag' : 'box');
    const s = from.slots[this.sel[this.pane]];
    if (!s) return;
    const moved = from.moveTo(this.sel[this.pane], n, to);
    if (!moved) this.say(this.pane === 'box' ? 'Your bag is full' : `The ${this.title.toLowerCase()} is full`);
  }

  private say(text: string): void {
    this.message = { text, until: this.time + 1.5 };
  }

  pointer(px: number, py: number, button: number): boolean {
    for (const pane of ['box', 'bag'] as Pane[]) {
      const i = this.inv(pane).slots.findIndex((_, k) => inside(px, py, this.slotAt(pane, k)));
      if (i < 0) continue;
      this.pane = pane;
      this.sel[pane] = i;
      if (button === 0) this.transfer(Infinity);
      if (button === 2) this.transfer(1);
      return true;
    }
    const outside = px < this.x || py < this.y || px >= this.x + this.w || py >= this.y + this.h;
    return !(button === 0 && outside);
  }

  draw(r: Renderer): void {
    const { assets, content } = this;
    r.nine('panel_dark', this.x, this.y, this.w, this.h);
    drawText(r, assets, this.title, this.x + PAD, this.y + 12);
    r.sprite('bag', this.slotAt('bag', 0).x, this.y + 8);
    drawText(r, assets, 'Bag', this.slotAt('bag', 0).x + 20, this.y + 12);
    for (const pane of ['box', 'bag'] as Pane[]) {
      this.inv(pane).slots.forEach((s, i) => {
        const p = this.slotAt(pane, i);
        drawSlot(r, p.x, p.y, pane === this.pane && i === this.sel[pane]);
        if (s) drawItem(r, assets, content, s.item, p.x, p.y, s.count);
      });
    }
    const iy = this.y + this.h - 50;
    const s = this.inv(this.pane).slots[this.sel[this.pane]];
    if (s) {
      drawItemInfo(r, assets, content, s.item, this.x + PAD, iy);
      r.ctx.globalAlpha = 0.6;
      drawText(r, assets, `x${s.count}`, this.x + PAD + 150, iy);
      r.ctx.globalAlpha = 1;
    }
    const hint = this.time < this.message.until ? this.message.text : 'Choose: move the stack   X / right-click: move one';
    r.ctx.globalAlpha = this.time < this.message.until ? 1 : 0.6;
    drawText(r, assets, hint, this.x + PAD, this.y + this.h - 16);
    r.ctx.globalAlpha = 1;
  }
}
