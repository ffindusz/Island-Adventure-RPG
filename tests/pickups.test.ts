import { describe, expect, it } from 'vitest';
import type { ContentDefinition, Game, InteractableDefinition } from '../src/core';
import {
  advance,
  arena,
  chestAt,
  expectAccepted,
  expectRefused,
  face,
  gameAtTitle,
  newGame,
  pickupAt,
  playingView,
  throughStorage,
  walk,
} from './fixtures';

// A pickup is a consumable that lies on a tile of an Adventure Area. The hero takes it by walking onto it, with no key
// to press, and it is gone, unless defeat puts it back (see checkpoints.test.ts). It is no obstacle: it is not solid and
// Interact does not reach it.
//
// The hero stands at (3.5, 3.5) and walks 0.125 tile a step. Walking right, its body (0.5 wide) only touches the tile
// (5, 3) after 10 steps, at x = 4.75, and overlaps it after 11, at x = 4.875.

const INTERACT = { type: 'interact' } as const;

const TWO_POTIONS_PICKED_UP = {
  type: 'pickup',
  item: { kind: 'consumable', id: 'healing-potion', amount: 2 },
} as const;

function potionsOf(game: Game): number {
  return playingView(game).hero.consumables['healing-potion'];
}

/** The content with two Healing Potions on the tile (5, 3), two tiles right of the tile the hero stands on. */
function contentWithPotionsToTheRight(): ContentDefinition {
  return arena({ interactables: [pickupAt('potion-1', 5, 3, 2)] });
}

/** The game that a player gets by saving this one and continuing it later. */
function continued(content: ContentDefinition, game: Game): Game {
  const restored = gameAtTitle(content);
  restored.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });
  return restored;
}

describe('a pickup', () => {
  it('is taken by walking onto it: the hero\'s body has to overlap it, and touching it is not enough', () => {
    const game = newGame(contentWithPotionsToTheRight());

    expect(walk(game, 'right', 10), 'the body only touches the tile').toEqual([]);
    expect(potionsOf(game)).toBe(0);

    expect(walk(game, 'right', 1), 'the body overlaps the tile').toEqual([TWO_POTIONS_PICKED_UP]);

    expect(potionsOf(game)).toBe(2);
  });

  it('gives the consumable it holds, whichever it is: arrows lie on the ground as well', () => {
    const game = newGame(arena({ interactables: [pickupAt('arrows-1', 5, 3, 6, 'ammunition')] }));

    expect(walk(game, 'right', 11)).toEqual([
      { type: 'pickup', item: { kind: 'consumable', id: 'ammunition', amount: 6 } },
    ]);

    expect(playingView(game).hero.consumables).toEqual({ ammunition: 6, 'healing-potion': 0 });
  });

  it('is taken once: it is gone when the hero walks over the place again', () => {
    const game = newGame(contentWithPotionsToTheRight());
    walk(game, 'right', 11);

    expect(walk(game, 'left', 16), 'the hero walks away').toEqual([]);
    expect(walk(game, 'right', 16), 'and back over the place').toEqual([]);

    expect(potionsOf(game)).toBe(2);
  });

  it('is shown where it lies until the hero takes it', () => {
    const game = newGame(contentWithPotionsToTheRight());

    expect(playingView(game).interactables).toEqual([
      { kind: 'pickup', id: 'potion-1', position: { x: 5.5, y: 3.5 }, size: 1, consumable: 'healing-potion' },
    ]);

    walk(game, 'right', 11);

    expect(playingView(game).interactables).toEqual([]);
  });

  it('is not reached with Interact: the hero takes it by walking onto it, not by facing it', () => {
    const game = newGame(arena({ interactables: [pickupAt('potion-1', 4, 3, 2)] }));
    face(game, 'right');

    expect(game.send(INTERACT), 'the pickup is within reach, right of the hero').toEqual([]);

    expect(potionsOf(game)).toBe(0);
    expect(playingView(game).interactables, 'it still lies there').toHaveLength(1);
  });

  it('is part of a saved game: one that was taken is still gone', () => {
    const content = contentWithPotionsToTheRight();
    const game = newGame(content);
    walk(game, 'right', 11);

    const restored = continued(content, game);

    expect(playingView(restored).interactables).toEqual([]);
    expect(advance(restored, 3), 'the hero stands where it lay, and takes nothing').toEqual([]);
    expect(potionsOf(restored)).toBe(2);
  });

  it('is part of a saved game: one that was not taken is still there to take', () => {
    const content = contentWithPotionsToTheRight();

    const restored = continued(content, newGame(content));

    expect(playingView(restored).interactables).toHaveLength(1);
    expect(walk(restored, 'right', 11)).toEqual([TWO_POTIONS_PICKED_UP]);
  });
});

describe('a pickup that does not make sense is refused when the game is created', () => {
  // Content read from a file could say these, and the compiler would not notice.
  const pickupWith = (fields: object) =>
    ({
      kind: 'pickup',
      id: 'potion-1',
      tile: { col: 1, row: 1 },
      consumable: 'healing-potion',
      amount: 1,
      ...fields,
    }) as unknown as InteractableDefinition;

  it.each([
    {
      what: 'a pickup of a consumable that does not exist',
      content: arena({ interactables: [pickupWith({ consumable: 'gold' })] }),
      message: 'Area "arena": pickup "potion-1" holds unknown consumable "gold"',
    },
    {
      what: 'a pickup of none',
      content: arena({ interactables: [pickupWith({ amount: 0 })] }),
      message: 'Area "arena": pickup "potion-1": amount must be a whole number of 1 or more, but it is 0',
    },
    {
      what: 'a pickup of a fraction of a potion',
      content: arena({ interactables: [pickupWith({ amount: 1.5 })] }),
      message: 'Area "arena": pickup "potion-1": amount must be a whole number of 1 or more, but it is 1.5',
    },
    {
      what: 'a pickup on solid terrain',
      content: arena({ interactables: [pickupAt('potion-1', 2, 2, 1)] }), // the water
      message: 'Area "arena": pickup "potion-1" is placed at (col 2, row 2), which is solid terrain or outside the map',
    },
    {
      what: 'a pickup on the tile of a chest',
      content: arena({ interactables: [chestAt('chest-1', 4, 3, 'iron-sword'), pickupAt('potion-1', 4, 3, 1)] }),
      message: 'Area "arena": pickup "potion-1" is placed at (col 4, row 3), where chest "chest-1" already stands',
    },
    {
      what: 'a pickup with the id of a chest',
      content: arena({ interactables: [chestAt('chest-1', 4, 3, 'iron-sword'), pickupAt('chest-1', 5, 3, 1)] }),
      message: 'Interactable id "chest-1" is used more than once',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it('pickups of the same consumable are accepted: unlike Gear, there can be many', () => {
    const content = arena({ interactables: [pickupAt('potion-1', 1, 1, 1), pickupAt('potion-2', 5, 1, 1)] });

    expectAccepted(content);
  });
});
