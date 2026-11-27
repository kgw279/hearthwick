/** Reusable UI pieces drawn in screen space: button prompts, dialog box, emote pop-ups. */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import { VIEW_W, VIEW_H } from '../core/renderer';
import type { Action, Input } from '../core/input';
import { drawText, measure, wrap, LINE_HEIGHT } from './text';

/** A dark pill with the button glyph and a label, e.g. [A] Harvest. */
export function drawPrompt(r: Renderer, assets: Assets, input: Input, action: Action, label: string, cx: number, y: number, time: number): void {
  const glyph = input.glyph(action);
  const pulse = Math.floor(time * 3) % 2 === 1 && assets.has(`${glyph}_pressed`);
  const g = assets.frame(pulse ? `${glyph}_pressed` : glyph);
  const w = 6 + g.w + 4 + measure(label) + 5;
  const h = 22;
  const x = Math.round(cx - w / 2);
  r.nine('panel_dark', x, y, w, h);
  r.sprite(g, x + 4, y + (h - g.h) / 2);
  drawText(r, assets, label, x + 6 + g.w + 3, y + 6);
}

export class DialogBox {
  private pages: string[][] = [];
  private page = 0;
  private speaker = '';
  private openedAt = 0;

  get open(): boolean {
    return this.pages.length > 0;
  }

  show(text: string, speaker = '', time = 0): void {
    const lines = wrap(text, VIEW_W - 64);
    this.pages = [];
    for (let i = 0; i < lines.length; i += 3) this.pages.push(lines.slice(i, i + 3));
    this.page = 0;
    this.speaker = speaker;
    this.openedAt = time;
  }

  /** Advance or close; returns true while the box is still open. */
  advance(): boolean {
    this.page++;
    if (this.page >= this.pages.length) this.pages = [];
    return this.open;
  }

  draw(r: Renderer, assets: Assets, input: Input, time: number): void {
    if (!this.open) return;
    const x = 16;
    const h = 56;
    const y = VIEW_H - h - 10;
    const w = VIEW_W - 32;
    r.nine('panel_parchment', x, y, w, h);
    if (this.speaker) {
      const sw = measure(this.speaker) + 16;
      r.nine('ribbon_banner', x + 12, y - 8, Math.max(sw + 12, 48), 16);
      drawText(r, assets, this.speaker, x + 12 + (Math.max(sw + 12, 48) - measure(this.speaker)) / 2, y - 5);
    }
    this.pages[this.page].forEach((line, i) => drawText(r, assets, line, x + 14, y + 12 + i * (LINE_HEIGHT + 2), true));
    if (time - this.openedAt > 0.2) {
      const g = assets.frame(input.glyph('interact'));
      const bob = Math.floor(time * 3) % 2;
      r.sprite(g, x + w - g.w - 8, y + h - g.h - 6 + bob);
    }
  }
}

/** A short-lived emote bubble above a world position. */
export class Emotes {
  private items: Array<{ name: string; x: number; y: number; until: number; born: number }> = [];

  pop(name: string, x: number, y: number, time: number, duration = 1.2): void {
    this.items.push({ name, x, y, born: time, until: time + duration });
  }

  draw(r: Renderer, camX: number, camY: number, time: number): void {
    this.items = this.items.filter((e) => e.until > time);
    for (const e of this.items) {
      const rise = Math.min(1, (time - e.born) * 6) * 6;
      r.sprite(e.name, e.x - camX - 10, e.y - camY - 20 - rise);
    }
  }
}

/** Short text that rises and fades above a world position (e.g. "+ Wild wheat"). */
export class FloatTexts {
  private items: Array<{ text: string; x: number; y: number; born: number }> = [];

  pop(text: string, x: number, y: number, time: number): void {
    this.items.push({ text, x, y, born: time });
  }

  draw(r: Renderer, assets: Assets, camX: number, camY: number, time: number): void {
    this.items = this.items.filter((e) => time - e.born < 1.4);
    for (const e of this.items) {
      const age = time - e.born;
      const alpha = age < 1 ? 1 : 1 - (age - 1) / 0.4;
      r.ctx.globalAlpha = Math.max(0, alpha);
      drawText(r, assets, e.text, e.x - camX - measure(e.text) / 2, e.y - camY - 30 - age * 14);
      r.ctx.globalAlpha = 1;
    }
  }
}
