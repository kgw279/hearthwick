/** Typed views of the parts of gamedata.json the engine uses. gamedata.json stays the single source of truth. */
import type { GameData } from '../core/assets';

export interface ItemData { name: string; kind: string; tags: string[]; value: number }
export interface ShopData { name: string; stock: Array<{ item: string; price: number }>; building: string | null }
export interface ForageNodeData { yields: string; spot: string | null; states: { ready: string; harvested: string } }

export class Content {
  readonly items: Record<string, ItemData>;
  readonly shops: Record<string, ShopData>;
  readonly forageNodes: Record<string, ForageNodeData>;

  constructor(data: GameData) {
    this.items = data.items as Record<string, ItemData>;
    this.shops = data.shops as Record<string, ShopData>;
    this.forageNodes = data.forage_nodes as Record<string, ForageNodeData>;
  }

  itemName(id: string): string {
    return this.items[id]?.name ?? id;
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
