import type { InteractableDefinition } from '../../core';

// The light puzzles of the Overgrown Trail, in side rooms in its south corners that no route needs: the way from the
// coast to the clearing never wants a key, a lever or a door. The cabin in the south-west is locked, and a sign by its
// door says where the key is: the brass key lies in the north woods. A chest of Healing Potions is inside.
export const trailPuzzles: readonly InteractableDefinition[] = [
  { kind: 'key', id: 'brass-key', tile: { col: 8, row: 2 }, name: 'Brass Key' },
  { kind: 'door', id: 'cabin-door', tile: { col: 2, row: 16 }, key: 'brass-key' },
  {
    kind: 'sign',
    id: 'cabin-sign',
    tile: { col: 1, row: 15 },
    text: 'The cabin is locked. Its key is in the north woods.',
  },
  {
    kind: 'chest',
    id: 'cabin-chest',
    tile: { col: 3, row: 18 },
    contents: { kind: 'consumable', consumable: 'healing-potion', amount: 2 },
  },
];
