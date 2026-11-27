/**
 * Layout checks the editor runs after every change:
 *   overlap      two props' colliders overlap, or a collider sits on ground you can't stand on
 *   unreachable  a spawn, exit or usable prop the player can't walk to from the scene's first spawn
 *   dead end     an exit whose destination map or spawn doesn't exist
 * Reachability walks the player's own feet box over the map in 4px steps, using the same ground and
 * collider tests the game uses, so "reachable" here means reachable in play.
 */
import { overlaps, type Rect } from '../core/geom';
import { FEET } from '../game/player';
import type { Scene } from '../world/scene';

export interface Issue { text: string; rects: Rect[] }

const STEP = 4;

/** exists(map, spawn): whether a door or exit's destination is real. */
export function validate(scene: Scene, names: string[], exists: (map: string, spawn: string) => boolean): Issue[] {
  const issues: Issue[] = [];
  for (const ex of scene.exits) {
    if (!exists(ex.to, ex.spawn)) issues.push({ text: `exit leads nowhere (${ex.to}/${ex.spawn}): link a door to this map`, rects: [ex.area] });
  }
  const solids = scene.props.map((p, i) => ({ i, c: p.collider() })).filter((s): s is { i: number; c: Rect } => !!s.c);

  for (let a = 0; a < solids.length; a++) {
    for (let b = a + 1; b < solids.length; b++) {
      if (overlaps(solids[a].c, solids[b].c)) {
        issues.push({ text: `${names[solids[a].i]} overlaps ${names[solids[b].i]}`, rects: [solids[a].c, solids[b].c] });
      }
    }
    if (scene.ground.blocks(solids[a].c)) issues.push({ text: `${names[solids[a].i]} stands off the floor`, rects: [solids[a].c] });
  }

  // ---- reachability: flood fill over feet positions on a 4px grid anchored at the first spawn
  const spawns = Object.entries(scene.spawns);
  const first = spawns[0][1];
  const ox = ((first.x + FEET.x) % STEP + STEP) % STEP;
  const oy = ((first.y + FEET.y) % STEP + STEP) % STEP;
  const gw = Math.floor((scene.ground.pixelW - FEET.w - ox) / STEP) + 1;
  const gh = Math.floor((scene.ground.pixelH - FEET.h - oy) / STEP) + 1;
  const feetAt = (gx: number, gy: number): Rect => ({ x: ox + gx * STEP, y: oy + gy * STEP, w: FEET.w, h: FEET.h });
  const free = (r: Rect) => !scene.ground.blocks(r) && !solids.some((s) => overlaps(r, s.c));
  const cellOf = (x: number, y: number) => [Math.round((x + FEET.x - ox) / STEP), Math.round((y + FEET.y - oy) / STEP)];

  const seen = new Uint8Array(gw * gh);
  const [sx, sy] = cellOf(first.x, first.y);
  const queue: number[] = [];
  if (sx >= 0 && sy >= 0 && sx < gw && sy < gh && free(feetAt(sx, sy))) {
    seen[sy * gw + sx] = 1;
    queue.push(sy * gw + sx);
  } else {
    issues.push({ text: `spawn "${spawns[0][0]}" is blocked`, rects: [feetAt(sx, sy)] });
  }
  while (queue.length) {
    const k = queue.pop()!;
    const x = k % gw;
    const y = (k - x) / gw;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const nk = ny * gw + nx;
      if (seen[nk]) continue;
      seen[nk] = 1; // mark blocked cells too, so each is tested once
      if (free(feetAt(nx, ny))) queue.push(nk);
      else seen[nk] = 2;
    }
  }
  const reached: Rect[] = [];
  for (let k = 0; k < seen.length; k++) if (seen[k] === 1) reached.push(feetAt(k % gw, Math.floor(k / gw)));
  const canReach = (target: Rect, reach = 0) =>
    reached.some((f) => overlaps({ x: f.x - reach, y: f.y - reach, w: f.w + reach * 2, h: f.h + reach * 2 }, target));

  for (const [name, s] of spawns.slice(1)) {
    const [cx, cy] = cellOf(s.x, s.y);
    if (!(cx >= 0 && cy >= 0 && cx < gw && cy < gh && seen[cy * gw + cx] === 1)) {
      issues.push({ text: `spawn "${name}" can't be walked to`, rects: [{ x: s.x + FEET.x, y: s.y + FEET.y, w: FEET.w, h: FEET.h }] });
    }
  }
  for (const ex of scene.exits) {
    if (!canReach(ex.area)) issues.push({ text: `exit to ${ex.to} can't be walked to`, rects: [ex.area] });
  }
  scene.props.forEach((p, i) => {
    const use = p.interaction() && p.useArea();
    if (use && !canReach(use, 10)) issues.push({ text: `${names[i]} can't be reached to use`, rects: [use] });
  });
  return issues;
}
