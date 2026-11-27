/**
 * What each shop has on its shelves today, and buying and selling. Shops restock every morning to
 * their daily quantities (the market draws a fresh handful from its pool); prices come from gamedata.
 * Shops buy back only what gamedata says they buy, paying the item's sell price.
 */
import { hash2 } from '../core/geom';
import type { Content, StockEntry } from '../game/data';
import type { Bag } from './bag';

export interface Shelf { item: string; price: number; left: number }

export type TradeResult = { ok: true } | { ok: false; reason: string };

export class Shops {
  private readonly shelves = new Map<string, Shelf[]>();
  private day = -1;

  constructor(private readonly content: Content) {}

  /** Restock every shop for a new day (the day number seeds the market's choice). */
  restock(day: number): void {
    this.day = day;
    for (const [id, shop] of Object.entries(this.content.shops)) {
      const entries: StockEntry[] = shop.stock === 'rotating'
        ? pickDaily(shop.pool, shop.daily_items, day, id)
        : shop.stock;
      this.shelves.set(id, entries.map((e) => ({ item: e.item, price: e.price, left: e.daily_qty })));
    }
  }

  get today(): number {
    return this.day;
  }

  shelf(shop: string): Shelf[] {
    const s = this.shelves.get(shop);
    if (!s) throw new Error(`Unknown shop "${shop}"`);
    return s;
  }

  buys(shop: string, item: string): boolean {
    return this.content.shop(shop).buys.includes(item);
  }

  buy(shop: string, item: string, n: number, bag: Bag): TradeResult {
    const line = this.shelf(shop).find((s) => s.item === item);
    if (!line || line.left < n) return { ok: false, reason: 'Sold out' };
    if (bag.coins < line.price * n) return { ok: false, reason: 'Not enough coins' };
    if (bag.room(item) < n) return { ok: false, reason: 'Your bag is full' };
    bag.add(item, n);
    bag.coins -= line.price * n;
    line.left -= n;
    return { ok: true };
  }

  sell(shop: string, item: string, n: number, bag: Bag): TradeResult {
    if (!this.buys(shop, item)) return { ok: false, reason: "They don't buy that" };
    if (!bag.remove(item, n)) return { ok: false, reason: "You don't have that many" };
    bag.coins += this.content.sellPrice(item) * n;
    return { ok: true };
  }
}

/** A day's handful from a pool: deterministic for the day, so reloading doesn't reshuffle the market. */
function pickDaily(pool: StockEntry[], n: number, day: number, seed: string): StockEntry[] {
  const salt = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return pool
    .map((e, i) => ({ e, k: hash2(day * 31 + salt, i) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.e)
    .sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
}
