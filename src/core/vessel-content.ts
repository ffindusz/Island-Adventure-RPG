import type { VesselDefinition } from './definitions';
import type { Area } from './content';
import type { Place } from './device-routes';
import type { Box, Tile } from './geometry';

// Loading the vessel, the old ship that sails the hero home. content.ts calls loadVessel while it loads each
// interactable and checkVessels once the areas are loaded; the rules for what the vessel does are in departure.ts, and
// where content that asks for a Guardian may put it is in guardian-content.ts.

/** A vessel as the rules use it: its body is the box of the tile it fills, which always stops walkers. */
export interface Vessel {
  readonly kind: 'vessel';
  readonly id: string;
  readonly body: Box;
}

/** A vessel as the content places it: a place the route must lead to. The hero uses it from any tile beside it. */
export interface VesselSite extends Place {
  readonly vesselId: string;
}

export function loadVessel(definition: VesselDefinition): Vessel {
  return { kind: 'vessel', id: definition.id, body: tileBox(definition.tile) };
}

/**
 * Throws an Error when the content places a vessel but has no ending and credits, which the hero sails home to, and
 * names the second vessel: there is only one, whatever the content. Returns the vessels the content places: none, or one.
 */
export function checkVessels(areas: readonly Area[], hasEnding: boolean): VesselSite[] {
  const sites: VesselSite[] = [];
  for (const area of areas) {
    for (const interactable of area.interactables) {
      if (interactable.kind !== 'vessel') {
        continue;
      }
      const placed = `Area "${area.id}": vessel "${interactable.id}"`;
      if (!hasEnding) {
        throw new Error(`${placed} needs the content to have an ending and credits: the hero sails home to them`);
      }
      const first = sites[0];
      if (first !== undefined) {
        throw new Error(
          `${placed} is a second vessel, after "${first.vesselId}" of area "${first.areaId}": there is only one`,
        );
      }
      sites.push({
        areaId: area.id,
        what: `vessel "${interactable.id}"`,
        tiles: tilesBeside(interactable),
        vesselId: interactable.id,
      });
    }
  }
  return sites;
}

/** The four tiles that touch the vessel's, from any of which the hero uses it. Those that are no ground are never reached. */
function tilesBeside(vessel: Vessel): Tile[] {
  const { minX: col, minY: row } = vessel.body;
  return [
    { col: col + 1, row },
    { col: col - 1, row },
    { col, row: row + 1 },
    { col, row: row - 1 },
  ];
}

/** The box of a tile, in tile units like the other bodies. */
function tileBox({ col, row }: Tile): Box {
  return { minX: col, minY: row, maxX: col + 1, maxY: row + 1 };
}
