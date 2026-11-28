/**
 * What each shop has out, and buying and selling. Each shop has a themed pool (gamedata) and a handful
 * of it is out at a time, plus anything it always carries. A shop keeps hours (gamedata) and opens each
 * morning with fresh stock: a new handful from its pool, and what it always carries topped up. Through
 * the day things sell to other folk and run out (worked out lazily, from the time since the shop was last
 * visited); what's sold out stays sold out till the next morning. Prices come from gamedata; shops buy
 * back only what gamedata says they buy.
 */
import type { Content, StockEntry } from '../game/data';
import type { Clock } from './clock';
import type { Bag } from './inventory';

export interface Shelf { item: string; price: number; left: number; always: boolean }

export type TradeResult = { ok: true } | { ok: false; reason: string };

const SELL_RATE = 1 / 150; // of each thing out, other folk buy about one every this many game minutes

interface ShopState { shelf: Shelf[]; checked: number; day: number }

export class Shops {
  private readonly shops = new Map<string, ShopState>();

  constructor(private readonly content: Content, private readonly clock: Clock, private readonly rng = Math.random) {
    for (const id of Object.keys(content.shops)) {
      const s: ShopState = { shelf: [], checked: clock.minutes, day: clock.day };
      this.restock(id, s);
      this.shops.set(id, s);
    }
  }

  /** A morning's fresh stock: a new handful from the pool, and what's always carried. */
  private restock(id: string, s: ShopState): void {
    const shop = this.content.shop(id);
    s.shelf = [...this.pick(shop.pool, shop.shelf, new Set()).map((e) => this.line(e, false)), ...shop.always.map((e) => this.line(e, true))];
  }

  /** Whether a shop is open now. */
  open(shop: string): boolean {
    return this.clock.within(this.content.shop(shop).hours);
  }

  /** "Opens at 8 am" (or "Closed for the night"). */
  hoursText(shop: string): string {
    const [open, close] = this.content.shop(shop).hours;
    const at = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
    return `Open ${at(open)} to ${at(close)}`;
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
   * Catch a shop up on the time since it was last visited: a new day's fresh stock, and things sold to
   * other folk since. Call when the player walks up to it (not while they browse).
   */
  visit(shop: string): void {
    const s = this.state(shop);
    if (this.clock.day > s.day) {
      s.day = this.clock.day;
      s.checked = Math.max(s.checked, this.clock.minutes - (this.clock.hour - this.content.shop(shop).hours[0]) * 60);
      this.restock(shop, s);
    }
    const elapsed = Math.max(0, this.clock.minutes - s.checked);
    s.checked = this.clock.minutes;
    for (const line of s.shelf) {
      if (line.always) continue;
      const sold = Math.floor(elapsed * SELL_RATE + this.rng());
      if (line.left > 0 && sold > 0) line.left = Math.max(0, line.left - sold);
    }
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
    if (bag.room(item) < n) return { ok: false, reason: bag.why(item) ?? "That's more than you can carry" };
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
