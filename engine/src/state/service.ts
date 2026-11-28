/**
 * Serving guests. Pure state, no drawing.
 *
 * Dishes and drinks are plated at the plating station and wait there, ready to serve (up to four at a
 * time; plates and mugs limit them too). At a table or the bar, what's ready is served straight to a
 * guest: no carrying.
 *
 * Guests sit at seats (see game/seating.ts) and order one or more courses: a drink, a snack, a main dish
 * (at the bar, no mains). Each is either something in particular, or anything of that course that's
 * ready; while the inn is little known, guests mostly take anything, and want just the one thing. Each
 * course is served on its own, in any order. With everything they wanted, they eat a while, pay and leave
 * (with reputation for the inn, the more for more interesting dishes), and what they ate from is left
 * dirty where they sat.
 *
 * Patience is gentle, not a race: it's only a way for guests nobody's going to serve to move on. A
 * guest waits a good while, longer each time something they ordered arrives, and if nothing comes they
 * leave without paying. The player can also politely dismiss a guest: they pay nothing (not even for what
 * they've had), and they're happier about it the sooner it's done.
 */
import { COURSES, type Content, type Course } from '../game/data';
import type { Reputation } from './reputation';

/**
 * A dish as served: the dish and what it's on (a plate or bowl, or a mug). A raw snack is plated as it
 * is: its item, on a plate.
 */
export interface Served { dish: string; ware: string }
export interface Meal { drink?: Served; snack?: Served; main?: Served; cutlery?: string }

/** How many plated dishes and drinks the plating station holds ready at once. */
export const READY_MAX = 4;

/** What a guest ordered: each course they want, as a particular dish, or null for anything of that course. */
export type Order = Partial<Record<Course, string | null>>;

export interface Guest {
  /** Their sprite (a guest look: dwarf, elf...) and folk (what they like). */
  look: string;
  folk: string;
  bar: boolean;
  order: Order;
  /** What's been brought so far. */
  got: Meal;
  state: 'waiting' | 'eating';
  /** Seconds they'll still wait for what's not been brought (out of how long, all told); seconds left eating. */
  patience: number;
  patienceMax: number;
  eating: number;
  /** Seconds since they sat down. */
  waited: number;
}

/** A seat, as the service needs it: its key (map and chair), its map, and the key of its table (or bar). */
export interface SeatRef { key: string; layout: string; table: string; bar: boolean }

/** How a guest left: paid, went without, or was sent on their way; and how happy they were (0 to 1). */
export interface Leaving { seat: SeatRef; guest: Guest; how: 'paid' | 'gave up' | 'dismissed'; coins: number; mood: number; reputation: number }

const EAT_TIME = 15; // seconds a served guest eats before paying and leaving
const PATIENCE = 300; // seconds a guest waits for what they ordered...
const PATIENCE_PER_PART = 180; // ...and more for each part of it brought
/** Patience is shown as this many chits, marked off one at a time. */
export const CHITS = 10;
const PROMPT = 20; // seconds: dismissed sooner than this, a guest doesn't mind at all
const FIRST_GUESTS = 1; // seated at the start
const EXTRA_GUEST = 0.12; // past the usual number of guests, the chance another drops in (for each one more)

export class Service {
  /** Plated and waiting at the plating station. */
  readonly ready: Served[] = [];
  /** By seat key. */
  readonly guests = new Map<string, Guest>();
  /** Dirty pieces left on each table (or the bar), by its key. */
  readonly dirty = new Map<string, string[]>();
  /** How happy guests have left, in all (one point a fully happy guest). */
  happiness = 0;
  /** Bumped on every change, so views know to rebuild. */
  version = 0;
  private arrive = 0;
  private started = false;

  /** reputation: how often guests come, and how many are travellers. */
  constructor(
    private readonly content: Content,
    private readonly looks: string[],
    private readonly reputation: Reputation,
    private readonly rng = Math.random,
  ) {}

  changed(): void {
    this.version++;
  }

  /** Worth of a served thing: a dish's, or a snack's own. */
  private worth(s: Served): number {
    return this.content.dishes[s.dish]?.value ?? this.content.item(s.dish).value;
  }

  /** How far a guest's patience has gone, 0 (just sat down) to 1 (about to leave). */
  restless(g: Guest): number {
    return g.state === 'waiting' ? Math.max(0, Math.min(1, 1 - g.patience / g.patienceMax)) : 0;
  }

  /** How many patience chits a waiting guest has left (all of them once they're eating). */
  chits(g: Guest): number {
    return g.state === 'waiting' ? Math.max(0, Math.ceil((g.patience / g.patienceMax) * CHITS)) : CHITS;
  }

  /** The courses a guest wants, in serving order. */
  wants(g: Guest): Course[] {
    return COURSES.filter((c) => c in g.order);
  }

  /**
   * Advance time: waiting guests lose patience, served ones finish eating; new guests arrive at empty
   * seats. menu(bar): what a guest there could order. Each guest who leaves is passed to `left`.
   */
  update(dt: number, seats: SeatRef[], menu: (bar: boolean) => Record<Course, string[]>, left: (l: Leaving) => void): void {
    const here = new Set(seats.map((s) => s.key));
    for (const key of [...this.guests.keys()]) {
      if (!here.has(key)) {
        this.guests.delete(key); // their chair was moved or taken away
        this.changed();
      }
    }
    for (const seat of seats) {
      const g = this.guests.get(seat.key);
      if (!g) continue;
      g.waited += dt;
      if (g.state === 'waiting' && (g.patience -= dt) <= 0) left(this.leave(seat, 'gave up'));
      else if (g.state === 'eating' && (g.eating -= dt) <= 0) left(this.leave(seat, 'paid'));
    }
    const empty = seats.filter((s) => !this.guests.has(s.key));
    if (!empty.length) return;
    if (!this.started) {
      this.started = true;
      for (let i = 0; i < FIRST_GUESTS && i < empty.length; i++) this.seat(empty[i], menu(empty[i].bar));
      this.arrive = this.reputation.arriveEvery;
      return;
    }
    if ((this.arrive -= dt) > 0) return;
    this.arrive = this.reputation.arriveEvery;
    const over = this.guests.size - this.reputation.usualGuests;
    if (over >= 0 && this.rng() >= EXTRA_GUEST ** (over + 1)) return; // the inn's as busy as its name allows
    const seat = empty[Math.floor(this.rng() * empty.length)];
    this.seat(seat, menu(seat.bar));
  }

  /** Politely send a guest on their way: they pay nothing. Returns how they left, or null if nobody's there. */
  dismiss(seat: SeatRef): Leaving | null {
    return this.guests.has(seat.key) ? this.leave(seat, 'dismissed') : null;
  }

  /**
   * A guest gets up: paying if they ate (a coin less for food eaten without cutlery), leaving what they
   * had (eaten or not) dirty where they sat.
   */
  private leave(seat: SeatRef, how: Leaving['how']): Leaving {
    const g = this.guests.get(seat.key)!;
    let coins = 0;
    let reputation = 0;
    if (how === 'paid') {
      for (const c of COURSES) {
        const s = g.got[c];
        if (!s) continue;
        coins += this.worth(s);
        reputation += this.content.dishes[s.dish]?.reputation ?? 0;
      }
      if (g.got.main && !g.got.cutlery) coins -= 1;
      coins = Math.max(1, coins);
    }
    const mood = how === 'paid' ? 1 : how === 'gave up' ? 0 : g.waited < PROMPT ? 0.8 : Math.max(0.2, 0.8 - this.restless(g) * 0.6);
    this.happiness += mood;
    const pile = this.dirty.get(seat.table) ?? [];
    for (const c of COURSES) {
      const s = g.got[c];
      if (s?.ware) pile.push(this.content.item(s.ware).dirty ?? s.ware);
    }
    if (g.got.cutlery) pile.push(this.content.item(g.got.cutlery).dirty ?? g.got.cutlery);
    this.dirty.set(seat.table, pile);
    this.guests.delete(seat.key);
    this.changed();
    return { seat, guest: g, how, coins, mood, reputation };
  }

  private seat(seat: SeatRef, menu: Record<Course, string[]>): void {
    const look = this.looks[Math.floor(this.rng() * this.looks.length)];
    const folk = this.content.folk[look] ? look : 'human';
    // how many courses: just one, mostly, while the inn is little known; up to all three later
    const allowed: Course[] = seat.bar ? ['drink', 'snack'] : [...COURSES];
    const most = this.reputation.level <= 1 ? (this.rng() < 0.8 ? 1 : 2) : 1 + Math.floor(this.rng() * allowed.length);
    const courses = [...allowed].sort(() => this.rng() - 0.5).slice(0, Math.max(1, Math.min(most, allowed.length)));
    const order: Order = {};
    for (const c of courses) {
      // something in particular, or anything of that course (most guests, early on)
      const particular = menu[c].length && this.rng() >= this.reputation.anything;
      order[c] = particular ? this.favourite(menu[c], folk) : null;
    }
    this.guests.set(seat.key, {
      look, folk, bar: seat.bar, order, got: {}, state: 'waiting', patience: PATIENCE, patienceMax: PATIENCE, eating: 0, waited: 0,
    });
    this.changed();
  }

  /** A dish (or snack) from the list, more likely one with tags this folk likes. */
  private favourite(list: string[], folk: string): string {
    const likes = new Set(this.content.folk[folk]?.likes ?? []);
    const tags = (d: string) => this.content.dishes[d]?.tags ?? this.content.items[d]?.tags ?? [];
    const weights = list.map((d) => 1 + tags(d).filter((t) => likes.has(t)).length * 2);
    let r = this.rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((r -= weights[i]) <= 0) return list[i];
    return list[list.length - 1];
  }

  /**
   * Serve the guest in a seat something ready at the plating station (it leaves the station). It must be
   * something they ordered and haven't had; cutlery (if there's a clean set: `cutlery` takes one) goes
   * with a dish. Each thing brought buys more patience; once they have everything, they start eating.
   * Returns why not, or null once served.
   */
  serve(ready: number, seatKey: string, cutlery: () => string | null): string | null {
    const s = this.ready[ready];
    const g = this.guests.get(seatKey);
    if (!s) return 'Choose something ready to serve';
    if (!g) return 'Nobody is sitting there';
    if (g.state !== 'waiting') return "They've already been served";
    const c = this.content.course(s.dish);
    const name = (d: string) => this.content.itemName(d);
    if (!(c in g.order)) return `They didn't want a ${c === 'main' ? 'main dish' : c}`;
    if (g.got[c]) return `They already have their ${c === 'main' ? 'main dish' : c}`;
    const want = g.order[c];
    if (want && want !== s.dish) return `They asked for ${name(want)}`;
    this.ready.splice(ready, 1);
    g.got = { ...g.got, [c]: s };
    if (c === 'main' && !g.got.cutlery) g.got.cutlery = cutlery() ?? undefined;
    g.patience += PATIENCE_PER_PART;
    g.patienceMax += PATIENCE_PER_PART;
    if (this.wants(g).every((w) => g.got[w])) {
      g.state = 'eating';
      g.eating = EAT_TIME;
    }
    this.changed();
    return null;
  }

  /** Take what's left dirty on a table (into the bag; `take` says whether each fit). Returns how many. */
  clear(table: string, take: (item: string) => boolean): number {
    const left = this.dirty.get(table) ?? [];
    const kept = left.filter((item) => !take(item));
    this.dirty.set(table, kept);
    this.changed();
    return left.length - kept.length;
  }
}
