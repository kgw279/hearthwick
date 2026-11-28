/**
 * Talking with guests. A guest in the mood to talk (see service.ts) says one thing: small talk, in their
 * folk's way; or a story that wants another round to finish; or, warm and fed, that they're tired and
 * would like a room; or a half-remembered dish from home: something the player doesn't know how to make
 * yet, told vaguely (one thing that goes in it and a hint of another, or two things and no word of how).
 * Nothing is written in the recipe book: the player has to try it at a station, and only working it out
 * teaches it. None of it happens without stopping to talk.
 */
import type { Content } from '../game/data';
import type { Cookbook } from './cookbook';
import type { Guest } from './service';

/** What a talk turns to, by chance: a dish from home, a story (another round), tiredness (a room). */
const TURNS = { dish: 0.2, story: 0.2, tired: 0.2 };
const STORIES = [
  "Did I ever tell you about the time I got lost in the Mosswood? It's a long one...",
  'You should have seen the wedding I came from. Pour me another and I\'ll tell you all of it.',
  "There's a tale about the old mill I've been dying to tell someone.",
];
const TIRED = ['I could fall asleep right here. Have you a bed?', 'My feet are done in. I think I\'ll stay the night.', 'That meal has made me sleepy...'];
const ANOTHER_NIGHT = ['I slept so well, I might stay another night.', 'Do you know, I think I\'ll stay on another night.'];

const SMALL_TALK: Record<string, string[]> = {
  human: ['Lovely place you keep.', 'The road in was muddier than I hoped.', "I hear the mill's wheel squeaks again.", 'Busy day at the market, they say.'],
  dwarf: ['Good stone in these walls.', 'A dwarf could get used to a hearth like that.', "Don't skimp on the ale, I say.", 'Mines are quiet this time of year.'],
  elf: ['The light through your windows is pleasant.', 'I came by the old woods road. Very peaceful.', 'Simple things, done well. That is all I ask.'],
  beetle: ['*clicks happily*', 'Warm in here. Warm is good.', 'So many crumbs in the world, so little time.'],
  frog: ['Ribbit. Damp weather coming, I can feel it.', 'Lovely puddles out on the river road.', 'Croak... pardon me.'],
  minotaur: ['MOO. I mean, hello.', 'Mind the doorframe, it nearly got my horns.', 'A big appetite needs a big plate!'],
};

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

/**
 * What a guest in the mood to talk says (one thing; noted with their visit), and what it leads to:
 * another round, or a room. rooms: whether the inn has guest rooms.
 */
export function talk(g: Guest, content: Content, book: Cookbook, rooms: boolean, rng = Math.random): { line: string; then?: 'round' | 'room' } {
  const chat = SMALL_TALK[g.folk] ?? SMALL_TALK.human;
  const settled = g.state === 'settled';
  const r = rng();
  let line = '';
  let then: 'round' | 'room' | undefined;
  let food = false;
  if (r < TURNS.dish) {
    const recipe = unknownRecipe(content, book, rng);
    if (recipe) {
      line = hint(content, recipe, rng);
      food = true;
    }
  } else if (r < TURNS.dish + TURNS.story && !settled) {
    line = pick(STORIES, rng);
    then = 'round';
  } else if (r < TURNS.dish + TURNS.story + TURNS.tired && rooms) {
    line = pick(settled ? ANOTHER_NIGHT : TIRED, rng);
    then = 'room';
  }
  if (!line) line = pick(chat, rng);
  g.said.push({ line, food });
  return { line, then };
}
