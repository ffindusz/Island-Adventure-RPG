import type { Vessel } from './vessel-content';
import type { GameEvent } from './interface';
import type { VesselState } from './state';

// Preparing the vessel and sailing home, the game's only point of no return. That the hero meets the vessel as an
// interactable is in interactables.ts; loading it is in vessel-content.ts.

/**
 * Interact on a vessel. One that is not prepared becomes so: the hero is told, once, and nothing else changes.
 */
export function useVessel(vessel: Vessel, vesselState: VesselState): GameEvent[] {
  if (vesselState.prepared) {
    return [];
  }
  vesselState.prepared = true;
  return [{ type: 'vessel-prepared', vesselId: vessel.id }];
}
