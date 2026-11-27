/**
 * Nudging with the D-pad / arrow keys, one feel everywhere (the editor's cursor, a piece being carried):
 * a tap moves one step; held, it repeats, then (for pixel steps) glides smoothly.
 */
const FIRST = 0.22; // seconds held before the first repeat
const NEXT = 0.06; // seconds between repeats
const GLIDE_AFTER = 0.7; // seconds a held direction steps before gliding

export class Nudge {
  private dx = 0;
  private dy = 0;
  private held = 0;
  private next = FIRST;

  /**
   * One update with the direction held (each axis -1, 0 or 1). Returns how far to move: step-sized
   * jumps, or (with glide, in px per second) a smooth slide once held long enough.
   */
  update(dir: { x: number; y: number }, dt: number, step = 1, glide = 0): { x: number; y: number } {
    const { x: dx, y: dy } = dir;
    if (!dx && !dy) {
      this.dx = this.dy = 0;
      return { x: 0, y: 0 };
    }
    if (dx !== this.dx || dy !== this.dy) {
      this.dx = dx;
      this.dy = dy;
      this.held = 0;
      this.next = FIRST;
      return { x: dx * step, y: dy * step };
    }
    this.held += dt;
    if (glide && this.held >= GLIDE_AFTER) {
      const len = Math.hypot(dx, dy);
      return { x: (dx / len) * glide * dt, y: (dy / len) * glide * dt };
    }
    if (this.held < this.next) return { x: 0, y: 0 };
    this.next += NEXT;
    return { x: dx * step, y: dy * step };
  }
}
