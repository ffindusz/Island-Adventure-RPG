import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { STEPS_PER_SECOND, createGame } from '../src/core';
import type { Direction, GameEvent } from '../src/core';
import { fixedRandom, playingView, walk } from './fixtures';

// Only what must hold for any content the game ships with. The tests of the rules use purpose-built content
// (fixtures.ts), so that changing what ships never breaks them.

function newShippedGame() {
  const game = createGame({ content: gameContent, random: fixedRandom });
  game.send({ type: 'new-game' });
  return game;
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
});
