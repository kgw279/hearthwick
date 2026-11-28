/**
 * Tags at a glance: every course and trait has a small colour-coded icon (sheet "tags"), drawn the same
 * way wherever things are listed: the recipe book, guests' orders, item details.
 */
import type { Renderer } from '../core/renderer';
import type { Content } from '../game/data';

/** Every tag, in the order they're shown: the courses, how things are cooked, how they taste. */
export const TAGS = ['drink', 'snack', 'main', 'dessert', 'baked', 'fried', 'grilled', 'boiled', 'brewed',
  'meaty', 'fishy', 'sweet', 'savory', 'fresh', 'hearty', 'warm'] as const;
export type Tag = (typeof TAGS)[number];

export const TAG_NAMES: Record<Tag, string> = {
  drink: 'Drinks', snack: 'Snacks', main: 'Main dishes', dessert: 'Desserts', baked: 'Baked', fried: 'Fried',
  grilled: 'Grilled', boiled: 'Boiled', brewed: 'Brewed', meaty: 'Meaty', fishy: 'Fishy', sweet: 'Sweet',
  savory: 'Savory', fresh: 'Fresh', hearty: 'Hearty', warm: 'Warm',
};

export const TAG_SIZE = 12;

/** A thing's tags: its course (if it's served), then its traits, in the usual order. */
export function tagsOf(content: Content, id: string): Tag[] {
  const all = new Set<string>([...(content.servable(id) ? [content.course(id)] : []), ...content.traits(id)]);
  return TAGS.filter((t) => all.has(t));
}

export function drawTag(r: Renderer, tag: string, x: number, y: number): void {
  r.sprite(`tag_${tag}`, x, y);
}

/** A row of tag icons from (x, y); returns the width used. */
export function drawTags(r: Renderer, tags: readonly string[], x: number, y: number): number {
  tags.forEach((t, i) => drawTag(r, t, x + i * (TAG_SIZE + 1), y));
  return tags.length * (TAG_SIZE + 1);
}
