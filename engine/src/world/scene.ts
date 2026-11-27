/**
 * A scene is one map you can be in (the town, the inn's ground floor, upstairs...): its ground, the
 * things placed on it, named spawn points to arrive at, and exits that lead to other scenes.
 */
import type { Rect } from '../core/geom';
import type { Entity } from './entity';
import type { Ground } from './ground';

export type Facing = 'down' | 'up' | 'left' | 'right';

/** Where the player stands on arrival: sprite top-left in world pixels, and which way they face. */
export interface Spawn { x: number; y: number; facing: Facing }

/**
 * Walking into `area` (world pixels, tested against the player's feet) leads to `to`/`spawn`.
 * With `dir`, the exit only fires while the player is walking that way (so arriving next to a door or
 * stairs never bounces you straight back).
 */
export interface Exit { area: Rect; to: string; spawn: string; dir?: Facing }

export interface Scene {
  readonly id: string;
  readonly ground: Ground;
  readonly props: Entity[];
  readonly spawns: Record<string, Spawn>;
  readonly exits: Exit[];
  /** Extra solid rects that belong to no single prop (the rails round a stairwell). */
  readonly blockers: Rect[];
  /** Background colour around maps smaller than the screen. */
  readonly backdrop?: string;
}

/** Tile-coordinate helper for spawns: stand in cell (tx, ty) facing `facing`. */
export function spawnAt(tx: number, ty: number, facing: Facing, tile = 32): Spawn {
  // The player sprite is 32x32 with its feet at rows 22-28; this puts the feet in the middle of the cell.
  return { x: tx * tile, y: ty * tile + tile / 2 - 25, facing };
}

/** Exit covering one cell. */
export function cellExit(tx: number, ty: number, to: string, spawn: string, dir?: Facing, tile = 32): Exit {
  return { area: { x: tx * tile + 4, y: ty * tile, w: tile - 8, h: tile }, to, spawn, dir };
}
