import type { VesselDefinition } from './definitions';
import type { Area } from './content';
import type { Box, Tile } from './geometry';

// Loading the vessel, the old ship that sails the hero home. content.ts calls loadVessel while it loads each
// interactable and checkVessels once the areas are loaded; the rules for what the vessel does are in departure.ts.

/** A vessel as the rules use it: its body is the box of the tile it fills, which always stops walkers. */
export interface Vessel {
  readonly kind: 'vessel';
  readonly id: string;
  readonly body: Box;
}

export function loadVessel(definition: VesselDefinition): Vessel {
  return { kind: 'vessel', id: definition.id, body: tileBox(definition.tile) };
}

/**
 * Throws an Error when the content places a vessel but has no ending and credits: the hero sails home to them, so a
 * vessel without them would be a way to end the game with nothing to show for it.
 */
export function checkVessels(areas: readonly Area[], hasEnding: boolean): void {
  if (hasEnding) {
    return;
  }
  for (const area of areas) {
    for (const interactable of area.interactables) {
      if (interactable.kind === 'vessel') {
        throw new Error(
          `Area "${area.id}": vessel "${interactable.id}" needs the content to have an ending and credits: the hero sails home to them`,
        );
      }
    }
  }
}

/** The box of a tile, in tile units like the other bodies. */
function tileBox({ col, row }: Tile): Box {
  return { minX: col, minY: row, maxX: col + 1, maxY: row + 1 };
}
