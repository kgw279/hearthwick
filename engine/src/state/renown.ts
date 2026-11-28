/**
 * How much renown a guest's visit earns the inn: a list of rules, each looking at the meal they had and
 * giving points (or taking them) with a reason. The total is the visit's renown (never below nothing).
 * To weigh something new (a clean table, the inn's comfort, a festival...), add a rule here: each is a
 * small function of the visit, and the reasons show in the journal. A very bad visit can come to less
 * than nothing, and takes renown away.
 *
 * Tuning: the numbers at the top of each rule. A plain meal (a fried egg, a cup of milk) earns little or
 * nothing; an interesting one, well matched, brought promptly, what they asked for, earns well.
 */
import { COURSES, type Content } from '../game/data';
import type { Guest, Served } from './service';

export interface Award { why: string; points: number }

export interface Visit {
  guest: Guest;
  content: Content;
  /** What the inn has served lately (latest last), not counting this visit. */
  recent: string[];
  /** Whether they got what they quietly craved. */
  craved: boolean;
}

export type RenownRule = (v: Visit) => Award[];

/** What they had, course by course. */
const served = (v: Visit): Served[] => COURSES.map((c) => v.guest.got[c]).filter((s): s is Served => !!s);
const name = (v: Visit, id: string) => v.content.itemName(id);

/** The prep behind each thing: a dish of several steps is worth more than an apple. */
const complexity: RenownRule = (v) => served(v)
  .map((s) => ({ why: name(v, s.dish), points: Math.max(0, v.content.complexity(s.dish) - 1) }))
  .filter((a) => a.points > 0);

/**
 * Getting what they asked for: something in particular, more than something of a kind. Something else
 * in its place costs a little; the wrong course altogether, more.
 */
const asked: RenownRule = (v) => {
  const out: Award[] = [];
  for (const c of COURSES) {
    const w = v.guest.order[c];
    const got = v.guest.got[c];
    if (!w || !got) continue;
    if (got.fit === 'wrong course') out.push({ why: `${name(v, got.dish)} wasn't the ${c} they wanted`, points: -2 });
    else if (got.fit === 'not asked') out.push({ why: `Not the ${c} they asked for`, points: -1 });
    else if (w.dish) out.push({ why: 'Just what they asked for', points: 2 });
    else if (w.trait) out.push({ why: `Just the ${w.trait} ${c} they wanted`, points: 1 });
  }
  return out;
};

/** What they quietly craved (their folk's tastes): delighted to get it. */
const craving: RenownRule = (v) => (v.craved ? [{ why: `Loved how ${v.guest.craving} it was`, points: 2 }] : []);

/** A proper meal: several courses together, and things that go together (sharing a taste). */
const pairing: RenownRule = (v) => {
  const s = served(v);
  const out: Award[] = [];
  if (s.length >= 3) out.push({ why: 'A proper spread', points: 2 });
  else if (s.length === 2) out.push({ why: 'A proper meal', points: 1 });
  const tags = s.map((x) => new Set(v.content.dishTags(x.dish)));
  const shared = tags.length >= 2 && [...tags[0]].some((t) => tags.slice(1).some((o) => o.has(t)));
  if (shared) out.push({ why: 'Well matched', points: 1 });
  return out;
};

/** Their folk's tastes: something they love, or something they can't abide. */
const taste: RenownRule = (v) => {
  const folk = v.content.folk[v.guest.folk];
  if (!folk) return [];
  const out: Award[] = [];
  for (const s of served(v)) {
    const tags = v.content.dishTags(s.dish);
    if (folk.hates && tags.includes(folk.hates)) out.push({ why: `Not to a ${folk.name}'s taste`, points: -1 });
    else if (tags.some((t) => folk.likes.includes(t))) out.push({ why: `A ${folk.name} favourite`, points: 1 });
  }
  return out.slice(0, 3);
};

/** How promptly things came: soon after they sat down is good; a long wait is remembered. */
const PROMPT = 90; // seconds
const SLOW = 420;
const speed: RenownRule = (v) => {
  const s = served(v);
  if (!s.length) return [];
  const wait = s.reduce((n, x) => n + (x.after ?? 0), 0) / s.length;
  if (wait <= PROMPT) return [{ why: 'Served promptly', points: 1 }];
  if (wait >= SLOW) return [{ why: 'A long wait', points: -1 }];
  return [];
};

/** The same dish over and over: folk start to talk about it, and not kindly. */
const SAME_AGAIN = 3; // times in the inn's recent servings
const variety: RenownRule = (v) => served(v)
  .filter((s) => v.recent.filter((r) => r === s.dish).length >= SAME_AGAIN)
  .map((s) => ({ why: `${name(v, s.dish)} again?`, points: -1 }));

/** Sitting beside someone else's dirty dishes. */
const MESSY = 10; // seconds
const tidiness: RenownRule = (v) => (v.guest.mess > MESSY ? [{ why: 'Dirty dishes left on the table', points: -1 }] : []);

/** Every rule that weighs a visit, in the order their reasons are listed. */
export const RENOWN_RULES: RenownRule[] = [complexity, asked, craving, pairing, taste, speed, variety, tidiness];

/** A visit's renown (which can be below nothing) and each rule's say. */
export function renownFor(v: Visit): { total: number; awards: Award[] } {
  const awards = RENOWN_RULES.flatMap((rule) => rule(v));
  return { total: awards.reduce((n, a) => n + a.points, 0), awards };
}
