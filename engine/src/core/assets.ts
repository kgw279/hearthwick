/**
 * Asset loading. Reads atlas.json (where every picture lives) and gamedata.json (the game's content),
 * loads every sheet image once, and lets the rest of the engine ask for sprites and animations by name.
 */

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
  /** Names defined in more than one sheet; the unqualified name resolves to the first sheet. */
  readonly duplicates: string[] = [];

  private constructor(readonly data: GameData) {}

  /** base: where the site is served from ('/' locally, '/hearthwick/' on GitHub Pages). */
  static async load(base = '/'): Promise<Assets> {
    const [atlas, data] = await Promise.all([
      fetch(base + 'atlas.json').then((r) => r.json() as Promise<AtlasJson>),
      fetch(base + 'gamedata.json').then((r) => r.json() as Promise<GameData>),
    ]);
    const assets = new Assets(data);
    const sheets = { ...atlas.sheets, ...atlas.ui };
    const files = [...new Set(Object.values(sheets).map((s) => s.image))];
    const images = new Map(await Promise.all(files.map(async (f) => [f, await loadImage(base + f)] as const)));
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
    }
    return assets;
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

  /** Frame names of an animation from atlas.json, e.g. 'kid_walk_down'. */
  animation(name: string): string[] {
    const a = this.anims.get(name);
    if (!a) throw new Error(`Unknown animation "${name}"`);
    return a;
  }
}
