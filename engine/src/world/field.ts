/**
 * Smooth shapes from painted cells. Ground is painted on a fine grid (16px cells); each terrain's shape
 * is the set of pixels where the bilinear blend of its cells (1 painted, 0 not, sampled at cell centres)
 * plus a little wobble passes one half. One painted cell becomes a small rounded patch about a cell
 * across (the width of a narrow path); neighbouring cells join up; a filled area fills completely with
 * rounded borders. Natural ground wobbles more than laid paving.
 */
export const CELL = 16;

/** Smooth value noise in [-1, 1], 8px features, tiling every 256px. */
const NOISE_SIZE = 256;
const NOISE_STEP = 8;
const lattice = (() => {
  const n = NOISE_SIZE / NOISE_STEP;
  const out = new Float32Array(n * n);
  let s = 1234567;
  for (let i = 0; i < out.length; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    out[i] = ((s >>> 8) / 0xffffff) * 2 - 1;
  }
  return { n, out };
})();

export function noise(x: number, y: number): number {
  const { n, out } = lattice;
  const gx = (((x % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE) / NOISE_STEP;
  const gy = (((y % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE) / NOISE_STEP;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const at = (i: number, j: number) => out[((j % n) * n) + (i % n)];
  const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
  const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
  return a + (b - a) * sy;
}

/**
 * Whether pixel (px, py) is inside the shape of the cells for which `is(i, j)` is true, on a grid of
 * w x h cells. Off the grid, cells continue the nearest edge cell (so shapes run cleanly off the map).
 */
export function inside(is: (i: number, j: number) => boolean, w: number, h: number, px: number, py: number, wobble: number): boolean {
  const u = (px + 0.5) / CELL - 0.5;
  const v = (py + 0.5) / CELL - 0.5;
  const i0 = Math.floor(u);
  const j0 = Math.floor(v);
  const fu = u - i0;
  const fv = v - j0;
  const c = (i: number, j: number) => (is(Math.max(0, Math.min(w - 1, i)), Math.max(0, Math.min(h - 1, j))) ? 1 : 0);
  const top = c(i0, j0) + (c(i0 + 1, j0) - c(i0, j0)) * fu;
  const bot = c(i0, j0 + 1) + (c(i0 + 1, j0 + 1) - c(i0, j0 + 1)) * fu;
  const val = top + (bot - top) * fv;
  if (val === 0) return false;
  if (val === 1) return true;
  return val + noise(px, py) * wobble > 0.5;
}
