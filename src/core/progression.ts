import type { GameEvent } from './interface';
import type { PlayState } from './state';

// How the hero grows: the rules that change what the hero has earned. What the earnings are worth, such as the Level
// they add up to, is worked out in stats.ts.

/** The hero earns Experience. Returns what happened, in order. */
export function gainExperience(state: PlayState, amount: number): GameEvent[] {
  if (amount <= 0) {
    return [];
  }
  state.hero.experience += amount;
  return [{ type: 'experience-gained', amount }];
}
