/**
 * Interior ground: floors and walls from the art pack's interior kit, worked out from a character grid
 * and pre-rendered once. One character per 32px cell:
 *
 *   w  wood floor            s  flagstone floor
 *   W  plaster wall          N  plaster wall with a window
 *   S  stone wall            M  stone wall with a window
 *   .  nothing (outside)
 *
 * Floors: wood/stone borders use the floor_wood_flagstone corner autotile (a corner is stone if any
 * cell around it is stone floor).
 * Walls are autotiled from the shape of the room, the way the kit is drawn (top-down 3/4):
 *   - a wall cell with floor below it is a wall *face* (plaster or stone, windowed for N/M), unless that
 *     floor is a doorway through a side wall;
 *   - every other wall cell shows the *cap* (top edge) that the floor next to it calls for: T above a
 *     face, L/R beside the room, B along the front, outer corners TL/TR/BL/BR, inner corners where a back
 *     wall steps, and *_end pieces either side of a doorway (a floor cell in a wall line);
 *   - where plaster meets stone along a run, the transition piece is used.
 * Only floor cells are walkable; furniture adds its own colliders as props.
 */
import type { Assets } from '../core/assets';
import type { Rect } from '../core/geom';
import type { Renderer } from '../core/renderer';
import type { Ground } from './ground';
import { TILE } from './tilemap';

const FLOOR = new Set(['w', 's']);
const WALL = new Set(['W', 'S', 'N', 'M']);

export class RoomMap implements Ground {
  readonly w: number;
  readonly h: number;
  private readonly canvas: HTMLCanvasElement;

  constructor(private readonly rows: string[], assets: Assets) {
    this.h = rows.length;
    this.w = rows[0].length;
    rows.forEach((r, i) => {
      if (r.length !== this.w) throw new Error(`Room row ${i} is ${r.length} wide, expected ${this.w}`);
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
        if (this.floor(x, y)) {
          const stone = [this.stoneCorner(x, y), this.stoneCorner(x + 1, y), this.stoneCorner(x, y + 1), this.stoneCorner(x + 1, y + 1)];
          const index = stone.reduce((acc, s, i) => acc | (s ? 1 << i : 0), 0);
          put(`floor_wood_flagstone_${String(index).padStart(2, '0')}`, x, y);
        } else if (this.wall(x, y)) {
          const piece = this.wallPiece(x, y);
          if (piece) put(piece, x, y);
        }
      }
    }
  }

  get pixelW(): number {
    return this.w * TILE;
  }

  get pixelH(): number {
    return this.h * TILE;
  }

  private cell(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '.';
    return this.rows[y][x];
  }

  private floor(x: number, y: number): boolean {
    return FLOOR.has(this.cell(x, y));
  }

  private wall(x: number, y: number): boolean {
    return WALL.has(this.cell(x, y));
  }

  private stone(x: number, y: number): boolean {
    const c = this.cell(x, y);
    return c === 'S' || c === 'M';
  }

  private stoneCorner(vx: number, vy: number): boolean {
    return [this.cell(vx - 1, vy - 1), this.cell(vx, vy - 1), this.cell(vx - 1, vy), this.cell(vx, vy)].includes('s');
  }

  /** A floor cell in a wall line: walls on both sides (left/right = through a front or back wall). */
  private doorH(x: number, y: number): boolean {
    return this.floor(x, y) && this.wall(x - 1, y) && this.wall(x + 1, y) && !this.floor(x, y + 1);
  }

  /** A floor cell in a side wall: walls above and below. */
  private doorV(x: number, y: number): boolean {
    return this.floor(x, y) && this.wall(x, y - 1) && this.wall(x, y + 1);
  }

  private face(x: number, y: number): boolean {
    return this.wall(x, y) && this.floor(x, y + 1) && !this.doorV(x, y + 1);
  }

  /** Floor, or a wall face: the parts of the room a cap borders. */
  private inside(x: number, y: number): boolean {
    return this.floor(x, y) || this.face(x, y);
  }

  private wallPiece(x: number, y: number): string | null {
    const mat = this.stone(x, y) ? 'stone' : 'wood';
    if (this.face(x, y)) {
      const window = this.cell(x, y) === 'N' || this.cell(x, y) === 'M';
      if (this.face(x + 1, y) && this.stone(x + 1, y) !== this.stone(x, y)) {
        return this.stone(x, y) ? 'face_stone_to_plaster' : 'face_plaster_to_stone';
      }
      return `face_${mat === 'stone' ? 'stone' : 'plaster'}_${window ? 'window' : 'plain'}`;
    }
    const cap = (kind: string) => `cap_${mat}_${kind}`;
    // along a run, a change of material uses the transition piece (taken from the neighbour before it)
    const run = (axis: 'T' | 'B' | 'L' | 'R', px: number, py: number) => {
      if (this.wall(px, py) && this.stone(px, py) !== this.stone(x, y)) {
        return `cap_${axis}_${this.stone(px, py) ? 'stone' : 'wood'}_to_${mat}`;
      }
      return cap(axis);
    };
    if (this.doorH(x + 1, y)) return cap('B_end_L');
    if (this.doorH(x - 1, y)) return cap('B_end_R');
    if (this.doorV(x, y + 1)) return cap(this.floor(x + 1, y) ? 'L_end_bottom' : 'R_end_bottom');
    if (this.doorV(x, y - 1)) return cap(this.floor(x + 1, y) ? 'L_end_top' : 'R_end_top');
    const u = this.inside(x, y - 1);
    const d = this.face(x, y + 1);
    const l = this.inside(x - 1, y);
    const r = this.inside(x + 1, y);
    if (d && r) return cap('inner_T_L');
    if (d && l) return cap('inner_T_R');
    if (d) return run('T', x - 1, y);
    if (u && r) return cap('inner_B_L');
    if (u && l) return cap('inner_B_R');
    if (u) return run('B', x - 1, y);
    if (r) return run('L', x, y - 1);
    if (l) return run('R', x, y - 1);
    if (this.inside(x + 1, y + 1)) return cap('TL');
    if (this.inside(x - 1, y + 1)) return cap('TR');
    if (this.inside(x + 1, y - 1)) return cap('BL');
    if (this.inside(x - 1, y - 1)) return cap('BR');
    return null; // deep inside a thick wall: nothing to show
  }

  draw(r: Renderer, camX: number, camY: number): void {
    r.image(this.canvas, -camX, -camY);
  }

  blocks(rect: Rect): boolean {
    const x0 = Math.floor(rect.x / TILE);
    const x1 = Math.floor((rect.x + rect.w - 0.001) / TILE);
    const y0 = Math.floor(rect.y / TILE);
    const y1 = Math.floor((rect.y + rect.h - 0.001) / TILE);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!this.floor(x, y)) return true;
    return false;
  }
}

/**
 * Wall-wrapping for painting: after floor is painted at (x, y), outside cells around it become walls
 * of the given material, including the cap row above a new back-wall face.
 */
export function wrapWalls(rows: string[], x: number, y: number, wall: string): string[] {
  const out = rows.slice();
  const set = (cx: number, cy: number) => {
    if (cy < 0 || cy >= out.length || cx < 0 || cx >= out[0].length) return;
    if (out[cy][cx] !== '.') return;
    out[cy] = out[cy].slice(0, cx) + wall + out[cy].slice(cx + 1);
  };
  for (let dy = -2; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) set(x + dx, y + dy);
  return out;
}
