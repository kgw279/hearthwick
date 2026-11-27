/**
 * The editor's menu: a stack of pages of choices, plus a one-line text prompt (for naming maps).
 * Driven by actions (up/down, interact, back), so keyboard, mouse and controller all work: D-pad or
 * arrows move, A / E / Enter / click choose, B / Esc go back a page.
 */
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Assets } from '../core/assets';
import { drawText, measure } from '../ui/text';

export interface MenuItem {
  label: string;
  /** Run when chosen; return a page to open it on top, or nothing to close the whole menu. */
  run: () => MenuPage | void;
  disabled?: boolean;
  /** Short grey note after the label. */
  note?: string;
}
export interface MenuPage { title: string; items: MenuItem[] }

export interface Prompt {
  title: string;
  value: string;
  /** Allowed characters; anything else typed is ignored (space becomes _ for ids). */
  allowed: RegExp;
  done: (value: string) => void;
}

const ROW = 13;
const W = 220;

export class Menu {
  pages: Array<{ page: MenuPage; index: number }> = [];
  private prompt: Prompt | null = null;
  private rows: Array<{ y: number; i: number }> = [];
  private box = { x: 0, y: 0, w: 0, h: 0 };

  constructor() {
    // While a prompt is open, typed keys go to it and nowhere else (so "e" types an e, not "interact").
    window.addEventListener('keydown', (e) => {
      if (!this.prompt) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      const p = this.prompt;
      if (e.key === 'Enter') return this.finishPrompt();
      if (e.key === 'Escape') {
        this.prompt = null;
        return;
      }
      if (e.key === 'Backspace') p.value = p.value.slice(0, -1);
      else if (e.key.length === 1) {
        const ch = e.key === ' ' ? '_' : e.key.toLowerCase();
        if (p.allowed.test(ch) && p.value.length < 24) p.value += ch;
      }
    }, { capture: true });
  }

  get open(): boolean {
    return this.pages.length > 0 || !!this.prompt;
  }

  show(page: MenuPage): void {
    this.pages = [{ page, index: firstEnabled(page) }];
  }

  push(page: MenuPage): void {
    this.pages.push({ page, index: firstEnabled(page) });
  }

  close(): void {
    this.pages = [];
    this.prompt = null;
  }

  ask(prompt: Prompt): void {
    this.prompt = prompt;
  }

  private finishPrompt(): void {
    const p = this.prompt!;
    this.prompt = null;
    if (!p.value) return;
    this.pages = []; // accepted: the menu that asked is done too (cancelling a prompt returns to it)
    p.done(p.value);
  }

  update(input: Input): void {
    if (this.prompt) {
      // controller: A accepts the suggested name, B cancels (keys are handled by the listener above)
      if (input.device === 'gamepad') {
        if (input.pressed('interact')) this.finishPrompt();
        else if (input.pressed('back')) this.prompt = null;
      }
      return;
    }
    const top = this.pages[this.pages.length - 1];
    if (!top) return;
    if (input.pressed('back')) {
      this.pages.pop();
      return;
    }
    const n = top.page.items.length;
    const step = (d: number) => {
      for (let k = 1; k <= n; k++) {
        const i = (top.index + d * k + n * k) % n;
        if (!top.page.items[i].disabled) {
          top.index = i;
          return;
        }
      }
    };
    if (input.pressed('up')) step(-1);
    if (input.pressed('down')) step(1);
    if (input.pressed('interact')) this.choose(top.index);
  }

  private choose(i: number): void {
    const top = this.pages[this.pages.length - 1];
    const item = top?.page.items[i];
    if (!item || item.disabled) return;
    const next = item.run();
    if (next) this.push(next);
    else if (!this.prompt) this.close();
  }

  /** Mouse: hover highlights, click chooses. Returns true if the point is on the menu. */
  pointer(x: number, y: number, click: boolean): boolean {
    if (!this.open) return false;
    const b = this.box;
    if (x < b.x || y < b.y || x >= b.x + b.w || y >= b.y + b.h) {
      if (click && !this.prompt) this.close();
      return true;
    }
    const top = this.pages[this.pages.length - 1];
    const row = this.rows.find((r) => y >= r.y && y < r.y + ROW);
    if (top && row && !top.page.items[row.i].disabled) {
      top.index = row.i;
      if (click) this.choose(row.i);
    } else if (click && this.prompt) this.finishPrompt();
    return true;
  }

  draw(r: Renderer, assets: Assets, input: Input, time: number): void {
    if (this.prompt) return this.drawPrompt(r, assets, input, time);
    const top = this.pages[this.pages.length - 1];
    if (!top) return;
    const { page, index } = top;
    const h = 24 + page.items.length * ROW + 6;
    const x = Math.round((VIEW_W - W) / 2);
    const y = Math.round(Math.max(26, (VIEW_H - 80 - h) / 2));
    this.box = { x, y, w: W, h };
    r.nine('panel_dark', x, y, W, h);
    drawText(r, assets, page.title, x + 10, y + 8);
    r.rect(x + 8, y + 19, W - 16, 1, '#5a4d6e', true);
    this.rows = [];
    page.items.forEach((it, i) => {
      const ry = y + 23 + i * ROW;
      this.rows.push({ y: ry, i });
      if (i === index) r.rect(x + 6, ry - 1, W - 12, ROW, '#3d3150', true);
      const ctx = r.ctx;
      if (it.disabled) ctx.globalAlpha = 0.4;
      drawText(r, assets, (i === index ? '> ' : '  ') + it.label, x + 10, ry + 2);
      ctx.globalAlpha = 1;
      if (it.note) {
        ctx.globalAlpha = 0.6;
        drawText(r, assets, it.note, x + W - 10 - measure(it.note), ry + 2);
        ctx.globalAlpha = 1;
      }
    });
  }

  private drawPrompt(r: Renderer, assets: Assets, input: Input, time: number): void {
    const p = this.prompt!;
    const x = Math.round((VIEW_W - W) / 2);
    const y = 70;
    const h = 58;
    this.box = { x, y, w: W, h };
    r.nine('panel_dark', x, y, W, h);
    drawText(r, assets, p.title, x + 10, y + 8);
    r.rect(x + 10, y + 22, W - 20, 14, '#1b1520', true);
    const caret = Math.floor(time * 2) % 2 ? '_' : ' ';
    drawText(r, assets, p.value + caret, x + 14, y + 25);
    const hint = input.device === 'gamepad' ? 'A accept   B cancel' : 'Enter accept   Esc cancel';
    drawText(r, assets, hint, x + 10, y + 42);
  }
}

function firstEnabled(page: MenuPage): number {
  const i = page.items.findIndex((it) => !it.disabled);
  return i < 0 ? 0 : i;
}
