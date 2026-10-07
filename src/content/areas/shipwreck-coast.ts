import type { AreaDefinition } from '../../core';

// A placeholder that grows into the real shipwreck coast in a later ticket: a beach and a meadow, split by a wall of
// rock with a two-tile gap, and two crabs on the meadow side, far from where the hero starts on the beach (so a hero
// who is defeated and returns there is not at once in danger). Water and rock are solid. Passing through the gap is a
// milestone, worth a little Experience.
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
  monsters: [
    { id: 'crab-1', type: 'crab', tile: { col: 14, row: 5 } },
    { id: 'crab-2', type: 'crab', tile: { col: 16, row: 9 } },
  ],
  milestones: [{ id: 'rock-wall-gap', zone: { col: 10, row: 5, width: 1, height: 2 }, reward: { experience: 5 } }],
};
