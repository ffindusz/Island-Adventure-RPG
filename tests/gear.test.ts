import { describe, expect, it } from 'vitest';
import { advance, arena, biterAt, newGame, playingView } from './fixtures';

const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;
const CLOSE_INVENTORY = { type: 'close-page', page: 'inventory' } as const;

describe('the Gear the hero begins with', () => {
  it('is a basic sword and basic armor, both equipped, as the inventory page lists them', () => {
    const game = newGame();

    game.send(OPEN_INVENTORY);

    expect(playingView(game).page).toMatchObject({
      id: 'inventory',
      gear: [
        { id: 'basic-sword', name: 'Basic Sword', slot: 'melee-weapon', stat: 'attack', bonus: 0, equipped: true },
        { id: 'basic-armor', name: 'Basic Armor', slot: 'armor', stat: 'defense', bonus: 0, equipped: true },
      ],
    });
  });

  it('is whatever the content gives the hero: none at all leaves the inventory empty', () => {
    const game = newGame(arena({ hero: { startingGear: {} } }));

    game.send(OPEN_INVENTORY);

    expect(playingView(game).page).toMatchObject({ id: 'inventory', gear: [] });
  });
});

describe('the inventory page', () => {
  it('is closed in a new game, opens when asked to and closes when asked to', () => {
    const game = newGame();
    expect(playingView(game).page).toBeNull();

    game.send(OPEN_INVENTORY);
    expect(playingView(game).page).toMatchObject({ id: 'inventory' });

    game.send(CLOSE_INVENTORY);
    expect(playingView(game).page).toBeNull();
  });

  it('pauses the game while it is open: nothing steps, and play resumes where it stopped', () => {
    const game = newGame(arena({ monsters: [biterAt('biter', 4, 3)] }));
    advance(game, 10);
    game.send(OPEN_INVENTORY);
    const before = game.snapshot();

    expect(advance(game, 200)).toEqual([]);
    expect(game.snapshot()).toEqual(before);

    game.send(CLOSE_INVENTORY);
    expect(advance(game, 21).map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit']);
  });

  it('does not open over the stat page: one page is open at a time', () => {
    const game = newGame();
    game.send({ type: 'open-page', page: 'stats' });

    game.send(OPEN_INVENTORY);

    expect(playingView(game).page).toMatchObject({ id: 'stats' });
  });
});
