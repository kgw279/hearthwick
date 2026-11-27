/**
 * Turning pieces. Floor and wall pieces turn freely (any angle), except stairs. Standing pieces can't (the art is drawn
 * from one viewpoint), but where the art comes in facings (a cart facing left, up, right, down), turning
 * steps through those instead.
 */
import type { Assets } from '../core/assets';
import type { PlacedProp } from '../world/layout';
import { isStairs } from './stairs';

const CLOCKWISE = ['up', 'right', 'down', 'left'];

/** Keep an angle in (-180, 180], whole degrees; 0 means unturned. */
export function normalise(deg: number): number {
  const d = Math.round((((deg % 360) + 540) % 360) - 180);
  return d === -180 ? 180 : d;
}

/** The art's name with its facing word swapped for the next one around (by `steps` quarter turns), if that art exists. */
function nextFacing(name: string, steps: number, has: (n: string) => boolean): string | null {
  const parts = name.split('_');
  const i = parts.findIndex((p) => CLOCKWISE.includes(p));
  if (i < 0) return null;
  const k = CLOCKWISE.indexOf(parts[i]);
  for (let s = 1; s < 4; s++) {
    const turned = [...parts];
    turned[i] = CLOCKWISE[(k + s * Math.sign(steps) + 8) % 4];
    const n = turned.join('_');
    if (has(n)) return n;
  }
  return null;
}

/** Floor and wall pieces turn freely, except stairs (they climb into the wall behind them, or the floor below). */
export function canTurnFreely(p: PlacedProp): boolean {
  return p.layer !== undefined && !isStairs(p);
}

/**
 * Turn a piece: floor and wall pieces by `deg`; a standing piece with facings to its next facing (one step
 * in the direction of deg). Returns false if it can't turn.
 */
export function turn(p: PlacedProp, deg: number, assets: Assets): boolean {
  if (canTurnFreely(p)) {
    const r = normalise((p.rot ?? 0) + deg);
    if (r) p.rot = r;
    else delete p.rot;
    return true;
  }
  if (typeof p.sprite !== 'string' || !deg) return false;
  const anim = p.sprite.startsWith('anim:');
  const name = anim ? p.sprite.slice(5) : p.sprite;
  const next = nextFacing(name, deg, anim ? (n) => assets.hasAnimation(n) : (n) => assets.hasFrame(n));
  if (!next) return false;
  p.sprite = anim ? `anim:${next}` : next;
  return true;
}
