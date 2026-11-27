/** The player character: walks with keyboard or controller, animates by facing, collides with the world. */
import type { Assets } from '../core/assets';
import { Animator } from '../core/anim';
import type { Input } from '../core/input';
import type { Rect } from '../core/geom';
import type { Renderer } from '../core/renderer';
import { Entity } from '../world/entity';

export type Facing = 'down' | 'up' | 'left' | 'right';

const SPEED = 72; // px per second
// Feet collider relative to the 32x32 sprite's top-left.
const FEET: Rect = { x: 10, y: 22, w: 12, h: 6 };

export class Player extends Entity {
  facing: Facing = 'down';
  moving = false;
  private readonly anim: Animator;

  constructor(assets: Assets, x: number, y: number, readonly look = 'kid') {
    super(x, y);
    this.anim = new Animator(assets, 8);
    this.anim.play(`${look}_idle_down`);
  }

  get sortY(): number {
    return this.y + FEET.y + FEET.h;
  }

  /** Feet rectangle in world space. */
  feet(x = this.x, y = this.y): Rect {
    return { x: x + FEET.x, y: y + FEET.y, w: FEET.w, h: FEET.h };
  }

  /** Point just in front of the player, used to find what they're facing. */
  probe(): { x: number; y: number } {
    const f = this.feet();
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2;
    const d = 10;
    switch (this.facing) {
      case 'up': return { x: cx, y: cy - d };
      case 'down': return { x: cx, y: cy + d };
      case 'left': return { x: cx - d, y: cy };
      case 'right': return { x: cx + d, y: cy };
    }
  }

  get center(): { x: number; y: number } {
    return { x: this.x + 16, y: this.y + 18 };
  }

  move(dt: number, input: Input, blocked: (r: Rect) => boolean): void {
    const m = input.move();
    this.moving = m.x !== 0 || m.y !== 0;
    if (this.moving) {
      if (Math.abs(m.x) > Math.abs(m.y)) this.facing = m.x > 0 ? 'right' : 'left';
      else this.facing = m.y > 0 ? 'down' : 'up';
      // Move one axis at a time so the player slides along walls instead of sticking.
      const nx = this.x + m.x * SPEED * dt;
      if (!blocked(this.feet(nx, this.y))) this.x = nx;
      const ny = this.y + m.y * SPEED * dt;
      if (!blocked(this.feet(this.x, ny))) this.y = ny;
    }
    this.anim.play(`${this.look}_${this.moving ? 'walk' : 'idle'}_${this.facing}`);
    this.anim.update(dt);
  }

  draw(r: Renderer, camX: number, camY: number): void {
    r.sprite(this.anim.frame, Math.round(this.x) - camX, Math.round(this.y) - camY);
  }
}
