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
  /** Where it can be had: foraged at a spot, bought at a shop... */
  sources?: Array<{ type: string; shop?: string; spot?: string }>;
  /** How heavy it is to carry. */
  weight?: number;
  /** Snacks served as they are: their course, traits and complexity (like a dish's). */
  course?: Course;
  traits?: string[];
  complexity?: number;
  /** Prepared items: how they're made (a station and its inputs; an input listed twice is needed twice). */
  made_by?: Array<{ station: string; inputs: string[] }>;
  tags: string[];
  value: number;
  shelf_life_days?: number;
  sprite: { sheet: string; frame: string };
  /** Tableware: the wet piece a dirty one washes to. */
  washes_to?: string;
  /** Tableware: the clean piece a wet one dries to. */
  dries_to?: string;
  /** Tableware: what a clean piece becomes once used. */
  dirty?: string;
}
export interface StationData { name: string; verb: string; method: string; sprite: { sheet: string; frame: string } }
export interface DishData {
  name: string; components: string[]; kind: 'food' | 'drink'; value: number; tags: string[];
  /** How interesting it is (the prep behind it), its course, and what a guest might ask for it by. */
  complexity: number; reputation: number; course: Course; traits: string[];
}
export interface FolkData { name: string; likes: string[]; hates: string | null; /** what they quietly crave, by weight */ cravings: Record<string, number> }
/**
 * The courses a guest orders: a drink, a snack (something small served as it is, or a dish of one thing),
 * a main dish, a dessert (gamedata decides which each dish is).
 */
export type Course = 'drink' | 'snack' | 'main' | 'dessert';
export const COURSES: Course[] = ['drink', 'snack', 'main', 'dessert'];
export const COURSE_NAMES: Record<Course, string> = { drink: 'drink', snack: 'snack', main: 'main dish', dessert: 'dessert' };

/** One way to make something: what goes in, what comes out. */
export interface Recipe { out: string; inputs: string[] }

export interface StockEntry { item: string; price: number; daily_qty: number }
/**
 * A shop: a themed pool of what it might have out (`shelf` of them at a time), what it always has, and
 * what it buys back. The market is a stall, not a building.
 */
export interface ShopData {
  name: string; building: string | null; buys: string[];
  market: boolean; pool: StockEntry[]; always: StockEntry[]; shelf: number;
}
export interface ForageNodeData { yields: string; spot: string | null; states: { ready: string; harvested: string } }
export interface Economy { starting_coins: number; bag_slots: number; stack_size: number; bag_weight: number; sell_ratio: number }

export class Content {
  /** Ingredients and prepared items, plus dishes (a bag can hold either). */
  readonly items: Record<string, ItemData>;
  readonly shops: Record<string, ShopData>;
  readonly forageNodes: Record<string, ForageNodeData>;
  /** Forage spots' names, by id ("Sunny Meadow"). */
  readonly spotNames: Record<string, string>;
  readonly economy: Economy;
  readonly stations: Record<string, StationData>;
  /** Dishes as served (food or drink) and what goes on the plate. */
  readonly dishes: Record<string, DishData>;
  readonly folk: Record<string, FolkData>;
  /** What the bar serves: raw snacks, and dishes of at most this many components. */
  readonly bar: { snacks: string[]; max_components: number };
  /** Things served just as they are (plated on their own): raw snacks and small prepped things. */
  readonly snacks: string[];
  private readonly recipes = new Map<string, Recipe[]>();

  constructor(data: GameData) {
    const dishes = data.dishes as Record<string, Omit<ItemData, 'kind'>>;
    this.items = {
      ...(data.items as Record<string, ItemData>),
      ...Object.fromEntries(Object.entries(dishes).map(([id, d]) => [id, { ...d, kind: 'dish' }])),
    };
    this.shops = data.shops as Record<string, ShopData>;
    this.forageNodes = data.forage_nodes as Record<string, ForageNodeData>;
    this.spotNames = Object.fromEntries(Object.entries(data.forage_spots as Record<string, { name: string }>).map(([k, v]) => [k, v.name]));
    this.economy = data.economy as Economy;
    this.stations = data.stations as Record<string, StationData>;
    this.dishes = dishes as unknown as Record<string, DishData>;
    this.folk = data.folk as Record<string, FolkData>;
    this.bar = data.bar as { snacks: string[]; max_components: number };
    this.snacks = data.snacks as string[];
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

  /** The dish made from exactly these components (in any order), if any. */
  dishFor(components: string[]): string | undefined {
    const key = [...components].sort().join('+');
    return Object.keys(this.dishes).find((d) => [...this.dishes[d].components].sort().join('+') === key);
  }

  /** Everything that goes into some dish. */
  dishComponents(): Set<string> {
    return new Set(Object.values(this.dishes).flatMap((d) => d.components));
  }

  /** The most components any dish has. */
  mostComponents(): number {
    return Math.max(1, ...Object.values(this.dishes).map((d) => d.components.length));
  }

  /** Everything that goes into something at a station. */
  ingredientsAt(station: string): Set<string> {
    return new Set((this.recipes.get(station) ?? []).flatMap((r) => r.inputs));
  }

  /** The most things that go into any one recipe at a station. */
  mostInputsAt(station: string): number {
    return Math.max(1, ...(this.recipes.get(station) ?? []).map((r) => r.inputs.length));
  }

  /** The station a piece of art is (its frame, or its animation's), if it's one ('plate' is the plating station). */
  stationOfArt(art: string): string | undefined {
    const frame = art.replace(/^anim:/, '').replace(/_f\d+$/, '');
    return Object.keys(this.stations).find((k) => this.stations[k].sprite.frame === frame);
  }

  /** Which course something served is (a dish's, or a snack served as it is). */
  course(id: string): Course {
    return this.dishes[id]?.course ?? this.items[id]?.course ?? 'snack';
  }

  /** What a guest might ask for something by: how it was cooked, and its tags ("baked", "meaty"...). */
  traits(id: string): string[] {
    return this.dishes[id]?.traits ?? this.items[id]?.traits ?? [];
  }

  /** How much prep is behind something served. */
  complexity(id: string): number {
    return this.dishes[id]?.complexity ?? this.items[id]?.complexity ?? 0;
  }

  /** Whether something can be served: a dish, or a snack served as it is. */
  servable(id: string): boolean {
    return !!this.dishes[id] || this.snacks.includes(id);
  }

  /** The tags of something served: a dish's, or a snack's own. */
  dishTags(id: string): string[] {
    return this.dishes[id]?.tags ?? this.items[id]?.tags ?? [];
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
