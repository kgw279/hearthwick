/**
 * Layout editor (F2, or click the left stick). Edits the map you're standing in, live: every change
 * rebuilds the scene through the same code the game uses, and is checked for overlaps and for places
 * the player can no longer walk to.
 *
 * Props tool: a ghost of the chosen palette item follows the cursor. Place it, or pick up the prop under
 * the cursor to move it and place it again; delete removes it. Placement mode cycles floor / wall / flat.
 * Ground tool: paint grass, road, path and water (town) or wood, stone and no-floor (interiors).
 * Save writes src/maps/<id>.json when running the dev server, and downloads the file anywhere else.
 *
 * Controls are actions, so keyboard, mouse and Xbox controller all work (see HINTS).
 */
import type { Action } from '../core/input';
import { overlaps, type Rect } from '../core/geom';
import { VIEW_H, VIEW_W } from '../core/renderer';
import type { Game } from '../game/game';
import { placeProp, propFrames } from '../game/build';
import { drawText, measure } from '../ui/text';
import { formatLayout, GROUND_CHARS, type Layout, type PlacedProp, type Place } from '../world/layout';
import { TILE } from '../world/tilemap';
import { buildPalette, type Category } from './palette';
import { validate, type Issue } from './validate';

type Tool = 'props' | 'ground';
interface Held { prop: PlacedProp; from: number }

const REPEAT_FIRST = 0.22;
const REPEAT_NEXT = 0.06;
const PLACES: Place[] = ['floor', 'wall', 'flat'];
const HINTS: Array<[Action[], string]> = [
  [['interact'], 'Place'], [['cook'], 'Delete'], [['tab_prev', 'tab_next'], 'Item'], [['cat_prev', 'cat_next'], 'Group'],
  [['recipes'], 'Tool'], [['map'], 'Mode'], [['menu'], 'Save'], [['back'], 'Exit'],
];

export class Editor {
  active = false;
  private tool: Tool = 'props';
  private readonly cursor = { x: 0, y: 0 };
  private readonly palette: Category[];
  private cat = 0;
  private readonly itemIndex: number[];
  private brush = 0;
  private place: Place | null = null; // overrides the palette item's own placement
  private held: Held | null = null;
  issues: Issue[] = [];
  private checkIn = -1;
  private readonly unsaved = new Set<string>();
  private status = { text: '', until: 0 };
  private time = 0;
  private repeat = { dx: 0, dy: 0, t: 0 };
  private lastPainted = '';
  /** Mouse position in logical screen pixels, or null when it's off the canvas or unused. */
  private mouse: { x: number; y: number } | null = null;
  private cam = { x: 0, y: 0 };

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
    this.cursor.x = Math.floor((f.x + f.w / 2) / TILE);
    this.cursor.y = Math.floor((f.y + f.h / 2) / TILE);
    this.game.camera.setInset(HUD_H, PANEL_H);
    this.check();
  }

  private close(): void {
    this.cancelHeld();
    this.active = false;
    this.game.camera.setInset(0, 0);
  }

  /** World point the camera follows while editing. */
  focus(): { x: number; y: number } {
    return { x: this.cursor.x * TILE + TILE / 2, y: this.cursor.y * TILE + TILE / 2 };
  }

  // ------------------------------------------------------------------ update

  update(dt: number): void {
    this.time += dt;
    const input = this.game.input;
    this.moveCursor(dt);

    if (input.pressed('recipes')) {
      this.cancelHeld();
      this.tool = this.tool === 'props' ? 'ground' : 'props';
    }
    if (input.pressed('tab_prev')) this.stepItem(-1);
    if (input.pressed('tab_next')) this.stepItem(1);
    if (input.pressed('cat_prev')) this.stepCategory(-1);
    if (input.pressed('cat_next')) this.stepCategory(1);
    if (input.pressed('map') && this.tool === 'props') this.cyclePlace();
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

  private moveCursor(dt: number): void {
    const m = this.game.input.move();
    const dx = Math.abs(m.x) > 0.5 ? Math.sign(m.x) : 0;
    const dy = Math.abs(m.y) > 0.5 ? Math.sign(m.y) : 0;
    if (!dx && !dy) {
      this.repeat = { dx: 0, dy: 0, t: 0 };
      return;
    }
    this.mouse = null; // keys/pad take over from the mouse
    const fresh = dx !== this.repeat.dx || dy !== this.repeat.dy;
    this.repeat.t -= dt;
    if (fresh || this.repeat.t <= 0) {
      this.setCursor(this.cursor.x + dx, this.cursor.y + dy);
      this.repeat = { dx, dy, t: fresh ? REPEAT_FIRST : REPEAT_NEXT };
    }
  }

  private setCursor(x: number, y: number): void {
    const rows = this.layout.ground.rows;
    this.cursor.x = Math.max(0, Math.min(rows[0].length - 1, x));
    this.cursor.y = Math.max(0, Math.min(rows.length - 1, y));
  }

  private stepItem(d: number): void {
    if (this.tool === 'ground') {
      const n = GROUND_CHARS[this.layout.ground.type].length;
      this.brush = (this.brush + d + n) % n;
      return;
    }
    if (this.held && this.held.from >= 0) return; // moving a prop: the palette is not in play
    const n = this.palette[this.cat].items.length;
    this.itemIndex[this.cat] = (this.itemIndex[this.cat] + d + n) % n;
  }

  private stepCategory(d: number): void {
    if (this.tool !== 'props' || (this.held && this.held.from >= 0)) return;
    this.cat = (this.cat + d + this.palette.length) % this.palette.length;
  }

  private cyclePlace(): void {
    const target = this.held && this.held.from >= 0 ? this.held.prop : null;
    const current = target?.place ?? this.place ?? this.paletteProp().place ?? 'floor';
    const next = PLACES[(PLACES.indexOf(current) + 1) % PLACES.length];
    if (target) target.place = next;
    else this.place = next;
    this.say(`Placement: ${next}`);
  }

  // ------------------------------------------------------------------ props

  /** The palette item as a prop at the cursor. */
  private paletteProp(): PlacedProp {
    const item = this.palette[this.cat].items[this.itemIndex[this.cat]];
    const p: PlacedProp = { ...structuredClone(item.prop), x: this.cursor.x, y: this.cursor.y };
    if (this.place) p.place = this.place;
    return p;
  }

  /** What would be placed right now: the held prop, or the palette item. */
  private ghost(): PlacedProp {
    if (this.held) return { ...this.held.prop, x: this.cursor.x, y: this.cursor.y };
    return this.paletteProp();
  }

  private primary(): void {
    if (this.held) {
      const p = this.ghost();
      this.layout.props.splice(this.held.from, 0, p);
      this.held = null;
      this.changed('Moved');
      return;
    }
    const hit = this.propAtCursor();
    if (hit >= 0) {
      const [p] = this.layout.props.splice(hit, 1);
      this.held = { prop: p, from: hit };
      this.changed();
      return;
    }
    this.layout.props.push(this.paletteProp());
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

  /** The front-most prop whose art covers the point under the cursor (mouse point, or the tile's centre). */
  private propAtCursor(): number {
    const pt = this.pointer();
    const scene = this.game.scene;
    let best = -1;
    let bestY = -Infinity;
    // With keys or a pad, a prop placed on the cursor's tile wins (wall art sits above its tile).
    const onTile = this.mouse ? [] : this.layout.props.map((p, i) => [p, i] as const).filter(([p]) => p.x === this.cursor.x && p.y === this.cursor.y);
    if (onTile.length) return onTile.reduce((a, b) => ((scene.props[b[1]]?.sortY ?? 0) >= (scene.props[a[1]]?.sortY ?? 0) ? b : a))[1];
    this.layout.props.forEach((p, i) => {
      const r = this.artRect(p);
      if (pt.x < r.x || pt.y < r.y || pt.x >= r.x + r.w || pt.y >= r.y + r.h) return;
      const y = scene.props[i]?.sortY ?? r.y + r.h;
      if (y >= bestY) {
        bestY = y;
        best = i;
      }
    });
    return best;
  }

  private pointer(): { x: number; y: number } {
    if (this.mouse) return { x: this.mouse.x + this.cam.x, y: this.mouse.y + this.cam.y };
    return { x: this.cursor.x * TILE + TILE / 2, y: this.cursor.y * TILE + TILE / 2 };
  }

  // ------------------------------------------------------------------ ground

  private paint(): void {
    const key = `${this.cursor.x},${this.cursor.y}`;
    if (key === this.lastPainted) return;
    this.lastPainted = key;
    const g = this.layout.ground;
    const ch = GROUND_CHARS[g.type][this.brush].ch;
    const row = g.rows[this.cursor.y];
    if (row[this.cursor.x] === ch) return;
    const before = g.rows.slice();
    g.rows[this.cursor.y] = row.slice(0, this.cursor.x) + ch + row.slice(this.cursor.x + 1);
    try {
      this.changed();
    } catch (err) {
      g.rows.splice(0, g.rows.length, ...before);
      this.game.rebuildScene();
      this.say((err as Error).message.replace(/^.*?: /, ''));
    }
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
        return;
      } catch (err) {
        this.say(`Save failed: ${(err as Error).message}`);
        return;
      }
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
    canvas.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      this.mouse = toView(e);
      if (this.overPalette(this.mouse)) return;
      const w = this.pointer();
      this.setCursor(Math.floor(w.x / TILE), Math.floor(w.y / TILE));
      if (this.tool === 'ground' && e.buttons & 1) this.paint();
    });
    canvas.addEventListener('mouseleave', () => (this.mouse = null));
    canvas.addEventListener('contextmenu', (e) => this.active && e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      if (!this.active) return;
      this.mouse = toView(e);
      const slot = this.overPalette(this.mouse);
      if (slot) {
        if (slot.index >= 0) this.pick(slot.index);
        return;
      }
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
      if (e.shiftKey) this.stepCategory(Math.sign(e.deltaY));
      else this.stepItem(Math.sign(e.deltaY));
    }, { passive: false });
  }

  private pick(index: number): void {
    if (this.tool === 'ground') this.brush = index;
    else if (!(this.held && this.held.from >= 0)) this.itemIndex[this.cat] = index;
  }

  // ------------------------------------------------------------------ drawing

  private readonly slots: Array<{ x: number; y: number; index: number }> = [];

  private overPalette(m: { x: number; y: number }): { index: number } | null {
    if (m.y < VIEW_H - PANEL_H) return null;
    const s = this.slots.find((s) => m.x >= s.x && m.x < s.x + SLOT && m.y >= s.y && m.y < s.y + SLOT);
    return { index: s ? s.index : -1 };
  }

  draw(cx: number, cy: number): void {
    this.cam = { x: cx, y: cy };
    const r = this.game.renderer;
    const scene = this.game.scene;
    const ctx = r.ctx;

    // grid
    ctx.globalAlpha = 0.12;
    const rows = this.layout.ground.rows;
    for (let x = 0; x <= rows[0].length; x++) r.rect(x * TILE - cx, -cy, 1 / r.scale, rows.length * TILE, '#ffffff', true);
    for (let y = 0; y <= rows.length; y++) r.rect(-cx, y * TILE - cy, rows[0].length * TILE, 1 / r.scale, '#ffffff', true);
    ctx.globalAlpha = 1;

    // colliders, exits, spawns
    for (const p of scene.props) {
      const c = p.collider();
      if (c) r.rect(c.x - cx, c.y - cy, c.w, c.h, '#d95763');
    }
    for (const ex of scene.exits) {
      ctx.globalAlpha = 0.35;
      r.rect(ex.area.x - cx, ex.area.y - cy, ex.area.w, ex.area.h, '#fbf236', true);
      ctx.globalAlpha = 1;
      drawText(r, this.game.assets, `>${ex.to}`, ex.area.x - cx, ex.area.y - cy - 10);
    }
    for (const [name, s] of Object.entries(scene.spawns)) {
      r.rect(s.x + 10 - cx, s.y + 22 - cy, 12, 6, '#6abe30');
      drawText(r, this.game.assets, name, s.x - cx, s.y + 30 - cy);
    }
    // problems
    ctx.globalAlpha = 0.4 + 0.15 * Math.sin(this.time * 6);
    for (const i of this.issues) for (const q of i.rects) r.rect(q.x - cx, q.y - cy, Math.max(2, q.w), Math.max(2, q.h), '#ff3030', true);
    ctx.globalAlpha = 1;

    if (this.tool === 'props') this.drawPropCursor(cx, cy);
    else r.rect(this.cursor.x * TILE - cx, this.cursor.y * TILE - cy, TILE, TILE, '#ffffff');

    this.drawHud();
    this.drawPalette();
  }

  private drawPropCursor(cx: number, cy: number): void {
    const r = this.game.renderer;
    const { assets, content } = this.game;
    const hit = this.held ? -1 : this.propAtCursor();
    if (hit >= 0) {
      const a = this.artRect(this.layout.props[hit]);
      r.rect(a.x - cx - 1, a.y - cy - 1, a.w + 2, a.h + 2, '#5fcde4');
      drawText(r, assets, label(this.layout.props[hit]), a.x - cx, a.y + a.h - cy + 2);
      return;
    }
    const g = this.ghost();
    const frames = propFrames(g, assets, content);
    const at = placeProp(g, frames[0], assets);
    r.sprite(frames[Math.floor(this.time * 4) % frames.length], at.x - cx, at.y - cy, 0.7);
    if (at.solid) {
      const c = { x: at.x + at.solid.x, y: at.y + at.solid.y, w: at.solid.w, h: at.solid.h };
      const bad = this.game.scene.ground.blocks(c) || this.game.scene.props.some((p) => {
        const pc = p.collider();
        return pc ? overlaps(pc, c) : false;
      });
      r.rect(c.x - cx, c.y - cy, c.w, c.h, bad ? '#ff3030' : '#6abe30');
    }
    r.rect(this.cursor.x * TILE - cx, this.cursor.y * TILE - cy, TILE, TILE, '#ffffff');
  }

  private drawHud(): void {
    const r = this.game.renderer;
    const assets = this.game.assets;
    const l = this.layout;
    const mode = this.tool === 'props'
      ? `Props  ${(this.held && this.held.from >= 0 ? this.held.prop.place : this.place ?? this.paletteProp().place) ?? 'floor'}`
      : 'Ground';
    const top = `EDIT ${l.id}${this.unsaved.has(l.id) ? '*' : ''}  ${mode}  ${this.cursor.x},${this.cursor.y}`;
    r.nine('panel_dark', 2, 2, measure(top) + 12, 19);
    drawText(r, assets, top, 8, 7);

    const issueText = this.issues.length === 0 ? 'No problems' : `${this.issues.length} problem${this.issues.length > 1 ? 's' : ''}: ${this.issues[0].text}`;
    const msg = this.time < this.status.until ? this.status.text : issueText;
    const clipped = msg.length > 44 ? msg.slice(0, 43) + '.' : msg;
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

    // hints
    let hx = 6;
    for (const [actions, text] of HINTS) {
      for (const a of actions) {
        const g = assets.frame(input.glyph(a));
        r.sprite(g, hx, y0 + 5);
        hx += g.w;
      }
      drawText(r, assets, text, hx + 2, y0 + 9);
      hx += measure(text) + 5;
    }

    // items
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
    } else {
      const cat = this.palette[this.cat];
      const moving = this.held && this.held.from >= 0;
      title = moving ? 'Moving' : cat.name;
      selected = moving ? -1 : this.itemIndex[this.cat];
      entries = moving
        ? [{ name: label(this.held!.prop), draw: (x, y) => this.thumb(this.held!.prop, x, y) }]
        : cat.items.map((it) => ({ name: it.name, draw: (x, y) => this.thumb(it.prop, x, y) }));
    }
    const rowY = y0 + 25;
    drawText(r, assets, title, 6, rowY + 4);
    const visible = Math.floor((VIEW_W - 70) / (SLOT + 2));
    const first = Math.max(0, Math.min(entries.length - visible, (selected < 0 ? 0 : selected) - Math.floor(visible / 2)));
    this.slots.length = 0;
    for (let i = first; i < Math.min(entries.length, first + visible); i++) {
      const x = 64 + (i - first) * (SLOT + 2);
      this.slots.push({ x, y: rowY, index: i });
      r.rect(x, rowY, SLOT, SLOT, '#2a2235', true);
      const ctx = r.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, rowY, SLOT, SLOT);
      ctx.clip();
      entries[i].draw(x, rowY);
      ctx.restore();
      if (i === selected) r.rect(x - 1, rowY - 1, SLOT + 2, SLOT + 2, '#fbf236');
    }
    const sel = selected >= 0 ? entries[selected] : entries[0];
    if (sel) drawText(r, assets, `${sel.name}  (${(selected < 0 ? 0 : selected) + 1}/${entries.length})`, 6, rowY + SLOT + 4);
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
    const ctx = this.game.renderer.ctx;
    ctx.drawImage(f.img, f.x + b.x, f.y + b.y, b.w, b.h, x + Math.round((SLOT - w) / 2), y + Math.round((SLOT - h) / 2), w, h);
  }
}

const SLOT = 32;
const PANEL_H = 80;
const HUD_H = 22;

/** Short name for a prop: its behavior target, or its sprite. */
function label(p: PlacedProp): string {
  const b = p.behavior;
  if (b?.type === 'shop' || b?.type === 'market') return b.shop;
  if (b?.type === 'forage') return b.node;
  if (b?.type === 'talk') return b.who;
  const s = Array.isArray(p.sprite) ? p.sprite[0] : p.sprite ?? '?';
  return s.replace(/^anim:/, '');
}
