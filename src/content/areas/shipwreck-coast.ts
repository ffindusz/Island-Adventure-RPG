import type { AreaDefinition } from '../../core';

// A placeholder that grows into the real shipwreck coast in a later ticket: a beach and a meadow, split by a wall of
// rock with a two-tile gap, and two crabs on the meadow side, far from where the hero starts on the beach (so a hero
// who is defeated and returns there is not at once in danger). Water and rock are solid. Passing through the gap is a
// milestone, worth a little Experience. Two chests on the beach, one up and one down the column of the start, hold a
// better sword and better armor. Two more, in the column two tiles right of the start, hold a short bow and a cache
// of arrows. In the column two tiles left of it, a chest up the beach holds two Healing Potions and a third lies on the
// ground down the beach, to be taken by walking over it.
export const shipwreckCoast: AreaDefinition = {
  id: 'shipwreck-coast',
  name: 'Shipwreck Coast',
  text: 'You washed up on a strange shore.',
  entrances: [{ id: 'from-trail', tile: { col: 18, row: 5 } }],
  exits: [
    {
      id: 'to-trail',
      zone: { col: 19, row: 5, width: 1, height: 2 },
      to: { area: 'overgrown-trail', entrance: 'from-coast' },
    },
  ],
  layout: [
    '~~~~~~~~~~~~~~~~~~~~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~..........,,,,,,,,,',
    '~..........,,,,,,,,,',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~.........#,,,,,,,,~',
    '~~~~~~~~~~~~~~~~~~~~',
  ],
  // Kept clear of the entrance from the trail as well as the start, so that a hero who comes in there, or is defeated
  // there and returns, is not at once in danger.
  monsters: [
    { id: 'crab-1', type: 'crab', tile: { col: 12, row: 3 } },
    { id: 'crab-2', type: 'crab', tile: { col: 12, row: 8 } },
  ],
  milestones: [{ id: 'rock-wall-gap', zone: { col: 10, row: 5, width: 1, height: 2 }, reward: { experience: 5 } }],
  interactables: [
    { kind: 'chest', id: 'sword-chest', tile: { col: 4, row: 3 }, contents: { kind: 'gear', gear: 'steel-sword' } },
    { kind: 'chest', id: 'armor-chest', tile: { col: 4, row: 7 }, contents: { kind: 'gear', gear: 'chain-mail' } },
    { kind: 'chest', id: 'bow-chest', tile: { col: 6, row: 3 }, contents: { kind: 'gear', gear: 'short-bow' } },
    {
      kind: 'chest',
      id: 'arrow-cache',
      tile: { col: 6, row: 7 },
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 6 },
    },
    {
      kind: 'chest',
      id: 'potion-chest',
      tile: { col: 2, row: 3 },
      contents: { kind: 'consumable', consumable: 'healing-potion', amount: 2 },
    },
    { kind: 'pickup', id: 'beach-potion', tile: { col: 2, row: 7 }, consumable: 'healing-potion', amount: 1 },
  ],
};
