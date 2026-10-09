import type { Content, Interactable } from './content';
import { interactableStateIn } from './state';
import type { CheckpointState, PlayState } from './state';

// Defeat takes back the consumables the hero found since the Checkpoint it returns to. The Ammunition and the Healing
// Potions are as many as they were at the Checkpoint, so what the hero spent comes back and what it found goes; and
// every pickup and every chest of a consumable that was taken or opened since is back as it was, so that nothing the
// hero found after the Checkpoint is lost for good: it can find it again. This is in every Adventure Area, not only
// the one of the Checkpoint. Gear, Experience and the like are permanent and stay (see checkpoints.ts).
//
// The one thing it cannot take back is a consumable dropped by a monster of another Adventure Area than the
// Checkpoint's: that monster stays defeated and does not drop it again.
//
// To add a kind of interactable that gives consumables, say in givesConsumables whether defeat takes it back, and
// in isTaken and setTaken what it is to be taken or not. The compiler refuses a kind that is missing from any of these.

/** The consumables the hero has now, for a Checkpoint to record: how many of each, and what has been taken so far. */
export function recordConsumables(state: PlayState, content: Content): Pick<CheckpointState, 'consumables' | 'collected'> {
  const collected: string[] = [];
  for (const area of Object.values(content.areas)) {
    for (const interactable of area.interactables) {
      if (givesConsumables(interactable) && isTaken(state, area.id, interactable)) {
        collected.push(interactable.id);
      }
    }
  }
  return { consumables: { ...state.hero.consumables }, collected };
}

/** Gives the hero the consumables the Checkpoint recorded, and puts back what was taken since. */
export function rollBackConsumables(state: PlayState, content: Content): void {
  const { consumables, collected } = state.checkpoint;
  state.hero.consumables = { ...consumables };
  for (const area of Object.values(content.areas)) {
    for (const interactable of area.interactables) {
      if (givesConsumables(interactable)) {
        setTaken(state, area.id, interactable, collected.includes(interactable.id));
      }
    }
  }
}

/**
 * Whether an interactable gives consumables, which defeat takes back: a pickup, and a chest that holds some. A key is
 * one-time loot, not a consumable, and stays taken; a door stays open; a gate and a lever stay where the hero left them;
 * a sign has nothing to take back; a vessel gives nothing, and stays prepared.
 */
function givesConsumables(interactable: Interactable): boolean {
  switch (interactable.kind) {
    case 'pickup':
      return true;
    case 'key':
    case 'door':
    case 'gate':
    case 'lever':
    case 'sign':
    case 'vessel':
      return false;
    case 'chest':
      switch (interactable.contents.kind) {
        case 'gear':
          return false;
        case 'consumable':
          return true;
      }
  }
}

/** Whether the hero has taken what an interactable gives: a pickup is collected, a chest opened. */
function isTaken(state: PlayState, areaId: string, interactable: Interactable): boolean {
  const found = interactableStateIn(state, areaId, interactable);
  switch (found.kind) {
    case 'pickup':
      return found.collected;
    case 'chest':
      return found.opened;
    case 'key':
    case 'door':
    case 'gate':
    case 'lever':
    case 'sign':
    case 'vessel':
      return false;
  }
}

function setTaken(state: PlayState, areaId: string, interactable: Interactable, taken: boolean): void {
  const found = interactableStateIn(state, areaId, interactable);
  switch (found.kind) {
    case 'pickup':
      found.collected = taken;
      break;
    case 'chest':
      found.opened = taken;
      break;
    case 'key':
    case 'door':
    case 'gate':
    case 'lever':
    case 'sign':
    case 'vessel':
      break;
  }
}
