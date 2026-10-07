import type { AreaDefinition } from '../../core';

// A placeholder that grows into the real shipwreck coast in a later ticket: a beach and a meadow, split by a wall of
// rock with a two-tile gap, and one crab on the meadow side. Water and rock are solid.
export const shipwreckCoast: AreaDefinition = {
  id: 'shipwreck-coast',
  name: 'Shipwreck Coast',
  layout: [
    '~~~~~~~~~~~~~~~~~~~~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~..........,,,,,,,,~',
    '~..........,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~~~~~~~~~~~~~~~~~~~~',
  ],
  monsters: [{ id: 'crab-1', type: 'crab', tile: { col: 14, row: 5 } }],
};
