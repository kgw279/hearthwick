import { defineConfig, type Plugin } from 'vite';
import { readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Ship only what the game loads: atlas.json, gamedata.json and the sheet images atlas.json names.
 * Everything else the art pipeline writes to ../dist (mockups, previews, path maps) stays out of the build.
 */
function onlyGameAssets(): Plugin {
  let outDir = '';
  return {
    name: 'only-game-assets',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const atlas = JSON.parse(readFileSync(join(outDir, 'atlas.json'), 'utf8'));
      const sheets = { ...atlas.sheets, ...atlas.ui } as Record<string, { image: string }>;
      const keep = new Set(['atlas.json', 'gamedata.json', 'index.html', ...Object.values(sheets).map((s) => s.image)]);
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          const rel = relative(outDir, full).split('\\').join('/');
          if (rel === 'assets') continue; // the engine's own bundled code
          if (statSync(full).isDirectory()) walk(full);
          else if (!keep.has(rel)) rmSync(full);
        }
        if (dir !== outDir && readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
      };
      walk(outDir);
    },
  };
}

// The art pipeline writes everything to ../dist; the engine serves it as static assets.
// BASE_PATH is set by the GitHub Pages workflow (the site lives at /<repo>/); locally it is '/'.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  publicDir: '../dist',
  server: { open: true },
  build: { outDir: 'build', emptyOutDir: true },
  plugins: [onlyGameAssets()],
});
