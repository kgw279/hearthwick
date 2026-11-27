/**
 * The editor's palette: everything placeable, grouped the way you'd look for it. Built from the atlas
 * and gamedata at startup, so new art and new forage or shops show up without touching the editor.
 */
import type { Assets } from '../core/assets';
import type { Content } from '../game/data';
import type { PlacedProp } from '../world/layout';

export interface PaletteItem { name: string; prop: PlacedProp }
export interface Category { name: string; items: PaletteItem[] }

type Template = Omit<PlacedProp, 'x' | 'y' | 'sprite'>;

/** Art that lies on the floor (no collider, drawn under everything standing). */
const FLOOR = /rug|runner|mat\b|doormat|carpet|^stairs_/;
/** Art that hangs on a wall (no collider, drawn over the wall). */
const WALL = /^deco_|^wall_|^shelf_jars$/;
/** Furniture built to stand against a wall: a shallow footprint, so it sits right up against the wall face. */
const BACKED = /fireplace|oven|bookshelf|cupboard|wardrobe/;
const BACKED_DEPTH = 6;

/** How an item from the art is placed by default: its layer, or a shallow footprint for wall-backed furniture. */
function placement(name: string): Partial<PlacedProp> {
  if (FLOOR.test(name)) return { layer: 'floor' };
  if (WALL.test(name)) return { layer: 'wall' };
  if (BACKED.test(name)) return { depth: BACKED_DEPTH };
  return {};
}

/** Groups: which atlas sheets they draw from and how their items are placed by default. */
const GROUPS: Array<{ name: string; sheets: string[]; template: Template; living?: boolean }> = [
  { name: 'Furniture', sheets: ['furniture', 'interior', 'stairs', 'tableware'], template: {} },
  { name: 'Kitchen', sheets: ['stations', 'animated'], template: {} },
  { name: 'Town', sheets: ['props', 'buildings', 'farm', 'carts', 'wagons', 'wagons_ns'], template: {} },
  { name: 'Animals', sheets: ['animals', 'ambient'], template: {}, living: true },
  { name: 'Food', sheets: ['food'], template: { collider: null } },
];

export function buildPalette(assets: Assets, content: Content): Category[] {
  const bySheet = new Map(assets.sheets.map((s) => [s.name, s]));
  const out: Category[] = [];
  const decor: PaletteItem[] = []; // filled as the groups are read; shown right after Furniture
  for (const g of GROUPS) {
    const items: PaletteItem[] = [];
    for (const name of g.sheets) {
      const s = bySheet.get(name);
      if (!s) continue;
      const inAnim = new Set(s.animations.flatMap((a) => assets.animation(a)));
      for (const a of s.animations) {
        if (g.living && /walk|run/.test(a)) continue; // a walk cycle on the spot looks wrong
        items.push({ name: a, prop: { ...g.template, ...placement(a), sprite: `anim:${a}`, x: 0, y: 0, fps: 4 } });
      }
      for (const f of s.frames) {
        if (inAnim.has(f) && !(g.living && f.endsWith('_idle'))) continue;
        items.push({ name: f, prop: { ...g.template, ...placement(f), sprite: f, x: 0, y: 0 } });
      }
    }
    // floor and wall pieces (rugs, stairs, pictures, windows, shelves) go in a tab of their own
    decor.push(...items.filter((it) => it.prop.layer));
    const standing = items.filter((it) => !it.prop.layer);
    if (standing.length) out.push({ name: g.name, items: standing });
    if (g.name === 'Furniture') out.push({ name: 'Decor', items: decor });
  }
  // harvestable forage and the shops come from gamedata, with their behaviors attached
  out.push({
    name: 'Forage',
    items: Object.keys(content.forageNodes).map((n) => ({ name: n, prop: { x: 0, y: 0, collider: 'forage', behavior: { type: 'forage', node: n } } })),
  });
  out.push({
    name: 'Counters',
    items: Object.keys(content.shops).map((id) => ({
      name: `${id} counter`,
      prop: { sprite: 'bar_counter', x: 0, y: 0, behavior: { type: 'shop', shop: id } },
    })),
  });
  out.push({
    name: 'Shops',
    items: Object.keys(content.shops).filter((id) => content.shops[id].building).map((id) => ({
      name: id,
      prop: {
        x: 0, y: 0, collider: { x: 4, y: 30, w: 56, h: 30 }, sortOffset: 60, use: { x: 16, y: 54, w: 32, h: 22 },
        behavior: { type: 'shop', shop: id },
      },
    })),
  });
  return out;
}
