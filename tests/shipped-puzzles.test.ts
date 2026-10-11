import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { STEPS_PER_SECOND, createGame } from '../src/core';
import type {
  AreaDefinition,
  ContentDefinition,
  Direction,
  EntranceDefinition,
  Game,
  GameEvent,
  InteractableDefinition,
  Tile,
} from '../src/core';
import { charactersTheFontLacks } from './drawn-text';
import { face, fixedRandom, interactableViews, inventoryOf, playingView, throughStorage, walk } from './fixtures';
import { areaOf } from './main-route';
import { tilesOf } from './routes';

// The light puzzle the game ships with, in the woods: a cabin behind a locked door whose key lies in the north woods.
// What a key, a door, a lever and a gate do is tested on purpose-built content (keys, doors, levers), and that no route
// needs one in device-routes.test.ts, so that changing what ships never breaks those. Here the shipped room is checked as
// made: where each thing stands, that every text can be drawn, and that a hero can walk through the steps of the puzzle to
// its reward. The woods are walked without their monsters. The last part is where the puzzle meets the opening of a new
// game and the saved game, which other tickets made.

const WOODS = 'woods';

/** A tile takes this many steps to cross at the hero's walking speed. */
const STEPS_PER_TILE = Math.round(STEPS_PER_SECOND / gameContent.hero.speedTilesPerSecond);

const NEIGHBOURS: readonly (readonly [Direction, Tile])[] = [
  ['up', { col: 0, row: -1 }],
  ['down', { col: 0, row: 1 }],
  ['left', { col: -1, row: 0 }],
  ['right', { col: 1, row: 0 }],
];

function firstEntranceOf(area: AreaDefinition): EntranceDefinition {
  const entrance = area.entrances?.[0];
  if (entrance === undefined) {
    throw new Error(`The Adventure Area "${area.id}" has no entrance`);
  }
  return entrance;
}

/** A device or chest the shipped content places, found by its kind and id wherever it lies. */
function placedNamed<K extends InteractableDefinition['kind']>(
  kind: K,
  id: string,
): Extract<InteractableDefinition, { kind: K }> {
  const placed = gameContent.areas.flatMap((area) => area.interactables ?? []);
  const found = placed.find((item): item is Extract<InteractableDefinition, { kind: K }> => {
    return item.kind === kind && item.id === id;
  });
  if (found === undefined) {
    throw new Error(`The shipped content places no ${kind} "${id}"`);
  }
  return found;
}

const tileKey = ({ col, row }: Tile): string => `${col},${row}`;

function tileOf(point: { x: number; y: number }): Tile {
  return { col: Math.floor(point.x), row: Math.floor(point.y) };
}

function isSolidTerrain(area: AreaDefinition, { col, row }: Tile): boolean {
  const symbol = area.layout[row]?.[col];
  return symbol === undefined || gameContent.terrain[symbol]?.solid !== false;
}

/** Chests, levers and signs stop the hero always, a door or gate only while it is shut. */
function stopsHero(kind: string, isOpen: boolean): boolean {
  return kind === 'chest' || kind === 'lever' || kind === 'sign' || ((kind === 'door' || kind === 'gate') && !isOpen);
}

/** The tiles of an area's devices and chests that stop the hero, when the doors and gates named here stand open. */
function blockedByPlacements(area: AreaDefinition, open: readonly string[] = []): Set<string> {
  const placed = area.interactables ?? [];
  return new Set(placed.filter((item) => stopsHero(item.kind, open.includes(item.id))).map((item) => tileKey(item.tile)));
}

/** The tiles the hero can reach from a tile, each with the shortest walk to it, round what is solid or in the way. */
function routesFrom(area: AreaDefinition, from: Tile, blocked: ReadonlySet<string>): Map<string, Direction[]> {
  const routes = new Map<string, Direction[]>([[tileKey(from), []]]);
  const frontier = [from];
  for (const tile of frontier) {
    const route = routes.get(tileKey(tile)) ?? [];
    for (const [direction, step] of NEIGHBOURS) {
      const next = { col: tile.col + step.col, row: tile.row + step.row };
      if (!routes.has(tileKey(next)) && !blocked.has(tileKey(next)) && !isSolidTerrain(area, next)) {
        routes.set(tileKey(next), [...route, direction]);
        frontier.push(next);
      }
    }
  }
  return routes;
}

/** Whether the hero can stand on the same side as a solid thing, close enough to turn to it and use Interact. */
function standsBeside(routes: ReadonlyMap<string, unknown>, tile: Tile): boolean {
  return NEIGHBOURS.some(([, step]) => routes.has(tileKey({ col: tile.col + step.col, row: tile.row + step.row })));
}

/** The walks to every tile the hero can reach in the shipped woods from their way in, with these doors and gates open. */
function woodsRoutes(...open: string[]): Map<string, Direction[]> {
  const woods = areaOf(WOODS);
  return routesFrom(woods, firstEntranceOf(woods).tile, blockedByPlacements(woods, open));
}

/** The shipped content, with the hero beginning at the way in to the woods and the monsters of the woods taken out. */
function quietWoodsContent(): ContentDefinition {
  const woods = areaOf(WOODS);
  const areas = gameContent.areas.map((area) => (area.id === WOODS ? { ...area, monsters: [] } : area));
  return { ...gameContent, areas, start: { area: WOODS, tile: firstEntranceOf(woods).tile } };
}

/** A new game in which the hero begins at the way in to the woods, with the monsters of the woods taken out. */
function quietWoods(): Game {
  const game = createGame({ content: quietWoodsContent(), random: fixedRandom });
  game.send({ type: 'new-game' });
  return game;
}

/** The walks to every tile the hero can reach in the game as it stands, which counts the doors and gates as they are. */
function routesInGame(game: Game): Map<string, Direction[]> {
  const view = playingView(game);
  const blocked = new Set(
    view.interactables
      .filter((item) => stopsHero(item.kind, 'open' in item && item.open))
      .map((item) => tileKey(tileOf(item.position))),
  );
  return routesFrom(areaOf(WOODS), tileOf(view.hero.position), blocked);
}

function walkAlong(game: Game, route: readonly Direction[]): GameEvent[] {
  return route.flatMap((direction) => walk(game, direction, STEPS_PER_TILE));
}

/** The hero walks onto a tile, which takes what lies there. Returns the events on the way. */
function walkOnto(game: Game, tile: Tile): GameEvent[] {
  const route = routesInGame(game).get(tileKey(tile));
  if (route === undefined) {
    throw new Error(`The hero cannot get to the tile ${tileKey(tile)} now`);
  }
  return walkAlong(game, route);
}

/** The hero walks to the nearest tile beside a solid thing, turns to it and uses Interact. Returns what that did. */
function interactWith(game: Game, tile: Tile): readonly GameEvent[] {
  const routes = routesInGame(game);
  const approaches = NEIGHBOURS.flatMap(([facing, step]) => {
    const route = routes.get(tileKey({ col: tile.col - step.col, row: tile.row - step.row }));
    return route === undefined ? [] : [{ facing, route }];
  });
  const nearest = approaches.sort((one, other) => one.route.length - other.route.length)[0];
  if (nearest === undefined) {
    throw new Error(`The hero cannot get beside the tile ${tileKey(tile)} now`);
  }
  walkAlong(game, nearest.route);
  face(game, nearest.facing);
  return game.send({ type: 'interact' });
}

describe('the cabin in the woods', () => {
  it('keeps its key where the hero can take it with every door and gate shut', () => {
    const key = placedNamed('key', placedNamed('door', 'cabin-door').key);

    expect(woodsRoutes().has(tileKey(key.tile))).toBe(true);
  });

  it('keeps its chest behind the door: the hero cannot stand beside it while the door is shut, and can once it is open', () => {
    const chest = placedNamed('chest', 'cabin-chest');

    expect(standsBeside(woodsRoutes(), chest.tile)).toBe(false);
    expect(standsBeside(woodsRoutes('cabin-door'), chest.tile)).toBe(true);
  });

  it('puts a sign near the door, where the hero can read it with the door shut', () => {
    const door = placedNamed('door', 'cabin-door');
    const sign = placedNamed('sign', 'cabin-sign');

    expect(standsBeside(woodsRoutes(), sign.tile)).toBe(true);
    expect(Math.abs(sign.tile.col - door.tile.col)).toBeLessThanOrEqual(2);
    expect(Math.abs(sign.tile.row - door.tile.row)).toBeLessThanOrEqual(2);
  });

  it('is opened by a hero who takes its key, uses it on the door and opens the chest, which holds a piece of Gear', () => {
    const game = quietWoods();
    const door = placedNamed('door', 'cabin-door');
    const key = placedNamed('key', door.key);
    const chest = placedNamed('chest', 'cabin-chest');
    expect(chest.contents.kind).toBe('gear');
    const reward = chest.contents.kind === 'gear' ? chest.contents.gear : '';

    expect(walkOnto(game, key.tile)).toContainEqual({
      type: 'pickup',
      item: { kind: 'key', id: key.id, name: key.name },
    });
    expect(inventoryOf(game).keys).toEqual([{ id: key.id, name: key.name }]);
    expect(interactWith(game, door.tile)).toEqual([{ type: 'door-opened', doorId: door.id, keyName: key.name }]);
    expect(interactableViews(game, 'door')).toMatchObject([{ id: door.id, open: true }]);
    expect(inventoryOf(game).keys).toEqual([]);
    expect(interactWith(game, chest.tile)).toEqual([
      { type: 'chest-opened', chestId: chest.id },
      { type: 'pickup', item: expect.objectContaining({ kind: 'gear', id: reward }) },
    ]);
    expect(inventoryOf(game).gear.map(({ id }) => id)).toContain(reward);
  });
});

describe('what the game ships with', () => {
  // The content check refuses a chest, a pickup or a device on a Checkpoint or where the hero begins, but not on an
  // entrance or in an exit, where it would stop or surprise a hero who comes in or tries to leave.
  it.each(gameContent.areas.map((area) => area.id))(
    'keeps the entrances and the exits of %s free of chests, pickups and devices',
    (id) => {
      const area = areaOf(id);
      const kept = new Set([
        ...(area.entrances ?? []).map((entrance) => tileKey(entrance.tile)),
        ...(area.exits ?? []).flatMap((exit) => tilesOf(exit.zone).map(tileKey)),
      ]);

      const crowding = (area.interactables ?? []).filter((item) => kept.has(tileKey(item.tile)));

      expect(crowding.map((item) => item.id)).toEqual([]);
    },
  );

  const texts = gameContent.areas.flatMap((area) => [
    { of: `the text of ${area.id}`, text: area.text ?? '' },
    ...(area.interactables ?? []).flatMap((item) =>
      item.kind === 'sign' ? [{ of: `the sign ${item.id}`, text: item.text }] : [],
    ),
  ]);

  // The core cannot tell what the pixel font draws, and a letter that it leaves out is a gap in a clue.
  it.each(texts)('has $of in letters the pixel font can draw', ({ text }) => {
    expect(charactersTheFontLacks(text)).toEqual([]);
  });
});

function takeTheKey(game: Game): void {
  walkOnto(game, placedNamed('key', 'brass-key').tile);
}

function openTheCabinAndItsChest(game: Game): void {
  const door = placedNamed('door', 'cabin-door');
  walkOnto(game, placedNamed('key', door.key).tile);
  interactWith(game, door.tile);
  interactWith(game, placedNamed('chest', 'cabin-chest').tile);
}

describe('the puzzle with the opening and the saved game', () => {
  // A new game builds the world again from the content, and a continued one takes it from the save: the first must not
  // keep a key or an open door, and the second must not lose one, nor show the opening again.
  it.each([
    { after: 'taking the key', play: takeTheKey },
    { after: 'opening the cabin and its chest', play: openTheCabinAndItsChest },
  ])('begins a new game with the opening and every device as placed, after $after', ({ play }) => {
    const game = quietWoods();
    play(game);

    const events = game.send({ type: 'new-game' });

    expect(events[0]).toEqual({ type: 'opening', lines: gameContent.opening });
    expect(inventoryOf(game).keys).toEqual([]);
    expect(interactableViews(game, 'key')).toHaveLength(1);
    expect(interactableViews(game, 'door')).toMatchObject([{ open: false }]);
    expect(interactableViews(game, 'chest').filter((chest) => chest.opened)).toEqual([]);
  });

  it('continues a saved game with its key held, and without the opening', () => {
    const game = quietWoods();
    const door = placedNamed('door', 'cabin-door');
    const key = placedNamed('key', door.key);
    takeTheKey(game);
    const saved = throughStorage(game.snapshot());

    const continued = createGame({ content: quietWoodsContent(), random: fixedRandom });
    const events = continued.send({ type: 'continue', snapshot: saved });

    expect(events).toEqual([]);
    expect(inventoryOf(continued).keys).toEqual([{ id: key.id, name: key.name }]);
    expect(interactableViews(continued, 'key')).toEqual([]);
    expect(interactWith(continued, door.tile)).toEqual([{ type: 'door-opened', doorId: door.id, keyName: key.name }]);
  });
});
