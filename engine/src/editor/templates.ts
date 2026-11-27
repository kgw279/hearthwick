/**
 * Starting layouts for new maps. An interior is a walled room (wood caps, plaster wall with windows,
 * a doorway in the middle of the front wall) with an "entrance" spawn just inside the door and an exit
 * through it; the exit is linked to a building door elsewhere with the editor's "Door to" command.
 * An outdoor map is plain grass with a "start" spawn in the middle.
 */
import type { Layout, WallPiece } from '../world/layout';

/** Exits of a new interior lead here until linked to a building. */
export const UNLINKED = 'unlinked';

export const SIZES = {
  interior: [{ name: 'Small room', w: 8, h: 7 }, { name: 'Shop', w: 12, h: 9 }, { name: 'Hall', w: 16, h: 11 }],
  outdoor: [{ name: 'Small', w: 24, h: 16 }, { name: 'Town', w: 40, h: 24 }, { name: 'Large', w: 64, h: 40 }],
};

export function outdoorTemplate(id: string, w: number, h: number): Layout {
  return {
    id,
    ground: { type: 'tiles', rows: Array.from({ length: h }, () => '.'.repeat(w)) },
    spawns: { start: { x: Math.floor(w / 2), y: Math.floor(h / 2), facing: 'down' } },
    exits: [],
    props: [],
  };
}

/** w x h cells including walls: top cap row, wall-face row, floor, front wall with a doorway. */
export function interiorTemplate(id: string, w: number, h: number): Layout {
  const door = Math.floor(w / 2);
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    if (y < 2) rows.push('.'.repeat(w));
    else if (y === h - 1) rows.push('.'.repeat(door) + 'w' + '.'.repeat(w - door - 1));
    else rows.push('.' + 'w'.repeat(w - 2) + '.');
  }
  const walls: WallPiece[] = [['cap_wood_TL', 0, 0], ['cap_wood_TR', w - 1, 0], ['cap_wood_BL', 0, h - 1], ['cap_wood_BR', w - 1, h - 1]];
  for (let x = 1; x < w - 1; x++) {
    walls.push(['cap_wood_T', x, 0]);
    walls.push([x % 3 === 2 ? 'face_plaster_window' : 'face_plaster_plain', x, 1]);
    if (x === door - 1) walls.push(['cap_wood_B_end_L', x, h - 1]);
    else if (x === door + 1) walls.push(['cap_wood_B_end_R', x, h - 1]);
    else if (x !== door) walls.push(['cap_wood_B', x, h - 1]);
  }
  for (let y = 1; y < h - 1; y++) walls.push(['cap_wood_L', 0, y], ['cap_wood_R', w - 1, y]);
  return {
    id,
    backdrop: '#221c2c',
    ground: { type: 'room', rows, walls },
    spawns: { entrance: { x: door, y: h - 2, facing: 'up' } },
    exits: [{ cell: [door, h - 1], to: UNLINKED, spawn: UNLINKED, dir: 'down' }],
    props: [{ sprite: 'doormat', x: door * 32 + 16, y: (h - 2) * 32 + 30, flat: true }],
  };
}
