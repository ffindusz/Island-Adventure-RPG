import type { AreaDefinition } from '../../core';

// The shipwreck coast, where the adventure begins: 40 by 18 tiles, so the view follows the hero. The hero comes to on
// a beach under the hull of the wreck in the north-west, the sea behind it. A path of sand runs east along the beach,
// through a gap in the rocks into a bay with an outcrop of rock, and out of the bay by a mouth in the east wall, with
// a piece of wreckage beside it. Beyond lies a corridor that turns from sand to grass at the exit toward the woods.
// Water, rock and wreckage are solid. Passing the mouth is the milestone, worth a little Experience. Chests are solid
// too. A chest of Healing Potions stands under the hull and a third potion lies on the beach, to be taken by walking
// over it. A crevice in the south wall of the bay, with no sign to it, leads to a cove: the side path, where a better
// sword waits in a chest at the far end. Three crabs, the weak chasers, keep the bay, the corridor and the cove, far
// from where the hero starts and comes in, so that a hero who is defeated and returns to the Checkpoint is not at once
// in danger. The Checkpoint is where the hero starts: the start of the adventure counts as the first. Rows 0 to 2 are
// water, so that the top-left corner, which the HUD covers (core/covered-corner.ts), is solid.
export const shipwreckCoast: AreaDefinition = {
  id: 'shipwreck-coast',
  name: 'Shipwreck Coast',
  text: 'Wreckage litters the shore. Follow the beach east.',
  entrances: [{ id: 'from-woods', tile: { col: 38, row: 8 } }],
  checkpoints: [{ id: 'coast-checkpoint', tile: { col: 5, row: 9 } }],
  exits: [
    {
      id: 'to-woods',
      zone: { col: 39, row: 8, width: 1, height: 2 },
      to: { area: 'woods', entrance: 'from-coast' },
    },
  ],
  layout: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~WWWWW~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~WWWWWWWW~~~~~~~~~~~~~~..~~~~~~~~~~~~~~',
    '~~WWWWWWWWW~..###............###########',
    '~.WWWWWWWW....###............WW#########',
    '~.............###....##..........,,,,,,#',
    '~....................##..........,,,,,,,',
    '~................................,,,,,,,',
    '~.............###................,,,,,,#',
    '~.............###............###########',
    '~...........#####............###########',
    '~########################.##############',
    '~####################..........#########',
    '~####################...........########',
    '~####################..........#########',
    '~#######################################',
  ],
  // Kept clear of the entrance from the woods as well as the start with its Checkpoint, so that a hero who comes in
  // there, or returns to the Checkpoint after a defeat, is not at once in danger: no monster's noticing distance
  // reaches a hero who stands on either (shipped-enemies.test.ts). The first crab waits in the bay, the second in the
  // corridor, and the third in the cove, by the chest.
  monsters: [
    { id: 'crab-1', type: 'crab', tile: { col: 22, row: 10 } },
    { id: 'crab-2', type: 'crab', tile: { col: 32, row: 9 } },
    { id: 'crab-3', type: 'crab', tile: { col: 26, row: 16 } },
  ],
  // The mouth in the east wall, all four tiles of it: every way to the exit crosses it.
  milestones: [{ id: 'broken-mast', zone: { col: 29, row: 7, width: 1, height: 4 }, reward: { experience: 5 } }],
  interactables: [
    {
      kind: 'chest',
      id: 'potion-chest',
      tile: { col: 8, row: 7 },
      contents: { kind: 'consumable', consumable: 'healing-potion', amount: 2 },
    },
    { kind: 'pickup', id: 'beach-potion', tile: { col: 9, row: 11 }, consumable: 'healing-potion', amount: 1 },
    { kind: 'chest', id: 'sword-chest', tile: { col: 31, row: 15 }, contents: { kind: 'gear', gear: 'steel-sword' } },
  ],
};
