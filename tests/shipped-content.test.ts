import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { STEPS_PER_SECOND, createGame } from '../src/core';
import type { Direction, Game, GameEvent, InventoryPageView } from '../src/core';
import { fixedRandom, playingView, walk } from './fixtures';

// Only what must hold for any content the game ships with. The tests of the rules use purpose-built content
// (fixtures.ts), so that changing what ships never breaks them.

const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;
const CLOSE_INVENTORY = { type: 'close-page', page: 'inventory' } as const;

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
});
