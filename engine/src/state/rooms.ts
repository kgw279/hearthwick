/**
 * The inn's guest rooms: each of its bedroom maps (an inn map whose id has "_room" in it) is a room. A room
 * can be given to a guest once it has a bed made up with clean linens and a pillow (see gamedata "rooms").
 * What it has besides (a rug, a wardrobe, two pillows, soap in the nightstand...) is what a guest staying
 * the night looks for: the comforts they asked for, met or not. In the morning their bedding is left used
 * (for the wash tub) and what they used up is gone. Pure state.
 */
import type { Content } from '../game/data';
import { containerOf } from '../world/containers';
import type { Layout } from '../world/layout';
import type { Inventory } from './inventory';
import { accepts, isInn } from './kitchen';
import type { Storage } from './storage';

/** A placed piece's base art name ("anim:fireplace" -> "fireplace", "bed" -> "bed"). */
export const pieceName = (sprite: string) => sprite.replace(/^anim:/, '').replace(/_f\d+$/, '');

export class Rooms {
  constructor(
    private readonly layouts: Map<string, Layout>,
    private readonly storage: Storage,
    private readonly content: Content,
  ) {}

  /** Every guest room's map id, in order. */
  list(): string[] {
    return [...this.layouts.keys()].filter((id) => isInn(id) && id.includes('_room')).sort();
  }

  /** "Room 2". */
  name(id: string): string {
    return `Room ${this.list().indexOf(id) + 1}`;
  }

  /** The pieces in a room, by art name. */
  pieces(id: string): string[] {
    const l = this.layouts.get(id);
    return (l?.props ?? []).map((p) => (typeof p.sprite === 'string' ? pieceName(p.sprite) : '')).filter(Boolean);
  }

  /** What each container in a room holds (the bed's first). */
  private boxes(id: string): Array<{ piece: string; inv: Inventory }> {
    const out: Array<{ piece: string; inv: Inventory }> = [];
    for (const p of this.layouts.get(id)?.props ?? []) {
      const b = p.behavior;
      if (b?.type !== 'storage' || typeof p.sprite !== 'string') continue;
      const spec = containerOf(p.sprite);
      if (!spec) continue;
      out.push({ piece: pieceName(p.sprite), inv: this.storage.get(b.id, b.slots, b.contents, accepts(spec, this.content), spec.kinds) });
    }
    return out.sort((a, b) => Number(b.piece === this.content.rooms.bed.prop) - Number(a.piece === this.content.rooms.bed.prop));
  }

  /** The room's bed's bedding, if it has a bed. */
  bed(id: string): Inventory | null {
    return this.boxes(id).find((b) => b.piece === this.content.rooms.bed.prop)?.inv ?? null;
  }

  /** Why a room can't be given to a guest yet, or null if it can. */
  notReady(id: string): string | null {
    const { linens, pillow } = this.content.rooms.bed;
    const bed = this.bed(id);
    if (!bed) return 'No bed';
    if (!bed.count(linens)) return 'The bed needs clean linens';
    if (!bed.count(pillow)) return 'The bed needs a pillow';
    return null;
  }

  /** Whether a room has a comfort. */
  has(id: string, comfort: string): boolean {
    const c = this.content.rooms.comforts[comfort];
    if (!c) return false;
    if (c.props) return this.pieces(id).some((p) => c.props!.includes(p));
    if (c.item) {
      const where = c.in === 'bed' ? [this.bed(id)].filter((b): b is Inventory => !!b) : this.boxes(id).map((b) => b.inv);
      return where.reduce((n, inv) => n + inv.count(c.item!), 0) >= (c.count ?? 1);
    }
    return false;
  }

  /**
   * A guest has slept here: the bedding they used is left used, and what they used up of the comforts
   * they wanted (soap, candles) is gone.
   */
  sleptIn(id: string, wanted: string[]): void {
    const bed = this.bed(id);
    if (bed) {
      for (const s of bed.contents()) {
        const used = this.content.items[s.item]?.dirty;
        if (!used) continue;
        bed.remove(s.item, s.count);
        bed.add(used, s.count);
      }
    }
    for (const w of wanted) {
      const c = this.content.rooms.comforts[w];
      if (!c?.uses || !c.item || !this.has(id, w)) continue;
      const box = this.boxes(id).find((b) => b.inv.count(c.item!) > 0);
      box?.inv.remove(c.item, c.count ?? 1);
    }
  }
}
