/**
 * Asset loading. Reads atlas.json (where every picture lives), gamedata.json (the game's content) and
 * terrain.json (ground transition shapes),
 * loads every sheet image once, and lets the rest of the engine ask for sprites and animations by name.
 */

import type { Rect } from './geom';

export type Slice = [left: number, top: number, right: number, bottom: number];

export interface Frame {
  readonly sheet: string;
  readonly img: HTMLImageElement;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly slice?: Slice;
}

interface FrameJson { x: number; y: number; w: number; h: number; slice?: number | number[] }
interface SheetJson { image: string; frames: Record<string, FrameJson>; animations?: Record<string, string[]> }
interface AtlasJson { sheets: Record<string, SheetJson>; ui: Record<string, SheetJson> }

/** terrain.json: shapes and edge colours the ground compositor uses (written by the art pipeline). */
export interface TerrainData {
  bases: { grass: string[]; dirt: string[]; cobble: string[]; pavers: string[]; water: string[] };
  edges: {
    dirt_lip: string; grass_fringe: string; bank: string; bank_low: string; foam: string; shallows: string;
    cobble_kerb: string; pavers_kerb: string; flagstone_edge: string;
  };
  /** Plain interior floor textures. */
  floors: { wood: string; stone: string };
  /** corner[variant][index], corner_paved[index] and path[variant][conn]: 32 rows of 8 hex digits, bit 31 = leftmost pixel. */
  corner: string[][][];
  corner_paved: string[][];
  path: string[][][];
}

/** gamedata.json is large and owned by the content pipeline; the engine reads the parts it needs. */
export type GameData = Record<string, unknown>;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image ${url}`));
    img.src = url;
  });
}

function toSlice(s: number | number[] | undefined): Slice | undefined {
  if (s === undefined) return undefined;
  if (typeof s === 'number') return [s, s, s, s];
  return [s[0], s[1], s[2], s[3]];
}

export class Assets {
  private readonly frames = new Map<string, Frame>();
  private readonly anims = new Map<string, string[]>();
  private readonly boundsCache = new Map<string, Rect>();
  /** World-art sheets (not UI) in atlas order, with their frame and animation names: what the editor offers. */
  readonly sheets: Array<{ name: string; frames: string[]; animations: string[] }> = [];
  /** Names defined in more than one sheet; the unqualified name resolves to the first sheet. */
  readonly duplicates: string[] = [];

  private constructor(readonly data: GameData, readonly terrain: TerrainData) {}

  /** base: where the site is served from ('/' locally, '/hearthwick/' on GitHub Pages). */
  static async load(base = '/'): Promise<Assets> {
    // ?v=<build> keeps every file in step with the code that reads it, however the host caches.
    const v = `?v=${__BUILD_ID__}`;
    const json = async <T>(file: string): Promise<T> => {
      const res = await fetch(base + file + v);
      if (!res.ok) throw new Error(`Could not load ${file} (${res.status})`);
      return res.json() as Promise<T>;
    };
    const [atlas, data, terrain] = await Promise.all([
      json<AtlasJson>('atlas.json'),
      json<GameData>('gamedata.json'),
      json<TerrainData>('terrain.json'),
    ]);
    const assets = new Assets(data, terrain);
    const sheets = { ...atlas.sheets, ...atlas.ui };
    const files = [...new Set(Object.values(sheets).map((s) => s.image))];
    const images = new Map(await Promise.all(files.map(async (f) => [f, await loadImage(base + f + v)] as const)));
    for (const [sheet, s] of Object.entries(sheets)) {
      const img = images.get(s.image)!;
      for (const [name, f] of Object.entries(s.frames)) {
        const frame: Frame = { sheet, img, x: f.x, y: f.y, w: f.w, h: f.h, slice: toSlice(f.slice) };
        assets.frames.set(`${sheet}/${name}`, frame);
        if (assets.frames.has(name)) assets.duplicates.push(name);
        else assets.frames.set(name, frame);
      }
      for (const [name, list] of Object.entries(s.animations ?? {})) {
        if (!assets.anims.has(name)) assets.anims.set(name, list);
        assets.anims.set(`${sheet}/${name}`, list);
      }
      if (sheet in atlas.sheets) assets.sheets.push({ name: sheet, frames: Object.keys(s.frames), animations: Object.keys(s.animations ?? {}) });
    }
    return assets;
  }

  /** The opaque part of a frame (relative to its top-left), so placement can follow the art, not the cell. */
  bounds(name: string): Rect {
    const hit = this.boundsCache.get(name);
    if (hit) return hit;
    const f = this.frame(name);
    const c = document.createElement('canvas');
    c.width = f.w;
    c.height = f.h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(f.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    const d = ctx.getImageData(0, 0, f.w, f.h).data;
    let x0 = f.w, y0 = f.h, x1 = -1, y1 = -1;
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        if (d[(y * f.w + x) * 4 + 3] === 0) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    const b = x1 < 0 ? { x: 0, y: 0, w: f.w, h: f.h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    this.boundsCache.set(name, b);
    return b;
  }

  has(name: string): boolean {
    return this.frames.has(name);
  }

  /** A sprite by name, or 'sheet/name' when the plain name exists in more than one sheet. */
  frame(name: string): Frame {
    const f = this.frames.get(name);
    if (!f) throw new Error(`Unknown sprite "${name}"`);
    return f;
  }

  hasFrame(name: string): boolean {
    return this.frames.has(name);
  }

  hasAnimation(name: string): boolean {
    return this.anims.has(name);
  }

  /** Frame names of an animation from atlas.json, e.g. 'kid_walk_down'. */
  animation(name: string): string[] {
    const a = this.anims.get(name);
    if (!a) throw new Error(`Unknown animation "${name}"`);
    return a;
  }
}
