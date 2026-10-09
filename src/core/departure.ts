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
