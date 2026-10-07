import { describe, expect, it } from 'vitest';
import type { MonsterTypeDefinition } from '../src/core';
import { WITH_BOW, arena, chestAt, newGame, playingView, strike } from './fixtures';

// The hero stands at (3.5, 3.5) facing down in the arena, where a chest on the tile (3, 4) is in its reach.

const INTERACT = { type: 'interact' } as const;
const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;
const OPEN_STATS = { type: 'open-page', page: 'stats' } as const;

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
