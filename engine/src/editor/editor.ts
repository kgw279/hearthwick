/**
 * Layout editor (F2, or click the left stick). Edits the map you're standing in, live: every change
 * rebuilds the scene through the same code the game uses, and is checked for overlaps and for places
 * the player can no longer walk to.
 *
 * Props tool: props are placed freely, by the pixel. A ghost of the chosen palette item follows the
 * cursor; place it, or pick up the prop under the cursor to move it and place it again; delete removes
 * it. Snap cycles free / 8px / 16px / tile. Except on tile snap, a prop dragged near a wall or the
 * water's edge pulls in flush against it (and is pushed back out if dragged into it).
 * Ground tool: paint grass, road, path and water (town) or wood, stone and no-floor (interiors); the
 * ground re-blends around every painted cell.
 * Zoom steps out to 1/2 and 1/4 to see and edit a whole town.
 * Save writes src/maps/<id>.json when running the dev server, and downloads the file anywhere else.
 */
import type { Action } from '../core/input';
import { overlaps, type Rect } from '../core/geom';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Game } from '../game/game';
import { placeProp, propFrames } from '../game/build';
import { drawText, measure } from '../ui/text';
import { formatLayout, GROUND_CHARS, type Layout, type PlacedProp } from '../world/layout';
import { TILE } from '../world/tilemap';
import { buildPalette, type Category } from './palette';
import { validate, type Issue } from './validate';

type Tool = 'props' | 'ground';
type Snap = 1 | 8 | 16 | 'tile';
/** A prop picked up to move: where it was in the list, and where the cursor held it from. */
interface Held { prop: PlacedProp; from: number; grab: { x: number; y: number } }

const SNAPS: Snap[] = [1, 8, 16, 'tile'];
const ZOOMS = [1, 0.5, 0.25];
const MAGNET = 8; // px within which a prop pulls flush against a wall or shore
const CURSOR_SPEED = 110; // world px per second at zoom 1
const REPEAT_FIRST = 0.22;
const REPEAT_NEXT = 0.06;
const SLOT = 32;
const PANEL_H = 80;
const HUD_H = 22;
const HINTS: Array<[Action[], string]> = [
  [['interact'], 'Place'], [['cook'], 'Del'], [['tab_prev', 'tab_next'], 'Item'], [['cat_prev', 'cat_next'], 'Group'],
  [['recipes'], 'Tool'], [['map'], 'Snap'], [['zoom'], 'Zoom'], [['menu'], 'Save'], [['back'], 'Exit'],
];

export class Editor {
  active = false;
  zoom = 1;
  issues: Issue[] = [];
  private tool: Tool = 'props';
  /** Cursor in world pixels. */
  private readonly cursor = { x: 0, y: 0 };
  private snap: Snap = 1;
  readonly palette: Category[];
  private cat = 0;
  readonly itemIndex: number[];
  private brush = 0;
  private held: Held | null = null;
  private checkIn = -1;
  private readonly unsaved = new Set<string>();
  private status = { text: '', until: 0 };
  private time = 0;
  private repeat = { dx: 0, dy: 0, held: 0, next: REPEAT_FIRST };
  private lastPainted = '';
  /** Mouse position in logical screen pixels while the mouse is driving the cursor. */
  private mouse: { x: number; y: number } | null = null;
  cam = { x: 0, y: 0 };
  private readonly slots: Array<{ x: number; y: number; index: number }> = [];
  /** Where the camera is aimed. */
  view = { x: 0, y: 0 };
  /** True while keys/pad drive the cursor (the camera follows it); false while the mouse does. */
  private following = true;
  private pan: { x: number; y: number } | null = null;

  constructor(private readonly game: Game) {
    this.palette = buildPalette(game.assets, game.content);
    this.itemIndex = this.palette.map(() => 0);
    this.listenMouse(game.renderer.ctx.canvas);
  }

  private get layout(): Layout {
    return this.game.layouts.get(this.game.scene.id)!;
  }

  toggle(): void {
    if (this.active) return this.close();
    this.active = true;
    const f = this.game.player.feet();
    this.cursor.x = f.x + f.w / 2;
    this.cursor.y = f.y + f.h;
    this.view = { ...this.cursor };
    this.game.camera.setInset(HUD_H, PANEL_H);
    this.check();
  }

  private close(): void {
    this.cancelHeld();
    this.active = false;
    this.setZoom(1);
    this.game.camera.setInset(0, 0);
  }

  /**
   * World point the camera follows while editing: the cursor when keys or a pad move it. The mouse moves
   * the cursor without moving the camera (so the point under the pointer stays put); drag with the middle
   * button to pan.
   */
  focus(): { x: number; y: number } {
    return this.view;
  }

  private setZoom(z: number): void {
    this.zoom = z;
    this.game.camera.setZoom(z);
  }

  // ------------------------------------------------------------------ update

  update(dt: number): void {
    this.time += dt;
    const input = this.game.input;
    this.moveCursor(dt);

    if (input.pressed('recipes')) {
      this.cancelHeld();
      this.tool = this.tool === 'props' ? 'ground' : 'props';
      if (this.tool === 'ground') this.centreOnTile();
    }
    if (input.pressed('tab_prev')) this.stepItem(-1);
    if (input.pressed('tab_next')) this.stepItem(1);
    if (input.pressed('cat_prev')) this.stepCategory(-1);
    if (input.pressed('cat_next')) this.stepCategory(1);
    if (input.pressed('map') && this.tool === 'props') {
      this.snap = SNAPS[(SNAPS.indexOf(this.snap) + 1) % SNAPS.length];
      this.say(`Snap: ${snapName(this.snap)}`);
    }
    if (input.pressed('zoom')) this.setZoom(ZOOMS[(ZOOMS.indexOf(this.zoom) + 1) % ZOOMS.length]);
    if (input.pressed('menu')) void this.save();
    if (input.pressed('back')) {
      if (this.held) this.cancelHeld();
      else return this.close();
    }

    if (this.tool === 'ground') {
      if (input.pressed('interact')) this.lastPainted = '';
      if (input.down('interact')) this.paint();
    } else {
      if (input.pressed('interact')) this.primary();
      if (input.pressed('cook')) this.remove();
    }

    if (this.checkIn > 0 && (this.checkIn -= dt) <= 0) this.check();
  }

  /**
   * A tap moves one step (one snap step for props, one tile on the ground). Held, props glide (free snap)
   * or repeat steps (snapped); ground repeats tile steps.
   */
  private moveCursor(dt: number): void {
    const m = this.game.input.move();
    const dx = Math.abs(m.x) > 0.3 ? Math.sign(m.x) : 0;
    const dy = Math.abs(m.y) > 0.3 ? Math.sign(m.y) : 0;
    if (!dx && !dy) {
      this.repeat = { dx: 0, dy: 0, held: 0, next: REPEAT_FIRST };
      return;
    }
    this.mouse = null; // keys/pad take over from the mouse
    this.following = true;
    const step = this.tool === 'ground' || this.snap === 'tile' ? TILE : this.snap;
    if (dx !== this.repeat.dx || dy !== this.repeat.dy) {
      this.repeat = { dx, dy, held: 0, next: REPEAT_FIRST };
      this.setCursor(this.cursor.x + dx * step, this.cursor.y + dy * step);
      return;
    }
    this.repeat.held += dt;
    if (this.repeat.held < REPEAT_FIRST) return;
    if (step === 1) {
      const speed = CURSOR_SPEED / this.zoom;
      this.setCursor(this.cursor.x + m.x * speed * dt, this.cursor.y + m.y * speed * dt);
    } else if (this.repeat.held >= this.repeat.next) {
      this.repeat.next += REPEAT_NEXT;
      this.setCursor(this.cursor.x + dx * step, this.cursor.y + dy * step);
    }
  }

  private setCursor(x: number, y: number): void {
    const g = this.game.scene.ground;
    this.cursor.x = Math.max(0, Math.min(g.pixelW - 1, x));
    this.cursor.y = Math.max(0, Math.min(g.pixelH - 1, y));
    if (this.following) this.view = { ...this.cursor };
  }

  private centreOnTile(): void {
    this.cursor.x = Math.floor(this.cursor.x / TILE) * TILE + TILE / 2;
    this.cursor.y = Math.floor(this.cursor.y / TILE) * TILE + TILE / 2;
  }

  private get tileX(): number {
    return Math.floor(this.cursor.x / TILE);
  }

  private get tileY(): number {
    return Math.floor(this.cursor.y / TILE);
  }

  private stepItem(d: number): void {
    if (this.tool === 'ground') {
      const n = GROUND_CHARS[this.layout.ground.type].length;
      this.brush = (this.brush + d + n) % n;
      return;
    }
    if (this.held) return; // moving a prop: the palette is not in play
    const n = this.palette[this.cat].items.length;
    this.itemIndex[this.cat] = (this.itemIndex[this.cat] + d + n) % n;
  }

  private stepCategory(d: number): void {
    if (this.tool !== 'props' || this.held) return;
    this.cat = (this.cat + d + this.palette.length) % this.palette.length;
  }

  // ------------------------------------------------------------------ props

  /** What would be placed right now (held prop or palette item), positioned at the cursor with snapping and magnets. */
  private ghost(): PlacedProp {
    const base = this.held
      ? { ...this.held.prop, x: this.cursor.x + this.held.grab.x, y: this.cursor.y + this.held.grab.y }
      : { ...structuredClone(this.palette[this.cat].items[this.itemIndex[this.cat]].prop), x: this.cursor.x, y: this.cursor.y };
    return this.position(base);
  }

  /** Apply the snap mode, then pull the prop flush against nearby walls or shore. */
  private position(p: PlacedProp): PlacedProp {
    if (this.snap === 'tile') {
      p.x = Math.floor(p.x / TILE) * TILE + TILE / 2;
      p.y = Math.floor(p.y / TILE) * TILE + TILE - 2;
      return p;
    }
    p.x = Math.round(p.x / this.snap) * this.snap;
    p.y = Math.round(p.y / this.snap) * this.snap;
    if (!p.flat) this.magnet(p);
    return p;
  }

  /** The prop's collider in world space, or null if it has none. */
  private solidOf(p: PlacedProp): Rect | null {
    const { assets, content } = this.game;
    const at = placeProp(p, propFrames(p, assets, content)[0], assets);
    return at.solid ? { x: at.x + at.solid.x, y: at.y + at.solid.y, w: at.solid.w, h: at.solid.h } : null;
  }

  /**
   * Walls and water pull a prop's footprint flush against them when it comes within MAGNET px, and push it
   * back out if it's dragged into them, so furniture sits snug against a back or side wall.
   */
  private magnet(p: PlacedProp): void {
    const g = this.game.scene.ground;
    const c = this.solidOf(p);
    if (!c) return;
    const blocked = (dx: number, dy: number) => g.blocks({ x: c.x + dx, y: c.y + dy, w: c.w, h: c.h });
    if (blocked(0, 0)) {
      // pushed into something: find the nearest free spot within reach (down first: back walls are above)
      for (let k = 1; k <= MAGNET * 2; k++) {
        for (const [dx, dy] of [[0, k], [k, 0], [-k, 0], [0, -k]]) {
          if (!blocked(dx, dy)) {
            p.x += dx;
            p.y += dy;
            return;
          }
        }
      }
      return;
    }
    // free: slide toward the closest wall within reach, stopping flush
    let best: [number, number] | null = null;
    for (let k = 1; k <= MAGNET && !best; k++) {
      for (const [dx, dy] of [[0, -k], [-k, 0], [k, 0], [0, k]]) {
        if (blocked(dx, dy)) {
          best = [dx - Math.sign(dx), dy - Math.sign(dy)];
          break;
        }
      }
    }
    if (best) {
      p.x += best[0];
      p.y += best[1];
    }
  }

  private primary(): void {
    if (this.held) {
      this.layout.props.splice(this.held.from, 0, this.ghost());
      this.held = null;
      this.changed('Moved');
      return;
    }
    const hit = this.propAtCursor();
    if (hit >= 0) {
      const [p] = this.layout.props.splice(hit, 1);
      this.held = { prop: p, from: hit, grab: { x: p.x - this.cursor.x, y: p.y - this.cursor.y } };
      this.changed();
      return;
    }
    this.layout.props.push(this.ghost());
    this.changed('Placed');
  }

  private remove(): void {
    if (this.held) {
      this.held = null; // already out of the layout
      this.changed('Deleted');
      return;
    }
    const hit = this.propAtCursor();
    if (hit < 0) return;
    this.layout.props.splice(hit, 1);
    this.changed('Deleted');
  }

  private cancelHeld(): void {
    if (!this.held) return;
    this.layout.props.splice(this.held.from, 0, this.held.prop);
    this.held = null;
    this.changed();
  }

  /** Where a prop's art is drawn, in world pixels. */
  private artRect(p: PlacedProp): Rect {
    const { assets, content } = this.game;
    const frame = propFrames(p, assets, content)[0];
    const at = placeProp(p, frame, assets);
    const b = assets.bounds(frame);
    return { x: at.x + b.x, y: at.y + b.y, w: b.w, h: b.h };
  }

  /** The front-most prop whose art covers the cursor. */
  private propAtCursor(): number {
    const { x, y } = this.cursor;
    const scene = this.game.scene;
    let best = -1;
    let bestY = -Infinity;
    this.layout.props.forEach((p, i) => {
      const r = this.artRect(p);
      if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return;
      const sy = scene.props[i]?.sortY ?? r.y + r.h;
      if (sy >= bestY) {
        bestY = sy;
        best = i;
      }
    });
    return best;
  }

  // ------------------------------------------------------------------ ground

  private paint(): void {
    const tx = this.tileX;
    const ty = this.tileY;
    const key = `${tx},${ty}`;
    if (key === this.lastPainted) return;
    this.lastPainted = key;
    const g = this.layout.ground;
    const ch = GROUND_CHARS[g.type][this.brush].ch;
    const row = g.rows[ty];
    if (row[tx] === ch) return;
    g.rows[ty] = row.slice(0, tx) + ch + row.slice(tx + 1);
    this.changed();
  }

  // ------------------------------------------------------------------ change, check, save

  private changed(message?: string): void {
    this.game.rebuildScene();
    this.unsaved.add(this.layout.id);
    this.checkIn = 0.25;
    if (message) this.say(message);
  }

  private check(): void {
    const names = this.layout.props.map((p) => label(p));
    this.issues = validate(this.game.scene, names);
    this.checkIn = -1;
  }

  private async save(): Promise<void> {
    if (this.held) this.cancelHeld();
    const l = this.layout;
    const text = formatLayout(l);
    if (import.meta.env.DEV) {
      try {
        const res = await fetch(`/__maps/${encodeURIComponent(l.id)}`, { method: 'POST', body: text });
        if (!res.ok) throw new Error(await res.text());
        this.unsaved.delete(l.id);
        this.say(`Saved maps/${l.id}.json`);
      } catch (err) {
        this.say(`Save failed: ${(err as Error).message}`);
      }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = `${l.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.unsaved.delete(l.id);
    this.say(`Downloaded ${l.id}.json`);
  }

  private say(text: string): void {
    this.status = { text, until: this.time + 2.5 };
  }

  // ------------------------------------------------------------------ mouse

  private listenMouse(canvas: HTMLCanvasElement): void {
    const toView = (e: MouseEvent) => {
      const b = canvas.getBoundingClientRect();
      return { x: ((e.clientX - b.left) / b.width) * VIEW_W, y: ((e.clientY - b.top) / b.height) * VIEW_H };
    };
    const follow = (m: { x: number; y: number }) => {
      if (this.overUi(m)) return;
      this.setCursor(this.cam.x + m.x / this.zoom, this.cam.y + m.y / this.zoom);
    };
    canvas.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      const m = toView(e);
      if (this.pan) {
        this.view.x -= (m.x - this.pan.x) / this.zoom;
        this.view.y -= (m.y - this.pan.y) / this.zoom;
        this.pan = m;
      }
      this.mouse = m;
      this.following = false;
      follow(this.mouse);
      if (this.tool === 'ground' && e.buttons & 1 && !this.overUi(this.mouse)) this.paint();
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouse = null;
      this.pan = null;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) this.pan = null;
    });
    canvas.addEventListener('contextmenu', (e) => this.active && e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      if (!this.active) return;
      this.mouse = toView(e);
      const slot = this.paletteSlot(this.mouse);
      if (slot !== null) {
        if (slot >= 0) this.pick(slot);
        return;
      }
      if (e.button === 1) {
        e.preventDefault();
        this.pan = this.mouse;
        return;
      }
      if (this.overUi(this.mouse)) return;
      this.following = false;
      follow(this.mouse);
      if (e.button === 2) {
        if (this.tool === 'props') this.remove();
      } else if (e.button === 0) {
        if (this.tool === 'ground') {
          this.lastPainted = '';
          this.paint();
        } else this.primary();
      }
    });
    canvas.addEventListener('wheel', (e) => {
      if (!this.active) return;
      e.preventDefault();
      const d = Math.sign(e.deltaY);
      if (e.ctrlKey || e.altKey) {
        const i = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(this.zoom) + d));
        this.setZoom(ZOOMS[i]);
      } else if (e.shiftKey) this.stepCategory(d);
      else this.stepItem(d);
    }, { passive: false });
  }

  private overUi(m: { x: number; y: number }): boolean {
    return m.y >= VIEW_H - PANEL_H || m.y < HUD_H;
  }

  /** Palette slot under a screen point: its index, -1 for the panel's empty space, null if not over the panel. */
  private paletteSlot(m: { x: number; y: number }): number | null {
    if (m.y < VIEW_H - PANEL_H) return null;
    const s = this.slots.find((s) => m.x >= s.x && m.x < s.x + SLOT && m.y >= s.y && m.y < s.y + SLOT);
    return s ? s.index : -1;
  }

  private pick(index: number): void {
    if (this.tool === 'ground') this.brush = index;
    else if (!this.held) this.itemIndex[this.cat] = index;
  }

  // ------------------------------------------------------------------ drawing (world, at the editor's zoom)

  drawWorld(cx: number, cy: number): void {
    this.cam = { x: cx, y: cy };
    const r = this.game.renderer;
    const scene = this.game.scene;
    const ctx = r.ctx;
    const px = 1 / r.unit;

    // grid
    ctx.globalAlpha = this.zoom < 1 ? 0.08 : 0.12;
    const g = scene.ground;
    for (let x = 0; x <= g.pixelW; x += TILE) r.rect(x - cx, -cy, px, g.pixelH, '#ffffff', true);
    for (let y = 0; y <= g.pixelH; y += TILE) r.rect(-cx, y - cy, g.pixelW, px, '#ffffff', true);
    ctx.globalAlpha = 1;

    for (const p of scene.props) {
      const c = p.collider();
      if (c) r.rect(c.x - cx, c.y - cy, c.w, c.h, '#d95763');
    }
    ctx.globalAlpha = 0.35;
    for (const ex of scene.exits) r.rect(ex.area.x - cx, ex.area.y - cy, ex.area.w, ex.area.h, '#fbf236', true);
    ctx.globalAlpha = 1;
    for (const s of Object.values(scene.spawns)) r.rect(s.x + 10 - cx, s.y + 22 - cy, 12, 6, '#6abe30');

    ctx.globalAlpha = 0.4 + 0.15 * Math.sin(this.time * 6);
    for (const i of this.issues) for (const q of i.rects) r.rect(q.x - cx, q.y - cy, Math.max(2, q.w), Math.max(2, q.h), '#ff3030', true);
    ctx.globalAlpha = 1;

    if (this.tool === 'ground') {
      r.rect(this.tileX * TILE - cx, this.tileY * TILE - cy, TILE, TILE, '#ffffff');
      return;
    }
    const hit = this.held ? -1 : this.propAtCursor();
    if (hit >= 0) {
      const a = this.artRect(this.layout.props[hit]);
      r.rect(a.x - cx - 1, a.y - cy - 1, a.w + 2, a.h + 2, '#5fcde4');
    } else {
      const { assets, content } = this.game;
      const gp = this.ghost();
      const frames = propFrames(gp, assets, content);
      const at = placeProp(gp, frames[0], assets);
      r.sprite(frames[Math.floor(this.time * 4) % frames.length], at.x - cx, at.y - cy, 0.7);
      const c = this.solidOf(gp);
      if (c) {
        const bad = scene.ground.blocks(c) || scene.props.some((p) => {
          const pc = p.collider();
          return pc ? overlaps(pc, c) : false;
        });
        r.rect(c.x - cx, c.y - cy, c.w, c.h, bad ? '#ff3030' : '#6abe30');
      }
    }
    // crosshair at the cursor
    r.rect(this.cursor.x - cx - 3, this.cursor.y - cy, 7, px, '#ffffff', true);
    r.rect(this.cursor.x - cx, this.cursor.y - cy - 3, px, 7, '#ffffff', true);
  }

  // ------------------------------------------------------------------ drawing (UI, at zoom 1)

  drawUi(cx: number, cy: number): void {
    const r = this.game.renderer;
    const assets = this.game.assets;
    const scene = this.game.scene;
    const z = this.zoom;
    const toScreen = (x: number, y: number) => ({ x: (x - cx) * z, y: (y - cy) * z });

    if (z === 1) {
      for (const ex of scene.exits) {
        const s = toScreen(ex.area.x, ex.area.y);
        drawText(r, assets, `>${ex.to}`, s.x, s.y - 10);
      }
      for (const [name, sp] of Object.entries(scene.spawns)) {
        const s = toScreen(sp.x, sp.y + 30);
        drawText(r, assets, name, s.x, s.y);
      }
      if (this.tool === 'props' && !this.held) {
        const hit = this.propAtCursor();
        if (hit >= 0) {
          const a = this.artRect(this.layout.props[hit]);
          const s = toScreen(a.x, a.y + a.h + 2);
          drawText(r, assets, label(this.layout.props[hit]), s.x, s.y);
        }
      }
    }
    this.drawHud();
    this.drawPalette();
  }

  private drawHud(): void {
    const r = this.game.renderer;
    const assets = this.game.assets;
    const l = this.layout;
    const mode = this.tool === 'props' ? `Props  snap ${snapName(this.snap)}` : 'Ground';
    const zoom = this.zoom === 1 ? '' : `  1/${1 / this.zoom}`;
    const top = `EDIT ${l.id}${this.unsaved.has(l.id) ? '*' : ''}  ${mode}${zoom}  ${Math.round(this.cursor.x)},${Math.round(this.cursor.y)}`;
    r.nine('panel_dark', 2, 2, measure(top) + 12, 19);
    drawText(r, assets, top, 8, 7);

    const issueText = this.issues.length === 0 ? 'No problems' : `${this.issues.length} problem${this.issues.length > 1 ? 's' : ''}: ${this.issues[0].text}`;
    const msg = this.time < this.status.until ? this.status.text : issueText;
    const room = Math.floor((VIEW_W - measure(top) - 34) / 6);
    const clipped = msg.length > room ? msg.slice(0, room - 1) + '.' : msg;
    const w = measure(clipped) + 12;
    r.nine('panel_dark', VIEW_W - w - 2, 2, w, 19);
    drawText(r, assets, clipped, VIEW_W - w + 4, 7);
  }

  private drawPalette(): void {
    const r = this.game.renderer;
    const assets = this.game.assets;
    const input = this.game.input;
    const y0 = VIEW_H - PANEL_H;
    r.nine('panel_dark', 0, y0, VIEW_W, PANEL_H);

    let hx = 5;
    for (const [actions, text] of HINTS) {
      for (const a of actions) {
        const g = assets.frame(input.glyph(a));
        r.sprite(g, hx, y0 + 5);
        hx += g.w;
      }
      drawText(r, assets, text, hx + 1, y0 + 9);
      hx += measure(text) + 3;
    }

    let title: string;
    let entries: Array<{ draw: (x: number, y: number) => void; name: string }>;
    let selected: number;
    if (this.tool === 'ground') {
      const chars = GROUND_CHARS[this.layout.ground.type];
      title = 'Ground';
      selected = this.brush;
      entries = chars.map((c) => ({
        name: c.name,
        draw: (x, y) => (c.sample ? r.sprite(c.sample, x, y) : r.rect(x, y, 32, 32, '#120e18', true)),
      }));
    } else if (this.held) {
      const held = this.held.prop;
      title = 'Moving';
      selected = 0;
      entries = [{ name: label(held), draw: (x, y) => this.thumb(held, x, y) }];
    } else {
      const cat = this.palette[this.cat];
      title = cat.name;
      selected = this.itemIndex[this.cat];
      entries = cat.items.map((it) => ({ name: it.name, draw: (x, y) => this.thumb(it.prop, x, y) }));
    }
    const rowY = y0 + 25;
    drawText(r, assets, title, 6, rowY + 4);
    const visible = Math.floor((VIEW_W - 70) / (SLOT + 2));
    const first = Math.max(0, Math.min(entries.length - visible, selected - Math.floor(visible / 2)));
    this.slots.length = 0;
    const ctx = r.ctx;
    for (let i = first; i < Math.min(entries.length, first + visible); i++) {
      const x = 64 + (i - first) * (SLOT + 2);
      this.slots.push({ x, y: rowY, index: i });
      r.rect(x, rowY, SLOT, SLOT, '#2a2235', true);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, rowY, SLOT, SLOT);
      ctx.clip();
      entries[i].draw(x, rowY);
      ctx.restore();
      if (i === selected) r.rect(x - 1, rowY - 1, SLOT + 2, SLOT + 2, '#fbf236');
    }
    const sel = entries[selected];
    if (sel) drawText(r, assets, `${sel.name}  (${selected + 1}/${entries.length})`, 6, rowY + SLOT + 4);
  }

  /** A prop's art fitted into a palette slot (big art drawn at half size). */
  private thumb(p: PlacedProp, x: number, y: number): void {
    const { assets, content } = this.game;
    const name = propFrames(p, assets, content)[0];
    const f = assets.frame(name);
    const b = assets.bounds(name);
    const k = Math.max(b.w, b.h) > SLOT ? 0.5 : 1;
    const w = b.w * k;
    const h = b.h * k;
    this.game.renderer.ctx.drawImage(f.img, f.x + b.x, f.y + b.y, b.w, b.h, x + Math.round((SLOT - w) / 2), y + Math.round((SLOT - h) / 2), w, h);
  }
}

function snapName(s: Snap): string {
  return s === 1 ? 'free' : s === 'tile' ? 'tile' : `${s}px`;
}

/** Short name for a prop: its behavior target, or its sprite. */
function label(p: PlacedProp): string {
  const b = p.behavior;
  if (b?.type === 'shop' || b?.type === 'market') return b.shop;
  if (b?.type === 'forage') return b.node;
  if (b?.type === 'talk') return b.who;
  const s = Array.isArray(p.sprite) ? p.sprite[0] : p.sprite ?? '?';
  return s.replace(/^anim:/, '');
}
