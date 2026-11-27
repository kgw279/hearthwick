/** Camera: follows a target smoothly, never shows outside the world, and snaps to whole pixels. */
import { VIEW_W, VIEW_H } from './renderer';

export class Camera {
  x = 0;
  y = 0;

  constructor(private worldW: number, private worldH: number, private readonly smoothing = 10) {}

  setWorld(w: number, h: number): void {
    this.worldW = w;
    this.worldH = h;
  }

  /** Jump straight to a point (no easing). */
  centerOn(tx: number, ty: number): void {
    this.x = tx - VIEW_W / 2;
    this.y = ty - VIEW_H / 2;
    this.clamp();
  }

  follow(tx: number, ty: number, dt: number): void {
    const k = 1 - Math.exp(-this.smoothing * dt);
    this.x += (tx - VIEW_W / 2 - this.x) * k;
    this.y += (ty - VIEW_H / 2 - this.y) * k;
    this.clamp();
  }

  private clamp(): void {
    this.x = Math.max(0, Math.min(this.x, Math.max(0, this.worldW - VIEW_W)));
    this.y = Math.max(0, Math.min(this.y, Math.max(0, this.worldH - VIEW_H)));
  }

  /** Pixel-snapped offsets used for drawing, so sprites never shimmer between pixels. */
  get ix(): number {
    return Math.round(this.x);
  }

  get iy(): number {
    return Math.round(this.y);
  }
}
