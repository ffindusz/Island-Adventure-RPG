import { describe, expect, it } from 'vitest';
import type { StatId } from '../src/core';
import { advance, arena, biterAt, newGame, playingView, prizes, strike } from './fixtures';

const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;
const CLOSE_INVENTORY = { type: 'close-page', page: 'inventory' } as const;
const OPEN_STATS = { type: 'open-page', page: 'stats' } as const;

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
    game.send(OPEN_STATS);

    game.send(OPEN_INVENTORY);

    expect(playingView(game).page).toMatchObject({ id: 'stats' });
  });
});

describe('Attack and Defense with Gear', () => {
  const wellEquipped = { startingGear: { 'melee-weapon': 'iron-sword', armor: 'leather-armor' } } as const;

  it('are the base numbers plus the bonuses of the equipped Gear, as the stat page shows them', () => {
    const game = newGame(arena({ hero: wellEquipped }));

    game.send(OPEN_STATS);

    expect(playingView(game).page).toMatchObject({ attack: 3, defense: 2 });
  });

  it('are shown on the inventory page too, to see what the Gear makes of them', () => {
    const game = newGame(arena({ hero: wellEquipped }));

    game.send(OPEN_INVENTORY);

    expect(playingView(game).page).toMatchObject({ id: 'inventory', attack: 3, defense: 2 });
  });

  it.each<{ stat: StatId; attack: number; defense: number }>([
    { stat: 'attack', attack: 5, defense: 2 },
    { stat: 'defense', attack: 3, defense: 3 },
  ])('add to what a Stat Point in $stat gives: base plus Stat Points plus Gear', ({ stat, attack, defense }) => {
    const { monsters, monsterTypes } = prizes(10);
    const game = newGame(arena({ monsters, monsterTypes, hero: wellEquipped }));
    game.send({ type: 'attack' });
    game.send({ type: 'assign-stat-point', stat });

    game.send(OPEN_STATS);

    expect(playingView(game).page).toMatchObject({ attack, defense });
  });

  it('decide the damage of a strike: Attack is the damage, the weapon included', () => {
    const sturdy = { behavior: 'stationary', health: 10, size: 0.5, experience: 0 } as const;
    const game = newGame(
      arena({
        monsters: [{ id: 'post', type: 'sturdy', tile: { col: 3, row: 4 } }],
        monsterTypes: { sturdy },
        hero: { startingGear: { 'melee-weapon': 'steel-sword' } },
      }),
    );

    const first = strike(game);
    const second = strike(game);

    expect(first).toContainEqual({ type: 'monster-hit', monsterId: 'post', damage: 6, health: 4 });
    expect(second).toContainEqual({ type: 'monster-hit', monsterId: 'post', damage: 6, health: 0 });
  });

  it('decide the damage of a hit the hero takes: the damage less the Defense, the armor included', () => {
    const game = newGame(
      arena({ monsters: [biterAt('biter', 4, 3)], hero: { startingGear: { armor: 'plate-armor' } } }),
    );

    const events = advance(game, 31);

    expect(events).toContainEqual({ type: 'hero-hit', monsterId: 'biter', damage: 1, health: 9 });
  });

  it('cannot make a hit harmless: armor leaves the damage at the minimum at least', () => {
    const game = newGame(
      arena({
        monsters: [biterAt('biter', 4, 3)],
        hero: { defense: 3, startingGear: { armor: 'plate-armor' } },
      }),
    );

    const events = advance(game, 31);

    expect(events).toContainEqual({ type: 'hero-hit', monsterId: 'biter', damage: 1, health: 9 });
  });
});
