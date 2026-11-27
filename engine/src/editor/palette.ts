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
/** Art that sits on top of furniture: place settings and things set on a table. */
const TOP = /^place_setting|^salt_cellar|^pepper_mill/;
/** Containers, and how many slots of storage each holds. */
const STORAGE: Record<string, number> = { crate: 8, barrel: 6, barrel_stack: 12, chest: 12, cupboard: 12, wardrobe: 16 };
/** Old art no longer offered: tables with the dishes drawn on (tables are bare now, with place settings set on them). */
const RETIRED = /^dining_table/;

/**
 * How an item from the art is placed by default: its layer, and what it does (a container gets its
 * storage; its id is given when it's placed, see the editor).
 */
function placement(name: string): Partial<PlacedProp> {
  if (FLOOR.test(name)) return { layer: 'floor' };
  if (WALL.test(name)) return { layer: 'wall' };
  if (TOP.test(name)) return { layer: 'top' };
  if (name in STORAGE) return { behavior: { type: 'storage', id: '', slots: STORAGE[name] } };
  if (name === 'wash_tub') return { behavior: { type: 'wash' } };
  return {};
}

/** Groups: which atlas sheets they draw from and how their items are placed by default. */
const GROUPS: Array<{ name: string; sheets: string[]; template: Template; living?: boolean }> = [
  { name: 'Furniture', sheets: ['furniture', 'interior', 'stairs', 'tableware'], template: {} },
  { name: 'Tables', sheets: ['tables', 'chairs'], template: {} },
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
        if (RETIRED.test(f)) continue;
        items.push({ name: f, prop: { ...g.template, ...placement(f), sprite: f, x: 0, y: 0 } });
      }
    }
    // floor and wall pieces (rugs, stairs, pictures, windows, shelves) go in a tab of their own;
    // things set on tables stay with the tables
    const isDecor = (it: PaletteItem) => it.prop.layer === 'floor' || it.prop.layer === 'wall';
    decor.push(...items.filter(isDecor));
    const standing = items.filter((it) => !isDecor(it));
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
