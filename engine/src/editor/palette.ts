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

/** Groups: which atlas sheets they draw from and how their items are placed by default. */
const GROUPS: Array<{ name: string; sheets: string[]; template: Template; people?: boolean }> = [
  { name: 'Furniture', sheets: ['furniture', 'interior', 'stairs', 'tableware'], template: {} },
  { name: 'Kitchen', sheets: ['stations', 'animated'], template: { place: 'wall' } },
  { name: 'Town', sheets: ['props', 'buildings', 'farm', 'carts', 'wagons', 'wagons_ns'], template: {} },
  { name: 'People', sheets: ['characters', 'guests', 'actions'], template: { collider: 'npc' }, people: true },
  { name: 'Animals', sheets: ['animals', 'ambient'], template: {}, people: true },
  { name: 'Food', sheets: ['food'], template: { collider: null } },
];

export function buildPalette(assets: Assets, content: Content): Category[] {
  const bySheet = new Map(assets.sheets.map((s) => [s.name, s]));
  const out: Category[] = [];
  for (const g of GROUPS) {
    const items: PaletteItem[] = [];
    for (const name of g.sheets) {
      const s = bySheet.get(name);
      if (!s) continue;
      const inAnim = new Set(s.animations.flatMap((a) => assets.animation(a)));
      for (const a of s.animations) {
        if (g.people && /walk|run/.test(a)) continue; // a walk cycle on the spot looks wrong
        items.push({ name: a, prop: { ...g.template, sprite: `anim:${a}`, x: 0, y: 0, fps: 4 } });
      }
      for (const f of s.frames) {
        if (inAnim.has(f) && !(g.people && f.endsWith('_idle'))) continue;
        items.push({ name: f, prop: { ...g.template, sprite: f, x: 0, y: 0 } });
      }
    }
    if (items.length) out.push({ name: g.name, items });
  }
  // harvestable forage and the shops come from gamedata, with their behaviors attached
  out.push({
    name: 'Forage',
    items: Object.keys(content.forageNodes).map((n) => ({ name: n, prop: { x: 0, y: 0, collider: 'forage', behavior: { type: 'forage', node: n } } })),
  });
  out.push({
    name: 'Shops',
    items: Object.keys(content.shops).filter((id) => content.shops[id].building).map((id) => ({
      name: id,
      prop: {
        x: 0, y: 0, dx: -16, collider: { x: 4, y: 30, w: 56, h: 30 }, sortOffset: 60, use: { x: 16, y: 54, w: 32, h: 22 },
        behavior: { type: 'shop', shop: id },
      },
    })),
  });
  return out;
}
