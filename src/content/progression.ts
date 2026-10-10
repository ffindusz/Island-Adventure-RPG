import type { ProgressionDefinition } from '../core';

/**
 * How the hero grows. The numbers were tuned so that the intended route gives five level-ups
 * (tests/route-experience.test.ts, docs/balance.md): the total Experience for Levels 2 to 6, which is the highest
 * Level, and what a Stat Point adds to each stat.
 */
export const progression: ProgressionDefinition = {
  levelThresholds: [10, 25, 45, 70, 100],
  statPointValue: { health: 2, attack: 1, defense: 1 },
};
