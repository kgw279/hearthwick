/**
 * The recipe book (a tab of the journal): everything the player has come across or knows how to make,
 * sorted by tag. A row of tag icons along the top (All, the courses, how things are cooked, how they
 * taste): left / right (or LT / RT, or a click) picks one, and the list shows only what has that tag.
 * Working out what to serve is cross-referencing: a guest wants a hearty snack, so look under Snacks for
 * the ones with the Hearty icon. Up / down pick a thing; beside the list, what it is and how to make it
 * (each way known), or where a raw ingredient comes from.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { COURSE_NAMES, type Content } from '../game/data';
import type { Cookbook } from '../state/cookbook';
import { drawItem, SLOT } from './items';
import { drawTag, drawTags, TAG_NAMES, TAG_SIZE, TAGS, tagsOf, type Tag } from './tags';
import { drawText, measure, wrap } from './text';

const ROW = 18;
const LIST_W = 214;
const TABS: Array<Tag | 'all'> = ['all', ...TAGS];

export class BookTab {
  private tag = 0;
  private sel = 0;
  private scroll = 0;

  constructor(private readonly cookbook: Cookbook, private readonly content: Content, private readonly assets: Assets) {}

  /** What's listed under the chosen tag, by name. */
  private list(): string[] {
    const t = TABS[this.tag];
    return this.cookbook.everything()
      .filter((id) => t === 'all' || tagsOf(this.content, id).includes(t))
      .sort((a, b) => this.content.itemName(a).localeCompare(this.content.itemName(b)));
  }

  private rows(h: number): number {
    return Math.floor((h - 34) / ROW);
  }

  /** d: a step from the D-pad / stick / keys. */
  step(d: { x: number; y: number }, h: number): void {
    if (d.x) this.pickTag(this.tag + d.x);
    if (d.y) {
      const n = this.list().length;
      this.sel = Math.max(0, Math.min(n - 1, this.sel + d.y));
      const rows = this.rows(h);
      if (this.sel < this.scroll) this.scroll = this.sel;
      if (this.sel >= this.scroll + rows) this.scroll = this.sel - rows + 1;
    }
  }

  update(input: Input): void {
    if (input.pressed('cat_prev')) this.pickTag(this.tag - 1);
    if (input.pressed('cat_next')) this.pickTag(this.tag + 1);
  }

  private pickTag(i: number): void {
    this.tag = (i + TABS.length) % TABS.length;
    this.sel = 0;
    this.scroll = 0;
  }

  private tabAt(x: number, y: number, i: number): { x: number; y: number } {
    return { x: x + (i === 0 ? 0 : 22 + (i - 1) * (TAG_SIZE + 4)), y };
  }

  pointer(px: number, py: number, x: number, y: number, h: number): void {
    TABS.forEach((_, i) => {
      const p = this.tabAt(x, y, i);
      const w = i === 0 ? 18 : TAG_SIZE;
      if (px >= p.x && px < p.x + w && py >= p.y && py < p.y + TAG_SIZE + 2) this.pickTag(i);
    });
    const ly = y + 30;
    const i = this.scroll + Math.floor((py - ly) / ROW);
    if (px >= x && px < x + LIST_W && py >= ly && i < Math.min(this.list().length, this.scroll + this.rows(h))) this.sel = i;
  }

  /** Draw in the box at (x, y), w by h. */
  draw(r: Renderer, x: number, y: number, w: number, h: number): void {
    const { assets, content } = this;
    // the tag tabs
    TABS.forEach((t, i) => {
      const p = this.tabAt(x, y, i);
      const on = i === this.tag;
      if (on) r.rect(p.x - 2, p.y - 2, (i === 0 ? 18 : TAG_SIZE) + 4, TAG_SIZE + 4, '#fbf236', true);
      if (t === 'all') {
        r.rect(p.x, p.y, 18, TAG_SIZE, '#45283c', true);
        drawText(r, assets, 'All', p.x + 2, p.y + 1);
      } else drawTag(r, t, p.x, p.y);
    });
    const t = TABS[this.tag];
    const list = this.list();
    drawText(r, assets, `${t === 'all' ? 'Everything' : TAG_NAMES[t]}  (${list.length})`, x, y + 17);

    // the list
    const ly = y + 30;
    const rows = this.rows(h);
    if (!list.length) {
      r.ctx.globalAlpha = 0.6;
      drawText(r, assets, 'Nothing you know of yet', x, ly + 4);
      r.ctx.globalAlpha = 1;
    }
    list.slice(this.scroll, this.scroll + rows).forEach((id, k) => {
      const i = this.scroll + k;
      const ry = ly + k * ROW;
      if (i === this.sel) r.nine('slot_selected', x - 2, ry - 1, LIST_W, ROW);
      const { sheet, frame } = content.item(id).sprite;
      r.ctx.save();
      r.ctx.translate(x, ry);
      r.ctx.scale(0.5, 0.5);
      r.sprite(`${sheet}/${frame}`, 0, 0);
      r.ctx.restore();
      const tags = tagsOf(content, id);
      const tw = tags.length * (TAG_SIZE + 1);
      let name = content.itemName(id);
      while (name.length > 3 && measure(name) > LIST_W - 26 - tw) name = name.slice(0, -1);
      drawText(r, assets, name === content.itemName(id) ? name : `${name}.`, x + 19, ry + 3);
      drawTags(r, tags, x + LIST_W - 4 - tw, ry + 2);
    });
    if (this.scroll > 0) r.sprite('arrow_up', x + LIST_W - 12, ly - 12);
    if (this.scroll + rows < list.length) r.sprite('arrow_down', x + LIST_W - 12, ly + rows * ROW - 6);

    // the chosen thing: what it is, how it's made (or where it's found)
    const id = list[this.sel];
    if (!id) return;
    const dx = x + LIST_W + 12;
    const dw = w - LIST_W - 12;
    let dy = y + 26;
    drawItem(r, assets, content, id, dx, dy);
    wrap(content.itemName(id), dw - SLOT - 6).slice(0, 2).forEach((l, i) => drawText(r, assets, l, dx + SLOT + 4, dy + 4 + i * 11));
    dy += SLOT + 4;
    const tags = tagsOf(content, id);
    drawTags(r, tags, dx, dy);
    r.ctx.globalAlpha = 0.75;
    wrap(tags.map((tg) => tg).join(', '), dw).slice(0, 2).forEach((l, i) => drawText(r, assets, l, dx, dy + 15 + i * 11));
    r.ctx.globalAlpha = 1;
    dy += 40;
    if (content.servable(id)) {
      drawText(r, assets, `Served as a ${COURSE_NAMES[content.course(id)]}`, dx, dy);
      dy += 14;
    }
    const ways = this.cookbook.ways(id);
    const item = content.items[id];
    if (ways.length) {
      for (const way of ways.slice(0, 2)) {
        drawText(r, assets, `${content.stations[way.station]?.name ?? way.station}:`, dx, dy);
        way.inputs.forEach((inp, k) => drawItem(r, assets, content, inp, dx + k * (SLOT - 2), dy + 10));
        dy += SLOT + 14;
      }
    } else if (item?.kind === 'raw') {
      const from = (item.sources ?? []).map((s) => (s.shop ? content.shops[s.shop]?.name : s.spot ? content.spotNames[s.spot] : undefined))
        .filter((n): n is string => !!n);
      r.ctx.globalAlpha = 0.8;
      wrap(`An ingredient. ${from.length ? `Found at ${[...new Set(from)].join(', ')}` : ''}`, dw).forEach((l, i) => drawText(r, assets, l, dx, dy + i * 11));
      r.ctx.globalAlpha = 1;
    } else {
      r.ctx.globalAlpha = 0.7;
      wrap("You haven't worked out how to make this yet", dw).forEach((l, i) => drawText(r, assets, l, dx, dy + i * 11));
      r.ctx.globalAlpha = 1;
    }
  }
}
