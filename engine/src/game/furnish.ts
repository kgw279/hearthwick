/**
 * Rearranging furniture in play: hold the use button (A / E) on a piece in front of you to pick it up;
 * it rides just in front of you as you walk, washed red wherever it won't fit; tap the button to set it
 * down there, or Back (B / Esc) to put it back where it was. While carrying, push the right stick (or hold
 * R and scroll) to turn it: rugs and other floor, wall and table-top pieces by 15 degrees a step, pieces
 * that come in facings (chairs) to the next facing. It keeps whatever turn it had. The D-pad (arrow keys)
 * nudges it a pixel at a time, as in the editor, while the left stick (WASD) still walks; the nudge is
 * kept until you turn to face another way. Indoors only, and only furniture and decor
 * (not stairs, doors, shop counters or people). A tap that isn't a pick-up is an ordinary "use".
 *
 * Moving a piece changes the map's layout (the editor saves it with everything else).
 */
import type { Assets } from '../core/assets';
import { overlaps, type Rect } from '../core/geom';
import type { Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import type { Layout, PlacedProp } from '../world/layout';
import type { Scene } from '../world/scene';
import type { Player } from './player';
import { artRect, placeProp, propFrames, resolveCollider } from './build';
import { turn } from '../world/turn';
import { Nudge } from '../core/nudge';
import type { Content } from './data';

/** How long (s) the button is held before it picks a piece up. */
const HOLD = 0.4;
/** Pieces the player can move: anything with no behavior, and furniture that does something in place. */
const MOVABLE = new Set(['storage', 'wash']);
const BAD = 'rgba(217, 87, 99, 0.55)';
const TURN_STEP = 15; // degrees a step (5 with Shift on the wheel)
const NUDGE_GLIDE = 40; // px per second once a held nudge glides
const NUDGE_REACH = 32; // px a piece can be nudged from the spot in front of the player
const TURN_REPEAT = 0.18; // seconds between steps while the right stick is held over
const WHEEL_NOTCH = 100; // wheel delta per step

export interface FurnishWorld {
  readonly assets: Assets;
  readonly content: Content;
  readonly player: Player;
  /** The scene being played. */
  scene(): Scene;
  layout(): Layout;
  /** Rebuild the scene's pieces from the layout (the ground doesn't change). */
  rebuild(): void;
  /** Note the map needs saving. */
  changed(id: string): void;
  say(text: string): void;
}

export class Furnish {
  /** The piece being carried, and where it came from (its place in the layout, its old spot). */
  private carried: { prop: PlacedProp; from: number; was: PlacedProp } | null = null;
  private stick = 0; // time until the right stick turns again
  private readonly nudger = new Nudge();
  private offset = { x: 0, y: 0, facing: '' }; // nudged from the spot in front of the player
  private wheelAcc = 0;
  private held = 0;
  private pressed = false;
  private pickedUp = false;

  constructor(private readonly w: FurnishWorld) {}

  get carrying(): boolean {
    return this.carried !== null;
  }

  /** Handle the use button for this step; returns true if it was tapped (an ordinary "use"). */
  update(dt: number, input: Input): boolean {
    if (this.carried && input.pressed('back')) {
      this.putBack();
      return false;
    }
    if (this.carried) {
      // the right stick turns it: a step, then repeating while it's held over
      const x = input.rightStick().x;
      if (Math.abs(x) < 0.5) this.stick = 0;
      else if ((this.stick -= dt) <= 0) {
        this.stick = TURN_REPEAT;
        this.turnBy(Math.sign(x) * TURN_STEP);
      }
      this.nudgeBy(this.nudger.update(input.nudge(), dt, 1, NUDGE_GLIDE));
    }
    if (input.pressed('interact')) {
      this.pressed = true;
      this.held = 0;
      this.pickedUp = false;
    }
    if (this.pressed && input.down('interact')) {
      this.held += dt;
      if (!this.carried && !this.pickedUp && this.held >= HOLD) this.pickedUp = this.pickUp();
      return false;
    }
    if (!this.pressed) return false;
    this.pressed = false; // released
    if (this.pickedUp) return false;
    if (this.carried) {
      this.setDown();
      return false;
    }
    return true;
  }

  /** The wheel while the turn button is held: a step per notch. */
  wheel(deltaY: number, fine: boolean): void {
    this.wheelAcc += deltaY;
    while (Math.abs(this.wheelAcc) >= WHEEL_NOTCH) {
      const d = Math.sign(this.wheelAcc);
      this.wheelAcc -= d * WHEEL_NOTCH;
      this.turnBy(d * (fine ? 5 : TURN_STEP));
    }
  }

  /** Nudge the carried piece from its spot in front of the player, kept within reach. */
  private nudgeBy(d: { x: number; y: number }): void {
    const o = this.offsetNow();
    o.x = Math.max(-NUDGE_REACH, Math.min(NUDGE_REACH, o.x + d.x));
    o.y = Math.max(-NUDGE_REACH, Math.min(NUDGE_REACH, o.y + d.y));
  }

  /** The nudge, cleared when the player turns to face another way (it's relative to their front). */
  private offsetNow(): { x: number; y: number } {
    const f = this.w.player.facing;
    if (this.offset.facing !== f) this.offset = { x: 0, y: 0, facing: f };
    return this.offset;
  }

  private turnBy(deg: number): void {
    if (this.carried && !turn(this.carried.prop, deg, this.w.assets)) this.w.say("That doesn't turn");
  }

  private movable(p: PlacedProp): boolean {
    return !p.behavior || MOVABLE.has(p.behavior.type);
  }

  private pickUp(): boolean {
    const l = this.w.layout();
    if (l.ground.type !== 'room') return false;
    const { x, y } = this.w.player.probe();
    let best = -1;
    let bestY = -Infinity;
    l.props.forEach((p, i) => {
      if (!this.movable(p)) return;
      const a = this.art(p);
      if (x < a.x || y < a.y || x >= a.x + a.w || y >= a.y + a.h) return;
      const sortY = p.y + (p.layer ? -1000 : 0); // standing pieces before ones on the floor or walls
      if (sortY > bestY) {
        bestY = sortY;
        best = i;
      }
    });
    if (best < 0) return false;
    const [prop] = l.props.splice(best, 1);
    this.carried = { prop, from: best, was: structuredClone(prop) };
    this.offset = { x: 0, y: 0, facing: '' };
    this.w.rebuild();
    return true;
  }

  private setDown(): void {
    const c = this.carried!;
    const p = this.at();
    if (!this.fits(p)) {
      this.w.say("That won't fit there");
      return;
    }
    const l = this.w.layout();
    l.props.splice(Math.min(c.from, l.props.length), 0, p);
    this.carried = null;
    this.w.rebuild();
    this.w.changed(l.id);
  }

  /** Put the carried piece back exactly where it was. */
  putBack(): void {
    const c = this.carried;
    if (!c) return;
    const l = this.w.layout();
    l.props.splice(Math.min(c.from, l.props.length), 0, c.was);
    this.carried = null;
    this.w.rebuild();
  }

  private art(p: PlacedProp): Rect {
    const { assets, content } = this.w;
    return artRect(p, propFrames(p, assets, content)[0], assets);
  }

  /** Where the carried piece would go: just in front of the player, clear of their feet. */
  private at(): PlacedProp {
    const p = this.carried!.prop;
    const f = this.w.player.feet();
    const a = this.art({ ...p, x: 0, y: 0 });
    const depth = this.footprint(p)?.h ?? 0;
    const cx = Math.round(f.x + f.w / 2);
    const gap = 3;
    const o = this.offsetNow();
    const at = (x: number, y: number): PlacedProp => ({ ...p, x: Math.round(x + o.x), y: Math.round(y + o.y) });
    switch (this.w.player.facing) {
      case 'up': return at(cx, f.y - gap);
      case 'down': return at(cx, f.y + f.h + gap + depth);
      case 'left': return at(f.x - gap - a.w / 2, f.y + f.h);
      default: return at(f.x + f.w + gap + a.w / 2, f.y + f.h);
    }
  }

  /** What a piece stands on, in world pixels (none for floor, wall and table-top pieces). */
  private footprint(p: PlacedProp): Rect | null {
    if (p.layer) return null;
    const { assets, content } = this.w;
    const frame = propFrames(p, assets, content)[0];
    const at = placeProp(p, frame, assets);
    const c = resolveCollider(p, frame, assets);
    return c ? { x: at.x + c.x, y: at.y + c.y, w: c.w, h: c.h } : null;
  }

  /** Whether a piece can go here: on the floor and clear of everything, on a wall, or on a table. */
  private fits(p: PlacedProp): boolean {
    const { player } = this.w;
    const scene = this.w.scene();
    const g = scene.ground;
    const a = this.art(p);
    const mid = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    if (p.layer === 'wall') return g.wallFace?.(mid.x, mid.y) ?? false;
    if (p.layer === 'top') {
      // on a standing piece: the middle of it over that piece's art (as the editor checks)
      return this.w.layout().props.some((q) => {
        if (q.layer) return false;
        const s = this.art(q);
        return mid.x >= s.x && mid.y >= s.y && mid.x < s.x + s.w && mid.y < s.y + s.h;
      });
    }
    if (p.layer === 'floor') return !g.blocks({ x: mid.x - 2, y: p.y - 4, w: 4, h: 4 });
    const fp = this.footprint(p);
    if (!fp) return !g.blocks({ x: p.x - 2, y: p.y - 4, w: 4, h: 4 });
    if (g.blocks(fp) || overlaps(fp, player.feet())) return false;
    if (scene.blockers.some((b) => overlaps(fp, b))) return false;
    return !scene.props.some((q) => {
      const c = q.collider();
      return c !== null && overlaps(fp, c);
    });
  }

  /** The carried piece, where it would go (drawn in depth order with everything else). */
  draw(r: Renderer, camX: number, camY: number): void {
    if (!this.carried) return;
    const p = this.at();
    const { assets, content } = this.w;
    const frame = propFrames(p, assets, content)[0];
    const at = placeProp(p, frame, assets);
    const sortY = p.layer === 'floor' ? -1e9 : p.y;
    const ok = this.fits(p);
    const b = assets.bounds(frame);
    const pivot = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    r.queueDraw(sortY, () => {
      if (!ok) r.spriteTinted(frame, at.x - camX, at.y - camY, BAD, 0.85, p.rot ?? 0, pivot);
      else if (p.rot) r.spriteTurned(frame, at.x - camX, at.y - camY, p.rot, pivot, 0.85);
      else r.sprite(frame, at.x - camX, at.y - camY, 0.85);
    });
  }
}
