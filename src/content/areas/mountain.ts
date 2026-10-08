import type { AreaDefinition } from '../../core';

// The mountain, the third area of the adventure, between the woods and the cave: 44 by 30 tiles, larger than the
// screen both ways (20 by 12), so that the view follows the hero. Rock (solid, #) is the cliffs and the boulders; the
// ledges between them are grass, and the trail, a path of sand, climbs from the way in from the woods at the south-west
// to the way on to the cave at the east, which the text of the area tells the hero to follow. It needs no key, no lever
// and no door, and no other way goes round the high gap at the neck of the summit, which is the milestone. Rows 0 to 2
// are rock, so that the top-left corner, which the HUD covers (core/covered-corner.ts), is solid.
export const mountain: AreaDefinition = {
  id: 'mountain',
  name: 'The Mountain',
  text: 'Follow the sand path up. Raiders watch the pass.',
  entrances: [
    { id: 'from-woods', tile: { col: 1, row: 24 } },
    { id: 'from-cave', tile: { col: 42, row: 6 } },
  ],
  checkpoints: [{ id: 'mountain-checkpoint', tile: { col: 1, row: 24 } }],
  exits: [
    {
      id: 'to-woods',
      zone: { col: 0, row: 24, width: 1, height: 2 },
      to: { area: 'woods', entrance: 'from-mountain' },
    },
    {
      id: 'to-cave',
      zone: { col: 43, row: 6, width: 1, height: 2 },
      to: { area: 'cave', entrance: 'from-mountain' },
    },
  ],
  layout: [
    '############################################',
    '############################################',
    '############################################',
    '############################################',
    '########,,,,,,##,,,,,,,,#,,,#####,,##,,,####',
    '######,,,,,,,,,,,,,,,,,##,,,,,,,,,,,,,,,,,,#',
    '######,,,.............,,,,,.................',
    '######,,,.,,,,,,,,,,,.......,,,,,,,,,,,,,,,,',
    '########,.,,,,,,,,##,,,,,##,#####,,###,,####',
    '#########.,#################################',
    '#########.,#################################',
    '#########.,#################################',
    '#########.,#################################',
    '#########.,,,,,,,,,,,,#####,,,,,,,,#########',
    '########,.,,##,,,,,,,,,####,,,,,,,##,#######',
    '########,.,,,,,,,,,,,,,,,,,,,,,,,,,,,#######',
    '########,........................,,,,#######',
    '########,,,,,,,,,,,,,,,,,,,,,,,,.,,,,#######',
    '##########,,,,,,##,,,,#######,,,.##,,#######',
    '##############,####,###########,.,##########',
    '##############,####,###########,.,##########',
    '###############################,.,#####,,,##',
    '###,,,,,,,#####,,,,,,##,,,,,,##,.,####,,,,,#',
    '#,,,,##,,,,###,,,,,,,,,,,,,,,,,,.,,,,,,,,,,#',
    '.................,,,,,,,.........,,,,,,,,,,#',
    ',,,,,,,,,,,,,,,,.........,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,##,###,,,##,,,,,,##,,,#,,,,,,,###,,#',
    '####,,,,,#,#####,,#,,,,,,,#,,###############',
    '############################################',
    '############################################',
  ],
  monsters: [
    { id: 'mountain-raider-1', type: 'raider', tile: { col: 18, row: 24 } },
    { id: 'mountain-raider-2', type: 'raider', tile: { col: 26, row: 25 } },
    { id: 'mountain-charger-1', type: 'raider-charger', tile: { col: 28, row: 14 } },
    { id: 'mountain-archer-1', type: 'raider-archer', tile: { col: 16, row: 15 } },
    { id: 'mountain-veteran-1', type: 'raider-veteran', tile: { col: 11, row: 7 } },
    { id: 'mountain-raider-3', type: 'raider', tile: { col: 40, row: 23 } },
  ],
  milestones: [{ id: 'high-gap', zone: { col: 29, row: 5, width: 3, height: 3 }, reward: { experience: 3 } }],
  interactables: [
    // The Plate Armor, in an alcove of the cliff a few steps off the trail, where the hero passes it before the veteran
    // higher up notices it. The chest stands in row 20 and not lower: the view stops at the bottom of the area, so a hero
    // in front of a chest in its last rows would stand under the notice of what it found, which is drawn low.
    {
      kind: 'chest',
      id: 'mountain-armor-chest',
      tile: { col: 14, row: 20 },
      contents: { kind: 'gear', gear: 'plate-armor' },
    },
  ],
};
