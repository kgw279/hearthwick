/**
 * Feedback that something happened: a "pop" bounces the item's icon in (big, settling to size) and
 * floats a line of text up. One look everywhere it's used (making something
 * at a station, plating, buying, serving, harvesting, levelling up), in screen space for menus or
 * world space (give it the camera) for things out in the inn and town.
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import type { Content } from '../game/data';
import { drawText, measure } from './text';

const LIFE = 0.6; // seconds a pop lasts (a big one, a little longer)

interface Pop { x: number; y: number; item?: string; text?: string; born: number; big: boolean }

export class Pops {
  private items: Pop[] = [];

  /** (x, y): the middle of where it happens. item: an icon to bounce in; text: what to say; big: lasts longer. */
  pop(x: number, y: number, time: number, opts: { item?: string; text?: string; big?: boolean } = {}): void {
    this.items.push({ x, y, born: time, item: opts.item, text: opts.text, big: !!opts.big });
  }

  /** Draw (and forget finished pops). camX/camY: the camera, for pops in the world. */
  draw(r: Renderer, assets: Assets, content: Content, time: number, camX = 0, camY = 0): void {
    this.items = this.items.filter((p) => time - p.born < LIFE * (p.big ? 1.5 : 1));
    const ctx = r.ctx;
    for (const p of this.items) {
      const age = time - p.born;
      const life = LIFE * (p.big ? 1.5 : 1);
      const k = age / life;
      const x = p.x - camX;
      const y = p.y - camY;
      // the item, bouncing in: big, then settling
      if (p.item && age < life * 0.8) {
        const t = Math.min(1, age / 0.22);
        const scale = 1 + 0.7 * (1 - t) * Math.cos(t * Math.PI * 1.5);
        const { sheet, frame } = content.item(p.item).sprite;
        ctx.save();
        ctx.globalAlpha = age > life * 0.6 ? Math.max(0, 1 - (age - life * 0.6) / (life * 0.2)) : 1;
        ctx.translate(Math.round(x), Math.round(y - Math.min(8, age * 20)));
        ctx.scale(scale, scale);
        r.sprite(`${sheet}/${frame}`, -16, -16);
        ctx.restore();
      }
      // the words, rising
      if (p.text) {
        const ty = Math.round(y - 22 - age * 16);
        ctx.globalAlpha = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
        const tx = Math.max(4, Math.round(x - measure(p.text) / 2)); // kept on screen
        r.rect(tx - 3, ty - 2, measure(p.text) + 6, 12, '#45283c', true);
        drawText(r, assets, p.text, tx, ty);
        ctx.globalAlpha = 1;
      }
    }
  }
}
