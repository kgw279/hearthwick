/**
 * Input. Keyboard and Xbox controller are both turned into the same game actions, so game code only
 * ever asks things like "was interact pressed?". Also tracks which device was used last, so on-screen
 * prompts can show the right glyph (A button vs. E key).
 */

export type Action =
  | 'up' | 'down' | 'left' | 'right'
  | 'walk_up' | 'walk_down' | 'walk_left' | 'walk_right' // WASD only: walking while the D-pad / arrows nudge
  | 'nudge_up' | 'nudge_down' | 'nudge_left' | 'nudge_right' // D-pad and arrow keys
  | 'interact' | 'back' | 'cook' | 'recipes'
  | 'tab_prev' | 'tab_next' | 'cat_prev' | 'cat_next' | 'menu' | 'map' | 'debug' | 'edit' | 'zoom';

export type Device = 'keyboard' | 'gamepad';

const KEYBOARD: Record<string, Action[]> = {
  KeyW: ['up', 'walk_up'], ArrowUp: ['up', 'nudge_up'], KeyS: ['down', 'walk_down'], ArrowDown: ['down', 'nudge_down'],
  KeyA: ['left', 'walk_left'], ArrowLeft: ['left', 'nudge_left'], KeyD: ['right', 'walk_right'], ArrowRight: ['right', 'nudge_right'],
  KeyE: ['interact'], Space: ['interact'], Enter: ['interact'],
  Escape: ['back'], KeyF: ['cook'], KeyR: ['recipes'],
  KeyQ: ['tab_prev'], KeyC: ['tab_next'], Tab: ['menu'], KeyI: ['menu'], KeyM: ['map'], F3: ['debug'],
  KeyZ: ['cat_prev'], KeyX: ['cat_next'], F2: ['edit'], Digit1: ['zoom'],
};

// Standard gamepad mapping (what browsers report for an Xbox controller).
const PAD_BUTTONS: Record<number, Action[]> = {
  0: ['interact'], 1: ['back'], 2: ['cook'], 3: ['recipes'],
  4: ['tab_prev'], 5: ['tab_next'], 6: ['cat_prev'], 7: ['cat_next'], 8: ['map'], 9: ['menu'], 10: ['edit'], 11: ['zoom'],
  12: ['up', 'nudge_up'], 13: ['down', 'nudge_down'], 14: ['left', 'nudge_left'], 15: ['right', 'nudge_right'],
};

/** Sprite to show for an action on each device (frames from atlas.json ui sheets). */
const GLYPHS: Record<Device, Partial<Record<Action, string>>> = {
  gamepad: {
    interact: 'xb_a', back: 'xb_b', cook: 'xb_x', recipes: 'xb_y', tab_prev: 'xb_lb', tab_next: 'xb_rb',
    cat_prev: 'xb_lt', cat_next: 'xb_rt', edit: 'xb_ls', zoom: 'xb_rs', menu: 'xb_menu', map: 'xb_view', up: 'xb_dpad_up', down: 'xb_dpad_down', left: 'xb_dpad_left', right: 'xb_dpad_right',
  },
  keyboard: {
    interact: 'key_e', back: 'key_esc', cook: 'key_f', recipes: 'key_r', tab_prev: 'key_q', tab_next: 'key_c',
    cat_prev: 'key_z', cat_next: 'key_x', zoom: 'key_1', menu: 'key_tab', map: 'key_m', up: 'key_w', down: 'key_s', left: 'key_a', right: 'key_d',
  },
};

const STICK_DEADZONE = 0.25;

export class Input {
  device: Device = 'keyboard';
  private readonly keys = new Set<string>();
  /** Keys pressed since the last update, so a tap shorter than one tick is never missed. */
  private readonly tapped = new Set<string>();
  private now = new Set<Action>();
  private prev = new Set<Action>();
  private stick = { x: 0, y: 0 };
  private rstick = { x: 0, y: 0 };

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (KEYBOARD[e.code]) e.preventDefault();
      if (!e.repeat) this.tapped.add(e.code);
      this.keys.add(e.code);
      this.device = 'keyboard';
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    // The browser's right-click menu would take the key-ups of any keys held while it's open, leaving
    // them stuck down: the game never shows it. (Hiding the page drops held keys for the same reason.)
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => this.keys.clear());
  }

  /** Call once per fixed update, before game logic. */
  update(): void {
    this.prev = this.now;
    this.now = new Set();
    for (const code of this.keys) for (const a of KEYBOARD[code] ?? []) this.now.add(a);
    for (const code of this.tapped) for (const a of KEYBOARD[code] ?? []) this.now.add(a);
    this.tapped.clear();

    this.stick = { x: 0, y: 0 };
    this.rstick = { x: 0, y: 0 };
    const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p && p.connected);
    if (pad) {
      let used = false;
      pad.buttons.forEach((b, i) => {
        if (b.pressed) {
          for (const a of PAD_BUTTONS[i] ?? []) this.now.add(a);
          used = true;
        }
      });
      const [ax = 0, ay = 0] = pad.axes;
      const mag = Math.hypot(ax, ay);
      if (mag > STICK_DEADZONE) {
        const k = Math.min(1, (mag - STICK_DEADZONE) / (1 - STICK_DEADZONE)) / mag;
        this.stick = { x: ax * k, y: ay * k };
        used = true;
      }
      const [, , rx = 0, ry = 0] = pad.axes;
      if (Math.hypot(rx, ry) > STICK_DEADZONE) {
        this.rstick = { x: rx, y: ry };
        used = true;
      }
      if (used) this.device = 'gamepad';
    }
  }

  down(a: Action): boolean {
    return this.now.has(a);
  }

  /** True only on the update where the action went from up to down. */
  pressed(a: Action): boolean {
    return this.now.has(a) && !this.prev.has(a);
  }

  /**
   * Movement as a vector with length <= 1 (analog stick, or D-pad/keys normalised). walkOnly leaves the
   * D-pad and arrow keys out (they're nudging something): just the left stick and WASD.
   */
  move(walkOnly = false): { x: number; y: number } {
    if (this.stick.x || this.stick.y) return this.stick;
    const d = walkOnly ? this.axes('walk_') : this.digital();
    const len = Math.hypot(d.x, d.y) || 1;
    return { x: d.x / len, y: d.y / len };
  }

  /** The left stick alone (zero inside the dead zone). */
  analog(): { x: number; y: number } {
    return this.stick;
  }

  /** The right stick (zero inside the dead zone). */
  rightStick(): { x: number; y: number } {
    return this.rstick;
  }

  /** D-pad / arrow keys / WASD alone, each axis -1, 0 or 1. */
  digital(): { x: number; y: number } {
    return this.axes('');
  }

  /** The D-pad / arrow keys alone, each axis -1, 0 or 1. */
  nudge(): { x: number; y: number } {
    return this.axes('nudge_');
  }

  private axes(pre: '' | 'walk_' | 'nudge_'): { x: number; y: number } {
    const on = (d: 'up' | 'down' | 'left' | 'right') => (this.down(`${pre}${d}` as Action) ? 1 : 0);
    return { x: on('right') - on('left'), y: on('down') - on('up') };
  }

  glyph(a: Action): string {
    return GLYPHS[this.device][a] ?? GLYPHS.keyboard[a] ?? 'key_e';
  }
}
