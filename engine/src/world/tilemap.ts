/**
 * Outdoor ground: a fine character grid (16px cells) composited per pixel into one image, so every
 * terrain blends into every other terrain it touches, whatever the mix.
 *
 *   .  grass   d  dirt (roads, paths)   f  farmland   c  cobblestone   s  town-square pavers   w  water
 *   r  rock (crags and cliff walls)
 *
 * Terrain is layered, bottom to top: grass, dirt, farmland, cobble, pavers, water, rock. Each terrain's shape comes
 * from its painted cells (see field.ts): one cell is a narrow-path-sized patch, and painting more
 * cells widens it. Each pixel shows its top layer, with edge colours where layers meet (dirt lip,
 * grass fringe, kerbs, earth bank, foam, shallows); textures and colours come from the art pack.
 * Rock stands up out of the ground: its upper edge is its grassy top, the rest of it is rock face, so
 * painting it taller makes a taller cliff; it's outlined, shades the ground at its foot, and blocks.
 * Water and rock collision is the layer itself, per pixel. Walking speed depends on the surface:
 * slow on grass and farmland, normal on dirt, fast on cobbles and pavers.
 * Painting can update just the changed area.
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import { hash2, type Rect } from '../core/geom';
import { loopFrame } from '../core/anim';
import { CELL, inside } from './field';
import type { Ground } from './ground';

/** Size of a map tile: spawns, exits and interior walls are placed on this grid. */
export const TILE = 32;

const WATER_FRAMES = ['water_f0', 'water_f1', 'water_f2', 'water_f3'];

/** Layers bottom to top: the character painted for each, and how much its edge wobbles. */
const GRASS = 0;
const DIRT = 1;
const FARM = 2;
const COBBLE = 3;
const PAVERS = 4;
const WATER = 5;
const ROCK = 6;
/** Rows of a rock pixel's column that show its grassy top before its face begins. */
const ROCK_TOP = 7;
/** How dark the shade at the foot of rock is (multiplies the ground's colour). */
const SHADE = 0.7;
/** Walking speed on each layer (1 = dirt). */
const SPEED = [0.8, 1, 0.8, 1.25, 1.25, 1, 1];
const LAYERS: Array<{ ch: string; layer: number; wobble: number }> = [
  { ch: 'd', layer: DIRT, wobble: 0.22 },
  { ch: 'f', layer: FARM, wobble: 0.04 },
  { ch: 'c', layer: COBBLE, wobble: 0.04 },
  { ch: 's', layer: PAVERS, wobble: 0.04 },
  { ch: 'w', layer: WATER, wobble: 0.2 },
  { ch: 'r', layer: ROCK, wobble: 0.08 },
];

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Base textures and edge colours, read once per Assets and shared by every map. */
interface Kit {
  bases: {
    grass: ImageData[]; flowers: ImageData; dirt: ImageData[]; farm: ImageData; cobble: ImageData[]; pavers: ImageData[]; water: ImageData[];
    cliffFace: ImageData; cliffTop: ImageData;
  };
  edges: Record<keyof Assets['terrain']['edges'], [number, number, number]>;
}
const kits = new WeakMap<Assets, Kit>();

export function tilePixels(assets: Assets): (name: string) => ImageData {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  return (name: string) => {
    const f = assets.frame(name);
    ctx.clearRect(0, 0, TILE, TILE);
    ctx.drawImage(f.img, f.x, f.y, TILE, TILE, 0, 0, TILE, TILE);
    return ctx.getImageData(0, 0, TILE, TILE);
  };
}

function kitFor(assets: Assets): Kit {
  const hit = kits.get(assets);
  if (hit) return hit;
  const t = assets.terrain;
  const pixels = tilePixels(assets);
  const kit: Kit = {
    bases: {
      grass: t.bases.grass.map(pixels), flowers: pixels('grass_flowers'), dirt: t.bases.dirt.map(pixels), farm: pixels('farmland'),
      cobble: t.bases.cobble.map(pixels), pavers: t.bases.pavers.map(pixels), water: t.bases.water.map(pixels),
      cliffFace: pixels(t.bases.cliff_face), cliffTop: pixels(t.bases.cliff_top),
    },
    edges: Object.fromEntries(Object.entries(t.edges).map(([k, v]) => [k, rgb(v)])) as Kit['edges'],
  };
  kits.set(assets, kit);
  return kit;
}

export class TileMap implements Ground {
  /** Size in fine cells. */
  readonly w: number;
  readonly h: number;
  private readonly kit: Kit;
  private readonly canvas: HTMLCanvasElement;
  private readonly img: ImageData;
  /** Top layer at every world pixel (GRASS..WATER); water pixels are also the collision mask. */
  private readonly top: Uint8Array;
  /** Map tiles (32px) that are entirely open water: drawn with the animated water frames. */
  private readonly waterTiles = new Set<number>();
  private waterDebug: HTMLCanvasElement | null = null;

  /** rows: the layout's own grid (the editor changes it, then calls repaint). */
  constructor(private readonly rows: string[], assets: Assets) {
    this.h = rows.length;
    this.w = rows[0].length;
    rows.forEach((r, i) => {
      if (r.length !== this.w) throw new Error(`Map row ${i} is ${r.length} wide, expected ${this.w}`);
    });
    this.kit = kitFor(assets);
    this.top = new Uint8Array(this.pixelW * this.pixelH);
    this.img = new ImageData(this.pixelW, this.pixelH);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.pixelW;
    this.canvas.height = this.pixelH;
    this.update(0, 0, this.pixelW, this.pixelH);
  }

  get pixelW(): number {
    return this.w * CELL;
  }

  get pixelH(): number {
    return this.h * CELL;
  }

  /** Redraw the area around fine cell (i, j) after it was painted. */
  repaint(i: number, j: number): void {
    this.update((i - 2) * CELL, (j - 2) * CELL, 5 * CELL, 5 * CELL);
  }

  /** Recompute layers for an area (plus the margin edge colours look at), then colour and show it. */
  private update(x: number, y: number, w: number, h: number): void {
    const X0 = Math.max(0, x - 2);
    const Y0 = Math.max(0, y - ROCK_TOP - 3); // edge colours and rock tops look this far up
    const X1 = Math.min(this.pixelW, x + w + 2);
    const Y1 = Math.min(this.pixelH, y + h + 2);
    const W = this.pixelW;
    const tests = LAYERS.map((l) => ({ ...l, is: (i: number, j: number) => this.rows[j][i] === l.ch }));
    for (let py = Y0; py < Y1; py++) {
      for (let px = X0; px < X1; px++) {
        let t = GRASS;
        for (const l of tests) if (inside(l.is, this.w, this.h, px, py, l.wobble)) t = l.layer;
        this.top[py * W + px] = t;
      }
    }
    const cx0 = Math.max(0, x);
    const cy0 = Math.max(0, y);
    const cx1 = Math.min(this.pixelW, x + w);
    const cy1 = Math.min(this.pixelH, y + h);
    this.colour(cx0, cy0, cx1, cy1);
    this.canvas.getContext('2d')!.putImageData(this.img, 0, 0, cx0, cy0, cx1 - cx0, cy1 - cy0);
    // which whole tiles in the area are open water (animated)
    for (let ty = Math.floor(cy0 / TILE); ty < Math.ceil(cy1 / TILE); ty++) {
      for (let tx = Math.floor(cx0 / TILE); tx < Math.ceil(cx1 / TILE); tx++) {
        let all = true;
        for (let py = ty * TILE; py < ty * TILE + TILE && all; py++) {
          for (let px = tx * TILE; px < tx * TILE + TILE; px++) {
            if (px >= this.pixelW || py >= this.pixelH || this.top[py * W + px] !== WATER) {
              all = false;
              break;
            }
          }
        }
        const key = ty * 10000 + tx;
        if (all) this.waterTiles.add(key);
        else this.waterTiles.delete(key);
      }
    }
    this.waterDebug = null;
  }

  /** Colour pixels: base texture of the top layer, plus the edge colours where layers meet. */
  private colour(x0: number, y0: number, x1: number, y1: number): void {
    const W = this.pixelW;
    const H = this.pixelH;
    const { top, kit } = this;
    const out = this.img.data;
    const e = kit.edges;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * W + x;
        const here = top[i];
        // off the map a pixel continues as itself, so no edges are drawn along the map border
        const at = (px: number, py: number) => (px < 0 || py < 0 || px >= W || py >= H ? here : top[py * W + px]);
        const up = at(x, y - 1);
        const down = at(x, y + 1);
        const left = at(x - 1, y);
        const right = at(x + 1, y);
        const tx = x >> 5;
        const ty = y >> 5;
        const v = hash2(tx, ty) % kit.bases.grass.length;
        const pv = hash2(tx + 3, ty + 11) % kit.bases.cobble.length;
        let src: ImageData | null = null;
        let col: [number, number, number] | null = null;
        // the ground just below rock is in its shade
        const shade = here !== ROCK && (up === ROCK || at(x, y - 2) === ROCK || at(x, y - 3) === ROCK);
        if (here === ROCK) {
          // its top along its upper edge, rock face below; outlined where it meets anything else
          let above = 0; // rock pixels straight above, counted as far as the top needs
          while (above <= ROCK_TOP && at(x, y - above - 1) === ROCK) above++;
          src = above < ROCK_TOP ? kit.bases.cliffTop : kit.bases.cliffFace;
          if (up !== ROCK || down !== ROCK || left !== ROCK || right !== ROCK) col = e.rock_outline;
          else if (above === ROCK_TOP) col = e.rock_ledge; // the row where the top drops away into the face
        } else if (here === WATER) {
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
        } else if (here === FARM) {
          src = kit.bases.farm;
          if (up < FARM || down < FARM || left < FARM || right < FARM) col = e.dirt_lip;
        } else if (here === DIRT) {
          src = kit.bases.dirt[v];
          if (up === GRASS) col = e.dirt_lip;
        } else {
          src = hash2(tx + 7, ty + 3) % 19 === 0 ? kit.bases.flowers : kit.bases.grass[v];
          const near = (t: number) => t !== GRASS && t !== WATER;
          if (near(down) || near(left) || near(right)) col = e.grass_fringe;
        }
        const o = i * 4;
        const k = shade ? SHADE : 1;
        if (col) {
          out[o] = col[0] * k;
          out[o + 1] = col[1] * k;
          out[o + 2] = col[2] * k;
        } else {
          const t = (((y & 31) * TILE) + (x & 31)) * 4;
          out[o] = src!.data[t] * k;
          out[o + 1] = src!.data[t + 1] * k;
          out[o + 2] = src!.data[t + 2] * k;
        }
        out[o + 3] = 255;
      }
    }
  }

  draw(r: Renderer, camX: number, camY: number, time: number): void {
    r.image(this.canvas, -camX, -camY);
    for (const key of this.waterTiles) {
      const x = key % 10000;
      const y = Math.floor(key / 10000);
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
      for (let x = x0; x <= x1; x++) if (this.top[row + x] >= WATER) return true; // water and rock
    }
    return false;
  }

  /** How fast you walk on the ground at a world pixel (1 = dirt). */
  speedAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.pixelW || y >= this.pixelH) return 1;
    return SPEED[this.top[Math.floor(y) * this.pixelW + Math.floor(x)]];
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
