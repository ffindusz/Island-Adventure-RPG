import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { STEPS_PER_SECOND, createGame } from '../src/core';
import type { AreaDefinition, Direction, EntranceDefinition, Game, GameEvent, TileRect } from '../src/core';
import { advance, fixedRandom, playingView } from './fixtures';
import { keyOf, neighboursOf, openTilesOf } from './routes';

// What must hold for the Adventure Areas the game ships with and the ways between them. The rules of moving between
// areas are tested on purpose-built content (area-connections.test.ts), so that changing what ships never breaks them.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';
const CAVE = 'cave';
const CASTLE = 'castle';

/** The canvas shows this many tiles (VIEW_TILES_WIDE and VIEW_TILES_HIGH in the adapter). */
const SCREEN_TILES = { wide: 20, high: 12 };

function areaNamed(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

function entranceOf(areaId: string, entranceId: string): EntranceDefinition {
  const entrance = areaNamed(areaId).entrances?.find((candidate) => candidate.id === entranceId);
  if (entrance === undefined) {
    throw new Error(`The Adventure Area "${areaId}" has no entrance "${entranceId}"`);
  }
  return entrance;
}

/** Where the hero stands when it comes in by an entrance: the middle of its tile. */
function centreOf(areaId: string, entranceId: string): { x: number; y: number } {
  const { tile } = entranceOf(areaId, entranceId);
  return { x: tile.col + 0.5, y: tile.row + 0.5 };
}

/** A new game in which the hero begins on a tile of an Adventure Area. */
function gameBeginningAt(area: string, col: number, row: number): Game {
  const game = createGame({ content: { ...gameContent, start: { area, tile: { col, row } } }, random: fixedRandom });
  game.send({ type: 'new-game' });
  return game;
}

/** A new game in which the hero begins at an entrance, as if it had just come in by it. */
function gameComingInBy(areaId: string, entranceId: string): Game {
  const { tile } = entranceOf(areaId, entranceId);
  return gameBeginningAt(areaId, tile.col, tile.row);
}

/** Holds a direction until the hero comes into another Adventure Area, then lets go. Returns the events on the way. */
function walkThroughExit(game: Game, direction: Direction): GameEvent[] {
  const events: GameEvent[] = [];
  game.send({ type: 'move', direction });
  for (let step = 0; step < 10 * STEPS_PER_SECOND; step += 1) {
    events.push(...game.step());
    if (events.some((event) => event.type === 'area-changed')) {
      break;
    }
  }
  game.send({ type: 'stop', direction });
  return events;
}

function isWalkable(area: AreaDefinition, col: number, row: number): boolean {
  const symbol = area.layout[row]?.[col];
  return symbol !== undefined && gameContent.terrain[symbol]?.solid === false;
}

function tilesOf(zone: TileRect): { col: number; row: number }[] {
  const tiles = [];
  for (let row = zone.row; row < zone.row + zone.height; row += 1) {
    for (let col = zone.col; col < zone.col + zone.width; col += 1) {
      tiles.push({ col, row });
    }
  }
  return tiles;
}

/**
 * The tiles the hero can stand on, as "col,row", that no path of such tiles leads to from the first entrance. A chest is
 * solid like rock, and so are a lever and a sign; the doors and gates are counted open, because the rooms behind them
 * are meant to be reached by a hero who has solved the puzzle (that no way the hero needs is shut by one is a rule the
 * content check enforces, tested in device-routes.test.ts).
 */
function unreachableTiles(area: AreaDefinition): string[] {
  const first = area.entrances?.[0];
  if (first === undefined) {
    throw new Error(`The Adventure Area "${area.id}" has no entrance`);
  }
  const isOpen = openTilesOf(gameContent, area, true);
  const reached = new Set([keyOf(first.tile)]);
  const frontier = [first.tile];
  for (const tile of frontier) {
    for (const next of neighboursOf(tile)) {
      if (isOpen(next) && !reached.has(keyOf(next))) {
        reached.add(keyOf(next));
        frontier.push(next);
      }
    }
  }
  return area.layout.flatMap((line, row) =>
    [...line].flatMap((_, col) => (isOpen({ col, row }) && !reached.has(keyOf({ col, row })) ? [keyOf({ col, row })] : [])),
  );
}

const ENTRANCES = gameContent.areas.flatMap((area) =>
  (area.entrances ?? []).map((entrance) => ({ area: area.id, entrance: entrance.id })),
);

describe('the Adventure Areas the game ships with', () => {
  it('has a second area larger than the screen in both directions, so that the view must follow the hero', () => {
    const { area } = playingView(gameComingInBy(WOODS, 'from-coast'));

    expect(area.width).toBeGreaterThan(SCREEN_TILES.wide);
    expect(area.height).toBeGreaterThan(SCREEN_TILES.high);
  });

  it('leads east from the coast into the second area, where the hero arrives at the entrance the exit names', () => {
    const game = gameComingInBy(COAST, 'from-woods');

    const events = walkThroughExit(game, 'right');

    expect(events).toContainEqual({ type: 'area-changed', areaId: WOODS });
    const view = playingView(game);
    expect(view.area.id).toBe(WOODS);
    expect(view.hero.position).toEqual(centreOf(WOODS, 'from-coast'));
  });

  it('leads west from the second area back to the coast, where the hero arrives at the entrance there', () => {
    const game = gameComingInBy(WOODS, 'from-coast');

    const events = walkThroughExit(game, 'left');

    expect(events).toContainEqual({ type: 'area-changed', areaId: COAST });
    const view = playingView(game);
    expect(view.area.id).toBe(COAST);
    expect(view.hero.position).toEqual(centreOf(COAST, 'from-woods'));
  });

  it('leads east from the woods into the third area, where the hero arrives at the entrance the exit names', () => {
    const game = gameComingInBy(WOODS, 'from-mountain');

    const events = walkThroughExit(game, 'right');

    expect(events).toContainEqual({ type: 'area-changed', areaId: MOUNTAIN });
    const view = playingView(game);
    expect(view.area.id).toBe(MOUNTAIN);
    expect(view.hero.position).toEqual(centreOf(MOUNTAIN, 'from-woods'));
  });

  it('leads west from the third area back to the woods, where the hero arrives at the entrance there', () => {
    const game = gameComingInBy(MOUNTAIN, 'from-woods');

    const events = walkThroughExit(game, 'left');

    expect(events).toContainEqual({ type: 'area-changed', areaId: WOODS });
    const view = playingView(game);
    expect(view.area.id).toBe(WOODS);
    expect(view.hero.position).toEqual(centreOf(WOODS, 'from-mountain'));
  });

  it('leads east from the mountain into the fourth area, where the hero arrives at the entrance the exit names', () => {
    const game = gameComingInBy(MOUNTAIN, 'from-cave');

    const events = walkThroughExit(game, 'right');

    expect(events).toContainEqual({ type: 'area-changed', areaId: CAVE });
    const view = playingView(game);
    expect(view.area.id).toBe(CAVE);
    expect(view.hero.position).toEqual(centreOf(CAVE, 'from-mountain'));
  });

  it('leads west from the fourth area back to the mountain, where the hero arrives at the entrance there', () => {
    const game = gameComingInBy(CAVE, 'from-mountain');

    const events = walkThroughExit(game, 'left');

    expect(events).toContainEqual({ type: 'area-changed', areaId: MOUNTAIN });
    const view = playingView(game);
    expect(view.area.id).toBe(MOUNTAIN);
    expect(view.hero.position).toEqual(centreOf(MOUNTAIN, 'from-cave'));
  });

  it('leads east from the cave into the fifth area, the old castle, where the hero arrives at the entrance the exit names', () => {
    const game = gameComingInBy(CAVE, 'from-castle');

    const events = walkThroughExit(game, 'right');

    expect(events).toContainEqual({ type: 'area-changed', areaId: CASTLE });
    const view = playingView(game);
    expect(view.area.id).toBe(CASTLE);
    expect(view.hero.position).toEqual(centreOf(CASTLE, 'from-cave'));
  });

  it('leads west from the fifth area back to the cave, where the hero arrives at the entrance there', () => {
    const game = gameComingInBy(CASTLE, 'from-cave');

    const events = walkThroughExit(game, 'left');

    expect(events).toContainEqual({ type: 'area-changed', areaId: CAVE });
    const view = playingView(game);
    expect(view.area.id).toBe(CAVE);
    expect(view.hero.position).toEqual(centreOf(CAVE, 'from-castle'));
  });

  it('begins a new game by showing the text of the first area', () => {
    const game = createGame({ content: gameContent, random: fixedRandom });
    game.send({ type: 'new-game' });

    const coastText = areaNamed(COAST).text;

    expect(coastText).toBeTypeOf('string');
    expect(playingView(game).areaText).toBe(coastText);
  });

  it('shows the text of an area the first time the hero comes in, and not on a later visit', () => {
    const game = gameComingInBy(COAST, 'from-woods');
    const woodsText = areaNamed(WOODS).text;

    walkThroughExit(game, 'right');

    expect(woodsText).toBeTypeOf('string');
    expect(playingView(game).areaText).toBe(woodsText);
    advance(game, 10 * STEPS_PER_SECOND);
    expect(playingView(game).areaText).toBeNull();
    const later = [...walkThroughExit(game, 'left'), ...walkThroughExit(game, 'right')];
    expect(later.filter((event) => event.type === 'area-changed')).toHaveLength(2);
    expect(later.filter((event) => event.type === 'area-text')).toEqual([]);
    expect(playingView(game).areaText).toBeNull();
  });

  it.each(ENTRANCES)(
    'keeps every monster away from the entrance $entrance of $area: a hero who comes in is not noticed',
    ({ area, entrance }) => {
      const game = gameComingInBy(area, entrance);

      const events = advance(game, 2 * STEPS_PER_SECOND);

      expect(events.filter((event) => event.type === 'hero-hit')).toEqual([]);
      expect(playingView(game).monsters.filter((monster) => monster.action.type !== 'idle')).toEqual([]);
    },
  );

  it('puts a Checkpoint at the entrance of each area: the start of the adventure on the coast, the way in from it in the woods, the way in from the woods in the mountain, the way in from the mountain in the cave, the way in from the cave in the castle', () => {
    const checkpointTiles = (id: string) => (areaNamed(id).checkpoints ?? []).map(({ tile }) => tile);

    expect(gameContent.start.area).toBe(COAST);
    expect(checkpointTiles(COAST)).toContainEqual(gameContent.start.tile);
    expect(checkpointTiles(WOODS)).toContainEqual(entranceOf(WOODS, 'from-coast').tile);
    expect(checkpointTiles(MOUNTAIN)).toContainEqual(entranceOf(MOUNTAIN, 'from-woods').tile);
    expect(checkpointTiles(CAVE)).toContainEqual(entranceOf(CAVE, 'from-mountain').tile);
    expect(checkpointTiles(CASTLE)).toContainEqual(entranceOf(CASTLE, 'from-cave').tile);
  });

  it('begins a new game with the Checkpoint of the coast active, as the start of the adventure counts as the first', () => {
    const game = createGame({ content: gameContent, random: fixedRandom });
    game.send({ type: 'new-game' });

    expect(playingView(game).checkpoints).toEqual([expect.objectContaining({ id: 'coast-checkpoint', active: true })]);
  });

  it('touches the Checkpoint of the woods when the hero comes in from the coast', () => {
    const game = gameComingInBy(COAST, 'from-woods');

    const events = walkThroughExit(game, 'right');

    expect(events).toContainEqual({ type: 'checkpoint-activated', checkpointId: 'woods-checkpoint' });
    expect(playingView(game).checkpoints).toEqual([expect.objectContaining({ id: 'woods-checkpoint', active: true })]);
  });

  it('touches the Checkpoint of the mountain when the hero comes in from the woods', () => {
    const game = gameComingInBy(WOODS, 'from-mountain');

    const events = walkThroughExit(game, 'right');

    expect(events).toContainEqual({ type: 'checkpoint-activated', checkpointId: 'mountain-checkpoint' });
    expect(playingView(game).checkpoints).toEqual([
      expect.objectContaining({ id: 'mountain-checkpoint', active: true }),
    ]);
  });

  it('touches the Checkpoint of the cave when the hero comes in from the mountain', () => {
    const game = gameComingInBy(MOUNTAIN, 'from-cave');

    const events = walkThroughExit(game, 'right');

    expect(events).toContainEqual({ type: 'checkpoint-activated', checkpointId: 'cave-checkpoint' });
    expect(playingView(game).checkpoints).toEqual([expect.objectContaining({ id: 'cave-checkpoint', active: true })]);
  });

  it('touches the Checkpoint of the castle when the hero comes in from the cave', () => {
    const game = gameComingInBy(CAVE, 'from-castle');

    const events = walkThroughExit(game, 'right');

    expect(events).toContainEqual({ type: 'checkpoint-activated', checkpointId: 'castle-checkpoint' });
    expect(playingView(game).checkpoints).toEqual([
      expect.objectContaining({ id: 'castle-checkpoint', active: true }),
      expect.objectContaining({ id: 'guardian-checkpoint', active: false }),
    ]);
  });

  it('puts every exit and milestone on tiles the hero can stand on, so that each can be reached', () => {
    for (const area of gameContent.areas) {
      const zones = [...(area.exits ?? []), ...(area.milestones ?? [])];
      for (const { id, zone } of zones) {
        for (const { col, row } of tilesOf(zone)) {
          expect(isWalkable(area, col, row), `${area.id} "${id}" at ${col},${row}`).toBe(true);
        }
      }
    }
  });

  it.each(gameContent.areas.map((area) => area.id))(
    'lets the hero walk from the first entrance of %s to every tile in it that is not solid, a chest being solid like rock and every door and gate open',
    (id) => {
      expect(unreachableTiles(areaNamed(id))).toEqual([]);
    },
  );

  it.each(gameContent.areas.map((area) => area.id))('leaves room to stand next to every chest of %s', (id) => {
    const area = areaNamed(id);
    const isOpen = openTilesOf(gameContent, area);

    const walledIn = (area.interactables ?? []).filter(
      (item) => item.kind === 'chest' && !neighboursOf(item.tile).some(isOpen),
    );

    expect(walledIn.map((chest) => chest.id)).toEqual([]);
  });

  it.each(gameContent.areas.map((area) => area.id))(
    'keeps every chest and pickup of %s off its entrances, where the hero comes in',
    (id) => {
      const area = areaNamed(id);
      const entrances = new Set((area.entrances ?? []).map(({ tile }) => keyOf(tile)));

      const onEntrance = (area.interactables ?? []).filter((item) => entrances.has(keyOf(item.tile)));

      expect(onEntrance.map((item) => item.id)).toEqual([]);
    },
  );

  it('asks for the top-left corner of every area, which the HUD covers, to be solid: the areas it ships with are', () => {
    expect(gameContent.checkCoveredCorner).toBe(true);
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });
});
