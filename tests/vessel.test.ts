import { describe, expect, it } from 'vitest';
import { interactableViews, playingView, walk } from './fixtures';
import { harborGame, VESSEL_ID } from './harbor-fixtures';

// The vessel fills the tile it stands on and is always solid. The hero prepares it with Interact, and asks to sail home
// with the next Interact (what the question does is in departure.test.ts). The harbor of the tests is in
// harbor-fixtures.ts: the hero stands at (11.5, 3.5) facing right, and the vessel fills tile (12, 3), x 12 to 13.

const INTERACT = { type: 'interact' } as const;

describe('a vessel', () => {
  it('is solid: it stops the hero flush against it', () => {
    const game = harborGame();

    walk(game, 'right', 8);

    // The vessel's left edge is at x = 12, and the hero's right edge is 0.25 beyond its centre.
    expect(playingView(game).hero.position).toEqual({ x: 11.75, y: 3.5 });
  });

  it('is shown on its tile, not prepared', () => {
    const game = harborGame();

    expect(interactableViews(game, 'vessel')).toEqual([
      { kind: 'vessel', id: VESSEL_ID, position: { x: 12.5, y: 3.5 }, size: 1, prepared: false },
    ]);
  });
});

describe('preparing the vessel', () => {
  it('is what Interact does on a vessel that is not prepared: the hero is told, once', () => {
    const game = harborGame();

    expect(game.send(INTERACT)).toEqual([{ type: 'vessel-prepared', vesselId: VESSEL_ID }]);
  });

  it('leaves the vessel shown as prepared', () => {
    const game = harborGame();

    game.send(INTERACT);

    expect(interactableViews(game, 'vessel')).toEqual([
      { kind: 'vessel', id: VESSEL_ID, position: { x: 12.5, y: 3.5 }, size: 1, prepared: true },
    ]);
  });
});
