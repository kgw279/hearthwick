/**
 * Renderer. The game thinks in a logical screen at the art's native pixel size (at least 480x270)
 * and draws straight onto a full-window canvas through a whole-number scale (4x on 1080p). The scale
 * is the largest whole number that still fits 480x270; the logical screen then grows to fill the rest
 * of the window, so there are no borders and the art stays crisp (VIEW_W / VIEW_H change on resize). Positions are
 * snapped to *screen* pixels (1/scale of an art pixel), not art pixels, so the camera and moving
 * characters glide smoothly instead of stepping 4 screen pixels at a time, while every sprite stays
 * crisp (nearest-neighbour, integer scale, edges always on screen-pixel boundaries).
 * World sprites are queued with a depth key (their feet) and drawn back to front.
 */
import type { Assets, Frame } from './assets';

/** The smallest logical screen the game is designed for. */
export const MIN_VIEW_W = 480;
export const MIN_VIEW_H = 270;
/** Current logical screen size (live bindings: they change when the window does). */
export let VIEW_W = MIN_VIEW_W;
export let VIEW_H = MIN_VIEW_H;

interface Queued { sortY: number; order: number; draw: () => void }

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private queue: Queued[] = [];
  private order = 0;
  scale = 1;
  /** World zoom (the editor zooms out to see a whole map); UI is always drawn at zoom 1. */
  zoom = 1;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly assets: Assets) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    this.scale = Math.max(1, Math.floor(Math.min(w / MIN_VIEW_W, h / MIN_VIEW_H)));
    VIEW_W = Math.floor(w / this.scale);
    VIEW_H = Math.floor(h / this.scale);
    this.canvas.width = VIEW_W * this.scale;
    this.canvas.height = VIEW_H * this.scale;
    this.canvas.style.width = `${this.canvas.width / dpr}px`;
    this.canvas.style.height = `${this.canvas.height / dpr}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Screen pixels per logical pixel at the current zoom. */
  get unit(): number {
    return this.scale * this.zoom;
  }

  /** Size of the visible area in logical pixels at the current zoom. */
  get viewW(): number {
    return VIEW_W / this.zoom;
  }

  get viewH(): number {
    return VIEW_H / this.zoom;
  }

  /** Switch zoom for what's drawn next (world at the editor's zoom, then UI at 1). */
  setZoom(z: number): void {
    this.zoom = z;
    this.ctx.setTransform(this.unit, 0, 0, this.unit, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Round a logical coordinate to the nearest screen pixel. */
  snap(v: number): number {
    return Math.round(v * this.unit) / this.unit;
  }

  begin(clear = '#1b1520'): void {
    const c = this.ctx;
    this.zoom = 1;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    c.fillStyle = clear;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /** Draw a sprite now, top-left at (x, y) in logical screen pixels (fractions allowed). */
  sprite(name: string | Frame, x: number, y: number, alpha = 1): void {
    const f = typeof name === 'string' ? this.assets.frame(name) : name;
    if (alpha !== 1) this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(f.img, f.x, f.y, f.w, f.h, this.snap(x), this.snap(y), f.w, f.h);
    if (alpha !== 1) this.ctx.globalAlpha = 1;
  }

  /** Draw a sprite turned clockwise by deg about `pivot` (sprite-relative), top-left at (x, y) when unturned. */
  spriteTurned(name: string | Frame, x: number, y: number, deg: number, pivot: { x: number; y: number }, alpha = 1): void {
    const f = typeof name === 'string' ? this.assets.frame(name) : name;
    const c = this.ctx;
    c.save();
    if (alpha !== 1) c.globalAlpha = alpha;
    c.translate(this.snap(x) + pivot.x, this.snap(y) + pivot.y);
    c.rotate((deg * Math.PI) / 180);
    c.drawImage(f.img, f.x, f.y, f.w, f.h, -pivot.x, -pivot.y, f.w, f.h);
    c.restore();
  }

  /** Draw a whole pre-rendered image (e.g. the static ground) with its top-left at (x, y). */
  image(src: CanvasImageSource & { width: number; height: number }, x: number, y: number): void {
    this.ctx.drawImage(src, this.snap(x), this.snap(y));
  }

  /** Queue a world draw; queued draws run back-to-front by sortY when flush() is called. */
  queueDraw(sortY: number, draw: () => void): void {
    this.queue.push({ sortY, order: this.order++, draw });
  }

  flush(): void {
    this.queue.sort((a, b) => a.sortY - b.sortY || a.order - b.order);
    for (const q of this.queue) q.draw();
    this.queue = [];
    this.order = 0;
  }

  /** 9-slice: corners stay fixed, edges and centre repeat (never stretch) to fill w x h. */
  nine(name: string, x: number, y: number, w: number, h: number): void {
    const f = this.assets.frame(name);
    const [l, t, r, b] = f.slice ?? [0, 0, 0, 0];
    const cw = f.w - l - r;
    const ch = f.h - t - b;
    x = Math.round(x);
    y = Math.round(y);
    const tile = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) => {
      if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
      for (let yy = 0; yy < dh; yy += sh) {
        for (let xx = 0; xx < dw; xx += sw) {
          const pw = Math.min(sw, dw - xx);
          const ph = Math.min(sh, dh - yy);
          this.ctx.drawImage(f.img, f.x + sx, f.y + sy, pw, ph, dx + xx, dy + yy, pw, ph);
        }
      }
    };
    const iw = w - l - r;
    const ih = h - t - b;
    tile(0, 0, l, t, x, y, l, t);
    tile(f.w - r, 0, r, t, x + w - r, y, r, t);
    tile(0, f.h - b, l, b, x, y + h - b, l, b);
    tile(f.w - r, f.h - b, r, b, x + w - r, y + h - b, r, b);
    tile(l, 0, cw, t, x + l, y, iw, t);
    tile(l, f.h - b, cw, b, x + l, y + h - b, iw, b);
    tile(0, t, l, ch, x, y + t, l, ih);
    tile(f.w - r, t, r, ch, x + w - r, y + t, r, ih);
    tile(l, t, cw, ch, x + l, y + t, iw, ih);
  }

  rect(x: number, y: number, w: number, h: number, color: string, fill = false): void {
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(this.snap(x), this.snap(y), w, h);
    } else {
      const px = 1 / this.unit;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = px;
      this.ctx.strokeRect(this.snap(x) + px / 2, this.snap(y) + px / 2, w - px, h - px);
    }
  }
}
