import { createGame } from '../src/core';
import type {
  ContentDefinition,
  Direction,
  Game,
  GameEvent,
  MonsterPlacement,
  PlayingView,
  Snapshot,
} from '../src/core';

// The test arena. Its numbers are chosen so that every expected value in the tests can be worked out by hand,
// in exact binary fractions, without ever running the rules:
//
//   layout (7 x 6 tiles)    #######      # wall (solid)    . ground    ~ water (solid)    , sand
//                           #.....#      Walkable tiles: columns 1 to 5, rows 1 to 4.
//                           #.~...#      Water is at column 2, row 2. Sand is at column 4, row 4.
//                           #.....#
//                           #...,.#      The hero starts in the middle of tile (3, 3), at (3.5, 3.5).
//                           #######
//   hero                    body 0.5 tiles; walks 7.5 tiles a second, which is 0.125 tile a fixed step
//                           (8 steps to cross one tile); Attack 1; attack cooldown 400 ms, which is 24 steps;
//                           strike reaches 1 tile beyond the body and is 1 tile wide
//   monster "dummy"         body 0.5 tiles; Health 3
//
// Because the hero's half-width is 0.25, its centre can reach x = 1.25 to 5.75 and y = 1.25 to 4.75.

export const HERO_STEP = 0.125;
export const STEPS_PER_TILE = 8;
export const COOLDOWN_STEPS = 24;

const ARENA_LAYOUT = ['#######', '#.....#', '#.~...#', '#.....#', '#...,.#', '#######'];

interface ArenaOptions {
  readonly monsters?: readonly MonsterPlacement[];
  readonly layout?: readonly string[];
  readonly start?: ContentDefinition['start'];
}

export function arena(options: ArenaOptions = {}): ContentDefinition {
  const { monsters = [], layout = ARENA_LAYOUT, start = { area: 'arena', tile: { col: 3, row: 3 } } } = options;
  return {
    terrain: {
      '#': { kind: 'wall', solid: true },
      '.': { kind: 'ground', solid: false },
      '~': { kind: 'water', solid: true },
      ',': { kind: 'sand', solid: false },
    },
    hero: {
      size: 0.5,
      speedTilesPerSecond: 7.5,
      attack: 1,
      attackCooldownMs: 400,
      meleeWeapon: { reach: 1, width: 1 },
    },
    monsterTypes: {
      dummy: { health: 3, size: 0.5 },
    },
    areas: [{ id: 'arena', name: 'Arena', layout, monsters }],
    start,
  };
}

export function dummyAt(id: string, col: number, row: number): MonsterPlacement {
  return { id, type: 'dummy', tile: { col, row } };
}

/** The random source for tests: no rule uses randomness yet, so any fixed value will do. */
export const fixedRandom = (): number => 0.5;

export function newGame(content: ContentDefinition = arena()): Game {
  const game = createGame({ content, random: fixedRandom });
  game.send({ type: 'new-game' });
  return game;
}

export function newGameWithMonsters(...monsters: MonsterPlacement[]): Game {
  return newGame(arena({ monsters }));
}

/** Steps the game and returns every event that happened. */
export function advance(game: Game, steps: number): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < steps; i++) {
    events.push(...game.step());
  }
  return events;
}

/** Presses a direction key, holds it for some steps, and releases it. For moving the hero into place. */
export function walk(game: Game, direction: Direction, steps: number): void {
  game.send({ type: 'move', direction });
  advance(game, steps);
  game.send({ type: 'stop', direction });
}

/** Turns the hero on the spot: the key goes down and up again before any step, so the hero does not move. */
export function face(game: Game, direction: Direction): void {
  game.send({ type: 'move', direction });
  game.send({ type: 'stop', direction });
}

export function playingView(game: Game): PlayingView {
  const view = game.view();
  if (view.phase !== 'playing') {
    throw new Error(`Expected a game in play, but it is at the ${view.phase}`);
  }
  return view;
}

/** What the snapshot looks like after a trip through storage. */
export function throughStorage(snapshot: Snapshot): Snapshot {
  return JSON.parse(JSON.stringify(snapshot)) as Snapshot;
}
