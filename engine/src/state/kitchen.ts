/**
 * The inn's stores: every storage container in the inn's maps, rolled up into one place. The Kitchen
 * tab shows the kitchen's things across all of them (ingredients, prepped food, drinks, tableware), the
 * Inn tab the inn's supplies; a crate can hold both, and each thing shows under its own tab.
 *
 * Cooking draws from here (then the player's bag) and puts what it makes back here, into the first
 * container that takes it and has room: prepped food onto shelves, drinks into barrels and kegs. With
 * nowhere to put it, nothing is made. Plating at the serving counter takes a dish's components and a
 * clean plate (a mug for a drink; a bowl if there are no plates), and the dish goes onto a serving tray
 * (see state/service.ts). Pure state, no drawing.
 */
import { SECTION, type Content, type Recipe, type Store } from '../game/data';
import { containerOf, type ContainerSpec } from '../world/containers';
import type { Layout } from '../world/layout';
import type { Bag, Inventory, Stack } from './inventory';
import type { Storage } from './storage';
import { TRAY_MEALS, type Part, type Tray } from './service';

/** The inn's maps: every map whose id starts with "inn". */
export const isInn = (layoutId: string) => layoutId.startsWith('inn');

export interface Box { id: string; spec: ContainerSpec; inv: Inventory }

/** What a container takes: things whose store it holds. */
export function accepts(spec: ContainerSpec | undefined, content: Content): (item: string) => boolean {
  return (item) => {
    const store = content.items[item]?.store;
    return !!spec && !!store && spec.holds.includes(store);
  };
}

export class InnStores {
  constructor(
    private readonly storage: Storage,
    private readonly layouts: Map<string, Layout>,
    private readonly content: Content,
  ) {}

  /** Every container in the inn, in map order. */
  boxes(): Box[] {
    const out: Box[] = [];
    for (const l of this.layouts.values()) {
      if (!isInn(l.id)) continue;
      for (const p of l.props) {
        const b = p.behavior;
        if (b?.type !== 'storage' || typeof p.sprite !== 'string') continue;
        const spec = containerOf(p.sprite);
        if (!spec) continue;
        out.push({ id: b.id, spec, inv: this.storage.get(b.id, b.slots, b.contents, accepts(spec, this.content)) });
      }
    }
    return out;
  }

  count(item: string): number {
    return this.boxes().reduce((n, b) => n + b.inv.count(item), 0);
  }

  room(item: string): number {
    return this.boxes().reduce((n, b) => n + b.inv.room(item), 0);
  }

  /** Put up to n away, container by container; returns how many went in. */
  add(item: string, n: number): number {
    let left = n;
    for (const b of this.boxes()) if (left > 0) left -= b.inv.add(item, left);
    return n - left;
  }

  /** Take n out (from the last containers first); false and no change if there aren't that many. */
  remove(item: string, n: number): boolean {
    const boxes = this.boxes();
    if (boxes.reduce((k, b) => k + b.inv.count(item), 0) < n) return false;
    let left = n;
    for (const b of boxes.reverse()) {
      const k = Math.min(left, b.inv.count(item));
      if (k) b.inv.remove(item, k);
      left -= k;
    }
    return true;
  }

  /** Everything held for one tab, each item once with its total, in name order. */
  contents(section: 'kitchen' | 'inn'): Stack[] {
    const totals = new Map<string, number>();
    for (const b of this.boxes()) {
      for (const s of b.inv.contents()) {
        const store = this.content.items[s.item]?.store;
        if (store && SECTION[store] === section) totals.set(s.item, (totals.get(s.item) ?? 0) + s.count);
      }
    }
    return [...totals].map(([item, count]) => ({ item, count }))
      .sort((a, b) => this.content.itemName(a.item).localeCompare(this.content.itemName(b.item)));
  }

  /** Slots used and held, by kind of container, for the containers holding a tab's things. */
  capacity(section: 'kitchen' | 'inn'): Array<{ group: string; used: number; slots: number }> {
    const out = new Map<string, { used: number; slots: number }>();
    for (const b of this.boxes()) {
      if (!b.spec.holds.some((s) => SECTION[s] === section)) continue;
      const g = out.get(b.spec.group) ?? { used: 0, slots: 0 };
      g.used += b.inv.slots.filter(Boolean).length;
      g.slots += b.inv.slots.length;
      out.set(b.spec.group, g);
    }
    return [...out].map(([group, g]) => ({ group, ...g }));
  }

  /** Where a store's things go, for messages ("No room on the shelves"). */
  static placeFor(store: Store | undefined): string {
    return ({ pantry: 'in the crates', shelf: 'on the shelves', cask: 'in the barrels', tableware: 'in the crates', supply: 'in the chests' } as Record<string, string>)[store ?? ''] ?? 'anywhere';
  }
}

/** Why something can't be made or plated right now, or null if it can. */
export type Blocker = string | null;

/**
 * The kitchen at work: what's to hand (the inn's stores and the bag), making things at a station, and
 * plating at the counter. Ingredients come out of the stores first, then the bag.
 */
export class Kitchen {
  constructor(
    readonly stores: InnStores,
    private readonly bag: Bag,
    private readonly content: Content,
  ) {}

  have(item: string): number {
    return this.stores.count(item) + this.bag.count(item);
  }

  /** Each input with how many are needed (an input listed twice is needed twice). */
  needs(inputs: string[]): Stack[] {
    const out: Stack[] = [];
    for (const i of inputs) {
      const hit = out.find((o) => o.item === i);
      if (hit) hit.count++;
      else out.push({ item: i, count: 1 });
    }
    return out;
  }

  private missing(inputs: string[]): Blocker {
    const short = this.needs(inputs).find((n) => this.have(n.item) < n.count);
    return short ? `Need ${this.content.itemName(short.item)}` : null;
  }

  private use(inputs: string[]): void {
    for (const n of this.needs(inputs)) {
      const fromStores = Math.min(n.count, this.stores.count(n.item));
      if (fromStores) this.stores.remove(n.item, fromStores);
      if (n.count > fromStores) this.bag.remove(n.item, n.count - fromStores);
    }
  }

  canMake(r: Recipe): Blocker {
    const short = this.missing(r.inputs);
    if (short) return short;
    // the inputs it uses up may free a slot, but don't count on it: there must be room now
    if (!this.stores.room(r.out)) return `No room ${InnStores.placeFor(this.content.item(r.out).store)}`;
    return null;
  }

  make(r: Recipe): Blocker {
    const why = this.canMake(r);
    if (why) return why;
    this.use(r.inputs);
    this.stores.add(r.out, 1);
    return null;
  }

  /** The clean piece a dish would go on: the best tier there is (plates, then bowls, for food; mugs for drink). */
  ware(dish: string): string | null {
    const kinds = this.content.dish(dish).kind === 'drink' ? ['mug'] : ['plate', 'bowl'];
    for (const kind of kinds) {
      const pieces = Object.entries(this.content.items)
        .filter(([, it]) => it.tableware?.kind === kind && !it.washes_to)
        .sort((a, b) => b[1].tableware!.tier - a[1].tableware!.tier);
      const got = pieces.find(([id]) => this.have(id) > 0);
      if (got) return got[0];
    }
    return null;
  }

  /** The best clean cutlery to hand, if any. */
  cutlery(): string | null {
    const sets = Object.entries(this.content.items)
      .filter(([, it]) => it.tableware?.kind === 'cutlery' && !it.washes_to)
      .sort((a, b) => b[1].tableware!.tier - a[1].tableware!.tier);
    return sets.find(([id]) => this.have(id) > 0)?.[0] ?? null;
  }

  canPlate(dish: string, tray: Tray): Blocker {
    const short = this.missing(this.content.dish(dish).components);
    if (short) return short;
    if (!this.ware(dish)) return this.content.dish(dish).kind === 'drink' ? 'No clean mugs' : 'No clean plates';
    if (tray.freeMeal(this.content.dish(dish).kind) < 0) return `The tray is full (${TRAY_MEALS} meals)`;
    return null;
  }

  /** Plate a dish onto a tray: into the first meal still without one of its kind (food or drink). */
  plate(dish: string, tray: Tray): Blocker {
    const why = this.canPlate(dish, tray);
    if (why) return why;
    const ware = this.ware(dish)!;
    const part = this.content.dish(dish).kind;
    this.use([...this.content.dish(dish).components, ware]);
    const i = tray.freeMeal(part);
    tray.meals[i] = { ...(tray.meals[i] ?? {}), [part]: { dish, ware } };
    return null;
  }

  /** Lay a set of cutlery on a tray, with the first meal that hasn't any. */
  addCutlery(tray: Tray): Blocker {
    const set = this.cutlery();
    if (!set) return 'No clean cutlery';
    const i = tray.freeMeal('cutlery');
    if (i < 0) return `The tray is full (${TRAY_MEALS} meals)`;
    this.use([set]);
    tray.meals[i] = { ...(tray.meals[i] ?? {}), cutlery: set };
    return null;
  }

  /**
   * Take a part of a meal back off a tray: a dish is unplated (its components and what it was on go back
   * to the stores, or the bag), cutlery goes back. Nothing moves if there's nowhere to put it all.
   */
  takeOff(tray: Tray, meal: number, part: Part): Blocker {
    const m = tray.meals[meal];
    const got = m?.[part];
    if (!m || !got) return null;
    const back = typeof got === 'string' ? [got] : [...this.content.dish(got.dish).components, got.ware];
    const need = this.needs(back);
    if (need.some((n) => this.stores.room(n.item) + this.bag.room(n.item) < n.count)) return 'No room to put it back';
    for (const n of need) {
      const k = this.stores.add(n.item, n.count);
      if (k < n.count) this.bag.add(n.item, n.count - k);
    }
    delete m[part];
    tray.tidy();
    return null;
  }

  /** Whether an item is to hand, or one step at a station from things to hand. */
  private soon(item: string): boolean {
    if (this.have(item) > 0) return true;
    return (this.content.items[item]?.made_by ?? []).some((m) => m.inputs.every((i) => this.have(i) > 0));
  }

  /** What guests can order: dishes whose components are all to hand or one step away. */
  menu(): { food: string[]; drink: string[] } {
    const out = { food: [] as string[], drink: [] as string[] };
    for (const [id, d] of Object.entries(this.content.dishes)) {
      if (d.components.every((c) => this.soon(c))) out[d.kind].push(id);
    }
    return out;
  }

  /** Dishes that could be plated from what's to hand (ignoring tableware and counter room), by name. */
  plateable(): string[] {
    return Object.keys(this.content.dishes)
      .filter((d) => !this.missing(this.content.dish(d).components))
      .sort((a, b) => this.content.itemName(a).localeCompare(this.content.itemName(b)));
  }
}
