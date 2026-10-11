import { describe, expect, it } from 'vitest';
import type { InteractableDefinition } from '../src/core';
import {
  INTERACT,
  OPEN_INVENTORY,
  advance,
  arena,
  cacheAt,
  chestAt,
  chestViews,
  continuedFrom,
  expectAccepted,
  expectRefused,
  face,
  newGame,
  playingView,
} from './fixtures';

// The hero stands at (3.5, 3.5) facing down. A cache is a chest that holds Ammunition, opened like any chest: here the
// one on the tile (3, 4) is in reach below the hero, and the one on the tile (4, 3) is in reach when it faces right.

const SIX_ARROWS_PICKED_UP = { type: 'pickup', item: { kind: 'consumable', id: 'ammunition', amount: 6 } } as const;

function gameWithCacheBelow() {
  return newGame(arena({ interactables: [cacheAt('cache-1', 3, 4, 6)] }));
}

describe('Ammunition', () => {
  it('is none to begin with: the hero has to find it', () => {
    expect(playingView(newGame()).hero.consumables).toMatchObject({ ammunition: 0 });
  });

  it('is found in a cache, which opens like a chest: the hero takes all the Ammunition inside', () => {
    const game = gameWithCacheBelow();

    expect(game.send(INTERACT)).toEqual([{ type: 'chest-opened', chestId: 'cache-1' }, SIX_ARROWS_PICKED_UP]);

    expect(playingView(game).hero.consumables).toMatchObject({ ammunition: 6 });
  });

  it('is granted once: an opened cache is empty, so opening it again gives nothing', () => {
    const game = gameWithCacheBelow();
    game.send(INTERACT);

    expect(game.send(INTERACT)).toEqual([]);

    expect(playingView(game).hero.consumables).toMatchObject({ ammunition: 6 });
  });

  it('is one count for all caches: each cache adds what it holds to what the hero has', () => {
    const game = newGame(arena({ interactables: [cacheAt('cache-1', 3, 4, 6), cacheAt('cache-2', 4, 3, 5)] }));
    game.send(INTERACT);
    face(game, 'right');

    expect(game.send(INTERACT)).toEqual([
      { type: 'chest-opened', chestId: 'cache-2' },
      { type: 'pickup', item: { kind: 'consumable', id: 'ammunition', amount: 5 } },
    ]);

    expect(playingView(game).hero.consumables).toMatchObject({ ammunition: 11 });
  });

  it('is told apart from Gear in the view: a cache shows that it holds Ammunition, a chest that it holds Gear', () => {
    const game = newGame(
      arena({ interactables: [cacheAt('cache-1', 3, 4, 6), chestAt('chest-1', 4, 3, 'iron-sword')] }),
    );
    const holds = () => chestViews(game).map((item) => [item.id, item.holds]);

    expect(holds()).toEqual([
      ['cache-1', 'ammunition'],
      ['chest-1', 'gear'],
    ]);

    game.send(INTERACT);

    expect(holds(), 'it is still marked once it is open').toEqual([
      ['cache-1', 'ammunition'],
      ['chest-1', 'gear'],
    ]);
  });

  it('is counted on the inventory page, beside the Gear', () => {
    const game = gameWithCacheBelow();
    game.send(INTERACT);

    game.send(OPEN_INVENTORY);

    expect(playingView(game).page).toMatchObject({
      id: 'inventory',
      gear: [{ id: 'basic-sword' }, { id: 'basic-armor' }],
      consumables: { ammunition: 6 },
    });
  });

  it('is part of a saved game, and so is the cache that was opened', () => {
    const content = arena({ interactables: [cacheAt('cache-1', 3, 4, 6)] });
    const game = newGame(content);
    game.send(INTERACT);

    const restored = continuedFrom(content, game.snapshot());

    expect(playingView(restored).hero.consumables).toMatchObject({ ammunition: 6 });
    expect(restored.send(INTERACT), 'the cache stays empty').toEqual([]);
    expect(playingView(restored).hero.consumables).toMatchObject({ ammunition: 6 });
  });

  it('is not given by time passing: the hero has only what it picked up', () => {
    const game = gameWithCacheBelow();

    advance(game, 200);

    expect(playingView(game).hero.consumables).toMatchObject({ ammunition: 0 });
  });
});

describe('a cache that does not make sense is refused when the game is created', () => {
  // Content read from a file could say these, and the compiler would not notice.
  const cacheHolding = (contents: object) =>
    ({ kind: 'chest', id: 'cache-1', tile: { col: 1, row: 1 }, contents })     as unknown as InteractableDefinition;

      it.each([
    {
      what: 'a cache that holds a consumable that does not exist',
      contents: { kind: 'consumable', consumable: 'gold', amount: 3 },
      message: 'Area "arena": chest "cache-1" holds unknown consumable "gold"',
    },
    {
      what: 'a cache that holds no Ammunition',
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 0 },
      message: 'Area "arena": chest "cache-1": amount must be a whole number of 1 or more, but it is 0',
    },
    {
      what: 'a cache that holds a negative amount',
      contents: { kind: 'consumable', consumable: 'ammunition', amount: -2 },
      message: 'Area "arena": chest "cache-1": amount must be a whole number of 1 or more, but it is -2',
    },
    {
      what: 'a cache that holds a fraction of an arrow',
      contents: { kind: 'consumable', consumable: 'ammunition', amount: 2.5 },
      message: 'Area "arena": chest "cache-1": amount must be a whole number of 1 or more, but it is 2.5',
    },
  ])('$what', ({ contents, message }) => {
    expectRefused(arena({ interactables: [cacheHolding(contents)] }), message);
  });

  it('caches that hold the same consumable are accepted: unlike Gear, there can be many', () => {
    const content = arena({ interactables: [cacheAt('cache-1', 1, 1, 6), cacheAt('cache-2', 5, 1, 6)] });

    expectAccepted(content);
  });
});
