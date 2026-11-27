import { Assets } from './core/assets';
import { startLoop } from './core/loop';
import { Renderer } from './core/renderer';
import { Game } from './game/game';

async function boot(): Promise<void> {
  const boot = document.getElementById('boot')!;
  try {
    const assets = await Assets.load(import.meta.env.BASE_URL);
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const game = new Game(assets, new Renderer(canvas, assets));
    boot.remove();
    game.stats = startLoop((dt) => game.update(dt), () => game.render());
    (window as unknown as { game: Game }).game = game; // handy in the browser console
  } catch (err) {
    boot.textContent = `Could not start: ${(err as Error).message}`;
    throw err;
  }
}

void boot();
