import type { KeyDefinition } from './definitions';
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

export function loadKey(areaId: string, definition: KeyDefinition): Key {
  if (definition.name.trim() === '') {
    throw new Error(`Area "${areaId}": key "${definition.id}" has no name`);
  }
  return { kind: 'key', id: definition.id, body: tileBox(definition.tile), name: definition.name };
}

/** The box of a tile, in tile units like the other bodies. */
function tileBox({ col, row }: Tile): Box {
  return { minX: col, minY: row, maxX: col + 1, maxY: row + 1 };
}
