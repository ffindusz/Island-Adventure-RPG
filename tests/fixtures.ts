import { createGame } from '../src/core';
import type {
  AreaDefinition,
  ChaserMonsterDefinition,
  CheckpointDefinition,
  ChestView,
  ConsumableId,
  ContentDefinition,
  Direction,
  EntranceDefinition,
  ExitDefinition,
  Game,
  GameEvent,
  GearDefinition,
  HealingPotionDefinition,
  HeroDefinition,
  InteractableDefinition,
  MilestoneDefinition,
  MonsterPlacement,
  MonsterTypeDefinition,
  MonsterView,
  PlayingView,
  ProgressionDefinition,
  RandomSource,
  Snapshot,
  StationaryMonsterDefinition,
  Tile,
  TileRect,
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
//                           which is 24 steps; strike reaches 1 tile beyond the body and is 1 tile wide;
//                           interacts with what is within 0.5 tile beyond its body, in the width of its body; its
//                           arrows are 0.25 tile wide, fly 15 tiles a second, which is 0.25 tile a step, and fall
//                           4 tiles from the hero's centre (16 steps)
//   Levels                  the Experience that raises the hero to Levels 2 to 6 is 10, 25, 45, 70 and 100 in all;
//                           each Stat Point adds 3 to Health, 2 to Attack or 1 to Defense
//   Healing Potion          restores 3 Health, up to the hero's maximum
//   Gear                    the hero begins with a basic sword and basic armor, which add nothing. The arena has more
//                           Gear to find: an iron sword (+2 Attack), a steel sword (+5), leather armor (+2 Defense),
//                           plate armor (+4), a short bow (+2 Attack, for arrows only) and a long bow (+4)
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

export const ARENA_GEAR: Readonly<Record<string, GearDefinition>> = {
  'basic-sword': { name: 'Basic Sword', slot: 'melee-weapon', bonus: 0 },
  'basic-armor': { name: 'Basic Armor', slot: 'armor', bonus: 0 },
  'iron-sword': { name: 'Iron Sword', slot: 'melee-weapon', bonus: 2 },
  'steel-sword': { name: 'Steel Sword', slot: 'melee-weapon', bonus: 5 },
  'leather-armor': { name: 'Leather Armor', slot: 'armor', bonus: 2 },
  'plate-armor': { name: 'Plate Armor', slot: 'armor', bonus: 4 },
  'short-bow': { name: 'Short Bow', slot: 'ranged-weapon', bonus: 2 },
  'long-bow': { name: 'Long Bow', slot: 'ranged-weapon', bonus: 4 },
};

/** The hero's starting Gear with a short bow added to the sword and the armor. */
export const WITH_BOW = {
  'melee-weapon': 'basic-sword',
  'ranged-weapon': 'short-bow',
  armor: 'basic-armor',
} as const;

/** The one entrance an Adventure Area gets unless a test gives it others. Tile (1, 1) is ground in both layouts above. */
const DEFAULT_ENTRANCE: EntranceDefinition = { id: 'start', tile: { col: 1, row: 1 } };

/** The one Checkpoint an Adventure Area gets unless a test gives it others: in the bottom left corner, where no test walks. */
function defaultCheckpoint(areaId: string): CheckpointDefinition {
  return { id: `${areaId}-checkpoint`, tile: { col: 1, row: 4 } };
}

export interface ArenaOptions {
  readonly monsters?: readonly MonsterPlacement[];
  readonly layout?: readonly string[];
  /** More Adventure Areas besides the arena, which the hero never reaches in these tests. */
  readonly otherAreas?: readonly AreaDefinition[];
  /** Where the hero can arrive in the arena. Leave it out for a single entrance, at tile (1, 1). */
  readonly entrances?: readonly EntranceDefinition[];
  /** The exits of the arena. There are none unless a test gives some. */
  readonly exits?: readonly ExitDefinition[];
  /** The Checkpoints of the arena. Leave it out for a single one, on tile (1, 4), where no test walks. */
  readonly checkpoints?: readonly CheckpointDefinition[];
  /** The text shown the first time the hero enters the arena. There is none unless a test gives some. */
  readonly text?: string;
  /** How long area text stays on the screen, in milliseconds. Leave it out to get the default. */
  readonly areaTextMs?: number;
  /** How far from the hero the Automap reveals terrain, in tiles. Leave it out to get the default. */
  readonly automapRevealDistance?: number;
  readonly start?: ContentDefinition['start'];
  /** Replaces parts of the hero's definition, for tests about a differently built hero. */
  readonly hero?: Partial<HeroDefinition>;
  /** More monster types besides the dummy and the biter, or in place of them. */
  readonly monsterTypes?: Readonly<Record<string, MonsterTypeDefinition>>;
  /** The least damage the hero takes from a hit. Leave it out to get the default. */
  readonly minimumDamage?: number;
  /** Replaces parts of how the hero grows, such as the Level thresholds. */
  readonly progression?: Partial<ProgressionDefinition>;
  /** What the Healing Potion restores. It is 3 Health unless a test says otherwise. */
  readonly healingPotion?: HealingPotionDefinition;
  /** The milestones of the arena. There are none unless a test gives some. */
  readonly milestones?: readonly MilestoneDefinition[];
  /** The interactables of the arena, such as chests. There are none unless a test gives some. */
  readonly interactables?: readonly InteractableDefinition[];
  /** More Gear besides ARENA_GEAR, or in place of it. */
  readonly gear?: Readonly<Record<string, GearDefinition>>;
}

export function arena(options: ArenaOptions = {}): ContentDefinition {
  const {
    monsters = [],
    layout = ARENA_LAYOUT,
    otherAreas = [],
    entrances = [DEFAULT_ENTRANCE],
    exits = [],
    checkpoints = [defaultCheckpoint('arena')],
    text,
    areaTextMs,
    automapRevealDistance,
    start = { area: 'arena', tile: { col: 3, row: 3 } },
    hero = {},
    monsterTypes = {},
    minimumDamage,
    progression = {},
    healingPotion = { restores: 3 },
    milestones = [],
    interactables = [],
    gear = {},
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
      rangedWeapon: { arrowSpeedTilesPerSecond: 15, range: 4, arrowSize: 0.25 },
      interactionReach: 0.5,
      startingGear: { 'melee-weapon': 'basic-sword', armor: 'basic-armor' },
      ...hero,
    },
    ...(minimumDamage === undefined ? {} : { minimumDamage }),
    ...(areaTextMs === undefined ? {} : { areaTextMs }),
    ...(automapRevealDistance === undefined ? {} : { automapRevealDistance }),
    progression: {
      levelThresholds: [10, 25, 45, 70, 100],
      statPointValue: { health: 3, attack: 2, defense: 1 },
      ...progression,
    },
    healingPotion,
    gear: { ...ARENA_GEAR, ...gear },
    monsterTypes: {
      dummy: { behavior: 'stationary', health: 3, size: 0.5, experience: 5 },
      biter: BITER,
      ...monsterTypes,
    },
    areas: [
      {
        id: 'arena',
        name: 'Arena',
        layout,
        monsters,
        milestones,
        interactables,
        entrances,
        exits,
        checkpoints,
        ...(text === undefined ? {} : { text }),
      },
      // Most tests visit no second area, so it needs no more than the entrance and the Checkpoint every area has.
      ...otherAreas.map((area) => ({
        entrances: [DEFAULT_ENTRANCE],
        checkpoints: [defaultCheckpoint(area.id)],
        ...area,
      })),
    ],
    start,
  };
}

/** A chest on the tile (col, row) that holds the piece of Gear with the given id. */
export function chestAt(id: string, col: number, row: number, gear: string): InteractableDefinition {
  return { kind: 'chest', id, tile: { col, row }, contents: { kind: 'gear', gear } };
}

/** A cache on the tile (col, row): a chest that holds some Ammunition, or another consumable if one is named. */
export function cacheAt(
  id: string,
  col: number,
  row: number,
  amount: number,
  consumable: ConsumableId = 'ammunition',
): InteractableDefinition {
  return { kind: 'chest', id, tile: { col, row }, contents: { kind: 'consumable', consumable, amount } };
}

/** A pickup on the tile (col, row): some Healing Potions, or another consumable if one is named, to walk onto. */
export function pickupAt(
  id: string,
  col: number,
  row: number,
  amount: number,
  consumable: ConsumableId = 'healing-potion',
): InteractableDefinition {
  return { kind: 'pickup', id, tile: { col, row }, consumable, amount };
}

/** A milestone that gives the given Experience when the hero's body first overlaps the block of tiles `zone`. */
export function milestone(id: string, zone: TileRect, experience: number): MilestoneDefinition {
  return { id, zone, reward: { experience } };
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
export function prizes(...experiences: number[]): {
  monsters: MonsterPlacement[];
  monsterTypes: Record<string, MonsterTypeDefinition>;
} {
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

/** A game in the arena where the hero stands among prizes: the first below it, where it faces, the second to its right. */
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

/** The random source for the tests that are not about drops: any fixed value will do. */
export const fixedRandom = (): number => 0.5;

/** A random source that gives the scripted values in turn, and counts how many of them the game has asked for. */
export interface ScriptedRandom {
  readonly random: RandomSource;
  asked(): number;
}

/** Fails when the game asks for more values than were scripted: a roll nobody planned for is a bug to see. */
export function scriptedRandom(...values: number[]): ScriptedRandom {
  let asked = 0;
  return {
    random: () => {
      const value = values[asked];
      if (value === undefined) {
        throw new Error(`The game asked for random value ${asked + 1}, but only ${values.length} were scripted`);
      }
      asked += 1;
      return value;
    },
    asked: () => asked,
  };
}

/** A seeded random source (mulberry32): the same seed always gives the same values, from 0 up to but below 1. */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function newGame(content: ContentDefinition = arena(), random: RandomSource = fixedRandom): Game {
  const game = gameAtTitle(content, random);
  game.send({ type: 'new-game' });
  return game;
}

/** A game that has not begun: it shows the title until it gets a session command. */
export function gameAtTitle(content: ContentDefinition = arena(), random: RandomSource = fixedRandom): Game {
  return createGame({ content, random });
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

/** The chests the view shows, opened ones included, in the order the content places them. */
export function chestViews(game: Game): ChestView[] {
  return playingView(game).interactables.filter((item): item is ChestView => item.kind === 'chest');
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
