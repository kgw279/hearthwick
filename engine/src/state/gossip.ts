/**
 * Talking with guests. Mostly small talk, in their folk's way; now and then (and only once a guest) a
 * half-remembered dish from home: something the player doesn't know how to make yet, told vaguely (one
 * thing that goes in it and a hint of another, or two things and no word of how). Nothing is written in
 * the recipe book: the player has to try it out at a station, and only working it out teaches it.
 */
import type { Content } from '../game/data';
import type { Cookbook } from './cookbook';
import type { Guest } from './service';

const HINT_CHANCE = 0.08; // a guest who's not told one yet: the chance a chat turns to food from home
const MOST_TALKS = 3; // after this many, they've said what they have to say

const SMALL_TALK: Record<string, string[]> = {
  human: ['Lovely place you keep.', 'The road in was muddier than I hoped.', "I hear the mill's wheel squeaks again.", 'Busy day at the market, they say.'],
  dwarf: ['Good stone in these walls.', 'A dwarf could get used to a hearth like that.', "Don't skimp on the ale, I say.", 'Mines are quiet this time of year.'],
  elf: ['The light through your windows is pleasant.', 'I came by the old woods road. Very peaceful.', 'Simple things, done well. That is all I ask.'],
  beetle: ['*clicks happily*', 'Warm in here. Warm is good.', 'So many crumbs in the world, so little time.'],
  frog: ['Ribbit. Damp weather coming, I can feel it.', 'Lovely puddles out on the river road.', 'Croak... pardon me.'],
  minotaur: ['MOO. I mean, hello.', 'Mind the doorframe, it nearly got my horns.', 'A big appetite needs a big plate!'],
};
const FAREWELL = ['Anyway, I mustn\'t keep you.', "Don't let me keep you from your work.", 'Listen to me go on!'];

/** A thing's name, lowercased, for speech. */
const named = (c: Content, id: string) => c.itemName(id).toLowerCase();
const pick = <T>(list: T[], rng: () => number): T => list[Math.floor(rng() * list.length)];

/** A dish or prepared thing the player can't make yet, with what goes in it and where it's made. */
function unknownRecipe(content: Content, book: Cookbook, rng: () => number): { out: string; inputs: string[]; station: string } | null {
  const all: Array<{ out: string; inputs: string[]; station: string }> = [];
  for (const station of Object.keys(content.stations)) {
    const list = station === 'plate'
      ? Object.keys(content.dishes).map((d) => ({ out: d, inputs: content.dish(d).components }))
      : content.recipesAt(station);
    for (const r of list) if (r.inputs.length >= 2 && !book.knows(station, r.out, r.inputs)) all.push({ ...r, station });
  }
  return all.length ? pick(all, rng) : null;
}

/** A vague telling of a recipe: never all of it. */
function hint(content: Content, r: { out: string; inputs: string[]; station: string }, rng: () => number): string {
  const [a, b] = [...new Set(r.inputs)].sort(() => rng() - 0.5);
  const kind = b ? content.traits(b)[0] ?? content.items[b]?.tags[0] : undefined;
  const place = r.station === 'plate' ? 'on a plate' : `at the ${content.stations[r.station].name.toLowerCase()}`;
  const forms = [
    `Back home we'd make something with ${named(content, a)}${kind ? ` and something ${kind}` : ''} ${place}. Can't recall the rest.`,
    `Ever tried ${named(content, a)} with ${b ? named(content, b) : 'a little something'}? My gran swore by it.`,
    `The best thing I ever ate had ${named(content, a)} in it... ${r.station === 'plate' ? 'all together on one plate' : `done ${place}`}, I think.`,
  ];
  return pick(forms, rng);
}

/** What a guest says when the player stops to talk (and it's noted with their visit). */
export function talk(g: Guest, content: Content, book: Cookbook, rng = Math.random): string {
  if (g.said.length >= MOST_TALKS) return pick(FAREWELL, rng);
  const chat = SMALL_TALK[g.folk] ?? SMALL_TALK.human;
  const r = !g.said.some((s) => s.food) && rng() < HINT_CHANCE ? unknownRecipe(content, book, rng) : null;
  const line = r ? hint(content, r, rng) : pick(chat.filter((s) => !g.said.some((x) => x.line === s)), rng) ?? pick(FAREWELL, rng);
  g.said.push({ line, food: !!r });
  return line;
}
