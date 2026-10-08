import { describe, expect, it } from 'vitest';
import { drawText } from '../src/adapter/pixel-font';
import type { Graphics } from '../src/adapter/pixel-font';
import { gameContent } from '../src/content';
import { STEPS_PER_SECOND, createGame } from '../src/core';
import type {
  AreaDefinition,
  Direction,
  EntranceDefinition,
  Game,
  GameEvent,
  InteractableDefinition,
  Tile,
  TileRect,
} from '../src/core';
import { face, fixedRandom, interactableViews, inventoryOf, playingView, walk } from './fixtures';

// The light puzzles the game ships with, both on the trail: a cabin behind a locked door whose key lies in the north
// woods, and a shed behind a gate that a lever opens. What a key, a door, a lever and a gate do is tested on purpose-built
// content (keys, doors, levers), and that no route needs one in device-routes.test.ts, so that changing what ships never
// breaks those. Here the shipped rooms are checked as made: where each thing stands, that every text can be drawn, and
// that a hero can walk through the steps of each puzzle to its reward. The trail is walked without its monsters.

const TRAIL = 'overgrown-trail';

/** A tile takes this many steps to cross at the hero's walking speed. */
const STEPS_PER_TILE = Math.round(STEPS_PER_SECOND / gameContent.hero.speedTilesPerSecond);

const NEIGHBOURS: readonly (readonly [Direction, Tile])[] = [
  ['up', { col: 0, row: -1 }],
  ['down', { col: 0, row: 1 }],
  ['left', { col: -1, row: 0 }],
  ['right', { col: 1, row: 0 }],
];

function areaNamed(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

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

function tilesOf(zone: TileRect): Tile[] {
  const tiles = [];
  for (let row = zone.row; row < zone.row + zone.height; row += 1) {
    for (let col = zone.col; col < zone.col + zone.width; col += 1) {
      tiles.push({ col, row });
    }
  }
  return tiles;
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

/** The walks to every tile the hero can reach in the shipped trail from its way in, with these doors and gates open. */
function trailRoutes(...open: string[]): Map<string, Direction[]> {
  const trail = areaNamed(TRAIL);
  return routesFrom(trail, firstEntranceOf(trail).tile, blockedByPlacements(trail, open));
}

/** A new game in which the hero begins at the way in to the trail, with the monsters of the trail taken out. */
function quietTrail(): Game {
  const trail = areaNamed(TRAIL);
  const areas = gameContent.areas.map((area) => (area.id === TRAIL ? { ...area, monsters: [] } : area));
  const start = { area: TRAIL, tile: firstEntranceOf(trail).tile };
  const game = createGame({ content: { ...gameContent, areas, start }, random: fixedRandom });
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
  return routesFrom(areaNamed(TRAIL), tileOf(view.hero.position), blocked);
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

/** How many rectangles the pixel font draws for a piece of text: none when it has no picture for it. */
function drawnRectangles(text: string): number {
  let rectangles = 0;
  const recorder = {
    fillStyle: () => undefined,
    fillRect: () => {
      rectangles += 1;
    },
  };
  drawText(recorder as unknown as Graphics, text, 0, 0, 0xffffff);
  return rectangles;
}

describe('the cabin on the trail', () => {
  it('keeps its key where the hero can take it with every door and gate shut', () => {
    const key = placedNamed('key', placedNamed('door', 'cabin-door').key);

    expect(trailRoutes().has(tileKey(key.tile))).toBe(true);
  });

  it('keeps its chest behind the door: the hero cannot stand beside it while the door is shut, and can once it is open', () => {
    const chest = placedNamed('chest', 'cabin-chest');

    expect(standsBeside(trailRoutes(), chest.tile)).toBe(false);
    expect(standsBeside(trailRoutes('cabin-door'), chest.tile)).toBe(true);
  });

  it('puts a sign near the door, where the hero can read it with the door shut', () => {
    const door = placedNamed('door', 'cabin-door');
    const sign = placedNamed('sign', 'cabin-sign');

    expect(standsBeside(trailRoutes(), sign.tile)).toBe(true);
    expect(Math.abs(sign.tile.col - door.tile.col)).toBeLessThanOrEqual(2);
    expect(Math.abs(sign.tile.row - door.tile.row)).toBeLessThanOrEqual(2);
  });

  it('is opened by a hero who takes its key, uses it on the door and opens the chest', () => {
    const game = quietTrail();
    const door = placedNamed('door', 'cabin-door');
    const key = placedNamed('key', door.key);
    const chest = placedNamed('chest', 'cabin-chest');

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
      { type: 'pickup', item: { kind: 'consumable', id: 'healing-potion', amount: 2 } },
    ]);
  });
});

describe('the shed on the trail', () => {
  it('keeps its lever where the hero can reach it with every door and gate shut, and has it move the gate', () => {
    const lever = placedNamed('lever', 'shed-lever');

    expect(standsBeside(trailRoutes(), lever.tile)).toBe(true);
    expect(lever.targets).toEqual(['shed-gate']);
  });

  it('keeps its Healing Potion behind the gate: out of reach while the gate is shut, within reach once it is open', () => {
    const potion = placedNamed('pickup', 'shed-potion');

    expect(trailRoutes().has(tileKey(potion.tile))).toBe(false);
    expect(trailRoutes('shed-gate').has(tileKey(potion.tile))).toBe(true);
  });

  it('is opened by a hero who pulls its lever, walks through the gate and takes the potion', () => {
    const game = quietTrail();
    const lever = placedNamed('lever', 'shed-lever');
    const potion = placedNamed('pickup', 'shed-potion');
    expect(interactableViews(game, 'gate')).toMatchObject([{ id: 'shed-gate', open: false }]);

    expect(interactWith(game, lever.tile)).toEqual([{ type: 'lever-toggled', leverId: lever.id, pulled: true }]);

    expect(interactableViews(game, 'gate')).toMatchObject([{ id: 'shed-gate', open: true }]);
    expect(walkOnto(game, potion.tile)).toContainEqual({
      type: 'pickup',
      item: { kind: 'consumable', id: 'healing-potion', amount: 1 },
    });
  });
});

describe('what the game ships with', () => {
  // The content check refuses a chest, a pickup or a device on a Checkpoint or where the hero begins, but not on an
  // entrance or in an exit, where it would stop or surprise a hero who comes in or tries to leave.
  it.each(gameContent.areas.map((area) => area.id))(
    'keeps the entrances and the exits of %s free of chests, pickups and devices',
    (id) => {
      const area = areaNamed(id);
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
    const undrawable = [...new Set(text)].filter((character) => character !== ' ' && drawnRectangles(character) === 0);

    expect(undrawable).toEqual([]);
  });
});
