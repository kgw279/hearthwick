/**
 * The time of day. A day passes in about 24 minutes of play (a game minute a second), quicker through
 * the small hours when the inn is quiet. Days start (for shops' fresh stock, and guests checking out)
 * at dawn. Pure state; the light it casts is worked out here too, for the game to draw.
 */
export const MINUTES_PER_SECOND = 1;
const NIGHT_HURRY = 4; // the small hours pass this much faster, while nobody's at the tables
export const DAWN = 6; // hour a new day begins
const START = 7 * 60; // the first day starts at seven in the morning

export class Clock {
  /** Game minutes since midnight before the first day. */
  minutes = START;

  /** The day, counted from 1 (a day runs dawn to dawn). */
  get day(): number {
    return Math.floor((this.minutes - DAWN * 60) / 1440) + 1;
  }

  /** The hour, with its fraction (13.5 is half past one in the afternoon). */
  get hour(): number {
    return (this.minutes % 1440) / 60;
  }

  /** The small hours: nobody comes in, and the shops are shut. */
  get night(): boolean {
    const h = this.hour;
    return h >= 23 || h < DAWN;
  }

  /** Advance; quiet: nothing's going on at the inn (then the night hurries by). */
  update(dt: number, quiet: boolean): void {
    this.minutes += dt * MINUTES_PER_SECOND * (this.night && quiet ? NIGHT_HURRY : 1);
  }

  /** "7:05 am". */
  get time(): string {
    const m = Math.floor(this.minutes % 1440);
    const h = Math.floor(m / 60);
    const h12 = h % 12 || 12;
    return `${h12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  }

  /** Whether it's within opening hours [open, close) (24-hour clock). */
  within([open, close]: [number, number]): boolean {
    const h = this.hour;
    return h >= open && h < close;
  }

  /**
   * The light over the world: a colour laid over it and how strongly. Clear by day; warm at dusk and
   * dawn; deep blue at night (outdoors more than in, where the lamps are lit).
   */
  light(indoors: boolean): { color: string; alpha: number } {
    const h = this.hour;
    // [hour, colour, strength]: the colour fades in and out with its strength, so day stays clear
    const keys: Array<[number, [number, number, number], number]> = [
      [0, [11, 15, 46], 0.55], [4.5, [11, 15, 46], 0.55], [6, [255, 154, 90], 0.18], [7.5, [255, 154, 90], 0],
      [17, [255, 138, 61], 0], [19, [255, 138, 61], 0.2], [20.5, [42, 31, 74], 0.4], [22, [11, 15, 46], 0.55], [24, [11, 15, 46], 0.55],
    ];
    const i = keys.findIndex(([k]) => k > h);
    const [h0, c0, a0] = keys[i - 1];
    const [h1, c1, a1] = keys[i];
    const t = (h - h0) / (h1 - h0);
    const mix = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
    const alpha = (a0 + (a1 - a0) * t) * (indoors ? 0.55 : 1);
    return { color: `rgb(${mix.join(',')})`, alpha };
  }

  /** How busy the inn is at this time of day, for how often guests come in (0: nobody comes). */
  get busy(): number {
    const h = this.hour;
    if (this.night) return 0;
    if (h < 7) return 0.3;
    if (h < 10) return 0.8; // breakfast
    if (h < 11.5) return 0.5;
    if (h < 14) return 1.4; // lunch
    if (h < 17) return 0.6;
    if (h < 21) return 1.6; // supper
    return 0.8; // a nightcap
  }
}
