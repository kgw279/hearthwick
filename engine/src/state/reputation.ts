/**
 * The inn's reputation, filled up like experience: points earned (for now, by serving guests interesting
 * dishes) fill the meter; a full meter is the next level, and the meter starts over needing more. It
 * levels slowly. A higher reputation brings more guests, more often, and more of them asking for
 * something in particular. Pure state.
 */
const FIRST_LEVEL = 30; // points to go from level 1 to 2...
const GROWTH = 1.7; // ...and each level needs this much more than the last

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

  /** Add points (or, for a bad visit, take some away: never below the level's start); returns levels gained. */
  add(n: number): number {
    let gained = 0;
    this.points = Math.max(0, this.points + n);
    while (this.points >= this.need) {
      this.points -= this.need;
      this.level++;
      gained++;
    }
    return gained;
  }

  /** Seconds between guests arriving: often, as the inn's name spreads. */
  get arriveEvery(): number {
    return Math.max(25, 75 - (this.level - 1) * 8);
  }

  /** The chance a course a guest orders is "anything that's ready" rather than something in particular. */
  get anything(): number {
    return [0.9, 0.6, 0.35][this.level - 1] ?? 0.15;
  }

  /**
   * How many guests the inn has room for, as word stands: past this many, a new one only drops in now and
   * then (one at a time, mostly, at first).
   */
  get usualGuests(): number {
    return Math.ceil(this.level / 2);
  }
}
