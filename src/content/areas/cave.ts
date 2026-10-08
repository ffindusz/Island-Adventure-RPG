import type { AreaDefinition } from '../../core';

// The cave, only a stub for now so that the route from the mountain leads somewhere: one screen of rock and grass with
// a way in from the mountain, the Checkpoint beside it, the way back, and the way on to the castle. It has nothing else
// to find yet. The ticket that builds the cave replaces the map and fills it, keeping the way in, the way back and the
// Checkpoint where the mountain expects them (entrance from-mountain, exit to-mountain, Checkpoint cave-checkpoint).
// Rows 0 to 2 are rock, so that the top-left corner, which the HUD covers (core/covered-corner.ts), is solid.
export const cave: AreaDefinition = {
  id: 'cave',
  name: 'The Cave',
  text: 'Cold air breathes out of the dark.',
  entrances: [
    { id: 'from-mountain', tile: { col: 1, row: 6 } },
    { id: 'from-castle', tile: { col: 18, row: 6 } },
  ],
  checkpoints: [{ id: 'cave-checkpoint', tile: { col: 1, row: 6 } }],
  exits: [
    {
      id: 'to-mountain',
      zone: { col: 0, row: 6, width: 1, height: 2 },
      to: { area: 'mountain', entrance: 'from-cave' },
    },
    {
      id: 'to-castle',
      zone: { col: 19, row: 6, width: 1, height: 2 },
      to: { area: 'castle', entrance: 'from-cave' },
    },
  ],
  layout: [
    '####################',
    '####################',
    '####################',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,##,,,,,##,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    ',,,,,,,,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,,,,,,,',
    '#,,,,,,,,,,,##,,,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '####################',
  ],
  monsters: [],
};
