import type { Area, Entrance, Exit } from './content';
import type { AreaDefinition } from './definitions';
import { boxAround, centerOf, describeTile, overlaps } from './geometry';
import type { Tile } from './geometry';
import { zoneBox } from './zones';

// Loading and checking what joins Adventure Areas: the entrances the hero arrives at and the exits it leaves by.
// content.ts calls these while it loads each area, and once more when all areas are loaded.

/** The entrances of one Adventure Area. Every area needs at least one: it is where the hero comes in. */
export function loadEntrances(area: AreaDefinition, isWalkable: (tile: Tile) => boolean): Entrance[] {
  const entrances = area.entrances ?? [];
  if (entrances.length === 0) {
    throw new Error(`Area "${area.id}" has no entrance`);
  }
  const used = new Set<string>();
  return entrances.map((entrance) => {
    claimId(used, area.id, 'entrance', entrance.id);
    if (!isWalkable(entrance.tile)) {
      throw new Error(
        `Area "${area.id}": entrance "${entrance.id}" is placed at ${describeTile(entrance.tile)}, which is solid terrain or outside the map`,
      );
    }
    return { id: entrance.id, tile: entrance.tile };
  });
}

/** Ids of entrances, and of exits, are unique within their Adventure Area: they are only looked up there. */
function claimId(used: Set<string>, areaId: string, kind: 'entrance' | 'exit', id: string): void {
  if (used.has(id)) {
    throw new Error(`Area "${areaId}": ${kind} id "${id}" is used more than once`);
  }
  used.add(id);
}

/** The exits of one Adventure Area, with their zones as boxes in tile units. `width` and `height` size its map. */
export function loadExits(area: AreaDefinition, width: number, height: number): Exit[] {
  const used = new Set<string>();
  return (area.exits ?? []).map((exit) => {
    claimId(used, area.id, 'exit', exit.id);
    return {
      id: exit.id,
      zone: zoneBox(`Area "${area.id}": the zone of exit "${exit.id}"`, exit.zone, width, height),
      to: { areaId: exit.to.area, entranceId: exit.to.entrance },
    };
  });
}

/**
 * Once every area is loaded: each exit must lead to an entrance of an area that can be left the other way, and the
 * hero must not arrive where it would at once overlap an exit, which would send it straight back. The same goes for a
 * Checkpoint, where the hero is put back after defeat.
 */
export function checkConnections(areas: Readonly<Record<string, Area>>, heroSize: number): void {
  for (const area of Object.values(areas)) {
    for (const exit of area.exits) {
      const destination = areas[exit.to.areaId];
      if (destination === undefined) {
        throw new Error(`Area "${area.id}": exit "${exit.id}" leads to unknown area "${exit.to.areaId}"`);
      }
      if (!destination.entrances.some((entrance) => entrance.id === exit.to.entranceId)) {
        throw new Error(
          `Area "${area.id}": exit "${exit.id}" leads to unknown entrance "${exit.to.entranceId}" of area "${destination.id}"`,
        );
      }
      if (!destination.exits.some((back) => back.to.areaId === area.id)) {
        throw new Error(
          `Area "${area.id}": exit "${exit.id}" leads to area "${destination.id}", which has no exit back to area "${area.id}"`,
        );
      }
    }
    for (const entrance of area.entrances) {
      const arriving = boxAround(centerOf(entrance.tile), heroSize);
      const exit = area.exits.find((candidate) => overlaps(arriving, candidate.zone));
      if (exit !== undefined) {
        throw new Error(
          `Area "${area.id}": entrance "${entrance.id}" is inside exit "${exit.id}", which would send the hero straight back`,
        );
      }
    }
    for (const checkpoint of area.checkpoints) {
      const returning = boxAround(centerOf(checkpoint.tile), heroSize);
      const exit = area.exits.find((candidate) => overlaps(returning, candidate.zone));
      if (exit !== undefined) {
        throw new Error(
          `Area "${area.id}": Checkpoint "${checkpoint.id}" is inside exit "${exit.id}", which would send the hero straight through it`,
        );
      }
    }
  }
}
