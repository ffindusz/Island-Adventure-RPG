import type { GameEvent } from '../core';

// When the game saves itself. There is one slot and no manual saving. The play screen saves when the hero touches a
// Checkpoint, when it comes into another Adventure Area and when the Guardian falls, and once when a New Game begins:
// the start counts as the first Checkpoint, and without that save a tab closed right after the player confirmed a New
// Game would bring the old saved game back. The Guardian's fall counts because no Checkpoint follows it: without that
// save a tab closed after the victory would bring back the last Checkpoint, with the Guardian alive and its gate shut.
// It never saves at the title, where there is no game to save. No Phaser in here.

/** The events that call for a save. */
const SAVING_EVENTS: readonly GameEvent['type'][] = ['checkpoint-activated', 'area-changed', 'guardian-defeated'];

/**
 * Whether the events a frame brought call for a save. However many of them there are, the game is saved once, as it
 * stands at the end of the frame: coming into an area that has a Checkpoint at its entrance reports both.
 */
export function callsForSave(events: readonly GameEvent[]): boolean {
  return events.some((event) => SAVING_EVENTS.includes(event.type));
}
