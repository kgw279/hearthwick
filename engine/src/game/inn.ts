/**
 * The Hearthwick Inn: ground floor (hall, hearth, long table, stone-floored kitchen) and the guest floor
 * upstairs, built from the art pack's interior kit. Layouts follow the pack's mock_floors.png.
 */
import type { Assets } from '../core/assets';
import type { Rect } from '../core/geom';
import { Prop, type PropSpec } from '../world/entity';
import { RoomMap } from '../world/room';
import { cellExit, spawnAt, type Scene } from '../world/scene';
import { TILE } from '../world/tilemap';
import type { TownHooks } from './town';

const t = (n: number) => n * TILE;

const SOLID: Record<string, Rect> = {
  block: { x: 2, y: 14, w: 28, h: 16 }, small: { x: 8, y: 20, w: 16, h: 9 }, table: { x: 0, y: 12, w: 32, h: 16 },
  bench: { x: 0, y: 20, w: 32, h: 6 }, bed: { x: 2, y: 4, w: 28, h: 26 }, npc: { x: 10, y: 22, w: 12, h: 6 },
};

/** Placement options: pixel nudges from the tile position plus any other prop settings. */
type PutOpts = Omit<Partial<PropSpec>, 'x' | 'y' | 'frames' | 'solid'> & { dx?: number; dy?: number };

function placer(assets: Assets) {
  const props: Prop[] = [];
  const put = (frames: string | string[], tx: number, ty: number, solid?: keyof typeof SOLID | null, opts: PutOpts = {}) => {
    const { dx = 0, dy = 0, ...rest } = opts;
    props.push(new Prop(assets, { frames, x: t(tx) + dx, y: t(ty) + dy, solid: solid ? SOLID[solid] : undefined, ...rest }));
  };
  return { props, put };
}

export function buildInnGround(assets: Assets, hooks: TownHooks): Scene {
  const ground = new RoomMap({
    floor: [
      '..............',
      '..............',
      '.wwwwwwww.....',
      '.wwwwwwww.....',
      '.wwwwwwwwssss.',
      'wwwwwwwwwssss.',
      '.wwwwwwwwssss.',
      '.wwwwwwwwssss.',
      '.wwwwwwwwssss.',
      '....w.........',
    ],
    walls: [
      ['cap_wood_TL', 0, 0], ...[1, 2, 3, 4, 5, 6, 7, 8].map((x) => ['cap_wood_T', x, 0] as [string, number, number]), ['cap_wood_TR', 9, 0],
      ...(['face_plaster_plain', 'face_plaster_window', 'face_plaster_plain', 'face_plaster_plain', 'face_plaster_shelf',
        'face_plaster_plain', 'face_plaster_window', 'face_plaster_plain'].map((f, i) => [f, i + 1, 1] as [string, number, number])),
      ['cap_wood_R', 9, 1], ['cap_wood_inner_T_R', 9, 2], ['cap_T_wood_to_stone', 10, 2], ['cap_stone_T', 11, 2], ['cap_stone_T', 12, 2],
      ['cap_stone_TR', 13, 2],
      ['face_plaster_to_stone', 9, 3], ['face_stone_shelf', 10, 3], ['face_stone_window', 11, 3], ['face_stone_plain', 12, 3],
      ...[3, 4, 5, 6, 7, 8].map((y) => ['cap_stone_R', 13, y] as [string, number, number]),
      ['cap_wood_L', 0, 1], ['cap_wood_L', 0, 2], ['cap_wood_L', 0, 3], ['cap_wood_L_end_bottom', 0, 4], ['cap_wood_L_end_top', 0, 6],
      ['cap_wood_L', 0, 7], ['cap_wood_L', 0, 8], ['cap_wood_BL', 0, 9],
      ['cap_wood_B', 1, 9], ['cap_wood_B', 2, 9], ['cap_wood_B_end_L', 3, 9], ['cap_wood_B_end_R', 5, 9],
      ['cap_wood_B', 6, 9], ['cap_wood_B', 7, 9], ['cap_wood_B', 8, 9],
      ['cap_B_wood_to_stone', 9, 9], ['cap_stone_B', 10, 9], ['cap_stone_B', 11, 9], ['cap_stone_B', 12, 9], ['cap_stone_BR', 13, 9],
      ['deco_painting', 3, 1], ['deco_sconce', 1, 1], ['deco_menu_board', 8, 1], ['deco_banner', 6, 1], ['deco_sconce', 12, 3],
    ],
  }, assets);

  const { props, put } = placer(assets);
  const floorDeco = { sortOffset: 0 };
  put('doormat', 4, 8, null, { dy: 6, ...floorDeco });
  for (const [x, part] of [[1, 'left'], [2, 'middle'], [3, 'middle'], [4, 'middle'], [5, 'middle'], [6, 'right']] as const) {
    put(`runner_${part}`, x, 7, null, floorDeco);
  }
  put('stairs_up', 5, 1, null, { sortOffset: 0 });
  put('bookshelf', 1, 2, 'block');
  put(assets.animation('fireplace'), 3, 2, 'block', { fps: 6 });
  put('armchair', 3, 3, 'small', { dy: 4 });
  put('barrel_stack', 7, 2, 'block');
  put('floor_lamp', 8, 3, 'small');
  for (const [x, part] of [[2, 'left'], [3, 'middle'], [4, 'middle'], [5, 'right']] as const) {
    put(`bench_${part}`, x, 4, 'bench', { dy: 4 });
    put(`long_table_${part}`, x, 5, 'table');
    put(`bench_${part}`, x, 5, 'bench', { dy: 8 });
  }
  put('dish_venison_pie', 3, 5, null, { dy: -5, sortOffset: 40 });
  put('bread_loaf', 4, 5, null, { dy: -5, sortOffset: 40 });

  // kitchen (stone floor)
  put('cupboard', 9, 4, 'block');
  put(assets.animation('stove'), 10, 4, 'block', { fps: 6 });
  put(assets.animation('oven'), 11, 4, 'block', { fps: 6 });
  put('cutting_board', 12, 4, 'block');
  put(assets.animation('cauldron'), 12, 6, 'block', { fps: 6 });
  put('mixing_table', 10, 7, 'block');
  put('brewing_cask', 12, 8, 'block', { dy: -4 });
  put(assets.animation('baker_work'), 11, 5, 'npc', {
    dy: -2, fps: 4, interaction: { label: 'Talk', use: () => hooks.say("The oven's hot and the pie's nearly done. Mind the cauldron!", 'Baker') },
  });

  // guests at the long table: one on the far bench (seen over the table), one on the near bench (from behind)
  put(assets.animation('dwarf_eat_down'), 3, 4, null, {
    dy: 8, fps: 3, sortOffset: 20, // sits on the far bench; the table (drawn after) hides the legs interaction: { label: 'Talk', use: () => hooks.say('Best venison pie this side of the mountains.', 'Dwarf traveler') },
  });
  put(assets.animation('minotaur_eat_up'), 4, 5, null, {
    dy: 10, fps: 3, sortOffset: 40, interaction: { label: 'Talk', use: () => hooks.say('Mmf. More bread, please.', 'Minotaur') },
  });
  put('elf_left_idle', 8, 6, 'npc', { interaction: { label: 'Talk', use: () => hooks.say('Is there a room free upstairs tonight?', 'Elf traveler') } });

  return {
    id: 'inn_ground',
    ground,
    props,
    backdrop: '#221c2c',
    spawns: { front: spawnAt(4, 8, 'up'), side: spawnAt(1, 5, 'right'), stairs: spawnAt(5, 3, 'down') },
    exits: [
      cellExit(4, 9, 'town', 'inn_door', 'down'),
      cellExit(0, 5, 'town', 'inn_door', 'left'),
      cellExit(5, 2, 'inn_upstairs', 'stairs', 'up'),
    ],
  };
}

export function buildInnUpstairs(assets: Assets, hooks: TownHooks): Scene {
  const ground = new RoomMap({
    floor: [
      '..........',
      '..........',
      '.wwwwwwww.',
      '.wwwwwwww.',
      '.wwwwwwww.',
      '.wwwwwwww.',
      '..........',
    ],
    walls: [
      ['cap_wood_TL', 0, 0], ...[1, 2, 3, 4, 5, 6, 7, 8].map((x) => ['cap_wood_T', x, 0] as [string, number, number]), ['cap_wood_TR', 9, 0],
      ...(['face_plaster_plain', 'face_plaster_window', 'face_plaster_plain', 'face_plaster_plain', 'face_plaster_window',
        'face_plaster_plain', 'face_plaster_plain', 'face_plaster_window'].map((f, i) => [f, i + 1, 1] as [string, number, number])),
      ...[1, 2, 3, 4, 5].flatMap((y) => [['cap_wood_L', 0, y], ['cap_wood_R', 9, y]] as Array<[string, number, number]>),
      ['cap_wood_BL', 0, 6], ['cap_wood_BR', 9, 6], ...[1, 2, 3, 4, 5, 6, 7, 8].map((x) => ['cap_wood_B', x, 6] as [string, number, number]),
      ['deco_painting', 3, 1], ['deco_sconce', 6, 1], ['deco_sconce', 1, 1],
    ],
  }, assets);

  const { props, put } = placer(assets);
  for (const [x, part] of [[1, 'left'], [2, 'middle'], [3, 'middle'], [4, 'right']] as const) put(`runner_${part}`, x, 4, null, { sortOffset: 0 });
  put('stairs_down', 6, 4, null, { sortOffset: 0 });
  put('bed', 1, 2, 'bed');
  put('nightstand', 2, 2, 'block');
  put('bed', 3, 2, 'bed');
  put('wardrobe', 4, 2, 'block');
  put('floor_lamp', 7, 2, 'small');
  put('armchair', 8, 2, 'small');
  put('chest', 8, 5, 'small', { dy: -6 });
  put('potted_plant', 1, 5, 'small', { dy: -8 });
  put('frog_right_idle', 2, 4, 'npc', { dy: -4, interaction: { label: 'Talk', use: () => hooks.say('Ribbit! The beds here are wonderfully soft.', 'Frog traveler') } });

  return {
    id: 'inn_upstairs',
    ground,
    props,
    backdrop: '#221c2c',
    spawns: { stairs: spawnAt(6, 5, 'down') },
    exits: [cellExit(6, 4, 'inn_ground', 'stairs')],
  };
}
