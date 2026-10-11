import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { STEPS_PER_SECOND, createGame } from '../src/core';
import type {
  AutomapAreaView,
  AutomapPageView,
  Direction,
  Game,
  GameEvent,
  GearSlot,
  InventoryPageView,
} from '../src/core';
import { fixedRandom, playingView, walk } from './fixtures';
import { areaOf } from './main-route';
import { isInZone, openTilesOf, quietGameOf, routeBetween, walkRoute } from './routes';

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

  it('starts the hero without a bow and without Ammunition: it has to find both', () => {
    const inventory = inventoryOf(newShippedGame());

    expect(inventory.gear.filter((piece) => piece.slot === 'ranged-weapon')).toEqual([]);
    expect(inventory.consumables).toEqual({ ammunition: 0, 'healing-potion': 0 });
  });

  it('lets some monster leave Ammunition now and then: a chance above 0 and below 1', () => {
    const chances = Object.values(gameContent.monsterTypes)
      .flatMap((type) => type.drops ?? [])
      .filter((drop) => drop.consumable === 'ammunition')
      .map((drop) => drop.chance);

    expect(chances.length).toBeGreaterThan(0);
    expect(chances.every((chance) => chance > 0 && chance < 1)).toBe(true);
  });

  it('starts the hero without Healing Potions: it has to find them', () => {
    expect(inventoryOf(newShippedGame()).consumables['healing-potion']).toBe(0);
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

/** The lines of the card that a new game begins with, as the core hands them out. */
function openingOf(): readonly string[] {
  const events = createGame({ content: gameContent, random: fixedRandom }).send({ type: 'new-game' });
  for (const event of events) {
    if (event.type === 'opening') {
      return event.lines;
    }
  }
  throw new Error('A new game did not begin with the opening');
}

/** The line of the opening that speaks of home, where the hero is told what to do. */
function goalOf(lines: readonly string[]): string {
  const goal = lines.find((line) => /\bhome\b/i.test(line));
  if (goal === undefined) {
    throw new Error(`No line of the opening speaks of home: ${lines.join(' / ')}`);
  }
  return goal;
}

describe('the opening the game ships with', () => {
  // Story 7: it tells the player why the hero is stranded and what the hero must do.
  it('tells the hero what to do as well as why it is stranded: a line says that there is a way home to find', () => {
    const goal = goalOf(openingOf());

    expect(goal).toMatch(/\bway home\b/i);
    expect(goal).toMatch(/\bfind\b/i);
  });

  it('leaves what the hero has yet to discover to be discovered: the goal names no Guardian, castle, harbor or ship', () => {
    expect(goalOf(openingOf())).not.toMatch(/guardian|castle|harbou?r|ship/i);
  });
});

describe('what the hero can find in the content the game ships with', () => {
  const interactables = gameContent.areas.flatMap((area) => area.interactables ?? []);
  const gearInChests = interactables.flatMap((item) => {
    const gear = item.kind === 'chest' && item.contents.kind === 'gear' ? gameContent.gear[item.contents.gear] : undefined;
    return gear === undefined ? [] : [gear];
  });
  const startingBonusOf = (slot: GearSlot): number => {
    const starting = gameContent.hero.startingGear[slot];
    return starting === undefined ? 0 : (gameContent.gear[starting]?.bonus ?? 0);
  };
  const isFoundIn = (slot: GearSlot) => gearInChests.some((gear) => gear.slot === slot && gear.bonus > startingBonusOf(slot));
  const cachesOf = (consumable: string) =>
    interactables.filter(
      (item) => item.kind === 'chest' && item.contents.kind === 'consumable' && item.contents.consumable === consumable,
    );
  const pickupsOf = (consumable: string) =>
    interactables.filter((item) => item.kind === 'pickup' && item.consumable === consumable);

  it.each(['melee-weapon', 'armor', 'ranged-weapon'] as const)('has better Gear for the %s slot in a chest', (slot) => {
    expect(isFoundIn(slot)).toBe(true);
  });

  it('has Ammunition in a cache for the bow, and Healing Potions in a chest and on the ground', () => {
    expect(cachesOf('ammunition')).not.toEqual([]);
    expect(cachesOf('healing-potion')).not.toEqual([]);
    expect(pickupsOf('healing-potion')).not.toEqual([]);
  });
});

describe('the Automap of the content the game ships with', () => {
  const { area: startAreaId, tile: startTile } = gameContent.start;
  const firstArea = areaOf(startAreaId);
  const wayOut = firstArea.exits ?? [];
  const wayOutIds = wayOut.map(({ id }) => id);
  const routeOut = routeBetween(openTilesOf(gameContent, firstArea), startTile, (tile) =>
    wayOut.some(({ zone }) => isInZone(zone, tile)),
  );

  /** A new game of the shipped content without its monsters, which are not what these tests are about. */
  function newQuietGame() {
    return quietGameOf(gameContent);
  }

  /** Walks from the start along the way to the exit of the first area for as long as `keepGoing` says so. */
  function walkOutWhile(game: Game, keepGoing: () => boolean): void {
    expect(routeOut, 'there is a way from the start to the way out of the first area').not.toBeNull();
    walkRoute(game, routeOut ?? [], keepGoing);
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
    const game = newQuietGame();
    const inFirstArea = () => playingView(game).area.id === startAreaId;
    const wayOutFound = () => exitIdsOnMap(game, startAreaId).length > 0;

    walkOutWhile(game, () => inFirstArea() && !wayOutFound());

    expect(inFirstArea(), 'the hero has not crossed yet').toBe(true);
    expect(exitIdsOnMap(game, startAreaId)).toEqual(wayOutIds);
  });

  it('shows the next area, with the hero in it, once the hero crosses into it, and keeps the first', () => {
    const game = newQuietGame();
    const nextAreaId = wayOut[0]?.to.area ?? '';

    walkOutWhile(game, () => playingView(game).area.id === startAreaId);

    expect(playingView(game).area.id, 'the hero has crossed').toBe(nextAreaId);
    const page = automapOf(game);
    const first = areaOnMap(page, startAreaId);
    expect(first).toMatchObject({ discovered: true, current: false, hero: null });
    const next = areaOnMap(page, nextAreaId);
    expect(next).toMatchObject({ discovered: true, current: true, name: areaOf(nextAreaId).name });
    expect(next.hero).toEqual(playingView(game).hero.position);
    expect(next.connections).toContain(startAreaId);
  });
});
