/** Typed views of the parts of gamedata.json the engine uses. gamedata.json stays the single source of truth. */
import type { GameData } from '../core/assets';

/** Where an item is kept in the inn (see world/containers.ts); dishes are kept on the serving counter. */
export type Store = 'pantry' | 'shelf' | 'cask' | 'tableware' | 'supply';
/** Which inventory tab a store's things show under. */
export const SECTION: Record<Store, 'kitchen' | 'inn'> = { pantry: 'kitchen', shelf: 'kitchen', cask: 'kitchen', tableware: 'kitchen', supply: 'inn' };

export interface ItemData {
  name: string;
  kind: string;
  store?: Store;
  /** Tableware: what piece it is. */
  tableware?: { kind: 'plate' | 'bowl' | 'mug' | 'cutlery'; material: string; tier: number };
  /** Prepared items: how they're made (a station and its inputs; an input listed twice is needed twice). */
  made_by?: Array<{ station: string; inputs: string[] }>;
  tags: string[];
  value: number;
  shelf_life_days?: number;
  sprite: { sheet: string; frame: string };
  /** Tableware: the clean piece a dirty one washes back to. */
  washes_to?: string;
  /** Tableware: what a clean piece becomes once used. */
  dirty?: string;
}
export interface StationData { name: string; verb: string; method: string; sprite: { sheet: string; frame: string } }
export interface DishData { name: string; components: string[]; kind: 'food' | 'drink'; value: number }
/** One way to make something: what goes in, what comes out. */
export interface Recipe { out: string; inputs: string[] }

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
  readonly stations: Record<string, StationData>;
  /** Dishes as served (food or drink) and what goes on the plate. */
  readonly dishes: Record<string, DishData>;
  private readonly recipes = new Map<string, Recipe[]>();

  constructor(data: GameData) {
    const dishes = data.dishes as Record<string, Omit<ItemData, 'kind'>>;
    this.items = {
      ...(data.items as Record<string, ItemData>),
      ...Object.fromEntries(Object.entries(dishes).map(([id, d]) => [id, { ...d, kind: 'dish' }])),
    };
    this.shops = data.shops as Record<string, ShopData>;
    this.forageNodes = data.forage_nodes as Record<string, ForageNodeData>;
    this.economy = data.economy as Economy;
    this.stations = data.stations as Record<string, StationData>;
    this.dishes = dishes as unknown as Record<string, DishData>;
    for (const [id, it] of Object.entries(this.items)) {
      for (const m of it.made_by ?? []) {
        const list = this.recipes.get(m.station) ?? [];
        list.push({ out: id, inputs: m.inputs });
        this.recipes.set(m.station, list);
      }
    }
  }

  /** Everything a station makes, by name. */
  recipesAt(station: string): Recipe[] {
    return [...(this.recipes.get(station) ?? [])].sort((a, b) => this.itemName(a.out).localeCompare(this.itemName(b.out)));
  }

  /** What a station makes from exactly these inputs (in any order), if anything. */
  recipeFor(station: string, inputs: string[]): Recipe | undefined {
    const key = [...inputs].sort().join('+');
    return this.recipes.get(station)?.find((r) => [...r.inputs].sort().join('+') === key);
  }

  /** Everything that goes into something at a station. */
  ingredientsAt(station: string): Set<string> {
    return new Set((this.recipes.get(station) ?? []).flatMap((r) => r.inputs));
  }

  /** The most things that go into any one recipe at a station. */
  mostInputsAt(station: string): number {
    return Math.max(1, ...(this.recipes.get(station) ?? []).map((r) => r.inputs.length));
  }

  /** The cooking station a piece of art is (its frame, or its animation's), if it's one. The plate is the serving counter's. */
  stationOfArt(art: string): string | undefined {
    const frame = art.replace(/^anim:/, '').replace(/_f\d+$/, '');
    return Object.keys(this.stations).find((k) => k !== 'plate' && this.stations[k].sprite.frame === frame);
  }

  /** A dish plated: its components, and what it's served on. */
  dish(id: string): DishData {
    const d = this.dishes[id];
    if (!d) throw new Error(`Unknown dish "${id}"`);
    return d;
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
