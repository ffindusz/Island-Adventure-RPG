import type { AreaDefinition } from '../../core';

// The woods, the second area of the adventure, between the coast and the mountain: 48 by 28 tiles, larger than the
// screen both ways (20 by 12), so that the view follows the hero. Trees (solid, T) fill most of it and the glades
// between them are grass. One path of sand, the trail, runs from the way in from the coast at the west to the way on to
// the mountain at the east, which the text of the area tells the hero to follow: it needs no key, no lever and no door,
// and no other way goes round the old oak at the neck where it ends, which is the milestone. Along the trail come the
// bow in a chest, two caches of arrows for it, a wolf, a Healing Potion lying on the ground, a slime, a spitter and a
// boar; a chest of Healing Potions stands by the pond to the north. The side paths are the hero's to find and want
// nothing but a walk and, for the cabin, a key: the Chain Mail in a nook to the south, and a cabin in the south-west
// behind a locked door, whose key lies in the north glade, guarded by a wolf, and which holds the Long Bow. Neither the
// cabin nor the Chain Mail is on any route. No monster stands near either way in, so that a hero who comes in, or is
// defeated and returns to the Checkpoint there, is not at once in danger. The trees at the north-west corner, down to
// row 2 and across to column 5, are where the HUD sits when the view is at that corner, so that it never covers the hero.
export const woods: AreaDefinition = {
  id: 'woods',
  name: 'The Woods',
  text: 'Tall trees close in. Follow the sand path.',
  entrances: [
    { id: 'from-coast', tile: { col: 1, row: 14 } },
    { id: 'from-mountain', tile: { col: 46, row: 18 } },
  ],
  checkpoints: [{ id: 'woods-checkpoint', tile: { col: 1, row: 14 } }],
  exits: [
    {
      id: 'to-coast',
      zone: { col: 0, row: 14, width: 1, height: 2 },
      to: { area: 'shipwreck-coast', entrance: 'from-woods' },
    },
    {
      id: 'to-mountain',
      zone: { col: 47, row: 18, width: 1, height: 2 },
      to: { area: 'mountain', entrance: 'from-woods' },
    },
  ],
  layout: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,,,,,,,,,TTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,,,,,,,,,TTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,TTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTT,,,,,,,,,,,,,,,,,,,,TTTTTTTT',
    'TTTTTTTTTTTTTTTTTTT,,,,,,,,,,,,,,,,T,T,,,TTTTTTT',
    'TTTTTTTTTTTTTTTTTTT,,,,,~~~~~~~~,T,,,,,T,TTTTTTT',
    'TTTTTTTTTTTTTTTTTTT,,,,,~~~~~~~~,,,,,,,,,TTTTTTT',
    'TTTTTTTTTTTTTTTTTTT,,T,,~~~~~~~~,,,,,T,T,TTTTTTT',
    'TT,,,,,,,,,,,,,,,TT,,,,,,,,,,,,,,,,,,,,,,TTTTTTT',
    'T,,,,,,,,,,,T,T,,,T..................,,,,TTTTTTT',
    'T,,,T,,,,,,,,,,,,,T..................,,,,TTTTTTT',
    'T,,,,,T,,,,,,,T,,,T..,,,,,,,,,,,,,,..,,,TTTTTTTT',
    'T,,,,,,,,,,,,,,,,,T..TTTTTTTTTTTTTT..TTTTTTTTTTT',
    '.....................TTTTTTTTTTTTTT..TTTTTTTTTTT',
    '.....................TTTTTTTTT,,,,,..,,,,TTTTTTT',
    'T,,,,,,,,,,,,,,,,,TTTTTTTTTTT,,,,,,..,,T,,TTTTTT',
    'T,,,,,,,,,,,,,,,,,TTTTTTTTTTT,,,,,,..,,,,,TTTTTT',
    'T,,T,,,T,,T,,,,,,,TTTTTTTTTTT,,,,,,.............',
    'TT,,,,,,,,,,,,,,,TTTTTTTTTTTT,,,,,,.............',
    'TTTT,,,TTTTTTT,,TTTTTTTTTTTTT,,,,,,,,,,,,,TTTTTT',
    'TTTT,,,TTTTTTT,,TTTTTTTTTTTTT,,T,,,,,T,,,,TTTTTT',
    'TT###,###TTT,,,,,,,,,,,,,TTTT,,,,,,,,,,T,,TTTTTT',
    'TT#,,,,,#TT,,,T,,,,,,,,,,,TTT,,,,,,,,,,,,,TTTTTT',
    'TT#,,,,,#TT,T,,,,,,,,,,,,,TTTT,,,,,,,,,,,TTTTTTT',
    'TT#,,,,,#TT,,,T,,,,,,,,,,,TTTTTTTTTTTTTTTTTTTTTT',
    'TT#######TTT,,,,,,,,,,,,,TTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  monsters: [
    { id: 'woods-wolf-1', type: 'wolf', tile: { col: 24, row: 12 } },
    { id: 'woods-slime-1', type: 'slime', tile: { col: 34, row: 9 } },
    { id: 'woods-spitter-1', type: 'spitter', tile: { col: 31, row: 17 } },
    { id: 'woods-boar-1', type: 'boar', tile: { col: 34, row: 22 } },
    { id: 'woods-wolf-2', type: 'wolf', tile: { col: 37, row: 2 } },
    { id: 'woods-slime-2', type: 'slime', tile: { col: 17, row: 24 } },
  ],
  milestones: [{ id: 'old-oak', zone: { col: 43, row: 18, width: 3, height: 2 }, reward: { experience: 5 } }],
  interactables: [
    // The bow, and soon after it two caches of arrows, in the west glades beside the trail.
    { kind: 'chest', id: 'bow-chest', tile: { col: 9, row: 12 }, contents: { kind: 'gear', gear: 'short-bow' } },
    {
      kind: 'chest',
      id: 'arrow-cache-1',
      tile: { col: 14, row: 17 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 6 },
    },
    {
      kind: 'chest',
      id: 'arrow-cache-2',
      tile: { col: 17, row: 12 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 6 },
    },
    // Healing Potions: one on the trail, two in a chest by the pond a few steps off it.
    { kind: 'pickup', id: 'woods-potion', tile: { col: 33, row: 12 }, consumable: 'healing-potion', amount: 1 },
    {
      kind: 'chest',
      id: 'woods-potion-chest',
      tile: { col: 22, row: 5 },
      contents: { kind: 'consumable', consumable: 'healing-potion', amount: 2 },
    },
    // A side path: the Chain Mail, in a nook to the south a good walk from the trail. The two chests in the south, this
    // one and the one in the cabin, stand in row 24 and not below it: the view stops at the bottom of the area, so a
    // hero in front of a chest lower down would stand under the notice of what it found, which is drawn low.
    { kind: 'chest', id: 'armor-chest', tile: { col: 22, row: 24 }, contents: { kind: 'gear', gear: 'chain-mail' } },
    // A side path with a key: the cabin in the south-west is locked, a sign by its door says where the key is, and the
    // brass key lies in the north glade. The chest inside holds a better bow than the one in the first chest.
    { kind: 'key', id: 'brass-key', tile: { col: 41, row: 1 }, name: 'Brass Key' },
    { kind: 'door', id: 'cabin-door', tile: { col: 5, row: 22 }, key: 'brass-key' },
    {
      kind: 'sign',
      id: 'cabin-sign',
      tile: { col: 6, row: 21 },
      text: 'The cabin is locked. Its key is in the north woods.',
    },
    { kind: 'chest', id: 'cabin-chest', tile: { col: 7, row: 24 }, contents: { kind: 'gear', gear: 'long-bow' } },
  ],
};
