/**
 * Interior ground: floors and walls from the art pack's interior kit, pre-rendered once.
 *
 * floor grid, one character per 32px cell:
 *   w  wood floor      s  flagstone (stone) floor      .  nothing to stand on (walls, void)
 * Wood/stone borders use the floor_wood_flagstone corner autotile: a corner is stone if any cell
 * around it is stone (the same rule the town uses for roads and water).
 * walls: [sprite, tileX, tileY] drawn on top of the floor (wall caps, faces, wall decorations).
 * Only floor cells are walkable; furniture adds its own colliders as props.
 */
import type { Assets } from '../core/assets';
import type { Rect } from '../core/geom';
import type { Renderer } from '../core/renderer';
import type { Ground } from './ground';
import { TILE } from './tilemap';

export interface RoomLayout {
  floor: string[];
  walls: Array<[string, number, number]>;
}

export class RoomMap implements Ground {
  readonly w: number;
  readonly h: number;
  private readonly canvas: HTMLCanvasElement;

  constructor(private readonly layout: RoomLayout, assets: Assets) {
    this.h = layout.floor.length;
    this.w = layout.floor[0].length;
    layout.floor.forEach((r, i) => {
      if (r.length !== this.w) throw new Error(`Room floor row ${i} is ${r.length} wide, expected ${this.w}`);
    });
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.pixelW;
    this.canvas.height = this.pixelH;
    const ctx = this.canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const put = (name: string, x: number, y: number) => {
      const f = assets.frame(name);
      ctx.drawImage(f.img, f.x, f.y, f.w, f.h, x * TILE, y * TILE, f.w, f.h);
    };
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.walkableCell(x, y)) continue;
        const stone = [this.stoneCorner(x, y), this.stoneCorner(x + 1, y), this.stoneCorner(x, y + 1), this.stoneCorner(x + 1, y + 1)];
        const index = stone.reduce((acc, s, i) => acc | (s ? 1 << i : 0), 0);
        put(`floor_wood_flagstone_${String(index).padStart(2, '0')}`, x, y);
      }
    }
    for (const [name, x, y] of layout.walls) put(name, x, y);
  }

  get pixelW(): number {
    return this.w * TILE;
  }

  get pixelH(): number {
    return this.h * TILE;
  }

  private cell(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '.';
    return this.layout.floor[y][x];
  }

  private walkableCell(x: number, y: number): boolean {
    const c = this.cell(x, y);
    return c === 'w' || c === 's';
  }

  private stoneCorner(vx: number, vy: number): boolean {
    return [this.cell(vx - 1, vy - 1), this.cell(vx, vy - 1), this.cell(vx - 1, vy), this.cell(vx, vy)].includes('s');
  }

  draw(r: Renderer, camX: number, camY: number): void {
    r.image(this.canvas, -camX, -camY);
  }

  blocks(rect: Rect): boolean {
    const x0 = Math.floor(rect.x / TILE);
    const x1 = Math.floor((rect.x + rect.w - 0.001) / TILE);
    const y0 = Math.floor(rect.y / TILE);
    const y1 = Math.floor((rect.y + rect.h - 0.001) / TILE);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!this.walkableCell(x, y)) return true;
    return false;
  }
}
