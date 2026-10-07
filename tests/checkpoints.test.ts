import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { AreaDefinition, ContentDefinition, EntranceDefinition, ExitDefinition } from '../src/core';
import { ARENA_LAYOUT, arena, chestAt, dummyAt, fixedRandom, pickupAt } from './fixtures';
import type { ArenaOptions } from './fixtures';

// The test world: the arena and a cellar, both 7 x 6 tiles (see fixtures.ts), each with an exit into the other.
//
//   arena   entrance "from-cellar" at tile (4, 3), exit "to-cellar" on tile (5, 3)
//   cellar  entrance "from-arena" at tile (2, 3), exit "to-arena" on tile (1, 3)
//
// The hero starts at (3.5, 3.5) in the arena. Its body is 0.5 wide and a step is 0.125.

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
  checkpoints: [{ id: 'cellar-checkpoint', tile: { col: 1, row: 1 } }],
};

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

/** The arena and the cellar, with the hero in the arena. */
function world(arenaOptions: ArenaOptions = {}): ContentDefinition {
  return arena({ entrances: [FROM_CELLAR], exits: [TO_CELLAR], ...arenaOptions, otherAreas: [CELLAR] });
}

describe('Checkpoints in the content', () => {
  it('an Adventure Area without a Checkpoint is refused', () => {
    expectRefused(arena({ checkpoints: [] }), 'Area "arena" has no Checkpoint');
  });

  it('two Checkpoints have the same id, even in different Adventure Areas', () => {
    const cellar = {
      id: 'cellar',
      name: 'Cellar',
      layout: ARENA_LAYOUT,
      monsters: [],
      checkpoints: [{ id: 'arena-checkpoint', tile: { col: 2, row: 1 } }],
    };

    expectRefused(arena({ otherAreas: [cellar] }), 'Checkpoint id "arena-checkpoint" is used more than once');
  });

  it.each([
    { where: 'on water', tile: { col: 2, row: 2 }, described: '(col 2, row 2)' },
    { where: 'in a wall', tile: { col: 0, row: 3 }, described: '(col 0, row 3)' },
    { where: 'outside the map', tile: { col: 7, row: 1 }, described: '(col 7, row 1)' },
  ])('a Checkpoint $where is refused', ({ tile, described }) => {
    expectRefused(
      arena({ checkpoints: [{ id: 'gate', tile }] }),
      `Area "arena": Checkpoint "gate" is placed at ${described}, which is solid terrain or outside the map`,
    );
  });

  it('a Checkpoint inside an exit is refused: defeat would send the hero straight through the exit', () => {
    expectRefused(
      world({ checkpoints: [{ id: 'gate', tile: { col: 5, row: 3 } }] }),
      'Area "arena": Checkpoint "gate" is inside exit "to-cellar", which would send the hero straight through it',
    );
  });

  it.each([
    { what: 'a chest', interactable: chestAt('chest', 2, 3, 'iron-sword'), named: 'chest "chest"' },
    { what: 'a pickup', interactable: pickupAt('potion', 2, 3, 1), named: 'pickup "potion"' },
  ])('$what on the tile of a Checkpoint is refused', ({ interactable, named }) => {
    expectRefused(
      arena({ checkpoints: [{ id: 'gate', tile: { col: 2, row: 3 } }], interactables: [interactable] }),
      `Area "arena": ${named} is placed at (col 2, row 3), where Checkpoint "gate" stands`,
    );
  });

  it('a monster that starts on the tile of a Checkpoint is refused', () => {
    expectRefused(
      arena({ checkpoints: [{ id: 'gate', tile: { col: 2, row: 3 } }], monsters: [dummyAt('dummy', 2, 3)] }),
      'Area "arena": Checkpoint "gate" is placed at (col 2, row 3), where monster "dummy" starts',
    );
  });
});
