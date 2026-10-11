import type { AreaDefinition, ContentDefinition, EntranceDefinition, ExitDefinition } from '../src/core';
import { ARENA_LAYOUT, arena } from './fixtures';
import type { ArenaOptions } from './fixtures';

// The test world of the tests that move the hero between Adventure Areas: the arena of fixtures.ts and a cellar, both
// 7 x 6 tiles, each with an exit into the other.
//
//   arena   entrance "from-cellar" at tile (4, 3), where the hero arrives coming up from the cellar
//           exit "to-cellar" on tile (5, 3), the tile next to it on the right
//   cellar  entrance "from-arena" at tile (2, 3), where the hero arrives coming down from the arena
//           exit "to-arena" on tile (1, 3), the tile next to it on the left
//
// The hero starts at (3.5, 3.5) in the arena. Its body is 0.5 wide and a step is 0.125, so its right edge reaches the
// exit at x = 5 after 10 steps (the edge touching the zone is not in it) and is in it on the 11th, which puts the hero in
// the cellar at (2.5, 3.5). From there 3 steps to the left take it back into the arena, at (4.5, 3.5).

export const FROM_CELLAR: EntranceDefinition = { id: 'from-cellar', tile: { col: 4, row: 3 } };
export const FROM_ARENA: EntranceDefinition = { id: 'from-arena', tile: { col: 2, row: 3 } };
export const TO_CELLAR: ExitDefinition = {
  id: 'to-cellar',
  zone: { col: 5, row: 3, width: 1, height: 1 },
  to: { area: 'cellar', entrance: 'from-arena' },
};
export const TO_ARENA: ExitDefinition = {
  id: 'to-arena',
  zone: { col: 1, row: 3, width: 1, height: 1 },
  to: { area: 'arena', entrance: 'from-cellar' },
};

/** The cellar on its own, which the tests of the wide field of enemy-fixtures.ts use too: its Checkpoint is the default one. */
export const CELLAR: AreaDefinition = {
  id: 'cellar',
  name: 'Cellar',
  layout: ARENA_LAYOUT,
  monsters: [],
  entrances: [FROM_ARENA],
  exits: [TO_ARENA],
};

/** The arena and the cellar, with the hero in the arena at (3.5, 3.5). `cellar` replaces parts of the cellar. */
export function world(arenaOptions: ArenaOptions = {}, cellar: Partial<AreaDefinition> = {}): ContentDefinition {
  return arena({
    entrances: [FROM_CELLAR],
    exits: [TO_CELLAR],
    ...arenaOptions,
    otherAreas: [{ ...CELLAR, ...cellar }],
  });
}
