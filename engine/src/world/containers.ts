/**
 * Storage containers: how much each holds and what kinds of things go in it. One table, keyed by art,
 * so the editor (placing one gives it storage) and the game (what may go in) agree. Raw ingredients and
 * tableware go in crates, chests and cupboards; prepped food on pantry shelves; liquids (water, milk) and
 * drinks in barrels and kegs, one kind to a barrel; the
 * inn's supplies in crates, chests and wardrobes; pillows and linens in the beds (made up by hand), and
 * spare in wardrobes and chests; a nightstand keeps a guest's soap and candles. (Wall shelves and
 * bookcases are decoration.)
 */
import type { Store } from '../game/data';

export interface ContainerSpec {
  slots: number;
  holds: Store[];
  /** At most this many kinds of thing at once (a barrel holds one liquid; a stack of barrels, three). */
  kinds?: number;
  /** How the inventory screen groups its capacity. */
  group: 'Crates' | 'Cupboards' | 'Shelves' | 'Barrels' | 'Wardrobes' | 'Beds';
  /** Only filled by hand: things put away in the inn's stores never go here on their own (a bed is made up). */
  byHand?: boolean;
}

const GOODS: Store[] = ['pantry', 'tableware', 'supply'];

export const CONTAINERS: Record<string, ContainerSpec> = {
  crate: { slots: 8, holds: [...GOODS, 'bedding'], group: 'Crates' },
  chest: { slots: 12, holds: [...GOODS, 'bedding'], group: 'Crates' },
  cupboard: { slots: 12, holds: ['pantry', 'tableware'], group: 'Cupboards' },
  wardrobe: { slots: 16, holds: ['supply', 'bedding'], group: 'Wardrobes' },
  bed: { slots: 3, holds: ['bedding'], group: 'Beds', byHand: true },
  nightstand: { slots: 2, holds: ['supply'], group: 'Wardrobes', byHand: true },
  pantry_shelf: { slots: 8, holds: ['shelf'], group: 'Shelves' },
  barrel: { slots: 6, holds: ['cask'], group: 'Barrels', kinds: 1 },
  barrel_stack: { slots: 12, holds: ['cask'], group: 'Barrels', kinds: 3 },
  keg: { slots: 8, holds: ['cask'], group: 'Barrels', kinds: 1 },
};

/** A container's spec from the art it shows (an animation's name or a frame). */
export function containerOf(art: string): ContainerSpec | undefined {
  return CONTAINERS[art.replace(/^anim:/, '').replace(/_f\d+$/, '')];
}
