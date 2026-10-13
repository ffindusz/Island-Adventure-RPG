import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import type { AreaDefinition, Direction, Game, Point, Snapshot, Tile } from '../src/core';
import { gameAtTitle, newGame, playingView, walk } from './fixtures';
import { AREA_IDS, areaOf } from './main-route';
import { FIRST_GEAR, gameWithHero, heroAt, QUIET } from './profile-heroes';
import { openTilesOf } from './routes';

// The passages one tile wide of the game, walked into by the real hero at the Game core's interface (ticket 31). The
// hero's body is 0.75 tile wide and a passage is 1 tile wide, so a hero that is a little off the middle of the gap, as
// a player's hero always is, meets the corner of it: the corner slide of the hero (see corner-slide.test.ts) is what
// lets it in. These tests walk a hero in from every offset from the middle of the gap, half a tile either way, a
// sixteenth of a tile at a time and both ends included, and want it past the gap within a second of steps.

/** A second of steps: the hero that is let in must be past the middle of the gap within it. */
const A_SECOND = 60;

/** Where the middle of the hero starts across the passage, from the middle of the gap: half a tile either way. */
const OFFSETS = Array.from({ length: 17 }, (_, index) => (index - 8) / 16);

const EPSILON = 1e-9;

const HERO_SIZE = gameContent.hero.size;

const NEW_HERO = heroAt(1, { health: 0, attack: 0, defense: 0 }, FIRST_GEAR, 0);

/** One of the four ways of walking, with the step of one tile along it and the way across it, in x and y. */
interface Way {
  readonly direction: Direction;
  readonly along: Point;
  readonly across: Point;
}

const WAYS: readonly Way[] = [
  { direction: 'up', along: { x: 0, y: -1 }, across: { x: 1, y: 0 } },
  { direction: 'down', along: { x: 0, y: 1 }, across: { x: 1, y: 0 } },
  { direction: 'left', along: { x: -1, y: 0 }, across: { x: 0, y: 1 } },
  { direction: 'right', along: { x: 1, y: 0 }, across: { x: 0, y: 1 } },
];

/** A passage of an area: the tile of the gap, and the way that the hero walks into it. */
interface Passage {
  readonly areaId: string;
  readonly into: Tile;
  readonly way: Way;
}

function tileBy(tile: Tile, vector: Point, times: number): Tile {
  return { col: tile.col + vector.x * times, row: tile.row + vector.y * times };
}

function centerOf(tile: Tile): Point {
  return { x: tile.col + 0.5, y: tile.row + 0.5 };
}

/**
 * Every tile and direction of an area that is a passage one tile wide, found from its map and its placed obstacles
 * alone: the tile is open, the tile behind it is open, and the tiles on both sides of it are not. A passage that a door
 * or a gate shuts at first is found with the door or the gate open.
 */
function passagesOf(area: AreaDefinition): Passage[] {
  const isOpen = openTilesOf(gameContent, area, true);
  return area.layout.flatMap((line, row) =>
    [...line].flatMap((_, col) => {
      const into = { col, row };
      return WAYS.filter(
        ({ along, across }) =>
          isOpen(into) &&
          isOpen(tileBy(into, along, -1)) &&
          !isOpen(tileBy(into, across, 1)) &&
          !isOpen(tileBy(into, across, -1)),
      ).map((way) => ({ areaId: area.id, into, way }));
    }),
  );
}

/** Whether the body of a hero with its middle at a place lies over open ground only: touching a wall is not over it. */
function fits(isOpen: (tile: Tile) => boolean, { x, y }: Point): boolean {
  const half = HERO_SIZE / 2;
  for (let row = Math.floor(y - half); row < Math.ceil(y + half); row++) {
    for (let col = Math.floor(x - half); col < Math.ceil(x + half); col++) {
      if (!isOpen({ col, row })) {
        return false;
      }
    }
  }
  return true;
}

/** How a hero comes at the mouth of a passage: how far its middle is from the middle of the gap tile, along the way. */
const APPROACHES = [
  { what: 'flush against the mouth', along: -(0.5 + HERO_SIZE / 2) },
  { what: 'from the middle of the tile behind it', along: -1 },
] as const;

/** The place of a hero's middle: so far along the passage and so far across it from the middle of the gap tile. */
function placeOf({ into, way }: Passage, along: number, across: number): Point {
  const middle = centerOf(into);
  return {
    x: middle.x + way.along.x * along + way.across.x * across,
    y: middle.y + way.along.y * along + way.across.y * across,
  };
}

/** A saved new game of the real content with every door and gate open and no monster about, for a hero to be set down in. */
function openWorld(): { readonly game: Game; readonly save: Snapshot } {
  const save = newGame(gameContent).snapshot();
  for (const area of Object.values(save.state.areas)) {
    area.monsters = [];
    for (const device of Object.values(area.interactables)) {
      if (device.kind === 'door' || device.kind === 'gate') {
        device.open = true;
      }
    }
  }
  return { game: gameAtTitle(gameContent), save };
}

/**
 * Sets the hero down at the start, holds the key of the way of the passage for a second of steps, and says where the
 * hero ended up if its middle did not get as far as the middle of the gap tile.
 */
function stuckBefore(game: Game, save: Snapshot, passage: Passage, start: Point): Point | undefined {
  const { direction, along } = passage.way;
  save.state.areaId = passage.areaId;
  save.state.hero.position = { ...start };
  save.state.hero.facing = direction;
  game.send({ type: 'continue', snapshot: save });
  game.send({ type: 'move', direction });
  const middle = centerOf(passage.into);
  let position = start;
  for (let step = 0; step < A_SECOND; step++) {
    game.step();
    position = playingView(game).hero.position;
    if ((position.x - middle.x) * along.x + (position.y - middle.y) * along.y >= -EPSILON) {
      return undefined;
    }
  }
  return position;
}

function nameOf({ areaId, into, way }: Passage): string {
  return `${areaId} (${into.col}, ${into.row}) ${way.direction}`;
}

const SWEEP_TIMEOUT_MS = 30_000;

describe.each(AREA_IDS)('the passages one tile wide of the area %s', (areaId) => {
  const area = areaOf(areaId);
  const passages = passagesOf(area);

  it('has some, found from its map and its obstacles', () => {
    expect(passages.length).toBeGreaterThan(0);
  });

  it(
    'lets in a hero whose middle is anywhere over the gap, from flush against it and from the middle of the tile behind',
    () => {
      const isOpen = openTilesOf(gameContent, area, true);
      const { game, save } = openWorld();
      const stuck: string[] = [];
      let tried = 0;
      for (const passage of passages) {
        for (const approach of APPROACHES) {
          for (const offset of OFFSETS) {
            const start = placeOf(passage, approach.along, offset);
            if (!fits(isOpen, start)) {
              continue;
            }
            tried += 1;
            const end = stuckBefore(game, save, passage, start);
            if (end !== undefined) {
              stuck.push(
                `${nameOf(passage)}, ${approach.what}, ${offset} off the middle of the gap: stuck at (${end.x}, ${end.y})`,
              );
            }
          }
        }
      }

      expect(stuck.slice(0, 5)).toEqual([]);
      // A sweep that walked nothing proves nothing.
      expect(tried).toBeGreaterThan(passages.length);
    },
    SWEEP_TIMEOUT_MS,
  );
});

describe('the passages of the sweep', () => {
  it('include the two the player named: the crevice in the south wall of the coast, and the cabin door of the woods', () => {
    const found = (areaId: string) => passagesOf(areaOf(areaId)).map(nameOf);

    expect(found('shipwreck-coast')).toContain('shipwreck-coast (25, 13) down');
    expect(found('woods')).toContain('woods (5, 22) down');
  });
});

// The two passages the player named. A hero that walks down against either stops flush above it: its body, 0.75 tile,
// touches the row of the gap, so that its middle is 0.375 tile above it.

describe('the crevice in the south wall of the bay of the coast, the tile (25, 13)', () => {
  it('lets in a hero whose middle is anywhere over it, so that its middle is in row 14 within a second', () => {
    const isOpen = openTilesOf(gameContent, areaOf('shipwreck-coast'), true);
    const stuck: number[] = [];
    let tried = 0;
    for (const offset of OFFSETS) {
      const position = { x: 25.5 + offset, y: 12.625 };
      if (!fits(isOpen, position)) {
        continue;
      }
      tried += 1;
      const game = gameWithHero(QUIET, NEW_HERO, { areaId: 'shipwreck-coast', position, facing: 'down' });
      walk(game, 'down', A_SECOND);
      if (playingView(game).hero.position.y < 14) {
        stuck.push(offset);
      }
    }

    expect(stuck).toEqual([]);
    expect(tried).toBe(OFFSETS.length);
  });
});

describe('the door of the cabin in the woods, the tile (5, 22)', () => {
  const isOpen = openTilesOf(gameContent, areaOf('woods'), true);
  const startsOver = OFFSETS.map((offset) => ({ offset, position: { x: 5.5 + offset, y: 21.625 } })).filter(
    ({ position }) => fits(isOpen, position),
  );

  function aboveTheDoor(position: Point, adjust?: (save: Snapshot) => void): Game {
    return gameWithHero(QUIET, NEW_HERO, { areaId: 'woods', position, facing: 'down' }, adjust);
  }

  function openTheDoor(save: Snapshot): void {
    const door = save.state.areas['woods']?.interactables['cabin-door'];
    if (door?.kind !== 'door') {
      throw new Error('The cabin door is not in the woods');
    }
    door.open = true;
  }

  it('is tried from every offset up to an eighth tile right of the middle: the sign beside it leaves no room beyond', () => {
    expect(startsOver.map(({ offset }) => offset)).toEqual(OFFSETS.filter((offset) => offset <= 0.125));
  });

  it('keeps a hero out while it is shut, and does not slide it: it stays flush where it was', () => {
    const moved: number[] = [];
    for (const { offset, position } of startsOver) {
      const game = aboveTheDoor(position);
      walk(game, 'down', A_SECOND);
      if (playingView(game).hero.position.x !== position.x || playingView(game).hero.position.y !== position.y) {
        moved.push(offset);
      }
    }

    expect(moved).toEqual([]);
  });

  it('lets in a hero whose middle is anywhere over it once it is open, so that its middle is in row 23 within a second', () => {
    const stuck: number[] = [];
    for (const { offset, position } of startsOver) {
      const game = aboveTheDoor(position, openTheDoor);
      walk(game, 'down', A_SECOND);
      if (playingView(game).hero.position.y < 23) {
        stuck.push(offset);
      }
    }

    expect(stuck).toEqual([]);
  });

  it('lets in a hero that opened it with the brass key, standing off the middle of it', () => {
    const game = aboveTheDoor({ x: 5.25, y: 21.625 }, (save) => {
      save.state.hero.keys = ['brass-key'];
    });

    expect(game.send({ type: 'interact' }).map((event) => event.type)).toContain('door-opened');
    walk(game, 'down', A_SECOND);

    expect(playingView(game).hero.position.y).toBeGreaterThanOrEqual(23);
  });
});
