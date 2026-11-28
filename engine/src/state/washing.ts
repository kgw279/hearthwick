/**
 * The wash station: dirty tableware goes in the washing tub and comes out wet; wet tableware goes on the
 * drying rack and comes off clean. Each takes about a second a piece, one piece at a time in each, and
 * carries on whether or not anyone's watching. What's done goes back where tableware is kept (the inn's
 * stores, else the bag); with nowhere to put it, that side waits. Pure state.
 */
import type { Content } from '../game/data';

export const WASH_TIME = 1; // seconds to wash one piece
export const DRY_TIME = 1; // seconds to dry one piece

export interface Line { queue: string[]; t: number }

export class Washing {
  readonly washing: Line = { queue: [], t: 0 };
  readonly drying: Line = { queue: [], t: 0 };

  constructor(private readonly content: Content) {}

  /** put: put a finished piece away; false if there's no room (then it waits). */
  update(dt: number, put: (item: string) => boolean): void {
    this.step(this.washing, dt, WASH_TIME, (i) => this.content.item(i).washes_to, put);
    this.step(this.drying, dt, DRY_TIME, (i) => this.content.item(i).dries_to, put);
  }

  private step(line: Line, dt: number, time: number, next: (item: string) => string | undefined, put: (item: string) => boolean): void {
    if (!line.queue.length) {
      line.t = 0;
      return;
    }
    line.t = Math.min(time, line.t + dt);
    if (line.t < time) return;
    const out = next(line.queue[0]);
    if (out && !put(out)) return; // nowhere to put it: wait
    line.queue.shift();
    line.t = 0;
  }

  /** Which line a piece goes in: dirty to washing, wet to drying (none for anything else). */
  lineFor(item: string): Line | null {
    const it = this.content.items[item];
    if (it?.washes_to) return this.washing;
    if (it?.dries_to) return this.drying;
    return null;
  }
}
