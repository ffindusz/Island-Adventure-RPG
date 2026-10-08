import type { AreaDefinition } from '../../core';

// The old castle, only a stub for now so that the route from the cave leads somewhere: one screen of rock and grass
// with a way in from the cave, the Checkpoint beside it and the way back. It has nothing else to find yet. The ticket
// that builds the castle replaces the map and fills it, keeping the way in, the way back and the Checkpoint where the
// cave expects them (entrance from-cave, exit to-cave, Checkpoint castle-checkpoint). Rows 0 to 2 are rock, so that the
// top-left corner, which the HUD covers (core/covered-corner.ts), is solid.
export const castle: AreaDefinition = {
  id: 'castle',
  name: 'The Old Castle',
  text: 'The old castle waits in silence.',
  entrances: [{ id: 'from-cave', tile: { col: 1, row: 6 } }],
  checkpoints: [{ id: 'castle-checkpoint', tile: { col: 1, row: 6 } }],
  exits: [
    {
      id: 'to-cave',
      zone: { col: 0, row: 6, width: 1, height: 2 },
      to: { area: 'cave', entrance: 'from-castle' },
    },
  ],
  layout: [
    '####################',
    '####################',
    '####################',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,##,,,,,##,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    ',,,,,,,,,,,,,,,,,,,#',
    ',,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,##,,,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '####################',
  ],
  monsters: [],
};
