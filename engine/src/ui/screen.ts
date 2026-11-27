/**
 * Full-screen UI (bag, shop): one is open at a time and takes all input while it is.
 * Navigation steps come from the D-pad, keys or the left stick alike, repeating while held.
 */
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';

export interface Screen {
  /** Return false to close. */
  update(input: Input, dt: number): boolean;
  draw(r: Renderer, time: number): void;
  /** Mouse, in logical screen pixels; button -1 = move only. Return false to close. */
  pointer(x: number, y: number, button: number, shift: boolean): boolean;
}

const FIRST = 0.3;
const NEXT = 0.09;

/** Turns held directions (keys, D-pad or stick) into single steps with key-repeat. */
export class Nav {
  private dir = { x: 0, y: 0 };
  private t = 0;

  step(input: Input, dt: number): { x: number; y: number } | null {
    const m = input.move();
    const x = Math.abs(m.x) > 0.5 ? Math.sign(m.x) : 0;
    const y = Math.abs(m.y) > 0.5 && !x ? Math.sign(m.y) : 0;
    if (!x && !y) {
      this.dir = { x: 0, y: 0 };
      return null;
    }
    if (x !== this.dir.x || y !== this.dir.y) {
      this.dir = { x, y };
      this.t = FIRST;
      return { x, y };
    }
    this.t -= dt;
    if (this.t > 0) return null;
    this.t = NEXT;
    return { x, y };
  }
}
