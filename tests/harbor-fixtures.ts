import type { ContentDefinition, Game, InteractableDefinition } from '../src/core';
import { face, newGame } from './fixtures';
import type { ArenaOptions } from './fixtures';
import { guardianAt, guardianContent, guardianGateAt } from './guardian-fixtures';

// The harbor of the tests: the wide field of fixtures.ts (14 x 7 tiles) cut in two by a wall in column 8, which has one
// gap, at row 3, where the gate of the Guardian stands. The Guardian "guardian-1" stands on tile (4, 3) in front of
// the gate, and the harbor lies behind it, in columns 9 to 12, rows 1 to 5:
//
//   ##############     # wall    . ground    The gate "gate-1" fills the gap at (8, 3). It opens for good when the
//   #.......#....#                           Guardian is defeated. The vessel "vessel-1" fills tile (12, 3), at the east
//   #.......#....#                           end of the harbor, so the hero reaches it from (11, 3), (12, 2) or (12, 4).
//   #...........#
//   #.......#....#   The hero's Attack is 12, which is the Guardian's Health: one strike defeats it, and the 20
//   #.......#....#   Experience it is worth raises the hero to Level 2, so that one Stat Point waits to be assigned.
//   ##############
//
// The way in and the Checkpoint are fixtures.ts's own, at (1, 1) and (1, 4), in front of the gate. The hero begins in the
// harbor, on tile (11, 3) in front of the vessel, unless a test says it begins elsewhere: content may start the hero
// behind the gate of a Guardian. A hero at the centre of that tile has its right edge a quarter of a tile from the
// vessel, which is within the 0.5 tile that it interacts, once it faces right.

export const HARBOR_LAYOUT = [
  '##############',
  '#.......#....#',
  '#.......#....#',
  '#............#',
  '#.......#....#',
  '#.......#....#',
  '##############',
];

export const GUARDIAN_ID = 'guardian-1';
export const GATE_ID = 'gate-1';
export const VESSEL_ID = 'vessel-1';

/** A vessel on the tile (col, row). */
export function vesselAt(id: string, col: number, row: number): InteractableDefinition {
  return { kind: 'vessel', id, tile: { col, row } };
}

/** The gate of the Guardian and the vessel behind it: what the harbor has, besides what a test adds. */
export const HARBOR_INTERACTABLES: readonly InteractableDefinition[] = [
  guardianGateAt(GATE_ID, 8, 3, GUARDIAN_ID),
  vesselAt(VESSEL_ID, 12, 3),
];

/** The content of the harbor: the Guardian, its gate and the vessel, with the hero in front of the vessel. */
export function harborContent(options: ArenaOptions = {}): ContentDefinition {
  return guardianContent([guardianAt(GUARDIAN_ID, 4, 3), ...(options.monsters ?? [])], {
    layout: HARBOR_LAYOUT,
    start: { area: 'arena', tile: { col: 11, row: 3 } },
    hero: { attack: 12 },
    interactables: HARBOR_INTERACTABLES,
    ...options,
  });
}

/** A game in the harbor, the hero standing in front of the vessel and facing it. */
export function harborGame(options: ArenaOptions = {}): Game {
  const game = newGame(harborContent(options));
  face(game, 'right');
  return game;
}
