/**
 * Inventories: a fixed number of slots, each holding a stack of one item up to the stack size. The
 * player's bag is one (with a purse); so is every storage container. Adding fills existing stacks first,
 * then empty slots, and reports how many it could take. Pure state, no drawing.
 */
export interface Stack { item: string; count: number }

export class Inventory {
  readonly slots: Array<Stack | null>;

  /** accepts: what may be put in (a shelf takes prepped food only...); everything, if not given. */
  constructor(size: number, readonly stackSize: number, readonly accepts: (item: string) => boolean = () => true) {
    this.slots = Array.from({ length: size }, () => null);
  }

  count(item: string): number {
    return this.slots.reduce((n, s) => n + (s?.item === item ? s.count : 0), 0);
  }

  /** How many of an item would fit right now. */
  room(item: string): number {
    if (!this.accepts(item)) return 0;
    return this.slots.reduce((n, s) => n + (s === null ? this.stackSize : s.item === item ? this.stackSize - s.count : 0), 0);
  }

  /** Add up to n; returns how many were added (all of them, or as many as fit). */
  add(item: string, n: number): number {
    let left = Math.min(n, this.room(item));
    const added = left;
    for (const s of this.slots) {
      if (left === 0) break;
      if (s?.item === item && s.count < this.stackSize) {
        const k = Math.min(left, this.stackSize - s.count);
        s.count += k;
        left -= k;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i] !== null) continue;
      const k = Math.min(left, this.stackSize);
      this.slots[i] = { item, count: k };
      left -= k;
    }
    return added;
  }

  /** Remove n (from the last stacks first); false and no change if there aren't that many. */
  remove(item: string, n: number): boolean {
    if (this.count(item) < n) return false;
    let left = n;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (s?.item !== item) continue;
      const k = Math.min(left, s.count);
      s.count -= k;
      left -= k;
      if (s.count === 0) this.slots[i] = null;
    }
    return true;
  }

  /** Take up to n from the stack in slot i; returns what was taken (null if the slot is empty). */
  takeFrom(i: number, n: number): Stack | null {
    const s = this.slots[i];
    if (!s) return null;
    const k = Math.min(n, s.count);
    s.count -= k;
    if (s.count === 0) this.slots[i] = null;
    return { item: s.item, count: k };
  }

  /**
   * Move up to n from slot i into another inventory, as much as fits there; returns how many moved
   * (what doesn't fit stays where it was).
   */
  moveTo(i: number, n: number, to: Inventory): number {
    const s = this.slots[i];
    if (!s) return 0;
    const k = Math.min(n, s.count, to.room(s.item));
    if (!k) return 0;
    to.add(s.item, k);
    this.takeFrom(i, k);
    return k;
  }

  /** Every distinct item held, in slot order, with its total. */
  contents(): Stack[] {
    const out: Stack[] = [];
    for (const s of this.slots) {
      if (!s) continue;
      const hit = out.find((o) => o.item === s.item);
      if (hit) hit.count += s.count;
      else out.push({ ...s });
    }
    return out;
  }
}

/** The player's bag: an inventory and the purse. */
export class Bag extends Inventory {
  coins: number;

  constructor(size: number, stackSize: number, coins: number) {
    super(size, stackSize);
    this.coins = coins;
  }
}
