import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { AreaDefinition, ContentDefinition, EntranceDefinition, ExitDefinition } from '../src/core';
import { ARENA_LAYOUT, arena, fixedRandom } from './fixtures';

// The test world: the arena and a cellar, both 7 x 6 tiles (see fixtures.ts), each with an exit into the other.
//
//   arena   entrance "from-cellar" at tile (4, 3), where the hero arrives coming up from the cellar
//           exit "to-cellar" on tile (5, 3), the tile next to it on the right
//   cellar  entrance "from-arena" at tile (2, 3), where the hero arrives coming down from the arena
//           exit "to-arena" on tile (1, 3), the tile next to it on the left
//
// The hero starts at (3.5, 3.5) in the arena. Its body is 0.5 wide and a step is 0.125, so its right edge reaches the
// exit at x = 5 after 10 steps (the edge touching the zone is not in it) and is in it on the 11th.

const FROM_CELLAR: EntranceDefinition = { id: 'from-cellar', tile: { col: 4, row: 3 } };
const FROM_ARENA: EntranceDefinition = { id: 'from-arena', tile: { col: 2, row: 3 } };
const TO_CELLAR: ExitDefinition = {
  id: 'to-cellar',
  zone: { col: 5, row: 3, width: 1, height: 1 },
  to: { area: 'cellar', entrance: 'from-arena' },
};
const TO_ARENA: ExitDefinition = {
  id: 'to-arena',
  zone: { col: 1, row: 3, width: 1, height: 1 },
  to: { area: 'arena', entrance: 'from-cellar' },
};

const CELLAR: AreaDefinition = {
  id: 'cellar',
  name: 'Cellar',
  layout: ARENA_LAYOUT,
  monsters: [],
  entrances: [FROM_ARENA],
  exits: [TO_ARENA],
};

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

describe('Content validation of connected Adventure Areas', () => {
  it('refuses an Adventure Area that has no entrance', () => {
    expectRefused(arena({ entrances: [], exits: [TO_CELLAR], otherAreas: [CELLAR] }), 'Area "arena" has no entrance');
    expectRefused(
      arena({ entrances: [FROM_CELLAR], exits: [TO_CELLAR], otherAreas: [{ ...CELLAR, entrances: [] }] }),
      'Area "cellar" has no entrance',
    );
  });

  it('refuses an exit that leads to an Adventure Area that does not exist', () => {
    const toNowhere: ExitDefinition = { ...TO_CELLAR, id: 'to-nowhere', to: { area: 'nowhere', entrance: 'door' } };

    expectRefused(arena({ exits: [toNowhere] }), 'Area "arena": exit "to-nowhere" leads to unknown area "nowhere"');
  });

  it('refuses an exit that leads to an entrance the Adventure Area does not have', () => {
    const toMissingDoor: ExitDefinition = { ...TO_CELLAR, to: { area: 'cellar', entrance: 'missing-door' } };

    expectRefused(
      arena({ entrances: [FROM_CELLAR], exits: [toMissingDoor], otherAreas: [CELLAR] }),
      'Area "arena": exit "to-cellar" leads to unknown entrance "missing-door" of area "cellar"',
    );
  });

  it('refuses an exit to an Adventure Area that has no exit back', () => {
    const cellarWithoutExit: AreaDefinition = { ...CELLAR, exits: [] };

    expectRefused(
      arena({ entrances: [FROM_CELLAR], exits: [TO_CELLAR], otherAreas: [cellarWithoutExit] }),
      'Area "arena": exit "to-cellar" leads to area "cellar", which has no exit back to area "arena"',
    );
  });

  it('accepts two Adventure Areas that each have an exit into the other', () => {
    const content = arena({ entrances: [FROM_CELLAR], exits: [TO_CELLAR], otherAreas: [CELLAR] });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });

  it('refuses an entrance on solid terrain or outside the map', () => {
    const inWater: EntranceDefinition = { id: 'from-cellar', tile: { col: 2, row: 2 } };
    const outside: EntranceDefinition = { id: 'from-cellar', tile: { col: 9, row: 3 } };

    expectRefused(
      arena({ entrances: [inWater] }),
      'Area "arena": entrance "from-cellar" is placed at (col 2, row 2), which is solid terrain or outside the map',
    );
    expectRefused(
      arena({ entrances: [outside] }),
      'Area "arena": entrance "from-cellar" is placed at (col 9, row 3), which is solid terrain or outside the map',
    );
  });

  it('refuses an exit whose zone reaches outside the map', () => {
    const wide: ExitDefinition = { ...TO_CELLAR, zone: { col: 6, row: 3, width: 2, height: 1 } };

    expectRefused(
      arena({ exits: [wide] }),
      'Area "arena": the zone of exit "to-cellar" (col 6, row 3, 2 wide, 1 high) reaches outside the map',
    );
  });

  it('refuses an exit whose zone is not whole tiles, or is less than a tile', () => {
    const halfWay: ExitDefinition = { ...TO_CELLAR, zone: { col: 5.5, row: 3, width: 1, height: 1 } };
    const flat: ExitDefinition = { ...TO_CELLAR, zone: { col: 5, row: 3, width: 1, height: 0 } };

    expectRefused(
      arena({ exits: [halfWay] }),
      'Area "arena": the zone of exit "to-cellar" (col 5.5, row 3, 1 wide, 1 high) must be whole tiles, at least one wide and one high',
    );
    expectRefused(
      arena({ exits: [flat] }),
      'Area "arena": the zone of exit "to-cellar" (col 5, row 3, 1 wide, 0 high) must be whole tiles, at least one wide and one high',
    );
  });

  it('refuses two entrances or two exits with the same id in one Adventure Area', () => {
    const sameEntrance: EntranceDefinition = { ...FROM_CELLAR, tile: { col: 1, row: 1 } };
    const sameExit: ExitDefinition = { ...TO_CELLAR, zone: { col: 5, row: 1, width: 1, height: 1 } };

    expectRefused(
      arena({ entrances: [FROM_CELLAR, sameEntrance] }),
      'Area "arena": entrance id "from-cellar" is used more than once',
    );
    expectRefused(
      arena({ entrances: [FROM_CELLAR], exits: [TO_CELLAR, sameExit], otherAreas: [CELLAR] }),
      'Area "arena": exit id "to-cellar" is used more than once',
    );
  });

  it('refuses an entrance where the hero would at once overlap an exit of the same Adventure Area', () => {
    const insideTheExit: EntranceDefinition = { id: 'from-cellar', tile: { col: 5, row: 3 } };

    expectRefused(
      arena({ entrances: [insideTheExit], exits: [TO_CELLAR], otherAreas: [CELLAR] }),
      'Area "arena": entrance "from-cellar" is inside exit "to-cellar", which would send the hero straight back',
    );
  });
});
