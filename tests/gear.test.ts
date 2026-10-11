import { describe, expect, it } from 'vitest';
import type { StatId } from '../src/core';
import {
  CLOSE_INVENTORY,
  COOLDOWN_STEPS,
  FIELD_LAYOUT,
  INTERACT,
  OPEN_INVENTORY,
  OPEN_STATS,
  STEPS_PER_TILE,
  advance,
  arena,
  biterAt,
  chestAt,
  face,
  gameAtTitle,
  newGame,
  playingView,
  prizes,
  strike,
  walk,
} from './fixtures';

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

describe('equipping Gear', () => {
  const EQUIP_STEEL_SWORD = { type: 'equip', gearId: 'steel-sword' } as const;
  const STEEL_SWORD_EQUIPPED = { type: 'gear-equipped', gearId: 'steel-sword', slot: 'melee-weapon' } as const;

  /** A game where the hero has found the steel sword and the plate armor, in chests below and above it. Not equipped. */
  function gameWithFoundGear() {
    const game = newGame(
      arena({
        interactables: [chestAt('sword-chest', 3, 4, 'steel-sword'), chestAt('armor-chest', 3, 2, 'plate-armor')],
      }),
    );
    game.send(INTERACT);
    face(game, 'up');
    game.send(INTERACT);
    return game;
  }

  function gameWithInventoryOpen() {
    const game = gameWithFoundGear();
    game.send(OPEN_INVENTORY);
    return game;
  }

  it('puts a carried piece in its slot in place of the one there: the page shows it and Attack follows', () => {
    const game = gameWithInventoryOpen();

    expect(game.send(EQUIP_STEEL_SWORD)).toEqual([STEEL_SWORD_EQUIPPED]);

    expect(playingView(game).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: false },
        { id: 'steel-sword', equipped: true },
        { id: 'basic-armor', equipped: true },
        { id: 'plate-armor', equipped: false },
      ],
      attack: 6,
      defense: 0,
    });
  });

  it('can be swapped back: the old piece is still carried, and Attack is what it was', () => {
    const game = gameWithInventoryOpen();
    game.send(EQUIP_STEEL_SWORD);

    expect(game.send({ type: 'equip', gearId: 'basic-sword' })).toEqual([
      { type: 'gear-equipped', gearId: 'basic-sword', slot: 'melee-weapon' },
    ]);

    expect(playingView(game).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: true },
        { id: 'steel-sword', equipped: false },
        { id: 'basic-armor', equipped: true },
        { id: 'plate-armor', equipped: false },
      ],
      attack: 1,
    });
  });

  it('keeps one piece in each slot: armor is equipped beside the sword, and raises Defense only', () => {
    const game = gameWithInventoryOpen();
    game.send(EQUIP_STEEL_SWORD);

    expect(game.send({ type: 'equip', gearId: 'plate-armor' })).toEqual([
      { type: 'gear-equipped', gearId: 'plate-armor', slot: 'armor' },
    ]);

    expect(playingView(game).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: false },
        { id: 'steel-sword', equipped: true },
        { id: 'basic-armor', equipped: false },
        { id: 'plate-armor', equipped: true },
      ],
      attack: 6,
      defense: 4,
    });
  });

  it('is done only while the inventory page is open', () => {
    const game = gameWithFoundGear();
    expect(game.send(EQUIP_STEEL_SWORD), 'no page is open').toEqual([]);

    game.send(OPEN_STATS);
    expect(game.send(EQUIP_STEEL_SWORD), 'the stat page is open').toEqual([]);
    game.send({ type: 'close-page', page: 'stats' });

    game.send(OPEN_INVENTORY);
    expect(playingView(game).page).toMatchObject({ attack: 1, defense: 0 });
  });

  it('does nothing for a piece that is not carried, that is already equipped or that does not exist', () => {
    const game = gameWithInventoryOpen();
    const before = game.snapshot();

    expect(game.send({ type: 'equip', gearId: 'iron-sword' }), 'not carried').toEqual([]);
    expect(game.send({ type: 'equip', gearId: 'basic-sword' }), 'equipped already').toEqual([]);
    expect(game.send({ type: 'equip', gearId: 'no-such-gear' }), 'unknown').toEqual([]);

    expect(game.snapshot()).toEqual(before);
  });

  it('does nothing at the title', () => {
    expect(gameAtTitle().send(EQUIP_STEEL_SWORD)).toEqual([]);
  });

  it('changes nothing but the stat of its slot: Health, the strike and the attack cooldown stay as they were', () => {
    const game = gameWithInventoryOpen();
    game.send(EQUIP_STEEL_SWORD);
    game.send({ type: 'equip', gearId: 'plate-armor' });
    expect(playingView(game).page).toMatchObject({ attack: 6, defense: 4 });
    game.send(CLOSE_INVENTORY);

    expect(playingView(game).hero).toMatchObject({ health: 10, maxHealth: 10, facing: 'up' });
    expect(strike(game)).toEqual([
      expect.objectContaining({ type: 'hero-attacked', zone: { minX: 3, minY: 2.25, maxX: 4, maxY: 3.25 } }),
    ]);
    expect(game.send({ type: 'attack' }), 'cooling down').toEqual([]);
    advance(game, COOLDOWN_STEPS - 1);
    expect(game.send({ type: 'attack' }), 'one step short of the cooldown').toEqual([]);
    advance(game, 1);
    expect(game.send({ type: 'attack' })).toHaveLength(1);
  });
});

describe('what the hero can carry', () => {
  it('has no limit: it takes every piece of Gear it finds, however many', () => {
    // Two chests, above and below the hero, in each of the 12 columns of the field it walks along: 24 spare pieces.
    const spare = Array.from({ length: 24 }, (_, index) => `spare-${index + 1}`);
    const gear = Object.fromEntries(spare.map((id) => [id, { name: id, slot: 'armor', bonus: 0 } as const]));
    const interactables = spare.map((id, index) =>
      chestAt(`chest-${index + 1}`, 1 + Math.floor(index / 2), index % 2 === 0 ? 2 : 4, id),
    );
    // The chests fill rows 2 and 4, so the Checkpoint every area needs goes in the corner of row 1.
    const game = newGame(
      arena({
        layout: FIELD_LAYOUT,
        start: { area: 'arena', tile: { col: 1, row: 3 } },
        checkpoints: [{ id: 'corner', tile: { col: 1, row: 1 } }],
        gear,
        interactables,
      }),
    );

    let opened = 0;
    for (let column = 1; column <= 12; column++) {
      if (column > 1) {
        walk(game, 'right', STEPS_PER_TILE);
      }
      for (const side of ['up', 'down'] as const) {
        face(game, side);
        opened += game.send(INTERACT).filter((event) => event.type === 'chest-opened').length;
      }
    }
    game.send(OPEN_INVENTORY);

    const { page } = playingView(game);
    expect(opened).toBe(24);
    expect(page).toMatchObject({ id: 'inventory', attack: 1, defense: 0 });
    expect(page?.id === 'inventory' ? page.gear.map((piece) => piece.id) : []).toEqual([
      'basic-sword',
      'basic-armor',
      ...spare,
    ]);
    expect(game.send({ type: 'equip', gearId: 'spare-24' })).toEqual([
      { type: 'gear-equipped', gearId: 'spare-24', slot: 'armor' },
    ]);
  });
});
