/**
 * Naming something (a guest room, on the plaque by its door). On a keyboard, just type: Enter keeps it,
 * Esc leaves it as it was, Backspace takes a letter off. With a pad, pick letters from the grid: A adds
 * the chosen one, X takes one off, Y adds a space, Menu keeps it, B leaves it as it was. Each word starts
 * with a capital.
 */
import type { Assets } from '../core/assets';
import type { Device, Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import { hint } from './buttons';
import { Nav, type Screen } from './screen';
import { drawText, measure } from './text';

const W = 300;
const H = 150;
const MAX = 18; // letters
const KEYS = "abcdefghijklmnopqrstuvwxyz'-";
const COLS = 10;
const CELL = 18;

export class NameScreen implements Screen {
  private text: string;
  private sel = 0;
  private time = 0;
  private device: Device = 'keyboard';
  private readonly nav = new Nav();
  private done = false;
  private readonly onKey = (e: KeyboardEvent) => this.key(e);

  /** keep: called with the name once it's kept (not if it's left as it was). */
  constructor(
    private readonly title: string,
    name: string,
    private readonly keep: (name: string) => void,
    private readonly assets: Assets,
  ) {
    this.text = name;
    window.addEventListener('keydown', this.onKey, true);
  }

  private close(kept: boolean): void {
    if (this.done) return;
    this.done = true;
    window.removeEventListener('keydown', this.onKey, true);
    const name = this.text.trim();
    if (kept && name) this.keep(name);
  }

  /** Typed on a keyboard: taken here (so letters aren't buttons). */
  private key(e: KeyboardEvent): void {
    if (this.done) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // the game's own key handling doesn't see it
    this.device = 'keyboard';
    if (e.key === 'Enter') this.close(true);
    else if (e.key === 'Escape') this.close(false);
    else if (e.key === 'Backspace') this.text = this.text.slice(0, -1);
    else if (e.key.length === 1 && /[a-zA-Z0-9' -]/.test(e.key)) this.add(e.key);
  }

  /** Add a letter (a capital at the start of a word). */
  private add(ch: string): void {
    if (this.text.length >= MAX) return;
    const start = !this.text || this.text.endsWith(' ');
    if (ch === ' ' && start) return;
    this.text += start ? ch.toUpperCase() : ch;
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    if (this.done) return false;
    if (input.device !== 'gamepad') return true; // the keyboard types (see key)
    this.device = 'gamepad';
    if (input.pressed('back')) this.close(false);
    else if (input.pressed('menu')) this.close(true);
    else {
      const d = this.nav.step(input, dt);
      if (d) {
        const n = KEYS.length;
        this.sel = Math.max(0, Math.min(n - 1, this.sel + d.x + d.y * COLS));
      }
      if (input.pressed('interact')) this.add(KEYS[this.sel]);
      if (input.pressed('cook')) this.text = this.text.slice(0, -1);
      if (input.pressed('recipes')) this.add(' ');
    }
    return !this.done;
  }

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  pointer(px: number, py: number, button: number): boolean {
    if (button !== 0) return !this.done;
    for (let i = 0; i < KEYS.length; i++) {
      const c = this.cellAt(i);
      if (px >= c.x && py >= c.y && px < c.x + CELL - 2 && py < c.y + CELL - 2) {
        this.sel = i;
        this.add(KEYS[i]);
      }
    }
    return !this.done;
  }

  private cellAt(i: number): { x: number; y: number } {
    return { x: this.x + 14 + (i % COLS) * CELL, y: this.y + 62 + Math.floor(i / COLS) * CELL };
  }

  draw(r: Renderer): void {
    const { assets } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, this.title, this.x + 12, this.y + 10);
    // the name so far, with a blinking caret
    r.nine('slot', this.x + 12, this.y + 28, W - 24, 22);
    const caret = Math.floor(this.time * 2) % 2 ? '' : '_';
    drawText(r, assets, `${this.text}${caret}`, this.x + 18, this.y + 34);
    if (this.device === 'gamepad') {
      for (let i = 0; i < KEYS.length; i++) {
        const c = this.cellAt(i);
        r.nine(i === this.sel ? 'slot_selected' : 'slot', c.x, c.y, CELL - 2, CELL - 2);
        drawText(r, assets, KEYS[i], c.x + Math.round((CELL - 2 - measure(KEYS[i])) / 2), c.y + 4);
      }
    } else {
      r.ctx.globalAlpha = 0.7;
      drawText(r, assets, 'Type a name', this.x + 12, this.y + 66);
      r.ctx.globalAlpha = 1;
    }
    const help = this.device === 'gamepad'
      ? hint('gamepad', [['interact', 'letter'], ['recipes', 'space'], ['cook', 'rub out'], ['menu', 'keep'], ['back', 'cancel']])
      : 'Enter: keep   Backspace: rub out   Esc: cancel';
    r.ctx.globalAlpha = 0.6;
    drawText(r, assets, help, this.x + 12, this.y + H - 16);
    r.ctx.globalAlpha = 1;
  }
}
