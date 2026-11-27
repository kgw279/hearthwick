/**
 * Things placed in the world. A Prop is any sprite (static or looping) with an optional collider
 * and an optional interaction. Depth sorting uses the bottom of the sprite (its feet).
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import type { Rect } from '../core/geom';
import { loopFrame } from '../core/anim';

export interface Interaction {
  /** Shown next to the button prompt, e.g. "Harvest". */
  label: string;
  /** Called when the player presses interact while facing this. */
  use: () => void;
}

export interface PropSpec {
  /** One sprite name, or several to loop. */
  frames: string | string[];
  x: number;
  y: number;
  fps?: number;
  /** Collider relative to the sprite's top-left; omit for walk-through decoration. */
  solid?: Rect;
  /** Depth line relative to the sprite's top; defaults to its bottom edge minus 4. */
  sortOffset?: number;
  interaction?: Interaction;
  /** Where the player must stand/face to use it, relative to the sprite; defaults around the collider. */
  use?: Rect;
}

export abstract class Entity {
  constructor(public x: number, public y: number) {}
  abstract get sortY(): number;
  collider(): Rect | null {
    return null;
  }
  interaction(): Interaction | null {
    return null;
  }
  /** Area in which the player can use this; by default the collider grown by 6px. */
  useArea(): Rect | null {
    const c = this.collider();
    return c ? { x: c.x - 6, y: c.y - 6, w: c.w + 12, h: c.h + 12 } : null;
  }
  update(_dt: number): void {}
  /** alpha: how far between the last two game steps (for interpolating moving things). */
  abstract draw(r: Renderer, camX: number, camY: number, time: number, alpha: number): void;
}

export class Prop extends Entity {
  private frames: string[];
  private readonly fps: number;
  private readonly phase: number;
  private readonly w: number;
  private readonly h: number;
  private action: Interaction | null;

  constructor(assets: Assets, private readonly spec: PropSpec) {
    super(spec.x, spec.y);
    this.frames = typeof spec.frames === 'string' ? [spec.frames] : spec.frames;
    this.action = spec.interaction ?? null;
    this.fps = spec.fps ?? 6;
    this.phase = (spec.x * 7 + spec.y * 3) % 5;
    const f = assets.frame(this.frames[0]);
    this.w = f.w;
    this.h = f.h;
  }

  get sortY(): number {
    return this.y + (this.spec.sortOffset ?? this.h - 4);
  }

  collider(): Rect | null {
    const s = this.spec.solid;
    return s ? { x: this.x + s.x, y: this.y + s.y, w: s.w, h: s.h } : null;
  }

  useArea(): Rect | null {
    const u = this.spec.use;
    if (u) return { x: this.x + u.x, y: this.y + u.y, w: u.w, h: u.h };
    const c = this.collider();
    if (c) return { x: c.x - 6, y: c.y - 6, w: c.w + 12, h: c.h + 12 };
    return { x: this.x + 4, y: this.y + this.h / 2, w: this.w - 8, h: this.h / 2 };
  }

  interaction(): Interaction | null {
    return this.action;
  }

  setInteraction(i: Interaction | null): void {
    this.action = i;
  }

  setFrames(frames: string | string[]): void {
    this.frames = typeof frames === 'string' ? [frames] : frames;
  }

  draw(r: Renderer, camX: number, camY: number, time: number): void {
    const name = this.frames.length === 1 ? this.frames[0] : loopFrame(this.frames, time, this.fps, this.phase);
    r.sprite(name, this.x - camX, this.y - camY);
  }
}
