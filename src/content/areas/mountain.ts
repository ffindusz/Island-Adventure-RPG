import type { AreaDefinition } from '../../core';

// The mountain, the third area of the adventure, between the woods and the cave: 44 by 30 tiles, larger than the
// screen both ways (20 by 12), so that the view follows the hero. Rock (solid, #) is the cliffs and the boulders; the
// ledges between them are grass, and the trail, a path of sand, climbs from the way in from the woods at the south-west
// to the way on to the cave at the east, which the text of the area tells the hero to follow. It needs no key, no lever
// and no door, and no other way goes round the high gap at the neck of the summit, which is the milestone. Rows 0 to 2
// are rock, so that the top-left corner, which the HUD covers (core/covered-corner.ts), is solid.
//
// Raiders watch the trail: basic ones, a charger and an archer on the way up, and a veteran, the tougher raider, in the
// shaft that climbs to the summit. The Plate Armor lies in an alcove a few steps off the trail, before the veteran,
// with two caches of arrows and two Healing Potions on the ground along the way. The side path is the overlook at the
// east end of the lower ledge: a good walk from where the trail turns up the cliff, guarded by a raider, it keeps more
// Healing Potions and arrows than the trail does. Rewards stand above the last rows, which the notice of what the hero
// found would otherwise cover. The Experience of the way through is pinned by tests/the-mountain.test.ts.
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
    // higher up notices it. The chest stands in row 20 and not lower: the view stops at the bottom of the area, so a
    // hero in front of a chest in its last rows would stand under the notice of what it found, which is drawn low.
    {
      kind: 'chest',
      id: 'mountain-armor-chest',
      tile: { col: 14, row: 20 },
      contents: { kind: 'gear', gear: 'plate-armor' },
    },
    // Two caches of arrows in nooks of the cliff a few steps off the trail: the first beside the foot of the long
    // ledge, the second in the alcove next to the one of the armor.
    {
      kind: 'chest',
      id: 'mountain-arrow-cache-1',
      tile: { col: 36, row: 18 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 6 },
    },
    {
      kind: 'chest',
      id: 'mountain-arrow-cache-2',
      tile: { col: 19, row: 20 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 6 },
    },
    // Healing Potions on the ground a step off the trail: one on the lower ledge, one at the foot of the shaft that
    // climbs to the veteran.
    { kind: 'pickup', id: 'mountain-potion-1', tile: { col: 22, row: 23 }, consumable: 'healing-potion', amount: 1 },
    { kind: 'pickup', id: 'mountain-potion-2', tile: { col: 12, row: 17 }, consumable: 'healing-potion', amount: 1 },
    // A side path: the overlook, a pocket at the east end of the lower ledge a good walk past where the trail turns up
    // the cliff, which a raider guards. It keeps three Healing Potions and a big cache of arrows. Both chests stand
    // above row 27: the view stops at the bottom of the area, so a hero in front of a chest in its last rows would
    // stand under the notice.
    {
      kind: 'chest',
      id: 'mountain-overlook-potions',
      tile: { col: 42, row: 22 },
      contents: { kind: 'consumable', consumable: 'healing-potion', amount: 3 },
    },
    {
      kind: 'chest',
      id: 'mountain-overlook-cache',
      tile: { col: 42, row: 25 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 8 },
    },
  ],
};
