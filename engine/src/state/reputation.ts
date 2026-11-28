/**
 * The inn's reputation, filled up like experience: points earned (for now, by serving guests interesting
 * dishes) fill the meter; a full meter is the next level, and the meter starts over needing more. It
 * levels slowly. A higher reputation brings guests more often, and fewer of them are travellers happy
 * with whatever's on hand. Pure state.
 */
const FIRST_LEVEL = 12; // points to go from level 1 to 2...
const GROWTH = 1.6; // ...and each level needs this much more than the last

export class Reputation {
  level = 1;
  /** Points towards the next level. */
  points = 0;

  /** Points the current level needs to fill. */
  get need(): number {
    return Math.round(FIRST_LEVEL * GROWTH ** (this.level - 1));
  }

  /** How full the meter is, 0 to 1. */
  get fill(): number {
    return Math.min(1, this.points / this.need);
  }

  /** Add points; returns how many levels that gained. */
  add(n: number): number {
    let gained = 0;
    this.points += n;
    while (this.points >= this.need) {
      this.points -= this.need;
      this.level++;
      gained++;
    }
    return gained;
  }

  /** Seconds between guests arriving: often, as the inn's name spreads. */
  get arriveEvery(): number {
    return Math.max(12, 40 - (this.level - 1) * 6);
  }

  /** The chance a new guest is a traveller, happy to eat whatever's on hand (most of them, at first). */
  get travellers(): number {
    return [1, 0.6, 0.3][this.level - 1] ?? 0.1;
  }
}
