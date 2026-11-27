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
  /** World zoom: below 1 the camera sees more of the world. */
  private zoom = 1;

  /** smoothing: how quickly the camera catches up (per second); higher = tighter. */
  constructor(private worldW: number, private worldH: number, private readonly smoothing = 12) {}

  /** Top-left of the area the camera keeps to (the world starts at 0, 0; the editor can widen it). */
  private originX = 0;
  private originY = 0;

  setWorld(w: number, h: number): void {
    this.setBounds(0, 0, w, h);
  }

  /** Keep to a rectangle other than the world (the editor's canvas reaches past a room's edges). */
  setBounds(x0: number, y0: number, x1: number, y1: number): void {
    this.originX = x0;
    this.originY = y0;
    this.worldW = x1 - x0;
    this.worldH = y1 - y0;
  }

  setInset(top: number, bottom: number): void {
    this.inset = { top, bottom };
  }

  /** Zoom around the current centre (insets are screen pixels, so they cover more world when zoomed out). */
  setZoom(z: number): void {
    if (z === this.zoom) return;
    const cx = this.x + this.viewW / 2;
    const cy = this.y + this.top + this.viewH / 2;
    this.zoom = z;
    this.centerOn(cx, cy);
  }

  /** Visible world width, and the height left between the insets, in world pixels. */
  private get viewW(): number {
    return VIEW_W / this.zoom;
  }

  private get viewH(): number {
    return (VIEW_H - this.inset.top - this.inset.bottom) / this.zoom;
  }

  private get top(): number {
    return this.inset.top / this.zoom;
  }

  private get bottom(): number {
    return this.inset.bottom / this.zoom;
  }

  /** Jump straight to a point (no easing, no interpolation from the old spot). */
  centerOn(tx: number, ty: number): void {
    this.x = tx - this.viewW / 2;
    this.y = ty - this.top - this.viewH / 2;
    this.clamp();
    this.px = this.x;
    this.py = this.y;
  }

  follow(tx: number, ty: number, dt: number): void {
    this.px = this.x;
    this.py = this.y;
    const k = 1 - Math.exp(-this.smoothing * dt);
    this.x += (tx - this.viewW / 2 - this.x) * k;
    this.y += (ty - this.top - this.viewH / 2 - this.y) * k;
    this.clamp();
  }

  /** Keep the view inside the world; a world smaller than the screen is centred instead. */
  private clamp(): void {
    const vw = this.viewW;
    const { top, bottom, originX: ox, originY: oy } = this;
    this.x = this.worldW <= vw ? ox + (this.worldW - vw) / 2 : Math.max(ox, Math.min(this.x, ox + this.worldW - vw));
    this.y = this.worldH <= this.viewH
      ? oy + (this.worldH - this.viewH) / 2 - top
      : Math.max(oy - top, Math.min(this.y, oy + this.worldH - VIEW_H / this.zoom + bottom));
  }


  /** Position for drawing, blended between the last two game steps (alpha 0..1). */
  at(alpha: number): { x: number; y: number } {
    return { x: this.px + (this.x - this.px) * alpha, y: this.py + (this.y - this.py) * alpha };
  }
}
