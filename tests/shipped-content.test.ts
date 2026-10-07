import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { STEPS_PER_SECOND, createGame } from '../src/core';
import type {
  AreaDefinition,
  AutomapAreaView,
  AutomapPageView,
  Direction,
  Game,
  GameEvent,
  InventoryPageView,
} from '../src/core';
import { fixedRandom, playingView, walk } from './fixtures';

// Only what must hold for any content the game ships with. The tests of the rules use purpose-built content
// (fixtures.ts), so that changing what ships never breaks them.

const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;
const CLOSE_INVENTORY = { type: 'close-page', page: 'inventory' } as const;
const OPEN_AUTOMAP = { type: 'open-page', page: 'automap' } as const;
const CLOSE_AUTOMAP = { type: 'close-page', page: 'automap' } as const;

function newShippedGame() {
  const game = createGame({ content: gameContent, random: fixedRandom });
  game.send({ type: 'new-game' });
  return game;
}

/** What the inventory page shows now. It is closed again afterwards, so that the hero can walk. */
function inventoryOf(game: Game): InventoryPageView {
  game.send(OPEN_INVENTORY);
  const { page } = playingView(game);
  game.send(CLOSE_INVENTORY);
  if (page?.id !== 'inventory') {
    throw new Error('The inventory page did not open');
  }
  return page;
}

/** What the Automap page shows now. It is closed again afterwards, so that the hero can walk. */
function automapOf(game: Game): AutomapPageView {
  game.send(OPEN_AUTOMAP);
  const { page } = playingView(game);
  game.send(CLOSE_AUTOMAP);
  if (page?.id !== 'automap') {
    throw new Error('The Automap page did not open');
  }
  return page;
}

function areaOnMap(page: AutomapPageView, id: string): AutomapAreaView {
  const area = page.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The Automap shows no area "${id}"`);
  }
  return area;
}

function definitionOf(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The content has no area "${id}"`);
  }
  return area;
}

describe('the content the game ships with', () => {
  it('is valid, and a new game starts with the hero inside the Adventure Area', () => {
    const view = playingView(newShippedGame());

    expect(view.hero.position.x).toBeGreaterThan(0);
    expect(view.hero.position.x).toBeLessThan(view.area.width);
    expect(view.hero.position.y).toBeGreaterThan(0);
    expect(view.hero.position.y).toBeLessThan(view.area.height);
  });

  it('leaves the hero free to walk away from the start', () => {
    const directions: Direction[] = ['up', 'down', 'left', 'right'];

    const free = directions.filter((direction) => {
      const game = newShippedGame();
      const start = playingView(game).hero.position;
      walk(game, direction, 8);
      const end = playingView(game).hero.position;
      return end.x !== start.x || end.y !== start.y;
    });

    expect(free).not.toEqual([]);
  });

  it('has six Levels: Level 6 is the highest the hero can reach', () => {
    const game = newShippedGame();

    game.send({ type: 'open-page', page: 'stats' });

    expect(playingView(game).page).toMatchObject({ level: 1, maxLevel: 6 });
  });

  it('keeps the monsters away from the start: a hero who stays there is never hurt', () => {
    const game = newShippedGame();
    const events: GameEvent[] = [];

    for (let step = 0; step < 60 * STEPS_PER_SECOND; step += 1) {
      events.push(...game.step());
    }

    expect(events.filter((event) => event.type === 'hero-hit')).toEqual([]);
    const { health, maxHealth } = playingView(game).hero;
    expect(health).toBe(maxHealth);
  });

  it('starts the hero with a sword and armor equipped', () => {
    const { gear } = inventoryOf(newShippedGame());

    expect(gear.filter((piece) => piece.equipped).map((piece) => piece.slot)).toEqual(['melee-weapon', 'armor']);
  });

  it('has a chest with a better sword and a chest with better armor within a short walk of the start', () => {
    const game = newShippedGame();
    const before = inventoryOf(game);

    // Straight up from the start to the one chest, then straight down past the start to the other.
    const events = [
      ...walk(game, 'up', 60),
      ...game.send({ type: 'interact' }),
      ...walk(game, 'down', 120),
      ...game.send({ type: 'interact' }),
    ];

    expect(events.filter((event) => event.type === 'chest-opened')).toHaveLength(2);
    const found = inventoryOf(game).gear.filter((piece) => !piece.equipped);
    expect(found.map((piece) => piece.slot).sort()).toEqual(['armor', 'melee-weapon']);
    game.send(OPEN_INVENTORY);
    for (const piece of found) {
      game.send({ type: 'equip', gearId: piece.id });
    }
    game.send(CLOSE_INVENTORY);
    const after = inventoryOf(game);
    expect(after.attack).toBeGreaterThan(before.attack);
    expect(after.defense).toBeGreaterThan(before.defense);
  });

  it('starts the hero without a bow and without Ammunition: it has to find both', () => {
    const inventory = inventoryOf(newShippedGame());

    expect(inventory.gear.filter((piece) => piece.slot === 'ranged-weapon')).toEqual([]);
    expect(inventory.consumables).toEqual({ ammunition: 0, 'healing-potion': 0 });
  });

  it('has a chest with a bow and a cache of Ammunition within a short walk of the start, and the bow shoots', () => {
    const game = newShippedGame();

    // Two tiles right of the start, then straight up to the one, and straight down past the start to the other.
    const events = [
      ...walk(game, 'right', 24),
      ...walk(game, 'up', 60),
      ...game.send({ type: 'interact' }),
      ...walk(game, 'down', 120),
      ...game.send({ type: 'interact' }),
    ];

    expect(events.filter((event) => event.type === 'chest-opened')).toHaveLength(2);
    const found = inventoryOf(game);
    const bow = found.gear.find((piece) => piece.slot === 'ranged-weapon');
    expect(bow, 'the chest holds a bow').toBeDefined();
    expect(found.consumables.ammunition, 'the cache holds Ammunition').toBeGreaterThan(0);
    game.send(OPEN_INVENTORY);
    game.send({ type: 'equip', gearId: bow?.id ?? '' });
    game.send(CLOSE_INVENTORY);
    game.send({ type: 'switch-weapon' });
    expect(game.send({ type: 'attack' })).toMatchObject([{ type: 'hero-shot' }]);
    expect(playingView(game).hero.consumables.ammunition).toBe(found.consumables.ammunition - 1);
  });

  it('lets some monster leave Ammunition now and then: a chance above 0 and below 1', () => {
    const chances = Object.values(gameContent.monsterTypes)
      .flatMap((type) => type.drops ?? [])
      .filter((drop) => drop.consumable === 'ammunition')
      .map((drop) => drop.chance);

    expect(chances.length).toBeGreaterThan(0);
    expect(chances.every((chance) => chance > 0 && chance < 1)).toBe(true);
  });

  it('starts the hero without Healing Potions, with a chest of them and a potion on the ground near the start', () => {
    const game = newShippedGame();
    expect(inventoryOf(game).consumables['healing-potion']).toBe(0);

    // Two tiles left of the start, then straight up to the chest, and straight down past the start over the potion.
    const events = [
      ...walk(game, 'left', 24),
      ...walk(game, 'up', 60),
      ...game.send({ type: 'interact' }),
      ...walk(game, 'down', 120),
    ];

    expect(events.filter((event) => event.type === 'chest-opened')).toHaveLength(1);
    const potionPickups = events.flatMap((event) =>
      event.type === 'pickup' && event.item.kind === 'consumable' && event.item.id === 'healing-potion'
        ? [event.item.amount]
        : [],
    );
    expect(potionPickups, 'the chest and the potion on the ground').toHaveLength(2);
    const total = potionPickups.reduce((sum, amount) => sum + amount, 0);
    expect(inventoryOf(game).consumables['healing-potion']).toBe(total);
  });

  it('lets some monster leave a Healing Potion now and then: a chance above 0 and below 1', () => {
    const chances = Object.values(gameContent.monsterTypes)
      .flatMap((type) => type.drops ?? [])
      .filter((drop) => drop.consumable === 'healing-potion')
      .map((drop) => drop.chance);

    expect(chances.length).toBeGreaterThan(0);
    expect(chances.every((chance) => chance > 0 && chance < 1)).toBe(true);
  });
});

describe('the Automap of the content the game ships with', () => {
  const { area: startAreaId, tile: startTile } = gameContent.start;
  const wayOut = definitionOf(startAreaId).exits ?? [];
  const wayOutIds = wayOut.map(({ id }) => id);

  /** Walks straight right from the start, through the gap in the rock wall, towards the way out of the first area. */
  function walkRightWhile(game: Game, keepGoing: () => boolean): void {
    for (let step = 0; step < 600 && keepGoing(); step += 1) {
      walk(game, 'right', 1);
    }
  }

  function exitIdsOnMap(game: Game, areaId: string): string[] {
    return areaOnMap(automapOf(game), areaId).exits.map(({ id }) => id);
  }

  it('starts with what is around the hero only: the route from where the adventure begins, no exit found', () => {
    const page = automapOf(newShippedGame());

    expect(page.areas[0]?.id, 'the route begins where the adventure does').toBe(startAreaId);
    const start = areaOnMap(page, startAreaId);
    expect(start.current).toBe(true);
    const around = [startTile.row - 1, startTile.row, startTile.row + 1].flatMap((row) =>
      [startTile.col - 1, startTile.col, startTile.col + 1].map((col) => start.terrain[row]?.[col]),
    );
    expect(around.every((kind) => typeof kind === 'string'), 'the hero sees the tiles right around it').toBe(true);
    expect(start.terrain.flat(), 'and not all of the area').toContain(null);
    const others = page.areas.filter((area) => area.id !== startAreaId);
    expect(others, 'the route goes on').not.toEqual([]);
    expect(others.every((area) => !area.discovered && area.name === null)).toBe(true);
    expect(page.areas.flatMap((area) => area.exits), 'no way out is found yet').toEqual([]);
  });

  it('marks the way out of the first area before the hero reaches it', () => {
    const game = newShippedGame();
    const inFirstArea = () => playingView(game).area.id === startAreaId;
    const wayOutFound = () => exitIdsOnMap(game, startAreaId).length > 0;

    walkRightWhile(game, () => inFirstArea() && !wayOutFound());

    expect(inFirstArea(), 'the hero has not crossed yet').toBe(true);
    expect(exitIdsOnMap(game, startAreaId)).toEqual(wayOutIds);
  });

  it('shows the next area, with the hero in it, once the hero crosses into it, and keeps the first', () => {
    const game = newShippedGame();
    const nextAreaId = wayOut[0]?.to.area ?? '';

    walkRightWhile(game, () => playingView(game).area.id === startAreaId);

    expect(playingView(game).area.id, 'the hero has crossed').toBe(nextAreaId);
    const page = automapOf(game);
    const first = areaOnMap(page, startAreaId);
    expect(first).toMatchObject({ discovered: true, current: false, hero: null });
    const next = areaOnMap(page, nextAreaId);
    expect(next).toMatchObject({ discovered: true, current: true, name: definitionOf(nextAreaId).name });
    expect(next.hero).toEqual(playingView(game).hero.position);
    expect(next.connections).toEqual([startAreaId]);
  });
});
