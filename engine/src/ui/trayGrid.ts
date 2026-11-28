/** A serving tray drawn as a grid: one row per meal, with its dish, drink and cutlery slots. */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import type { Content } from '../game/data';
import { PARTS, TRAY_MEALS, type Tray } from '../state/service';
import { drawItem, drawSlot, SLOT } from './items';
import { drawText } from './text';

export const TRAY_COLS = PARTS.length;
const LABELS = ['Dish', 'Drink', 'Cutlery'];
const GAP = 2;

/** Where a tray grid's cell is, with the grid's top-left (below its labels) at (x, y). */
export function trayCell(x: number, y: number, row: number, col: number): { x: number; y: number } {
  return { x: x + col * (SLOT + GAP), y: y + row * (SLOT + GAP) };
}

/**
 * The grid, with labels over its columns. sel: the selected cell; picked: a meal (row) chosen to
 * serve, drawn highlighted across.
 */
export function drawTrayGrid(
  r: Renderer, assets: Assets, content: Content, tray: Tray, x: number, y: number,
  sel: { row: number; col: number } | null, picked: number | null = null,
): void {
  LABELS.forEach((l, c) => {
    r.ctx.globalAlpha = 0.7;
    drawText(r, assets, l, trayCell(x, y, 0, c).x + 1, y - 11);
    r.ctx.globalAlpha = 1;
  });
  for (let row = 0; row < TRAY_MEALS; row++) {
    const m = tray.meals[row];
    if (picked === row) r.nine('slot_selected', x - 3, trayCell(x, y, row, 0).y - 2, TRAY_COLS * (SLOT + GAP) + 4, SLOT + 4);
    PARTS.forEach((part, col) => {
      const p = trayCell(x, y, row, col);
      drawSlot(r, p.x, p.y, !!sel && sel.row === row && sel.col === col);
      const got = m?.[part];
      if (got) drawItem(r, assets, content, typeof got === 'string' ? got : got.dish, p.x, p.y);
    });
  }
}
