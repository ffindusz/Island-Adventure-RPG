import type { AreaDefinition, ContentDefinition, Direction, Game, GameEvent, Tile, TileRect } from '../src/core';
import { playingView, walk } from './fixtures';

// Walking the hero from place to place with the core's own movement, for the tests of the content the game ships
// with. The route comes from the content's own map, so that changing what ships never breaks these tests.

/** Ends a leg that did not get anywhere: a tile takes 12 steps to cross, so this is far more than enough. */
const LEG_STEP_LIMIT = 40;

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function keyOf({ col, row }: Tile): string {
  return `${col},${row}`;
}

export function isInZone(zone: TileRect, { col, row }: Tile): boolean {
  return col >= zone.col && col < zone.col + zone.width && row >= zone.row && row < zone.row + zone.height;
}

/** The tiles of an area the hero can stand on: terrain that is not solid, and no chest, which is solid too. */
export function openTilesOf(content: ContentDefinition, area: AreaDefinition): (tile: Tile) => boolean {
  const chests = new Set(
    (area.interactables ?? []).flatMap((interactable) => (interactable.kind === 'chest' ? [keyOf(interactable.tile)] : [])),
  );
  return (tile) => {
    const symbol = area.layout[tile.row]?.[tile.col];
    return symbol !== undefined && content.terrain[symbol]?.solid === false && !chests.has(keyOf(tile));
  };
}

/**
 * The tiles of the shortest route over open tiles from one tile to the nearest tile `isGoal` accepts, both ends
 * included, or null when there is no such route.
 */
export function routeBetween(isOpen: (tile: Tile) => boolean, from: Tile, isGoal: (tile: Tile) => boolean): Tile[] | null {
  const cameFrom = new Map<string, Tile | null>([[keyOf(from), null]]);
  const frontier: Tile[] = [from];
  for (const tile of frontier) {
    if (isGoal(tile)) {
      const route: Tile[] = [];
      for (let at: Tile | null | undefined = tile; at; at = cameFrom.get(keyOf(at))) {
        route.unshift(at);
      }
      return route;
    }
    for (const [stepCol, stepRow] of NEIGHBOURS) {
      const next = { col: tile.col + stepCol, row: tile.row + stepRow };
      if (!cameFrom.has(keyOf(next)) && isOpen(next)) {
        cameFrom.set(keyOf(next), tile);
        frontier.push(next);
      }
    }
  }
  return null;
}

function directionBetween(from: Tile, to: Tile): Direction {
  if (to.col !== from.col) {
    return to.col > from.col ? 'right' : 'left';
  }
  return to.row > from.row ? 'down' : 'up';
}

function hasReached(game: Game, target: Tile, direction: Direction): boolean {
  const { x, y } = playingView(game).hero.position;
  switch (direction) {
    case 'right':
      return x >= target.col + 0.5;
    case 'left':
      return x <= target.col + 0.5;
    case 'down':
      return y >= target.row + 0.5;
    case 'up':
      return y <= target.row + 0.5;
  }
}

/**
 * Walks the hero along a route of neighbouring tiles, from the middle of each tile to the middle of the next, one
 * step at a time. It stops when `keepGoing`, asked before every step, says so, when the hero comes into another
 * Adventure Area, or when the route ends. Returns the events on the way.
 */
export function walkRoute(game: Game, route: readonly Tile[], keepGoing: () => boolean = () => true): GameEvent[] {
  const events: GameEvent[] = [];
  const areaId = playingView(game).area.id;
  for (let leg = 1; leg < route.length; leg += 1) {
    const from = route[leg - 1];
    const to = route[leg];
    if (from === undefined || to === undefined) {
      break;
    }
    const direction = directionBetween(from, to);
    for (let step = 0; !hasReached(game, to, direction); step += 1) {
      if (step === LEG_STEP_LIMIT) {
        throw new Error(`The hero is stuck on its way from ${keyOf(from)} to ${keyOf(to)}`);
      }
      if (!keepGoing()) {
        return events;
      }
      events.push(...walk(game, direction, 1));
      if (playingView(game).area.id !== areaId) {
        return events;
      }
    }
  }
  return events;
}
