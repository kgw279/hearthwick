/**
 * Serving guests. Pure state, no drawing.
 *
 * Dishes and drinks are plated at the plating station and wait there, ready to serve (up to four at a
 * time; plates and mugs limit them too). At a table or the bar, what's ready is served straight to a
 * guest: no carrying.
 *
 * Guests sit at seats (see game/seating.ts) and order one or more courses: a drink, a snack, a main, a
 * dessert (at the bar, just drinks and snacks). Each is anything of that course, something of a kind
 * ("a baked snack", "a meaty main": a trait), or something in particular; while the inn is little known,
 * guests mostly take anything, and want just the one thing. Courses are served one at a time, in any
 * order. With everything they wanted, they eat a while, pay and leave, earning the inn renown (see
 * renown.ts for how), and their dishes are left dirty at their seat: nobody sits there till they're
 * cleared.
 *
 * Patience is gentle, not a race: it's only a way for guests nobody's going to serve to move on. A
 * guest waits a good while, longer each time something they ordered arrives, and if nothing comes they
 * leave without paying. The player can also politely dismiss a guest: they pay nothing (not even for what
 * they've had), and they're happier about it the sooner it's done.
 */
import { COURSE_NAMES, COURSES, type Content, type Course } from '../game/data';
import { renownFor, type Award } from './renown';
import type { Reputation } from './reputation';

/**
 * Something served: the dish (or snack served as it is) and what it's on (a plate or bowl, or a mug);
 * once a guest has it, how long they'd waited for it (seconds since they sat down).
 */
export interface Served { dish: string; ware: string; after?: number }
export type Meal = Partial<Record<Course, Served>> & { cutlery?: string };

/** How many plated dishes and drinks the plating station holds ready at once. */
export const READY_MAX = 4;

/** What a guest wants for a course: something in particular, something of a kind, or (neither) anything. */
export interface Want { dish?: string; trait?: string }
export type Order = Partial<Record<Course, Want>>;

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
  /** When they sat down, in seating order (earliest first). */
  seated: number;
}

/** A seat, as the service needs it: its key (map and chair), its map, and the key of its table (or bar). */
export interface SeatRef { key: string; layout: string; table: string; bar: boolean }

/** How a guest left: paid, went without, or was sent on their way; how happy they were (0 to 1); renown earned and why. */
export interface Leaving {
  seat: SeatRef; guest: Guest; how: 'paid' | 'gave up' | 'dismissed'; coins: number; mood: number; reputation: number; awards: Award[];
}

const EAT_TIME = 15; // seconds a served guest eats before paying and leaving
const PATIENCE = 300; // seconds a guest waits for what they ordered...
const PATIENCE_PER_PART = 180; // ...and more for each part of it brought
/** Patience is shown as this many chits, marked off one at a time. */
export const CHITS = 10;
const PROMPT = 20; // seconds: dismissed sooner than this, a guest doesn't mind at all
const FIRST_GUESTS = 1; // seated at the start
const EXTRA_GUEST = 0.12; // past the usual number of guests, the chance another drops in (for each one more)
const RECENT = 12; // dishes remembered, for whether the inn serves the same thing over and over

export class Service {
  /** Plated and waiting at the plating station. */
  readonly ready: Served[] = [];
  /** By seat key. */
  readonly guests = new Map<string, Guest>();
  /** Dirty pieces left at each seat by whoever sat there last, by seat key. */
  readonly dirty = new Map<string, string[]>();
  /** What's been served lately, latest last. */
  readonly recent: string[] = [];
  /** How happy guests have left, in all (one point a fully happy guest). */
  happiness = 0;
  /** Bumped on every change, so views know to rebuild. */
  version = 0;
  /** Told when a guest sits down (for the journal). */
  onArrive?: (seat: SeatRef, g: Guest) => void;
  private arrive = 0;
  private started = false;
  private seatedCount = 0;

  /** reputation: how often guests come, and what they ask for. */
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

  /** A want in words: "any drink", "a baked snack", "Honey Cake". */
  describe(c: Course, w: Want): string {
    if (w.dish) return this.content.itemName(w.dish);
    if (w.trait) return `a ${w.trait} ${COURSE_NAMES[c]}`;
    return `any ${COURSE_NAMES[c]}`;
  }

  /**
   * Advance time: waiting guests lose patience, served ones finish eating; new guests arrive at seats
   * that are free (nobody there, no dishes left). menu(bar): what could be asked for, by course. Each
   * guest who leaves is passed to `left`.
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
    const free = seats.filter((s) => !this.guests.has(s.key) && !this.dirty.get(s.key)?.length);
    if (!free.length) return;
    if (!this.started) {
      this.started = true;
      for (let i = 0; i < FIRST_GUESTS && i < free.length; i++) this.seat(free[i], menu(free[i].bar));
      this.arrive = this.reputation.arriveEvery;
      return;
    }
    if ((this.arrive -= dt) > 0) return;
    this.arrive = this.reputation.arriveEvery;
    const over = this.guests.size - this.reputation.usualGuests;
    if (over >= 0 && this.rng() >= EXTRA_GUEST ** (over + 1)) return; // the inn's as busy as its name allows
    const seat = free[Math.floor(this.rng() * free.length)];
    this.seat(seat, menu(seat.bar));
  }

  /** Politely send a guest on their way: they pay nothing. Returns how they left, or null if nobody's there. */
  dismiss(seat: SeatRef): Leaving | null {
    return this.guests.has(seat.key) ? this.leave(seat, 'dismissed') : null;
  }

  /**
   * A guest gets up: paying if they ate (a coin less for a main without cutlery) and earning the inn
   * renown, leaving what they had (eaten or not) dirty at their seat.
   */
  private leave(seat: SeatRef, how: Leaving['how']): Leaving {
    const g = this.guests.get(seat.key)!;
    const served = COURSES.map((c) => g.got[c]).filter((s): s is Served => !!s);
    let coins = 0;
    let awards: Award[] = [];
    if (how === 'paid') {
      coins = Math.max(1, served.reduce((n, s) => n + this.worth(s), 0) - (g.got.main && !g.got.cutlery ? 1 : 0));
      awards = renownFor({ guest: g, content: this.content, recent: this.recent }).awards;
      for (const s of served) {
        this.recent.push(s.dish);
        if (this.recent.length > RECENT) this.recent.shift();
      }
    }
    const reputation = Math.max(0, awards.reduce((n, a) => n + a.points, 0));
    const mood = how === 'paid' ? 1 : how === 'gave up' ? 0 : g.waited < PROMPT ? 0.8 : Math.max(0.2, 0.8 - this.restless(g) * 0.6);
    this.happiness += mood;
    const pile = served.filter((s) => s.ware).map((s) => this.content.item(s.ware).dirty ?? s.ware);
    if (g.got.cutlery) pile.push(this.content.item(g.got.cutlery).dirty ?? g.got.cutlery);
    if (pile.length) this.dirty.set(seat.key, pile);
    this.guests.delete(seat.key);
    this.changed();
    return { seat, guest: g, how, coins, mood, reputation, awards };
  }

  private seat(seat: SeatRef, menu: Record<Course, string[]>): void {
    const look = this.looks[Math.floor(this.rng() * this.looks.length)];
    const folk = this.content.folk[look] ? look : 'human';
    // how many courses: just one, mostly, while the inn is little known; more as its name grows
    const allowed: Course[] = seat.bar ? ['drink', 'snack'] : [...COURSES];
    const most = this.reputation.level <= 1 ? (this.rng() < 0.8 ? 1 : 2) : 1 + Math.floor(this.rng() * Math.min(3, allowed.length));
    const courses = [...allowed].sort(() => this.rng() - 0.5).slice(0, Math.max(1, Math.min(most, allowed.length)));
    const order: Order = {};
    for (const c of courses) order[c] = this.want(menu[c], folk);
    const g: Guest = {
      look, folk, bar: seat.bar, order, got: {}, state: 'waiting', patience: PATIENCE, patienceMax: PATIENCE, eating: 0, waited: 0,
      seated: this.seatedCount++,
    };
    this.guests.set(seat.key, g);
    this.onArrive?.(seat, g);
    this.changed();
  }

  /**
   * What a guest wants for a course: anything (most, early on); else something of a kind (a trait of
   * something they could be served) or, as the inn's name grows, something in particular.
   */
  private want(options: string[], folk: string): Want {
    const r = this.rng();
    if (!options.length || r < this.reputation.anything) return {};
    if (r < this.reputation.anything + (1 - this.reputation.anything) * 0.6) {
      const traits = [...new Set(options.flatMap((d) => this.content.traits(d)))];
      if (traits.length) return { trait: this.favourite(traits, folk, (t) => [t]) };
    }
    return { dish: this.favourite(options, folk, (d) => this.content.dishTags(d)) };
  }

  /** One of a list, more likely one this folk likes (by the tags `tags` gives each). */
  private favourite(list: string[], folk: string, tags: (x: string) => string[]): string {
    const likes = new Set(this.content.folk[folk]?.likes ?? []);
    const weights = list.map((d) => 1 + tags(d).filter((t) => likes.has(t)).length * 2);
    let r = this.rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((r -= weights[i]) <= 0) return list[i];
    return list[list.length - 1];
  }

  /** Whether a dish (or snack) is what a guest wants for its course; why not, or null. */
  private refuses(g: Guest, dish: string): string | null {
    const c = this.content.course(dish);
    if (!(c in g.order)) return `They didn't want a ${COURSE_NAMES[c]}`;
    if (g.got[c]) return `They already have their ${COURSE_NAMES[c]}`;
    const w = g.order[c]!;
    if (w.dish && w.dish !== dish) return `They asked for ${this.content.itemName(w.dish)}`;
    if (w.trait && !this.content.traits(dish).includes(w.trait)) return `They'd like ${this.describe(c, w)}`;
    return null;
  }

  /**
   * Serve the guest in a seat something ready at the plating station (it leaves the station). It must be
   * something they want and haven't had; cutlery (if there's a clean set: `cutlery` takes one) goes with
   * a main. Each thing brought buys more patience; once they have everything, they start eating.
   * Returns why not, or null once served.
   */
  serve(ready: number, seatKey: string, cutlery: () => string | null): string | null {
    const s = this.ready[ready];
    const g = this.guests.get(seatKey);
    if (!s) return 'Choose something ready to serve';
    if (!g) return 'Nobody is sitting there';
    if (g.state !== 'waiting') return "They've already been served";
    const why = this.refuses(g, s.dish);
    if (why) return why;
    const c = this.content.course(s.dish);
    this.ready.splice(ready, 1);
    g.got = { ...g.got, [c]: { ...s, after: g.waited } };
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

  /** Clear one dirty piece from a seat (into the bag: `take` says whether it fit). Returns it, or null. */
  clearOne(seatKey: string, i: number, take: (item: string) => boolean): string | null {
    const pile = this.dirty.get(seatKey);
    const item = pile?.[i];
    if (!pile || !item || !take(item)) return null;
    pile.splice(i, 1);
    if (!pile.length) this.dirty.delete(seatKey);
    this.changed();
    return item;
  }
}
