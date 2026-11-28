/**
 * An analogue clock face, drawn pixel by pixel to match the art: a round face with a tick at each quarter,
 * no numbers, an hour hand and a minute hand. The face is pale by day and dark by night (a 12-hour face
 * can't otherwise tell 7 in the morning from 7 at night).
 */
import type { Renderer } from '../core/renderer';

const RIM = '#45283c';
const DAY = '#eec39a';
const NIGHT = '#3f3f74';

/** A line of single pixels from (x0, y0) to (x1, y1). */
function line(r: Renderer, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) r.rect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1, color, true);
}

/** minutes: since midnight (any day); night: dark face. Centred on (cx, cy), radius in px. */
export function drawClockFace(r: Renderer, cx: number, cy: number, radius: number, minutes: number, night: boolean): void {
  const face = night ? NIGHT : DAY;
  const ink = night ? DAY : RIM;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const d = Math.hypot(x, y);
      if (d <= radius + 0.3) r.rect(cx + x, cy + y, 1, 1, d > radius - 1.2 ? RIM : face, true);
    }
  }
  // a tick at 12, 3, 6 and 9
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    line(r, cx + dx * (radius - 2), cy + dy * (radius - 2), cx + dx * (radius - 3), cy + dy * (radius - 3), ink);
  }
  const m = ((minutes % 1440) + 1440) % 1440;
  const hourAngle = ((m / 60) % 12) / 12 * Math.PI * 2;
  const minAngle = (m % 60) / 60 * Math.PI * 2;
  const hand = (a: number, len: number, color: string) => line(r, cx, cy, Math.round(cx + Math.sin(a) * len), Math.round(cy - Math.cos(a) * len), color);
  hand(minAngle, radius - 3, ink);
  hand(hourAngle, Math.max(2, radius - 6), '#df7126');
  r.rect(cx, cy, 1, 1, ink, true);
}
