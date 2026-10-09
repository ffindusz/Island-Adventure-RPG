import type { Content } from './content';
import type { PlayState } from './state';
import { unassignedStatPoints } from './stats';

/**
 * True while the game waits for the player: a page is open, a Stat Point waits to be assigned, or the game asks whether
 * to sail home. Nothing steps and the hero cannot strike until the player has closed the page, made the choice or
 * answered the question.
 */
export function isPaused(state: PlayState, content: Content): boolean {
  return state.page !== null || state.departure !== null || unassignedStatPoints(state, content) > 0;
}
