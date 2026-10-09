import type { Content } from './content';
import type { Vessel } from './vessel-content';
import type { GameEvent } from './interface';
import type { PlayState, VesselState } from './state';

// Preparing the vessel and sailing home, the game's only point of no return. That the hero meets the vessel as an
// interactable is in interactables.ts; loading it is in vessel-content.ts. The question whether to sail is part of the
// game state, as an open page is, and the game waits while it is open (see pause.ts).

/**
 * Interact on a vessel. One that is not prepared becomes so: the hero is told, once, and nothing else changes. On one
 * that is prepared it opens the question whether to sail home, which tells nothing: the view shows it.
 */
export function useVessel(vessel: Vessel, vesselState: VesselState, state: PlayState): GameEvent[] {
  if (!vesselState.prepared) {
    vesselState.prepared = true;
    return [{ type: 'vessel-prepared', vesselId: vessel.id }];
  }
  state.departure = vessel.id;
  return [];
}

/** Declines to sail home: the question closes, and nothing else changes. The vessel stays prepared. */
export function cancelDeparture(state: PlayState): void {
  state.departure = null;
}

/**
 * The event of sailing home: what the hero sails home to. Loading refuses a vessel in content without an ending, so
 * the question cannot be open in such a game, but a snapshot is not checked here, and no ending to tell is a bug.
 */
export function sailHome(content: Content): GameEvent[] {
  if (content.ending === null) {
    throw new Error('The hero cannot sail home: this content has no ending');
  }
  return [{ type: 'ending-reached', ending: content.ending.lines, credits: content.ending.credits }];
}
