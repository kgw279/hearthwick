/**
 * Storage containers: how much each holds and what kinds of things go in it. One table, keyed by art,
 * so the editor (placing one gives it storage) and the game (what may go in) agree. Raw ingredients and
 * tableware go in crates, chests and cupboards; prepped food on shelves; drinks in barrels and kegs; the
 * inn's supplies in crates, chests and wardrobes.
 */
import type { Store } from '../game/data';

export interface ContainerSpec {
  slots: number;
  holds: Store[];
  /** How the inventory screen groups its capacity. */
  group: 'Crates' | 'Cupboards' | 'Shelves' | 'Barrels' | 'Wardrobes';
}

const GOODS: Store[] = ['pantry', 'tableware', 'supply'];

export const CONTAINERS: Record<string, ContainerSpec> = {
  crate: { slots: 8, holds: GOODS, group: 'Crates' },
  chest: { slots: 12, holds: GOODS, group: 'Crates' },
  cupboard: { slots: 12, holds: ['pantry', 'tableware'], group: 'Cupboards' },
  wardrobe: { slots: 16, holds: ['supply'], group: 'Wardrobes' },
  wall_shelf: { slots: 6, holds: ['shelf'], group: 'Shelves' },
  shelf_jars: { slots: 6, holds: ['shelf'], group: 'Shelves' },
  bookshelf: { slots: 10, holds: ['shelf'], group: 'Shelves' },
  barrel: { slots: 6, holds: ['cask'], group: 'Barrels' },
  barrel_stack: { slots: 12, holds: ['cask'], group: 'Barrels' },
  keg: { slots: 8, holds: ['cask'], group: 'Barrels' },
};

/** A container's spec from the art it shows (an animation's name or a frame). */
export function containerOf(art: string): ContainerSpec | undefined {
  return CONTAINERS[art.replace(/^anim:/, '').replace(/_f\d+$/, '')];
}
