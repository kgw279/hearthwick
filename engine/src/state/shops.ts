/**
 * What each shop has out, and buying and selling. Each shop has a themed pool (gamedata) and a handful
 * of it is out at a time, plus anything it always carries. Things sell to other folk over time and run
 * out, and something else from the pool takes their place: it's worked out lazily, from the time since
 * the shop was last visited, so every visit is a little different (and never a race: nothing is shown
 * about time). Prices come from gamedata; shops buy back only what gamedata says they buy.
 */
import type { Content, StockEntry } from '../game/data';
import type { Bag } from './inventory';

export interface Shelf { item: string; price: number; left: number; always: boolean }

export type TradeResult = { ok: true } | { ok: false; reason: string };

const SELL_RATE = 1 / 150; // of each thing out, other folk buy about one every this many seconds...
const REPLACE_AFTER = 45; // ...and a sold-out line is replaced with something else after a while

interface ShopState { shelf: Shelf[]; checked: number; emptySince: Map<string, number> }

export class Shops {
  private readonly shops = new Map<string, ShopState>();

  /** clock: game seconds. */
  constructor(private readonly content: Content, private readonly clock: () => number, private readonly rng = Math.random) {
    for (const [id, shop] of Object.entries(content.shops)) {
      const out = this.pick(shop.pool, shop.shelf, new Set());
      this.shops.set(id, {
        shelf: [...out.map((e) => this.line(e, false)), ...shop.always.map((e) => this.line(e, true))],
        checked: clock(),
        emptySince: new Map(),
      });
    }
  }

  private line(e: StockEntry, always: boolean): Shelf {
    // a fresh batch: most of a day's quantity
    const left = always ? e.daily_qty : Math.max(1, Math.round(e.daily_qty * (0.6 + this.rng() * 0.4)));
    return { item: e.item, price: e.price, left, always };
  }

  /** n entries from a pool, at random, leaving out what's already out. */
  private pick(pool: StockEntry[], n: number, out: Set<string>): StockEntry[] {
    const left = pool.filter((e) => !out.has(e.item));
    const got: StockEntry[] = [];
    while (got.length < n && left.length) got.push(left.splice(Math.floor(this.rng() * left.length), 1)[0]);
    return got;
  }

  private state(shop: string): ShopState {
    const s = this.shops.get(shop);
    if (!s) throw new Error(`Unknown shop "${shop}"`);
    return s;
  }

  /**
   * Catch a shop up on the time since it was last visited: things sold to other folk, sold-out lines
   * replaced. Call when the player walks up to it (not while they browse).
   */
  visit(shop: string): void {
    const s = this.state(shop);
    const now = this.clock();
    const elapsed = now - s.checked;
    s.checked = now;
    const pool = this.content.shop(shop).pool;
    s.shelf.forEach((line, i) => {
      if (line.always) {
        line.left = Math.max(line.left, pool.find((e) => e.item === line.item)?.daily_qty ?? line.left);
        return;
      }
      const sold = Math.floor(elapsed * SELL_RATE + this.rng());
      if (line.left > 0 && sold > 0) {
        line.left = Math.max(0, line.left - sold);
        if (line.left === 0) s.emptySince.set(line.item, now - elapsed / 2);
      }
      const since = s.emptySince.get(line.item);
      if (line.left === 0 && since !== undefined && now - since >= REPLACE_AFTER) {
        const [next] = this.pick(pool, 1, new Set(s.shelf.map((l) => l.item)));
        s.emptySince.delete(line.item);
        if (next) s.shelf[i] = this.line(next, false);
      }
    });
  }

  shelf(shop: string): Shelf[] {
    return this.state(shop).shelf;
  }

  buys(shop: string, item: string): boolean {
    return this.content.shop(shop).buys.includes(item);
  }

  buy(shop: string, item: string, n: number, bag: Bag): TradeResult {
    const s = this.state(shop);
    const line = s.shelf.find((l) => l.item === item);
    if (!line || line.left < n) return { ok: false, reason: 'Sold out' };
    if (bag.coins < line.price * n) return { ok: false, reason: 'Not enough coins' };
    if (bag.room(item) < n) return { ok: false, reason: 'Your bag is full' };
    bag.add(item, n);
    bag.coins -= line.price * n;
    line.left -= n;
    if (line.left === 0 && !line.always) s.emptySince.set(item, this.clock());
    return { ok: true };
  }

  sell(shop: string, item: string, n: number, bag: Bag): TradeResult {
    if (!this.buys(shop, item)) return { ok: false, reason: "They don't buy that" };
    if (!bag.remove(item, n)) return { ok: false, reason: "You don't have that many" };
    bag.coins += this.content.sellPrice(item) * n;
    return { ok: true };
  }
}
