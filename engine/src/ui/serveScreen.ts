/**
 * Plating at the serving counter: every dish you have the components for (left, like a shop's shelf),
 * and the chosen one's details (right): what goes on the plate and how many of each are to hand (the
 * inn's stores and the bag). Plating also takes a clean plate (a mug for a drink; a bowl if there are no
 * plates), and the dish waits on the counter (shown along the top) for a guest. Choose (A / E / click)
 * plates one; X / right-click plates five. B / Esc leave.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content } from '../game/data';
import type { Blocker, Kitchen } from '../state/kitchen';
import { drawItem, drawItemInfo, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawText, measure } from './text';

const W = 464;
const H = 240;
const ROW = 36;
const ROWS = 5;
const LIST_W = 214;
const TOP = 30;
const BATCH = 5;

interface Line { out: string; inputs: string[]; blocked: Blocker }

export class ServeScreen implements Screen {
  private sel = 0;
  private scroll = 0;
  private lines: Line[] = [];
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private time = 0;

  constructor(
    private readonly kitchen: Kitchen,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {
    this.refresh();
  }

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  /** Rebuild the list (after making something, what can be made changes), keeping the selection on the same thing. */
  private refresh(): void {
    const keep = this.lines[this.sel]?.out;
    const k = this.kitchen;
    this.lines = k.plateable().map((d) => ({ out: d, inputs: this.content.dish(d).components, blocked: k.canPlate(d) }));
    const i = keep ? this.lines.findIndex((l) => l.out === keep) : -1;
    this.sel = Math.max(0, Math.min(i >= 0 ? i : this.sel, this.lines.length - 1));
    this.keepVisible();
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    if (input.pressed('back') || input.pressed('menu')) return false;
    const d = this.nav.step(input, dt);
    if (d?.y) {
      this.sel = Math.max(0, Math.min(this.lines.length - 1, this.sel + d.y));
      this.keepVisible();
    }
    if (input.pressed('interact')) this.make(1);
    if (input.pressed('cook')) this.make(BATCH);
    return true;
  }

  private keepVisible(): void {
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + ROWS) this.scroll = this.sel - ROWS + 1;
  }

  /** Plate up to n of the chosen dish, stopping at the first thing that's short. */
  private make(n: number): void {
    const line = this.lines[this.sel];
    if (!line) return;
    let made = 0;
    let why: Blocker = null;
    for (; made < n; made++) {
      why = this.kitchen.plate(line.out);
      if (why) break;
    }
    const name = this.content.itemName(line.out);
    if (made) this.say(`Plated ${made > 1 ? `${made} ` : ''}${name}${why && n > 1 ? `  (${why.toLowerCase()})` : ''}`);
    else this.say(why ?? '');
    this.refresh();
  }

  private say(text: string): void {
    this.message = { text, until: this.time + 2 };
  }

  private rowAt(i: number): { x: number; y: number } {
    return { x: this.x + 10, y: this.y + TOP + 20 + (i - this.scroll) * ROW };
  }

  private rows(): number {
    return ROWS - 1;
  }

  pointer(px: number, py: number, button: number): boolean {
    for (let i = this.scroll; i < Math.min(this.lines.length, this.scroll + this.rows()); i++) {
      const p = this.rowAt(i);
      if (px >= p.x && px < p.x + LIST_W && py >= p.y && py < p.y + ROW - 2) {
        this.sel = i;
        if (button === 0) this.make(1);
        if (button === 2) this.make(BATCH);
        return true;
      }
    }
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  draw(r: Renderer): void {
    const { assets, content, kitchen } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, 'Serving counter', this.x + 12, this.y + 10);
    {
      // what's already waiting on the counter
      const plated = kitchen.serving.contents();
      const label = `On the counter ${kitchen.serving.plated.length}/${kitchen.serving.capacity}:`;
      drawText(r, assets, label, this.x + 110, this.y + 10);
      let px = this.x + 116 + measure(label);
      if (!plated.length) {
        r.ctx.globalAlpha = 0.6;
        drawText(r, assets, 'nothing yet', px, this.y + 10);
        r.ctx.globalAlpha = 1;
      }
      for (const p of plated.slice(0, 7)) {
        drawItem(r, assets, content, p.item, px, this.y + 2, p.count);
        px += SLOT;
      }
    }

    const rows = this.rows();
    if (!this.lines.length) {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'Nothing to plate: prep some food first', this.x + 12, this.rowAt(0).y + 8);
      r.ctx.globalAlpha = 1;
    }
    for (let i = this.scroll; i < Math.min(this.lines.length, this.scroll + rows); i++) {
      const line = this.lines[i];
      const p = this.rowAt(i);
      r.nine(i === this.sel ? 'slot_selected' : 'slot', p.x, p.y, LIST_W, ROW - 2);
      drawItem(r, assets, content, line.out, p.x, p.y, 1, !!line.blocked);
      if (line.blocked) r.ctx.globalAlpha = 0.6;
      drawText(r, assets, content.itemName(line.out), p.x + 38, p.y + 6);
      drawText(r, assets, line.blocked ?? 'Ready to plate', p.x + 38, p.y + 19);
      r.ctx.globalAlpha = 1;
    }
    if (this.scroll > 0) r.sprite('arrow_up', this.x + LIST_W - 8, this.rowAt(this.scroll).y - 10);
    if (this.scroll + rows < this.lines.length) r.sprite('arrow_down', this.x + LIST_W - 8, this.rowAt(this.scroll + rows).y - 4);

    // the chosen one: what it is, what goes in (to hand / needed), where it goes
    const line = this.lines[this.sel];
    const bx = this.x + LIST_W + 26;
    if (line) {
      let by = this.rowAt(this.scroll).y + 2;
      by += drawItemInfo(r, assets, content, line.out, bx, by) + 4;
      drawText(r, assets, 'Needs', bx, by);
      by += 12;
      const needs = kitchen.needs(line.inputs);
      const ware = kitchen.ware(line.out);
      needs.push({ item: ware ?? (content.dish(line.out).kind === 'drink' ? 'wood_mug' : 'wood_plate'), count: 1 });
      needs.forEach((n, i) => {
        const sx = bx + i * (SLOT + 4);
        const have = kitchen.have(n.item);
        drawSlot(r, sx, by, false);
        drawItem(r, assets, content, n.item, sx, by, 1, have < n.count);
        const t = `${have}/${n.count}`;
        if (have < n.count) r.ctx.globalAlpha = 0.6;
        drawText(r, assets, t, sx + (SLOT - measure(t)) / 2, by + SLOT + 2);
        r.ctx.globalAlpha = 1;
      });
      by += SLOT + 18;
      drawText(r, assets, `Served ${content.dish(line.out).kind === 'drink' ? 'in a mug' : 'on a plate'}`, bx, by);
    }
    const msg = this.time < this.message.until;
    const hint = msg ? this.message.text : 'Choose: plate one   X: plate five';
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, hint, this.x + 12, this.y + H - 18);
    r.ctx.globalAlpha = 1;
  }
}
