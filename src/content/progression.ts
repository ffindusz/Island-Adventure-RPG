import type { ProgressionDefinition } from '../core';

/**
 * How the hero grows. Placeholder numbers, to be tuned so that the intended route gives about five level-ups: the
 * total Experience for Levels 2 to 6, which is the highest Level.
 */
export const progression: ProgressionDefinition = {
  levelThresholds: [10, 25, 45, 70, 100],
};
