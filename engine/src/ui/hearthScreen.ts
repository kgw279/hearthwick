/**
 * The hearth's menu. Sit by the fire and let the time pass until an hour you choose (left / right to
 * choose it; a clock face shows it), or see to the guests waiting by the hearth. Passing the time is for
 * a quiet inn: not while guests are in.
 */
import type { Assets } from '../core/assets';
import type { Device, Input } from '../core/input';
import type { Renderer } from '../core/renderer';
import { VIEW_H, VIEW_W } from '../core/renderer';
import { hint } from './buttons';
import { drawClockFace } from './clockFace';
import { Nav, type Screen } from './screen';
import { drawText, measure } from './text';

const W = 340;
const H = 132;
const ROW = 22;

/** "6 in the morning", "noon", "8 at night". */
export function hourName(h: number): string {
  if (h === 0) return 'midnight';
  if (h === 12) return 'noon';
  const when = h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : h < 21 ? 'in the evening' : 'at night';
  return `${h % 12} ${when}`;
}

export class HearthScreen implements Screen {
  private sel = 0;
  private until: number;
  private time = 0;
  private device: Device = 'keyboard';
  private readonly nav = new Nav();
  private message = { text: '', until: 0 };
  private closing = false;

  constructor(
    /** The hour now (with its fraction). */
    hour: number,
    /** How many guests are waiting by the hearth. */
    private readonly waiting: number,
    /** Let the time pass till this hour: why not, or null (the menu closes). */
    private readonly pass: (hour: number) => string | null,
    /** See to the guests by the hearth. */
    private readonly guests: () => void,
    private readonly assets: Assets,
  ) {
    this.until = (Math.floor(hour) + 1) % 24;
  }

  private get options(): string[] {
    return [`Pass the time until ${hourName(this.until)}`, `Guests by the hearth (${this.waiting})`, 'Leave'];
  }

  private get x(): number {
    return Math.round((VIEW_W - W) / 2);
  }

  private get y(): number {
    return Math.round((VIEW_H - H) / 2);
  }

  update(input: Input, dt: number): boolean {
    this.time += dt;
    this.device = input.device;
    if (this.closing || input.pressed('back') || input.pressed('menu')) return false;
    const d = this.nav.step(input, dt);
    if (d?.y) this.sel = Math.max(0, Math.min(this.options.length - 1, this.sel + d.y));
    if (d?.x && this.sel === 0) this.until = (this.until + d.x + 24) % 24;
    if (input.pressed('interact')) this.choose();
    return !this.closing;
  }

  private choose(): void {
    if (this.sel === 0) {
      const why = this.pass(this.until);
      if (why) this.message = { text: why, until: this.time + 2 };
      else this.closing = true;
    } else if (this.sel === 1) {
      this.closing = true;
      this.guests();
    } else this.closing = true;
  }

  pointer(px: number, py: number, button: number): boolean {
    for (let i = 0; i < this.options.length; i++) {
      const ry = this.y + 30 + i * ROW;
      if (px < this.x + 10 || px >= this.x + W - 70 || py < ry || py >= ry + ROW - 2) continue;
      this.sel = i;
      if (button === 0) this.choose();
    }
    if (button === 0 && (px < this.x || py < this.y || px >= this.x + W || py >= this.y + H)) return false;
    return !this.closing;
  }

  draw(r: Renderer): void {
    const { assets } = this;
    r.nine('panel_dark', this.x, this.y, W, H);
    drawText(r, assets, 'The hearth', this.x + 12, this.y + 10);
    this.options.forEach((o, i) => {
      const ry = this.y + 30 + i * ROW;
      r.nine(i === this.sel ? 'slot_selected' : 'slot', this.x + 10, ry, W - 80, ROW - 2);
      drawText(r, assets, o, this.x + 16, ry + 6);
    });
    // the hour chosen, on a clock face
    const night = this.until >= 20 || this.until < 6;
    drawClockFace(r, this.x + W - 36, this.y + 52, 18, this.until * 60, night);
    const msg = this.time < this.message.until;
    const help = msg ? this.message.text : this.sel === 0
      ? `${hint(this.device, [['interact', 'pass the time'], ['back', 'leave']])}   Left / right: the hour`
      : hint(this.device, [['interact', 'choose'], ['back', 'leave']]);
    r.ctx.globalAlpha = msg ? 1 : 0.6;
    drawText(r, assets, help, this.x + Math.max(12, Math.round((W - measure(help)) / 2)), this.y + H - 16);
    r.ctx.globalAlpha = 1;
  }
}
