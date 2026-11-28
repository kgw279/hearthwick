/**
 * The recipe book, opened over a station with the View button (M): every recipe known there, what it
 * makes and what goes into it (dimmed where none is to hand). Choose one (A / E / click) to put its
 * ingredients into the station; B / Esc or View close the book.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import type { Content } from '../game/data';
import { drawItem, SLOT } from './items';
import { Nav } from './screen';
import { drawText } from './text';

const ROW = 36;

export interface Entry { out: string; inputs: string[] }

export class RecipeBook {
  open = false;
  private sel = 0;
  private scroll = 0;
  private readonly nav = new Nav();

  constructor(
    private readonly entries: () => Entry[],
    private readonly have: (item: string) => number,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {}

  /** While open: returns the recipe chosen, if one was; closes itself on B / View. */
  update(input: Input, dt: number, rows: number): Entry | null {
    if (input.pressed('back') || input.pressed('map')) {
      this.open = false;
      return null;
    }
    const list = this.entries();
    const d = this.nav.step(input, dt);
    if (d?.y) this.sel = Math.max(0, Math.min(list.length - 1, this.sel + d.y));
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + rows) this.scroll = this.sel - rows + 1;
    if (input.pressed('interact') && list[this.sel]) {
      this.open = false;
      return list[this.sel];
    }
    return null;
  }

  /** A click: the recipe under it, if any (and the book closes). */
  pointer(px: number, py: number, x: number, y: number, w: number, rows: number): Entry | null {
    const list = this.entries();
    for (let i = this.scroll; i < Math.min(list.length, this.scroll + rows); i++) {
      const ry = y + 18 + (i - this.scroll) * ROW;
      if (px >= x && px < x + w && py >= ry && py < ry + ROW - 2) {
        this.open = false;
        return list[i];
      }
    }
    return null;
  }

  draw(r: Renderer, x: number, y: number, w: number, rows: number): void {
    const { assets, content } = this;
    const list = this.entries();
    r.nine('panel_parchment', x - 6, y - 4, w + 12, 26 + rows * ROW);
    drawText(r, assets, `Recipe book  (${list.length} known)`, x, y + 2, true);
    if (!list.length) drawText(r, assets, 'Nothing known here yet', x, y + 22, true);
    for (let i = this.scroll; i < Math.min(list.length, this.scroll + rows); i++) {
      const e = list[i];
      const ry = y + 18 + (i - this.scroll) * ROW;
      r.nine(i === this.sel ? 'slot_selected' : 'slot', x, ry, w, ROW - 2);
      drawItem(r, assets, content, e.out, x, ry);
      drawText(r, assets, content.itemName(e.out), x + 36, ry + 12);
      e.inputs.forEach((item, k) => drawItem(r, assets, content, item, x + w - (e.inputs.length - k) * (SLOT - 2) - 2, ry, 1, this.have(item) < 1));
    }
    if (this.scroll > 0) r.sprite('arrow_up', x + w - 10, y + 6);
    if (this.scroll + rows < list.length) r.sprite('arrow_down', x + w - 10, y + 18 + rows * ROW - 6);
  }
}
