/**
 * Starting layouts for new maps. An interior is a plaster-walled room (walls autotile from the grid) with windows hung on its back wall,
 * with a doorway in the middle of the front wall, an "entrance" spawn just inside it and an exit
 * through it; the exit is linked to a building door elsewhere with the editor's "Door to" command.
 * An outdoor map is plain grass with a "start" spawn in the middle.
 */
import type { Layout, PlacedProp } from '../world/layout';

/** Exits of a new interior lead here until linked to a building. */
export const UNLINKED = 'unlinked';

export const SIZES = {
  interior: [{ name: 'Small room', w: 8, h: 7 }, { name: 'Shop', w: 12, h: 9 }, { name: 'Hall', w: 16, h: 11 }],
  outdoor: [{ name: 'Small', w: 24, h: 16 }, { name: 'Town', w: 40, h: 24 }, { name: 'Large', w: 64, h: 40 }],
};

export function outdoorTemplate(id: string, w: number, h: number): Layout {
  return {
    id,
    ground: { type: 'tiles', rows: Array.from({ length: h * 2 }, () => '.'.repeat(w * 2)) }, // 16px cells
    spawns: { start: { x: Math.floor(w / 2), y: Math.floor(h / 2), facing: 'down' } },
    exits: [],
    props: [],
  };
}

/** w x h cells including walls: a cap row and a wall-face row at the back, floor, a front wall with a doorway. */
export function interiorTemplate(id: string, w: number, h: number): Layout {
  const door = Math.floor(w / 2);
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    if (y < 2) rows.push('W'.repeat(w)); // cap row, then the wall-face row the windows hang on
    else if (y === h - 1) rows.push('W'.repeat(door) + 'f' + 'W'.repeat(w - door - 1));
    else rows.push('W' + 'f'.repeat(w - 2) + 'W');
  }
  const floor = Array.from({ length: h * 2 }, () => 'w'.repeat(w * 2));
  return {
    id,
    backdrop: '#221c2c',
    ground: { type: 'room', rows, floor },
    spawns: { entrance: { x: door, y: h - 2, facing: 'up' } },
    exits: [{ cell: [door, h - 1], to: UNLINKED, spawn: UNLINKED, dir: 'down' }],
    props: [
      // a window every third cell of the back wall-face row (row 1); the art's base sits 19px into the cell
      ...Array.from({ length: w }, (_, x) => x).filter((x) => x > 0 && x < w - 1 && x % 3 === 2)
        .map((x): PlacedProp => ({ sprite: 'wall_window', x: x * 32 + 16, y: 32 + 19, layer: 'wall' })),
      { sprite: 'doormat', x: door * 32 + 16, y: (h - 2) * 32 + 30, layer: 'floor' },
    ],
  };
}
