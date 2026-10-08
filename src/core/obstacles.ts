import type { Interactable } from './content';
import type { Door, Gate } from './device-content';

// What stops the hero and the monsters among the interactables of an Adventure Area. It is written once and asked in
// two places: the game asks it of the state the interactables are in (interactables.ts), and the content check asks it
// of an Adventure Area in which every door and gate is shut, and of one in which every one is open (device-routes.ts).

/**
 * Whether an interactable stops the hero and the monsters. A chest, a lever and a sign do, opened or pulled or not; a
 * door and a gate do while they are shut, which `isShut` says of each; a pickup and a key never do.
 */
export function stopsWalkers(interactable: Interactable, isShut: (device: Door | Gate) => boolean): boolean {
  switch (interactable.kind) {
    case 'chest':
    case 'lever':
    case 'sign':
      return true;
    case 'door':
    case 'gate':
      return isShut(interactable);
    case 'pickup':
    case 'key':
      return false;
  }
}
