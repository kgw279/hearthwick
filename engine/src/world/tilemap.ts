/**
 * Ground tile map built from a character grid, rendered with the art pack's autotiles.
 *
 *   .  grass        d  dirt road (wide, corner autotile grass_dirt)
 *   w  water        p  narrow path (edge autotile)        D  narrow path that opens north into a door
 *
 * Wide terrain uses corner autotiles: a map corner is dirt (or water) if any of the four cells around it
 * is, so a 'd' cell is solid dirt and its neighbours get the soft edges. Full water cells animate.
 */
import type { Assets } from '../core/assets';
import type { Renderer } from '../core/renderer';
import { VIEW_W, VIEW_H } from '../core/renderer';
import { hash2, type Rect } from '../core/geom';
import { loopFrame } from '../core/anim';

export const TILE = 32;

type Corner = 0 | 1 | 2; // grass, dirt, water
const CONNECTOR: Record<number, string> = { 12: 'below', 3: 'above', 10: 'right', 5: 'left' };
const WATER_FRAMES = ['water_f0', 'water_f1', 'water_f2', 'water_f3'];

export class TileMap {
  readonly w: number;
  readonly h: number;
  private readonly cells: string[];
  private readonly corners: Corner[][];
  private readonly ground: HTMLCanvasElement;
  private readonly waterCells: Array<{ x: number; y: number }> = [];

  constructor(rows: string[], private readonly assets: Assets) {
    this.h = rows.length;
    this.w = rows[0].length;
    rows.forEach((r, i) => {
      if (r.length !== this.w) throw new Error(`Map row ${i} is ${r.length} wide, expected ${this.w}`);
    });
    this.cells = rows;
    this.corners = this.buildCorners();
    this.ground = this.renderGround();
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

  private buildCorners(): Corner[][] {
    const out: Corner[][] = [];
    for (let vy = 0; vy <= this.h; vy++) {
      const row: Corner[] = [];
      for (let vx = 0; vx <= this.w; vx++) {
        const around = [this.cell(vx - 1, vy - 1), this.cell(vx, vy - 1), this.cell(vx - 1, vy), this.cell(vx, vy)];
        const dirt = around.includes('d');
        const water = around.includes('w');
        if (dirt && water) throw new Error(`Road and water meet at corner (${vx}, ${vy}); keep them a tile apart`);
        row.push(dirt ? 1 : water ? 2 : 0);
      }
      out.push(row);
    }
    return out;
  }

  /** Which corner autotile a cell uses: the terrain kind and its corner index (TL*1+TR*2+BL*4+BR*8). */
  private cornerTile(x: number, y: number): { kind: Corner; index: number } {
    const c = [this.corners[y][x], this.corners[y][x + 1], this.corners[y + 1][x], this.corners[y + 1][x + 1]];
    const kind = (c.find((v) => v !== 0) ?? 0) as Corner;
    const index = c.reduce<number>((acc, v, i) => acc | ((kind && v === kind ? 1 : 0) << i), 0);
    return { kind, index };
  }

  private tileFrame(x: number, y: number): string | null {
    const { kind, index } = this.cornerTile(x, y);
    if (this.isPath(x, y)) {
      const v = hash2(x, y) % 2;
      if (kind === 1 && CONNECTOR[index]) return `path_into_road_${CONNECTOR[index]}_v${v}`;
      let conn = 0;
      if (this.isPath(x, y - 1) || this.cell(x, y) === 'D') conn |= 1;
      if (this.isPath(x + 1, y)) conn |= 2;
      if (this.isPath(x, y + 1)) conn |= 4;
      if (this.isPath(x - 1, y)) conn |= 8;
      return `path_${String(conn).padStart(2, '0')}_v${v}`;
    }
    const v = hash2(x, y) % 3;
    if (kind === 2 && index === 15) return null; // animated water, drawn every frame
    if (kind === 0) return hash2(x + 7, y + 3) % 19 === 0 ? 'grass_flowers' : `grass_dirt_00_v${v}`;
    const set = kind === 1 ? 'grass_dirt' : 'grass_water';
    return `${set}_${String(index).padStart(2, '0')}_v${v}`;
  }

  /** The static ground is drawn once into a big canvas; only water is redrawn each frame. */
  private renderGround(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.pixelW;
    c.height = this.pixelH;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const name = this.tileFrame(x, y);
        if (name === null) {
          this.waterCells.push({ x, y });
          continue;
        }
        const f = this.assets.frame(name);
        ctx.drawImage(f.img, f.x, f.y, f.w, f.h, x * TILE, y * TILE, TILE, TILE);
      }
    }
    return c;
  }

  draw(r: Renderer, camX: number, camY: number, time: number): void {
    r.blit(this.ground, camX, camY, VIEW_W, VIEW_H, 0, 0);
    for (const { x, y } of this.waterCells) {
      const sx = x * TILE - camX;
      const sy = y * TILE - camY;
      if (sx < -TILE || sy < -TILE || sx > VIEW_W || sy > VIEW_H) continue;
      r.sprite(loopFrame(WATER_FRAMES, time, 3, (x + y) % 4), sx, sy);
    }
  }

  /** True if a world-space rectangle touches deep water or leaves the map. */
  blocks(rect: Rect): boolean {
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > this.pixelW || rect.y + rect.h > this.pixelH) return true;
    const x0 = Math.floor(rect.x / TILE);
    const x1 = Math.floor((rect.x + rect.w - 1) / TILE);
    const y0 = Math.floor(rect.y / TILE);
    const y1 = Math.floor((rect.y + rect.h - 1) / TILE);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.cell(x, y) === 'w') return true;
    return false;
  }
}
