import { areaOf } from './content';
import type { Chest, Content, Interactable, Pickup } from './content';
import { grantConsumable } from './consumables';
import type { ChestContents } from './definitions';
import { useDoor, useLever } from './devices';
import type { Gate, Key } from './device-content';
import { grantGear } from './gear';
import { centerOfBox, overlaps, zoneInFront } from './geometry';
import type { Box, Point } from './geometry';
import type { GameEvent } from './interface';
import { interactableStateOf } from './state';
import type { ChestState, InteractableState, PlayState } from './state';

// Interactables: things placed on a tile of an Adventure Area. The content places each with a kind, and the kind is
// what it is and does. The hero acts on most with Interact, such as a chest, a door or a lever. The hero takes a pickup
// or a key by walking onto it instead, and that is a step of the game (see pickups.ts and devices.ts). A gate it neither
// takes nor acts on: a lever moves it.
//
// To add a kind:
//   1. add its definition to InteractableDefinition (definitions.ts), its loaded form to Interactable (content.ts) and
//      its state to InteractableState (state.ts), and have loadInteractable in content.ts convert and check the
//      definition and freshInteractable in state.ts say how it begins;
//   2. write the rules: a function that takes the interactable, its state, the game state and the content, changes the
//      state, and returns the events that happened. Interact calls it through INTERACTIONS below; a kind that
//      happens by walking is a step in game.ts instead. Add the case that shows it to interactableView (view.ts);
//   3. decide in blocksWalkers whether the hero and the monsters walk through it (it may depend on its state, as a
//      door's does), and in isInteractedWith whether Interact reaches it. If Interact does not, leave the kind out of
//      InteractedWith, as the pickup is; if it does, add it to INTERACTIONS. The compiler refuses a kind that is
//      missing from any of these;
//   4. if it gives consumables, say in consumable-rollback.ts whether defeat takes it back and what taking it is.

/** The interactables that Interact acts on: all but those the hero takes by walking onto them, and the gate. */
type InteractedWith = Exclude<Interactable, Pickup | Key | Gate>;

/** What one kind of interactable does when the hero interacts with it. Returns what happened, in order. */
export type Interaction<T extends Interactable> = (
  interactable: T,
  interactableState: Extract<InteractableState, { kind: T['kind'] }>,
  state: PlayState,
  content: Content,
) => GameEvent[];

const INTERACTIONS: { readonly [K in InteractedWith['kind']]: Interaction<Extract<InteractedWith, { kind: K }>> } = {
  chest: openChest,
  door: useDoor,
  lever: useLever,
};

/**
 * Whether Interact reaches an interactable. A pickup and a key it does not reach: they are taken by walking onto them.
 * Nor a gate: it opens for a lever alone.
 */
function isInteractedWith(interactable: Interactable): interactable is InteractedWith {
  switch (interactable.kind) {
    case 'chest':
    case 'door':
    case 'lever':
      return true;
    case 'pickup':
    case 'key':
    case 'gate':
      return false;
  }
}

/**
 * Whether the hero and the monsters are stopped by an interactable. A chest and a lever are solid, opened or pulled or
 * not; a door and a gate are solid while they are shut; a pickup and a key are not.
 */
function blocksWalkers(interactable: Interactable, state: PlayState): boolean {
  switch (interactable.kind) {
    case 'chest':
    case 'lever':
      return true;
    case 'door':
    case 'gate':
      return !interactableStateOf(state, interactable).open;
    case 'pickup':
    case 'key':
      return false;
  }
}

/** The bodies in the current Adventure Area that the hero and the monsters cannot walk through. */
export function interactableObstacles(state: PlayState, content: Content): Box[] {
  return areaOf(content, state.areaId)
    .interactables.filter((interactable) => blocksWalkers(interactable, state))
    .map((interactable) => interactable.body);
}

/** The hero interacts with the interactable in front of it, if there is one. Returns what happened, in order. */
export function heroInteracts(state: PlayState, content: Content): GameEvent[] {
  const target = interactionTarget(state, content);
  if (target === undefined) {
    return [];
  }
  // The registry is keyed by kind, so the entry for this interactable's kind is made for exactly this kind.
  const interaction = INTERACTIONS[target.kind] as Interaction<InteractedWith>;
  return interaction(target, interactableStateOf(state, target), state, content);
}

/**
 * The interactable Interact acts on: of those in the ground right in front of the hero, as far as its reach and as wide
 * as its body, the one whose centre is nearest the hero. When two are as near, the one the content lists first.
 */
function interactionTarget(state: PlayState, content: Content): InteractedWith | undefined {
  const { size, interactionReach } = content.hero;
  const zone = zoneInFront(state.hero.position, size, state.hero.facing, interactionReach, size);
  let target: InteractedWith | undefined;
  let nearest = Infinity;
  for (const interactable of areaOf(content, state.areaId).interactables) {
    if (isInteractedWith(interactable) && overlaps(zone, interactable.body)) {
      const distance = squaredDistance(state.hero.position, centerOfBox(interactable.body));
      if (distance < nearest) {
        target = interactable;
        nearest = distance;
      }
    }
  }
  return target;
}

function squaredDistance(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/** A chest opens once, and the hero takes what is inside. An opened chest does nothing more. */
function openChest(chest: Chest, chestState: ChestState, state: PlayState, content: Content): GameEvent[] {
  if (chestState.opened) {
    return [];
  }
  chestState.opened = true;
  return [{ type: 'chest-opened', chestId: chest.id }, ...takeContents(chest.contents, state, content)];
}

/** What the hero does with what a chest holds. A new kind of contents is one more case here. */
function takeContents(contents: ChestContents, state: PlayState, content: Content): GameEvent[] {
  switch (contents.kind) {
    case 'gear':
      return grantGear(state, content, contents.gear);
    case 'consumable':
      return grantConsumable(state, contents.consumable, contents.amount);
  }
}
