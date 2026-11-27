/**
 * Camera: eases toward a target, never shows outside the world (beyond any UI insets). It keeps its previous position so the
 * renderer can interpolate between game steps (smooth on 60, 120, 144 Hz displays alike).
 */
import { VIEW_W, VIEW_H } from './renderer';

export class Camera {
  x = 0;
  y = 0;
  private px = 0;
  private py = 0;
  /** Screen rows covered by UI at the top and bottom (e.g. the editor's panels); the camera frames the rest. */
  private inset = { top: 0, bottom: 0 };

  /** smoothing: how quickly the camera catches up (per second); higher = tighter. */
  constructor(private worldW: number, private worldH: number, private readonly smoothing = 12) {}

  setWorld(w: number, h: number): void {
    this.worldW = w;
    this.worldH = h;
  }

  setInset(top: number, bottom: number): void {
    this.inset = { top, bottom };
  }

  private get viewH(): number {
    return VIEW_H - this.inset.top - this.inset.bottom;
  }

  /** Jump straight to a point (no easing, no interpolation from the old spot). */
  centerOn(tx: number, ty: number): void {
    this.x = tx - VIEW_W / 2;
    this.y = ty - this.inset.top - this.viewH / 2;
    this.clamp();
    this.px = this.x;
    this.py = this.y;
  }

  follow(tx: number, ty: number, dt: number): void {
    this.px = this.x;
    this.py = this.y;
    const k = 1 - Math.exp(-this.smoothing * dt);
    this.x += (tx - VIEW_W / 2 - this.x) * k;
    this.y += (ty - this.inset.top - this.viewH / 2 - this.y) * k;
    this.clamp();
  }

  /** Keep the view inside the world; a world smaller than the screen is centred instead. */
  private clamp(): void {
    this.x = this.worldW <= VIEW_W ? (this.worldW - VIEW_W) / 2 : Math.max(0, Math.min(this.x, this.worldW - VIEW_W));
    const { top, bottom } = this.inset;
    this.y = this.worldH <= this.viewH
      ? (this.worldH - this.viewH) / 2 - top
      : Math.max(-top, Math.min(this.y, this.worldH - VIEW_H + bottom));
  }

  /** Position for drawing, blended between the last two game steps (alpha 0..1). */
  at(alpha: number): { x: number; y: number } {
    return { x: this.px + (this.x - this.px) * alpha, y: this.py + (this.y - this.py) * alpha };
  }
}
