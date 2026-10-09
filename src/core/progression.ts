import type { Content } from './content';
import type { StatId } from './definitions';
import type { GameEvent } from './interface';
import type { PlayState } from './state';
import { experienceCap, heroLevel, heroMaxHealth, unassignedStatPoints } from './stats';

// How the hero grows: the rules that change what the hero has earned. What the earnings are worth, such as the Level
// they add up to, is worked out in stats.ts.

/**
 * The hero earns Experience, up to the cap: what does not fit under it is not counted, and a hero at the highest Level
 * gains nothing. Returns what happened, in order: the Experience gained, then each Level it raised the hero to.
 */
export function gainExperience(state: PlayState, content: Content, amount: number): GameEvent[] {
  const gained = Math.min(amount, experienceCap(content) - state.hero.experience);
  if (!(gained > 0)) {
    return [];
  }
  const levelBefore = heroLevel(state, content);
  state.hero.experience += gained;
  const events: GameEvent[] = [{ type: 'experience-gained', amount: gained }];
  for (let level = levelBefore + 1; level <= heroLevel(state, content); level += 1) {
    events.push({ type: 'level-up', level });
  }
  return events;
}

/**
 * The hero spends a Stat Point it has not assigned yet on a stat, for good. The current Health rises by as much as the
 * maximum does, so Health bought with a Stat Point is not left empty. Does nothing when no Stat Point waits. Returns
 * what happened: the Stat Point spent, or nothing.
 */
export function assignStatPoint(state: PlayState, content: Content, stat: StatId): GameEvent[] {
  if (unassignedStatPoints(state, content) === 0) {
    return [];
  }
  const maxHealthBefore = heroMaxHealth(state, content);
  state.hero.statPoints[stat] += 1;
  state.hero.health += heroMaxHealth(state, content) - maxHealthBefore;
  return [{ type: 'stat-point-assigned', stat }];
}
