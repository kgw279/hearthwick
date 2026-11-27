/**
 * The player's bag and purse. A fixed number of slots; each slot holds a stack of one item, up to the
 * stack size. Adding fills existing stacks first, then empty slots, and never adds part of a pile it
 * can't fit: it reports how many it could take. Pure state, no drawing.
 */
export interface Stack { item: string; count: number }

export class Bag {
  readonly slots: Array<Stack | null>;
  coins: number;

  constructor(size: number, readonly stackSize: number, coins: number) {
    this.slots = Array.from({ length: size }, () => null);
    this.coins = coins;
  }

  count(item: string): number {
    return this.slots.reduce((n, s) => n + (s?.item === item ? s.count : 0), 0);
  }

  /** How many of an item would fit right now. */
  room(item: string): number {
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

  /** Every distinct item carried, in bag order, with its total. */
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
