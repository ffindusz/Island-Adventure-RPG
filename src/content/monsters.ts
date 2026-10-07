import type { MonsterTypeDefinition } from '../core';

/** Every kind of monster, by type id. Speeds are in tiles per second, distances in tiles, times in milliseconds. */
export const monsterTypes: Readonly<Record<string, MonsterTypeDefinition>> = {
  // A placeholder chaser: slow enough to outrun, it takes three hits from the hero's basic sword. It notices the hero
  // from four tiles away, winds up for half a second, hits for 4 (3 after the hero's Defense) and rests before the next.
  // It is worth 5 Experience, a placeholder like the rest of the numbers until the tuning pass. Now and then it leaves
  // two arrows behind when it is defeated.
  crab: {
    behavior: 'chaser',
    health: 3,
    size: 0.75,
    experience: 5,
    drops: [{ consumable: 'ammunition', chance: 0.25, amount: 2 }],
    damage: 4,
    speedTilesPerSecond: 1.5,
    noticingDistance: 4,
    reach: 0.5,
    windUpMs: 500,
    recoveryMs: 900,
  },
};
