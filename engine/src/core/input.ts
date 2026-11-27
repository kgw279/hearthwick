/**
 * Input. Keyboard and Xbox controller are both turned into the same game actions, so game code only
 * ever asks things like "was interact pressed?". Also tracks which device was used last, so on-screen
 * prompts can show the right glyph (A button vs. E key).
 */

export type Action =
  | 'up' | 'down' | 'left' | 'right'
  | 'interact' | 'back' | 'cook' | 'recipes'
  | 'tab_prev' | 'tab_next' | 'cat_prev' | 'cat_next' | 'menu' | 'map' | 'debug' | 'edit';

export type Device = 'keyboard' | 'gamepad';

const KEYBOARD: Record<string, Action[]> = {
  KeyW: ['up'], ArrowUp: ['up'], KeyS: ['down'], ArrowDown: ['down'],
  KeyA: ['left'], ArrowLeft: ['left'], KeyD: ['right'], ArrowRight: ['right'],
  KeyE: ['interact'], Space: ['interact'], Enter: ['interact'],
  Escape: ['back'], KeyF: ['cook'], KeyR: ['recipes'],
  KeyQ: ['tab_prev'], KeyC: ['tab_next'], Tab: ['menu'], KeyM: ['map'], F3: ['debug'],
  KeyZ: ['cat_prev'], KeyX: ['cat_next'], F2: ['edit'],
};

// Standard gamepad mapping (what browsers report for an Xbox controller).
const PAD_BUTTONS: Record<number, Action[]> = {
  0: ['interact'], 1: ['back'], 2: ['cook'], 3: ['recipes'],
  4: ['tab_prev'], 5: ['tab_next'], 6: ['cat_prev'], 7: ['cat_next'], 8: ['map'], 9: ['menu'], 10: ['edit'],
  12: ['up'], 13: ['down'], 14: ['left'], 15: ['right'],
};

/** Sprite to show for an action on each device (frames from atlas.json ui sheets). */
const GLYPHS: Record<Device, Partial<Record<Action, string>>> = {
  gamepad: {
    interact: 'xb_a', back: 'xb_b', cook: 'xb_x', recipes: 'xb_y', tab_prev: 'xb_lb', tab_next: 'xb_rb',
    cat_prev: 'xb_lt', cat_next: 'xb_rt', edit: 'xb_ls', menu: 'xb_menu', map: 'xb_view', up: 'xb_dpad_up', down: 'xb_dpad_down', left: 'xb_dpad_left', right: 'xb_dpad_right',
  },
  keyboard: {
    interact: 'key_e', back: 'key_esc', cook: 'key_f', recipes: 'key_r', tab_prev: 'key_q', tab_next: 'key_c',
    cat_prev: 'key_z', cat_next: 'key_x', menu: 'key_tab', map: 'key_m', up: 'key_w', down: 'key_s', left: 'key_a', right: 'key_d',
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

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (KEYBOARD[e.code]) e.preventDefault();
      if (!e.repeat) this.tapped.add(e.code);
      this.keys.add(e.code);
      this.device = 'keyboard';
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Call once per fixed update, before game logic. */
  update(): void {
    this.prev = this.now;
    this.now = new Set();
    for (const code of this.keys) for (const a of KEYBOARD[code] ?? []) this.now.add(a);
    for (const code of this.tapped) for (const a of KEYBOARD[code] ?? []) this.now.add(a);
    this.tapped.clear();

    this.stick = { x: 0, y: 0 };
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

  /** Movement as a vector with length <= 1 (analog stick, or D-pad/keys normalised). */
  move(): { x: number; y: number } {
    if (this.stick.x || this.stick.y) return this.stick;
    const x = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
    const y = (this.down('down') ? 1 : 0) - (this.down('up') ? 1 : 0);
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }

  glyph(a: Action): string {
    return GLYPHS[this.device][a] ?? GLYPHS.keyboard[a] ?? 'key_e';
  }
}
