/** Drawing items: icons in slots with stack counts, item details, the coin purse. */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import type { Content } from '../game/data';
import { drawText, measure } from './text';
import { drawTags, tagsOf } from './tags';

export const SLOT = 34;

export function drawSlot(r: Renderer, x: number, y: number, selected: boolean): void {
  r.nine(selected ? 'slot_selected' : 'slot', x, y, SLOT, SLOT);
}

/** A 32px item icon centred in a slot at (x, y), with its count bottom-right when more than one. */
export function drawItem(r: Renderer, assets: Assets, content: Content, item: string, x: number, y: number, count = 1, dim = false): void {
  if (dim) r.ctx.globalAlpha = 0.4;
  const { sheet, frame } = content.item(item).sprite;
  r.sprite(`${sheet}/${frame}`, x + 1, y + 1); // qualified: some item names are also tile names (water)
  r.ctx.globalAlpha = 1;
  if (count > 1) {
    const t = String(count);
    drawText(r, assets, t, x + SLOT - measure(t) - 1, y + SLOT - 11);
  }
}

/** Coin icon and amount; returns the width drawn. */
export function drawCoins(r: Renderer, assets: Assets, coins: number, x: number, y: number): number {
  r.sprite('coin', x, y);
  const t = String(coins);
  drawText(r, assets, t, x + 18, y + 4);
  return 18 + measure(t);
}

/** Name, kind and tags of an item, at (x, y); returns the height used. */
export function drawItemInfo(r: Renderer, assets: Assets, content: Content, item: string, x: number, y: number): number {
  const it = content.item(item);
  drawText(r, assets, it.name, x, y);
  const kind = ({ raw: 'Ingredient', prepared: 'Prepared', tableware: 'Tableware', supply: 'Inn supplies', furniture: 'Furniture' } as Record<string, string>)[it.kind] ?? 'Dish';
  r.ctx.globalAlpha = 0.7;
  drawText(r, assets, kind, x, y + 12);
  r.ctx.globalAlpha = 1;
  const tags = tagsOf(content, item);
  drawTags(r, tags, x, y + 24);
  return tags.length ? 38 : 24;
}
