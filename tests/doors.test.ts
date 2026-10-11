import { describe, expect, it } from 'vitest';
import type { AreaDefinition, ContentDefinition, EntranceDefinition, ExitDefinition, Game } from '../src/core';
import {
  ARENA_LAYOUT,
  INTERACT,
  arena,
  doorAt,
  face,
  interactableViews,
  inventoryOf,
  keyAt,
  newGame,
  playingView,
  walk,
} from './fixtures';

// A locked door fills the tile it stands on and is solid, like a chest, until the hero opens it with Interact. It opens
// for the one key it names, which the hero takes by walking onto it (see keys.test.ts) wherever in the game that key lies,
// and the door takes the key. An open door is passable, stays open, and wants no key again. What else a door stops,
// and what defeat does to one, is in device-blocking.test.ts and device-persistence.test.ts.
//
// The hero stands at (3.5, 3.5) facing down. In most tests the door is on the tile (3, 4), right below it, and its key
// on the tile (2, 3), beside it: the hero's body overlaps that tile after 3 steps to the left (its left edge is then
// at x = 3.25 - 3 * 0.125 = 2.875, inside the tile, which spans x 2 to 3), and 3 steps to the right bring it back.

const LOCKED = { type: 'door-locked', doorId: 'cellar-door', keyName: 'Rusty Key' } as const;
const OPENED = { type: 'door-opened', doorId: 'cellar-door', keyName: 'Rusty Key' } as const;
const RUSTY_KEY_HELD = { id: 'rusty-key', name: 'Rusty Key' };

/** The arena with the rusty key beside the hero and the locked cellar door right below it. */
function lockedDoor(): ContentDefinition {
  return arena({ interactables: [keyAt('rusty-key', 2, 3, 'Rusty Key'), doorAt('cellar-door', 3, 4, 'rusty-key')] });
}

/** The hero takes the key beside it, comes back to the tile where it began and faces the door. */
function takeKeyAndFaceDoor(game: Game): void {
  walk(game, 'left', 3);
  walk(game, 'right', 3);
  face(game, 'down');
}

describe('a locked door', () => {
  it('is solid, like a chest: it stops the hero flush against it', () => {
    const game = newGame(lockedDoor());

    walk(game, 'down', 20);

    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 3.75 });
  });

  it('is shown shut, on its tile', () => {
    const game = newGame(lockedDoor());

    expect(interactableViews(game, 'door')).toEqual([
      { kind: 'door', id: 'cellar-door', position: { x: 3.5, y: 4.5 }, size: 1, open: false },
    ]);
  });

  it('stays locked for a hero without its key: Interact says so, and names the key it needs', () => {
    const game = newGame(lockedDoor());

    expect(game.send(INTERACT)).toEqual([LOCKED]);
    expect(game.send(INTERACT), 'and says so again').toEqual([LOCKED]);

    expect(interactableViews(game, 'door')).toMatchObject([{ open: false }]);
  });

  it('opens with its key, which it takes: the hero holds no key then', () => {
    const game = newGame(lockedDoor());
    takeKeyAndFaceDoor(game);
    expect(inventoryOf(game).keys).toEqual([RUSTY_KEY_HELD]);

    expect(game.send(INTERACT)).toEqual([OPENED]);

    expect(inventoryOf(game).keys).toEqual([]);
    expect(interactableViews(game, 'door')).toMatchObject([{ id: 'cellar-door', open: true }]);
  });

  it('lets the hero through once it is open', () => {
    const game = newGame(lockedDoor());
    takeKeyAndFaceDoor(game);
    game.send(INTERACT);

    // The tile (3, 4) is the last row before the wall, so the hero ends with its body on the wall's edge, at y = 4.75.
    walk(game, 'down', 20);

    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 4.75 });
  });

  it('stays open, and says nothing more: it asks for no key again, as it has taken the one it had', () => {
    const game = newGame(lockedDoor());
    takeKeyAndFaceDoor(game);
    game.send(INTERACT);

    expect(game.send(INTERACT)).toEqual([]);

    expect(interactableViews(game, 'door')).toMatchObject([{ open: true }]);
  });

  it('needs its own key: the key of another door does not open it, and the hero keeps that key', () => {
    const game = newGame(
      arena({
        interactables: [
          keyAt('brass-key', 2, 3, 'Brass Key'),
          keyAt('rusty-key', 5, 1, 'Rusty Key'),
          doorAt('cellar-door', 3, 4, 'rusty-key'),
          doorAt('side-door', 5, 4, 'brass-key'),
        ],
      }),
    );
    takeKeyAndFaceDoor(game);

    expect(game.send(INTERACT)).toEqual([LOCKED]);

    expect(inventoryOf(game).keys).toEqual([{ id: 'brass-key', name: 'Brass Key' }]);
    expect(interactableViews(game, 'door')).toMatchObject([{ open: false }, { open: false }]);
  });
});

describe('a locked door whose key lies in another Adventure Area', () => {
  // The arena and a cellar, as in area-connections.test.ts: the hero walks right into the cellar and arrives at
  // (2.5, 3.5), where the key lies on the tile (3, 3), and walks left through the cellar's exit, on the tile (1, 3),
  // back into the arena at (4.5, 3.5). The door is on the tile (4, 4) of the arena, right below that tile.
  const FROM_CELLAR: EntranceDefinition = { id: 'from-cellar', tile: { col: 4, row: 3 } };
  const TO_CELLAR: ExitDefinition = {
    id: 'to-cellar',
    zone: { col: 5, row: 3, width: 1, height: 1 },
    to: { area: 'cellar', entrance: 'from-arena' },
  };
  const CELLAR: AreaDefinition = {
    id: 'cellar',
    name: 'Cellar',
    layout: ARENA_LAYOUT,
    monsters: [],
    interactables: [keyAt('rusty-key', 3, 3, 'Rusty Key')],
    entrances: [{ id: 'from-arena', tile: { col: 2, row: 3 } }],
    exits: [
      {
        id: 'to-arena',
        zone: { col: 1, row: 3, width: 1, height: 1 },
        to: { area: 'arena', entrance: 'from-cellar' },
      },
    ],
  };

  it('opens for the hero that brings the key from there, and takes it', () => {
    const game = newGame(
      arena({
        entrances: [FROM_CELLAR],
        exits: [TO_CELLAR],
        interactables: [doorAt('cellar-door', 4, 4, 'rusty-key')],
        otherAreas: [CELLAR],
      }),
    );
    walk(game, 'right', 11);
    expect(playingView(game).area.id).toBe('cellar');
    walk(game, 'right', 3);
    expect(inventoryOf(game).keys).toEqual([RUSTY_KEY_HELD]);
    walk(game, 'left', 6);
    expect(playingView(game).area.id).toBe('arena');
    face(game, 'down');

    expect(game.send(INTERACT)).toEqual([OPENED]);

    expect(inventoryOf(game).keys).toEqual([]);
  });
});
