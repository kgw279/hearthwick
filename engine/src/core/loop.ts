/**
 * Fixed-timestep game loop: the game updates exactly STEP seconds at a time (so movement and animation
 * behave the same on every machine) and renders once per display frame. render() receives alpha, how
 * far we are between the last game step and the next (0..1), so moving things can be drawn
 * interpolated; that keeps motion smooth on 120/144 Hz monitors instead of stuttering.
 */

export const STEP = 1 / 60;
const MAX_STEPS = 5; // after a long stall, drop time rather than spiral

export interface LoopStats { fps: number }

export function startLoop(update: (dt: number) => void, render: (alpha: number) => void): LoopStats {
  const stats: LoopStats = { fps: 0 };
  let acc = 0;
  let last = performance.now();
  let fpsTime = 0;
  let fpsFrames = 0;

  const tick = (now: number) => {
    const elapsed = Math.min((now - last) / 1000, 0.25);
    last = now;
    acc += elapsed;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS) {
      update(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) acc = 0;
    render(acc / STEP);

    fpsTime += elapsed;
    fpsFrames++;
    if (fpsTime >= 0.5) {
      stats.fps = Math.round(fpsFrames / fpsTime);
      fpsTime = 0;
      fpsFrames = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return stats;
}
