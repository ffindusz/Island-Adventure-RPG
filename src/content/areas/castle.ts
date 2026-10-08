import type { AreaDefinition } from '../../core';

// The old castle, the fifth and last area of the adventure, beyond the cave: 64 by 30 tiles, more than three screens wide
// and more than two high (20 by 12), so that the view follows the hero. Rock (solid, #) is the walls and all that lies
// between the rooms. The courtyards are grass and the halls are sand, and the route runs through them in turn, from one
// to the next by a gateway two tiles wide, and ends at a plain wall: the ticket that adds the Guardian's arena replaces
// that wall with the way to it. Rows 0 to 2 are rock, so that the top-left corner, which the HUD covers
// (core/covered-corner.ts), is solid.
//
// The way in is the outer yard at the west (grass, columns 1 to 14, rows 4 to 12), the Checkpoint on its tile and the way
// back to the cave in the west edge beside it. A ruined cross wall (columns 7 and 8) stands across the yard, with a gap
// of four tiles (rows 7 to 10) the route goes through. From the south-east corner of the yard the gatehouse passage
// (columns 12 and 13, rows 13 and 14) leads down into the long hall (sand, columns 9 to 26, rows 15 to 19), with four
// pillars in row 17, and the inner gateway (column 27, rows 16 and 17) at its east end into the inner courtyard (grass,
// columns 28 to 42, rows 5 to 19), with a fountain and four pillars. The route runs along its east side and north to the
// door of the great hall (column 43, rows 5 and 6), through the great hall (sand, columns 44 to 56, rows 4 to 12), with
// four pillars, and out by the great gateway (column 57, rows 11 and 12) into the last hall (sand, columns 58 to 62,
// rows 8 to 14), where nothing is placed. The east wall (column 63) is the end of the route, at the tile (62, 11).
//
// Two side paths lead off the route, a good walk each, behind the creatures that the route does not meet. The watch
// tower is a room (sand, columns 19 to 26, rows 4 to 9) up the stair (columns 24 and 25, rows 10 to 14) that rises from
// the north side of the long hall. The crypt is a room (sand, columns 29 to 41, rows 22 to 26) with two tombs, down the
// stair (columns 34 and 35, rows 20 and 21) that falls from the south side of the inner courtyard. A small armory, an
// alcove of the long hall (columns 17 to 21, rows 12 to 14), is a step aside from the route.
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
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '#,,,,,,##,,,,,,####........#################.............#######',
    '#,,,,,,##,,,,,,####........#,,,,,,,,,,,,,,,..............#######',
    ',,,,,,,##,,,,,,####........#,,,,,,,,,,,,,,,....#.....#...#######',
    ',,,,,,,,,,,,,,,####........#,,,,,,,,,,,,,,,#.............#######',
    '#,,,,,,,,,,,,,,####........#,,,#,,,,,,,#,,,#.............#.....#',
    '#,,,,,,,,,,,,,,####........#,,,,,,,,,,,,,,,#.............#.....#',
    '#,,,,,,,,,,,,,,#########..##,,,,,,,,,,,,,,,#...#.....#...#.....#',
    '#,,,,,,##,,,,,,#########..##,,,,,,###,,,,,,#...................#',
    '#,,,,,,##,,,,,,##.....##..##,,,,,,###,,,,,,#...................#',
    '############..###.....##..##,,,,,,###,,,,,,###############.....#',
    '############..###.....##..##,,,,,,,,,,,,,,,###############.....#',
    '#########..................#,,,#,,,,,,,,,,,#####################',
    '#########...................,,,,,,,,,,,#,,,#####################',
    '#########...#...#...#...#...,,,,,,,,,,,,,,,#####################',
    '#########..................#,,,,,,,,,,,,,,,#####################',
    '#########..................#,,,,,,,,,,,,,,,#####################',
    '##################################..############################',
    '##################################..############################',
    '#############################.............######################',
    '#############################.............######################',
    '#############################...#.....#...######################',
    '#############################.............######################',
    '#############################.............######################',
    '################################################################',
    '################################################################',
    '################################################################',
  ],
  // The undead of the castle, in the order of the route. The optional ones come last: the wraith of the watch tower and
  // the ghoul of the crypt guard the side paths, where the hero who keeps to the route does not go.
  monsters: [
    { id: 'yard-skeleton-1', type: 'castle-skeleton', tile: { col: 10, row: 8 } },
    { id: 'yard-skeleton-2', type: 'castle-skeleton', tile: { col: 12, row: 11 } },
    { id: 'hall-skeleton', type: 'castle-skeleton', tile: { col: 15, row: 16 } },
    { id: 'hall-wraith', type: 'castle-wraith', tile: { col: 22, row: 18 } },
    { id: 'court-skeleton', type: 'castle-skeleton', tile: { col: 31, row: 12 } },
    { id: 'court-ghoul', type: 'castle-ghoul', tile: { col: 38, row: 12 } },
    { id: 'court-wraith', type: 'castle-wraith', tile: { col: 40, row: 6 } },
    { id: 'great-knight', type: 'castle-knight', tile: { col: 50, row: 8 } },
    { id: 'tower-wraith', type: 'castle-wraith', tile: { col: 22, row: 6 } },
    { id: 'crypt-ghoul', type: 'castle-ghoul', tile: { col: 36, row: 24 } },
  ],
  // The great gateway: the passage from the great hall into the last hall, two tiles wide, which every way on takes.
  milestones: [{ id: 'great-gateway', zone: { col: 57, row: 11, width: 1, height: 2 }, reward: { experience: 3 } }],
  interactables: [
    // The Knight's Armor, in a chest at the back of the small armory off the long hall, a few steps from the route,
    // where the hero passes it long before the knight of the great hall notices it.
    {
      kind: 'chest',
      id: 'castle-armor-chest',
      tile: { col: 19, row: 12 },
      contents: { kind: 'gear', gear: 'knight-armor' },
    },
    // Three caches of arrows a step or two off the route: the first by the west end of the long hall, the second in the
    // south-east corner of the inner courtyard and the third in the great hall, past the knight and just before the last
    // hall, so that the hero who has spent its arrows on the way can fill the quiver for the final fight.
    {
      kind: 'chest',
      id: 'castle-arrow-cache-1',
      tile: { col: 10, row: 16 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 6 },
    },
    {
      kind: 'chest',
      id: 'castle-arrow-cache-2',
      tile: { col: 40, row: 17 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 6 },
    },
    {
      kind: 'chest',
      id: 'castle-arrow-cache-3',
      tile: { col: 55, row: 12 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 6 },
    },
    // Healing Potions on the ground a step or two off the route: one in the long hall, one below the fountain of the
    // inner courtyard and one in the north-east corner of the great hall, past the knight.
    { kind: 'pickup', id: 'castle-potion-1', tile: { col: 16, row: 18 }, consumable: 'healing-potion', amount: 1 },
    { kind: 'pickup', id: 'castle-potion-2', tile: { col: 36, row: 14 }, consumable: 'healing-potion', amount: 1 },
    { kind: 'pickup', id: 'castle-potion-3', tile: { col: 55, row: 4 }, consumable: 'healing-potion', amount: 1 },
    // The side path of the watch tower: the room at the top of the stair that rises from the long hall, a good walk from
    // the route, which a wraith guards. It keeps two Healing Potions and a big cache of arrows.
    {
      kind: 'chest',
      id: 'tower-potion-chest',
      tile: { col: 20, row: 4 },
      contents: { kind: 'consumable', consumable: 'healing-potion', amount: 2 },
    },
    {
      kind: 'chest',
      id: 'tower-arrow-chest',
      tile: { col: 25, row: 4 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 8 },
    },
    // The side path of the crypt: the room at the foot of the stair that falls from the inner courtyard, a good walk
    // from the route, which a ghoul guards. It keeps three Healing Potions and a big cache of arrows. Both chests stand
    // above row 27: the view stops at the bottom of the area, so a hero in front of a chest in its last rows would
    // stand under the notice.
    {
      kind: 'chest',
      id: 'crypt-potion-chest',
      tile: { col: 30, row: 25 },
      contents: { kind: 'consumable', consumable: 'healing-potion', amount: 3 },
    },
    {
      kind: 'chest',
      id: 'crypt-arrow-chest',
      tile: { col: 39, row: 26 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 8 },
    },
  ],
};
