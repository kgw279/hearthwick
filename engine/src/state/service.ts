/**
 * Serving guests. Pure state, no drawing.
 *
 * The "ready" slots (four) are what the player has to hand for serving: dishes and drinks plated at the
 * plating station, waiting to go out, and place settings cleared from the tables, waiting to go to the
 * wash station. Plates and mugs limit what can be plated, too.
 *
 * Guests come in at the door, walk to a free seat (see game/seating.ts) and order one or more courses: a
 * drink, a snack, a main, a dessert (at the bar, just drinks and snacks). Each is anything of that
 * course, something of a kind ("a baked snack"), or something in particular. Besides what they ask for,
 * each quietly craves something (their folk's tastes, by weighted chance): served it, they're delighted;
 * not, they say what they'd have liked as they go. The player serves something ready into any of a
 * guest's course slots: the wrong course, or not what was asked, is accepted but remembered (less renown,
 * a less happy guest). With every slot filled, they eat a while, pay, earn the inn renown (renown.ts),
 * and walk out, leaving their dishes at their seat: nobody sits there till they're cleared.
 *
 * Most meals come with a drink, and a guest who orders just one thing mostly wants a drink (more often
 * than not something brewed). A guest who's finished their drink may stay for another round (some folk
 * more than others), and of an evening may ask for a room for the night: given one (rooms.ts), they go
 * up to bed. Some come in just for a room (most of all late in the evening), and wait by the hearth.
 * In the morning those who stayed come down and wait by the hearth to settle up, for the room and for the
 * comforts they asked for in it.
 *
 * Talking: a guest who's eaten sits back and relaxes a while before they pay; then (or once they've settled
 * up for their room) they may be in the mood to talk, the likelier the happier they are. Talking can lead somewhere: a story that
 * wants another round, a guest who finds they're tired and asks for a room, a dish from home.
 *
 * Patience is gentle, not a race: a guest waits a good while, longer each time something arrives, and if
 * nothing comes they leave without paying. The player can also politely dismiss a guest: they pay nothing,
 * and mind less the sooner it's done. Every visit is kept, for the journal.
 */
import { COURSE_NAMES, COURSES, type Content, type Course } from '../game/data';
import { renownFor, type Award } from './renown';
import type { Reputation } from './reputation';
import type { Rooms } from './rooms';

/**
 * Something served: the dish (or snack served as it is) and what it's on (a plate or bowl, or a mug).
 * Once a guest has it: how long they'd waited (seconds since they sat), and how well it fit the slot it
 * went in (what they asked for; the right course but not what they asked; the wrong course).
 */
export interface Served { dish: string; ware: string; after?: number; fit?: 'right' | 'not asked' | 'wrong course' }
export type Meal = Partial<Record<Course, Served>> & { cutlery?: string };

/** A place setting cleared from a seat: its dirty dishes, carried in a ready slot to the wash station. */
export interface Setting { dirty: string[]; seat: string }
export type ReadySlot = Served | Setting;
export const isSetting = (s: ReadySlot | undefined): s is Setting => !!s && 'dirty' in s;

/** How many ready slots there are (plated dishes and cleared settings alike). */
export const READY_MAX = 4;

/** What a guest wants for a course: something in particular, something of a kind, or (neither) anything. */
export interface Want { dish?: string; trait?: string }
export type Order = Partial<Record<Course, Want>>;

/** How a visit (or a round of it, or a night's stay) went. */
export interface Outcome {
  how: 'paid' | 'gave up' | 'dismissed' | 'no room' | 'unsettled';
  coins: number;
  renown: number;
  awards: Award[];
  /** How happy they left, 0 to 1. */
  mood: number;
  /** What they said on the way out. */
  remark: string;
}

export interface Guest {
  /** Their sprite (a guest look: dwarf, elf...) and folk (what they like). */
  look: string;
  folk: string;
  bar: boolean;
  order: Order;
  /** What they quietly crave (a trait), whatever they asked for. */
  craving: string;
  /** What's been brought so far. */
  got: Meal;
  /**
   * Coming in (or down from their room), waiting to be served, eating, relaxing after, asking for a room, come down to
   * settle up for it, settled up (and lingering), gone (home, or up to bed).
   */
  state: 'arriving' | 'waiting' | 'eating' | 'relaxing' | 'room' | 'checkout' | 'settled' | 'gone';
  /** In the mood to talk (once): they've had all they asked for, or settled up, and are happy enough. */
  chatty: boolean;
  /** What a talk led to: another round, or a room for the night, once they're done relaxing. */
  then?: 'round' | 'room';
  /** Seconds left walking in (of how long, all told). */
  walk: number;
  walkTotal: number;
  /**
   * Seconds they'll still wait for what's not been brought (out of how long, all told); seconds left
   * eating (then relaxing).
   */
  patience: number;
  patienceMax: number;
  eating: number;
  /** Seconds since they sat down. */
  waited: number;
  /** Seconds they've sat with someone else's dirty dishes on their table. */
  mess: number;
  /** When they sat down, in seating order (earliest first). */
  seated: number;
  /** Where they sat (a seat key). */
  seat: string;
  /** Earlier rounds: what they had in each before ordering another. */
  had: Served[][];
  /** Dirty pieces from earlier rounds, left at their seat when they go. */
  leftovers: string[];
  /** What they've said when the player stopped to talk (food: about a dish from home). */
  said: Array<{ line: string; food: boolean }>;
  /** Asking for a room: the comforts they'd like in it (and, after the night, which it had). */
  room?: { wants: string[]; met?: string[] };
  /** Given a room: which (they're up there till morning). */
  stayingIn?: string;
  /** How it's gone so far, all rounds together; once they've gone, how it went. */
  outcome?: Outcome;
  /** Their night's stay, once they've settled up in the morning. */
  stay?: Outcome & { room: string; wants: string[]; met: string[] };
}

/**
 * When it is, as the service needs it: how busy the inn is now (and if it's open at all), whether it's
 * evening (meal guests may ask for rooms), the chance someone coming in is after just a room, and whether
 * the inn has guest rooms.
 */
export interface Hours { busy: number; open: boolean; evening: boolean; lodging: number; rooms: boolean }
// lodging: how often travellers after just a room come, against the usual (1)

/**
 * A seat, as the service needs it: its key (map and chair), its map, the key of its table (or bar), and
 * how long a guest takes to walk there from the door (and from the stairs up to the rooms).
 */
export interface SeatRef { key: string; layout: string; table: string; bar: boolean; hearth?: boolean; walk?: number; stairs?: number }

/** Someone walking out (or up to bed): who, from which seat, how far along, and what they say as they go. */
export interface Leaver { guest: Guest; seat: string; layout: string; t: number; total: number; says: string }

const EAT_TIME = 15; // seconds a served guest eats...
const RELAX_TIME = 40; // ...and then sits back, before paying (the time to have a word with them)
const PATIENCE = 300; // seconds a guest waits for what they ordered...
const PATIENCE_PER_PART = 180; // ...and more for each part of it brought
/** Patience is shown as this many chits, marked off one at a time. */
export const CHITS = 10;
const PROMPT = 20; // seconds: dismissed sooner than this, a guest doesn't mind at all
const FIRST_GUESTS = 1; // seated at the start
const EXTRA_GUEST = 0.08; // past the usual number of guests, the chance another drops in (for each one more)
const MESSY = 10; // seconds sat beside dirty dishes before a guest minds
const RECENT = 12; // dishes remembered, for whether the inn serves the same thing over and over
const ONLY_DRINK = 0.65; // a guest ordering one thing: the chance it's a drink
const WITH_DRINK = 0.85; // a guest ordering a meal: the chance it comes with a drink
const BREWED = 0.55; // a drink asked for: the chance it's something brewed
/** Another round: by folk, the chance a guest who's had a drink orders another, and the most rounds. */
const ANOTHER: Record<string, { chance: number; rounds: number }> = {
  minotaur: { chance: 0.6, rounds: 3 }, dwarf: { chance: 0.5, rounds: 3 },
};
const ANOTHER_ELSE = { chance: 0.25, rounds: 2 };
const ROOM_ASK = 0.35; // of an evening, the chance a guest who's eaten asks for a room
const ROOM_PATIENCE = 240; // seconds they wait for a room
const LODGER_EVERY = 90; // seconds between travellers after just a room, at the evening's pace (see Hours.lodging)
const CHECKOUT_PATIENCE = 600; // seconds a guest waits by the hearth to settle up, before going without
const LINGER = 45; // seconds a guest who's settled up (and is in the mood to talk) lingers by the hearth
/** The chance a guest is in the mood to talk: this, and this much more the happier they are. */
const CHAT = { base: 0.1, happy: 0.5 };

export class Service {
  /** The ready slots: plated and waiting, or cleared and on the way to be washed. */
  readonly ready: ReadySlot[] = [];
  /** By seat key. */
  readonly guests = new Map<string, Guest>();
  /** Dirty pieces left at each seat by whoever sat there last, by seat key. */
  readonly dirty = new Map<string, string[]>();
  /** Every visit, in the order they came (the journal). */
  readonly visits: Guest[] = [];
  /** Guests walking out. */
  readonly leavers: Leaver[] = [];
  /** What's been served lately, latest last. */
  readonly recent: string[] = [];
  /** Guests upstairs for the night. */
  readonly lodgers: Guest[] = [];
  /** Guests come down in the morning, waiting for a spot by the hearth to settle up. */
  private readonly down: Guest[] = [];
  /** Bumped on every change, so views know to rebuild. */
  version = 0;
  private arrive = 0;
  private started = false;
  private seatedCount = 0;
  private lodger = 20;

  /** reputation: how often guests come, and what they ask for. */
  constructor(
    private readonly content: Content,
    private readonly looks: string[],
    private readonly reputation: Reputation,
    private readonly rng = Math.random,
  ) {}

  changed(): void {
    this.version++;
  }

  /** Worth of a served thing: a dish's, or a snack's own. */
  private worth(s: Served): number {
    return this.content.dishes[s.dish]?.value ?? this.content.item(s.dish).value;
  }

  /** How far a guest's patience has gone, 0 (just sat down) to 1 (about to leave). */
  restless(g: Guest): number {
    return g.state === 'waiting' || g.state === 'room' ? Math.max(0, Math.min(1, 1 - g.patience / g.patienceMax)) : 0;
  }

  /** How many patience chits a waiting guest has left. */
  chits(g: Guest): number {
    return g.state === 'waiting' || g.state === 'room' ? Math.max(0, Math.ceil((g.patience / g.patienceMax) * CHITS)) : CHITS;
  }

  /** The courses a guest wants, in serving order. */
  wants(g: Guest): Course[] {
    return COURSES.filter((c) => c in g.order);
  }

  /** A want in words: "any drink", "a baked snack", "Honey Cake". */
  describe(c: Course, w: Want): string {
    if (w.dish) return this.content.itemName(w.dish);
    if (w.trait) return `a ${w.trait} ${COURSE_NAMES[c]}`;
    return `any ${COURSE_NAMES[c]}`;
  }

  /**
   * Advance time: guests walk in, wait (losing patience), eat; leavers walk out; new guests come to seats
   * that are free (nobody there, no dishes left). menu(bar): what could be asked for, by course.
   */
  update(dt: number, seats: SeatRef[], menu: (bar: boolean) => Record<Course, string[]>, left: (g: Guest, o: Outcome) => void, hours: Hours): void {
    const here = new Map(seats.map((s) => [s.key, s]));
    for (const key of [...this.guests.keys()]) {
      if (!here.has(key)) {
        this.guests.delete(key); // their chair was moved or taken away
        this.changed();
      }
    }
    for (const l of this.leavers) l.t += dt;
    for (let i = this.leavers.length - 1; i >= 0; i--) if (this.leavers[i].t >= this.leavers[i].total) this.leavers.splice(i, 1);
    // tables (and the bar) with someone's dirty dishes still on them
    const messy = new Set(seats.filter((s) => this.dirty.get(s.key)?.length).map((s) => s.table));
    for (const seat of seats) {
      const g = this.guests.get(seat.key);
      if (!g) continue;
      if (g.state !== 'arriving' && messy.has(seat.table)) g.mess += dt;
      if (g.state === 'arriving') {
        if ((g.walk -= dt) <= 0) {
          // down from their room to settle up; in for a room; in for a meal
          g.state = g.stayingIn && !g.stay ? 'checkout' : g.room ? 'room' : 'waiting';
          if (g.state === 'checkout') g.patience = g.patienceMax = CHECKOUT_PATIENCE;
          this.changed();
        }
        continue;
      }
      g.waited += dt;
      if (g.state === 'waiting' && (g.patience -= dt) <= 0) this.leave(seat, 'gave up', left);
      else if (g.state === 'room' && (g.patience -= dt) <= 0) this.leave(seat, 'no room', left);
      else if (g.state === 'checkout' && (g.patience -= dt) <= 0) this.leave(seat, 'unsettled', left);
      else if (g.state === 'settled' && (g.patience -= dt) <= 0) this.go(seat, g, 'Safe travels to me!');
      else if (g.state === 'eating' && (g.eating -= dt) <= 0) this.relax(g);
      else if (g.state === 'relaxing' && (g.eating -= dt) <= 0) this.finished(seat, menu(seat.bar), left, hours);
    }
    const free = seats.filter((s) => !this.guests.has(s.key) && !this.dirty.get(s.key)?.length);
    const hearth = free.filter((s) => s.hearth);
    const tables = free.filter((s) => !s.hearth);
    // those down from their rooms take a spot by the hearth as one comes free
    while (this.down.length && hearth.length) this.comeDown(this.down.shift()!, hearth.shift()!);
    if (!this.started) {
      this.started = true;
      for (let i = 0; i < FIRST_GUESTS && i < tables.length; i++) this.seat(tables[i], menu(tables[i].bar));
      this.arrive = this.reputation.arriveEvery;
      return;
    }
    if (!hours.open) return; // none come in while the inn's closed
    // travellers after just a room come on their own, as well as the guests at the tables (often of an evening)
    if (hours.rooms && hearth.length && (this.lodger -= dt * hours.lodging) <= 0) {
      this.lodger = LODGER_EVERY;
      this.seatLodger(hearth[0]);
    }
    // guests come oftener at mealtimes, at the usual pace the rest of the time
    if ((this.arrive -= dt * hours.busy) > 0) return;
    this.arrive = this.reputation.arriveEvery;
    const over = [...this.guests.values()].filter((g) => !g.stayingIn && !g.room).length - this.reputation.usualGuests;
    if (over >= 0 && this.rng() >= EXTRA_GUEST ** (over + 1)) return; // the inn's as busy as its name allows
    if (!tables.length) return;
    const seat = tables[Math.floor(this.rng() * tables.length)];
    this.seat(seat, menu(seat.bar));
  }

  /** Someone come in just for a room: they wait by the hearth. */
  private seatLodger(seat: SeatRef): void {
    const g = this.newGuest(seat, {});
    g.room = { wants: this.comforts() };
    g.patience = g.patienceMax = ROOM_PATIENCE;
    this.guests.set(seat.key, g);
    this.visits.push(g);
    this.changed();
  }

  /** A guest who stayed the night comes down to a spot by the hearth, to settle up. */
  private comeDown(g: Guest, seat: SeatRef): void {
    g.seat = seat.key;
    g.state = 'arriving';
    g.walk = g.walkTotal = seat.stairs ?? seat.walk ?? 3;
    g.chatty = false;
    this.guests.set(seat.key, g);
    this.changed();
  }

  /**
   * Done eating: they sit back a while, and may be in the mood to talk: the more what came was what they
   * asked for (and craved), the likelier.
   */
  private relax(g: Guest): void {
    g.state = 'relaxing';
    g.eating = RELAX_TIME;
    const served = this.wants(g).map((w) => g.got[w]!);
    const right = served.filter((x) => x.fit === 'right').length + (this.satisfied(g) ? 1 : 0);
    g.chatty = this.moodToTalk(right / (served.length + 1));
    this.changed();
  }

  /** The chance (rolled once) a guest is in the mood to talk, from how happy they are (0 to 1). */
  private moodToTalk(happy: number): boolean {
    return this.rng() < CHAT.base + CHAT.happy * Math.max(0, Math.min(1, happy));
  }

  /** What a talk led to (a story wants another round; tired, they'd like a room); they've said their piece. */
  talked(g: Guest, then?: 'round' | 'room'): void {
    g.chatty = false;
    if (then === 'room' && g.state === 'settled') {
      // another night: they ask for a room again, there by the hearth
      g.state = 'room';
      g.stayingIn = undefined;
      g.room = { wants: this.comforts() };
      g.patience = g.patienceMax = ROOM_PATIENCE;
    } else if (g.state === 'relaxing') g.then = then;
    this.changed();
  }

  /** Politely send a guest on their way: they pay nothing. Returns them, or null if nobody's there. */
  dismiss(seat: SeatRef, left: (g: Guest, o: Outcome) => void): Guest | null {
    const g = this.guests.get(seat.key);
    if (!g || g.state === 'arriving' || g.state === 'checkout' || g.state === 'settled') return null;
    return this.leave(seat, g.state === 'room' ? 'no room' : 'dismissed', left);
  }

  /** Add a round's (or a night's) outcome to how the visit's gone. */
  private tally(g: Guest, o: Outcome): void {
    const t = g.outcome;
    g.outcome = t
      ? { how: o.how, coins: t.coins + o.coins, renown: t.renown + o.renown, awards: [...t.awards, ...o.awards], mood: o.mood, remark: o.remark }
      : o;
  }

  /**
   * A guest's done with what they had: they pay for it (and the inn's renown with it), then order
   * another round, ask for a room, or go.
   */
  private finished(seat: SeatRef, menu: Record<Course, string[]>, left: (g: Guest, o: Outcome) => void, hours: Hours): void {
    const g = this.guests.get(seat.key)!;
    const o = this.settle(g);
    const served = COURSES.map((c) => g.got[c]).filter((s): s is Served => !!s);
    const again = ANOTHER[g.folk] ?? ANOTHER_ELSE;
    const rounds = 1 + g.had.length;
    const then = g.then; // what a talk led to
    g.then = undefined;
    if (then === 'round' || (g.got.drink && rounds < again.rounds && this.rng() < again.chance)) {
      o.remark = then === 'round' ? "Another round, and I'll tell you the rest!" : 'That hit the spot! Same again?';
      this.nextRound(g, served, { drink: this.want(menu.drink, g.folk, 'drink') });
      g.craving = this.craving(g.folk, ['drink']);
    } else if (hours.rooms && (then === 'room' || (hours.evening && this.rng() < ROOM_ASK))) {
      o.remark = then === 'room' ? "I'm done in. Have you a bed for me?" : 'Have you a room for the night?';
      this.nextRound(g, served, {});
      g.state = 'room';
      g.room = { wants: this.comforts() };
      g.patience = g.patienceMax = ROOM_PATIENCE;
    } else {
      this.tally(g, o);
      left(g, o);
      this.go(seat, g, o.remark);
      return;
    }
    this.tally(g, o);
    left(g, o);
    this.changed();
  }

  /** Clear the table for another round: what they had is kept (and its dishes left by them for later). */
  private nextRound(g: Guest, served: Served[], order: Order): void {
    g.had.push(served);
    g.leftovers.push(...this.pile(g));
    g.got = {};
    g.order = order;
    g.state = 'waiting';
    g.patience = g.patienceMax = PATIENCE;
    g.waited = 0;
    g.mess = 0;
    g.chatty = false;
  }

  /** The comforts a guest staying the night asks for: a few, more as the inn's name grows. */
  private comforts(): string[] {
    const { asks, comforts } = this.content.rooms;
    const [lo, hi] = asks[Math.min(asks.length, this.reputation.level) - 1];
    const n = lo + Math.floor(this.rng() * (hi - lo + 1));
    const can = Object.keys(comforts).filter((c) => comforts[c].level <= this.reputation.level);
    return [...can].sort(() => this.rng() - 0.5).slice(0, n);
  }

  /** Whether a room's had someone in it tonight. */
  taken(room: string): boolean {
    return this.lodgers.some((g) => g.stayingIn === room);
  }

  /** Give a guest asking for one a room: they go up to bed (out of the hall), and settle up in the morning. */
  lodge(seat: SeatRef, room: string): string | null {
    const g = this.guests.get(seat.key);
    if (!g || g.state !== 'room') return "They're not after a room";
    if (this.taken(room)) return 'Someone is already staying there';
    g.stayingIn = room;
    this.lodgers.push(g);
    this.go(seat, g, 'Goodnight!');
    return null;
  }

  /** Morning: everyone who stayed the night gets up, leaving their bedding used, and comes down to settle up. */
  morning(rooms: Rooms): void {
    for (const g of this.lodgers.splice(0)) {
      const wants = g.room?.wants ?? [];
      g.room = { wants, met: wants.filter((w) => rooms.has(g.stayingIn!, w)) };
      rooms.sleptIn(g.stayingIn!, wants);
      this.down.push(g);
    }
    this.changed();
  }

  /**
   * Settle up with a guest come down from their room: for the room and the comforts they asked for that
   * it had (they're a little put out by the ones it hadn't). Happy, they may linger for a word; else they
   * go. Why not, or null.
   */
  collect(seat: SeatRef, paid: (g: Guest, o: Outcome) => void): string | null {
    const g = this.guests.get(seat.key);
    if (!g || g.state !== 'checkout') return "They've nothing to settle";
    const { comforts, price } = this.content.rooms;
    {
      const room = g.stayingIn!;
      const wants = g.room?.wants ?? [];
      const met = g.room?.met ?? [];
      const awards: Award[] = [
        ...met.map((w) => ({ why: `Had ${comforts[w].want}`, points: 1 })),
        ...wants.filter((w) => !met.includes(w)).map((w) => ({ why: `Wanted ${comforts[w].want}`, points: -1 })),
      ];
      if (met.length === wants.length) awards.push({ why: 'A restful night', points: 1 });
      const missed = wants.length - met.length;
      const remark = !missed ? 'I slept like a log!' : met.length ? 'A fair night, though I missed ' + comforts[wants.find((w) => !met.includes(w))!].want + '.'
        : `I'd have liked ${comforts[wants[0]].want}...`;
      const o: Outcome = {
        how: 'paid', coins: price.base + met.length * price.per_comfort, renown: awards.reduce((n, a) => n + a.points, 0),
        awards, mood: Math.max(0.2, 1 - missed * 0.25), remark,
      };
      g.stay = { ...o, room, wants, met };
      paid(g, o);
      g.chatty = this.moodToTalk(wants.length ? met.length / wants.length : 1);
      if (g.chatty) {
        g.state = 'settled';
        g.patience = g.patienceMax = LINGER;
      } else this.go(seat, g, o.remark);
    }
    this.changed();
    return null;
  }

  /** Whether what they had included what they were craving. */
  private satisfied(g: Guest): boolean {
    return COURSES.some((c) => g.got[c] && this.content.traits(g.got[c]!.dish).includes(g.craving));
  }

  /** The dirty pieces from what's in front of a guest now. */
  private pile(g: Guest): string[] {
    const served = COURSES.map((c) => g.got[c]).filter((s): s is Served => !!s);
    const pile = served.filter((s) => s.ware).map((s) => this.content.item(s.ware).dirty ?? s.ware);
    if (g.got.cutlery) pile.push(this.content.item(g.got.cutlery).dirty ?? g.got.cutlery);
    return pile;
  }

  /** The empty dishes in front of a guest who's eaten (and those from earlier rounds). */
  emptied(g: Guest): string[] {
    return [...g.leftovers, ...this.pile(g)];
  }

  /** A guest gets up and goes (out the door, or up to bed) saying something, leaving their dishes at their seat. */
  private go(seat: SeatRef, g: Guest, says: string): void {
    g.state = 'gone';
    const pile = [...g.leftovers, ...this.pile(g)];
    if (pile.length) this.dirty.set(seat.key, pile);
    g.leftovers = [];
    g.got = {};
    this.guests.delete(seat.key);
    const total = (g.stayingIn && !g.stay ? seat.stairs : seat.walk) ?? g.walkTotal; // up to bed, or out the door
    this.leavers.push({ guest: g, seat: seat.key, layout: seat.layout, t: 0, total: Math.max(1, total), says });
    this.changed();
  }

  /**
   * What a round comes to: paying for what they had (a coin less for a main without cutlery), the inn's
   * renown for it, and what they say about it.
   */
  private settle(g: Guest): Outcome {
    const served = COURSES.map((c) => g.got[c]).filter((s): s is Served => !!s);
    let coins = 0;
    let awards: Award[] = [];
    let mood: number;
    let remark: string;
    {
      coins = Math.max(1, served.reduce((n, s) => n + this.worth(s), 0) - (g.got.main && !g.got.cutlery ? 1 : 0));
      awards = renownFor({ guest: g, content: this.content, recent: this.recent, craved: this.satisfied(g) }).awards;
      for (const s of served) {
        this.recent.push(s.dish);
        if (this.recent.length > RECENT) this.recent.shift();
      }
      const misses = served.filter((s) => s.fit && s.fit !== 'right').length;
      const messy = g.mess > MESSY;
      mood = Math.max(0.2, Math.min(1, 0.8 - misses * 0.2 - (messy ? 0.2 : 0) + (this.satisfied(g) ? 0.2 : 0)));
      remark = this.satisfied(g) ? `I loved how ${g.craving} that was!`
        : misses ? 'Not quite what I asked for...'
        : messy ? 'Someone ought to clear those dishes...' : `That was good, but could have been more ${g.craving}.`;
    }
    // a very bad visit takes renown away
    return { how: 'paid', coins, renown: awards.reduce((n, a) => n + a.points, 0), awards, mood, remark };
  }

  /** A guest leaves without what they wanted (gave up waiting, sent away, no room for them). */
  private leave(seat: SeatRef, how: Exclude<Outcome['how'], 'paid'>, left: (g: Guest, o: Outcome) => void): Guest {
    const g = this.guests.get(seat.key)!;
    let mood: number;
    let remark: string;
    let awards: Award[] = [];
    if (how === 'gave up') {
      mood = 0;
      remark = "I couldn't wait any longer.";
      awards = [{ why: 'Left hungry', points: -2 }];
    } else if (how === 'no room') {
      mood = 0.4;
      remark = 'No room tonight? Another time, then.';
    } else if (how === 'unsettled') {
      mood = 0.5;
      remark = "Nobody to settle up with... I'll be on my way.";
    } else {
      const prompt = g.waited < PROMPT;
      mood = prompt ? 0.8 : Math.max(0.2, 0.8 - this.restless(g) * 0.6);
      remark = prompt ? 'Another time, then!' : 'After all that waiting...';
      if (!prompt) awards = [{ why: 'Sent away after a long wait', points: -1 }];
    }
    const o: Outcome = { how, coins: 0, renown: awards.reduce((n, a) => n + a.points, 0), awards, mood, remark };
    this.tally(g, o);
    left(g, o);
    this.go(seat, g, remark);
    return g;
  }

  /** A new guest (of some folk, at random) coming in to a seat, wanting what's in the order. */
  private newGuest(seat: SeatRef, order: Order): Guest {
    const look = this.looks[Math.floor(this.rng() * this.looks.length)];
    const folk = this.content.folk[look] ? look : 'human';
    return {
      look, folk, bar: seat.bar, order, craving: this.craving(folk, COURSES.filter((c) => c in order)), got: {}, state: 'arriving', walk: seat.walk ?? 3, walkTotal: seat.walk ?? 3,
      patience: PATIENCE, patienceMax: PATIENCE, eating: 0, waited: 0, mess: 0, seated: this.seatedCount++, seat: seat.key,
      had: [], leftovers: [], said: [], chatty: false,
    };
  }

  private seat(seat: SeatRef, menu: Record<Course, string[]>): void {
    const g = this.newGuest(seat, {});
    // how many courses: just one, mostly, while the inn is little known; more as its name grows
    const allowed: Course[] = seat.bar ? ['drink', 'snack'] : [...COURSES];
    const most = Math.max(1, Math.min(allowed.length,
      this.reputation.level <= 2 ? (this.rng() < 0.8 ? 1 : 2) : 1 + Math.floor(this.rng() * Math.min(3, allowed.length))));
    // mostly a drink, alone or with the meal; the rest of the meal at random
    const food = allowed.filter((c) => c !== 'drink').sort(() => this.rng() - 0.5);
    const drink = this.rng() < (most === 1 ? ONLY_DRINK : WITH_DRINK);
    const courses = drink ? ['drink' as Course, ...food.slice(0, most - 1)] : food.slice(0, most);
    for (const c of courses) g.order[c] = this.want(menu[c], g.folk, c);
    g.craving = this.craving(g.folk, courses);
    this.guests.set(seat.key, g);
    this.visits.push(g);
    this.changed();
  }

  /**
   * What a guest of a folk quietly craves: drawn by the folk's weights, from what what they've ordered
   * could be (a guest after just a drink craves something a drink can be, not something grilled). If
   * nothing their folk likes could be, any of what it could be.
   */
  private craving(folk: string, courses: Course[]): string {
    const could = new Set<string>();
    for (const id of [...Object.keys(this.content.dishes), ...this.content.snacks]) {
      if (courses.includes(this.content.course(id))) for (const t of this.content.traits(id)) could.add(t);
    }
    const all = Object.entries(this.content.folk[folk]?.cravings ?? { hearty: 1 });
    const fit = all.filter(([t]) => could.has(t));
    const w = fit.length ? fit : [...could].map((t): [string, number] => [t, 1]);
    if (!w.length) return all[0]?.[0] ?? 'hearty';
    let r = this.rng() * w.reduce((n, [, v]) => n + v, 0);
    for (const [t, v] of w) if ((r -= v) <= 0) return t;
    return w[w.length - 1][0];
  }

  /**
   * What a guest wants for a course: anything (most, early on); else something of a kind (a trait of
   * something they could be served) or, as the inn's name grows, something in particular.
   */
  private want(options: string[], folk: string, course: Course): Want {
    // a drink: more often than not, something brewed (whether or not there's any to hand)
    if (course === 'drink' && this.rng() < BREWED) {
      const brewed = options.filter((d) => this.content.traits(d).includes('brewed'));
      return brewed.length && this.rng() < 0.5 ? { dish: this.favourite(brewed, folk, (d) => this.content.dishTags(d)) } : { trait: 'brewed' };
    }
    const r = this.rng();
    if (!options.length || r < this.reputation.anything) return {};
    if (r < this.reputation.anything + (1 - this.reputation.anything) * 0.6) {
      const traits = [...new Set(options.flatMap((d) => this.content.traits(d)))];
      if (traits.length) return { trait: this.favourite(traits, folk, (t) => [t]) };
    }
    return { dish: this.favourite(options, folk, (d) => this.content.dishTags(d)) };
  }

  /** One of a list, more likely one this folk likes (by the tags `tags` gives each). */
  private favourite(list: string[], folk: string, tags: (x: string) => string[]): string {
    const likes = new Set(this.content.folk[folk]?.likes ?? []);
    const weights = list.map((d) => 1 + tags(d).filter((t) => likes.has(t)).length * 2);
    let r = this.rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((r -= weights[i]) <= 0) return list[i];
    return list[list.length - 1];
  }

  /** How well a dish fits a guest's slot for a course. */
  fit(g: Guest, c: Course, dish: string): NonNullable<Served['fit']> {
    if (this.content.course(dish) !== c) return 'wrong course';
    const w = g.order[c] ?? {};
    if (w.dish && w.dish !== dish) return 'not asked';
    if (w.trait && !this.content.traits(dish).includes(w.trait)) return 'not asked';
    return 'right';
  }

  /**
   * Serve something ready into one of a guest's course slots (it leaves the ready slots). Anything can go
   * in any empty slot; how well it fits is remembered. A main brings cutlery (if `cutlery` finds a clean
   * set). Each thing brought buys more patience; with every slot filled, they start eating. Returns why
   * not, or null once served.
   */
  serve(ready: number, seatKey: string, c: Course, cutlery: () => string | null): string | null {
    const s = this.ready[ready];
    const g = this.guests.get(seatKey);
    if (!s) return 'Choose something ready to serve';
    if (isSetting(s)) return "Those are dirty dishes: they're for the wash station";
    if (!g) return 'Nobody is sitting there';
    if (g.state === 'arriving') return "They're still coming in";
    if (g.state !== 'waiting') return "They've already been served";
    if (!(c in g.order)) return `They didn't want a ${COURSE_NAMES[c]}`;
    if (g.got[c]) return `They already have their ${COURSE_NAMES[c]}`;
    this.ready.splice(ready, 1);
    g.got = { ...g.got, [c]: { ...s, after: g.waited, fit: this.fit(g, c, s.dish) } };
    if (this.content.course(s.dish) === 'main' && !g.got.cutlery) g.got.cutlery = cutlery() ?? undefined;
    g.patience += PATIENCE_PER_PART;
    g.patienceMax += PATIENCE_PER_PART;
    if (this.wants(g).every((w) => g.got[w])) {
      g.state = 'eating';
      g.eating = EAT_TIME;
    }
    this.changed();
    return null;
  }

  /**
   * Clear one dirty piece from a seat into the ready slots: a seat's dishes all go in one slot (a place
   * setting), so the slots hold up to four settings. Returns it, or why not.
   */
  clearOne(seatKey: string, i: number): { item: string } | { why: string } {
    const pile = this.dirty.get(seatKey);
    const item = pile?.[i];
    if (!pile || !item) return { why: 'Nothing to clear' };
    let slot = this.ready.find((r): r is Setting => isSetting(r) && r.seat === seatKey);
    if (!slot) {
      if (this.ready.length >= READY_MAX) return { why: 'Your hands are full: take some to the wash station first' };
      slot = { dirty: [], seat: seatKey };
      this.ready.push(slot);
    }
    slot.dirty.push(item);
    pile.splice(i, 1);
    if (!pile.length) this.dirty.delete(seatKey);
    this.changed();
    return { item };
  }

  /** Dirty pieces in the ready slots, of one kind. */
  dirtyReady(item: string): number {
    return this.ready.reduce((n, r) => n + (isSetting(r) ? r.dirty.filter((d) => d === item).length : 0), 0);
  }

  /** Take one dirty piece of a kind out of the ready slots (an emptied setting frees its slot). */
  takeDirty(item: string): boolean {
    const i = this.ready.findIndex((r) => isSetting(r) && r.dirty.includes(item));
    if (i < 0) return false;
    const s = this.ready[i] as Setting;
    s.dirty.splice(s.dirty.indexOf(item), 1);
    if (!s.dirty.length) this.ready.splice(i, 1);
    this.changed();
    return true;
  }
}
