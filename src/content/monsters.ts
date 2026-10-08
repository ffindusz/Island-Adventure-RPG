import type { MonsterTypeDefinition } from '../core';

/** Every kind of monster, by type id. Speeds are in tiles per second, distances in tiles, times in milliseconds. */
export const monsterTypes: Readonly<Record<string, MonsterTypeDefinition>> = {
  // A placeholder chaser: slow enough to outrun, it takes three hits from the hero's basic sword. It notices the hero
  // from four tiles away, winds up for half a second, hits for 4 (3 after the hero's Defense) and rests before the next.
  // It is worth 5 Experience, a placeholder like the rest of the numbers until the tuning pass. Now and then it leaves
  // a Healing Potion behind when it is defeated. It leaves no arrows: the crabs of the shipwreck coast meet a hero who
  // has no bow yet, and a spitter, which shoots them, carries them instead.
  crab: {
    behavior: 'chaser',
    health: 3,
    size: 0.75,
    experience: 5,
    drops: [{ consumable: 'healing-potion', chance: 0.15, amount: 1 }],
    damage: 4,
    speedTilesPerSecond: 1.5,
    noticingDistance: 4,
    reach: 0.5,
    windUpMs: 500,
    recoveryMs: 900,
  },
  // A placeholder forest beast, the basic one: a chaser quicker than a crab, though still far slower than the hero, and
  // frailer: two hits from the hero's basic sword. It notices the hero from five tiles away, winds up for under half a
  // second, hits for 4 (3 after the hero's Defense) and rests before the next. It is worth 3 Experience, a placeholder
  // like the rest of the numbers until the tuning pass, and leaves nothing behind.
  wolf: {
    behavior: 'chaser',
    health: 2,
    size: 0.7,
    experience: 3,
    damage: 4,
    speedTilesPerSecond: 2.4,
    noticingDistance: 5,
    reach: 0.5,
    windUpMs: 450,
    recoveryMs: 800,
  },
  // A placeholder slime: a chaser that is slower and sturdier than a crab, and hits more lightly. It notices the hero
  // only from three tiles away, takes six hits from the hero's basic sword, and hits for 3 (2 after the hero's Defense)
  // after a wind-up of 0.6 s. It is worth 2 Experience: a long fight for little, there to be avoided or shot from afar.
  slime: {
    behavior: 'chaser',
    health: 6,
    size: 0.8,
    experience: 2,
    damage: 3,
    speedTilesPerSecond: 1,
    noticingDistance: 3,
    reach: 0.5,
    windUpMs: 600,
    recoveryMs: 1000,
  },
  // A placeholder charger: it notices the hero from four tiles away and walks, slower than the hero, to where its lane
  // takes in the hero. It then winds up for 0.7 s while the lane lights up, dashes down the lane at more than twice the
  // hero's walking speed, for six tiles at most, and rests for a second before it looks for the hero again. It hits for
  // 6 (5 after the hero's Defense) only a hero who is still in the lane: stepping out during the wind-up avoids it, and
  // the rest is the time to hit back. It takes four hits from the hero's basic sword and is worth 8 Experience.
  boar: {
    behavior: 'charger',
    health: 4,
    size: 0.85,
    experience: 8,
    damage: 6,
    speedTilesPerSecond: 2,
    noticingDistance: 4,
    windUpMs: 700,
    dashSpeedTilesPerSecond: 12,
    dashRange: 6,
    recoveryMs: 1000,
  },
  // A placeholder ranged attacker: it notices the hero from five tiles away and walks to three tiles from it, backing
  // away when the hero comes nearer, until a wall is at its back. It winds up for 0.8 s with a flash on its body, then
  // fires along the row or column that the hero stood in, a projectile slower than the hero's walk that hits for 4 (3
  // after Defense) and falls six tiles on. It rests for 1.5 s. It is frail: two hits from the sword, one arrow of the
  // short bow, and worth 6 Experience. Now and then it leaves two arrows behind when it is defeated: it carries what it
  // shoots. Leave out `keepsDistance` and it stands still where it is placed.
  spitter: {
    behavior: 'ranged',
    health: 2,
    size: 0.6,
    experience: 6,
    drops: [{ consumable: 'ammunition', chance: 0.25, amount: 2 }],
    noticingDistance: 5,
    windUpMs: 800,
    recoveryMs: 1500,
    projectile: { damage: 4, speedTilesPerSecond: 4, range: 6, size: 0.3 },
    keepsDistance: { preferredDistance: 3, speedTilesPerSecond: 2 },
  },
};
