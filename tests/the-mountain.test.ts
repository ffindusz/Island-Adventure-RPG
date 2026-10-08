import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { createGame } from '../src/core';
import type { AreaDefinition, Game, Tile } from '../src/core';
import { fixedRandom, newGame, playingView } from './fixtures';
import { isInZone, openTilesOf, routeBetween, walkRoute } from './routes';

// The mountain, the third area on the route of the adventure, between the woods and the cave: what it has to be to be
// a climb of its own, with narrow passes and ledges, raiders to fight, an armor upgrade to find and a side path. Like
// the other tests of the shipped content, these read the map and the lists of the content and walk the hero over them
// with the core's own movement, so that moving a tile or a chest never breaks them unless the mountain stops being what
// it is for. The trail is the path of sand that the text of the mountain tells the hero to follow: it is the intended
// route, and what lies beside it is found by the hero who looks.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';
const CAVE = 'cave';

/** The canvas shows this many tiles (VIEW_TILES_WIDE and VIEW_TILES_HIGH in the adapter). */
const SCREEN_TILES = { wide: 20, high: 12 };

/** The notice is drawn over the bottom of the view, so a hero who has to stand in these rows of an area is hidden. */
const BOTTOM_ROWS = 3;

/** A pass is narrow when the way is this many tiles wide or fewer, and it is a pass for this many tiles in a row. */
const NARROW = 2;
const PASS_LENGTH = 3;

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

const mountain = definitionOf(MOUNTAIN);
const wayIn = (mountain.entrances ?? [])[0];
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const wayForward = (mountain.exits ?? []).find(({ to }) => to.area === CAVE);
const isOpen = openTilesOf(gameContent, mountain);
const isWayForward = (tile: Tile): boolean => wayForward !== undefined && isInZone(wayForward.zone, tile);
const kindAt = ({ col, row }: Tile): string | undefined => gameContent.terrain[mountain.layout[row]?.[col] ?? '']?.kind;
/** The trail: the path of sand from the way in to the exit forward, over open ground, every door shut and no key held. */
const trail = routeBetween((tile) => isOpen(tile) && kindAt(tile) === 'sand', wayInTile, isWayForward);

/** How wide the way is at a tile: the shorter of the runs of open tiles through it, across and up and down. */
function widthAt(tile: Tile): number {
  const runAlong = (stepCol: number, stepRow: number): number => {
    let length = 1;
    for (const sign of [1, -1]) {
      let next = { col: tile.col + sign * stepCol, row: tile.row + sign * stepRow };
      while (isOpen(next)) {
        length += 1;
        next = { col: next.col + sign * stepCol, row: next.row + sign * stepRow };
      }
    }
    return length;
  };
  return Math.min(runAlong(1, 0), runAlong(0, 1));
}

describe('the way through the mountain', () => {
  it('comes third on the route of the adventure: after the coast and the woods, before the cave', () => {
    expect(gameContent.areas.slice(0, 4).map(({ id }) => id)).toEqual([COAST, WOODS, MOUNTAIN, CAVE]);
  });

  it('loads with the rest of the shipped content: the content check passes', () => {
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });

  it('is larger than the screen in both directions, so that the view must follow the hero', () => {
    const { area } = playingView(quietGameAt(MOUNTAIN, wayInTile));

    expect(area.width).toBeGreaterThan(SCREEN_TILES.wide);
    expect(area.height).toBeGreaterThan(SCREEN_TILES.high);
  });

  it('leads along a path of sand from the way in to the exit forward, over open ground, with every door shut and no key held', () => {
    expect(wayIn?.id).toBe('from-woods');
    expect(wayForward, 'the mountain has an exit to the cave').toBeDefined();
    expect(wayForward?.to.entrance).toBe('from-mountain');
    expect(trail).not.toBeNull();
  });

  it('lets the hero walk it into the cave, where it touches the Checkpoint of the cave', () => {
    const game = quietGameAt(MOUNTAIN, wayInTile);

    const events = walkRoute(game, trail ?? []);

    expect(events).toContainEqual({ type: 'area-changed', areaId: CAVE });
    expect(playingView(game).area.id).toBe(CAVE);
    expect(playingView(game).checkpoints).toEqual([expect.objectContaining({ id: 'cave-checkpoint', active: true })]);
  });

  it('climbs through a narrow pass: three tiles in a row of the trail where the way is two tiles wide at most', () => {
    const narrow = (trail ?? []).map((tile) => widthAt(tile) <= NARROW);

    const passes = narrow.filter((_, place) => narrow.slice(place, place + PASS_LENGTH).filter(Boolean).length === PASS_LENGTH);

    expect(passes.length).toBeGreaterThan(0);
  });

  it('keeps the exit forward, and the entrance beside it for the hero who comes back from the cave, out of the bottom rows', () => {
    const wayBack = (mountain.entrances ?? []).find(({ id }) => id === 'from-cave');
    const lowest = mountain.layout.length - 1 - BOTTOM_ROWS;

    expect(wayBack, 'the mountain has an entrance from the cave').toBeDefined();
    expect(wayBack?.tile.row ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(lowest);
    expect((wayForward?.zone.row ?? Number.POSITIVE_INFINITY) + (wayForward?.zone.height ?? 0) - 1).toBeLessThanOrEqual(lowest);
  });

  it('has one milestone', () => {
    expect(mountain.milestones).toHaveLength(1);
  });

  it('has a milestone that no way on goes round', () => {
    const [milestone] = mountain.milestones ?? [];

    const goingRound = routeBetween(
      (tile) => isOpen(tile) && !(milestone !== undefined && isInZone(milestone.zone, tile)),
      wayInTile,
      isWayForward,
    );

    expect(milestone, 'a milestone in the mountain').toBeDefined();
    expect(goingRound).toBeNull();
  });

  it('gives the milestone to a hero who walks the trail', () => {
    const [milestone] = mountain.milestones ?? [];

    const events = walkRoute(quietGameAt(MOUNTAIN, wayInTile), trail ?? []);

    expect(events).toContainEqual({ type: 'milestone-reached', milestoneId: milestone?.id });
  });

  it('is a mountain: rock, solid, makes up half of it at least', () => {
    const rockSymbols = new Set(
      Object.entries(gameContent.terrain)
        .filter(([, terrain]) => terrain.kind === 'rock' && terrain.solid)
        .map(([symbol]) => symbol),
    );

    const tiles = mountain.layout.join('');
    const rock = [...tiles].filter((symbol) => rockSymbols.has(symbol));

    expect(rock.length / tiles.length).toBeGreaterThanOrEqual(1 / 2);
  });
});

describe('the text of the mountain', () => {
  it('is a short line, not a page', () => {
    expect(mountain.text).toBeTypeOf('string');
    expect(mountain.text?.length).toBeLessThanOrEqual(60);
  });
});
