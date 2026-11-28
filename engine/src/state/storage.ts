/**
 * What's in every storage container (crates, chests, cupboards...), by the container's id. A container
 * starts with the contents its layout gives it, the first time anything looks inside; after that it
 * holds whatever the player leaves in it, wherever they go.
 */
import { Inventory, type Stack } from './inventory';

export class Storage {
  private readonly boxes = new Map<string, Inventory>();

  constructor(private readonly stackSize: number) {}

  /** accepts: what the container takes (from its art, see world/containers.ts). */
  get(id: string, slots: number, contents: Stack[] = [], accepts?: (item: string) => boolean): Inventory {
    let box = this.boxes.get(id);
    if (!box) {
      box = new Inventory(slots, this.stackSize, accepts);
      for (const s of contents) box.add(s.item, s.count);
      this.boxes.set(id, box);
    }
    return box;
  }
}
