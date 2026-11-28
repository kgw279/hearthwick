/**
 * Serving guests. Pure state, no drawing.
 *
 * Dishes and drinks are plated at the plating station and wait there, ready to serve (up to four at a
 * time; plates and mugs limit them too). At a table or the bar, what's ready is served straight to a
 * guest: no carrying.
 *
 * Guests sit at seats (see game/seating.ts): at a table they order a dish and/or a drink; at the bar, a
 * drink, a simple dish or a raw snack. Served what they ordered, they eat a while, pay and leave, and
 * what they ate from is left dirty where they sat.
 *
 * Patience is gentle, not a race: it's only a way for guests nobody's going to serve to move on. A
 * guest waits a good while, longer each time something they ordered arrives, and if nothing comes they
 * leave without paying. The player can also politely dismiss a guest: they pay nothing (not even for what
 * they've had), and they're happier about it the sooner it's done.
 */
import type { Content } from '../game/data';

/**
 * A dish as served: the dish and what it's on (a plate or bowl, or a mug). A raw snack is plated as it
 * is: its item, on a plate.
 */
export interface Served { dish: string; ware: string }
export interface Meal { food?: Served; drink?: Served; cutlery?: string }

/** How many plated dishes and drinks the plating station holds ready at once. */
export const READY_MAX = 4;

/** What a guest ordered: dishes (or, at the bar, a raw snack as food). */
export interface Order { food?: string; drink?: string }

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
export interface Leaving { seat: SeatRef; guest: Guest; how: 'paid' | 'gave up' | 'dismissed'; coins: number; mood: number }

const EAT_TIME = 15; // seconds a served guest eats before paying and leaving
const PATIENCE = 150; // seconds a guest waits for what they ordered...
const PATIENCE_PER_PART = 90; // ...and more for each part of it brought
const PROMPT = 20; // seconds: dismissed sooner than this, a guest doesn't mind at all
const ARRIVE_EVERY = 20; // seconds between guests arriving, while there's an empty seat
const FIRST_GUESTS = 2; // seated at the start

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

  constructor(private readonly content: Content, private readonly looks: string[], private readonly rng = Math.random) {}

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

  /** How much of their stay is left, 1 to 0: patience while waiting, the meal while eating. */
  stayLeft(g: Guest): number {
    return g.state === 'waiting' ? Math.max(0, g.patience / g.patienceMax) : Math.max(0, g.eating / EAT_TIME);
  }

  /** Whether a dish or snack is food or drink. */
  kindOf(dish: string): 'food' | 'drink' {
    return this.content.dishes[dish]?.kind ?? 'food';
  }

  /**
   * Advance time: waiting guests lose patience, served ones finish eating; new guests arrive at empty
   * seats. menu(bar): what a guest there could order. Each guest who leaves is passed to `left`.
   */
  update(dt: number, seats: SeatRef[], menu: (bar: boolean) => { food: string[]; drink: string[] }, left: (l: Leaving) => void): void {
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
      this.arrive = ARRIVE_EVERY;
      return;
    }
    if ((this.arrive -= dt) > 0) return;
    this.arrive = ARRIVE_EVERY;
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
    if (how === 'paid') {
      for (const s of [g.got.food, g.got.drink]) if (s) coins += this.worth(s);
      if (g.got.food && this.content.dishes[g.got.food.dish] && !g.got.cutlery) coins -= 1;
      coins = Math.max(1, coins);
    }
    const mood = how === 'paid' ? 1 : how === 'gave up' ? 0 : g.waited < PROMPT ? 0.8 : Math.max(0.2, 0.8 - this.restless(g) * 0.6);
    this.happiness += mood;
    const pile = this.dirty.get(seat.table) ?? [];
    for (const s of [g.got.food, g.got.drink]) if (s?.ware) pile.push(this.content.item(s.ware).dirty ?? s.ware);
    if (g.got.cutlery) pile.push(this.content.item(g.got.cutlery).dirty ?? g.got.cutlery);
    this.dirty.set(seat.table, pile);
    this.guests.delete(seat.key);
    this.changed();
    return { seat, guest: g, how, coins, mood };
  }

  private seat(seat: SeatRef, menu: { food: string[]; drink: string[] }): void {
    const look = this.looks[Math.floor(this.rng() * this.looks.length)];
    const folk = this.content.folk[look] ? look : 'human';
    const pick = (list: string[]) => this.favourite(list, folk);
    const order: Order = {};
    if (menu.food.length && this.rng() < (seat.bar ? 0.4 : 0.8)) order.food = pick(menu.food);
    if (menu.drink.length && (this.rng() < 0.7 || !order.food)) order.drink = pick(menu.drink);
    if (!order.food && !order.drink) order.drink = 'dish_cup_of_well_water';
    this.guests.set(seat.key, { look, folk, bar: seat.bar, order, got: {}, state: 'waiting', patience: PATIENCE, patienceMax: PATIENCE, eating: 0, waited: 0 });
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
    const part = this.kindOf(s.dish);
    const name = (d: string) => this.content.itemName(d);
    if (g.got[part]) return `They already have their ${part === 'food' ? 'meal' : 'drink'}`;
    if (g.order[part] !== s.dish) return g.order[part] ? `They ordered ${name(g.order[part]!)}` : `They didn't order ${name(s.dish)}`;
    this.ready.splice(ready, 1);
    g.got = { ...g.got, [part]: s };
    if (part === 'food' && this.content.dishes[s.dish] && !g.got.cutlery) g.got.cutlery = cutlery() ?? undefined;
    g.patience += PATIENCE_PER_PART;
    g.patienceMax += PATIENCE_PER_PART;
    if ((!g.order.food || g.got.food) && (!g.order.drink || g.got.drink)) {
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
