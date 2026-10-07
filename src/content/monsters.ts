import type { MonsterTypeDefinition } from '../core';

/** Every kind of monster, by type id. */
export const monsterTypes: Readonly<Record<string, MonsterTypeDefinition>> = {
  // A placeholder: it stands still, and takes three hits from the hero's basic sword.
  crab: { behavior: 'stationary', health: 3, size: 0.75 },
};
