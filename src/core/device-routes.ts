import type { Area } from './content';
import { isGuardianGate } from './device-content';
import type { Door, Gate } from './device-content';
import type { Box, Tile } from './geometry';
import { stopsWalkers } from './obstacles';

// Checking that the light puzzles never stand in the way of the route. The hero finds every door and gate shut, and
// whether it comes by a key or a lever is up to it, so the way along the route has to be there with all of them shut:
// from where the hero comes into an Adventure Area, an exit, a Checkpoint, a Guardian or a vessel that it could reach with
// every door and gate open has to be reachable with every one shut. The gate of a Guardian is the exception: it opens by
// defeating the Guardian, which is no key, lever or door but the way itself, so it counts as open in the shut case, and
// what lies behind it (the harbor, the vessel) is on the route. What the hero could not reach even with every door and
// gate open is not for this check to say: a wall is the map's business, and content with no door or gate is never
// refused. content.ts calls this once all the areas are loaded. The walking it works out is also what the checks of a
// Guardian's place and of the vessel's build on (guardian-content.ts).

/** Where the hero can be put in an Adventure Area, and what a message calls it. */
export interface Source {
  readonly what: string;
  readonly tile: Tile;
}

/** What the route needs the hero to reach in an Adventure Area. An exit is reached when any tile of its zone is. */
interface Destination {
  readonly what: string;
  readonly tiles: readonly Tile[];
}

/** Where a new game begins. */
export interface Start {
  readonly areaId: string;
  readonly tile: Tile;
}

/** A place besides the exits and the Checkpoints that the route has to lead to, as a Guardian's tile does. */
export interface Place {
  readonly areaId: string;
  /** What a message calls it. */
  readonly what: string;
  /** The tiles that the hero uses it from: it is reached when any one of them is, as an exit is. */
  readonly tiles: readonly Tile[];
}

/** The hero cannot pass between tiles that meet only at a corner, so it goes up, down, left and right across tiles. */
const STEPS: readonly Tile[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 },
];

/**
 * Throws an Error naming the first exit, Checkpoint or place that only an open door or gate lets the hero reach. The
 * gates that wait for a Guardian count as open in the shut case: the Guardian's defeat is the way through them.
 */
export function checkRoutesStayOpen(areas: readonly Area[], start: Start, places: readonly Place[] = []): void {
  for (const area of areas) {
    const open = blockedTiles(area, () => false);
    const shut = blockedTiles(area, (device) => !isGuardianGate(device));
    for (const source of sourcesOf(area, start)) {
      const reachedOpen = reachableFrom(area, source.tile, open);
      const reachedShut = reachableFrom(area, source.tile, shut);
      for (const destination of destinationsOf(area, places)) {
        if (isReached(destination, reachedOpen) && !isReached(destination, reachedShut)) {
          throw new Error(
            `Area "${area.id}": ${destination.what} cannot be reached from ${source.what} unless a door or gate is opened: the route must never need a key, a lever or a door`,
          );
        }
      }
    }
  }
}

/** Every entrance, and in the Adventure Area where the game starts, the start. */
export function sourcesOf(area: Area, start: Start): Source[] {
  const sources = area.entrances.map((entrance) => ({ what: `entrance "${entrance.id}"`, tile: entrance.tile }));
  return start.areaId === area.id ? [...sources, { what: 'where the hero starts', tile: start.tile }] : sources;
}

function destinationsOf(area: Area, places: readonly Place[]): Destination[] {
  return [
    ...area.exits.map((exit) => ({ what: `exit "${exit.id}"`, tiles: tilesOf(exit.zone) })),
    ...area.checkpoints.map((checkpoint) => ({ what: `Checkpoint "${checkpoint.id}"`, tiles: [checkpoint.tile] })),
    ...places.filter((place) => place.areaId === area.id),
  ];
}

/** The tiles a zone covers. A zone is whole tiles. */
function tilesOf(zone: Box): Tile[] {
  const tiles: Tile[] = [];
  for (let row = zone.minY; row < zone.maxY; row += 1) {
    for (let col = zone.minX; col < zone.maxX; col += 1) {
      tiles.push({ col, row });
    }
  }
  return tiles;
}

/** The tiles that interactables stand on and stop the hero, with the doors and gates that `isShut` says are shut. */
export function blockedTiles(area: Area, isShut: (device: Door | Gate) => boolean): Set<string> {
  return new Set(
    area.interactables
      .filter((interactable) => stopsWalkers(interactable, isShut))
      .map((interactable) => keyOf({ col: interactable.body.minX, row: interactable.body.minY })),
  );
}

/** Every tile the hero can walk to from a tile, past solid terrain and the `blocked` tiles. */
export function reachableFrom(area: Area, from: Tile, blocked: ReadonlySet<string>): Set<string> {
  const reached = new Set([keyOf(from)]);
  const frontier = [from];
  for (const tile of frontier) {
    for (const step of STEPS) {
      const next = { col: tile.col + step.col, row: tile.row + step.row };
      if (area.solid[next.row]?.[next.col] === false && !blocked.has(keyOf(next)) && !reached.has(keyOf(next))) {
        reached.add(keyOf(next));
        frontier.push(next);
      }
    }
  }
  return reached;
}

function isReached(destination: Destination, reached: ReadonlySet<string>): boolean {
  return destination.tiles.some((tile) => reached.has(keyOf(tile)));
}

export function keyOf(tile: Tile): string {
  return `${tile.col},${tile.row}`;
}
