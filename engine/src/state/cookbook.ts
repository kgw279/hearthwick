/**
 * The recipe book: what the player knows how to make at each station (and which dishes at the plating
 * station). It starts with a few basic ones per station; anything worked out at a station (by putting
 * the right things together) is written in. Pure state.
 */
import type { Content } from '../game/data';

const BASICS = 3; // known at the start, per station
/** Dishes known at the plating station from the start (besides the game's starter dishes). */
const FIRST_DISHES = ['dish_cold_milk', 'dish_cup_of_well_water', 'dish_boiled_egg'];

export class Cookbook {
  private readonly known = new Set<string>();

  constructor(private readonly content: Content) {
    // at each station, the simplest things made straight from raw ingredients
    for (const station of Object.keys(content.stations)) {
      if (station === 'plate') continue;
      content.recipesAt(station)
        .filter((r) => r.inputs.every((i) => content.items[i]?.kind === 'raw'))
        .sort((a, b) => a.inputs.length - b.inputs.length || content.itemName(a.out).localeCompare(content.itemName(b.out)))
        .filter((r, i, all) => all.findIndex((q) => q.out === r.out) === i) // one way to make each thing
        .slice(0, BASICS)
        .forEach((r) => this.learn(station, r.out, r.inputs));
    }
    for (const d of FIRST_DISHES) if (content.dishes[d]) this.learn('plate', d, content.dish(d).components);
  }

  /** A recipe is known by what it makes and from what: two ways to make the same thing are two recipes. */
  private key(station: string, out: string, inputs: string[]): string {
    return `${station}:${out}:${[...inputs].sort().join('+')}`;
  }

  knows(station: string, out: string, inputs: string[]): boolean {
    return this.known.has(this.key(station, out, inputs));
  }

  /** Write a recipe in; true if it's new. */
  learn(station: string, out: string, inputs: string[]): boolean {
    const key = this.key(station, out, inputs);
    if (this.known.has(key)) return false;
    this.known.add(key);
    return true;
  }

  /** What's known at a station: each thing made and what goes into it, by name. */
  at(station: string): Array<{ out: string; inputs: string[] }> {
    const list = station === 'plate'
      ? Object.keys(this.content.dishes).map((d) => ({ out: d, inputs: this.content.dish(d).components }))
      : this.content.recipesAt(station);
    return list.filter((r) => this.knows(station, r.out, r.inputs))
      .sort((a, b) => this.content.itemName(a.out).localeCompare(this.content.itemName(b.out)));
  }
}
