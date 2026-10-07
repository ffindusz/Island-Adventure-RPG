import { areaOf } from './content';
import type { Content } from './content';
import { overlaps } from './geometry';
import type { GameEvent } from './interface';
import { gainExperience } from './progression';
import { currentAreaState, heroBody } from './state';
import type { PlayState } from './state';

/**
 * The hero reaches each milestone of its Adventure Area that its body overlaps and that it has not reached before. A
 * milestone is reached once, for good, and gives its reward. Returns what happened, in order: for each milestone, that
 * it was reached and then what its reward did.
 */
export function reachMilestones(state: PlayState, content: Content): GameEvent[] {
  const reached = currentAreaState(state).reachedMilestones;
  const body = heroBody(state, content);
  const events: GameEvent[] = [];
  for (const milestone of areaOf(content, state.areaId).milestones) {
    if (!reached.includes(milestone.id) && overlaps(body, milestone.zone)) {
      reached.push(milestone.id);
      events.push({ type: 'milestone-reached', milestoneId: milestone.id });
      events.push(...gainExperience(state, content, milestone.reward.experience));
    }
  }
  return events;
}
