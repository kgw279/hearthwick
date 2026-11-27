/**
 * Fixed-timestep game loop: the game updates exactly STEP seconds at a time (so movement and animation
 * behave the same on every machine) and renders once per display frame.
 */

export const STEP = 1 / 60;
const MAX_STEPS = 5; // after a long stall, drop time rather than spiral

export interface LoopStats { fps: number }

export function startLoop(update: (dt: number) => void, render: () => void): LoopStats {
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
    render();

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
