import { describe, expect, it } from 'vitest';
import { arena, chestAt, newGame, playingView } from './fixtures';

// The hero stands at (3.5, 3.5) and faces down, its body 0.5 tiles wide, and it interacts with what is within 0.5 tile
// of its body in front of it. A chest fills the tile it stands on.

const INTERACT = { type: 'interact' } as const;
const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;

const STEEL_SWORD_PICKED_UP = {
  type: 'pickup',
  item: { kind: 'gear', id: 'steel-sword', name: 'Steel Sword', slot: 'melee-weapon', stat: 'attack', bonus: 5 },
} as const;

/** A game where the hero stands above a chest, on the tile (3, 4), that holds the steel sword. The hero faces it. */
function gameWithChestBelow() {
  return newGame(arena({ interactables: [chestAt('chest-1', 3, 4, 'steel-sword')] }));
}

function carriedIds(game: ReturnType<typeof newGame>): string[] {
  game.send(OPEN_INVENTORY);
  const { page } = playingView(game);
  game.send({ type: 'close-page', page: 'inventory' });
  return page?.id === 'inventory' ? page.gear.map((gear) => gear.id) : [];
}

describe('opening a chest', () => {
  it('is done with Interact when the hero faces the chest within reach: it opens and its Gear is picked up', () => {
    const game = gameWithChestBelow();

    expect(game.send(INTERACT)).toEqual([{ type: 'chest-opened', chestId: 'chest-1' }, STEEL_SWORD_PICKED_UP]);
  });

  it('shows the chest closed until it is opened', () => {
    const game = gameWithChestBelow();
    const chest = { kind: 'chest', id: 'chest-1', position: { x: 3.5, y: 4.5 }, size: 1 };

    expect(playingView(game).interactables).toEqual([{ ...chest, opened: false }]);

    game.send(INTERACT);

    expect(playingView(game).interactables).toEqual([{ ...chest, opened: true }]);
  });

  it('puts its Gear in the inventory without equipping it: Attack stays as it was', () => {
    const game = gameWithChestBelow();

    game.send(INTERACT);
    game.send(OPEN_INVENTORY);

    expect(playingView(game).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: true },
        { id: 'steel-sword', name: 'Steel Sword', slot: 'melee-weapon', stat: 'attack', bonus: 5, equipped: false },
        { id: 'basic-armor', equipped: true },
      ],
      attack: 1,
    });
  });

  it('is done once: an opened chest stays opened and gives nothing more', () => {
    const game = gameWithChestBelow();
    game.send(INTERACT);

    expect(game.send(INTERACT)).toEqual([]);

    expect(carriedIds(game)).toEqual(['basic-sword', 'steel-sword', 'basic-armor']);
  });
});
