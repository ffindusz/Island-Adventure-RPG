import { areaOf } from './content';
import type { Content } from './content';
import type { Door, Key } from './device-content';
import { overlaps } from './geometry';
import type { GameEvent, KeyInfo } from './interface';
import { heroBody, interactableStateOf } from './state';
import type { DoorState, PlayState } from './state';

// The devices: the keys, and the doors, gates, levers and signs that go with them, which make up the light puzzles and
// clues of the Adventure Areas. Loading them is in device-content.ts. That the hero meets them as interactables is
// in interactables.ts.

/**
 * The hero takes each key of its Adventure Area that its body overlaps and that it has not taken before, which is what
 * walking onto one does. A key is taken once, and the hero keeps it, defeat included. Returns what happened, in order:
 * for each key, the hero taking it.
 */
export function collectKeys(state: PlayState, content: Content): GameEvent[] {
  const body = heroBody(state, content);
  const events: GameEvent[] = [];
  for (const interactable of areaOf(content, state.areaId).interactables) {
    if (interactable.kind === 'key' && overlaps(body, interactable.body)) {
      const keyState = interactableStateOf(state, interactable);
      if (!keyState.collected) {
        keyState.collected = true;
        state.hero.keys.push(interactable.id);
        events.push({ type: 'pickup', item: { kind: 'key', id: interactable.id, name: interactable.name } });
      }
    }
  }
  return events;
}

/**
 * Interact on a door. A shut door opens for a hero that holds its key, and takes that key: it stays open for good, and
 * the key is gone. A hero without the key is told which key the door needs, and nothing changes. An open door does
 * nothing, and asks for no key.
 */
export function useDoor(door: Door, doorState: DoorState, state: PlayState, content: Content): GameEvent[] {
  if (doorState.open) {
    return [];
  }
  const keyName = keyOf(content, door.key).name;
  const held = state.hero.keys.indexOf(door.key);
  if (held < 0) {
    return [{ type: 'door-locked', doorId: door.id, keyName }];
  }
  state.hero.keys.splice(held, 1);
  doorState.open = true;
  return [{ type: 'door-opened', doorId: door.id, keyName }];
}

/** The keys the hero holds, in the order it took them, as the player reads about them. */
export function heldKeys(state: PlayState, content: Content): KeyInfo[] {
  return state.hero.keys.map((id) => {
    const { name } = keyOf(content, id);
    return { id, name };
  });
}

/** Cannot fail for a state that fits the content; it fails loudly for a snapshot that holds a key the content lacks. */
function keyOf(content: Content, keyId: string): Key {
  for (const area of Object.values(content.areas)) {
    for (const interactable of area.interactables) {
      if (interactable.kind === 'key' && interactable.id === keyId) {
        return interactable;
      }
    }
  }
  throw new Error(`The state holds key "${keyId}", which the content does not have`);
}
