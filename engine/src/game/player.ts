/** The player character: walks with keyboard or controller, animates by facing, collides with the world. */
import type { Assets } from '../core/assets';
import { Animator } from '../core/anim';
import type { Input } from '../core/input';
import type { Rect } from '../core/geom';
import type { Renderer } from '../core/renderer';
import { Entity } from '../world/entity';
import type { Facing, Spawn } from '../world/scene';

const SPEED = 72; // px per second on ordinary ground (the ground can make it faster or slower)
// Feet collider relative to the 32x32 sprite's top-left.
export const FEET: Rect = { x: 10, y: 22, w: 12, h: 6 };

export class Player extends Entity {
  facing: Facing = 'down';
  moving = false;
  private readonly anim: Animator;
  /** Position at the previous game step, for drawing interpolated between steps. */
  private prevX: number;
  private prevY: number;

  constructor(assets: Assets, x: number, y: number, readonly look = 'kid') {
    super(x, y);
    this.prevX = x;
    this.prevY = y;
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

  /** Put the player at a spawn point (no interpolation from the old position). */
  place(spawn: Spawn): void {
    this.x = this.prevX = spawn.x;
    this.y = this.prevY = spawn.y;
    this.facing = spawn.facing;
    this.moving = false;
    this.anim.play(`${this.look}_idle_${this.facing}`);
  }

  /** Where to draw the player this frame, blended between the last two game steps. */
  at(alpha: number): { x: number; y: number } {
    return { x: this.prevX + (this.x - this.prevX) * alpha, y: this.prevY + (this.y - this.prevY) * alpha };
  }

  /**
   * speed: how fast the ground under a world point is walked on (1 = normal). walkOnly: the D-pad and
   * arrow keys are busy nudging (see Input.move), so only the left stick and WASD walk.
   */
  move(dt: number, input: Input, blocked: (r: Rect) => boolean, speed: (x: number, y: number) => number = () => 1, walkOnly = false): void {
    this.prevX = this.x;
    this.prevY = this.y;
    const m = input.move(walkOnly);
    this.moving = m.x !== 0 || m.y !== 0;
    if (this.moving) {
      if (Math.abs(m.x) > Math.abs(m.y)) this.facing = m.x > 0 ? 'right' : 'left';
      else this.facing = m.y > 0 ? 'down' : 'up';
      // Move one axis at a time so the player slides along walls instead of sticking.
      const f = this.feet();
      const v = SPEED * speed(f.x + f.w / 2, f.y + f.h / 2);
      const nx = this.x + m.x * v * dt;
      if (!blocked(this.feet(nx, this.y))) this.x = nx;
      const ny = this.y + m.y * v * dt;
      if (!blocked(this.feet(this.x, ny))) this.y = ny;
    }
    this.anim.play(`${this.look}_${this.moving ? 'walk' : 'idle'}_${this.facing}`);
    this.anim.update(dt);
  }

  draw(r: Renderer, camX: number, camY: number, _time: number, alpha: number): void {
    const p = this.at(alpha);
    r.sprite(this.anim.frame, p.x - camX, p.y - camY);
  }
}
