import type { VesselDefinition } from './definitions';
import type { Box, Tile } from './geometry';

// Loading the vessel, the old ship that sails the hero home. content.ts calls loadVessel while it loads each
// interactable; the rules for what the vessel does are in departure.ts.

/** A vessel as the rules use it: its body is the box of the tile it fills, which always stops walkers. */
export interface Vessel {
  readonly kind: 'vessel';
  readonly id: string;
  readonly body: Box;
}

export function loadVessel(definition: VesselDefinition): Vessel {
  return { kind: 'vessel', id: definition.id, body: tileBox(definition.tile) };
}

/** The box of a tile, in tile units like the other bodies. */
function tileBox({ col, row }: Tile): Box {
  return { minX: col, minY: row, maxX: col + 1, maxY: row + 1 };
}
