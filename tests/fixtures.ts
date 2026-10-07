import { createGame } from '../src/core';
import type {
  AreaDefinition,
  ChaserMonsterDefinition,
  ContentDefinition,
  Direction,
  Game,
  GameEvent,
  HeroDefinition,
  MonsterPlacement,
  MonsterTypeDefinition,
  MonsterView,
  PlayingView,
  ProgressionDefinition,
  Snapshot,
  StationaryMonsterDefinition,
  Tile,
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
//                           (8 steps to cross one tile); Health 10; Defense 0; Attack 1; attack cooldown 400 ms,
//                           which is 24 steps; strike reaches 1 tile beyond the body and is 1 tile wide
//   Levels                  the Experience that raises the hero to Levels 2 to 6 is 10, 25, 45, 70 and 100 in all
//   monster "dummy"         stationary: it never moves or attacks; body 0.5 tiles; Health 3; worth 5 Experience
//   monster "biter"         a chaser; body 0.5 tiles; Health 3; worth 8 Experience; damage 5; walks 3.75 tiles a
//                           second, which is 0.0625 tile a step (16 steps to cross one tile); notices the hero within
//                           2 tiles of its body; its attack reaches 0.75 tile beyond its body; the wind-up lasts
//                           500 ms (30 steps) and the recovery after a strike 400 ms (24 steps)
//
// Because the hero's half-width is 0.25, its centre can reach x = 1.25 to 5.75 and y = 1.25 to 4.75.

export const HERO_STEP = 0.125;
export const STEPS_PER_TILE = 8;
export const COOLDOWN_STEPS = 24;

export const ARENA_LAYOUT = ['#######', '#.....#', '#.~...#', '#.....#', '#...,.#', '#######'];

// A wide, empty field for tests that need room, such as monsters being farther from the hero than they can notice it:
//
//   ##############      14 x 7 tiles, walkable in columns 1 to 12 and rows 1 to 5.
//   #............#      The hero starts in the middle of tile (6, 3), at (6.5, 3.5): its body spans x 6.25 to 6.75
//   #............#      and y 3.25 to 3.75.
//   #............#
//   #............#
//   #............#
//   ##############
export const FIELD_LAYOUT = [
  '##############',
  '#............#',
  '#............#',
  '#............#',
  '#............#',
  '#............#',
  '##############',
];

export const BITER: ChaserMonsterDefinition = {
  behavior: 'chaser',
  health: 3,
  size: 0.5,
  experience: 8,
  damage: 5,
  speedTilesPerSecond: 3.75,
  noticingDistance: 2,
  reach: 0.75,
  windUpMs: 500,
  recoveryMs: 400,
};

interface ArenaOptions {
  readonly monsters?: readonly MonsterPlacement[];
  readonly layout?: readonly string[];
  /** More Adventure Areas besides the arena, which the hero never reaches in these tests. */
  readonly otherAreas?: readonly AreaDefinition[];
  readonly start?: ContentDefinition['start'];
  /** Replaces parts of the hero's definition, for tests about a differently built hero. */
  readonly hero?: Partial<HeroDefinition>;
  /** More monster types besides the dummy and the biter, or in place of them. */
  readonly monsterTypes?: Readonly<Record<string, MonsterTypeDefinition>>;
  /** The least damage the hero takes from a hit. Leave it out to get the default. */
  readonly minimumDamage?: number;
  /** Replaces parts of how the hero grows, such as the Level thresholds. */
  readonly progression?: Partial<ProgressionDefinition>;
}

export function arena(options: ArenaOptions = {}): ContentDefinition {
  const {
    monsters = [],
    layout = ARENA_LAYOUT,
    otherAreas = [],
    start = { area: 'arena', tile: { col: 3, row: 3 } },
    hero = {},
    monsterTypes = {},
    minimumDamage,
    progression = {},
  } = options;
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
      health: 10,
      defense: 0,
      attack: 1,
      attackCooldownMs: 400,
      meleeWeapon: { reach: 1, width: 1 },
      ...hero,
    },
    ...(minimumDamage === undefined ? {} : { minimumDamage }),
    progression: { levelThresholds: [10, 25, 45, 70, 100], ...progression },
    monsterTypes: {
      dummy: { behavior: 'stationary', health: 3, size: 0.5, experience: 5 },
      biter: BITER,
      ...monsterTypes,
    },
    areas: [{ id: 'arena', name: 'Arena', layout, monsters }, ...otherAreas],
    start,
  };
}

/** A game in the wide field, with the hero at (6.5, 3.5). */
export function fieldGame(
  monsters: readonly MonsterPlacement[],
  monsterTypes?: Readonly<Record<string, MonsterTypeDefinition>>,
): Game {
  return newGame(
    arena({ layout: FIELD_LAYOUT, start: { area: 'arena', tile: { col: 6, row: 3 } }, monsters, monsterTypes }),
  );
}

export function dummyAt(id: string, col: number, row: number): MonsterPlacement {
  return { id, type: 'dummy', tile: { col, row } };
}

export function biterAt(id: string, col: number, row: number): MonsterPlacement {
  return { id, type: 'biter', tile: { col, row } };
}

/** A stationary monster that a single strike defeats, worth the given Experience. */
export function frailMonster(experience: number): StationaryMonsterDefinition {
  return { behavior: 'stationary', health: 1, size: 0.5, experience };
}

/** The tiles next to the hero's start where prizes stand, in order: below it, right of it, left of it, above it. */
const PRIZE_TILES: readonly Tile[] = [
  { col: 3, row: 4 },
  { col: 4, row: 3 },
  { col: 2, row: 3 },
  { col: 3, row: 2 },
];
const PRIZE_SIDES: readonly Direction[] = ['down', 'right', 'left', 'up'];

/** What the arena needs for frail monsters worth the given Experience, standing around the hero (see PRIZE_TILES). */
export function prizes(...experiences: number[]): Pick<ArenaOptions, 'monsters' | 'monsterTypes'> {
  const monsterTypes: Record<string, MonsterTypeDefinition> = {};
  const monsters = experiences.map((experience, index): MonsterPlacement => {
    const tile = PRIZE_TILES[index];
    if (tile === undefined) {
      throw new Error('The arena has room for four prizes around the hero');
    }
    monsterTypes[`prize-${index + 1}`] = frailMonster(experience);
    return { id: `prize-${index + 1}`, type: `prize-${index + 1}`, tile };
  });
  return { monsters, monsterTypes };
}

/** A game in the arena where the hero stands among prizes: the first below it, where it faces, the second right of it. */
export function gameWithPrizes(...experiences: number[]): Game {
  return newGame(arena(prizes(...experiences)));
}

/** Turns to the prize (counted from 1), waits out the cooldown and strikes it down. Returns the strike's events. */
export function defeatPrize(game: Game, prize: number): readonly GameEvent[] {
  const side = PRIZE_SIDES[prize - 1];
  if (side === undefined) {
    throw new Error(`There is no prize ${prize}`);
  }
  face(game, side);
  return strike(game);
}

/** The random source for tests: no rule uses randomness yet, so any fixed value will do. */
export const fixedRandom = (): number => 0.5;

export function newGame(content: ContentDefinition = arena()): Game {
  const game = gameAtTitle(content);
  game.send({ type: 'new-game' });
  return game;
}

/** A game that has not begun: it shows the title until it gets a session command. */
export function gameAtTitle(content: ContentDefinition = arena()): Game {
  return createGame({ content, random: fixedRandom });
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

/** Presses a direction key, holds it for some steps, and releases it. Returns the events of those steps. */
export function walk(game: Game, direction: Direction, steps: number): GameEvent[] {
  game.send({ type: 'move', direction });
  const events = advance(game, steps);
  game.send({ type: 'stop', direction });
  return events;
}

/** Waits out the attack cooldown, then strikes. Returns the strike's events. */
export function strike(game: Game): readonly GameEvent[] {
  advance(game, COOLDOWN_STEPS);
  return game.send({ type: 'attack' });
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

/** A monster as the view shows it. */
export function monsterNamed(game: Game, id: string): MonsterView {
  const monster = playingView(game).monsters.find((candidate) => candidate.id === id);
  if (monster === undefined) {
    throw new Error(`The view shows no monster "${id}"`);
  }
  return monster;
}

/** What a monster is doing, as the view shows it. */
export function monsterAction(game: Game, id: string): MonsterView['action'] {
  return monsterNamed(game, id).action;
}

/** What the snapshot looks like after a trip through storage. */
export function throughStorage(snapshot: Snapshot): Snapshot {
  return JSON.parse(JSON.stringify(snapshot)) as Snapshot;
}
