/**
 * Undo and redo for the editor. Each entry is a snapshot of every map (an edit can touch more than one:
 * linking a door or stairs changes both ends, and stairs can make a new room), taken just before the
 * edit. Snapshots are JSON strings, so nothing later edits can reach back into them.
 */
import type { Layout } from '../world/layout';

const LIMIT = 200;

interface Snapshot { maps: string; unsaved: string[] }

export class History {
  private readonly undos: Snapshot[] = [];
  private readonly redos: Snapshot[] = [];

  constructor(private readonly layouts: Map<string, Layout>, private readonly unsaved: Set<string>) {}

  private snap(): Snapshot {
    return { maps: JSON.stringify([...this.layouts.values()]), unsaved: [...this.unsaved] };
  }

  /** Call just before an edit. */
  record(): void {
    this.undos.push(this.snap());
    if (this.undos.length > LIMIT) this.undos.shift();
    this.redos.length = 0;
  }

  clear(): void {
    this.undos.length = 0;
    this.redos.length = 0;
  }

  get canUndo(): boolean {
    return this.undos.length > 0;
  }

  get canRedo(): boolean {
    return this.redos.length > 0;
  }

  /** Step back (or forward); returns the ids of maps whose contents changed, or null if there was nothing to do. */
  undo(): string[] | null {
    return this.step(this.undos, this.redos);
  }

  redo(): string[] | null {
    return this.step(this.redos, this.undos);
  }

  private step(from: Snapshot[], to: Snapshot[]): string[] | null {
    const s = from.pop();
    if (!s) return null;
    to.push(this.snap());
    const before = new Map([...this.layouts].map(([id, l]) => [id, JSON.stringify(l)]));
    const maps = JSON.parse(s.maps) as Layout[];
    this.layouts.clear();
    for (const l of maps) this.layouts.set(l.id, l);
    this.unsaved.clear();
    for (const id of s.unsaved) this.unsaved.add(id);
    const ids = new Set([...before.keys(), ...this.layouts.keys()]);
    return [...ids].filter((id) => before.get(id) !== (this.layouts.has(id) ? JSON.stringify(this.layouts.get(id)) : undefined));
  }
}
