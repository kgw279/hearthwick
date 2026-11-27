import { defineConfig, type Plugin } from 'vite';
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Ship only what the game loads: atlas.json, gamedata.json, terrain.json and the sheet images atlas.json names.
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
      const keep = new Set(['atlas.json', 'gamedata.json', 'terrain.json', 'index.html', ...Object.values(sheets).map((s) => s.image)]);
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

/**
 * Dev server only: lets the layout editor save maps. POST /__maps/<id> with the file's text writes
 * src/maps/<id>.json. Maps are also kept out of hot reload, so saving doesn't restart the game you're editing
 * (edit a JSON file by hand and refresh the page to see it).
 */
function mapSaving(): Plugin {
  const dir = join(__dirname, 'src', 'maps');
  return {
    name: 'map-saving',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__maps/', (req, res) => {
        const id = decodeURIComponent((req.url ?? '').replace(/^\//, ''));
        if (req.method !== 'POST' || !/^[a-z0-9_]+$/.test(id)) {
          res.statusCode = 400;
          res.end('Bad map id');
          return;
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body) as { id?: string };
            if (parsed.id !== id) throw new Error('id mismatch');
            writeFileSync(join(dir, `${id}.json`), body);
            res.end('ok');
          } catch (err) {
            res.statusCode = 400;
            res.end((err as Error).message);
          }
        });
      });
    },
    handleHotUpdate(ctx) {
      if (ctx.file.startsWith(dir)) return [];
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
  plugins: [onlyGameAssets(), mapSaving()],
});
