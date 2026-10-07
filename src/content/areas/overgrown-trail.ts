import type { AreaDefinition } from '../../core';

// A placeholder that grows into the woods in a later ticket, and the first area larger than the screen (30 by 20 tiles
// where the screen shows 20 by 12), so that the view has to follow the hero. A sand trail leads from the way back to
// the coast on the west, round the north of a pond, and down to a clearing at the far east. The rest is grass, with
// rock for trees. Three crabs, none near the way in, so that a hero who comes in, or is defeated and returns to the
// Checkpoint there, is not at once in danger. Reaching the clearing is a milestone. The rock at the north-west corner,
// down to row 2 and across to column 5, is where the HUD sits when the view is at that corner, so that it never covers
// the hero. The Checkpoint of the area is at the way in from the coast, where the hero comes in.
export const overgrownTrail: AreaDefinition = {
  id: 'overgrown-trail',
  name: 'Overgrown Trail',
  text: 'A tangled trail leads into the woods.',
  entrances: [{ id: 'from-coast', tile: { col: 1, row: 9 } }],
  checkpoints: [{ id: 'trail-checkpoint', tile: { col: 1, row: 9 } }],
  exits: [
    {
      id: 'to-coast',
      zone: { col: 0, row: 9, width: 1, height: 2 },
      to: { area: 'shipwreck-coast', entrance: 'from-trail' },
    },
  ],
  layout: [
    '##############################',
    '######,,,,,,,,,,,,,,,,,,,,,,,#',
    '######,,,,,,,,##,,,,,,,,,,##,#',
    '#,,##,,,,,,,,,#,,,,,,,,,,,#,,#',
    '#,,,,,,,...............,,,,,,#',
    '#,,,,,,,...............,,,,,,#',
    '#,,,,,,#..,,,~~~~,,,,..,,,,,,#',
    '#,,,,,,#..,,~~~~~~,,,..,,....#',
    '#,,,,,,,..,,~~~~~~,,,..,,....#',
    '..........,,~~~~~~,,,........#',
    '..........,,~~~~~~,,,........#',
    '#,,,,,,,,,,,,~~~~,,,,,,,,....#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,....#',
    '#,,,,,,,#,,,,,,,,,,,,,,,,,,,,#',
    '#,,##,,,#,,,,,,,,,,,##,,,,,,,#',
    '#,,##,,,,,,,,##,,,,,,#,,,##,,#',
    '#,,,,,,,,,,,,#,,,,,,,,,,,,#,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '##############################',
  ],
  monsters: [
    { id: 'trail-crab-1', type: 'crab', tile: { col: 15, row: 4 } },
    { id: 'trail-crab-2', type: 'crab', tile: { col: 17, row: 13 } },
    { id: 'trail-crab-3', type: 'crab', tile: { col: 23, row: 7 } },
  ],
  milestones: [{ id: 'far-clearing', zone: { col: 27, row: 8, width: 2, height: 4 }, reward: { experience: 5 } }],
};
