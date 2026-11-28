/**
 * Layout editor (F2, or click the left stick). Edits the map you're standing in, live: every change
 * rebuilds the scene through the same code the game uses, and is checked for overlaps and for places
 * the player can no longer walk to.
 *
 * The palette works like the bag: tabs along the top (Floors and, indoors, Walls for painting, then one
 * per group of pieces), and a grid of slots below; the Snap setting sits in the bottom bar.
 *
 * Mouse and keyboard: left click places (or picks up the piece under the pointer to move it), right
 * click deletes, the wheel picks a slot (Shift+wheel a tab), Ctrl+wheel zooms, holding R the wheel turns
 * the piece in hand or under the pointer (Shift for finer steps), Ctrl+Z / Ctrl+Y undo and redo, WASD or the
 * arrows pan, middle-drag pans, Tab shows/hides the palette, Esc opens the menu (save, undo, snap, new
 * map, open, rename, Door to, Copy for chat: this map's file to the clipboard), F2 leaves the editor.
 * Controller: the left stick moves the cursor like a mouse, the D-pad nudges it a pixel at a time,
 * A places, X deletes, the right stick turns, LB/RB pick a slot, LT/RT a tab, Y shows/hides the palette,
 * View undoes, right stick click zooms, Menu opens the menu (redo and snap are there), B cancels a move.
 *
 * Pieces are layered: floor pieces (rugs, stairs) under everything, wall pieces (pictures, windows,
 * shelves, doors) on the wall faces, standing pieces in the room. Placing stairs or a door makes the room
 * it leads to.
 * Picking up, deleting and turning act on the layer of the piece in hand (shown in the top bar).
 *
 * Props are placed freely; snap rounds where they land (free / 8px / 16px / tile). Except on tile snap, a
 * piece brought near a wall or the water's edge pulls in flush against it. Painting floor indoors wraps
 * walls around it automatically (in the last wall material chosen).
 * Save writes every changed map to src/maps/<id>.json when running the dev server, and downloads the
 * files anywhere else.
 */
import { Nudge } from '../core/nudge';
import type { Action } from '../core/input';
import { overlaps, type Rect } from '../core/geom';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Game } from '../game/game';
import { artRect, layoutSpawns, passageSpawn, placeProp, propFrames } from '../game/build';
import { drawText, measure } from '../ui/text';
import { isHearth } from '../game/seating';
import { isInn } from '../state/kitchen';
import { formatLayout, GROUND_CHARS, type Layout, type PlacedProp } from '../world/layout';
import { CELL } from '../world/field';
import { TileMap, TILE } from '../world/tilemap';
import { unwrapWalls, wallNear, wrapWalls } from '../world/room';
import { drawSlot } from '../ui/items';
import { Nav } from '../ui/screen';
import { Menu, type MenuPage } from './menu';
import { buildPalette, type Category } from './palette';
import { interiorTemplate, outdoorTemplate, SIZES, UNLINKED } from './templates';
import { validate, type Issue } from './validate';
import { History } from './history';
import { growRoom, trimRoom, type Shift } from './roomfit';
import { canTurnFreely, normalise, turn } from '../world/turn';
import { blankRoom, ensureWayBack, isPassage, passageKind, roomNameFor, size } from './passages';

type Tool = 'props' | 'ground';
type Snap = 1 | 8 | 16 | 'tile';
/** A prop picked up to move: where it was in the list, and where the cursor held it from. */
interface Held { prop: PlacedProp; from: number; grab: { x: number; y: number } }

const SNAPS: Snap[] = [1, 8, 16, 'tile'];
const ZOOMS = [1, 0.5, 0.25];
const MAGNET = 8; // px within which a prop pulls flush against a wall or shore
const STICK_SPEED = 300; // screen px per second at full tilt (like a mouse pointer, so the same at any zoom)
const DPAD_GLIDE = 110; // screen px per second once a held D-pad direction starts gliding
const EDGE = 24; // screen px: keys or stick pushing the cursor this close to an edge scroll the view
const SLOT = 34;
const WHEEL_NOTCH = 100; // wheel delta (px) per palette step: one notch of a mouse wheel
/** Structure cells that are walls (what erasing in the Walls tab turns back into floor). */
const WALL_CHARS = new Set(['W', 'S', 'I', 'J']);
/** How far (px) past an interior's walls the cursor and view reach, so a room can be built out in any direction. */
const ROOM_REACH = 6 * 32;
const PAN_SPEED = 260; // screen px per second when panning with WASD / arrows
const TURN_STEP = 15; // degrees per wheel notch (R held) or right-stick step
const TURN_FINE = 5; // degrees per notch with Shift too
const TURN_REPEAT = 0.18; // seconds between turning steps while the right stick is held over
/** The strip along the bottom: the piece in hand, snap, and control hints. */
const BAR_H = 46;
/** The piece picker window: slots per row and rows visible. */
const PICK_ROWS = 4;
const HUD_H = 22;
const TAB_H = 16;
/** Hints per device: glyph frames (or actions, resolved to the pad's glyphs) and what they do. */
const MOUSE_HINTS: Array<[string[], string]> = [
  [['key_tab'], 'Pieces'], [['mouse_left'], 'Place'], [['mouse_right'], 'Delete'], [['key_r', 'mouse_scroll'], 'Turn'],
  [['key_ctrl', 'key_z'], 'Undo'], [['key_esc'], 'Menu'], [['mouse_scroll'], 'Pick'], [['key_ctrl', 'mouse_scroll'], 'Zoom'],
  [['key_w', 'key_a', 'key_s', 'key_d'], 'Pan'],
];
/** Actions (shown with the pad's glyph for them), or a glyph frame for a control that isn't an action. */
const PAD_HINTS: Array<[Array<Action | 'xb_rs_move'>, string]> = [
  [['recipes'], 'Pieces'], [['interact'], 'Place'], [['cook'], 'Delete'], [['xb_rs_move'], 'Turn'], [['map'], 'Undo'],
  [['menu'], 'Menu'], [['tab_prev', 'tab_next'], 'Pick'], [['zoom'], 'Zoom'],
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
  /** Ground tabs (Floors, Walls): which one is open and the slot chosen in each. */
  private gtab = 0;
  private readonly gpos = [0, 0];
  /** Material that painting floor wraps walls in (the last wall brush used). */
  private wallMat = 'W';
  /** The piece picker window is open (Tab / Y). */
  private picking = false;
  /** Picker: first visible row, the slot under the pointer, and stepping for pad/keys. */
  private pickScroll = 0;
  private pickHover = -1;
  private readonly pickNav = new Nav();
  private readonly tabs: Array<{ x: number; y: number; w: number; index: number }> = [];
  private snapButton = { x: 0, w: 0 };
  private held: Held | null = null;
  private checkIn = -1;
  private readonly unsaved = new Set<string>();
  /** Maps renamed since the last save: their old files are removed when saving. */
  private readonly renamedFrom = new Set<string>();
  readonly menu = new Menu();
  private wheel = 0;
  private status = { text: '', until: 0 };
  private time = 0;
  private readonly nudger = new Nudge(); // D-pad nudging (same feel as nudging a carried piece)
  private lastPainted = '';
  /** The current paint stroke has been recorded for undo. */
  private strokeRecorded = false;
  /** Mouse position in logical screen pixels while the mouse is driving the cursor. */
  private mouse: { x: number; y: number } | null = null;
  cam = { x: 0, y: 0 };
  /** Where the camera is aimed. */
  view = { x: 0, y: 0 };
  private pan: { x: number; y: number } | null = null;
  private readonly history: History;
  /** How far each palette piece will be turned when placed (degrees), by "tab:slot". */
  private readonly turns = new Map<string, number>();
  /** R is held: the wheel turns instead of picking. */
  private rHeld = false;
  private turnNext = 0; // time until a held right stick turns again

  constructor(private readonly game: Game) {
    this.palette = buildPalette(game.assets, game.content);
    this.itemIndex = this.palette.map(() => 0);
    this.history = new History(game.layouts, this.unsaved);
    this.listenMouse(game.renderer.ctx.canvas);
    this.listenKeys();
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
    this.applyInset();
    this.check();
  }

  private get panelH(): number {
    return BAR_H;
  }

  private applyInset(): void {
    this.game.camera.setInset(HUD_H, this.panelH);
    this.clampView();
  }

  private togglePicker(): void {
    if (this.held) return; // finish or cancel the move first
    this.picking = !this.picking;
    this.pickHover = -1;
    this.pickScroll = Math.max(0, Math.floor(this.selected() / this.pickCols) - 1);
  }

  /** Ground brushes split into tabs: Floors (fine 16px paint) and, indoors, Walls (32px structure). */
  private get groundTabs(): Array<{ name: string; idx: number[] }> {
    const all = GROUND_CHARS[this.layout.ground.type];
    const pick = (fine: boolean) => all.flatMap((b, i) => (b.fine === fine ? [i] : []));
    const tabs = [{ name: 'Floors', idx: pick(true) }];
    const walls = pick(false);
    if (walls.length) tabs.push({ name: 'Walls', idx: walls });
    return tabs;
  }

  /** Which ground tab is open (clamped: an outdoor map has no Walls tab). */
  private get groundTabIndex(): number {
    return Math.min(this.gtab, this.groundTabs.length - 1);
  }

  private get groundTab(): { name: string; idx: number[] } {
    return this.groundTabs[this.groundTabIndex];
  }

  /** Index into GROUND_CHARS of the brush in hand. */
  private get brush(): number {
    const t = this.groundTab;
    return t.idx[Math.min(this.gpos[this.groundTabIndex], t.idx.length - 1)];
  }

  /** Index of the selected slot in the current tab. */
  private selected(): number {
    if (this.tool !== 'ground') return this.itemIndex[this.cat];
    return this.groundTab.idx.indexOf(this.brush);
  }

  /** Entries of the current tab: thumbnails and names (pieces, or ground brushes). */
  private entries(): Array<{ draw: (x: number, y: number) => void; name: string }> {
    const r = this.game.renderer;
    if (this.tool === 'ground') {
      const all = GROUND_CHARS[this.layout.ground.type];
      return this.groundTab.idx.map((i) => all[i]).map((c) => ({
        name: c.name,
        draw: (x, y) => (c.sample ? r.sprite(c.sample, x + 1, y + 1) : r.rect(x + 1, y + 1, 32, 32, '#120e18', true)),
      }));
    }
    return this.palette[this.cat].items.map((it) => ({ name: it.name, draw: (x, y) => this.thumb(it.prop, x, y) }));
  }

  private get pickCols(): number {
    return Math.max(4, Math.min(12, Math.floor((VIEW_W - 60) / (SLOT + 2))));
  }

  /** The picker window's box. */
  private get pickBox(): { x: number; y: number; w: number; h: number } {
    const w = this.pickCols * (SLOT + 2) + 22;
    const h = 30 + TAB_H + 6 + PICK_ROWS * (SLOT + 2) + 22;
    return { x: Math.round((VIEW_W - w) / 2), y: Math.max(HUD_H + 4, Math.round((VIEW_H - BAR_H - h) / 2)), w, h };
  }

  private pickSlotAt(i: number): { x: number; y: number } {
    const b = this.pickBox;
    const row = Math.floor(i / this.pickCols) - this.pickScroll;
    return { x: b.x + 11 + (i % this.pickCols) * (SLOT + 2), y: b.y + 30 + TAB_H + 6 + row * (SLOT + 2) };
  }

  private pickSet(i: number): void {
    if (this.tool === 'ground') this.gpos[this.groundTabIndex] = i;
    else this.itemIndex[this.cat] = i;
    const row = Math.floor(i / this.pickCols);
    if (row < this.pickScroll) this.pickScroll = row;
    if (row >= this.pickScroll + PICK_ROWS) this.pickScroll = row - PICK_ROWS + 1;
  }

  /** Picker input: move through slots, change tabs, choose (closes), back out. */
  private updatePicker(dt: number): void {
    const input = this.game.input;
    if (input.pressed('back') || input.pressed('recipes') || (input.device !== 'gamepad' && input.pressed('menu'))) {
      this.picking = false;
      return;
    }
    if (input.pressed('cat_prev') || input.pressed('tab_prev')) this.stepTab(-1);
    if (input.pressed('cat_next') || input.pressed('tab_next')) this.stepTab(1);
    const d = this.pickNav.step(input, dt);
    if (d) {
      const n = this.entries().length;
      const i = this.selected();
      const cols = this.pickCols;
      let j = i;
      if (d.x) j = Math.max(0, Math.min(n - 1, i + d.x));
      if (d.y) j = i + d.y * cols >= 0 && i + d.y * cols < n ? i + d.y * cols : i;
      this.pickSet(j);
    }
    if (input.pressed('interact')) this.picking = false;
  }

  private close(): void {
    this.menu.close();
    this.cancelHeld();
    this.active = false;
    this.zoom = 1;
    this.game.camera.setZoom(1);
    this.game.camera.setInset(0, 0);
    const g = this.game.scene.ground;
    this.game.camera.setWorld(g.pixelW, g.pixelH);
  }

  /** The area the editor works in: the map, and for an interior room to build past its walls. */
  get canvas(): { x0: number; y0: number; x1: number; y1: number } {
    const g = this.game.scene.ground;
    const r = this.layout.ground.type === 'room' ? ROOM_REACH : 0;
    return { x0: -r, y0: -r, x1: g.pixelW + r, y1: g.pixelH + r };
  }

  /**
   * World point the camera is aimed at while editing. The cursor moves like a mouse pointer: the view
   * scrolls only when keys or the stick push the cursor against an edge; drag with the middle button to pan.
   */
  focus(): { x: number; y: number } {
    return this.view;
  }

  private setZoom(z: number): void {
    this.zoom = z;
    this.clampView();
    this.moveBy(0, 0);
  }

  // ------------------------------------------------------------------ update

  update(dt: number): void {
    this.time += dt;
    const input = this.game.input;
    if (this.menu.open) {
      this.menu.update(input);
      return;
    }
    if (this.picking) {
      this.updatePicker(dt);
      return;
    }
    const pad = input.device === 'gamepad';
    this.moveCursor(dt);

    // keyboard: only Tab (palette) and Esc (menu) - everything else is the mouse
    if (pad) {
      if (input.pressed('recipes')) this.togglePicker();
      this.padTurn(input.rightStick().x, dt);
      if (input.pressed('tab_prev')) this.stepItem(-1);
      if (input.pressed('tab_next')) this.stepItem(1);
      if (input.pressed('cat_prev')) this.stepTab(-1);
      if (input.pressed('cat_next')) this.stepTab(1);
      if (input.pressed('map')) this.undo();
      if (input.pressed('zoom')) this.setZoom(ZOOMS[(ZOOMS.indexOf(this.zoom) + 1) % ZOOMS.length]);
    } else if (input.pressed('menu')) {
      this.togglePicker();
    }
    if ((pad && input.pressed('menu')) || (!pad && input.pressed('back') && !this.held)) {
      this.cancelHeld();
      this.menu.show(this.mainMenu());
      return;
    }
    if (input.pressed('back') && this.held) this.cancelHeld();

    if (pad) {
      if (this.tool === 'ground') {
        if (input.pressed('interact') || input.pressed('cook')) this.startStroke();
        if (input.down('interact')) this.paint();
        else if (input.down('cook')) this.paint(true);
      } else {
        if (input.pressed('interact')) this.primary();
        if (input.pressed('cook')) this.remove();
      }
    }

    if (this.checkIn > 0 && (this.checkIn -= dt) <= 0) this.check();
  }

  /**
   * Left stick: the cursor glides freely, speed by how far it's pushed. D-pad / arrow keys: a tap nudges
   * one pixel (one tile with the ground tool); holding repeats, then glides. Snapping applies only to
   * where a prop lands, never to how the cursor moves.
   */
  private moveCursor(dt: number): void {
    const input = this.game.input;
    const a = input.analog();
    if (a.x || a.y) {
      // a pointer: velocity straight from the stick, eased so small tilts are precise; nothing snaps or steps
      const mag = Math.hypot(a.x, a.y);
      const v = (STICK_SPEED * mag) / this.zoom; // a.x / mag * mag^2
      this.mouse = null;
      this.moveBy(a.x * v * dt, a.y * v * dt);
      return;
    }
    const { x: dx, y: dy } = input.digital();
    if (input.device !== 'gamepad') {
      // keyboard: WASD / arrows pan the view; the cursor stays under the mouse
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        this.view.x += (dx / len) * (PAN_SPEED / this.zoom) * dt;
        this.view.y += (dy / len) * (PAN_SPEED / this.zoom) * dt;
        this.clampView();
        if (this.mouse) this.setCursor(this.cam.x + this.mouse.x / this.zoom, this.cam.y + this.mouse.y / this.zoom);
      }
      return;
    }
    const d = this.nudger.update({ x: dx, y: dy }, dt, this.tool === 'ground' ? TILE : 1, this.tool === 'ground' ? 0 : DPAD_GLIDE / this.zoom);
    if (d.x || d.y) {
      this.mouse = null;
      this.moveBy(d.x, d.y);
    }
  }

  private setCursor(x: number, y: number): void {
    const c = this.canvas;
    this.cursor.x = Math.max(c.x0, Math.min(c.x1 - 1, x));
    this.cursor.y = Math.max(c.y0, Math.min(c.y1 - 1, y));
  }

  /** Move the cursor like a pointer; the view only scrolls when the cursor pushes against its edge. */
  private moveBy(dx: number, dy: number): void {
    this.setCursor(this.cursor.x + dx, this.cursor.y + dy);
    const z = this.zoom;
    const hw = VIEW_W / z / 2 - EDGE / z;
    const hh = (VIEW_H - HUD_H - this.panelH) / z / 2 - EDGE / z;
    this.view.x = Math.max(this.cursor.x - hw, Math.min(this.cursor.x + hw, this.view.x));
    this.view.y = Math.max(this.cursor.y - hh, Math.min(this.cursor.y + hh, this.view.y));
    this.clampView();
  }

  /** Keep the aim point where the camera can actually go, so reversing direction scrolls back at once. */
  private clampView(): void {
    const c = this.canvas;
    const z = this.zoom;
    const hw = VIEW_W / z / 2;
    const hh = (VIEW_H - HUD_H - this.panelH) / z / 2;
    const w = c.x1 - c.x0;
    const h = c.y1 - c.y0;
    this.view.x = w <= hw * 2 ? c.x0 + w / 2 : Math.max(c.x0 + hw, Math.min(c.x1 - hw, this.view.x));
    this.view.y = h <= hh * 2 ? c.y0 + h / 2 : Math.max(c.y0 + hh, Math.min(c.y1 - hh, this.view.y));
  }

  private centreOnTile(): void {
    this.cursor.x = Math.floor(this.cursor.x / TILE) * TILE + TILE / 2;
    this.cursor.y = Math.floor(this.cursor.y / TILE) * TILE + TILE / 2;
  }

  /** Tabs: Floors and Walls first, then one per palette group. */
  private get tabNames(): string[] {
    return [...this.groundTabs.map((t) => t.name), ...this.palette.map((c) => c.name)];
  }

  private get tabCount(): number {
    return this.groundTabs.length + this.palette.length;
  }

  private get tab(): number {
    return this.tool === 'ground' ? this.groundTabIndex : this.groundTabs.length + this.cat;
  }

  private selectTab(t: number): void {
    if (this.held) return; // moving a prop: finish or cancel first
    const g = this.groundTabs.length;
    if (t < g) {
      if (this.tool !== 'ground') this.centreOnTile();
      this.tool = 'ground';
      this.gtab = t;
    } else {
      this.tool = 'props';
      this.cat = t - g;
    }
  }

  private stepTab(d: number): void {
    this.selectTab((this.tab + d + this.tabCount) % this.tabCount);
  }

  private stepItem(d: number): void {
    if (this.tool === 'ground') {
      const n = this.groundTab.idx.length;
      this.pickSet((this.selected() + d + n) % n);
      return;
    }
    if (this.held) return; // moving a prop: the palette is not in play
    const n = this.palette[this.cat].items.length;
    this.itemIndex[this.cat] = (this.itemIndex[this.cat] + d + n) % n;
  }

  private cycleSnap(): void {
    this.snap = SNAPS[(SNAPS.indexOf(this.snap) + 1) % SNAPS.length];
    this.say(`Snap: ${snapName(this.snap)}`);
  }

  // ------------------------------------------------------------------ props

  /** What would be placed right now (held prop or palette item), positioned at the cursor with snapping and magnets. */
  private ghost(): PlacedProp {
    const base = this.held
      ? { ...this.held.prop, x: this.cursor.x + this.held.grab.x, y: this.cursor.y + this.held.grab.y }
      : this.stamp();
    return this.position(base);
  }

  /** The palette item centred on the cursor (so the same spot picks it up or deletes it again). */
  private stamp(): PlacedProp {
    const p = structuredClone(this.palette[this.cat].items[this.itemIndex[this.cat]].prop);
    const b = this.game.assets.bounds(propFrames(p, this.game.assets, this.game.content)[0]);
    const out: PlacedProp = { ...p, x: this.cursor.x, y: this.cursor.y + Math.round(b.h / 2) };
    const deg = this.turns.get(this.slotKey) ?? 0;
    if (canTurnFreely(out) && deg) out.rot = deg;
    return out;
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
    if (!p.layer) this.magnet(p); // floor and wall pieces go exactly where they're put...
    else if (p.layer === 'wall' && isPassage(p)) p.y = Math.ceil(p.y / TILE) * TILE; // ...but a door stands on the floor
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
      // pushed into something: back out to the nearest free spot, down or sideways first (walls are
      // above what stands against them) and as far as a whole wall cell, so pushing deep into a wall
      // keeps the piece flush in front of it instead of hopping over to the far side
      for (let k = 1; k <= TILE; k++) {
        for (const [dx, dy] of [[0, k], [k, 0], [-k, 0]]) {
          if (!blocked(dx, dy)) {
            p.x += dx;
            p.y += dy;
            return;
          }
        }
        if (k <= MAGNET && !blocked(0, -k)) {
          p.y -= k;
          return;
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
    this.history.record(); // picking up starts a move: undo puts it back where it was
    if (hit >= 0) {
      const [p] = this.layout.props.splice(hit, 1);
      this.held = { prop: p, from: hit, grab: { x: p.x - this.cursor.x, y: p.y - this.cursor.y } };
      this.changed();
      return;
    }
    const p = this.ghost();
    if (p.behavior?.type === 'storage' && !p.behavior.id) p.behavior = { ...p.behavior, id: this.newStorageId(p) };
    this.layout.props.push(p);
    if (isPassage(p) && !p.behavior) return this.passageToNewRoom(p);
    this.changed('Placed');
  }

  /** The inn's last hearth (guests wait by it): it can't be deleted. */
  private lastHearth(p: PlacedProp): boolean {
    if (!isHearth(p) || !isInn(this.layout.id)) return false;
    const others = [...this.game.layouts.values()].filter((l) => isInn(l.id)).flatMap((l) => l.props.filter(isHearth));
    return others.filter((q) => q !== p).length === 0;
  }

  private remove(): void {
    if (this.held) {
      if (this.lastHearth(this.held.prop)) return this.say('The inn needs a hearth: guests wait by it');
      this.held = null; // already out of the layout (the pick-up was recorded)
      this.changed('Deleted');
      return;
    }
    const hit = this.propAtCursor();
    if (hit < 0) return;
    if (this.lastHearth(this.layout.props[hit])) return this.say('The inn needs a hearth: guests wait by it');
    this.history.record();
    this.layout.props.splice(hit, 1);
    this.changed('Deleted');
  }

  /** A map was changed outside the editor (the player rearranging furniture): it needs saving. */
  markChanged(id: string): void {
    this.unsaved.add(id);
  }

  /** An id for a new container, unique across every map: "<map>_<art>_<n>". */
  private newStorageId(p: PlacedProp): string {
    const used = new Set<string>();
    for (const l of this.game.layouts.values()) for (const q of l.props) if (q.behavior?.type === 'storage') used.add(q.behavior.id);
    const base = `${this.layout.id}_${String(p.sprite).replace(/^anim:/, '')}`;
    let n = 1;
    while (used.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
  }

  private get slotKey(): string {
    return `${this.cat}:${this.itemIndex[this.cat]}`;
  }

  /** A new stairs or door: make the room it leads to (blank, this room's size) with the way back already in it. */
  private passageToNewRoom(p: PlacedProp): void {
    const here = this.layout;
    const base = roomNameFor(p, here.id);
    const id = this.game.layouts.has(base) ? this.freeId(base) : base;
    const { w, h } = size(here);
    const room = blankRoom(id, Math.max(w, 5), Math.max(h, 5));
    ensureWayBack(room, here.id, p.sprite as string, this.game.assets);
    this.game.layouts.set(id, room);
    p.behavior = { type: passageKind(p), to: id };
    this.unsaved.add(id);
    this.changed(`${passageKind(p) === 'door' ? 'Door' : 'Stairs'} lead to ${id} (new room: Open map to build it)`);
  }

  /** Point stairs or a door at another room, adding the way back there if it has none. */
  private linkPassage(index: number, roomId: string): void {
    this.history.record();
    const here = this.layout;
    const p = here.props[index];
    const room = this.game.layouts.get(roomId)!;
    p.behavior = { type: passageKind(p), to: roomId };
    const back = ensureWayBack(room, here.id, p.sprite as string, this.game.assets);
    this.unsaved.add(roomId);
    this.game.forgetScene(roomId);
    const what = passageKind(p) === 'door' ? 'Door' : 'Stairs';
    this.changed(`${what} lead to ${roomId}${back === 'added' ? ' (way back added there)' : back === 'no room' ? ': no spot there for the way back' : ''}`);
  }

  // ------------------------------------------------------------------ undo, turning

  private undo(): void {
    this.applyHistory(this.history.undo(), 'Undone', 'Nothing to undo');
  }

  private redo(): void {
    this.applyHistory(this.history.redo(), 'Redone', 'Nothing to redo');
  }

  private applyHistory(changedIds: string[] | null, done: string, nothing: string): void {
    if (this.held) {
      this.held = null; // the snapshot has it where it was before it was picked up
    }
    if (!changedIds) return this.say(nothing);
    for (const id of changedIds) if (id !== this.game.scene.id) this.game.forgetScene(id);
    if (!this.game.layouts.has(this.game.scene.id)) {
      this.openMap([...this.game.layouts.keys()][0]);
    } else if (changedIds.includes(this.game.scene.id)) {
      this.game.rebuildScene(true);
      this.checkIn = 0.05;
    }
    this.say(done);
  }

  /**
   * Turn the piece in hand, else the one under the cursor, else the next one to be placed. Floor and
   * wall pieces turn by deg; standing pieces with facings step to the next facing.
   */
  private turnBy(deg: number, record = true): void {
    const assets = this.game.assets;
    if (this.tool !== 'props') return;
    if (this.held) {
      if (!turn(this.held.prop, deg, assets)) this.say(`${label(this.held.prop)} doesn't turn`);
      return;
    }
    const hit = this.propAtCursor();
    if (hit >= 0) {
      const p = this.layout.props[hit];
      const trial = structuredClone(p);
      if (!turn(trial, deg, assets)) return this.say(`${label(p)} doesn't turn`);
      if (record) this.history.record();
      this.layout.props[hit] = trial;
      this.changed();
      return;
    }
    const item = this.palette[this.cat].items[this.itemIndex[this.cat]].prop;
    if (canTurnFreely(item)) {
      this.turns.set(this.slotKey, normalise((this.turns.get(this.slotKey) ?? 0) + deg));
      return;
    }
    const trial = structuredClone(item);
    if (!turn(trial, deg, assets)) return this.say(`${label(item)} doesn't turn`);
    const i = this.palette[this.cat].items.findIndex((it) => it.prop.sprite === trial.sprite);
    if (i >= 0) this.itemIndex[this.cat] = i;
  }

  /** The right stick on the pad turns: a step, then repeating while it's held over. */
  private padTurn(x: number, dt: number): void {
    if (Math.abs(x) < 0.5) {
      this.turnNext = 0;
      return;
    }
    if ((this.turnNext -= dt) > 0) return;
    this.turnNext = TURN_REPEAT;
    this.turnBy(Math.sign(x) * TURN_STEP);
  }

  private listenKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.active || this.menu.open || this.picking) return;
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        return e.shiftKey ? this.redo() : this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        return this.redo();
      }
      if (e.code === 'KeyR') this.rHeld = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyR') this.rHeld = false;
    });
    window.addEventListener('blur', () => (this.rHeld = false));
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
    return artRect(p, propFrames(p, assets, content)[0], assets);
  }

  /**
   * The layer being worked on: the layer of the piece in hand. Picking up, deleting and turning act only
   * on pieces in this layer, so a hearth can be pushed up over a picture on the wall without grabbing the
   * picture (pick a Decor piece to work on pictures, rugs and stairs).
   */
  private get activeLayer(): PlacedProp['layer'] {
    return (this.held?.prop ?? this.palette[this.cat].items[this.itemIndex[this.cat]].prop).layer;
  }

  /** The front-most prop in the active layer whose art covers the cursor. */
  private propAtCursor(): number {
    const { x, y } = this.cursor;
    const scene = this.game.scene;
    const layer = this.activeLayer;
    let best = -1;
    let bestY = -Infinity;
    this.layout.props.forEach((p, i) => {
      if (p.layer !== layer) return;
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

  /** The brush in hand and the size of the cells it paints (16px fine cells, or 32px structure cells). */
  private get brushInfo(): { ch: string; size: number } {
    const b = GROUND_CHARS[this.layout.ground.type][this.brush];
    return { ch: b.ch, size: b.fine ? CELL : TILE };
  }

  /**
   * Paint with the brush in hand, or erase (right button / X): erasing takes ground back to its base -
   * grass outdoors, wood floor indoors - and turns a wall back into floor (an outer wall erased this way
   * becomes a doorway; the Clear brush removes walls altogether).
   */
  /** A new paint or erase stroke begins: everything it changes is one undo step. */
  private startStroke(): void {
    this.lastPainted = '';
    this.strokeRecorded = false;
  }

  private recordStroke(): void {
    if (this.strokeRecorded) return;
    this.history.record();
    this.strokeRecorded = true;
  }

  /** The room's grids grew or shrank at the top or left: keep the cursor, view and player on the same spot. */
  private shifted(s: Shift): void {
    if (!s.dx && !s.dy) return;
    const px = s.dx * TILE;
    const py = s.dy * TILE;
    this.cursor.x += px;
    this.cursor.y += py;
    this.view.x += px;
    this.view.y += py;
    const pl = this.game.player;
    pl.place({ x: pl.x + px, y: pl.y + py, facing: pl.facing });
    this.lastPainted = '';
  }

  private paint(erase = false): void {
    const { size } = this.brushInfo;
    let { ch } = this.brushInfo;
    let cx = Math.floor(this.cursor.x / size);
    let cy = Math.floor(this.cursor.y / size);
    const key = `${size}:${cx},${cy}`;
    if (key === this.lastPainted) return;
    this.lastPainted = key;
    const g = this.layout.ground;
    if (g.type === 'room') {
      // the cursor can be past the room's edge: building there grows the room (outside it, there's
      // nothing to erase or clear)
      const k = size === CELL ? 2 : 1;
      const sx = Math.floor(cx / k);
      const sy = Math.floor(cy / k);
      const inside = sx >= 0 && sy >= 0 && sx < g.rows[0].length && sy < g.rows.length;
      if (!inside && (erase || ch === '.')) return;
      // floor needs room round it for the walls it wraps itself in; a wall needs just its cell
      const w = g.rows[0].length;
      const h = g.rows.length;
      const need: [number, number, number, number] | null = erase ? null : size === CELL ? [sx - 1, sy - 2, sx + 1, sy + 1] : [sx, sy, sx, sy];
      if (need) {
        const [x0, y0, x1, y1] = need;
        const grow = () => growRoom(this.layout, x0, y0, x1, y1);
        if (x0 < 0 || y0 < 0 || x1 >= w || y1 >= h) {
          this.recordStroke();
          const s = grow();
          this.shifted(s);
          cx += s.dx * k;
          cy += s.dy * k;
          this.lastPainted = `${size}:${cx},${cy}`;
        }
      }
    }
    const ground = this.layout.ground; // growing replaces the room's grids
    if (erase) {
      if (ground.type === 'tiles') ch = '.';
      else if (size === CELL) {
        if (ground.rows[cy >> 1][cx >> 1] !== 'f') return; // no floor here to take back to wood
        ch = ground.floor[cy][cx] === 'w' ? '.' : 'w'; // stone goes back to wood; wood goes altogether
      } else {
        if (!WALL_CHARS.has(ground.rows[cy][cx])) return;
        ch = 'f';
      }
    }
    const set = (rows: string[], x: number, y: number, c: string) => {
      if (rows[y][x] === c) return false;
      this.recordStroke();
      rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1);
      return true;
    };
    if (ground.type === 'tiles') {
      if (!set(ground.rows, cx, cy, ch)) return;
      // outdoors only the painted patch changes: redraw just that, not the whole map
      const map = this.game.scene.ground;
      if (map instanceof TileMap) map.repaint(cx, cy);
      this.unsaved.add(this.layout.id);
      this.checkIn = 0.4;
      return;
    }
    const sx = Math.floor(cx / 2);
    const sy = Math.floor(cy / 2);
    if (size === CELL && erase && ch === '.') {
      // erasing wood floor takes the floor away altogether (the whole 32px cell), and the walls follow:
      // ones only it needed go, and what's left is walled in again
      if (!set(ground.rows, sx, sy, '.')) return;
      ground.rows.splice(0, ground.rows.length, ...unwrapWalls(ground.rows, sx, sy, wallNear(ground.rows, sx, sy, this.wallMat)));
      this.roomChanged('Floor removed');
      return;
    }
    if (size === CELL) {
      // floor material; painting floor where there was none also makes it floor and wraps walls round it
      let changed = set(ground.floor, cx, cy, ch);
      if (ground.rows[sy][sx] !== 'f') {
        set(ground.rows, sx, sy, 'f');
        ground.rows.splice(0, ground.rows.length, ...wrapWalls(ground.rows, sx, sy, this.wallMat));
        changed = true;
      }
      if (changed) this.roomChanged();
      return;
    }
    if (erase) {
      const c = ground.rows[cy][cx];
      const fl = (dx: number, dy: number) => ground.rows[cy + dy]?.[cx + dx] === 'f';
      const between = (fl(-1, 0) && fl(1, 0)) || (fl(0, -1) && fl(0, 1));
      if (c === 'I' || c === 'J' || between) {
        // an interior wall, or a wall with floor on both sides of it (a pillar, or a wall between two
        // rooms): it comes away, leaving floor
        if (set(ground.rows, cx, cy, 'f')) this.roomChanged('Wall removed');
        return;
      }
      // an outer wall: the room shrinks, as if the floor it walls in were erased (walls follow the floor)
      const f = this.flooredBy(ground.rows, cx, cy);
      if (!f) {
        if (set(ground.rows, cx, cy, '.')) this.roomChanged('Wall removed');
        return;
      }
      if (!set(ground.rows, f.x, f.y, '.')) return;
      ground.rows.splice(0, ground.rows.length, ...unwrapWalls(ground.rows, f.x, f.y, wallNear(ground.rows, f.x, f.y, this.wallMat)));
      this.roomChanged('Room made smaller');
      return;
    }
    // painting floor walls itself in with the material of the last wall brush (plain, outer)
    if ('WI'.includes(ch)) this.wallMat = 'W';
    if ('SJ'.includes(ch)) this.wallMat = 'S';
    if (set(ground.rows, cx, cy, ch)) this.roomChanged();
  }

  /**
   * The floor an outer wall walls in: the nearest floor cell it stands beside, looking into the room
   * first (below it, then below its face for a cap), then to its sides, then above.
   */
  private flooredBy(rows: string[], x: number, y: number): { x: number; y: number } | null {
    for (const [dx, dy] of [[0, 1], [0, 2], [-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1], [-1, 2], [1, 2], [-1, -1], [1, -1]]) {
      if (rows[y + dy]?.[x + dx] === 'f') return { x: x + dx, y: y + dy };
    }
    return null;
  }

  /** After an interior's walls or floor changed: fit the room to what's built, then rebuild. */
  private roomChanged(message?: string): void {
    this.shifted(trimRoom(this.layout));
    this.changed(message, true);
  }

  // ------------------------------------------------------------------ change, check, save

  /** After an edit: rebuild the scene (the ground too only if it changed), mark unsaved, re-check soon. */
  private changed(message?: string, groundChanged = false): void {
    this.game.rebuildScene(groundChanged);
    this.unsaved.add(this.layout.id);
    this.checkIn = 0.25;
    if (message) this.say(message);
  }

  private check(): void {
    const names = this.layout.props.map((p) => label(p));
    const { layouts, assets, content } = this.game;
    const hung = this.layout.props.filter((p) => p.layer === 'wall').map((p) => ({ name: label(p), rect: this.artRect(p) }));
    const set = this.layout.props.filter((p) => p.layer === 'top').map((p) => ({ name: label(p), rect: this.artRect(p) }));
    const surfaces = this.layout.props.filter((p) => !p.layer).map((p) => this.artRect(p));
    this.issues = validate(this.game.scene, names, (map, spawn) => {
      const l = layouts.get(map);
      return !!l && spawn in layoutSpawns(l, assets, content);
    }, hung, { set, surfaces });
    this.checkIn = -1;
  }

  /**
   * Put the map being edited (one room or area at a time) on the clipboard as its map file, ready to paste
   * into a chat, under its src/maps path so it can be dropped straight in.
   */
  private async copyForChat(): Promise<void> {
    if (this.held) this.cancelHeld();
    const here = this.layout.id;
    const text = `Hearthwick map from the editor:\n\n=== engine/src/maps/${here}.json ===\n${formatLayout(this.layout)}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no clipboard permission (or not a secure page): the old way, through a hidden text box
      const box = document.createElement('textarea');
      box.value = text;
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand('copy');
      box.remove();
      if (!ok) return this.say("Couldn't copy: the browser blocked the clipboard");
    }
    this.say(`Copied ${here}: paste it into the chat`);
  }

  /** Write every changed map (dev server), or download them (anywhere else). */
  private async saveAll(): Promise<void> {
    if (this.held) this.cancelHeld();
    const ids = [...this.unsaved];
    if (!ids.length) return this.say('Nothing to save');
    if (import.meta.env.DEV) {
      try {
        for (const id of ids) {
          const res = await fetch(`/__maps/${encodeURIComponent(id)}`, { method: 'POST', body: formatLayout(this.game.layouts.get(id)!) });
          if (!res.ok) throw new Error(await res.text());
          this.unsaved.delete(id);
        }
        for (const old of this.renamedFrom) await fetch(`/__maps/${encodeURIComponent(old)}`, { method: 'DELETE' });
        this.renamedFrom.clear();
        this.say(`Saved ${ids.map((i) => `${i}.json`).join(', ')}`);
      } catch (err) {
        this.say(`Save failed: ${(err as Error).message}`);
      }
      return;
    }
    for (const id of ids) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([formatLayout(this.game.layouts.get(id)!)], { type: 'application/json' }));
      a.download = `${id}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      this.unsaved.delete(id);
    }
    this.say(`Downloaded ${ids.length} map${ids.length > 1 ? 's' : ''}`);
  }

  // ------------------------------------------------------------------ menu: maps

  private mainMenu(): MenuPage {
    const here = this.layout.id;
    const hit = this.tool === 'props' ? this.propAtCursor() : -1;
    const interiors = [...this.game.layouts.values()].filter((l) => l.ground.type === 'room' && l.id !== here).sort((a, b) => a.id.localeCompare(b.id));
    return {
      title: `Map: ${here}`,
      items: [
        { label: 'Save', note: this.unsaved.size ? `${this.unsaved.size} changed` : 'saved', run: () => void this.saveAll() },
        { label: 'Copy for chat', note: here, run: () => void this.copyForChat() },
        { label: 'Undo', disabled: !this.history.canUndo, run: () => this.undo() },
        { label: 'Redo', disabled: !this.history.canRedo, run: () => this.redo() },
        { label: 'Snap', note: snapName(this.snap), run: () => this.cycleSnap() },
        { label: 'New map', run: () => this.newMapMenu() },
        { label: 'Open map', run: () => this.openMenu() },
        { label: 'Rename this map', run: () => this.renamePrompt() },
        {
          label: 'Door to...',
          note: hit >= 0 ? label(this.layout.props[hit]) : 'point at a building, stairs or a door',
          disabled: hit < 0 || !interiors.length,
          run: () => ({
            title: `${label(this.layout.props[hit])} leads ${isPassage(this.layout.props[hit]) ? 'to' : 'into'}`,
            items: interiors.map((l) => ({
              label: l.id,
              run: () => (isPassage(this.layout.props[hit]) ? this.linkPassage(hit, l.id) : this.linkDoor(hit, l.id)),
            })),
          }),
        },
        { label: 'Close editor', run: () => this.close() },
      ],
    };
  }

  private newMapMenu(): MenuPage {
    const sized = (kind: 'interior' | 'outdoor'): MenuPage => ({
      title: kind === 'interior' ? 'New interior' : 'New outdoor map',
      items: SIZES[kind].map((sz) => ({
        label: sz.name,
        note: `${sz.w}x${sz.h}`,
        run: () => this.menu.ask({
          title: 'Name the map',
          value: this.freeId(kind === 'interior' ? 'room' : 'area'),
          allowed: /[a-z0-9_]/,
          done: (name) => this.createMap(kind, name, sz.w, sz.h),
        }),
      })),
    });
    return {
      title: 'New map',
      items: [
        { label: 'Interior', note: 'walled room + door', run: () => sized('interior') },
        { label: 'Outdoor', note: 'grass', run: () => sized('outdoor') },
      ],
    };
  }

  private openMenu(): MenuPage {
    return {
      title: 'Open map',
      items: [...this.game.layouts.keys()].sort().map((id) => ({
        label: id,
        note: (this.unsaved.has(id) ? '* ' : '') + (this.game.layouts.get(id)!.ground.type === 'room' ? 'interior' : 'outdoor'),
        disabled: id === this.layout.id,
        run: () => this.openMap(id),
      })),
    };
  }

  private renamePrompt(): void {
    this.menu.ask({ title: `Rename ${this.layout.id} to`, value: this.layout.id, allowed: /[a-z0-9_]/, done: (n) => this.rename(n) });
  }

  private freeId(base: string): string {
    let i = 1;
    while (this.game.layouts.has(`${base}_${i}`)) i++;
    return `${base}_${i}`;
  }

  private validId(id: string): boolean {
    if (!/^[a-z0-9_]+$/.test(id)) return this.fail('Names use a-z, 0-9 and _ only');
    if (this.game.layouts.has(id)) return this.fail(`There is already a map called ${id}`);
    return true;
  }

  private fail(text: string): false {
    this.say(text);
    return false;
  }

  private createMap(kind: 'interior' | 'outdoor', id: string, w: number, h: number): void {
    if (!this.validId(id)) return;
    this.history.record();
    const l = kind === 'interior' ? interiorTemplate(id, w, h) : outdoorTemplate(id, w, h);
    this.game.layouts.set(id, l);
    this.unsaved.add(id);
    this.openMap(id);
    this.say(`Made ${id}${kind === 'interior' ? ': link a building to it with Door to' : ''}`);
  }

  private openMap(id: string): void {
    this.cancelHeld();
    const l = this.game.layouts.get(id)!;
    const { assets, content } = this.game;
    this.game.enter(id, Object.keys(layoutSpawns(l, assets, content))[0]);
    const f = this.game.player.feet();
    this.cursor.x = f.x + f.w / 2;
    this.cursor.y = f.y + f.h;
    this.view = { ...this.cursor };
    this.clampView();
    this.check();
  }

  /** Rename the current map, updating every door and exit that leads to it. */
  private rename(to: string): void {
    const from = this.layout.id;
    if (to === from || !this.validId(to)) return;
    this.history.clear(); // renames change files on disk when saved: not something to step back through
    const l = this.layout;
    l.id = to;
    this.game.layouts.delete(from);
    this.game.layouts.set(to, l);
    for (const other of this.game.layouts.values()) {
      let touched = other === l;
      for (const ex of other.exits) if (ex.to === from) (ex.to = to), (touched = true);
      for (const p of other.props) if (p.behavior?.type === 'enter' && p.behavior.to === from) (p.behavior.to = to), (touched = true);
      if (touched) {
        this.unsaved.add(other.id);
        this.game.forgetScene(other.id);
      }
    }
    this.unsaved.delete(from);
    this.renamedFrom.add(from);
    this.game.forgetScene(from);
    this.openMap(to);
    this.say(`Renamed to ${to} (save to write it)`);
  }

  /**
   * Make the prop (a building) the door into an interior: Enter on it goes in, walking up into its door
   * goes in, a spawn just outside it is where you come back out, and the interior's unlinked exits lead
   * back to that spawn.
   */
  private linkDoor(index: number, interiorId: string): void {
    this.history.record();
    const here = this.layout;
    const inside = this.game.layouts.get(interiorId)!;
    const p = here.props[index];
    const { assets, content } = this.game;
    if (p.sprite === undefined) p.sprite = propFrames(p, assets, content)[0]; // keep its look once its shop behavior goes
    const entry = Object.keys(layoutSpawns(inside, assets, content))[0];
    p.behavior = { type: 'enter', to: interiorId, spawn: entry };
    // the doorstep, the way in and where you come back out all come from the building now (see
    // game/build.ts entrance): drop any old ones written for it
    const outside = passageSpawn('door', interiorId);
    delete here.spawns[`from_${interiorId}`];
    here.exits = here.exits.filter((e) => e.to !== interiorId);
    let back = 0;
    for (const ex of inside.exits) {
      if (ex.to === UNLINKED || ex.to === here.id) {
        ex.to = here.id;
        ex.spawn = outside;
        back++;
      }
    }
    this.unsaved.add(here.id);
    this.unsaved.add(interiorId);
    this.game.forgetScene(interiorId);
    this.changed(back ? `${label(p)} now leads into ${interiorId}` : `${label(p)} leads into ${interiorId} (it has no way back out yet)`);
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
      if (this.menu.pointer(m.x, m.y, false)) return;
      if (this.picking) {
        this.pickHover = this.pickSlotUnder(m);
        return;
      }
      if (this.pan) {
        this.view.x -= (m.x - this.pan.x) / this.zoom;
        this.view.y -= (m.y - this.pan.y) / this.zoom;
        this.clampView();
        this.pan = m;
      }
      this.mouse = m;
      follow(this.mouse);
      if (this.tool === 'ground' && e.buttons & 3 && !this.overUi(this.mouse)) this.paint(!(e.buttons & 1));
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouse = null;
      this.pan = null;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) this.pan = null;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.active) return;
      this.mouse = toView(e);
      if (this.menu.pointer(this.mouse.x, this.mouse.y, e.button === 0)) return;
      if (this.picking) {
        this.pickerClick(this.mouse, e.button);
        return;
      }
      if (this.barClick(this.mouse)) return;
      if (e.button === 1) {
        e.preventDefault();
        this.pan = this.mouse;
        return;
      }
      if (this.overUi(this.mouse)) return;
      follow(this.mouse);
      if (e.button === 2) {
        if (this.tool === 'props') this.remove();
        else {
          this.startStroke();
          this.paint(true);
        }
      } else if (e.button === 0) {
        if (this.tool === 'ground') {
          this.startStroke();
          this.paint();
        } else this.primary();
      }
    });
    canvas.addEventListener('wheel', (e) => {
      if (!this.active) return;
      e.preventDefault();
      if (this.menu.open) return;
      if (this.picking && !e.ctrlKey && !e.shiftKey) {
        const rows = Math.ceil(this.entries().length / this.pickCols);
        this.pickScroll = Math.max(0, Math.min(rows - PICK_ROWS, this.pickScroll + Math.sign(e.deltaY)));
        return;
      }
      // one step per wheel notch, however many events the mouse or trackpad sends for it
      const px = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 300 : 1);
      if (Math.sign(px) !== Math.sign(this.wheel)) this.wheel = 0;
      this.wheel += px;
      while (Math.abs(this.wheel) >= WHEEL_NOTCH) {
        const d = Math.sign(this.wheel);
        this.wheel -= d * WHEEL_NOTCH;
        if (e.ctrlKey) {
          const i = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(this.zoom) + d));
          this.setZoom(ZOOMS[i]);
        } else if (this.rHeld) this.turnBy(d * (e.shiftKey ? TURN_FINE : TURN_STEP));
        else if (e.shiftKey) this.stepTab(d);
        else this.stepItem(d);
      }
    }, { passive: false });
  }

  private overUi(m: { x: number; y: number }): boolean {
    return m.y >= VIEW_H - this.panelH || m.y < HUD_H;
  }

  /** A click on the bottom bar: the piece in hand opens the picker, the snap button cycles snap. */
  private barClick(m: { x: number; y: number }): boolean {
    if (m.y < VIEW_H - BAR_H) return false;
    if (m.x >= this.snapButton.x && m.x < this.snapButton.x + this.snapButton.w) this.cycleSnap();
    else if (m.x < 6 + SLOT + 2) this.togglePicker();
    return true;
  }

  private pickSlotUnder(m: { x: number; y: number }): number {
    const n = this.entries().length;
    for (let i = this.pickScroll * this.pickCols; i < Math.min(n, (this.pickScroll + PICK_ROWS) * this.pickCols); i++) {
      const p = this.pickSlotAt(i);
      if (m.x >= p.x && m.x < p.x + SLOT && m.y >= p.y && m.y < p.y + SLOT) return i;
    }
    return -1;
  }

  /** Picker clicks: a tab switches, a slot is chosen (and the window closes), outside closes it. */
  private pickerClick(m: { x: number; y: number }, button: number): void {
    const b = this.pickBox;
    if (m.x < b.x || m.y < b.y || m.x >= b.x + b.w || m.y >= b.y + b.h) {
      this.picking = false;
      return;
    }
    if (button !== 0) return;
    const t = this.tabs.find((t) => m.y >= t.y && m.y < t.y + TAB_H && m.x >= t.x && m.x < t.x + t.w);
    if (t) {
      this.selectTab(t.index);
      this.pickScroll = 0;
      return;
    }
    const i = this.pickSlotUnder(m);
    if (i >= 0) {
      this.pickSet(i);
      this.picking = false;
    }
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
    // over the whole canvas: past an interior's walls too, where it can be built out
    const cv = this.canvas;
    for (let x = cv.x0; x <= cv.x1; x += TILE) r.rect(x - cx, cv.y0 - cy, px, cv.y1 - cv.y0, '#ffffff', true);
    for (let y = cv.y0; y <= cv.y1; y += TILE) r.rect(cv.x0 - cx, y - cy, cv.x1 - cv.x0, px, '#ffffff', true);
    ctx.globalAlpha = 1;

    for (const p of scene.props) {
      const c = p.collider();
      if (c) r.rect(c.x - cx, c.y - cy, c.w, c.h, '#d95763');
    }
    for (const b of scene.blockers) r.rect(b.x - cx, b.y - cy, b.w, b.h, '#d95763');
    ctx.globalAlpha = 0.35;
    for (const ex of scene.exits) r.rect(ex.area.x - cx, ex.area.y - cy, ex.area.w, ex.area.h, '#fbf236', true);
    ctx.globalAlpha = 1;
    for (const s of Object.values(scene.spawns)) r.rect(s.x + 10 - cx, s.y + 22 - cy, 12, 6, '#6abe30');
    // the player's own collision box (what has to fit between pieces and walls), filled so it stands out
    const feet = this.game.player.feet();
    ctx.globalAlpha = 0.6;
    r.rect(feet.x - cx, feet.y - cy, feet.w, feet.h, '#5fcde4', true);
    ctx.globalAlpha = 1;
    r.rect(feet.x - cx, feet.y - cy, feet.w, feet.h, '#5fcde4');

    ctx.globalAlpha = 0.4 + 0.15 * Math.sin(this.time * 6);
    for (const i of this.issues) for (const q of i.rects) r.rect(q.x - cx, q.y - cy, Math.max(2, q.w), Math.max(2, q.h), '#ff3030', true);
    ctx.globalAlpha = 1;

    if (this.tool === 'ground') {
      const { size } = this.brushInfo;
      r.rect(Math.floor(this.cursor.x / size) * size - cx, Math.floor(this.cursor.y / size) * size - cy, size, size, '#ffffff');
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
      const frame = frames[Math.floor(this.time * 4) % frames.length];
      if (gp.rot) {
        const b = assets.bounds(frames[0]);
        r.spriteTurned(frame, at.x - cx, at.y - cy, gp.rot, { x: b.x + b.w / 2, y: b.y + b.h / 2 }, 0.7);
      } else r.sprite(frame, at.x - cx, at.y - cy, 0.7);
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

    // names only for what's under the cursor: an exit, a spawn, or the piece it would pick up
    const { x: mx, y: my } = this.cursor;
    const inside = (r: { x: number; y: number; w: number; h: number }, pad = 0) =>
      mx >= r.x - pad && my >= r.y - pad && mx < r.x + r.w + pad && my < r.y + r.h + pad;
    const tags: Array<{ text: string; x: number; y: number }> = [];
    for (const ex of scene.exits) if (inside(ex.area, 2)) tags.push({ text: `> ${ex.to}`, x: ex.area.x, y: ex.area.y - 12 / z });
    for (const [name, sp] of Object.entries(scene.spawns)) {
      if (inside({ x: sp.x + 10, y: sp.y + 22, w: 12, h: 6 }, 4)) tags.push({ text: `spawn ${name}`, x: sp.x, y: sp.y + 32 });
    }
    if (this.tool === 'props' && !this.held) {
      const hit = this.propAtCursor();
      if (hit >= 0) {
        const a = this.artRect(this.layout.props[hit]);
        tags.push({ text: label(this.layout.props[hit]), x: a.x, y: a.y + a.h + 2 });
      }
    }
    for (const t of tags) {
      const s = toScreen(t.x, t.y);
      const w = measure(t.text) + 8;
      r.nine('panel_dark', s.x - 4, s.y - 4, w, 17);
      drawText(r, assets, t.text, s.x, s.y);
    }
    this.drawHud();
    this.drawPalette();
    this.menu.draw(r, assets, this.game.input, this.time);
  }

  private drawHud(): void {
    const r = this.game.renderer;
    const assets = this.game.assets;
    const l = this.layout;
    const layer = this.activeLayer;
    const layerName = layer === 'floor' ? 'Floor layer' : layer === 'wall' ? 'Wall layer' : layer === 'top' ? 'Table top' : 'Standing';
    const mode = this.tool === 'props' ? `${layerName}  snap ${snapName(this.snap)}` : this.groundTab.name;
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

  /** The bottom bar: the piece in hand (click or Tab to choose another), snap, and control hints. */
  private drawPalette(): void {
    const r = this.game.renderer;
    const assets = this.game.assets;
    const y0 = VIEW_H - BAR_H;
    r.nine('panel_dark', 0, y0, VIEW_W, BAR_H);
    const entries = this.entries();
    const sel = this.held ? null : entries[this.selected()];
    drawSlot(r, 6, y0 + 6, true);
    if (this.held) this.thumb(this.held.prop, 6, y0 + 6);
    else if (sel) {
      const ctx = r.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.rect(8, y0 + 8, SLOT - 4, SLOT - 4);
      ctx.clip();
      sel.draw(6, y0 + 6);
      ctx.restore();
    }
    const tabName = this.tabNames[this.tab];
    drawText(r, assets, this.held ? `Moving ${label(this.held.prop)}` : sel?.name ?? '', 46, y0 + 10);
    r.ctx.globalAlpha = 0.6;
    drawText(r, assets, this.held ? 'click to put it down' : tabName, 46, y0 + 24);
    r.ctx.globalAlpha = 1;
    const snapLabel = `Snap: ${snapName(this.snap)}`;
    this.snapButton = { x: VIEW_W - measure(snapLabel) - 18, w: measure(snapLabel) + 12 };
    r.nine('tab_inactive', this.snapButton.x, y0 + 15, this.snapButton.w, TAB_H);
    drawText(r, assets, snapLabel, this.snapButton.x + 6, y0 + 19);
    const nameW = Math.max(measure(sel?.name ?? ''), measure(tabName)) + 56;
    this.drawHints(Math.max(nameW, 170), y0 + 15, this.snapButton.x - 8);
    if (this.picking) this.drawPicker();
  }

  /** The piece picker, laid out like the bag: tabs along the top, a grid of slots, the name of the one in focus. */
  private drawPicker(): void {
    const r = this.game.renderer;
    const assets = this.game.assets;
    const b = this.pickBox;
    r.ctx.globalAlpha = 0.45;
    r.rect(0, 0, VIEW_W, VIEW_H - BAR_H, '#120e18', true);
    r.ctx.globalAlpha = 1;
    r.nine('panel_dark', b.x, b.y, b.w, b.h);
    drawText(r, assets, 'Pieces', b.x + 11, b.y + 9);

    // tabs: Floors, Walls, then groups; the strip scrolls so the current tab is always on screen
    const names = this.tabNames;
    const ty = b.y + 26;
    const widths = names.map((n) => measure(n) + 10);
    const room = b.w - 22;
    let firstTab = 0;
    const span = (a: number, z: number) => widths.slice(a, z + 1).reduce((t, w) => t + w + 2, 0);
    while (firstTab < this.tab && span(firstTab, this.tab) > room) firstTab++;
    this.tabs.length = 0;
    let tx = b.x + 11;
    if (firstTab > 0) drawText(r, assets, '<', b.x + 3, ty + 4);
    for (let i = firstTab; i < names.length; i++) {
      const w = widths[i];
      if (tx + w > b.x + 11 + room) {
        drawText(r, assets, '>', b.x + b.w - 9, ty + 4);
        break;
      }
      this.tabs.push({ x: tx, y: ty, w, index: i });
      r.nine(i === this.tab ? 'tab_active' : 'tab_inactive', tx, ty, w, TAB_H);
      drawText(r, assets, names[i], tx + 5, ty + 4);
      tx += w + 2;
    }

    const entries = this.entries();
    const sel = this.selected();
    const ctx = r.ctx;
    const first = this.pickScroll * this.pickCols;
    for (let i = first; i < Math.min(entries.length, first + PICK_ROWS * this.pickCols); i++) {
      const p = this.pickSlotAt(i);
      drawSlot(r, p.x, p.y, i === sel || i === this.pickHover);
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.x + 2, p.y + 2, SLOT - 4, SLOT - 4);
      ctx.clip();
      entries[i].draw(p.x, p.y);
      ctx.restore();
    }
    const rows = Math.ceil(entries.length / this.pickCols);
    if (this.pickScroll > 0) drawText(r, assets, '^', b.x + b.w - 10, b.y + 30 + TAB_H + 4);
    if (this.pickScroll + PICK_ROWS < rows) drawText(r, assets, 'v', b.x + b.w - 10, b.y + b.h - 30);
    const focus = entries[this.pickHover >= 0 ? this.pickHover : sel];
    if (focus) drawText(r, assets, focus.name, b.x + 11, b.y + b.h - 16);
  }

  private hintList(): Array<[string[], string]> {
    const input = this.game.input;
    return input.device === 'gamepad'
      ? PAD_HINTS.map(([acts, text]) => [acts.map((a) => (a === 'xb_rs_move' ? a : input.glyph(a))), text])
      : MOUSE_HINTS;
  }

  private drawHints(x: number, y: number, maxX = VIEW_W): void {
    const r = this.game.renderer;
    const assets = this.game.assets;
    let hx = x;
    for (const [glyphs, text] of this.hintList()) {
      const w = glyphs.reduce((t, n) => t + assets.frame(n).w, 0) + measure(text) + 6;
      if (hx + w > maxX) break;
      for (const n of glyphs) {
        const g = assets.frame(n);
        r.sprite(g, hx, y);
        hx += g.w;
      }
      drawText(r, assets, text, hx + 1, y + 4);
      hx += measure(text) + 6;
    }
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
