import { describe, expect, it } from 'vitest';
import { monsterColour, terrainColour } from '../src/adapter/art';
import { gameContent } from '../src/content';
import { createGame } from '../src/core';
import type {
  AreaDefinition,
  Direction,
  Game,
  GuardianMonsterDefinition,
  GuardianPatternDefinition,
  MonsterPlacement,
  MonsterTypeDefinition,
  PlayState,
  Point,
  Tile,
  TileRect,
} from '../src/core';
import { fixedRandom, interactableViews, monsterNamed, newGame, playingView, walk } from './fixtures';
import { gameWithHero, heroAt, type HeroProfile, QUIET } from './profile-heroes';
import { isInZone, isWithinAwareness, keyOf, neighboursOf, openTilesOf, routeBetween, walkRoute, withoutOrdinaryMonsters } from './routes';

// The Guardian of the island, the one monster that the game ships with besides the creatures of the five Adventure Areas,
// and what lies around it at the east end of the castle: the gateway that leads to it, the Checkpoint in the gateway,
// the arena, the gate that its defeat opens and the harbor behind the gate. Like the other tests of the
// shipped content, these read the map and the lists of the content and play the hero over them with the core's own rules,
// so that moving a tile never breaks them unless the castle stops being what it is for. The rules of the Guardian are
// tested on purpose-built content (guardian-*.test.ts); what these test is that the content uses them as it should, and
// that the numbers of the Guardian, which are guesses that the tuning of the game will change, keep the fight what it
// is meant to be: one distinct, moderate climax.
//
// The reference heroes below are the three that the tuning note in the Comments of ticket 19 works the fight out for. A
// hero who reaches the arena is of Level 6 (the route gives all the Experience to the cap), with five Stat Points that it
// has spent, and the Gear of the main route, or with the best that the island holds.

const CASTLE = 'castle';
const GUARDIAN_ID = 'arena-guardian';
const GATE_ID = 'harbor-gate';
const VESSEL_ID = 'old-vessel';
const CHECKPOINT_ID = 'guardian-checkpoint';

/** The gateway: one tile wide and five long, in the row where the route of the castle ends, east of the wall of the last hall. */
const GATEWAY: TileRect = { col: 63, row: 11, width: 5, height: 1 };

/** The Guardian's Checkpoint, in the gateway, three tiles from the arena. */
const CHECKPOINT_TILE: Tile = { col: 65, row: 11 };

/** The arena: open floor sixteen tiles wide and nine high with a few pillars in it, walled in but for the gateway and the gate. */
const ARENA: TileRect = { col: 68, row: 7, width: 16, height: 9 };

/** The Guardian's gate: the one gap in the far wall of the arena, in the row of the gateway. */
const GATE_TILE: Tile = { col: 84, row: 11 };

/** The harbor: a quay of sand beyond the gate, closed in by water and rock, with the vessel at the water's edge. */
const HARBOR: TileRect = { col: 85, row: 10, width: 4, height: 3 };

/** An arena has room for every pattern to be avoided by positioning alone: this wide and this high, at least. */
const LEAST_ARENA = { wide: 12, high: 9 };

/** The most of the arena that its pillars may take. */
const MOST_PILLAR_SHARE = 0.1;

/** A harbor has room for the vessel and for the hero beside it: this many open tiles besides the vessel's, at least. */
const LEAST_HARBOR_TILES = 8;

/** Two colours are set apart when they lie this far from each other, at least, in the cube of red, green and blue (0 to 255 each). */
const LEAST_COLOUR_GAP = 50;

/** A fight lasts as many strikes as a hero needs to take the Guardian's Health: not a pushover and not a grind. */
const STRIKES_TO_DEFEAT = { least: 12, most: 40 };

/** A hit takes this long at most to land from the first step of its wind-up, so that a scene can end where it must: well over the longest. */
const SCENE_STEP_LIMIT = 240;

function definitionOf(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

/** The Guardian's type, which the content must give to the monster it places. */
function guardianTypeOf(placement: MonsterPlacement | undefined): GuardianMonsterDefinition {
  const type = placement === undefined ? undefined : gameContent.monsterTypes[placement.type];
  if (type?.behavior !== 'guardian') {
    throw new Error(`The monster "${placement?.id}" of the shipped content is no Guardian`);
  }
  return type;
}

const castle = definitionOf(CASTLE);
const wayIn = (castle.entrances ?? [])[0];
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const guardian = castle.monsters.find(({ id }) => id === GUARDIAN_ID);
const guardianTile: Tile = guardian?.tile ?? { col: 0, row: 0 };
const vesselTile: Tile = (castle.interactables ?? []).find(({ id }) => id === VESSEL_ID)?.tile ?? { col: 0, row: 0 };
const { hero } = gameContent;

/** Where the hero can stand with every door and gate shut, as it begins, and with them all open, as it is once the puzzles are solved. */
const isOpen = openTilesOf(gameContent, castle);
const isOpenOnceOpened = openTilesOf(gameContent, castle, true);

function tileOf({ x, y }: Point): Tile {
  return { col: Math.floor(x), row: Math.floor(y) };
}

/** The tiles of a rectangle of the map. */
function tilesOf({ col, row, width, height }: TileRect): Tile[] {
  return Array.from({ length: width * height }, (_, place) => ({
    col: col + (place % width),
    row: row + Math.floor(place / width),
  }));
}

/** The tiles that surround a rectangle of the map, one tile wide, corners included. */
function ringAround(rectangle: TileRect): Tile[] {
  const { col, row, width, height } = rectangle;
  return tilesOf({ col: col - 1, row: row - 1, width: width + 2, height: height + 2 }).filter(
    (tile) => !isInZone(rectangle, tile),
  );
}

/** Every tile that can be walked to from a tile over open ground, the tile itself included. */
function regionFrom(isOpenGround: (tile: Tile) => boolean, from: Tile): Tile[] {
  const seen = new Set([keyOf(from)]);
  const region = [from];
  for (const tile of region) {
    for (const next of neighboursOf(tile)) {
      if (!seen.has(keyOf(next)) && isOpenGround(next)) {
        seen.add(keyOf(next));
        region.push(next);
      }
    }
  }
  return region;
}

/** Everything placed on the map of the castle, by id, with the tiles it takes: a zone takes all of its tiles. */
const placed = [
  ...(castle.entrances ?? []).map(({ id, tile }) => ({ id, tiles: [tile] })),
  ...(castle.checkpoints ?? []).map(({ id, tile }) => ({ id, tiles: [tile] })),
  ...(castle.exits ?? []).map(({ id, zone }) => ({ id, tiles: tilesOf(zone) })),
  ...(castle.milestones ?? []).map(({ id, zone }) => ({ id, tiles: tilesOf(zone) })),
  ...(castle.interactables ?? []).map(({ id, tile }) => ({ id, tiles: [tile] })),
  ...castle.monsters.map(({ id, tile }) => ({ id, tiles: [tile] })),
];

/** The ids of what is placed on the tiles of a rectangle. */
function placedIn(rectangle: TileRect): string[] {
  return placed.filter(({ tiles }) => tiles.some((tile) => isInZone(rectangle, tile))).map(({ id }) => id);
}

/** The damage of one hit of a monster type, before the Defense of the hero: of its hardest pattern, when it has patterns. */
function hitOf(type: MonsterTypeDefinition): number {
  if (type.behavior === 'guardian') {
    return Math.max(...type.patterns.map(({ damage }) => damage));
  }
  if ('damage' in type) {
    return type.damage;
  }
  return 'projectile' in type ? type.projectile.damage : 0;
}

/** How far apart two colours, given as 0xRRGGBB, lie in the cube of red, green and blue. */
function colourGap(one: number, other: number): number {
  return Math.hypot(...[16, 8, 0].map((shift) => ((one >> shift) & 0xff) - ((other >> shift) & 0xff)));
}

/** A new game of the shipped content in which the hero begins on a tile of an area, with every monster taken out but the Guardian. */
function quietGameAt(areaId: string, tile: Tile): Game {
  return newGame({ ...gameContent, areas: withoutOrdinaryMonsters(gameContent), start: { area: areaId, tile } });
}

describe('the Guardian of the castle', () => {
  it('loads with the rest of the shipped content, which asks for it: the content check, with its rules for a Guardian, passes', () => {
    expect(gameContent.requireGuardian).toBe(true);
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });

  it('is the only Guardian of the game: it stands in the arena of the castle', () => {
    const guardians = gameContent.areas.flatMap((area) =>
      area.monsters.flatMap((monster) =>
        gameContent.monsterTypes[monster.type]?.behavior === 'guardian' ? [{ area: area.id, id: monster.id }] : [],
      ),
    );

    expect(guardians).toEqual([{ area: CASTLE, id: GUARDIAN_ID }]);
    expect(isInZone(ARENA, guardianTile)).toBe(true);
  });

  it('is the only thing placed in the arena: no other monster, chest, pickup, device, Checkpoint, entrance, exit or milestone', () => {
    expect(placedIn(ARENA)).toEqual([GUARDIAN_ID]);
  });

  it('takes notice of nobody outside the arena: no open ground of the castle but the arena lies where it can notice a hero, or reach one', () => {
    const type = guardianTypeOf(guardian);
    const inAwareness = (tile: Tile): boolean => isWithinAwareness(type, guardianTile, hero.size, tile);

    const outside = castle.layout.flatMap((symbols, row) =>
      [...symbols].flatMap((_, col) => {
        const tile = { col, row };
        return isOpen(tile) && !isInZone(ARENA, tile) && inAwareness(tile) ? [`${col},${row}`] : [];
      }),
    );

    expect(outside).toEqual([]);
    expect(tilesOf(ARENA).filter((tile) => isOpen(tile) && inAwareness(tile)).length).toBeGreaterThan(0);
  });
});

describe('the arena', () => {
  it('has room for every pattern to be avoided by positioning alone: twelve tiles wide and nine high, at least', () => {
    expect(ARENA.width).toBeGreaterThanOrEqual(LEAST_ARENA.wide);
    expect(ARENA.height).toBeGreaterThanOrEqual(LEAST_ARENA.high);
  });

  it('is open floor, with a few pillars at most: no more than a tenth of it is solid', () => {
    const pillars = tilesOf(ARENA).filter((tile) => !isOpenOnceOpened(tile));

    expect(pillars.length).toBeLessThanOrEqual(ARENA.width * ARENA.height * MOST_PILLAR_SHARE);
  });

  it('is walled in but for the gateway to the west and, to the east, the Guardian\'s gate, in the same row', () => {
    const doorways = (isOpenGround: (tile: Tile) => boolean) => ringAround(ARENA).filter(isOpenGround).map(keyOf);

    expect(doorways(isOpen)).toEqual([keyOf({ col: ARENA.col - 1, row: GATEWAY.row })]);
    expect(doorways(isOpenOnceOpened).sort()).toEqual(
      [keyOf({ col: ARENA.col - 1, row: GATEWAY.row }), keyOf(GATE_TILE)].sort(),
    );
    expect(GATE_TILE.row).toBe(GATEWAY.row);
  });
});

describe('the way to the Guardian', () => {
  it('is a gateway one tile wide and five long: in each of its columns the only open ground is the one tile in the row of the route', () => {
    for (const { col } of tilesOf(GATEWAY)) {
      const open = castle.layout.flatMap((_, row) => (isOpen({ col, row }) ? [row] : []));

      expect(open, `the open ground of column ${col}`).toEqual([GATEWAY.row]);
    }
  });

  it('has the Guardian\'s Checkpoint in the gateway, at least two tiles from the arena, and no other Checkpoint but the one at the way in', () => {
    const checkpoint = (castle.checkpoints ?? []).find(({ id }) => id === CHECKPOINT_ID);

    expect(checkpoint?.tile).toEqual(CHECKPOINT_TILE);
    expect(isInZone(GATEWAY, CHECKPOINT_TILE)).toBe(true);
    expect(ARENA.col - CHECKPOINT_TILE.col).toBeGreaterThanOrEqual(2);
    expect((castle.checkpoints ?? []).map(({ id }) => id).sort()).toEqual(['castle-checkpoint', CHECKPOINT_ID]);
  });

  it('gives the game six Checkpoints in all: one at each of the five ways into an area, and the Guardian\'s', () => {
    const all = gameContent.areas.flatMap((area) => area.checkpoints ?? []);

    expect(all).toHaveLength(6);
    expect(all.filter(({ id }) => id === CHECKPOINT_ID)).toHaveLength(1);
  });

  it('leads over open ground from the way in to the Guardian with every door and gate shut and no key held, through the gateway and over the Checkpoint', () => {
    const route = routeBetween(isOpen, wayInTile, (tile) => keyOf(tile) === keyOf(guardianTile));

    expect(route).not.toBeNull();
    expect(route?.map(keyOf)).toContain(keyOf(CHECKPOINT_TILE));
    expect((route ?? []).filter((tile) => isInZone(GATEWAY, tile))).toHaveLength(GATEWAY.width);
  });

  it('puts the Checkpoint on every way to the Guardian: with its tile blocked and every door and gate open the way in leads nowhere near it', () => {
    const withoutCheckpoint = (tile: Tile) => isOpenOnceOpened(tile) && keyOf(tile) !== keyOf(CHECKPOINT_TILE);

    expect(routeBetween(withoutCheckpoint, wayInTile, (tile) => keyOf(tile) === keyOf(guardianTile))).toBeNull();
    expect(routeBetween(withoutCheckpoint, guardianTile, (tile) => keyOf(tile) === keyOf(wayInTile))).toBeNull();
  });

  it('keeps every ordinary monster on the way\'s side of the Checkpoint: none can be walked to from the Guardian without stepping on it', () => {
    const fromGuardian = (tile: Tile) => isOpenOnceOpened(tile) && keyOf(tile) !== keyOf(CHECKPOINT_TILE);
    const beyond = regionFrom(fromGuardian, guardianTile).map(keyOf);

    expect(beyond).toContain(keyOf({ col: ARENA.col, row: GATEWAY.row }));
    expect(castle.monsters.filter(({ id, tile }) => id !== GUARDIAN_ID && beyond.includes(keyOf(tile))).map(({ id }) => id)).toEqual([]);
  });

  it('lets the hero walk it with nothing opened: the Checkpoint is touched on the way, and the Guardian takes notice of the hero only once it is in the arena, which the core tells once', () => {
    const game = quietGameAt(CASTLE, wayInTile);
    const route = routeBetween(isOpen, wayInTile, (tile) => keyOf(tile) === keyOf(guardianTile));

    const events = walkRoute(game, route ?? [], () => monsterNamed(game, GUARDIAN_ID).action.type === 'idle');

    expect(events).toContainEqual({ type: 'checkpoint-activated', checkpointId: CHECKPOINT_ID });
    expect(isInZone(ARENA, tileOf(playingView(game).hero.position))).toBe(true);
    expect(monsterNamed(game, GUARDIAN_ID).action.type).not.toBe('idle');
    expect(events.filter(({ type }) => type === 'guardian-engaged')).toEqual([
      { type: 'guardian-engaged', monsterId: GUARDIAN_ID },
    ]);
    expect(events.filter(({ type }) => type === 'hero-hit')).toEqual([]);
  });
});

describe('the harbor behind the gate', () => {
  const stub = tilesOf(HARBOR);
  /** The sand that the hero can stand on: the harbor but for the tile that the vessel fills, which stops it. */
  const quay = stub.filter((tile) => keyOf(tile) !== keyOf(vesselTile));
  const reachesStub = (isOpenGround: (tile: Tile) => boolean) =>
    routeBetween(isOpenGround, wayInTile, (tile) => isInZone(HARBOR, tile));

  it('has the Guardian\'s gate in the gap of the arena\'s far wall, next to the first tile of the stub, and it begins shut', () => {
    const gate = (castle.interactables ?? []).find(({ id }) => id === GATE_ID);

    expect(gate).toMatchObject({ kind: 'gate', tile: GATE_TILE, opensWhenDefeated: GUARDIAN_ID });
    expect(isInZone(HARBOR, { col: GATE_TILE.col + 1, row: GATE_TILE.row })).toBe(true);
    expect(interactableViews(quietGameAt(CASTLE, wayInTile), 'gate').find(({ id }) => id === GATE_ID)?.open).toBe(false);
  });

  it('is out of reach of the hero while the gate is shut: no way leads to any tile of the stub', () => {
    expect(reachesStub(isOpen)).toBeNull();
  });

  it('is reached through the gate once it is open: every tile of the quay can be walked to', () => {
    expect(quay.every(isOpenOnceOpened)).toBe(true);
    for (const tile of quay) {
      expect(routeBetween(isOpenOnceOpened, wayInTile, (goal) => keyOf(goal) === keyOf(tile)), keyOf(tile)).not.toBeNull();
    }
  });

  it('has room for the vessel and for the hero beside it: eight open tiles besides the vessel\'s, which nothing but the gate leads out of', () => {
    const closedIn = (tile: Tile) => isOpenOnceOpened(tile) && keyOf(tile) !== keyOf(GATE_TILE);
    const first = quay[0];
    const region = first === undefined ? [] : regionFrom(closedIn, first);

    expect(quay.length).toBeGreaterThanOrEqual(LEAST_HARBOR_TILES);
    expect(region.map(keyOf).sort()).toEqual(quay.map(keyOf).sort());
  });

  it('holds the vessel and nothing else: no monster, chest, pickup, device, Checkpoint, entrance, exit or milestone is placed in it', () => {
    expect(placedIn(HARBOR)).toEqual([VESSEL_ID]);
  });
});

// The scenes below put the hero where the test needs it in the real arena and play the Guardian of the shipped content
// against it, with every ordinary monster taken out. They begin from a game continued from a save, the way a save would
// put the game back (the walk to the arena says nothing that they need). The core has no command to set the Guardian's
// Health or the pattern that it tries next, so the scene changes those two in the save before the game continues.

type PatternKind = GuardianPatternDefinition['kind'];

/**
 * Where each pattern is made to land on a hero who stands still: next to the Guardian for the sweep, in the lane of the
 * charge four and a half tiles from its body, and in the reach of the smite two and a half tiles from it.
 */
const STANDING: Readonly<Record<PatternKind, Point>> = {
  sweep: { x: 75, y: 11.5 },
  charge: { x: 70.5, y: 11.5 },
  smite: { x: 72.5, y: 11.5 },
};

/** Next to the Guardian, to its west, in reach of a strike to the right. */
const BESIDE_GUARDIAN: Point = STANDING.sweep;

interface Scene {
  readonly at?: Point;
  readonly facing?: Direction;
  readonly guardianHealth?: number;
  /** The index of the pattern the Guardian tries first, which is how a scene chooses the pattern that comes. */
  readonly nextPattern?: number;
}

/** A game of the shipped content in the arena: the hero as `build` says, and the Guardian as the scene says, idle on its own tile. */
function sceneOf(build: HeroProfile, scene: Scene = {}): Game {
  const place = { areaId: CASTLE, position: scene.at ?? BESIDE_GUARDIAN, facing: scene.facing ?? 'right' };
  return gameWithHero(QUIET, build, place, ({ state }) => {
    const monster = guardianOf(state);
    monster.health = scene.guardianHealth ?? monster.health;
    monster.nextPattern = scene.nextPattern ?? monster.nextPattern;
  });
}

function guardianOf(state: PlayState) {
  const monster = state.areas[CASTLE]?.monsters.find(({ id }) => id === GUARDIAN_ID);
  if (monster === undefined) {
    throw new Error('The saved game has no Guardian in the castle');
  }
  return monster;
}

/** Hero A: of Level 6 with the Stat Points spent as 2 Health, 2 Attack and 1 Defense, the Steel Sword, and the armor it began with. */
const MAIN_ROUTE = heroAt(6, { health: 2, attack: 2, defense: 1 }, { 'melee-weapon': 'steel-sword', armor: 'basic-armor' }, 0);

/** Hero B: the same Level and Stat Points with the best that the island holds, the Katana and the Knight Mail. */
const BEST_GEAR: HeroProfile = {
  ...MAIN_ROUTE,
  equipped: { 'melee-weapon': 'katana', armor: 'knight-mail' },
};

/** Hero C: of Level 4, with its three Stat Points spent as one each, and the Steel Sword: the least hero that a player who has hurried might be. */
const HURRIED = heroAt(4, { health: 1, attack: 1, defense: 1 }, { 'melee-weapon': 'steel-sword', armor: 'basic-armor' }, 0);

/** Hero D: of Level 5 with the four Stat Points of it spent: it lacks 30 Experience of the cap, as much as the Guardian is worth. */
const SHORT_OF_CAP = heroAt(5, { health: 1, attack: 1, defense: 2 }, { 'melee-weapon': 'steel-sword', armor: 'basic-armor' }, 0);

/** How much one strike of a hero takes of the Guardian's Health, read from the strike itself. */
function strikeOf(build: HeroProfile): number {
  const events = sceneOf(build).send({ type: 'attack' });
  const hit = events.find((event) => event.type === 'monster-hit');
  if (hit?.type !== 'monster-hit') {
    throw new Error('The strike did not hit the Guardian');
  }
  return hit.damage;
}

/** What the pattern of a kind takes from a hero who stands where it lands and does nothing, after Defense, read from the hit itself. */
function takenFrom(build: HeroProfile, kind: PatternKind): number {
  const type = guardianTypeOf(guardian);
  const game = sceneOf(build, {
    at: STANDING[kind],
    nextPattern: type.patterns.findIndex((pattern) => pattern.kind === kind),
  });
  for (let step = 0; step < SCENE_STEP_LIMIT; step += 1) {
    for (const event of game.step()) {
      if (event.type === 'hero-hit') {
        return event.damage;
      }
    }
  }
  throw new Error(`The ${kind} did not land within ${SCENE_STEP_LIMIT} steps`);
}

describe('the numbers of the Guardian', () => {
  const type = guardianTypeOf(guardian);
  const others = Object.entries(gameContent.monsterTypes)
    .filter(([id]) => id !== guardian?.type)
    .map(([, other]) => other);

  it('is the biggest monster of the game: bigger than any other, which also gives its charge the widest lane', () => {
    expect(others.length).toBeGreaterThan(0);
    expect(type.size).toBeGreaterThan(Math.max(...others.map(({ size }) => size)));
  });

  it('takes far more to defeat than any other monster: at least three times the Health of the toughest, which is the knight of the castle', () => {
    expect(type.health).toBeGreaterThanOrEqual(3 * Math.max(...others.map(({ health }) => health)));
  });

  it('hits harder than any other monster does, with its hardest pattern', () => {
    expect(hitOf(type)).toBeGreaterThan(Math.max(...others.map(hitOf)));
  });

  it('walks more slowly than the hero, who can always get away', () => {
    expect(type.speedTilesPerSecond).toBeLessThan(hero.speedTilesPerSecond);
  });

  it('notices a hero from as far as an arrow flies, at least, so that nobody shoots at it from where it takes no notice', () => {
    expect(type.noticingDistance).toBeGreaterThanOrEqual(hero.rangedWeapon.range);
  });

  it('makes its patterns in a fixed order: the sweep, the charge and the smite', () => {
    expect(type.patterns.map(({ kind }) => kind)).toEqual(['sweep', 'charge', 'smite']);
  });

  it('draws in a colour of its own: set well apart from every other monster, from the ground of the castle and from the colour of what has none', () => {
    const ground = [...new Set(castle.layout.join(''))].flatMap((symbol) => {
      const kind = gameContent.terrain[symbol]?.kind;
      return kind === undefined ? [] : [{ name: kind, colour: terrainColour(kind) }];
    });
    const monsters = Object.keys(gameContent.monsterTypes).map((id) => ({ name: id, colour: monsterColour(id) }));
    const missing = { name: 'a missing colour', colour: monsterColour('no-such-monster') };
    const own = guardian?.type ?? '';

    const tooClose = [...monsters, ...ground, missing]
      .filter(({ name, colour }) => name !== own && colourGap(monsterColour(own), colour) < LEAST_COLOUR_GAP)
      .map(({ name }) => `${own} and ${name}`);

    expect(tooClose).toEqual([]);
  });

  it('is worth 30 Experience to a hero that is below the cap: of Level 5 at 70, the hero is taken to Level 6 by its fall', () => {
    const game = sceneOf(SHORT_OF_CAP, { guardianHealth: 1 });

    const events = game.send({ type: 'attack' });

    expect(type.experience).toBe(30);
    expect(events).toContainEqual({ type: 'experience-gained', amount: 30 });
    expect(events).toContainEqual({ type: 'level-up', level: 6 });
  });

  it('drops nothing: no table of drops, and nothing is picked up when it falls', () => {
    const game = sceneOf(MAIN_ROUTE, { guardianHealth: 1 });
    const before = playingView(game).hero.consumables;

    const events = game.send({ type: 'attack' });

    expect(type.drops ?? []).toEqual([]);
    expect(events).toContainEqual({ type: 'guardian-defeated', monsterId: GUARDIAN_ID });
    expect(events.filter(({ type }) => type === 'pickup')).toEqual([]);
    expect(playingView(game).hero.consumables).toEqual(before);
  });
});

describe('the fight against the reference heroes', () => {
  const type = guardianTypeOf(guardian);

  // What the Comments of ticket 19 give for each: its Health, what a strike takes of the Guardian's, what each pattern
  // takes from it after its Defense, and how many strikes the Guardian takes. All of them follow from numbers that are
  // guesses, which the tuning of the game will change together with this table.
  const HEROES = [
    {
      name: 'a hero of Level 6 with the Steel Sword and the armor it began with',
      build: MAIN_ROUTE,
      health: 14,
      strike: 4,
      taken: { sweep: 6, charge: 9, smite: 5 },
      strikes: 25,
    },
    {
      name: 'a hero of Level 6 with the Katana and the Knight Mail',
      build: BEST_GEAR,
      health: 14,
      strike: 5,
      taken: { sweep: 3, charge: 6, smite: 2 },
      strikes: 20,
    },
    {
      name: 'a hero of Level 4 with the Steel Sword and the armor it began with',
      build: HURRIED,
      health: 12,
      strike: 3,
      taken: { sweep: 6, charge: 9, smite: 5 },
      strikes: 34,
    },
  ];

  it.each(HEROES)('takes $strikes strikes of $name, each of $strike', ({ build, strike, strikes }) => {
    expect(strikeOf(build)).toBe(strike);
    expect(Math.ceil(type.health / strike)).toBe(strikes);
  });

  it.each(HEROES)('is no pushover and no grind for $name: between twelve and forty strikes', ({ strikes }) => {
    expect(strikes).toBeGreaterThanOrEqual(STRIKES_TO_DEFEAT.least);
    expect(strikes).toBeLessThanOrEqual(STRIKES_TO_DEFEAT.most);
  });

  it.each(HEROES)(
    'costs $name the Health that the table says for the sweep, the charge and the smite, each of which it can survive at full Health',
    ({ build, health, taken }) => {
      expect(playingView(sceneOf(build)).hero.maxHealth).toBe(health);
      for (const kind of ['sweep', 'charge', 'smite'] as const) {
        expect(takenFrom(build, kind), `the ${kind}`).toBe(taken[kind]);
        expect(taken[kind], `the ${kind} against the Health of the hero`).toBeLessThan(health);
      }
    },
  );

  it('hurts a hero in the best armor less than one in the armor it began with, whatever the pattern, and still by more than the least damage a hit can do', () => {
    for (const kind of ['sweep', 'charge', 'smite'] as const) {
      const main = takenFrom(MAIN_ROUTE, kind);
      const best = takenFrom(BEST_GEAR, kind);

      expect(best, `the ${kind}`).toBeLessThan(main);
      expect(best, `the ${kind} against the best armor`).toBeGreaterThan(gameContent.minimumDamage ?? 1);
    }
  });

  it('opens its gate with its fall: the gate is shut until the strike that takes its last Health, and the hero then walks through it into the harbor', () => {
    const game = sceneOf(MAIN_ROUTE, { guardianHealth: 1 });
    const gate = () => interactableViews(game, 'gate').find(({ id }) => id === GATE_ID);
    expect(gate()?.open).toBe(false);

    const events = game.send({ type: 'attack' });

    expect(events).toContainEqual({ type: 'guardian-defeated', monsterId: GUARDIAN_ID });
    expect(gate()?.open).toBe(true);
    walk(game, 'right', 200);
    expect(isInZone(HARBOR, tileOf(playingView(game).hero.position))).toBe(true);
  });

  it('keeps its gate shut against a hero who walks at it while the Guardian lives: the hero does not get past the gate', () => {
    const game = sceneOf(MAIN_ROUTE, { at: { x: GATE_TILE.col - 0.5, y: GATE_TILE.row + 0.5 } });

    const events = walk(game, 'right', 24);

    expect(playingView(game).hero.position.x).toBeLessThanOrEqual(GATE_TILE.col - hero.size / 2);
    expect(interactableViews(game, 'gate').find(({ id }) => id === GATE_ID)?.open).toBe(false);
    expect(events.filter(({ type }) => type === 'hero-hit')).toEqual([]);
  });
});
