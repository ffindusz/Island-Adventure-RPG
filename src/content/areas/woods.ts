import type { AreaDefinition } from '../../core';
import { firstFinds } from './first-finds';
import { trailPuzzles } from './trail-puzzles';

// The woods, first as the Overgrown Trail placeholder, and the first area larger than the screen (30 by 20 tiles
// where the screen shows 20 by 12), so that the view has to follow the hero. A sand trail leads from the way back to
// the coast on the west, round the north of a pond, and down to a clearing at the far east, where the way on to the
// mountain begins. The rest is grass, with rock for trees. Three crabs, a boar and a spitter, none near the ways in, so
// that a hero who comes in, or is defeated and returns to the Checkpoint there, is not at once in danger. Reaching the
// clearing is a milestone. The rock at the north-west corner, down to row 2 and across to column 5, is where the HUD sits
// when the view is at that corner, so that it never covers the hero. The Checkpoint of the area is at the way in from
// the coast, where the hero comes in. A cabin behind a locked door in the north-west and a shed behind a gate in the
// south-east are its light puzzles (trail-puzzles.ts). The chests that moved here from the coast (first-finds.ts) stand
// in the south-west corner.
export const woods: AreaDefinition = {
  id: 'woods',
  name: 'The Woods',
  text: 'A tangled trail leads into the woods.',
  entrances: [
    { id: 'from-coast', tile: { col: 1, row: 9 } },
    { id: 'from-mountain', tile: { col: 28, row: 9 } },
  ],
  checkpoints: [{ id: 'woods-checkpoint', tile: { col: 1, row: 9 } }],
  exits: [
    {
      id: 'to-coast',
      zone: { col: 0, row: 9, width: 1, height: 2 },
      to: { area: 'shipwreck-coast', entrance: 'from-woods' },
    },
    {
      id: 'to-mountain',
      zone: { col: 29, row: 9, width: 1, height: 2 },
      to: { area: 'mountain', entrance: 'from-woods' },
    },
  ],
  layout: [
    '##############################',
    '######,,,,,,,,,,,,,,,,,,,,,,,#',
    '######,,,,,,,,##,,,,,,,,,,##,#',
    '#,,##,,,,,,,,,#,,,,,,,,,,,#,,#',
    '#,,#,,,,...............,,,,,,#',
    '##,,,,,,...............,,,,,,#',
    '#,,,,,,#..,,,~~~~,,,,..,,,,,,#',
    '#,,,,,,#..,,~~~~~~,,,..,,....#',
    '#,,,,,,,..,,~~~~~~,,,..,,....#',
    '..........,,~~~~~~,,,.........',
    '..........,,~~~~~~,,,.........',
    '#,,,,,,,,,,,,~~~~,,,,,,,,....#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,....#',
    '#,,,,,,,#,,,,,,,,,,,,,,,,,,,,#',
    '#,,##,,,#,,,,,,,,,,,##,,,,,,,#',
    '#,,##,,,,,,,,##,,,,,,#,,,##,,#',
    '#,,,,,,,,,,,,#,,,,,,,,,,,,#,##',
    '#,,,,,,,,,,,,,,,,,,,,,,,,#,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,#,,,#',
    '##############################',
  ],
  monsters: [
    { id: 'woods-crab-1', type: 'crab', tile: { col: 15, row: 4 } },
    { id: 'woods-crab-2', type: 'crab', tile: { col: 17, row: 13 } },
    { id: 'woods-crab-3', type: 'crab', tile: { col: 23, row: 7 } },
    { id: 'woods-boar-1', type: 'boar', tile: { col: 10, row: 15 } },
    { id: 'woods-spitter-1', type: 'spitter', tile: { col: 20, row: 2 } },
  ],
  milestones: [{ id: 'far-clearing', zone: { col: 27, row: 8, width: 2, height: 4 }, reward: { experience: 5 } }],
  // The devices of the light puzzles, and the chests of the first finds (first-finds.ts).
  interactables: [...trailPuzzles, ...firstFinds],
};
