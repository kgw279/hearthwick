/**
 * The journal: a running history of what's happened at the inn and around town, newest last: guests
 * arriving and leaving (and how their visit went), buying and selling, the inn's renown growing. Pure
 * state; nothing in it is about the clock.
 */
export interface Entry {
  kind: 'arrive' | 'leave' | 'buy' | 'sell' | 'renown';
  /** What happened, in a line. */
  text: string;
  /** More about it (a visit's renown, reason by reason). */
  detail?: string;
  /** Coins gained (or spent, below nought) and renown gained. */
  coins?: number;
  renown?: number;
  /** An item or dish to show beside it. */
  icon?: string;
}

const KEEP = 300; // entries kept

export class Journal {
  readonly entries: Entry[] = [];

  add(e: Entry): void {
    this.entries.push(e);
    if (this.entries.length > KEEP) this.entries.shift();
  }
}
