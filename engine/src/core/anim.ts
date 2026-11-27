/** Plays a named animation from atlas.json at a given frame rate. */
import type { Assets } from './assets';

export class Animator {
  private frames: string[] = [];
  private name = '';
  private t = 0;

  constructor(private readonly assets: Assets, public fps = 8) {}

  play(name: string, fps?: number): void {
    if (fps !== undefined) this.fps = fps;
    if (name === this.name) return;
    this.name = name;
    this.frames = this.assets.animation(name);
    this.t = 0;
  }

  update(dt: number): void {
    this.t += dt;
  }

  get frame(): string {
    if (this.frames.length === 0) throw new Error('Animator has no animation');
    return this.frames[Math.floor(this.t * this.fps) % this.frames.length];
  }
}

/** A looping list of frame names driven by a shared clock (props, water, fire). */
export function loopFrame(frames: string[], time: number, fps: number, phase = 0): string {
  return frames[Math.floor(time * fps + phase) % frames.length];
}
