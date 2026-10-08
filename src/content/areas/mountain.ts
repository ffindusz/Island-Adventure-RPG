import type { AreaDefinition } from '../../core';

// The mountain, only a stub for now so that the route from the woods leads somewhere: one screen of rock and grass
// with a way in from the woods, the Checkpoint beside it and the way back. It has nothing else to find yet. The ticket
// that builds the mountain replaces the map and fills it, keeping the way in and the way back where the woods expect
// them (entrance from-woods, exit to-woods). Rows 0 to 2 are rock, so that the top-left corner, which the HUD covers
// (core/covered-corner.ts), is solid.
export const mountain: AreaDefinition = {
  id: 'mountain',
  name: 'The Mountain',
  text: 'A cold wind blows down from the peaks.',
  entrances: [
    { id: 'from-woods', tile: { col: 1, row: 6 } },
    { id: 'from-cave', tile: { col: 18, row: 6 } },
  ],
  checkpoints: [{ id: 'mountain-checkpoint', tile: { col: 1, row: 6 } }],
  exits: [
    {
      id: 'to-woods',
      zone: { col: 0, row: 6, width: 1, height: 2 },
      to: { area: 'woods', entrance: 'from-mountain' },
    },
    {
      id: 'to-cave',
      zone: { col: 19, row: 6, width: 1, height: 2 },
      to: { area: 'cave', entrance: 'from-mountain' },
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
