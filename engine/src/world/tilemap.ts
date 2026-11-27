/**
 * Town ground: a character grid composited per pixel into one image, so every terrain blends into
 * every other terrain it touches, whatever the mix.
 *
 *   .  grass        d  road (wide)        p  narrow path        D  narrow path opening north into a door
 *   c  cobblestone street                 s  town-square pavers                    w  water
 *
 * Terrain is layered, bottom to top: grass, dirt (road and paths), cobble, pavers, water. Each layer has a
 * shape per cell: road, paving and water use corner shapes (a map corner belongs to a layer if any of
 * the four cells around it does; paving uses clean-edged shapes, ground uses natural wobbly ones), paths
 * use edge shapes that reach toward neighbouring paths, roads, paving, doors and water. Each pixel shows
 * its top layer, with edge colours where layers meet (dirt lip, grass fringe, kerbs, earth bank, foam,
 * shallows). Shapes and colours come from terrain.json, written by the art pipeline.
 * Water collision is the water layer itself, per pixel.
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import { hash2, type Rect } from '../core/geom';
import { loopFrame } from '../core/anim';
import type { Ground } from './ground';

export const TILE = 32;

const WATER_FRAMES = ['water_f0', 'water_f1', 'water_f2', 'water_f3'];

/** Layer numbers, bottom to top. */
const GRASS = 0;
const DIRT = 1;
const COBBLE = 2;
const PAVERS = 3;
const WATER = 4;

/** Decode a 32x32 shape from terrain.json (32 rows of 8 hex digits). */
function decodeMask(rows: string[]): Uint8Array {
  const m = new Uint8Array(TILE * TILE);
  rows.forEach((hex, y) => {
    const bits = parseInt(hex, 16);
    for (let x = 0; x < TILE; x++) if ((bits >>> (31 - x)) & 1) m[y * TILE + x] = 1;
  });
  return m;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Decoded shapes and base textures, built once per Assets and shared by every map. */
interface Kit {
  corner: Uint8Array[][];
  paved: Uint8Array[];
  path: Uint8Array[][];
  bases: { grass: ImageData[]; flowers: ImageData; dirt: ImageData[]; cobble: ImageData[]; pavers: ImageData[]; water: ImageData[] };
  edges: Record<keyof Assets['terrain']['edges'], [number, number, number]>;
}
const kits = new WeakMap<Assets, Kit>();

function kitFor(assets: Assets): Kit {
  const hit = kits.get(assets);
  if (hit) return hit;
  const t = assets.terrain;
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const pixels = (name: string) => {
    const f = assets.frame(name);
    ctx.clearRect(0, 0, TILE, TILE);
    ctx.drawImage(f.img, f.x, f.y, TILE, TILE, 0, 0, TILE, TILE);
    return ctx.getImageData(0, 0, TILE, TILE);
  };
  const kit: Kit = {
    corner: t.corner.map((v) => v.map(decodeMask)),
    paved: t.corner_paved.map(decodeMask),
    path: t.path.map((v) => v.map(decodeMask)),
    bases: {
      grass: t.bases.grass.map(pixels), flowers: pixels('grass_flowers'), dirt: t.bases.dirt.map(pixels),
      cobble: t.bases.cobble.map(pixels), pavers: t.bases.pavers.map(pixels), water: t.bases.water.map(pixels),
    },
    edges: Object.fromEntries(Object.entries(t.edges).map(([k, v]) => [k, rgb(v)])) as Kit['edges'],
  };
  kits.set(assets, kit);
  return kit;
}

export class TileMap implements Ground {
  readonly w: number;
  readonly h: number;
  private readonly cells: string[];
  private readonly ground: HTMLCanvasElement;
  /** Cells that are entirely open water: drawn with the animated water frames. */
  private readonly waterCells: Array<{ x: number; y: number }> = [];
  /** Top layer at every world pixel (GRASS..WATER); water pixels are also the collision mask. */
  private readonly top: Uint8Array;
  private waterDebug: HTMLCanvasElement | null = null;

  constructor(rows: string[], assets: Assets) {
    this.h = rows.length;
    this.w = rows[0].length;
    rows.forEach((r, i) => {
      if (r.length !== this.w) throw new Error(`Map row ${i} is ${r.length} wide, expected ${this.w}`);
    });
    this.cells = rows;
    const kit = kitFor(assets);
    this.top = new Uint8Array(this.pixelW * this.pixelH);
    this.stampShapes(kit);
    this.ground = this.paint(kit);
  }

  get pixelW(): number {
    return this.w * TILE;
  }

  get pixelH(): number {
    return this.h * TILE;
  }

  cell(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '#';
    return this.cells[y][x];
  }

  private isPath(x: number, y: number): boolean {
    const c = this.cell(x, y);
    return c === 'p' || c === 'D';
  }

  /** Corner index (TL*1+TR*2+BL*4+BR*8) of cell (x, y) for a corner terrain: a corner counts if any cell around it is that terrain. */
  private cornerIndex(x: number, y: number, ch: string): number {
    const at = (vx: number, vy: number) =>
      this.cell(vx - 1, vy - 1) === ch || this.cell(vx, vy - 1) === ch || this.cell(vx - 1, vy) === ch || this.cell(vx, vy) === ch;
    return (at(x, y) ? 1 : 0) | (at(x + 1, y) ? 2 : 0) | (at(x, y + 1) ? 4 : 0) | (at(x + 1, y + 1) ? 8 : 0);
  }

  /** Which ways a narrow path reaches: other paths, road, paving, water, and (for D) the door to the north. */
  private pathConn(x: number, y: number): number {
    const joins = (cx: number, cy: number) => this.isPath(cx, cy) || 'dcsw'.includes(this.cell(cx, cy));
    let conn = 0;
    if (joins(x, y - 1) || this.cell(x, y) === 'D') conn |= 1;
    if (joins(x + 1, y)) conn |= 2;
    if (joins(x, y + 1)) conn |= 4;
    if (joins(x - 1, y)) conn |= 8;
    return conn;
  }

  /** Raise each pixel to the highest layer whose shape covers it. */
  private stampShapes(kit: Kit): void {
    const top = this.top;
    const stamp = (layer: number, shape: Uint8Array, cx: number, cy: number) => {
      for (let py = 0; py < TILE; py++) {
        const row = (cy * TILE + py) * this.pixelW + cx * TILE;
        for (let px = 0; px < TILE; px++) if (shape[py * TILE + px] && top[row + px] < layer) top[row + px] = layer;
      }
    };
    const variants = kit.corner.length;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const v = hash2(x, y) % variants;
        const road = this.cornerIndex(x, y, 'd');
        if (road) stamp(DIRT, kit.corner[v][road], x, y);
        if (this.isPath(x, y)) stamp(DIRT, kit.path[hash2(x, y) % kit.path.length][this.pathConn(x, y)], x, y);
        const cobble = this.cornerIndex(x, y, 'c');
        if (cobble) stamp(COBBLE, kit.paved[cobble], x, y);
        const pavers = this.cornerIndex(x, y, 's');
        if (pavers) stamp(PAVERS, kit.paved[pavers], x, y);
        const water = this.cornerIndex(x, y, 'w');
        if (water) stamp(WATER, kit.corner[v][water], x, y);
        if (water === 15) this.waterCells.push({ x, y });
      }
    }
  }

  /** Colour every pixel: base texture of its top layer, plus the edge colours where layers meet. */
  private paint(kit: Kit): HTMLCanvasElement {
    const W = this.pixelW;
    const H = this.pixelH;
    const img = new ImageData(W, H);
    const out = img.data;
    const top = this.top;
    const e = kit.edges;
    const variants = kit.corner.length;
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const v = hash2(cx, cy) % variants;
        const pv = hash2(cx + 3, cy + 11) % kit.bases.cobble.length;
        const grass = hash2(cx + 7, cy + 3) % 19 === 0 ? kit.bases.flowers : kit.bases.grass[v];
        for (let ty = 0; ty < TILE; ty++) {
          for (let tx = 0; tx < TILE; tx++) {
            const x = cx * TILE + tx;
            const y = cy * TILE + ty;
            const i = y * W + x;
            const here = top[i];
            // off the map a pixel continues as itself, so no edges are drawn along the map border
            const at = (px: number, py: number) => (px < 0 || py < 0 || px >= W || py >= H ? here : top[py * W + px]);
            const up = at(x, y - 1);
            const down = at(x, y + 1);
            const left = at(x - 1, y);
            const right = at(x + 1, y);
            let src: ImageData | null = null;
            let col: [number, number, number] | null = null;
            if (here === WATER) {
              src = kit.bases.water[v];
              if (up !== WATER) col = e.foam;
              else if (left !== WATER || right !== WATER || at(x, y - 2) !== WATER) col = e.shallows;
            } else if (down === WATER) col = e.bank;
            else if (at(x, y + 2) === WATER) col = e.bank_low;
            else if (here === PAVERS) {
              src = kit.bases.pavers[pv];
              if (up < PAVERS || down < PAVERS || left < PAVERS || right < PAVERS) col = e.pavers_kerb;
            } else if (here === COBBLE) {
              src = kit.bases.cobble[pv];
              if (up < COBBLE || down < COBBLE || left < COBBLE || right < COBBLE) col = e.cobble_kerb;
            } else if (here === DIRT) {
              src = kit.bases.dirt[v];
              if (up === GRASS) col = e.dirt_lip;
            } else {
              src = grass;
              const near = (t: number) => t !== GRASS && t !== WATER;
              if (near(down) || near(left) || near(right)) col = e.grass_fringe;
            }
            const o = i * 4;
            const t = (ty * TILE + tx) * 4;
            if (col) {
              out[o] = col[0];
              out[o + 1] = col[1];
              out[o + 2] = col[2];
            } else {
              out[o] = src!.data[t];
              out[o + 1] = src!.data[t + 1];
              out[o + 2] = src!.data[t + 2];
            }
            out[o + 3] = 255;
          }
        }
      }
    }
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    c.getContext('2d')!.putImageData(img, 0, 0);
    return c;
  }

  draw(r: Renderer, camX: number, camY: number, time: number): void {
    r.image(this.ground, -camX, -camY);
    for (const { x, y } of this.waterCells) {
      const sx = x * TILE - camX;
      const sy = y * TILE - camY;
      if (sx < -TILE || sy < -TILE || sx > r.viewW || sy > r.viewH) continue;
      r.sprite(loopFrame(WATER_FRAMES, time, 3, (x + y) % 4), sx, sy);
    }
  }

  /** True if a world-space rectangle touches any water pixel or leaves the map. */
  blocks(rect: Rect): boolean {
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > this.pixelW || rect.y + rect.h > this.pixelH) return true;
    const x0 = Math.floor(rect.x);
    const x1 = Math.ceil(rect.x + rect.w) - 1;
    const y0 = Math.floor(rect.y);
    const y1 = Math.ceil(rect.y + rect.h) - 1;
    for (let y = y0; y <= y1; y++) {
      const row = y * this.pixelW;
      for (let x = x0; x <= x1; x++) if (this.top[row + x] === WATER) return true;
    }
    return false;
  }

  /** Debug view (F3): water collision shaded over the map. */
  drawDebug(r: Renderer, camX: number, camY: number): void {
    if (!this.waterDebug) {
      const c = document.createElement('canvas');
      c.width = this.pixelW;
      c.height = this.pixelH;
      const ctx = c.getContext('2d')!;
      const img = ctx.createImageData(this.pixelW, this.pixelH);
      for (let i = 0; i < this.top.length; i++) {
        if (this.top[i] !== WATER) continue;
        img.data.set([95, 205, 228, 110], i * 4);
      }
      ctx.putImageData(img, 0, 0);
      this.waterDebug = c;
    }
    r.image(this.waterDebug, -camX, -camY);
  }
}
