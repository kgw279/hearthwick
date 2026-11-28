/**
 * The player's journal (View / M, with no other menu open), in two tabs (LB / RB, Q / C, or a click):
 *  - Journal: the inn's guests. At the side, the purse, the inn's renown and how it's coming along, and
 *    how many guests have been and how many went away fed. Beside it, every visit, newest first, laid out
 *    like the serving menu: who, what they wanted (and got), how it ended, the coins and renown it brought.
 *    Choose one (A / click) for the whole story: each course, what came and how well it fit, what they
 *    said on the way out (a hint at what they'd have liked), and each reason behind the renown.
 *  - Recipe book: everything known, sorted by tag (see bookTab.ts).
 * B / Esc / View close (or step back from a visit).
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Content, Course } from '../game/data';
import type { Cookbook } from '../state/cookbook';
import type { Bag } from '../state/inventory';
import type { Reputation } from '../state/reputation';
import type { Guest, Service } from '../state/service';
import { BookTab } from './bookTab';
import { drawCoins, drawItem, drawSlot, SLOT } from './items';
import { Nav, type Screen } from './screen';
import { drawTag, TAG_SIZE } from './tags';
import { drawText, measure, wrap } from './text';

const W = 464;
const H = 248;
const SIDE = 128;
const ROW = 42;
const TABS = ['Journal', 'Recipe book'] as const;

export class JournalScreen implements Screen {
  private tab: (typeof TABS)[number] = 'Journal';
  private sel = 0;
  private scroll = 0;
  /** The visit opened for its whole story, if one is. */
  private open: Guest | null = null;
  private readonly nav = new Nav();
  private readonly book: BookTab;

  constructor(
    private readonly bag: Bag,
    private readonly renown: Reputation,
    private readonly service: Service,
    cookbook: Cookbook,
    private readonly content: Content,
    private readonly assets: Assets,
  ) {
    this.book = new BookTab(cookbook, content, assets);
  }

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  private tabAt(i: number): { x: number; y: number; w: number } {
    let x = this.x + 12;
    for (let k = 0; k < i; k++) x += measure(TABS[k]) + 22;
    return { x, y: this.y + 6, w: measure(TABS[i]) + 16 };
  }

  /** Every visit, newest first. */
  private visits(): Guest[] {
    return [...this.service.visits].reverse();
  }

  private get rows(): number {
    return Math.floor((H - 40) / ROW);
  }

  private rowAt(i: number): { x: number; y: number } {
    return { x: this.x + SIDE + 8, y: this.y + 30 + (i - this.scroll) * ROW };
  }

  update(input: Input, dt: number): boolean {
    if (input.pressed('back') || input.pressed('map') || input.pressed('menu')) {
      if (!this.open) return false;
      this.open = null;
      return true;
    }
    if (input.pressed('tab_prev') || input.pressed('tab_next')) {
      this.tab = this.tab === 'Journal' ? 'Recipe book' : 'Journal';
      this.open = null;
    }
    const d = this.nav.step(input, dt);
    if (this.tab === 'Recipe book') {
      this.book.update(input);
      if (d) this.book.step(d, H - 40);
      return true;
    }
    if (this.open) return true;
    const n = this.visits().length;
    if (d?.y) {
      this.sel = Math.max(0, Math.min(n - 1, this.sel + d.y));
      if (this.sel < this.scroll) this.scroll = this.sel;
      if (this.sel >= this.scroll + this.rows) this.scroll = this.sel - this.rows + 1;
    }
    if (input.pressed('interact')) this.open = this.visits()[this.sel] ?? null;
    return true;
  }

  pointer(px: number, py: number, button: number): boolean {
    TABS.forEach((t, i) => {
      const p = this.tabAt(i);
      if (button === 0 && px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + 18) {
        this.tab = t;
        this.open = null;
      }
    });
    if (this.tab === 'Recipe book' && button === 0) this.book.pointer(px, py, this.x + 12, this.y + 30, H - 40);
    if (this.tab === 'Journal' && !this.open) {
      const v = this.visits();
      for (let i = this.scroll; i < Math.min(v.length, this.scroll + this.rows); i++) {
        const p = this.rowAt(i);
        if (px < p.x || px >= this.x + W - 10 || py < p.y || py >= p.y + ROW - 2) continue;
        this.sel = i;
        if (button === 0) this.open = v[i];
        return true;
      }
    }
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
  }

  /** How a visit stands, in a few words. */
  private status(g: Guest): string {
    const o = g.outcome;
    if (!o) return g.state === 'arriving' ? 'Coming in' : g.state === 'eating' ? 'Eating' : 'Waiting';
    if (o.how === 'gave up') return 'Gave up waiting';
    if (o.how === 'dismissed') return 'Sent on their way';
    return o.mood >= 0.95 ? 'Left delighted' : o.mood >= 0.7 ? 'Left happy' : 'Left content';
  }

  /** A course slot as the serving menu shows it: what came, what was asked for (dimmed), or the kind. */
  private drawCourse(r: Renderer, g: Guest, c: Course, x: number, y: number): void {
    const { assets, content } = this;
    drawSlot(r, x, y, false);
    const got = g.got[c];
    const w = g.order[c]!;
    if (got) drawItem(r, assets, content, got.dish, x, y);
    else if (w.dish) drawItem(r, assets, content, w.dish, x, y, 1, true);
    else {
      if (w.trait) {
        drawTag(r, c, x + 3, y + 3);
        drawTag(r, w.trait, x + SLOT - TAG_SIZE - 3, y + 3);
      } else drawTag(r, c, x + Math.round((SLOT - TAG_SIZE) / 2), y + 3);
      r.ctx.globalAlpha = 0.75;
      const label = w.trait ?? 'any';
      drawText(r, assets, label, x + Math.round((SLOT - measure(label)) / 2), y + 18);
      r.ctx.globalAlpha = 1;
    }
  }

  draw(r: Renderer): void {
    const { assets } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    TABS.forEach((t, i) => {
      const p = this.tabAt(i);
      r.nine(t === this.tab ? 'slot_selected' : 'slot', p.x, p.y, p.w, 18);
      drawText(r, assets, t, p.x + 8, p.y + 4);
    });
    if (this.tab === 'Recipe book') {
      this.book.draw(r, this.x + 12, this.y + 30, W - 24, H - 40);
      return;
    }
    this.drawSide(r);
    if (this.open) this.drawVisit(r, this.open);
    else this.drawVisits(r);
  }

  /** The inn at a glance. */
  private drawSide(r: Renderer): void {
    const { assets } = this;
    let y = this.y + 32;
    drawCoins(r, assets, this.bag.coins, this.x + 12, y);
    y += 24;
    const rep = this.renown;
    drawText(r, assets, `Inn renown ${rep.level}`, this.x + 12, y);
    y += 12;
    const bw = SIDE - 22;
    r.rect(this.x + 12, y, bw, 5, '#45283c', true);
    r.rect(this.x + 12, y, Math.round(bw * rep.fill), 5, '#fbf236', true);
    for (let i = 1; i < 10; i++) r.rect(this.x + 12 + Math.round((bw * i) / 10), y, 1, 5, '#45283c', true);
    y += 9;
    r.ctx.globalAlpha = 0.7;
    drawText(r, assets, `${rep.points} of ${rep.need}`, this.x + 12, y);
    r.ctx.globalAlpha = 1;
    y += 20;
    const done = this.service.visits.filter((g) => g.outcome);
    drawText(r, assets, `Guests  ${this.service.visits.length}`, this.x + 12, y);
    drawText(r, assets, `Fed  ${done.filter((g) => g.outcome!.how === 'paid').length}`, this.x + 12, y + 12);
    r.rect(this.x + SIDE, this.y + 28, 1, H - 40, '#45283c', true);
  }

  private drawVisits(r: Renderer): void {
    const { assets, content, service } = this;
    const v = this.visits();
    if (!v.length) {
      r.ctx.globalAlpha = 0.6;
      drawText(r, assets, 'No guests yet', this.x + SIDE + 10, this.y + 32);
      r.ctx.globalAlpha = 1;
    }
    const lw = W - SIDE - 18;
    for (let i = this.scroll; i < Math.min(v.length, this.scroll + this.rows); i++) {
      const g = v[i];
      const p = this.rowAt(i);
      r.nine(i === this.sel ? 'slot_selected' : 'slot', p.x, p.y, lw, ROW - 2);
      r.sprite(`${g.look}_down_idle`, p.x + 2, p.y + 4);
      drawText(r, assets, content.folk[g.folk]?.name ?? g.folk, p.x + 36, p.y + 5);
      r.ctx.globalAlpha = 0.75;
      drawText(r, assets, this.status(g), p.x + 36, p.y + 16);
      r.ctx.globalAlpha = 1;
      const o = g.outcome;
      if (o && (o.coins || o.renown)) drawText(r, assets, [o.coins ? `+${o.coins}c` : '', o.renown ? `+${o.renown}r` : ''].filter(Boolean).join(' '), p.x + 36, p.y + 27);
      const wants = service.wants(g);
      wants.forEach((c, k) => this.drawCourse(r, g, c, p.x + lw - 4 - (wants.length - k) * (SLOT + 2), p.y + 3));
    }
    if (this.scroll > 0) r.sprite('arrow_up', this.x + W - 18, this.y + 26);
    if (this.scroll + this.rows < v.length) r.sprite('arrow_down', this.x + W - 18, this.y + H - 16);
  }

  /** One visit's whole story. */
  private drawVisit(r: Renderer, g: Guest): void {
    const { assets, content, service } = this;
    const x = this.x + SIDE + 10;
    const w = W - SIDE - 22;
    let y = this.y + 30;
    r.sprite(`${g.look}_down_idle`, x, y);
    drawText(r, assets, content.folk[g.folk]?.name ?? g.folk, x + 36, y + 4);
    r.ctx.globalAlpha = 0.75;
    drawText(r, assets, `${this.status(g)}${g.bar ? ', at the bar' : ''}`, x + 36, y + 16);
    r.ctx.globalAlpha = 1;
    y += 36;
    // each course: what they wanted, what came, how it fit
    for (const c of service.wants(g)) {
      this.drawCourse(r, g, c, x, y);
      const got = g.got[c];
      drawText(r, assets, `Wanted ${service.describe(c, g.order[c]!)}`, x + SLOT + 6, y + 5);
      r.ctx.globalAlpha = 0.75;
      const fit = !got ? 'Never came' : got.fit === 'right' ? `Had ${content.itemName(got.dish)}: just right`
        : got.fit === 'not asked' ? `Had ${content.itemName(got.dish)}: not what they asked` : `Had ${content.itemName(got.dish)}: the wrong course`;
      drawText(r, assets, fit, x + SLOT + 6, y + 17);
      r.ctx.globalAlpha = 1;
      y += SLOT + 4;
    }
    const o = g.outcome;
    if (!o) return;
    y += 2;
    wrap(`"${o.remark}"`, w).forEach((l) => {
      drawText(r, assets, l, x, y);
      y += 11;
    });
    const sums = [o.coins ? `${o.coins} coins` : 'no coins', `${o.renown} renown`].join(', ');
    drawText(r, assets, sums, x, y + 2);
    y += 14;
    r.ctx.globalAlpha = 0.7;
    wrap(o.awards.map((a) => `${a.why} ${a.points > 0 ? '+' : ''}${a.points}`).join(', '), w).forEach((l) => {
      if (y < this.y + H - 12) drawText(r, assets, l, x, y);
      y += 11;
    });
    r.ctx.globalAlpha = 1;
  }
}
