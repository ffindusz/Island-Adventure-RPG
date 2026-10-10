import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type {
  ContentDefinition,
  DropDefinition,
  Game,
  InteractableDefinition,
  StationaryMonsterDefinition,
} from '../src/core';
import {
  FIELD_LAYOUT,
  advance,
  arena,
  biterAt,
  cacheAt,
  face,
  fixedRandom,
  frailMonster,
  gameAtTitle,
  newGame,
  pickupAt,
  playingView,
  prizes,
  scriptedRandom,
  seededRandom,
  strike,
  throughStorage,
  walk,
} from './fixtures';
import type { ArenaOptions } from './fixtures';

// Healing Potions are a consumable, carried as a count like Ammunition: none to begin with, and found in a chest, as a
// loose pickup the hero walks over, or as the occasional monster drop. The hero uses them from the inventory page.
//
// The hero stands at (3.5, 3.5) facing down, with 10 Health. What stands on the tile (3, 4), right below it, is in
// reach: a chest opens with Interact, and a monster there is defeated by a strike.

const INTERACT = { type: 'interact' } as const;
const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;
const USE = { type: 'use-healing-potion' } as const;

function potionsOf(game: Game): number {
  return playingView(game).hero.consumables['healing-potion'];
}

/** What the hero is told when it takes this many Healing Potions. */
function potionsPickedUp(amount: number) {
  return { type: 'pickup', item: { kind: 'consumable', id: 'healing-potion', amount } } as const;
}

/** What the hero is told when a potion heals it: the Health it got back, and the Health it has now. */
function healed(restored: number, health: number) {
  return { type: 'healing-potion-used', restored, health } as const;
}

/** A chest on the tile (col, row) that holds some Healing Potions. */
function potionChestAt(id: string, col: number, row: number, amount: number): InteractableDefinition {
  return cacheAt(id, col, row, amount, 'healing-potion');
}

/** The arena where a biter stands right of the hero, and a chest below it holds the potions, if there are any. */
function woundedContent(potions: number, options: Pick<ArenaOptions, 'healingPotion'> = {}): ContentDefinition {
  return arena({
    monsters: [biterAt('biter', 4, 3)],
    interactables: potions > 0 ? [potionChestAt('chest-1', 3, 4, potions)] : [],
    ...options,
  });
}

/** A game where the hero took the potions from the chest, then the biter hit it: 5 of its 10 Health are left. */
function woundedGame(potions: number, options: Pick<ArenaOptions, 'healingPotion'> = {}): Game {
  const game = newGame(woundedContent(potions, options));
  if (potions > 0) {
    game.send(INTERACT);
  }
  advance(game, 31);
  expect(playingView(game).hero).toMatchObject({ health: 5, maxHealth: 10 });
  expect(potionsOf(game)).toBe(potions);
  return game;
}

describe('Healing Potions', () => {
  it('are none to begin with: the hero has to find them', () => {
    expect(potionsOf(newGame())).toBe(0);
  });

  it('are found in a chest, which opens like any chest: the hero takes all the potions inside', () => {
    const game = newGame(arena({ interactables: [potionChestAt('chest-1', 3, 4, 2)] }));

    expect(game.send(INTERACT)).toEqual([{ type: 'chest-opened', chestId: 'chest-1' }, potionsPickedUp(2)]);

    expect(potionsOf(game)).toBe(2);
  });

  it('are left by a monster when the roll is below the chance of its drop, after the Experience', () => {
    const potionDrop: DropDefinition = { consumable: 'healing-potion', chance: 0.25, amount: 1 };
    const dropper: StationaryMonsterDefinition = { ...frailMonster(1), drops: [potionDrop] };
    const script = scriptedRandom(0.2);
    const content = arena({
      monsters: [{ id: 'monster', type: 'dropper', tile: { col: 3, row: 4 } }],
      monsterTypes: { dropper },
    });
    const game = newGame(content, script.random);

    expect(strike(game)).toMatchObject([
      { type: 'hero-attacked' },
      { type: 'monster-hit', monsterId: 'monster', damage: 1, health: 0 },
      { type: 'monster-defeated', monsterId: 'monster' },
      { type: 'experience-gained', amount: 1 },
      potionsPickedUp(1),
    ]);

    expect(potionsOf(game)).toBe(1);
  });

  it('are dropped by the random source alone: the same seed leaves the same potions, another seed does not', () => {
    const entry: DropDefinition = { consumable: 'healing-potion', chance: 0.5, amount: 1 };
    const table = Array.from({ length: 12 }, () => entry);
    const dropper: StationaryMonsterDefinition = { ...frailMonster(1), drops: table };
    const run = (seed: number) => {
      const content = arena({
        monsters: [{ id: 'monster', type: 'dropper', tile: { col: 3, row: 4 } }],
        monsterTypes: { dropper },
      });
      const game = newGame(content, seededRandom(seed));
      return { events: strike(game), potions: potionsOf(game) };
    };

    expect(run(1)).toEqual(run(1));
    expect(run(7)).toEqual(run(7));
    expect(run(1)).not.toEqual(run(7));
    expect(run(1).events.filter((event) => event.type === 'pickup')).toHaveLength(run(1).potions);
  });
});

describe('using a Healing Potion', () => {
  it('restores its amount of Health and uses the potion up, one at a time', () => {
    const game = woundedGame(2);
    game.send(OPEN_INVENTORY);

    expect(game.send(USE)).toEqual([healed(3, 8)]);

    expect(playingView(game).hero).toMatchObject({ health: 8, maxHealth: 10 });
    expect(potionsOf(game)).toBe(1);
    expect(playingView(game).page).toMatchObject({ id: 'inventory', consumables: { 'healing-potion': 1 } });
  });

  it('never takes the hero above its maximum Health: only what fits is restored, and the potion is used up', () => {
    const game = woundedGame(2);
    game.send(OPEN_INVENTORY);
    game.send(USE);

    expect(game.send(USE)).toEqual([healed(2, 10)]);

    expect(playingView(game).hero).toMatchObject({ health: 10, maxHealth: 10 });
    expect(potionsOf(game)).toBe(0);
  });

  it.each([
    { restores: 2, restored: 2, health: 7 },
    { restores: 4, restored: 4, health: 9 },
    { restores: 100, restored: 5, health: 10 },
  ])('restores what the content says: $restores takes the hero from 5 Health to $health', (expected) => {
    const game = woundedGame(1, { healingPotion: { restores: expected.restores } });
    game.send(OPEN_INVENTORY);

    expect(game.send(USE)).toEqual([healed(expected.restored, expected.health)]);

    expect(playingView(game).hero.health).toBe(expected.health);
  });

  it('is capped by the maximum Health the hero has now: a Stat Point put into Health raises the cap', () => {
    // Defeating the frail monster below the hero earns Level 2 and a Stat Point, which goes into Health: the maximum
    // is 13 and not the 10 the hero began with. The biter's hit comes first, on step 31, and its next one is far off.
    const { monsters, monsterTypes } = prizes(10);
    const game = newGame(
      arena({
        monsters: [...monsters, biterAt('biter', 4, 3)],
        monsterTypes,
        interactables: [potionChestAt('chest-1', 2, 3, 1)],
        healingPotion: { restores: 7 },
      }),
    );
    face(game, 'left');
    game.send(INTERACT);
    advance(game, 31);
    face(game, 'down');
    strike(game);
    game.send({ type: 'assign-stat-point', stat: 'health' });
    expect(playingView(game).hero).toMatchObject({ health: 8, maxHealth: 13 });
    game.send(OPEN_INVENTORY);

    expect(game.send(USE)).toEqual([healed(5, 13)]);

    expect(playingView(game).hero).toMatchObject({ health: 13, maxHealth: 13 });
  });

  it('is refused at full Health: nothing happens, and the hero keeps the potion', () => {
    const game = newGame(arena({ interactables: [potionChestAt('chest-1', 3, 4, 1)] }));
    game.send(INTERACT);
    game.send(OPEN_INVENTORY);

    expect(game.send(USE)).toEqual([]);

    expect(playingView(game).hero).toMatchObject({ health: 10, maxHealth: 10 });
    expect(potionsOf(game)).toBe(1);
  });

  it('is refused when the hero has none: it stays as hurt as it was', () => {
    const game = woundedGame(0);
    game.send(OPEN_INVENTORY);

    expect(game.send(USE)).toEqual([]);

    expect(playingView(game).hero.health).toBe(5);
    expect(potionsOf(game)).toBe(0);
  });

  const notFromTheInventory: { when: string; prepare: (game: Game) => void }[] = [
    { when: 'no page is open', prepare: () => undefined },
    { when: 'the stat page is open', prepare: (game) => void game.send({ type: 'open-page', page: 'stats' }) },
    { when: 'the Automap page is open', prepare: (game) => void game.send({ type: 'open-page', page: 'automap' }) },
    {
      when: 'the inventory page has been closed',
      prepare: (game) => {
        game.send(OPEN_INVENTORY);
        game.send({ type: 'close-page', page: 'inventory' });
      },
    },
  ];

  it.each(notFromTheInventory)('is refused when $when: it is used from the inventory page only', ({ prepare }) => {
    const game = woundedGame(1);
    prepare(game);

    expect(game.send(USE)).toEqual([]);

    expect(playingView(game).hero.health).toBe(5);
    expect(potionsOf(game)).toBe(1);
  });

  it('is refused at the title, where there is no hero to heal', () => {
    const game = gameAtTitle(woundedContent(1));

    expect(game.send(USE)).toEqual([]);

    expect(game.view().phase).toBe('title');
  });

  it('is never done by itself: a hurt hero keeps its wounds and its potions, however long it waits', () => {
    // The biter hits the hero on step 31. The hero then walks off, over the potions that lie on its way and out of the
    // biter's noticing distance, and waits a whole minute: 3600 steps.
    const game = newGame(
      arena({
        layout: FIELD_LAYOUT,
        start: { area: 'arena', tile: { col: 6, row: 3 } },
        monsters: [biterAt('biter', 7, 3)],
        interactables: [pickupAt('potions', 3, 3, 2)],
      }),
    );
    advance(game, 31);
    expect(playingView(game).hero.health).toBe(5);
    expect(walk(game, 'left', 42)).toEqual([potionsPickedUp(2)]);

    expect(advance(game, 3600)).toEqual([]);

    expect(playingView(game).hero).toMatchObject({ health: 5, maxHealth: 10 });
    expect(potionsOf(game)).toBe(2);
  });

  it('is kept in a saved game: the potions are there when the game continues, and the hero can use them', () => {
    const saved = throughStorage(woundedGame(2).snapshot());
    const game = gameAtTitle(woundedContent(2));
    game.send({ type: 'continue', snapshot: saved });
    expect(potionsOf(game)).toBe(2);
    game.send(OPEN_INVENTORY);

    expect(game.send(USE)).toEqual([healed(3, 8)]);

    expect(potionsOf(game)).toBe(1);
  });
});

describe('a Healing Potion that restores nothing is refused when the game is created', () => {
  it.each([0, -1, Number.NaN])('a potion that restores %s Health', (restores) => {
    const content = arena({ healingPotion: { restores } });

    expect(() => createGame({ content, random: fixedRandom })).toThrow(
      `The Health a Healing Potion restores must be more than 0, but it is ${restores}`,
    );
  });
});
