import type { AreaDefinition } from '../../core';

// The cave, the fourth area of the adventure, between the mountain and the old castle: 48 by 34 tiles, larger than the
// screen both ways (20 by 12), so that the view follows the hero. Rock (solid, #) is most of it, and the chambers and
// passages are carved out of it. The main route is a path of sand, which the text of the area tells the hero to follow:
// from the way in at the west, through six chambers joined by passages, down and round and up again to the way on to the
// castle at the east, more than twice as long as the straight line between the two. What lies beside it, on grass, is
// optional. Rows 0 to 2 are rock, so that the top-left corner, which the HUD covers (core/covered-corner.ts), is solid.
//
// The way in is the chamber at the north-west (columns 1 to 10, rows 5 to 9), the Checkpoint on its tile. From there the
// route runs east along a short passage into the north chamber (columns 18 to 28), south down a shaft to the middle
// chamber (columns 14 to 27, rows 18 to 24), west and south down another passage to the south-west chamber (columns 3 to
// 16, rows 26 to 30), east along the long passage under the rock to the south-east chamber (columns 32 to 43, rows 23 to
// 30), and north up the narrow shaft (two tiles wide, columns 40 and 41) to the chamber at the north-east, where the way
// on is.
export const cave: AreaDefinition = {
  id: 'cave',
  name: 'The Cave',
  text: 'Cold air breathes out of the dark. Follow the sand.',
  entrances: [
    { id: 'from-mountain', tile: { col: 1, row: 6 } },
    { id: 'from-castle', tile: { col: 46, row: 9 } },
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
      zone: { col: 47, row: 9, width: 1, height: 2 },
      to: { area: 'castle', entrance: 'from-cave' },
    },
  ],
  layout: [
    '################################################',
    '################################################',
    '################################################',
    '################################################',
    '####################.###########################',
    '##........#########.........####################',
    '...........#######...........###################',
    '.....##......................########.........##',
    '#.....................##.....#######...........#',
    '##........########....##.....#######.....##.....',
    '####,,############...........#######.....##.....',
    '####,,############...........#######...........#',
    '####,,#############.........########...........#',
    '###,,,,,,,#############..###########...........#',
    '##,,,,,,,,,####,,,,,###..############.........##',
    '##,,,,,,,,,####,,,,,###..###############..######',
    '##,,,,,,,,,####,,,,,###..###############..######',
    '###,,,,,,,#######,#####..###############..######',
    '###############............#############..######',
    '##############..............############..######',
    '##############..............############..######',
    '#######..............##.....,###########..######',
    '#######..............##.....############..######',
    '#######..#####..............#####..........#####',
    '#######..######............#####............####',
    '#######..#######################....##......####',
    '####............################....##.......###',
    '###.........................................####',
    '##.......##.................................####',
    '###......##......###############............####',
    '####............#################..........#####',
    '################################################',
    '################################################',
    '################################################',
  ],
  // The creatures of the cave. The optional ones come last: the second lizard guards the grass room of the side path,
  // where the hero who keeps to the sand does not go.
  monsters: [
    { id: 'cave-bat-1', type: 'cave-bat', tile: { col: 14, row: 7 } },
    { id: 'cave-bat-2', type: 'cave-bat', tile: { col: 26, row: 9 } },
    { id: 'cave-lizard-1', type: 'cave-lizard', tile: { col: 16, row: 23 } },
    { id: 'cave-eye-1', type: 'cave-eye', tile: { col: 15, row: 30 } },
    { id: 'cave-bear-1', type: 'cave-bear', tile: { col: 39, row: 11 } },
    { id: 'cave-lizard-2', type: 'cave-lizard', tile: { col: 6, row: 15 } },
  ],
};
