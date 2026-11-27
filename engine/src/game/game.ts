/**
 * The game: owns the world, the player and the UI, and runs one fixed update + one render per frame.
 * Milestone 1 is the town: walk around, bump into things, and use whatever you're facing.
 */
import type { Assets } from '../core/assets';
import { Camera } from '../core/camera';
import { overlaps, type Rect } from '../core/geom';
import { Input } from '../core/input';
import type { LoopStats } from '../core/loop';
import { Renderer, VIEW_W } from '../core/renderer';
import type { Entity } from '../world/entity';
import { TileMap } from '../world/tilemap';
import { drawText } from '../ui/text';
import { DialogBox, drawPrompt, Emotes, FloatTexts } from '../ui/widgets';
import { Content } from './data';
import { Player } from './player';
import { buildTown, SPAWN, TOWN_MAP } from './town';

export class Game {
  readonly input = new Input();
  private readonly content: Content;
  private readonly map: TileMap;
  private readonly entities: Entity[];
  private readonly player: Player;
  private readonly camera: Camera;
  private readonly dialog = new DialogBox();
  private readonly emotes = new Emotes();
  private readonly floats = new FloatTexts();
  private target: Entity | null = null;
  private time = 0;
  private debug = false;
  stats: LoopStats = { fps: 0 };

  constructor(private readonly assets: Assets, private readonly renderer: Renderer) {
    this.content = new Content(assets.data);
    this.map = new TileMap(TOWN_MAP, assets);
    this.player = new Player(assets, SPAWN.x, SPAWN.y);
    const hooks = {
      say: (text: string, speaker = '') => this.dialog.show(text, speaker, this.time),
      emote: (name: string) => this.emotes.pop(name, this.player.center.x, this.player.y, this.time),
      float: (text: string) => this.floats.pop(text, this.player.center.x, this.player.y, this.time),
    };
    this.entities = [...buildTown(assets, this.content, hooks), this.player];
    this.camera = new Camera(this.map.pixelW, this.map.pixelH);
    this.camera.centerOn(this.player.center.x, this.player.center.y);
  }

  private blocked = (r: Rect): boolean => {
    if (this.map.blocks(r)) return true;
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

  update(dt: number): void {
    this.time += dt;
    this.input.update();
    if (this.input.pressed('debug')) this.debug = !this.debug;

    if (this.dialog.open) {
      if (this.input.pressed('interact') || this.input.pressed('back')) this.dialog.advance();
      this.target = null;
    } else {
      this.player.move(dt, this.input, this.blocked);
      this.target = this.findTarget();
      const action = this.target?.interaction();
      if (action && this.input.pressed('interact')) {
        action.use();
        this.target = this.findTarget(); // using something can change or remove its action
      }
    }
    for (const e of this.entities) e.update(dt);
    this.camera.follow(this.player.center.x, this.player.center.y, dt);
  }

  render(): void {
    const r = this.renderer;
    const cx = this.camera.ix;
    const cy = this.camera.iy;
    r.begin();
    this.map.draw(r, cx, cy, this.time);
    for (const e of this.entities) r.queueDraw(e.sortY, () => e.draw(r, cx, cy, this.time));
    r.flush();
    this.emotes.draw(r, cx, cy, this.time);
    this.floats.draw(r, this.assets, cx, cy, this.time);

    const action = this.target?.interaction();
    if (this.target && action && !this.dialog.open) {
      drawPrompt(r, this.assets, this.input, 'interact', action.label, this.player.center.x - cx, this.player.y - cy - 24, this.time);
      const a = this.target.useArea();
      if (this.debug && a) r.rect(a.x - cx, a.y - cy, a.w, a.h, '#fbf236');
    }
    this.dialog.draw(r, this.assets, this.input, this.time);
    if (this.debug) this.drawDebug(cx, cy);
    r.present();
  }

  private drawDebug(cx: number, cy: number): void {
    const r = this.renderer;
    for (const e of this.entities) {
      const c = e === this.player ? this.player.feet() : e.collider();
      if (c) r.rect(c.x - cx, c.y - cy, c.w, c.h, e === this.player ? '#6abe30' : '#d95763');
    }
    const p = this.player.probe();
    r.rect(p.x - cx - 1, p.y - cy - 1, 3, 3, '#5fcde4', true);
    r.nine('panel_dark', VIEW_W - 92, 4, 88, 34);
    drawText(r, this.assets, `FPS ${this.stats.fps}`, VIEW_W - 86, 9);
    drawText(r, this.assets, this.input.device === 'gamepad' ? 'Pad' : 'Keys', VIEW_W - 86, 22);
  }
}
