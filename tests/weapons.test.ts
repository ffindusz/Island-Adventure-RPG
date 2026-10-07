import { describe, expect, it } from 'vitest';
import type { MonsterTypeDefinition } from '../src/core';
import {
  COOLDOWN_STEPS,
  WITH_BOW,
  advance,
  arena,
  biterAt,
  chestAt,
  dummyAt,
  gameAtTitle,
  milestone,
  newGame,
  playingView,
  strike,
  throughStorage,
} from './fixtures';

// The hero stands at (3.5, 3.5) facing down in the arena, where a chest on the tile (3, 4) is in its reach.

const INTERACT = { type: 'interact' } as const;
const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;
const OPEN_STATS = { type: 'open-page', page: 'stats' } as const;
const SWITCH = { type: 'switch-weapon' } as const;

const SHORT_BOW_PICKED_UP = {
  type: 'pickup',
  item: { kind: 'gear', id: 'short-bow', name: 'Short Bow', slot: 'ranged-weapon', stat: 'attack', bonus: 2 },
} as const;

/** A monster that takes several strikes to bring down, so that the damage of each shows. */
const POST: MonsterTypeDefinition = { behavior: 'stationary', health: 10, size: 0.5, experience: 0 };

describe('the bow', () => {
  it('is Gear that a chest holds, for the Ranged Weapon slot: the hero takes it and carries it unequipped', () => {
    const game = newGame(arena({ interactables: [chestAt('bow-chest', 3, 4, 'short-bow')] }));

    expect(game.send(INTERACT)).toEqual([{ type: 'chest-opened', chestId: 'bow-chest' }, SHORT_BOW_PICKED_UP]);

    game.send(OPEN_INVENTORY);
    expect(playingView(game).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: true },
        { id: 'short-bow', name: 'Short Bow', slot: 'ranged-weapon', stat: 'attack', bonus: 2, equipped: false },
        { id: 'basic-armor', equipped: true },
      ],
    });
  });

  it('is equipped in its own slot, beside the sword and the armor: nothing there is put away', () => {
    const game = newGame(arena({ interactables: [chestAt('bow-chest', 3, 4, 'short-bow')] }));
    game.send(INTERACT);
    game.send(OPEN_INVENTORY);

    expect(game.send({ type: 'equip', gearId: 'short-bow' })).toEqual([
      { type: 'gear-equipped', gearId: 'short-bow', slot: 'ranged-weapon' },
    ]);

    expect(playingView(game).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: true },
        { id: 'short-bow', equipped: true },
        { id: 'basic-armor', equipped: true },
      ],
    });
  });

  it('can be what the hero starts with', () => {
    const game = newGame(arena({ hero: { startingGear: WITH_BOW } }));

    game.send(OPEN_INVENTORY);

    expect(playingView(game).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: true },
        { id: 'short-bow', equipped: true },
        { id: 'basic-armor', equipped: true },
      ],
    });
  });
});

describe('Attack with a sword and a bow', () => {
  const steelSwordAndBow = { 'melee-weapon': 'steel-sword', 'ranged-weapon': 'short-bow' } as const;

  it('does not count the bow in a strike: the bonus of the bow is for arrows, a strike has only that of the sword', () => {
    const game = newGame(
      arena({
        monsters: [{ id: 'post', type: 'sturdy', tile: { col: 3, row: 4 } }],
        monsterTypes: { sturdy: POST },
        hero: { startingGear: steelSwordAndBow },
      }),
    );

    expect(strike(game)).toContainEqual({ type: 'monster-hit', monsterId: 'post', damage: 6, health: 4 });
  });

  it('is shown on the stat page and the inventory page as that of the sword while the sword is in hand', () => {
    const game = newGame(arena({ hero: { startingGear: steelSwordAndBow } }));

    game.send(OPEN_STATS);
    expect(playingView(game).page).toMatchObject({ id: 'stats', attack: 6 });
    game.send({ type: 'close-page', page: 'stats' });

    game.send(OPEN_INVENTORY);
    expect(playingView(game).page).toMatchObject({ id: 'inventory', attack: 6 });
  });
});

describe('the weapon in hand', () => {
  const steelSwordAndBow = { 'melee-weapon': 'steel-sword', 'ranged-weapon': 'short-bow' } as const;

  function gameWithBow() {
    return newGame(arena({ hero: { startingGear: WITH_BOW } }));
  }

  it('is the sword when a game begins', () => {
    expect(playingView(gameWithBow()).hero.activeWeapon).toBe('melee-weapon');
  });

  it('is switched from the sword to the bow and back with the switch command', () => {
    const game = gameWithBow();

    expect(game.send(SWITCH)).toEqual([{ type: 'weapon-switched', weapon: 'ranged-weapon' }]);
    expect(playingView(game).hero.activeWeapon).toBe('ranged-weapon');

    expect(game.send(SWITCH)).toEqual([{ type: 'weapon-switched', weapon: 'melee-weapon' }]);
    expect(playingView(game).hero.activeWeapon).toBe('melee-weapon');
  });

  it('stays the sword while the hero has no bow equipped: there is nothing to switch to', () => {
    const game = newGame(arena({ interactables: [chestAt('bow-chest', 3, 4, 'short-bow')] }));
    expect(game.send(SWITCH), 'no bow at all').toEqual([]);

    game.send(INTERACT);
    expect(game.send(SWITCH), 'a bow that is carried, not equipped').toEqual([]);
    expect(playingView(game).hero.activeWeapon).toBe('melee-weapon');
  });

  it('is not changed by equipping a bow: the hero puts it in hand when it chooses to', () => {
    const game = newGame(arena({ interactables: [chestAt('bow-chest', 3, 4, 'short-bow')] }));
    game.send(INTERACT);
    game.send(OPEN_INVENTORY);
    game.send({ type: 'equip', gearId: 'short-bow' });
    game.send({ type: 'close-page', page: 'inventory' });

    expect(playingView(game).hero.activeWeapon).toBe('melee-weapon');
    expect(game.send(SWITCH)).toEqual([{ type: 'weapon-switched', weapon: 'ranged-weapon' }]);
  });

  it.each(['stats', 'inventory'] as const)('is not switched while the %s page is open', (page) => {
    const game = gameWithBow();
    game.send({ type: 'open-page', page });

    expect(game.send(SWITCH)).toEqual([]);
    expect(playingView(game).hero.activeWeapon).toBe('melee-weapon');

    game.send({ type: 'close-page', page });
    expect(game.send(SWITCH)).toEqual([{ type: 'weapon-switched', weapon: 'ranged-weapon' }]);
  });

  it('is not switched while a Stat Point waits to be assigned', () => {
    const game = newGame(
      arena({
        hero: { startingGear: WITH_BOW },
        milestones: [milestone('start', { col: 3, row: 3, width: 1, height: 1 }, 10)],
      }),
    );
    advance(game, 1);
    expect(playingView(game).levelUp).not.toBeNull();

    expect(game.send(SWITCH)).toEqual([]);

    game.send({ type: 'assign-stat-point', stat: 'defense' });
    expect(game.send(SWITCH)).toEqual([{ type: 'weapon-switched', weapon: 'ranged-weapon' }]);
  });

  it('is not switched at the title', () => {
    expect(gameAtTitle(arena({ hero: { startingGear: WITH_BOW } })).send(SWITCH)).toEqual([]);
  });

  it('is switched at once: switching starts no attack cooldown and does not wait for the one that runs', () => {
    const game = newGame(arena({ monsters: [dummyAt('dummy-1', 3, 4)], hero: { startingGear: WITH_BOW } }));
    game.send(SWITCH);
    game.send(SWITCH);
    expect(game.send({ type: 'attack' }), 'no cooldown was started').toHaveLength(2);

    advance(game, 10);
    expect(game.send(SWITCH), 'switched during the cooldown').toHaveLength(1);
    game.send(SWITCH);
    advance(game, COOLDOWN_STEPS - 11);
    expect(game.send({ type: 'attack' }), 'one step short of the cooldown').toEqual([]);
    advance(game, 1);
    expect(game.send({ type: 'attack' }), 'the cooldown was not reset').toHaveLength(2);
  });

  it('is the Attack shown on the pages: with the bow in hand, the Attack of the bow', () => {
    const game = newGame(arena({ hero: { startingGear: steelSwordAndBow } }));
    game.send(SWITCH);

    game.send(OPEN_STATS);
    expect(playingView(game).page).toMatchObject({ id: 'stats', attack: 3 });
    game.send({ type: 'close-page', page: 'stats' });

    game.send(OPEN_INVENTORY);
    expect(playingView(game).page).toMatchObject({ id: 'inventory', attack: 3 });
  });

  it('is the Attack that a Stat Point in Attack is offered against', () => {
    const game = newGame(
      arena({
        hero: { startingGear: steelSwordAndBow },
        milestones: [milestone('start', { col: 3, row: 3, width: 1, height: 1 }, 10)],
      }),
    );
    game.send(SWITCH);
    advance(game, 1);

    expect(playingView(game).levelUp?.options).toContainEqual({ stat: 'attack', value: 3, gain: 2 });
  });

  it('is part of a saved game', () => {
    const content = arena({ hero: { startingGear: WITH_BOW } });
    const game = newGame(content);
    game.send(SWITCH);

    const restored = gameAtTitle(content);
    restored.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(playingView(restored).hero.activeWeapon).toBe('ranged-weapon');
    expect(restored.send(SWITCH)).toEqual([{ type: 'weapon-switched', weapon: 'melee-weapon' }]);
  });

  it('is still in hand after the hero is defeated: defeat changes nothing about it', () => {
    const doomed = arena({ hero: { health: 5, startingGear: WITH_BOW }, monsters: [biterAt('biter', 4, 3)] });
    const game = newGame(doomed);
    game.send(SWITCH);

    expect(advance(game, 31).map((event) => event.type)).toContain('hero-defeated');

    expect(playingView(game).hero.activeWeapon).toBe('ranged-weapon');
  });
});
