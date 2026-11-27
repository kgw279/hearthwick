/** What a scene stands on: something that can draw itself and say where you can't walk. */
import type { Rect } from '../core/geom';
import type { Renderer } from '../core/renderer';

export interface Ground {
  readonly pixelW: number;
  readonly pixelH: number;
  draw(r: Renderer, camX: number, camY: number, time: number): void;
  /** True if a world-space rectangle overlaps anything solid in the ground itself (water, walls, map edge). */
  blocks(rect: Rect): boolean;
  /** Optional debug overlay (F3). */
  drawDebug?(r: Renderer, camX: number, camY: number): void;
}
