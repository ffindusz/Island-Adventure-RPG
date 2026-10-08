import { describe, expect, it } from 'vitest';
import { monsterColour, terrainColour } from '../src/adapter/art';
import { gameContent } from '../src/content';
import { createGame } from '../src/core';
import type { AreaDefinition, Game, MonsterTypeDefinition, Tile } from '../src/core';
import { fixedRandom, newGame, playingView } from './fixtures';
import { distanceBetween, isInZone, metOn, noticingOf, openTilesOf, routeBetween, walkRoute } from './routes';

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

/** The types of monster in the cave, with their ids, and the tougher one among them: the one that takes most to defeat. */
const creatures = [...new Set(cave.monsters.map(({ type }) => type))].flatMap((id) => {
  const type = gameContent.monsterTypes[id];
  return type === undefined ? [] : [{ id, type }];
});
const tougher = [...creatures].sort((one, other) => other.type.health - one.type.health)[0];
const toughCreatures = cave.monsters.filter(({ type }) => type === tougher?.id);

/** The type of a monster of the cave, which the loader sees to exist; none here only for content it refuses. */
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

describe('the creatures of the cave', () => {
  it('holds the cave with creatures of its own and nothing else: every monster in it is of a cave type', () => {
    expect(cave.monsters.length).toBeGreaterThan(0);
    expect(cave.monsters.filter(({ type }) => !type.startsWith('cave-'))).toEqual([]);
  });

  it('meets a hero who walks the trail with creatures that chase, that charge and that shoot', () => {
    const behaviors = metOn(gameContent, cave, trail).map((monster) => typeOf(monster)?.behavior);

    expect(behaviors).toContain('chaser');
    expect(behaviors).toContain('charger');
    expect(behaviors).toContain('ranged');
  });

  it('has a tougher creature than the rest: at least twice the health of any other cave creature, and a harder hit', () => {
    if (tougher === undefined) {
      throw new Error('The cave has no monsters');
    }
    const others = creatures.filter(({ id }) => id !== tougher.id);

    expect(others.length).toBeGreaterThan(0);
    for (const other of others) {
      expect(tougher.type.health, `the health of ${tougher.id} against ${other.id}`).toBeGreaterThanOrEqual(
        2 * other.type.health,
      );
      expect(hitOf(tougher.type), `the hit of ${tougher.id} against ${other.id}`).toBeGreaterThan(hitOf(other.type));
    }
  });

  it('puts the tougher creature on every way through: none keeps out of the reach of its notice', () => {
    const keepingOut = routeBetween(
      (tile) =>
        isOpen(tile) && toughCreatures.every((creature) => distanceBetween(tile, creature.tile) > noticingOf(gameContent, creature)),
      wayInTile,
      isWayForward,
    );

    expect(toughCreatures.length).toBeGreaterThan(0);
    expect(keepingOut).toBeNull();
  });

  it('leaves room to step aside wherever a charger can notice the hero: no ground there is narrower than two tiles', () => {
    const chargers = cave.monsters.filter((monster) => typeOf(monster)?.behavior === 'charger');

    const cramped = chargers.flatMap((charger) =>
      cave.layout.flatMap((symbols, row) =>
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

  it('draws each kind of creature in a colour of its own: set well apart from every other monster and from the ground of the cave', () => {
    const ground = [...new Set(cave.layout.join(''))].flatMap((symbol) => {
      const kind = gameContent.terrain[symbol]?.kind;
      return kind === undefined ? [] : [{ name: kind, colour: terrainColour(kind) }];
    });
    const monsters = Object.keys(gameContent.monsterTypes).map((id) => ({ name: id, colour: monsterColour(id) }));

    const tooClose = creatures.flatMap(({ id }) =>
      [...monsters, ...ground]
        .filter(({ name, colour }) => name !== id && colourGap(monsterColour(id), colour) < LEAST_COLOUR_GAP)
        .map(({ name }) => `${id} and ${name}`),
    );

    expect(creatures.length).toBeGreaterThan(0);
    expect(tooClose).toEqual([]);
  });
});

describe('the text of the cave', () => {
  it('is a short line, not a page', () => {
    expect(cave.text).toBeTypeOf('string');
    expect(cave.text?.length).toBeLessThanOrEqual(60);
  });
});
