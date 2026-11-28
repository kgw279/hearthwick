/** Button names for hints, for the device in use (the glyph sprites are for prompts in the world). */
import type { Action, Device } from '../core/input';

const NAMES: Record<Device, Partial<Record<Action, string>>> = {
  gamepad: { interact: 'A', back: 'B', cook: 'X', recipes: 'Y', tab_prev: 'LB', tab_next: 'RB', cat_prev: 'LT', cat_next: 'RT', menu: 'Menu', map: 'View' },
  keyboard: { interact: 'E', back: 'Esc', cook: 'F', recipes: 'R', tab_prev: 'Q', tab_next: 'C', cat_prev: 'Z', cat_next: 'X', menu: 'Tab', map: 'M' },
};

/** A button's name on the device in use. */
export function buttonName(device: Device, a: Action): string {
  return NAMES[device][a] ?? a;
}

/** "A: add   B: take out" for a list of [action, what it does]. */
export function hint(device: Device, pairs: Array<[Action, string]>): string {
  return pairs.map(([a, what]) => `${NAMES[device][a] ?? a}: ${what}`).join('   ');
}
