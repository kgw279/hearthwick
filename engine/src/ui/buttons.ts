/** Button names for hints, for the device in use (the glyph sprites are for prompts in the world). */
import type { Action, Device } from '../core/input';

const NAMES: Record<Device, Partial<Record<Action, string>>> = {
  gamepad: { interact: 'A', back: 'B', cook: 'X', recipes: 'Y', tab_prev: 'LB', tab_next: 'RB', cat_prev: 'LT', cat_next: 'RT', menu: 'Menu' },
  keyboard: { interact: 'E', back: 'Esc', cook: 'F', recipes: 'R', tab_prev: 'Q', tab_next: 'C', cat_prev: 'Z', cat_next: 'X', menu: 'Tab' },
};

/** "A: add   B: take out" for a list of [action, what it does]. */
export function hint(device: Device, pairs: Array<[Action, string]>): string {
  return pairs.map(([a, what]) => `${NAMES[device][a] ?? a}: ${what}`).join('   ');
}
