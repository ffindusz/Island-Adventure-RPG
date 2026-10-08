import type { Area } from './content';
import type { DoorDefinition, GateDefinition, KeyDefinition, LeverDefinition, SignDefinition } from './definitions';
import type { Box, Tile } from './geometry';

// Loading the devices of an Adventure Area: the keys, and the doors, gates, levers and signs that go with them, which
// make up its light puzzles and clues. content.ts calls these while it loads each interactable; the rules for what a
// device does are in devices.ts.

/** A key as the rules use it: its body is the box of the tile it lies on, which the hero's body has to overlap. */
export interface Key {
  readonly kind: 'key';
  readonly id: string;
  readonly body: Box;
  readonly name: string;
}

/** A door as the rules use it: its body is the box of the tile it fills, which stops walkers while it is shut. */
export interface Door {
  readonly kind: 'door';
  readonly id: string;
  readonly body: Box;
  /** The id of the key that opens it. */
  readonly key: string;
}

/** A gate as the rules use it: its body is the box of the tile it fills, which stops walkers while it is shut. */
export interface Gate {
  readonly kind: 'gate';
  readonly id: string;
  readonly body: Box;
}

/** A lever as the rules use it: its body is the box of the tile it fills, which always stops walkers. */
export interface Lever {
  readonly kind: 'lever';
  readonly id: string;
  readonly body: Box;
  /** The ids of the doors and gates of its Adventure Area that it moves. */
  readonly targets: readonly string[];
}

/** A sign as the rules use it: its body is the box of the tile it fills, which always stops walkers. */
export interface Sign {
  readonly kind: 'sign';
  readonly id: string;
  readonly body: Box;
  /** The clue the hero reads. */
  readonly text: string;
}

export function loadKey(areaId: string, definition: KeyDefinition): Key {
  if (definition.name.trim() === '') {
    throw new Error(`Area "${areaId}": key "${definition.id}" has no name`);
  }
  return { kind: 'key', id: definition.id, body: tileBox(definition.tile), name: definition.name };
}

export function loadDoor(definition: DoorDefinition): Door {
  return { kind: 'door', id: definition.id, body: tileBox(definition.tile), key: definition.key };
}

export function loadGate(definition: GateDefinition): Gate {
  return { kind: 'gate', id: definition.id, body: tileBox(definition.tile) };
}

export function loadLever(areaId: string, definition: LeverDefinition): Lever {
  const { id, targets } = definition;
  if (targets.length === 0) {
    throw new Error(`Area "${areaId}": lever "${id}" moves no door or gate`);
  }
  const named = targets.find((target, index) => targets.indexOf(target) !== index);
  if (named !== undefined) {
    throw new Error(`Area "${areaId}": lever "${id}" names "${named}" more than once`);
  }
  return { kind: 'lever', id, body: tileBox(definition.tile), targets };
}

export function loadSign(areaId: string, definition: SignDefinition): Sign {
  if (definition.text.trim() === '') {
    throw new Error(`Area "${areaId}": sign "${definition.id}" has no text`);
  }
  return { kind: 'sign', id: definition.id, body: tileBox(definition.tile), text: definition.text };
}

/**
 * Every door has a key that some Adventure Area places, and every key opens exactly one door. It is checked once all the
 * areas are loaded, because a key may lie in another area than its door.
 */
export function checkKeysAndDoors(areas: readonly Area[]): void {
  const keyAreas = new Map<string, string>();
  for (const area of areas) {
    for (const interactable of area.interactables) {
      if (interactable.kind === 'key') {
        keyAreas.set(interactable.id, area.id);
      }
    }
  }
  const doorsOfKey = new Map<string, string[]>();
  for (const area of areas) {
    for (const interactable of area.interactables) {
      if (interactable.kind === 'door') {
        if (!keyAreas.has(interactable.key)) {
          throw new Error(
            `Area "${area.id}": door "${interactable.id}" needs the key "${interactable.key}", but no Adventure Area places a key with that id`,
          );
        }
        doorsOfKey.set(interactable.key, [...(doorsOfKey.get(interactable.key) ?? []), interactable.id]);
      }
    }
  }
  for (const [keyId, areaId] of keyAreas) {
    const doors = doorsOfKey.get(keyId) ?? [];
    if (doors.length === 0) {
      throw new Error(`Area "${areaId}": key "${keyId}" opens no door: no door needs it`);
    }
    if (doors.length > 1) {
      throw new Error(`Key "${keyId}" is needed by more than one door: ${listed(doors)}`);
    }
  }
}

/**
 * Every door and gate a lever moves stands in the lever's own Adventure Area. It is checked once the areas are loaded,
 * because the content may place the lever before the doors and gates it moves.
 */
export function checkLeverTargets(areas: readonly Area[]): void {
  for (const area of areas) {
    const movable = new Set<string>();
    for (const interactable of area.interactables) {
      if (interactable.kind === 'door' || interactable.kind === 'gate') {
        movable.add(interactable.id);
      }
    }
    for (const interactable of area.interactables) {
      if (interactable.kind !== 'lever') {
        continue;
      }
      for (const target of interactable.targets) {
        if (!movable.has(target)) {
          throw new Error(
            `Area "${area.id}": lever "${interactable.id}" moves "${target}", but this area has no door or gate with that id`,
          );
        }
      }
    }
  }
}

/** Quoted ids in a sentence: "a", "a" and "b", "a", "b" and "c". */
function listed(ids: readonly string[]): string {
  const quoted = ids.map((id) => `"${id}"`);
  return quoted.length < 2 ? quoted.join('') : `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
}

/** The box of a tile, in tile units like the other bodies. */
function tileBox({ col, row }: Tile): Box {
  return { minX: col, minY: row, maxX: col + 1, maxY: row + 1 };
}
