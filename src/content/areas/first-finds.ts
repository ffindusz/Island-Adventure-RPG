import type { InteractableDefinition } from '../../core';

// Moved here from the shipwreck coast when that became the opening area (ticket 14), for the ticket that builds the
// woods to place where they belong: the short bow (the spec puts the first bow in the woods), a cache of arrows for
// it, and a better armor. They stand in a row at the south-west corner of the trail, on open grass, so that the map of
// the trail is untouched. The boar and the spitter the coast had are not here: the trail has its own.
export const firstFinds: readonly InteractableDefinition[] = [
  { kind: 'chest', id: 'bow-chest', tile: { col: 2, row: 17 }, contents: { kind: 'gear', gear: 'short-bow' } },
  {
    kind: 'chest',
    id: 'arrow-cache',
    tile: { col: 4, row: 17 },
    contents: { kind: 'consumable', consumable: 'ammunition', amount: 6 },
  },
  { kind: 'chest', id: 'armor-chest', tile: { col: 6, row: 17 }, contents: { kind: 'gear', gear: 'chain-mail' } },
];
