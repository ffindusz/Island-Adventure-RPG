import { describe, expect, it } from 'vitest';
import { arena, doorAt, interactableViews, inventoryOf, keyAt, newGame, playingView, walk } from './fixtures';

// A key lies on a tile of an Adventure Area. The hero takes it by walking onto it, with no key to press, and carries it
// until a locked door takes it (see doors.test.ts). A key is one-time loot, not a consumable: it is listed in the
// inventory page by its name, and defeat does not give it back (see device-persistence.test.ts).
//
// The hero stands at (3.5, 3.5) and walks 0.125 tile a step. Walking right, its body (0.5 wide) only touches the tile
// (5, 3) after 10 steps, at x = 4.75, and overlaps it after 11, at x = 4.875. Walking on to the left from there, its
// body touches the tile (1, 3) after 21 steps and overlaps it after 22.
//
// A key that opens no door is refused when the game is created (see device-content.test.ts), so each key here has the
// door it opens, in row 1, out of the hero's way.

const RUSTY_KEY = keyAt('rusty-key', 5, 3, 'Rusty Key');
const BRASS_KEY = keyAt('brass-key', 1, 3, 'Brass Key');
const RUSTY_DOOR = doorAt('rusty-door', 3, 1, 'rusty-key');
const BRASS_DOOR = doorAt('brass-door', 4, 1, 'brass-key');

const RUSTY_KEY_TAKEN = { type: 'pickup', item: { kind: 'key', id: 'rusty-key', name: 'Rusty Key' } } as const;
const BRASS_KEY_TAKEN = { type: 'pickup', item: { kind: 'key', id: 'brass-key', name: 'Brass Key' } } as const;

describe('a key', () => {
  it("is taken by walking onto it: the hero's body has to overlap it, and touching it is not enough", () => {
    const game = newGame(arena({ interactables: [RUSTY_KEY, RUSTY_DOOR] }));

    expect(walk(game, 'right', 10), 'the body only touches the tile').toEqual([]);
    expect(inventoryOf(game).keys).toEqual([]);

    expect(walk(game, 'right', 1), 'the body overlaps the tile').toEqual([RUSTY_KEY_TAKEN]);

    expect(inventoryOf(game).keys).toEqual([{ id: 'rusty-key', name: 'Rusty Key' }]);
  });

  it('is shown where it lies until the hero takes it', () => {
    const game = newGame(arena({ interactables: [RUSTY_KEY, RUSTY_DOOR] }));

    expect(interactableViews(game, 'key')).toEqual([
      { kind: 'key', id: 'rusty-key', position: { x: 5.5, y: 3.5 }, size: 1 },
    ]);

    walk(game, 'right', 11);

    expect(interactableViews(game, 'key')).toEqual([]);
  });

  it('is taken once: it is gone when the hero walks over the place again', () => {
    const game = newGame(arena({ interactables: [RUSTY_KEY, RUSTY_DOOR] }));
    walk(game, 'right', 11);

    expect(walk(game, 'left', 16), 'the hero walks away').toEqual([]);
    expect(walk(game, 'right', 16), 'and back over the place').toEqual([]);

    expect(inventoryOf(game).keys).toEqual([{ id: 'rusty-key', name: 'Rusty Key' }]);
  });

  it('is no Gear and no consumable: what the hero carries of those stays as it was', () => {
    const game = newGame(arena({ interactables: [RUSTY_KEY, RUSTY_DOOR] }));
    const before = inventoryOf(game);

    walk(game, 'right', 11);

    const after = inventoryOf(game);
    expect(after.gear).toEqual(before.gear);
    expect(after.consumables).toEqual(before.consumables);
    expect(playingView(game).hero.consumables).toEqual({ ammunition: 0, 'healing-potion': 0 });
  });

  it('is listed with the other keys in the order the hero took them', () => {
    const game = newGame(arena({ interactables: [RUSTY_KEY, BRASS_KEY, RUSTY_DOOR, BRASS_DOOR] }));

    expect(walk(game, 'right', 11)).toEqual([RUSTY_KEY_TAKEN]);
    expect(walk(game, 'left', 21), 'the body only touches the tile of the second').toEqual([]);
    expect(walk(game, 'left', 1)).toEqual([BRASS_KEY_TAKEN]);

    expect(inventoryOf(game).keys).toEqual([
      { id: 'rusty-key', name: 'Rusty Key' },
      { id: 'brass-key', name: 'Brass Key' },
    ]);
  });
});
