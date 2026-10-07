import { areaOf } from './content';
import type { Chest, Content, Interactable } from './content';
import type { ChestContents } from './definitions';
import { grantGear } from './gear';
import { centerOfBox, overlaps, zoneInFront } from './geometry';
import type { Box, Point } from './geometry';
import type { GameEvent } from './interface';
import { interactableStateOf } from './state';
import type { ChestState, InteractableState, PlayState } from './state';

// Interactables: things in an Adventure Area that the hero acts on with Interact, such as chests. The content places
// each with a kind, and the kind is what happens when the hero interacts with it.
//
// To add a kind:
//   1. add its definition to InteractableDefinition (definitions.ts), its loaded form to Interactable (content.ts) and
//      its state to InteractableState (state.ts), and have loadInteractable in content.ts convert and check the
//      definition and freshInteractable in state.ts say how it begins;
//   2. write a function that takes the interactable, its state, the game state and the content, changes the state, and
//      returns the events that happened, and add the case that shows it to interactableView (view.ts);
//   3. add it to INTERACTIONS below, and decide in blocksWalkers whether the hero and the monsters walk through it.
//      The compiler refuses a kind that is missing from either.

/** What one kind of interactable does when the hero interacts with it. Returns what happened, in order. */
export type Interaction<T extends Interactable> = (
  interactable: T,
  interactableState: Extract<InteractableState, { kind: T['kind'] }>,
  state: PlayState,
  content: Content,
) => GameEvent[];

const INTERACTIONS: { readonly [K in Interactable['kind']]: Interaction<Extract<Interactable, { kind: K }>> } = {
  chest: openChest,
};

/** Whether the hero and the monsters are stopped by an interactable. A chest is solid, opened or not. */
function blocksWalkers(interactable: Interactable): boolean {
  switch (interactable.kind) {
    case 'chest':
      return true;
  }
}

/** The bodies in the current Adventure Area that the hero and the monsters cannot walk through. */
export function interactableObstacles(state: PlayState, content: Content): Box[] {
  return areaOf(content, state.areaId).interactables.filter(blocksWalkers).map((interactable) => interactable.body);
}

/** The hero interacts with the interactable in front of it, if there is one. Returns what happened, in order. */
export function heroInteracts(state: PlayState, content: Content): GameEvent[] {
  const target = interactionTarget(state, content);
  if (target === undefined) {
    return [];
  }
  // The registry is keyed by kind, so the entry for this interactable's kind is made for exactly this kind.
  const interaction = INTERACTIONS[target.kind] as Interaction<Interactable>;
  return interaction(target, interactableStateOf(state, target.id), state, content);
}

/**
 * The interactable Interact acts on: of those in the ground right in front of the hero, as far as its reach and as wide
 * as its body, the one whose centre is nearest the hero. When two are as near, the one the content lists first.
 */
function interactionTarget(state: PlayState, content: Content): Interactable | undefined {
  const { size, interactionReach } = content.hero;
  const zone = zoneInFront(state.hero.position, size, state.hero.facing, interactionReach, size);
  let target: Interactable | undefined;
  let nearest = Infinity;
  for (const interactable of areaOf(content, state.areaId).interactables) {
    if (overlaps(zone, interactable.body)) {
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
  }
}
