/**
 * The player's journal (View / M, with no other menu open), in two tabs (LB / RB, Q / C, or a click):
 *  - Journal: the purse, the inn's renown and how it's coming along, how guests have found it, and a
 *    history of everything that's happened, newest first: guests arriving and leaving (what they had,
 *    what they paid, the renown it earned and why), buying and selling. Up / down scroll.
 *  - Recipe book: everything known, sorted by tag (see bookTab.ts).
 * B / Esc / View close.
 */
import type { Assets } from '../core/assets';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Bag } from '../state/inventory';
import type { Journal } from '../state/journal';
import type { Reputation } from '../state/reputation';
import type { Content } from '../game/data';
import type { Cookbook } from '../state/cookbook';
import { BookTab } from './bookTab';
import { drawCoins } from './items';
import { Nav, type Screen } from './screen';
import { drawText, measure, wrap } from './text';

const W = 464;
const H = 248;
const SIDE = 150;
const LINE = 11;

const TABS = ['Journal', 'Recipe book'] as const;

export class JournalScreen implements Screen {
  private tab: (typeof TABS)[number] = 'Journal';
  private scroll = 0; // lines from the newest
  private readonly nav = new Nav();
  private readonly book: BookTab;

  constructor(
    private readonly bag: Bag,
    private readonly renown: Reputation,
    private readonly journal: Journal,
    cookbook: Cookbook,
    content: Content,
    private readonly assets: Assets,
    first: 'Journal' | 'Recipe book' = 'Journal',
  ) {
    this.book = new BookTab(cookbook, content, assets);
    this.tab = first;
  }

  private tabAt(i: number): { x: number; y: number; w: number } {
    let x = this.x + 12;
    for (let k = 0; k < i; k++) x += measure(TABS[k]) + 22;
    return { x, y: this.y + 6, w: measure(TABS[i]) + 16 };
  }

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  /** The history as lines of text, newest first, wrapped to fit. */
  private lines(): Array<{ text: string; dim: boolean; gap: boolean }> {
    const width = W - SIDE - 30;
    const out: Array<{ text: string; dim: boolean; gap: boolean }> = [];
    for (const e of [...this.journal.entries].reverse()) {
      const sums = [e.coins ? `${e.coins > 0 ? '+' : ''}${e.coins} coins` : '', e.renown ? `+${e.renown} renown` : ''].filter(Boolean).join(', ');
      wrap(sums ? `${e.text}  (${sums})` : e.text, width).forEach((t, i) => out.push({ text: t, dim: false, gap: i === 0 && out.length > 0 }));
      if (e.detail) wrap(e.detail, width - 8).forEach((t) => out.push({ text: `  ${t}`, dim: true, gap: false }));
    }
    return out;
  }

  private get rows(): number {
    return Math.floor((H - 50) / LINE);
  }

  update(input: Input, dt: number): boolean {
    if (input.pressed('back') || input.pressed('map') || input.pressed('menu')) return false;
    if (input.pressed('tab_prev') || input.pressed('tab_next')) this.tab = this.tab === 'Journal' ? 'Recipe book' : 'Journal';
    const d = this.nav.step(input, dt);
    if (this.tab === 'Recipe book') {
      this.book.update(input);
      if (d) this.book.step(d, H - 40);
      return true;
    }
    const n = this.lines().length;
    if (d?.y) this.scroll = Math.max(0, Math.min(Math.max(0, n - this.rows), this.scroll + d.y * 3));
    return true;
  }

  pointer(px: number, py: number, button: number): boolean {
    TABS.forEach((t, i) => {
      const p = this.tabAt(i);
      if (button === 0 && px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + 18) this.tab = t;
    });
    if (this.tab === 'Recipe book' && button === 0) this.book.pointer(px, py, this.x + 12, this.y + 30, H - 40);
    const outside = px < this.x || py < this.y || px >= this.x + W || py >= this.y + H;
    return !(button === 0 && outside);
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

    // the inn at a glance
    let y = this.y + 32;
    drawCoins(r, assets, this.bag.coins, this.x + 12, y);
    y += 26;
    const rep = this.renown;
    drawText(r, assets, `Inn renown ${rep.level}`, this.x + 12, y);
    y += 12;
    const bw = SIDE - 24;
    r.rect(this.x + 12, y, bw, 5, '#45283c', true);
    r.rect(this.x + 12, y, Math.round(bw * rep.fill), 5, '#fbf236', true);
    for (let i = 1; i < 10; i++) r.rect(this.x + 12 + Math.round((bw * i) / 10), y, 1, 5, '#45283c', true);
    y += 9;
    r.ctx.globalAlpha = 0.7;
    drawText(r, assets, `${rep.points} of ${rep.need} to the next`, this.x + 12, y);
    r.ctx.globalAlpha = 1;
    y += 20;
    const left = this.journal.entries.filter((e) => e.kind === 'leave');
    const fed = left.filter((e) => (e.coins ?? 0) > 0).length;
    drawText(r, assets, `Guests served  ${fed}`, this.x + 12, y);
    y += 12;
    drawText(r, assets, `Guests seen  ${this.journal.entries.filter((e) => e.kind === 'arrive').length}`, this.x + 12, y);

    // the history
    const hx = this.x + SIDE + 10;
    r.rect(hx - 6, this.y + 28, 1, H - 44, '#45283c', true);
    const lines = this.lines();
    if (!lines.length) {
      r.ctx.globalAlpha = 0.6;
      drawText(r, assets, 'Nothing written here yet', hx, this.y + 30);
      r.ctx.globalAlpha = 1;
    }
    lines.slice(this.scroll, this.scroll + this.rows).forEach((l, i) => {
      if (l.dim) r.ctx.globalAlpha = 0.65;
      drawText(r, assets, l.text, hx, this.y + 30 + i * LINE);
      r.ctx.globalAlpha = 1;
    });
    if (this.scroll > 0) r.sprite('arrow_up', this.x + W - 18, this.y + 26);
    if (this.scroll + this.rows < lines.length) r.sprite('arrow_down', this.x + W - 18, this.y + H - 24);
    r.ctx.globalAlpha = 0.6;
    const hint = 'Up / down: scroll   LB / RB: tabs';
    drawText(r, assets, hint, this.x + W - 12 - measure(hint), this.y + 10);
    r.ctx.globalAlpha = 1;
  }
}
