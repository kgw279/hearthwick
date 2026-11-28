/** Drawing a ready slot: a plated dish or drink, or a cleared place setting (its dirty dishes, piled). */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import type { Content } from '../game/data';
import { isSetting, type ReadySlot } from '../state/service';
import { drawItem } from './items';
import { drawText, measure } from './text';

export function drawReady(r: Renderer, assets: Assets, content: Content, s: ReadySlot | undefined, x: number, y: number): void {
  if (!s) return;
  if (!isSetting(s)) return drawItem(r, assets, content, s.dish, x, y);
  // a setting: its pieces stacked a little apart, and how many
  s.dirty.slice(0, 3).forEach((item, i) => {
    const { sheet, frame } = content.item(item).sprite;
    r.ctx.save();
    r.ctx.translate(x + 2 + i * 5, y + 2 + i * 3);
    r.ctx.scale(0.75, 0.75);
    r.sprite(`${sheet}/${frame}`, 0, 0);
    r.ctx.restore();
  });
  const t = String(s.dirty.length);
  drawText(r, assets, t, x + 34 - measure(t) - 1, y + 34 - 11);
}

/** A ready slot's name: the dish, or "(dirty dishes)". */
export function readyName(s: ReadySlot | undefined): string | undefined {
  if (!s) return undefined;
  return isSetting(s) ? '(dirty dishes)' : s.dish;
}
