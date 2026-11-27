/**
 * The game: owns the scenes, the player and the UI, and runs one fixed update + one render per frame.
 * Scenes (the town, the inn's floors) are built on first visit and kept, so changes like harvested
 * forage persist while you come and go. Moving between scenes fades out, swaps, and fades back in.
 */
import type { Assets } from '../core/assets';
import { Camera } from '../core/camera';
import { overlaps, type Rect } from '../core/geom';
import { Input } from '../core/input';
import type { LoopStats } from '../core/loop';
import { Renderer, VIEW_W, VIEW_H } from '../core/renderer';
import type { Entity } from '../world/entity';
import type { Scene } from '../world/scene';
import { drawText } from '../ui/text';
import { DialogBox, drawPrompt, Emotes, FloatTexts } from '../ui/widgets';
import { loadLayouts, type Layout } from '../world/layout';
import { buildScene, type SceneHooks } from './build';
import { Content } from './data';
import { Editor } from '../editor/editor';
import { Bag } from '../state/bag';
import { Shops } from '../state/shops';
import { BagScreen } from '../ui/bagScreen';
import { drawCoins } from '../ui/items';
import type { Screen } from '../ui/screen';
import { ShopScreen } from '../ui/shopScreen';
import { Player } from './player';

const FADE = 0.22; // seconds for each half of a scene transition

interface Transition { phase: 'out' | 'in'; t: number; to: string; spawn: string }

export class Game {
  readonly input = new Input();
  readonly content: Content;
  /** Every map, by id. The editor changes these in place and asks for the scene to be rebuilt. */
  readonly layouts: Map<string, Layout>;
  private readonly scenes = new Map<string, Scene>();
  scene!: Scene;
  private entities: Entity[] = [];
  readonly player: Player;
  readonly camera: Camera;
  private readonly hooks: SceneHooks;
  readonly editor: Editor;
  private readonly dialog = new DialogBox();
  private readonly emotes = new Emotes();
  private readonly floats = new FloatTexts();
  private transition: Transition | null = null;
  /** The player's bag and purse, and the shops' shelves: the state a save game will hold. */
  readonly bag: Bag;
  readonly shops: Shops;
  /** A full-screen UI (bag, shop) that has the input while it's open. */
  private screen: Screen | null = null;
  private target: Entity | null = null;
  private time = 0;
  private debug = false;
  stats: LoopStats = { fps: 0 };

  constructor(readonly assets: Assets, readonly renderer: Renderer) {
    this.content = new Content(assets.data);
    this.player = new Player(assets, 0, 0);
    this.camera = new Camera(VIEW_W, VIEW_H);
    this.hooks = {
      say: (text, speaker = '') => this.dialog.show(text, speaker, this.time),
      emote: (name) => this.emotes.pop(name, this.player.center.x, this.player.y, this.time),
      float: (text) => this.floats.pop(text, this.player.center.x, this.player.y, this.time),
      go: (to, spawn) => this.goTo(to, spawn),
      give: (item, n) => {
        const got = this.bag.add(item, n);
        const name = this.content.itemName(item);
        if (got) this.floats.pop(`+${got > 1 ? ` ${got}` : ''} ${name}`, this.player.center.x, this.player.y, this.time);
        else this.floats.pop('Your bag is full', this.player.center.x, this.player.y, this.time);
        if (got) this.emotes.pop('emote_happy', this.player.center.x, this.player.y, this.time);
        return got === n;
      },
      openShop: (shop) => (this.screen = new ShopScreen(shop, this.shops, this.bag, this.content, assets)),
    };
    const e = this.content.economy;
    this.bag = new Bag(e.bag_slots, e.stack_size, e.starting_coins);
    this.shops = new Shops(this.content);
    this.shops.restock(1);
    this.listenMouse(renderer.ctx.canvas);
    this.layouts = loadLayouts();
    this.editor = new Editor(this);
    this.enter('town', 'start');
  }

  /** Forget a scene so it's rebuilt from its layout on the next visit (after the editor changes it). */
  forgetScene(id: string): void {
    this.scenes.delete(id);
  }

  private getScene(id: string): Scene {
    let s = this.scenes.get(id);
    if (!s) {
      const layout = this.layouts.get(id);
      if (!layout) throw new Error(`Unknown scene "${id}"`);
      s = buildScene(layout, this.assets, this.content, this.hooks);
      this.scenes.set(id, s);
    }
    return s;
  }

  /** Switch scenes immediately (used under the fade, and by the editor to open a map). */
  enter(id: string, spawnId: string): void {
    const scene = this.getScene(id);
    const spawn = scene.spawns[spawnId];
    if (!spawn) throw new Error(`Scene "${id}" has no spawn "${spawnId}"`);
    this.scene = scene;
    this.entities = [...scene.props, this.player];
    this.player.place(spawn);
    this.camera.setWorld(scene.ground.pixelW, scene.ground.pixelH);
    this.camera.centerOn(this.player.center.x, this.player.center.y);
    this.target = null;
  }

  /** Rebuild the current scene from its (edited) layout, keeping the player where they stand. */
  rebuildScene(): void {
    const id = this.scene.id;
    this.scenes.delete(id);
    const scene = this.getScene(id);
    this.scene = scene;
    this.entities = [...scene.props, this.player];
    this.camera.setWorld(scene.ground.pixelW, scene.ground.pixelH);
    this.target = null;
  }

  /** Fade out, change scene, fade in. Ignored while a transition is already running. */
  goTo(id: string, spawnId: string): void {
    if (this.transition) return;
    this.getScene(id); // fail fast on a bad id
    this.transition = { phase: 'out', t: 0, to: id, spawn: spawnId };
  }

  blocked = (r: Rect): boolean => {
    if (this.scene.ground.blocks(r)) return true;
    for (const e of this.entities) {
      if (e === this.player) continue;
      const c = e.collider();
      if (c && overlaps(r, c)) return true;
    }
    return false;
  };

  /** The usable thing the player is facing, if any (closest wins). */
  private findTarget(): Entity | null {
    const p = this.player.probe();
    const pr = { x: p.x - 2, y: p.y - 2, w: 4, h: 4 };
    let best: Entity | null = null;
    let bestD = Infinity;
    for (const e of this.entities) {
      if (!e.interaction()) continue;
      const a = e.useArea();
      if (!a || !overlaps(pr, a)) continue;
      const d = Math.hypot(a.x + a.w / 2 - p.x, a.y + a.h / 2 - p.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** An exit the player is walking into, if any. */
  private exitHit(): { to: string; spawn: string } | null {
    if (!this.player.moving) return null;
    const feet = this.player.feet();
    for (const ex of this.scene.exits) {
      if (ex.dir && ex.dir !== this.player.facing) continue;
      if (overlaps(feet, ex.area)) return ex;
    }
    return null;
  }

  update(dt: number): void {
    this.time += dt;
    this.input.update();
    if (this.input.pressed('debug')) this.debug = !this.debug;
    if (this.input.pressed('edit') && !this.transition && !this.dialog.open && !this.screen) this.editor.toggle();

    if (this.editor.active) {
      this.editor.update(dt);
    } else if (this.screen) {
      if (!this.screen.update(this.input, dt)) this.screen = null;
      this.target = null;
    } else if (this.transition) {
      const tr = this.transition;
      tr.t += dt;
      if (tr.phase === 'out' && tr.t >= FADE) {
        this.enter(tr.to, tr.spawn);
        this.transition = { ...tr, phase: 'in', t: 0 };
      } else if (tr.phase === 'in' && tr.t >= FADE) {
        this.transition = null;
      }
    } else if (this.dialog.open) {
      if (this.input.pressed('interact') || this.input.pressed('back')) this.dialog.advance();
      this.target = null;
    } else {
      if (this.input.pressed('menu')) this.screen = new BagScreen(this.bag, this.content, this.assets);
      this.player.move(dt, this.input, this.blocked);
      const exit = this.exitHit();
      if (exit) {
        this.goTo(exit.to, exit.spawn);
      } else {
        this.target = this.findTarget();
        const action = this.target?.interaction();
        if (action && this.input.pressed('interact')) {
          action.use();
          this.target = this.findTarget(); // using something can change or remove its action
        }
      }
    }
    for (const e of this.entities) e.update(dt);
    if (this.editor.active) {
      // the editor aims the camera directly (no easing), so the world never slides under its pointer
      this.camera.setZoom(this.editor.zoom);
      const f = this.editor.focus();
      this.camera.centerOn(f.x, f.y);
    } else this.camera.follow(this.player.center.x, this.player.center.y, dt);
  }

  render(alpha: number): void {
    const r = this.renderer;
    // Snap the camera to whole screen pixels once, so everything in the world moves together.
    r.begin(this.scene.backdrop);
    r.setZoom(this.editor.active ? this.editor.zoom : 1);
    const cam = this.camera.at(alpha);
    const cx = r.snap(cam.x);
    const cy = r.snap(cam.y);
    this.scene.ground.draw(r, cx, cy, this.time);
    if (this.debug) this.scene.ground.drawDebug?.(r, cx, cy);
    for (const e of this.entities) r.queueDraw(e.sortY, () => e.draw(r, cx, cy, this.time, alpha));
    r.flush();
    this.emotes.draw(r, cx, cy, this.time);
    this.floats.draw(r, this.assets, cx, cy, this.time);

    if (this.editor.active) {
      this.editor.drawWorld(cx, cy);
      r.setZoom(1);
      this.editor.drawUi(cx, cy);
      return;
    }
    const action = this.target?.interaction();
    if (this.target && action && !this.dialog.open && !this.transition) {
      const p = this.player.at(alpha);
      drawPrompt(r, this.assets, this.input, 'interact', action.label, Math.round(p.x + 16 - cx), Math.round(p.y - cy - 24), this.time);
      const a = this.target.useArea();
      if (this.debug && a) r.rect(a.x - cx, a.y - cy, a.w, a.h, '#fbf236');
    }
    this.dialog.draw(r, this.assets, this.input, this.time);
    if (this.screen) {
      r.ctx.globalAlpha = 0.5;
      r.rect(0, 0, VIEW_W, VIEW_H, '#120e18', true);
      r.ctx.globalAlpha = 1;
      this.screen.draw(r, this.time);
    } else if (!this.dialog.open) {
      r.nine('panel_dark', 4, 4, 28 + String(this.bag.coins).length * 6, 24);
      drawCoins(r, this.assets, this.bag.coins, 8, 8);
    }
    if (this.debug) this.drawDebug(cx, cy);

    if (this.transition) {
      const k = Math.min(1, this.transition.t / FADE);
      r.ctx.globalAlpha = this.transition.phase === 'out' ? k : 1 - k;
      r.rect(0, 0, VIEW_W, VIEW_H, '#120e18', true);
      r.ctx.globalAlpha = 1;
    }
  }

  /** Mouse for full-screen UI (the editor listens for itself). */
  private listenMouse(canvas: HTMLCanvasElement): void {
    const at = (e: MouseEvent) => {
      const b = canvas.getBoundingClientRect();
      return { x: ((e.clientX - b.left) / b.width) * VIEW_W, y: ((e.clientY - b.top) / b.height) * VIEW_H };
    };
    canvas.addEventListener('mousemove', (e) => {
      if (!this.screen || this.editor.active) return;
      const p = at(e);
      this.screen.pointer(p.x, p.y, -1, e.shiftKey);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.screen || this.editor.active) return;
      const p = at(e);
      if (!this.screen.pointer(p.x, p.y, e.button, e.shiftKey)) this.screen = null;
    });
  }

  private drawDebug(cx: number, cy: number): void {
    const r = this.renderer;
    for (const e of this.entities) {
      const c = e === this.player ? this.player.feet() : e.collider();
      if (c) r.rect(c.x - cx, c.y - cy, c.w, c.h, e === this.player ? '#6abe30' : '#d95763');
    }
    for (const ex of this.scene.exits) r.rect(ex.area.x - cx, ex.area.y - cy, ex.area.w, ex.area.h, '#fbf236');
    const p = this.player.probe();
    r.rect(p.x - cx - 1, p.y - cy - 1, 3, 3, '#5fcde4', true);
    r.nine('panel_dark', VIEW_W - 92, 4, 88, 47);
    drawText(r, this.assets, `FPS ${this.stats.fps}`, VIEW_W - 86, 9);
    drawText(r, this.assets, this.input.device === 'gamepad' ? 'Pad' : 'Keys', VIEW_W - 86, 22);
    drawText(r, this.assets, this.scene.id, VIEW_W - 86, 35);
  }
}
