import { describe, expect, it } from 'vitest';
import { monsterColour, terrainColour } from '../src/adapter/art';
import { gameContent } from '../src/content';
import { createGame } from '../src/core';
import type { AreaDefinition, Game, MonsterTypeDefinition, Tile, TileRect } from '../src/core';
import { fixedRandom, newGame, playingView } from './fixtures';
import {
  distanceBetween,
  experienceOfAll,
  isInZone,
  keyOf,
  metOn,
  milestonesOf,
  noticingOf,
  openTilesOf,
  routeBetween,
  walkRoute,
} from './routes';

// The old castle, the fifth and last Adventure Area on the route of the adventure, up to the end of its route: what it
// has to be to read as yards and buildings and not as a second cave, with undead that are not the cave's creatures,
// supplies and an armor upgrade for the final fight, and a route that ends at a plain wall. Like the other tests of the
// shipped content, these read the map and the lists of the content and walk the hero over them with the core's own
// movement, so that moving a tile or a chest never breaks them unless the castle stops being what it is for.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';
const CAVE = 'cave';
const CASTLE = 'castle';

/** The Adventure Areas in the order of the route of the adventure. */
const ROUTE_OF_AREAS = [COAST, WOODS, MOUNTAIN, CAVE, CASTLE];

/** The canvas shows this many tiles (VIEW_TILES_WIDE and VIEW_TILES_HIGH in the adapter). */
const SCREEN_TILES = { wide: 20, high: 12 };

/** The notice is drawn over the bottom of the view, so a hero who has to stand in these rows of an area is hidden. */
const BOTTOM_ROWS = 3;

/**
 * Where the route of the castle ends for now: the middle of the plain east wall of the last hall. The ticket that adds
 * the Guardian's arena opens that wall and moves this tile.
 */
const END_OF_ROUTE: Tile = { col: 62, row: 11 };

/** The route is a long walk: this many screens wide, at least and at most. */
const SCREENS_OF_ROUTE = { least: 4, most: 5 };

/** A stretch of the route is a courtyard or a hall when it runs over this many tiles of the same ground, at least. */
const LEAST_STRETCH = 6;

/** The last hall is the open ground within this many tiles of the end of the route. */
const LAST_HALL_REACH = 4;

/** Two colours are set apart when they lie this far from each other, at least, in the cube of red, green and blue (0 to 255 each). */
const LEAST_COLOUR_GAP = 50;

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

const castle = definitionOf(CASTLE);
const wayIn = (castle.entrances ?? [])[0];
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const wayBack = (castle.exits ?? []).find(({ to }) => to.area === CAVE);
const isOpen = openTilesOf(gameContent, castle);
const kindAt = ({ col, row }: Tile): string | undefined => gameContent.terrain[castle.layout[row]?.[col] ?? '']?.kind;
const isSolidAt = ({ col, row }: Tile): boolean => gameContent.terrain[castle.layout[row]?.[col] ?? '']?.solid ?? true;
/** The route: the shortest way over open ground from the way in to the end of the route, with every door and gate shut and no key held. */
const route = routeBetween(isOpen, wayInTile, (tile) => keyOf(tile) === keyOf(END_OF_ROUTE));

/** The tiles of a rectangle of the map. */
function tilesOf({ col, row, width, height }: TileRect): Tile[] {
  return Array.from({ length: width * height }, (_, place) => ({
    col: col + (place % width),
    row: row + Math.floor(place / width),
  }));
}

/** The tiles within a number of tiles of a tile, measured the way the notice is: the farther of the columns and the rows between them. */
function tilesAround(centre: Tile, reach: number): Tile[] {
  const side = 2 * reach + 1;
  return Array.from({ length: side * side }, (_, place) => ({
    col: centre.col - reach + (place % side),
    row: centre.row - reach + Math.floor(place / side),
  }));
}

/** The stretches of a route, in order: each is a run of tiles on the same kind of ground. */
function stretchesOf(tiles: readonly Tile[]): { kind: string; length: number }[] {
  const stretches: { kind: string; length: number }[] = [];
  for (const tile of tiles) {
    const kind = kindAt(tile) ?? '';
    const last = stretches.at(-1);
    if (last?.kind === kind) {
      last.length += 1;
    } else {
      stretches.push({ kind, length: 1 });
    }
  }
  return stretches;
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

/** The types of monster in the castle, with their ids, and the tougher one among them: the one that takes most to defeat. */
const undead = [...new Set(castle.monsters.map(({ type }) => type))].flatMap((id) => {
  const type = gameContent.monsterTypes[id];
  return type === undefined ? [] : [{ id, type }];
});
const tougher = [...undead].sort((one, other) => other.type.health - one.type.health)[0];
const toughUndead = castle.monsters.filter(({ type }) => type === tougher?.id);

/** The type of a monster of the castle, which the loader sees to exist; none here only for content it refuses. */
function typeOf(monster: { readonly type: string }): MonsterTypeDefinition | undefined {
  return gameContent.monsterTypes[monster.type];
}

/** The damage of one hit of a monster type, before the Defense of the hero: of the blow, or of the shot. */
function hitOf(type: MonsterTypeDefinition): number {
  if ('damage' in type) {
    return type.damage;
  }
  return 'projectile' in type ? type.projectile.damage : 0;
}

/** Whether a tile lies in a block of open ground two tiles wide and two high: a place to step aside in either way. */
function inOpenBlock({ col, row }: Tile): boolean {
  return [-1, 0].some((fromCol) =>
    [-1, 0].some((fromRow) =>
      [0, 1].every((across) => [0, 1].every((down) => isOpen({ col: col + fromCol + across, row: row + fromRow + down }))),
    ),
  );
}

/** How far apart two colours, given as 0xRRGGBB, lie in the cube of red, green and blue. */
function colourGap(one: number, other: number): number {
  return Math.hypot(...[16, 8, 0].map((shift) => ((one >> shift) & 0xff) - ((other >> shift) & 0xff)));
}

describe('the five Adventure Areas', () => {
  it('come in the order of the route of the adventure, and the castle is the last: coast, woods, mountain, cave, castle', () => {
    expect(gameContent.areas.map(({ id }) => id)).toEqual(ROUTE_OF_AREAS);
  });

  it('are joined in order: each area has an exit forward to an entrance of the next, and the next has an exit back to an entrance of it', () => {
    for (const [index, id] of ROUTE_OF_AREAS.slice(0, -1).entries()) {
      const next = ROUTE_OF_AREAS[index + 1] ?? '';
      const forward = (definitionOf(id).exits ?? []).find(({ to }) => to.area === next);
      const back = (definitionOf(next).exits ?? []).find(({ to }) => to.area === id);

      expect(forward, `${id} has an exit forward to ${next}`).toBeDefined();
      expect((definitionOf(next).entrances ?? []).map((entrance) => entrance.id)).toContain(forward?.to.entrance);
      expect(back, `${next} has an exit back to ${id}`).toBeDefined();
      expect((definitionOf(id).entrances ?? []).map((entrance) => entrance.id)).toContain(back?.to.entrance);
    }
  });

  it('load with the rest of the shipped content: the content check passes', () => {
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });
});

describe('the way through the castle', () => {
  it('is larger than the screen in both directions, so that the view must follow the hero', () => {
    const { area } = playingView(quietGameAt(CASTLE, wayInTile));

    expect(area.width).toBeGreaterThan(SCREEN_TILES.wide);
    expect(area.height).toBeGreaterThan(SCREEN_TILES.high);
  });

  it('has one Checkpoint, where the hero comes in from the cave', () => {
    expect(wayIn?.id).toBe('from-cave');
    expect(castle.checkpoints).toEqual([expect.objectContaining({ id: 'castle-checkpoint', tile: wayInTile })]);
  });

  it('has one way back, to the entrance of the cave that the hero who comes from the castle uses, and keeps it and the way in out of the bottom rows', () => {
    const lowest = castle.layout.length - 1 - BOTTOM_ROWS;

    expect(wayBack?.to.entrance).toBe('from-castle');
    expect(wayIn?.tile.row ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(lowest);
    expect((wayBack?.zone.row ?? Number.POSITIVE_INFINITY) + (wayBack?.zone.height ?? 0) - 1).toBeLessThanOrEqual(lowest);
  });

  it('leads from the way in to the end of the route over open ground, with every door and gate shut and no key held: no puzzle stands in the way', () => {
    expect(route).not.toBeNull();
  });

  it('lets the hero walk it from the way in to the end of the route, and keeps the hero in the castle', () => {
    const game = quietGameAt(CASTLE, wayInTile);

    walkRoute(game, route ?? []);

    const { x, y } = playingView(game).hero.position;
    expect(playingView(game).area.id).toBe(CASTLE);
    expect({ col: Math.floor(x), row: Math.floor(y) }).toEqual(END_OF_ROUTE);
  });

  it('is a long walk: four screens wide at least, and five at most', () => {
    const steps = (route?.length ?? 0) - 1;

    expect(steps).toBeGreaterThanOrEqual(SCREENS_OF_ROUTE.least * SCREEN_TILES.wide);
    expect(steps).toBeLessThanOrEqual(SCREENS_OF_ROUTE.most * SCREEN_TILES.wide);
  });

  it('goes through courtyards and halls in turn: two stretches of grass and two of sand, each six tiles long at least', () => {
    const long = stretchesOf(route ?? []).filter(({ length }) => length >= LEAST_STRETCH);

    expect(long.filter(({ kind }) => kind === 'grass').length).toBeGreaterThanOrEqual(2);
    expect(long.filter(({ kind }) => kind === 'sand').length).toBeGreaterThanOrEqual(2);
  });
});

// The end of the route is a plain wall for now: the ticket that adds the Guardian's arena replaces the wall with the way
// to it, and changes the tests of this part.
describe('the end of the route', () => {
  const lastHall = tilesAround(END_OF_ROUTE, LAST_HALL_REACH).filter((tile) => !isSolidAt(tile));
  /** Whether a block of open ground four tiles square has its corner on a tile: room for the hero to stand and step aside. */
  const hasBlockAt = ({ col, row }: Tile): boolean =>
    [0, 1, 2, 3].every((across) => [0, 1, 2, 3].every((down) => isOpen({ col: col + across, row: row + down })));

  it('is a plain wall: the end of the route lies against the east edge of the map, which is solid along its whole length', () => {
    const lastCol = (castle.layout[0]?.length ?? 0) - 1;

    expect(END_OF_ROUTE.col + 1).toBe(lastCol);
    expect(castle.layout.map((_, row) => isSolidAt({ col: lastCol, row })).every(Boolean)).toBe(true);
  });

  it('lies in a last hall that has room to prepare in: a block of open ground four tiles square', () => {
    expect(lastHall.some(hasBlockAt)).toBe(true);
  });

  it('keeps the last hall empty: no monster, chest, pickup, milestone, Checkpoint, entrance or exit is placed in it', () => {
    const inLastHall = new Set(lastHall.map(keyOf));

    expect(lastHall.length).toBeGreaterThan(0);
    expect(placed.filter(({ tiles }) => tiles.some((tile) => inLastHall.has(keyOf(tile)))).map(({ id }) => id)).toEqual([]);
  });

  it('keeps the monsters out of earshot of the last hall: none notices a hero there, with a tile to spare', () => {
    const tooNear = castle.monsters.flatMap((monster) =>
      lastHall.some((tile) => distanceBetween(tile, monster.tile) <= noticingOf(gameContent, monster) + 1) ? [monster.id] : [],
    );

    expect(tooNear).toEqual([]);
  });
});

describe('the undead of the castle', () => {
  it('holds the castle with undead and nothing else: every monster in it is of a castle type', () => {
    expect(castle.monsters.length).toBeGreaterThan(0);
    expect(castle.monsters.filter(({ type }) => !type.startsWith('castle-'))).toEqual([]);
  });

  it('meets a hero who walks the route with undead that chase, that charge and that shoot', () => {
    const behaviors = metOn(gameContent, castle, route).map((monster) => typeOf(monster)?.behavior);

    expect(behaviors).toContain('chaser');
    expect(behaviors).toContain('charger');
    expect(behaviors).toContain('ranged');
  });

  it('has a tougher undead than the rest: at least twice the health of any other undead, and a harder hit', () => {
    if (tougher === undefined) {
      throw new Error('The castle has no monsters');
    }
    const others = undead.filter(({ id }) => id !== tougher.id);

    expect(others.length).toBeGreaterThan(0);
    for (const other of others) {
      expect(tougher.type.health, `the health of ${tougher.id} against ${other.id}`).toBeGreaterThanOrEqual(
        2 * other.type.health,
      );
      expect(hitOf(tougher.type), `the hit of ${tougher.id} against ${other.id}`).toBeGreaterThan(hitOf(other.type));
    }
  });

  it('has a tougher undead than any creature of the earlier areas: more health and a harder hit than the veteran of the mountain and the bear of the cave', () => {
    const earlier = Object.entries(gameContent.monsterTypes)
      .filter(([id]) => !id.startsWith('castle-'))
      .map(([, type]) => type);

    expect(earlier.length).toBeGreaterThan(0);
    expect(tougher?.type.health ?? 0).toBeGreaterThan(Math.max(...earlier.map(({ health }) => health)));
    expect(tougher === undefined ? 0 : hitOf(tougher.type)).toBeGreaterThan(Math.max(...earlier.map(hitOf)));
  });

  it('puts the tougher undead on every way through: none keeps out of the reach of its notice', () => {
    const keepingOut = routeBetween(
      (tile) =>
        isOpen(tile) && toughUndead.every((one) => distanceBetween(tile, one.tile) > noticingOf(gameContent, one)),
      wayInTile,
      (tile) => keyOf(tile) === keyOf(END_OF_ROUTE),
    );

    expect(toughUndead.length).toBeGreaterThan(0);
    expect(keepingOut).toBeNull();
  });

  it('leaves room to step aside wherever a charger can notice the hero: no ground there is narrower than two tiles', () => {
    const chargers = castle.monsters.filter((monster) => typeOf(monster)?.behavior === 'charger');

    const cramped = chargers.flatMap((charger) =>
      castle.layout.flatMap((symbols, row) =>
        [...symbols].flatMap((_, col) => {
          const tile = { col, row };
          const near = distanceBetween(tile, charger.tile) <= noticingOf(gameContent, charger);
          return near && isOpen(tile) && !inOpenBlock(tile) ? [`${charger.id} at ${col},${row}`] : [];
        }),
      ),
    );

    expect(chargers.length).toBeGreaterThan(0);
    expect(cramped).toEqual([]);
  });

  it('draws each kind of undead in a colour of its own: set well apart from every other monster, from the ground of the castle and from the colour of what has none', () => {
    const ground = [...new Set(castle.layout.join(''))].flatMap((symbol) => {
      const kind = gameContent.terrain[symbol]?.kind;
      return kind === undefined ? [] : [{ name: kind, colour: terrainColour(kind) }];
    });
    const monsters = Object.keys(gameContent.monsterTypes).map((id) => ({ name: id, colour: monsterColour(id) }));
    const missing = { name: 'a missing colour', colour: monsterColour('no-such-monster') };

    const tooClose = undead.flatMap(({ id }) =>
      [...monsters, ...ground, missing]
        .filter(({ name, colour }) => name !== id && colourGap(monsterColour(id), colour) < LEAST_COLOUR_GAP)
        .map(({ name }) => `${id} and ${name}`),
    );

    expect(undead.length).toBeGreaterThan(0);
    expect(tooClose).toEqual([]);
  });

  it('cannot take the whole Health of a rested hero with one blow: the hit less the Defense that the hero begins with is less than its Health', () => {
    const { health, defense } = gameContent.hero;

    const killing = undead.filter(({ type }) => hitOf(type) - defense >= health).map(({ id }) => id);

    expect(undead.length).toBeGreaterThan(0);
    expect(killing).toEqual([]);
  });
});

describe('the milestone of the castle', () => {
  it('is one: the castle has a single milestone', () => {
    expect(castle.milestones).toHaveLength(1);
  });

  it('is one that no way on goes round', () => {
    const [milestone] = castle.milestones ?? [];

    const goingRound = routeBetween(
      (tile) => isOpen(tile) && !(milestone !== undefined && isInZone(milestone.zone, tile)),
      wayInTile,
      (tile) => keyOf(tile) === keyOf(END_OF_ROUTE),
    );

    expect(milestone, 'a milestone in the castle').toBeDefined();
    expect(goingRound).toBeNull();
  });

  it('is given to a hero who walks the route', () => {
    const [milestone] = castle.milestones ?? [];

    const events = walkRoute(quietGameAt(CASTLE, wayInTile), route ?? []);

    expect(events).toContainEqual({ type: 'milestone-reached', milestoneId: milestone?.id });
  });
});

describe('the Experience on the way through the castle', () => {
  const [, , , , levelSix = 0] = gameContent.progression.levelThresholds;
  const coast = definitionOf(COAST);
  const woods = definitionOf(WOODS);
  const mountain = definitionOf(MOUNTAIN);
  const cave = definitionOf(CAVE);

  /** The trail of an area: the path of sand from its way in to its exit to the next area, over open ground, every door and gate shut. */
  function trailOf(area: AreaDefinition, next: string): Tile[] | null {
    const isOpenIn = openTilesOf(gameContent, area);
    const forward = (area.exits ?? []).find(({ to }) => to.area === next);
    return routeBetween(
      (tile) => isOpenIn(tile) && gameContent.terrain[area.layout[tile.row]?.[tile.col] ?? '']?.kind === 'sand',
      (area.entrances ?? [])[0]?.tile ?? { col: 0, row: 0 },
      (tile) => forward !== undefined && isInZone(forward.zone, tile),
    );
  }

  /** The way from where the adventure begins to the exit of the coast, over open ground. */
  const coastRoute = routeBetween(openTilesOf(gameContent, coast), gameContent.start.tile, (tile) =>
    (coast.exits ?? []).some(({ zone }) => isInZone(zone, tile)),
  );

  it('gives a hero who fights what it meets from the start to the end of the route of the castle, and passes the milestones, the Experience of Level 6', () => {
    const earned =
      experienceOfAll(gameContent, metOn(gameContent, coast, coastRoute)) +
      milestonesOf(coast) +
      experienceOfAll(gameContent, metOn(gameContent, woods, trailOf(woods, MOUNTAIN))) +
      milestonesOf(woods) +
      experienceOfAll(gameContent, metOn(gameContent, mountain, trailOf(mountain, CAVE))) +
      milestonesOf(mountain) +
      experienceOfAll(gameContent, metOn(gameContent, cave, trailOf(cave, CASTLE))) +
      milestonesOf(cave) +
      experienceOfAll(gameContent, metOn(gameContent, castle, route)) +
      milestonesOf(castle);

    expect(earned).toBeGreaterThanOrEqual(levelSix);
  });
});

describe('the text of the castle', () => {
  it('is a short line, not a page', () => {
    expect(castle.text).toBeTypeOf('string');
    expect(castle.text?.length).toBeLessThanOrEqual(60);
  });
});
