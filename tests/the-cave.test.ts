import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { createGame } from '../src/core';
import type { AreaDefinition, Game, Tile } from '../src/core';
import { fixedRandom, newGame, playingView } from './fixtures';
import { isInZone, openTilesOf, routeBetween, walkRoute } from './routes';

// The cave, the fourth area on the route of the adventure, between the mountain and the old castle: what it has to be to
// be a dark network of winding passages of its own, with creatures that are not the mountain's, a side path closed by
// a gate that a lever opens, and a weapon behind it. Like the other tests of the shipped content, these read the map
// and the lists of the content and walk the hero over them with the core's own movement, so that moving a tile or a
// chest never breaks them unless the cave stops being what it is for. The trail is the path of sand that the text of
// the cave tells the hero to follow: it is the intended route, and what lies beside it is found by the hero who looks.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';
const CAVE = 'cave';
const CASTLE = 'castle';

/** The canvas shows this many tiles (VIEW_TILES_WIDE and VIEW_TILES_HIGH in the adapter). */
const SCREEN_TILES = { wide: 20, high: 12 };

/** The notice is drawn over the bottom of the view, so a hero who has to stand in these rows of an area is hidden. */
const BOTTOM_ROWS = 3;

/** A way winds when it is this many times as long as the straight line from its start to its end, at least. */
const LEAST_WINDING = 1.5;

function definitionOf(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

/** A new game of the shipped content in which the hero begins on a tile of an area, with every monster taken out. */
function quietGameAt(areaId: string, tile: Tile): Game {
  const areas = gameContent.areas.map((area) => ({ ...area, monsters: [] }));
  return newGame({ ...gameContent, areas, start: { area: areaId, tile } });
}

const cave = definitionOf(CAVE);
const wayIn = (cave.entrances ?? [])[0];
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const wayForward = (cave.exits ?? []).find(({ to }) => to.area === CASTLE);
const isOpen = openTilesOf(gameContent, cave);
const isWayForward = (tile: Tile): boolean => wayForward !== undefined && isInZone(wayForward.zone, tile);
const kindAt = ({ col, row }: Tile): string | undefined => gameContent.terrain[cave.layout[row]?.[col] ?? '']?.kind;
/** The trail: the path of sand from the way in to the exit forward, over open ground, every door and gate shut and no key held. */
const trail = routeBetween((tile) => isOpen(tile) && kindAt(tile) === 'sand', wayInTile, isWayForward);
/** The shortest way over any open ground, sand or not. */
const shortestWay = routeBetween(isOpen, wayInTile, isWayForward);

/** How far apart two tiles are along the lines of the grid, which is the way the hero walks. */
function straightLine(from: Tile, to: Tile): number {
  return Math.abs(from.col - to.col) + Math.abs(from.row - to.row);
}

/** The tiles of the exit forward. */
const forwardTiles: Tile[] = Array.from({ length: (wayForward?.zone.width ?? 0) * (wayForward?.zone.height ?? 0) }, (_, place) => ({
  col: (wayForward?.zone.col ?? 0) + (place % (wayForward?.zone.width ?? 1)),
  row: (wayForward?.zone.row ?? 0) + Math.floor(place / (wayForward?.zone.width ?? 1)),
}));

describe('the way through the cave', () => {
  it('comes fourth on the route of the adventure: after the coast, the woods and the mountain, before the castle', () => {
    expect(gameContent.areas.slice(0, 5).map(({ id }) => id)).toEqual([COAST, WOODS, MOUNTAIN, CAVE, CASTLE]);
  });

  it('loads with the rest of the shipped content: the content check passes', () => {
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });

  it('is larger than the screen in both directions, so that the view must follow the hero', () => {
    const { area } = playingView(quietGameAt(CAVE, wayInTile));

    expect(area.width).toBeGreaterThan(SCREEN_TILES.wide);
    expect(area.height).toBeGreaterThan(SCREEN_TILES.high);
  });

  it('leads along a path of sand from the way in to the exit forward, over open ground, with every door and gate shut and no key held', () => {
    expect(wayIn?.id).toBe('from-mountain');
    expect(wayForward, 'the cave has an exit to the castle').toBeDefined();
    expect(wayForward?.to.entrance).toBe('from-cave');
    expect(trail).not.toBeNull();
  });

  it('lets the hero walk it into the castle, where it touches the Checkpoint of the castle', () => {
    const game = quietGameAt(CAVE, wayInTile);

    const events = walkRoute(game, trail ?? []);

    expect(events).toContainEqual({ type: 'area-changed', areaId: CASTLE });
    expect(playingView(game).area.id).toBe(CASTLE);
    expect(playingView(game).checkpoints).toEqual([expect.objectContaining({ id: 'castle-checkpoint', active: true })]);
  });

  it('winds: the trail is half as long again as the straight line from the way in to the exit forward, and no shorter way over open ground cuts it', () => {
    const straight = Math.min(...forwardTiles.map((tile) => straightLine(wayInTile, tile)));

    expect(forwardTiles.length).toBeGreaterThan(0);
    expect((trail?.length ?? 0) - 1).toBeGreaterThanOrEqual(LEAST_WINDING * straight);
    expect((shortestWay?.length ?? 0) - 1).toBeGreaterThanOrEqual(LEAST_WINDING * straight);
  });

  it('keeps the exit forward, and the entrance beside it for the hero who comes back from the castle, out of the bottom rows', () => {
    const wayBack = (cave.entrances ?? []).find(({ id }) => id === 'from-castle');
    const lowest = cave.layout.length - 1 - BOTTOM_ROWS;

    expect(wayBack, 'the cave has an entrance from the castle').toBeDefined();
    expect(wayBack?.tile.row ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(lowest);
    expect((wayForward?.zone.row ?? Number.POSITIVE_INFINITY) + (wayForward?.zone.height ?? 0) - 1).toBeLessThanOrEqual(lowest);
  });

  it('has one Checkpoint, where the hero comes in from the mountain', () => {
    expect(cave.checkpoints).toEqual([expect.objectContaining({ id: 'cave-checkpoint', tile: wayInTile })]);
  });

  it('is a cave: rock, solid, makes up half of it at least', () => {
    const rockSymbols = new Set(
      Object.entries(gameContent.terrain)
        .filter(([, terrain]) => terrain.kind === 'rock' && terrain.solid)
        .map(([symbol]) => symbol),
    );

    const tiles = cave.layout.join('');
    const rock = [...tiles].filter((symbol) => rockSymbols.has(symbol));

    expect(rock.length / tiles.length).toBeGreaterThanOrEqual(1 / 2);
  });
});

describe('the text of the cave', () => {
  it('is a short line, not a page', () => {
    expect(cave.text).toBeTypeOf('string');
    expect(cave.text?.length).toBeLessThanOrEqual(60);
  });
});
