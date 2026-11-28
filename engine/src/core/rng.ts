/**
 * Seeded randomness: each new game draws a fresh seed, and everything random in it (what the shops have
 * out, who comes in and what they want) comes from that seed's sequence, so a game can be replayed from
 * its seed and no two new games are alike.
 */
export type Rng = () => number;

/** A fresh seed for a new game. */
export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

/** A sequence of numbers in [0, 1) from a seed (mulberry32). */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
