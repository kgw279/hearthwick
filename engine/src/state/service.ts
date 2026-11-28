/**
 * Serving guests. Pure state, no drawing.
 *
 * The "ready" slots (four) are what the player has to hand for serving: dishes and drinks plated at the
 * plating station, waiting to go out, and place settings cleared from the tables, waiting to go to the
 * wash station. Plates and mugs limit what can be plated, too.
 *
 * Guests come in at the door, walk to a free seat (see game/seating.ts) and order one or more courses: a
 * drink, a snack, a main, a dessert (at the bar, just drinks and snacks). Each is anything of that
 * course, something of a kind ("a baked snack"), or something in particular. Besides what they ask for,
 * each quietly craves something (their folk's tastes, by weighted chance): served it, they're delighted;
 * not, they say what they'd have liked as they go. The player serves something ready into any of a
 * guest's course slots: the wrong course, or not what was asked, is accepted but remembered (less renown,
 * a less happy guest). With every slot filled, they eat a while, pay, earn the inn renown (renown.ts),
 * and walk out, leaving their dishes at their seat: nobody sits there till they're cleared.
 *
 * Patience is gentle, not a race: a guest waits a good while, longer each time something arrives, and if
 * nothing comes they leave without paying. The player can also politely dismiss a guest: they pay nothing,
 * and mind less the sooner it's done. Every visit is kept, for the journal.
 */
import { COURSE_NAMES, COURSES, type Content, type Course } from '../game/data';
import { renownFor, type Award } from './renown';
import type { Reputation } from './reputation';

/**
 * Something served: the dish (or snack served as it is) and what it's on (a plate or bowl, or a mug).
 * Once a guest has it: how long they'd waited (seconds since they sat), and how well it fit the slot it
 * went in (what they asked for; the right course but not what they asked; the wrong course).
 */
export interface Served { dish: string; ware: string; after?: number; fit?: 'right' | 'not asked' | 'wrong course' }
export type Meal = Partial<Record<Course, Served>> & { cutlery?: string };

/** A place setting cleared from a seat: its dirty dishes, carried in a ready slot to the wash station. */
export interface Setting { dirty: string[]; seat: string }
export type ReadySlot = Served | Setting;
export const isSetting = (s: ReadySlot | undefined): s is Setting => !!s && 'dirty' in s;

/** How many ready slots there are (plated dishes and cleared settings alike). */
export const READY_MAX = 4;

/** What a guest wants for a course: something in particular, something of a kind, or (neither) anything. */
export interface Want { dish?: string; trait?: string }
export type Order = Partial<Record<Course, Want>>;

/** How a visit ended. */
export interface Outcome {
  how: 'paid' | 'gave up' | 'dismissed';
  coins: number;
  renown: number;
  awards: Award[];
  /** How happy they left, 0 to 1. */
  mood: number;
  /** What they said on the way out. */
  remark: string;
}

export interface Guest {
  /** Their sprite (a guest look: dwarf, elf...) and folk (what they like). */
  look: string;
  folk: string;
  bar: boolean;
  order: Order;
  /** What they quietly crave (a trait), whatever they asked for. */
  craving: string;
  /** What's been brought so far. */
  got: Meal;
  state: 'arriving' | 'waiting' | 'eating' | 'gone';
  /** Seconds left walking in (of how long, all told). */
  walk: number;
  walkTotal: number;
  /** Seconds they'll still wait for what's not been brought (out of how long, all told); seconds left eating. */
  patience: number;
  patienceMax: number;
  eating: number;
  /** Seconds since they sat down. */
  waited: number;
  /** Seconds they've sat with someone else's dirty dishes on their table. */
  mess: number;
  /** When they sat down, in seating order (earliest first). */
  seated: number;
  /** Where they sat (a seat key). */
  seat: string;
  /** Once they've gone: how it went. */
  outcome?: Outcome;
}

/**
 * A seat, as the service needs it: its key (map and chair), its map, the key of its table (or bar), and
 * how long a guest takes to walk there from the door.
 */
export interface SeatRef { key: string; layout: string; table: string; bar: boolean; walk?: number }

/** Someone walking out: who, from which seat, how far along. */
export interface Leaver { guest: Guest; seat: string; layout: string; t: number; total: number }

const EAT_TIME = 15; // seconds a served guest eats before paying and leaving
const PATIENCE = 300; // seconds a guest waits for what they ordered...
const PATIENCE_PER_PART = 180; // ...and more for each part of it brought
/** Patience is shown as this many chits, marked off one at a time. */
export const CHITS = 10;
const PROMPT = 20; // seconds: dismissed sooner than this, a guest doesn't mind at all
const FIRST_GUESTS = 1; // seated at the start
const EXTRA_GUEST = 0.08; // past the usual number of guests, the chance another drops in (for each one more)
const MESSY = 10; // seconds sat beside dirty dishes before a guest minds
const RECENT = 12; // dishes remembered, for whether the inn serves the same thing over and over

export class Service {
  /** The ready slots: plated and waiting, or cleared and on the way to be washed. */
  readonly ready: ReadySlot[] = [];
  /** By seat key. */
  readonly guests = new Map<string, Guest>();
  /** Dirty pieces left at each seat by whoever sat there last, by seat key. */
  readonly dirty = new Map<string, string[]>();
  /** Every visit, in the order they came (the journal). */
  readonly visits: Guest[] = [];
  /** Guests walking out. */
  readonly leavers: Leaver[] = [];
  /** What's been served lately, latest last. */
  readonly recent: string[] = [];
  /** Bumped on every change, so views know to rebuild. */
  version = 0;
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

  /** How many patience chits a waiting guest has left. */
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
   * Advance time: guests walk in, wait (losing patience), eat; leavers walk out; new guests come to seats
   * that are free (nobody there, no dishes left). menu(bar): what could be asked for, by course.
   */
  update(dt: number, seats: SeatRef[], menu: (bar: boolean) => Record<Course, string[]>, left: (g: Guest) => void): void {
    const here = new Map(seats.map((s) => [s.key, s]));
    for (const key of [...this.guests.keys()]) {
      if (!here.has(key)) {
        this.guests.delete(key); // their chair was moved or taken away
        this.changed();
      }
    }
    for (const l of this.leavers) l.t += dt;
    for (let i = this.leavers.length - 1; i >= 0; i--) if (this.leavers[i].t >= this.leavers[i].total) this.leavers.splice(i, 1);
    // tables (and the bar) with someone's dirty dishes still on them
    const messy = new Set(seats.filter((s) => this.dirty.get(s.key)?.length).map((s) => s.table));
    for (const seat of seats) {
      const g = this.guests.get(seat.key);
      if (!g) continue;
      if (g.state !== 'arriving' && messy.has(seat.table)) g.mess += dt;
      if (g.state === 'arriving') {
        if ((g.walk -= dt) <= 0) {
          g.state = 'waiting';
          this.changed();
        }
        continue;
      }
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

  /** Politely send a guest on their way: they pay nothing. Returns them, or null if nobody's there. */
  dismiss(seat: SeatRef): Guest | null {
    const g = this.guests.get(seat.key);
    return g && g.state !== 'arriving' ? this.leave(seat, 'dismissed') : null;
  }

  /** Whether what they had included what they were craving. */
  private satisfied(g: Guest): boolean {
    return COURSES.some((c) => g.got[c] && this.content.traits(g.got[c]!.dish).includes(g.craving));
  }

  /**
   * A guest gets up: paying if they ate (a coin less for a main without cutlery), earning the inn renown,
   * saying how it was, and walking out; what they had (eaten or not) is left dirty at their seat.
   */
  private leave(seat: SeatRef, how: Outcome['how']): Guest {
    const g = this.guests.get(seat.key)!;
    const served = COURSES.map((c) => g.got[c]).filter((s): s is Served => !!s);
    let coins = 0;
    let awards: Award[] = [];
    let mood: number;
    let remark: string;
    if (how === 'paid') {
      coins = Math.max(1, served.reduce((n, s) => n + this.worth(s), 0) - (g.got.main && !g.got.cutlery ? 1 : 0));
      awards = renownFor({ guest: g, content: this.content, recent: this.recent, craved: this.satisfied(g) }).awards;
      for (const s of served) {
        this.recent.push(s.dish);
        if (this.recent.length > RECENT) this.recent.shift();
      }
      const misses = served.filter((s) => s.fit && s.fit !== 'right').length;
      const messy = g.mess > MESSY;
      mood = Math.max(0.2, Math.min(1, 0.8 - misses * 0.2 - (messy ? 0.2 : 0) + (this.satisfied(g) ? 0.2 : 0)));
      remark = this.satisfied(g) ? `I loved how ${g.craving} that was!`
        : misses ? 'Not quite what I asked for...'
        : messy ? 'Someone ought to clear those dishes...' : `That was good, but could have been more ${g.craving}.`;
    } else if (how === 'gave up') {
      mood = 0;
      remark = "I couldn't wait any longer.";
      awards = [{ why: 'Left hungry', points: -2 }];
    } else {
      const prompt = g.waited < PROMPT;
      mood = prompt ? 0.8 : Math.max(0.2, 0.8 - this.restless(g) * 0.6);
      remark = prompt ? 'Another time, then!' : 'After all that waiting...';
      if (!prompt) awards = [{ why: 'Sent away after a long wait', points: -1 }];
    }
    // a very bad visit takes renown away
    const renown = awards.reduce((n, a) => n + a.points, 0);
    g.outcome = { how, coins, renown, awards, mood, remark };
    g.state = 'gone';
    const pile = served.filter((s) => s.ware).map((s) => this.content.item(s.ware).dirty ?? s.ware);
    if (g.got.cutlery) pile.push(this.content.item(g.got.cutlery).dirty ?? g.got.cutlery);
    if (pile.length) this.dirty.set(seat.key, pile);
    this.guests.delete(seat.key);
    this.leavers.push({ guest: g, seat: seat.key, layout: seat.layout, t: 0, total: Math.max(1, g.walkTotal) });
    this.changed();
    return g;
  }

  private seat(seat: SeatRef, menu: Record<Course, string[]>): void {
    const look = this.looks[Math.floor(this.rng() * this.looks.length)];
    const folk = this.content.folk[look] ? look : 'human';
    // how many courses: just one, mostly, while the inn is little known; more as its name grows
    const allowed: Course[] = seat.bar ? ['drink', 'snack'] : [...COURSES];
    const most = this.reputation.level <= 2 ? (this.rng() < 0.8 ? 1 : 2) : 1 + Math.floor(this.rng() * Math.min(3, allowed.length));
    const courses = [...allowed].sort(() => this.rng() - 0.5).slice(0, Math.max(1, Math.min(most, allowed.length)));
    const order: Order = {};
    for (const c of courses) order[c] = this.want(menu[c], folk);
    const g: Guest = {
      look, folk, bar: seat.bar, order, craving: this.craving(folk), got: {}, state: 'arriving', walk: seat.walk ?? 3, walkTotal: seat.walk ?? 3,
      patience: PATIENCE, patienceMax: PATIENCE, eating: 0, waited: 0, mess: 0, seated: this.seatedCount++, seat: seat.key,
    };
    this.guests.set(seat.key, g);
    this.visits.push(g);
    this.changed();
  }

  /** What a guest of a folk quietly craves: drawn by the folk's weights. */
  private craving(folk: string): string {
    const w = Object.entries(this.content.folk[folk]?.cravings ?? { hearty: 1 });
    let r = this.rng() * w.reduce((n, [, v]) => n + v, 0);
    for (const [t, v] of w) if ((r -= v) <= 0) return t;
    return w[w.length - 1][0];
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

  /** How well a dish fits a guest's slot for a course. */
  fit(g: Guest, c: Course, dish: string): NonNullable<Served['fit']> {
    if (this.content.course(dish) !== c) return 'wrong course';
    const w = g.order[c] ?? {};
    if (w.dish && w.dish !== dish) return 'not asked';
    if (w.trait && !this.content.traits(dish).includes(w.trait)) return 'not asked';
    return 'right';
  }

  /**
   * Serve something ready into one of a guest's course slots (it leaves the ready slots). Anything can go
   * in any empty slot; how well it fits is remembered. A main brings cutlery (if `cutlery` finds a clean
   * set). Each thing brought buys more patience; with every slot filled, they start eating. Returns why
   * not, or null once served.
   */
  serve(ready: number, seatKey: string, c: Course, cutlery: () => string | null): string | null {
    const s = this.ready[ready];
    const g = this.guests.get(seatKey);
    if (!s) return 'Choose something ready to serve';
    if (isSetting(s)) return "Those are dirty dishes: they're for the wash station";
    if (!g) return 'Nobody is sitting there';
    if (g.state === 'arriving') return "They're still coming in";
    if (g.state !== 'waiting') return "They've already been served";
    if (!(c in g.order)) return `They didn't want a ${COURSE_NAMES[c]}`;
    if (g.got[c]) return `They already have their ${COURSE_NAMES[c]}`;
    this.ready.splice(ready, 1);
    g.got = { ...g.got, [c]: { ...s, after: g.waited, fit: this.fit(g, c, s.dish) } };
    if (this.content.course(s.dish) === 'main' && !g.got.cutlery) g.got.cutlery = cutlery() ?? undefined;
    g.patience += PATIENCE_PER_PART;
    g.patienceMax += PATIENCE_PER_PART;
    if (this.wants(g).every((w) => g.got[w])) {
      g.state = 'eating';
      g.eating = EAT_TIME;
    }
    this.changed();
    return null;
  }

  /**
   * Clear one dirty piece from a seat into the ready slots: a seat's dishes all go in one slot (a place
   * setting), so the slots hold up to four settings. Returns it, or why not.
   */
  clearOne(seatKey: string, i: number): { item: string } | { why: string } {
    const pile = this.dirty.get(seatKey);
    const item = pile?.[i];
    if (!pile || !item) return { why: 'Nothing to clear' };
    let slot = this.ready.find((r): r is Setting => isSetting(r) && r.seat === seatKey);
    if (!slot) {
      if (this.ready.length >= READY_MAX) return { why: 'Your hands are full: take some to the wash station first' };
      slot = { dirty: [], seat: seatKey };
      this.ready.push(slot);
    }
    slot.dirty.push(item);
    pile.splice(i, 1);
    if (!pile.length) this.dirty.delete(seatKey);
    this.changed();
    return { item };
  }

  /** Dirty pieces in the ready slots, of one kind. */
  dirtyReady(item: string): number {
    return this.ready.reduce((n, r) => n + (isSetting(r) ? r.dirty.filter((d) => d === item).length : 0), 0);
  }

  /** Take one dirty piece of a kind out of the ready slots (an emptied setting frees its slot). */
  takeDirty(item: string): boolean {
    const i = this.ready.findIndex((r) => isSetting(r) && r.dirty.includes(item));
    if (i < 0) return false;
    const s = this.ready[i] as Setting;
    s.dirty.splice(s.dirty.indexOf(item), 1);
    if (!s.dirty.length) this.ready.splice(i, 1);
    this.changed();
    return true;
  }
}
