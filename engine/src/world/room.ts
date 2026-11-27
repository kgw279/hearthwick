/**
 * Interior ground: floors and walls from the art pack's interior kit, worked out from two grids and
 * pre-rendered once.
 *
 * Structure, one character per 32px cell:
 *   f  floor     W  plaster wall   I  plaster interior wall
 *   .  outside   S  stone wall     J  stone interior wall
 * Windows, shelves and pictures are wall-layer props hung on a wall face, not kinds of wall.
 * Floor material, one character per 16px cell (twice as many each way): w wood, s flagstone. Floors are
 * composited per pixel: flagstone patches take their shape from their cells (see field.ts), so one
 * painted cell is a small patch and painting more widens it.
 *
 * Walls are autotiled from the shape of the room, the way the kit is drawn (top-down 3/4):
 *   - interior walls (I, J) divide a room: one running east-west is a cap along the top with its face
 *     below (with ends beside a doorway), one running north-south a narrow cap (with ends where it stops
 *     at open floor); floor shows round them;
 *   - a wall cell with floor below it is a wall *face* (plaster or stone), unless that
 *     floor is a doorway through a side wall;
 *   - every other wall cell shows the *cap* (top edge) that the floor next to it calls for: T above a
 *     face, L/R beside the room, B along the front, outer corners TL/TR/BL/BR, inner corners where a back
 *     wall steps, and *_end pieces either side of a doorway (a floor cell in a wall line);
 *   - where plaster meets stone along a run, the transition piece is used.
 * Collision is per pixel: you can walk wherever floor shows and no wall art covers it. Interior walls
 * have floor under them, so they block exactly where they're drawn (a thin wall's cap, the end of a wall
 * beside a doorway, a junction); outer walls and the outside block whole cells (only backdrop shows
 * round their art). Furniture adds its own colliders as props.
 */
import type { Assets } from '../core/assets';
import type { Rect } from '../core/geom';
import type { Renderer } from '../core/renderer';
import { inside } from './field';
import type { Ground } from './ground';
import { tilePixels, TILE } from './tilemap';

const FLOOR = new Set(['f']);
/** Outer (thick) walls. */
const OUTER: Record<string, { stone: boolean }> = { W: { stone: false }, S: { stone: true } };
/** Interior (dividing) walls. */
const PARTITION: Record<string, { stone: boolean }> = { I: { stone: false }, J: { stone: true } };

export class RoomMap implements Ground {
  readonly w: number;
  readonly h: number;
  private readonly canvas: HTMLCanvasElement;

  private readonly rows: string[];
  /** 1 where the ground blocks, per world pixel. */
  private readonly solid: Uint8Array;

  constructor(ground: { rows: string[]; floor: string[] }, assets: Assets) {
    const rows = ground.rows;
    this.rows = rows;
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
    ctx.putImageData(this.floors(ground.floor, assets), 0, 0);
    const put = (name: string, x: number, y: number) => {
      const f = assets.frame(name);
      ctx.drawImage(f.img, f.x, f.y, f.w, f.h, x * TILE, y * TILE, f.w, f.h);
    };
    const W = this.pixelW;
    this.solid = new Uint8Array(W * this.pixelH);
    const pixels = tilePixels(assets);
    const alpha = new Map<string, ImageData>();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.floor(x, y)) continue;
        const piece = this.wall(x, y) ? this.wallPiece(x, y) : null;
        if (piece) put(piece, x, y);
        // only interior walls have floor drawn round their art: everywhere else the whole cell blocks
        let a = piece && this.interior(x, y) ? alpha.get(piece) : undefined;
        if (piece && this.interior(x, y) && !a) alpha.set(piece, (a = pixels(piece)));
        for (let py = 0; py < TILE; py++) {
          const row = (y * TILE + py) * W + x * TILE;
          for (let px = 0; px < TILE; px++) this.solid[row + px] = !a || a.data[(py * TILE + px) * 4 + 3] > 0 ? 1 : 0;
        }
      }
    }
  }

  /** Floor pixels: wood, with flagstone where its cells are painted, and a stone edge where they meet. */
  private floors(floor: string[], assets: Assets): ImageData {
    const W = this.pixelW;
    const H = this.pixelH;
    const img = new ImageData(W, H);
    const pixels = tilePixels(assets);
    const wood = pixels(assets.terrain.floors.wood).data;
    const stone = pixels(assets.terrain.floors.stone).data;
    const edge = parseInt(assets.terrain.edges.flagstone_edge.slice(1), 16);
    const fw = floor[0].length;
    const fh = floor.length;
    const isStone = (i: number, j: number) => floor[j][i] === 's';
    const st = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const cx = x >> 5;
        const cy = y >> 5;
        if (this.floor(cx, cy) || this.interior(cx, cy)) st[y * W + x] = inside(isStone, fw, fh, x, y, 0.04) ? 2 : 1;
      }
    }
    const out = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = st[y * W + x];
        if (!k) continue;
        const o = (y * W + x) * 4;
        const t = (((y & 31) * TILE) + (x & 31)) * 4;
        const src = k === 2 ? stone : wood;
        const woodNext = (px: number, py: number) => px >= 0 && py >= 0 && px < W && py < H && st[py * W + px] === 1;
        if (k === 2 && (woodNext(x - 1, y) || woodNext(x + 1, y) || woodNext(x, y - 1) || woodNext(x, y + 1))) {
          out[o] = (edge >> 16) & 255;
          out[o + 1] = (edge >> 8) & 255;
          out[o + 2] = edge & 255;
        } else {
          out[o] = src[t];
          out[o + 1] = src[t + 1];
          out[o + 2] = src[t + 2];
        }
        out[o + 3] = 255;
      }
    }
    return img;
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

  /** Any wall: outer or interior. */
  private wall(x: number, y: number): boolean {
    const c = this.cell(x, y);
    return c in OUTER || c in PARTITION;
  }

  private stone(x: number, y: number): boolean {
    const c = this.cell(x, y);
    return (OUTER[c] ?? PARTITION[c])?.stone ?? false;
  }

  /** A floor cell in a wall line: walls on both sides (left/right = through a front or back wall). */
  private doorH(x: number, y: number): boolean {
    return this.floor(x, y) && this.wall(x - 1, y) && this.wall(x + 1, y) && !this.floor(x, y + 1)
      && !this.floor(x - 2, y) && !this.floor(x + 2, y); // in a run of wall, not a gap between two pieces
  }

  /** An interior wall cell: thin art, so floor shows round it. */
  private interior(x: number, y: number): boolean {
    return this.cell(x, y) in PARTITION;
  }

  /** An interior wall running east-west: it joins a wall on its left or right. */
  private runsEW(x: number, y: number): boolean {
    return this.wall(x - 1, y) || this.wall(x + 1, y) || !(this.wall(x, y - 1) || this.wall(x, y + 1));
  }


  /** A floor cell in a side wall: walls above and below. */
  private doorV(x: number, y: number): boolean {
    return this.floor(x, y) && this.wall(x, y - 1) && this.wall(x, y + 1)
      && !this.floor(x, y - 2) && !this.floor(x, y + 2); // in a run of wall, not a gap between two pieces
  }

  /** A wall seen from the front: floor below it (or an interior wall running off it), not a side doorway. */
  private face(x: number, y: number): boolean {
    if (!this.wall(x, y) || this.interior(x, y)) return false;
    return (this.floor(x, y + 1) && !this.doorV(x, y + 1)) || this.interior(x, y + 1);
  }

  /** Floor, a wall face, or an interior wall: the parts of the room a cap borders. */
  private inside(x: number, y: number): boolean {
    return this.floor(x, y) || this.face(x, y) || this.interior(x, y);
  }

  private wallPiece(x: number, y: number): string | null {
    const mat = this.stone(x, y) ? 'stone' : 'wood';
    // interior walls: which way they run, and their ends where they stop at open floor
    const iw = (kind: string) => `iwall_${mat}_${kind}`;
    if (this.interior(x, y)) {
      if (this.runsEW(x, y)) {
        if (!this.wall(x + 1, y) && this.wall(x - 1, y)) return iw('H_end_L'); // open on its right
        if (!this.wall(x - 1, y) && this.wall(x + 1, y)) return iw('H_end_R'); // open on its left
        return iw('H');
      }
      if (!this.wall(x, y + 1)) return iw('V_end');
      if (!this.wall(x, y - 1)) return iw('V_top');
      return iw('V');
    }
    if (this.face(x, y)) {
      if (this.face(x + 1, y) && this.stone(x + 1, y) !== this.stone(x, y)) {
        return this.stone(x, y) ? 'face_stone_to_plaster' : 'face_plaster_to_stone';
      }
      return `face_${mat === 'stone' ? 'stone' : 'plaster'}_plain`;
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

  wallFace(px: number, py: number): boolean {
    const x = Math.floor(px / TILE);
    const y = Math.floor(py / TILE);
    if (this.face(x, y)) return true;
    // an east-west interior wall: its face is below its cap
    return this.interior(x, y) && this.runsEW(x, y) && py - y * TILE >= 8;
  }

  blocks(rect: Rect): boolean {
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > this.pixelW || rect.y + rect.h > this.pixelH) return true;
    const x0 = Math.floor(rect.x);
    const x1 = Math.ceil(rect.x + rect.w) - 1;
    const y0 = Math.floor(rect.y);
    const y1 = Math.ceil(rect.y + rect.h) - 1;
    for (let y = y0; y <= y1; y++) {
      const row = y * this.pixelW;
      for (let x = x0; x <= x1; x++) if (this.solid[row + x]) return true;
    }
    return false;
  }
}

/**
 * Wall-wrapping for painting: after floor is painted at (x, y), outside cells around it become walls
 * of the given material, including the cap row above a new back-wall face.
 */
export function wrapWalls(rows: string[], x: number, y: number, wall: string): string[] {
  // (x, y) is a 32px structure cell
  const out = rows.slice();
  const set = (cx: number, cy: number) => {
    if (cy < 0 || cy >= out.length || cx < 0 || cx >= out[0].length) return;
    if (out[cy][cx] !== '.') return;
    out[cy] = out[cy].slice(0, cx) + wall + out[cy].slice(cx + 1);
  };
  for (let dy = -2; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) set(x + dx, y + dy);
  return out;
}
