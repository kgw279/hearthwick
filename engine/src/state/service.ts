/**
 * Serving guests. Pure state, no drawing.
 *
 * Serving trays carry meals from the counter to the tables: up to four meals each, a meal being a
 * plated dish, a drink in a mug and a set of cutlery (any of them). A tray sits on a spot on the
 * serving counter, or is carried by the player.
 *
 * Guests sit at seats (chairs facing a table, see game/seating.ts) and order a dish and/or a drink.
 * Served what they ordered, they eat a while, pay for it and leave, and what they ate from is left
 * dirty on the table to be cleared and washed.
 */
import type { Content } from '../game/data';

export type Part = 'food' | 'drink' | 'cutlery';
export const PARTS: Part[] = ['food', 'drink', 'cutlery'];

/** A dish as served: the dish and what it's on (a plate or bowl, or a mug). */
export interface Served { dish: string; ware: string }
export interface Meal { food?: Served; drink?: Served; cutlery?: string }

export const TRAY_MEALS = 4;

export class Tray {
  meals: Meal[] = [];
  /** Where it is: a spot on the counter (by index), or carried. */
  spot: number | null;

  constructor(readonly id: number, spot: number) {
    this.spot = spot;
  }

  get carried(): boolean {
    return this.spot === null;
  }

  /** Each meal's slot for a part, in order: the first meal that hasn't got one, or a new meal. */
  freeMeal(part: Part): number {
    const i = this.meals.findIndex((m) => !m[part]);
    if (i >= 0) return i;
    return this.meals.length < TRAY_MEALS ? this.meals.length : -1;
  }

  /** Drop meals left with nothing on them. */
  tidy(): void {
    this.meals = this.meals.filter((m) => m.food || m.drink || m.cutlery);
  }
}

export interface Order { food?: string; drink?: string }

export interface Guest {
  /** Their sprite (a guest look: dwarf, elf...) and folk (what they like). */
  look: string;
  folk: string;
  order: Order;
  /** What's been brought so far. */
  got: Meal;
  state: 'waiting' | 'eating';
  /** Seconds left eating. */
  eating: number;
}

/** A seat, as the service needs it: its key (map and chair), its map, and the key of its table. */
export interface SeatRef { key: string; layout: string; table: string }

const EAT_TIME = 15; // seconds a served guest eats before paying and leaving
const ARRIVE_EVERY = 20; // seconds between guests arriving, while there's an empty seat
const FIRST_GUESTS = 2; // seated at the start

export class Service {
  readonly trays: Tray[];
  /** By seat key. */
  readonly guests = new Map<string, Guest>();
  /** Dirty pieces left on each table, by table key. */
  readonly dirty = new Map<string, string[]>();
  /** Bumped on every change, so views know to rebuild. */
  version = 0;
  private arrive = 0;
  private started = false;

  constructor(trays: number, private readonly content: Content, private readonly looks: string[], private readonly rng = Math.random) {
    this.trays = Array.from({ length: trays }, (_, i) => new Tray(i, i));
  }

  get carriedTray(): Tray | undefined {
    return this.trays.find((t) => t.carried);
  }

  changed(): void {
    this.version++;
  }

  /**
   * Advance time: guests finish eating (pay and leave, leaving their dishes), new ones arrive at empty
   * seats. menu: what can be ordered (dishes the kitchen could serve soon). pay: coins to the purse.
   */
  update(dt: number, seats: SeatRef[], menu: () => { food: string[]; drink: string[] }, pay: (coins: number, seat: SeatRef) => void): void {
    const here = new Set(seats.map((s) => s.key));
    for (const key of [...this.guests.keys()]) {
      if (!here.has(key)) {
        this.guests.delete(key); // their chair was moved or taken away
        this.changed();
      }
    }
    for (const seat of seats) {
      const g = this.guests.get(seat.key);
      if (!g || g.state !== 'eating') continue;
      g.eating -= dt;
      if (g.eating > 0) continue;
      pay(this.bill(g), seat);
      const left = this.dirty.get(seat.table) ?? [];
      for (const s of [g.got.food, g.got.drink]) if (s) left.push(this.content.item(s.ware).dirty ?? s.ware);
      if (g.got.cutlery) left.push(this.content.item(g.got.cutlery).dirty ?? g.got.cutlery);
      this.dirty.set(seat.table, left);
      this.guests.delete(seat.key);
      this.changed();
    }
    const empty = seats.filter((s) => !this.guests.has(s.key));
    if (!empty.length) return;
    if (!this.started) {
      this.started = true;
      for (let i = 0; i < FIRST_GUESTS && i < empty.length; i++) this.seat(empty[i], menu());
      this.arrive = ARRIVE_EVERY;
      return;
    }
    if ((this.arrive -= dt) > 0) return;
    this.arrive = ARRIVE_EVERY;
    this.seat(empty[Math.floor(this.rng() * empty.length)], menu());
  }

  /** What a guest pays: each dish's worth, a coin less for food eaten without cutlery. */
  private bill(g: Guest): number {
    let coins = 0;
    for (const s of [g.got.food, g.got.drink]) if (s) coins += this.content.dish(s.dish).value;
    if (g.got.food && !g.got.cutlery) coins -= 1;
    return Math.max(1, coins);
  }

  private seat(seat: SeatRef, menu: { food: string[]; drink: string[] }): void {
    const look = this.looks[Math.floor(this.rng() * this.looks.length)];
    const folk = this.content.folk[look] ? look : 'human';
    const pick = (list: string[]) => this.favourite(list, folk);
    const order: Order = {};
    if (menu.food.length && this.rng() < 0.8) order.food = pick(menu.food);
    if (menu.drink.length && (this.rng() < 0.7 || !order.food)) order.drink = pick(menu.drink);
    if (!order.food && !order.drink) order.drink = 'dish_cup_of_well_water';
    this.guests.set(seat.key, { look, folk, order, got: {}, state: 'waiting', eating: 0 });
    this.changed();
  }

  /** A dish from the list, more likely one with tags this folk likes. */
  private favourite(list: string[], folk: string): string {
    const likes = new Set(this.content.folk[folk]?.likes ?? []);
    const weights = list.map((d) => 1 + this.content.dishTags(d).filter((t) => likes.has(t)).length * 2);
    let r = this.rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((r -= weights[i]) <= 0) return list[i];
    return list[list.length - 1];
  }

  /**
   * Give a meal from a tray to the guest in a seat. Everything in it must be something they're still
   * waiting for (cutlery goes with food they ordered); returns why not, or null once served (the meal
   * leaves the tray). Once they have all they ordered, they start eating.
   */
  serve(tray: Tray, meal: number, seatKey: string): string | null {
    const m = tray.meals[meal];
    const g = this.guests.get(seatKey);
    if (!m) return 'Choose a meal on the tray';
    if (!g) return 'Nobody is sitting there';
    if (g.state !== 'waiting') return "They've already been served";
    const name = (d: string) => this.content.itemName(d);
    for (const part of ['food', 'drink'] as const) {
      const s = m[part];
      if (!s) continue;
      if (g.got[part]) return `They already have their ${part === 'food' ? 'meal' : 'drink'}`;
      if (g.order[part] !== s.dish) return g.order[part] ? `They ordered ${name(g.order[part]!)}` : `They didn't order ${name(s.dish)}`;
    }
    if (m.cutlery && (!g.order.food || g.got.cutlery)) return g.got.cutlery ? 'They already have cutlery' : "They don't need cutlery";
    g.got = { ...g.got, ...(m.food ? { food: m.food } : {}), ...(m.drink ? { drink: m.drink } : {}), ...(m.cutlery ? { cutlery: m.cutlery } : {}) };
    tray.meals.splice(meal, 1);
    if ((!g.order.food || g.got.food) && (!g.order.drink || g.got.drink)) {
      g.state = 'eating';
      g.eating = EAT_TIME;
    }
    this.changed();
    return null;
  }

  /** Take what's left dirty on a table (it goes into the bag; the caller says how much fit). */
  clear(table: string, take: (item: string) => boolean): number {
    const left = this.dirty.get(table) ?? [];
    const kept = left.filter((item) => !take(item));
    this.dirty.set(table, kept);
    this.changed();
    return left.length - kept.length;
  }
}
