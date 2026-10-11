import { describe, expect, it } from 'vitest';
import type { ContentDefinition, Game } from '../src/core';
import {
  INTERACT,
  arena,
  doorAt,
  face,
  gateAt,
  interactableViews,
  keyAt,
  leverAt,
  newGame,
  playingView,
  walk,
} from './fixtures';

// A lever fills the tile it stands on and is always solid. The hero pulls it with Interact, and pulling it again puts it
// back. Each time it moves every door and gate it names, which stand in its own Adventure Area: one that is shut opens,
// and one that is open shuts. A gate fills its tile and is solid while it is shut; it opens for a lever alone, and
// Interact does nothing on it. What else a shut gate stops is in device-blocking.test.ts, and what defeat, a change of
// area and the saved game do to levers and gates is in device-persistence.test.ts.
//
// The hero stands at (3.5, 3.5) facing down. In most tests the lever is on the tile (3, 2), right above it, and its gate
// on the tile (4, 3), right of it. Walking right 20 steps takes a hero that the gate does not stop to the wall, at
// x = 5.75, and one that it stops to x = 3.75, flush against it.

const PULLED = { type: 'lever-toggled', leverId: 'lever-1', pulled: true } as const;
const PUT_BACK = { type: 'lever-toggled', leverId: 'lever-1', pulled: false } as const;

/** The arena with a lever right above the hero and the gate it moves right of it. */
function leverAndGate(): ContentDefinition {
  return arena({ interactables: [leverAt('lever-1', 3, 2, ['gate-1']), gateAt('gate-1', 4, 3)] });
}

/** The hero turns to the lever above it and presses Interact. Returns what happened. */
function pullLever(game: Game) {
  face(game, 'up');
  return game.send(INTERACT);
}

/** Where the hero ends after walking right for 20 steps. */
function walkedRight(game: Game): { x: number; y: number } {
  walk(game, 'right', 20);
  return playingView(game).hero.position;
}

describe('a gate', () => {
  it('is solid while it is shut: it stops the hero flush against it', () => {
    const game = newGame(leverAndGate());

    expect(walkedRight(game)).toEqual({ x: 3.75, y: 3.5 });
  });

  it('is shown shut, on its tile', () => {
    const game = newGame(leverAndGate());

    expect(interactableViews(game, 'gate')).toEqual([
      { kind: 'gate', id: 'gate-1', position: { x: 4.5, y: 3.5 }, size: 1, open: false },
    ]);
  });

  it('does not open for Interact: it takes a lever', () => {
    const game = newGame(leverAndGate());
    walkedRight(game);

    expect(game.send(INTERACT)).toEqual([]);

    expect(interactableViews(game, 'gate')).toMatchObject([{ open: false }]);
  });
});

describe('a lever', () => {
  it('is solid: it stops the hero flush against it', () => {
    const game = newGame(leverAndGate());

    walk(game, 'up', 20);

    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 3.25 });
  });

  it('is shown not pulled, on its tile', () => {
    const game = newGame(leverAndGate());

    expect(interactableViews(game, 'lever')).toEqual([
      { kind: 'lever', id: 'lever-1', position: { x: 3.5, y: 2.5 }, size: 1, pulled: false },
    ]);
  });

  it('is pulled by Interact, and the gate it names opens: the hero walks through', () => {
    const game = newGame(leverAndGate());

    expect(pullLever(game)).toEqual([PULLED]);

    expect(interactableViews(game, 'lever')).toMatchObject([{ pulled: true }]);
    expect(interactableViews(game, 'gate')).toMatchObject([{ open: true }]);
    expect(walkedRight(game)).toEqual({ x: 5.75, y: 3.5 });
  });

  it('is put back by the next Interact, and the gate shuts again', () => {
    const game = newGame(leverAndGate());
    pullLever(game);

    expect(pullLever(game)).toEqual([PUT_BACK]);

    expect(interactableViews(game, 'lever')).toMatchObject([{ pulled: false }]);
    expect(interactableViews(game, 'gate')).toMatchObject([{ open: false }]);
    expect(walkedRight(game)).toEqual({ x: 3.75, y: 3.5 });
  });

  it('moves every gate it names, and no other', () => {
    const game = newGame(
      arena({
        interactables: [
          leverAt('lever-1', 3, 2, ['gate-1', 'gate-2']),
          gateAt('gate-1', 4, 3),
          gateAt('gate-2', 5, 1),
          gateAt('other-gate', 5, 4),
        ],
      }),
    );

    pullLever(game);

    expect(interactableViews(game, 'gate')).toMatchObject([
      { id: 'gate-1', open: true },
      { id: 'gate-2', open: true },
      { id: 'other-gate', open: false },
    ]);
  });

  it('moves each gate the other way: one that is open shuts as the other opens', () => {
    const game = newGame(
      arena({
        interactables: [
          leverAt('lever-1', 3, 2, ['gate-1', 'gate-2']),
          gateAt('gate-1', 4, 3),
          gateAt('gate-2', 5, 1),
          leverAt('lever-2', 1, 3, ['gate-2']),
        ],
      }),
    );
    walk(game, 'left', 8); // beside the second lever, which is on the tile (1, 3): the hero stands on (2.5, 3.5)
    expect(game.send(INTERACT)).toEqual([{ type: 'lever-toggled', leverId: 'lever-2', pulled: true }]);
    expect(interactableViews(game, 'gate')).toMatchObject([{ open: false }, { open: true }]);
    walk(game, 'right', 8);

    pullLever(game);

    expect(interactableViews(game, 'gate')).toMatchObject([{ open: true }, { open: false }]);
  });

  it('opens a locked door as well, with no key: the key is still there to take', () => {
    const game = newGame(
      arena({
        interactables: [
          leverAt('lever-1', 3, 2, ['cellar-door']),
          doorAt('cellar-door', 4, 3, 'rusty-key'),
          keyAt('rusty-key', 5, 1),
        ],
      }),
    );

    expect(pullLever(game)).toEqual([PULLED]);

    expect(interactableViews(game, 'door')).toMatchObject([{ open: true }]);
    expect(interactableViews(game, 'key')).toHaveLength(1);
    expect(walkedRight(game)).toEqual({ x: 5.75, y: 3.5 });
  });
});

describe('a gate that shuts on a body in its tile', () => {
  // The lever is on the tile (3, 2) and its gate right of it, on (4, 2). The hero opens the gate, walks into its tile,
  // faces back at the lever and pulls it again, so that the gate shuts with the hero inside.
  function heroInTheShutGate(): Game {
    const game = newGame(arena({ interactables: [leverAt('lever-1', 3, 2, ['gate-1']), gateAt('gate-1', 4, 2)] }));
    pullLever(game);
    walk(game, 'right', 8);
    walk(game, 'up', 8);
    expect(playingView(game).hero.position).toEqual({ x: 4.5, y: 2.5 });
    face(game, 'left');
    expect(game.send(INTERACT)).toEqual([PUT_BACK]);
    return game;
  }

  it('lets the body out, and does not push it', () => {
    const game = heroInTheShutGate();
    expect(interactableViews(game, 'gate')).toMatchObject([{ open: false }]);
    expect(playingView(game).hero.position).toEqual({ x: 4.5, y: 2.5 });

    walk(game, 'down', 8);

    expect(playingView(game).hero.position).toEqual({ x: 4.5, y: 3.5 });
  });

  it('stops it from coming back in', () => {
    const game = heroInTheShutGate();
    walk(game, 'down', 8);

    walk(game, 'up', 8);

    // The gate's lower edge is at y = 3, and the hero's upper edge is 0.25 above its centre.
    expect(playingView(game).hero.position).toEqual({ x: 4.5, y: 3.25 });
  });
});
