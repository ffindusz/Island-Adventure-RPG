import { describe, expect, it } from 'vitest';
import type { DropDefinition, Game, InteractableDefinition, StationaryMonsterDefinition } from '../src/core';
import { arena, cacheAt, frailMonster, newGame, playingView, scriptedRandom, strike } from './fixtures';

// Healing Potions are a consumable, carried as a count like Ammunition: none to begin with, and found in a chest, as a
// loose pickup the hero walks over, or as the occasional monster drop. The hero uses them from the inventory page.
//
// The hero stands at (3.5, 3.5) facing down, with 10 Health. What stands on the tile (3, 4), right below it, is in
// reach: a chest opens with Interact, and a monster there is defeated by a strike.

const INTERACT = { type: 'interact' } as const;

function potionsOf(game: Game): number {
  return playingView(game).hero.consumables['healing-potion'];
}

/** What the hero is told when it takes this many Healing Potions. */
function potionsPickedUp(amount: number) {
  return { type: 'pickup', item: { kind: 'consumable', id: 'healing-potion', amount } } as const;
}

/** A chest on the tile (col, row) that holds some Healing Potions. */
function potionChestAt(id: string, col: number, row: number, amount: number): InteractableDefinition {
  return cacheAt(id, col, row, amount, 'healing-potion');
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

  it('are left by a monster when the roll is below the chance of its drop: the hero takes them after the Experience', () => {
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
});
