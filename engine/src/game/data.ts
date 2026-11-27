/** Typed views of the parts of gamedata.json the engine uses. gamedata.json stays the single source of truth. */
import type { GameData } from '../core/assets';

export interface ItemData {
  name: string;
  kind: string;
  tags: string[];
  value: number;
  shelf_life_days?: number;
  sprite: { sheet: string; frame: string };
  /** Tableware: the clean piece a dirty one washes back to. */
  washes_to?: string;
  /** Tableware: what a clean piece becomes once used. */
  dirty?: string;
}
export interface StockEntry { item: string; price: number; daily_qty: number }
interface ShopBase { name: string; building: string | null; buys: string[] }
/** A shop with a fixed list of goods, or the market, which sells a few of its pool each day. */
export type ShopData =
  | (ShopBase & { stock: StockEntry[] })
  | (ShopBase & { stock: 'rotating'; pool: StockEntry[]; daily_items: number });
export interface ForageNodeData { yields: string; spot: string | null; states: { ready: string; harvested: string } }
export interface Economy { starting_coins: number; bag_slots: number; stack_size: number; sell_ratio: number }

export class Content {
  /** Ingredients and prepared items, plus dishes (a bag can hold either). */
  readonly items: Record<string, ItemData>;
  readonly shops: Record<string, ShopData>;
  readonly forageNodes: Record<string, ForageNodeData>;
  readonly economy: Economy;

  constructor(data: GameData) {
    const dishes = data.dishes as Record<string, Omit<ItemData, 'kind'>>;
    this.items = {
      ...(data.items as Record<string, ItemData>),
      ...Object.fromEntries(Object.entries(dishes).map(([id, d]) => [id, { ...d, kind: 'dish' }])),
    };
    this.shops = data.shops as Record<string, ShopData>;
    this.forageNodes = data.forage_nodes as Record<string, ForageNodeData>;
    this.economy = data.economy as Economy;
  }

  item(id: string): ItemData {
    const it = this.items[id];
    if (!it) throw new Error(`Unknown item "${id}"`);
    return it;
  }

  itemName(id: string): string {
    return this.items[id]?.name ?? id;
  }

  /** What a shop pays the player for one of an item. */
  sellPrice(id: string): number {
    return Math.max(1, Math.round(this.item(id).value * this.economy.sell_ratio));
  }

  shop(id: string): ShopData {
    const s = this.shops[id];
    if (!s) throw new Error(`Unknown shop "${id}"`);
    return s;
  }

  forageNode(id: string): ForageNodeData {
    const n = this.forageNodes[id];
    if (!n) throw new Error(`Unknown forage node "${id}"`);
    return n;
  }
}
