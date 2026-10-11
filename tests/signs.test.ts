import { describe, expect, it } from 'vitest';
import type { ContentDefinition, Game } from '../src/core';
import { INTERACT, advance, arena, face, interactableViews, newGame, playingView, signAt, walk } from './fixtures';

// A sign fills the tile it stands on and is always solid. The hero reads it with Interact, and its text shows across the
// top of the screen as the text of an Adventure Area does, and for as long: no page opens and the game does not pause.
// What the saved game does with signs is in save-round-trip.test.ts.
//
// The hero stands at (3.5, 3.5) facing down. In most tests the sign is on the tile (3, 2), right above it. Area text
// stays 4 seconds unless the content says otherwise, and 4 seconds are 240 steps.

const CLUE = 'The lever hides behind the old well.';
const OTHER_CLUE = 'Two torches, one gate.';

const READ = { type: 'sign-read', signId: 'sign-1', text: CLUE } as const;

/** The arena with a sign right above the hero. */
function signAbove(options: { text?: string; areaTextMs?: number } = {}): ContentDefinition {
  return arena({ ...options, interactables: [signAt('sign-1', 3, 2, CLUE)] });
}

/** The hero turns to the sign above it and presses Interact. Returns what happened. */
function readSign(game: Game) {
  face(game, 'up');
  return game.send(INTERACT);
}

describe('a sign', () => {
  it('is solid: it stops the hero flush against it', () => {
    const game = newGame(signAbove());

    walk(game, 'up', 8);

    // The sign's lower edge is at y = 3, and the hero's upper edge is 0.25 above its centre.
    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 3.25 });
  });

  it('is shown on its tile', () => {
    const game = newGame(signAbove());

    expect(interactableViews(game, 'sign')).toEqual([
      { kind: 'sign', id: 'sign-1', position: { x: 3.5, y: 2.5 }, size: 1 },
    ]);
  });
});

describe('reading a sign', () => {
  it('shows its text, which was not there before, and says so', () => {
    const game = newGame(signAbove());
    expect(playingView(game).areaText).toBeNull();

    expect(readSign(game)).toEqual([READ]);

    expect(playingView(game).areaText).toBe(CLUE);
  });

  it('shows the text of the sign the hero faces, whichever sign it is', () => {
    const game = newGame(
      arena({ interactables: [signAt('sign-1', 3, 2, CLUE), signAt('sign-2', 4, 3, OTHER_CLUE)] }),
    );

    face(game, 'right');
    expect(game.send(INTERACT)).toEqual([{ type: 'sign-read', signId: 'sign-2', text: OTHER_CLUE }]);
    expect(playingView(game).areaText).toBe(OTHER_CLUE);

    expect(readSign(game)).toEqual([READ]);
    expect(playingView(game).areaText).toBe(CLUE);
  });

  it('replaces the text of the area that is still on the screen', () => {
    const game = newGame(signAbove({ text: 'A quiet arena.' }));
    expect(playingView(game).areaText).toBe('A quiet arena.');

    readSign(game);

    expect(playingView(game).areaText).toBe(CLUE);
  });

  it('does not pause the game: no page opens, and the hero walks on while the text shows', () => {
    const game = newGame(signAbove());
    readSign(game);

    walk(game, 'right', 4);

    const view = playingView(game);
    expect(view.page).toBeNull();
    expect(view.hero.position).toEqual({ x: 4, y: 3.5 });
    expect(view.areaText).toBe(CLUE);
  });

  it('lets the text go after as long as the text of an area stays: 4 seconds', () => {
    const game = newGame(signAbove());
    readSign(game);

    advance(game, 239);
    expect(playingView(game).areaText).toBe(CLUE);

    advance(game, 1);
    expect(playingView(game).areaText).toBeNull();
  });

  it('keeps the text for as long as the content says area text stays: half a second is 30 steps', () => {
    const game = newGame(signAbove({ areaTextMs: 500 }));
    readSign(game);

    advance(game, 29);
    expect(playingView(game).areaText).toBe(CLUE);

    advance(game, 1);
    expect(playingView(game).areaText).toBeNull();
  });

  it('can be done again, and the text gets its full time again', () => {
    const game = newGame(signAbove());
    readSign(game);
    advance(game, 200);

    expect(game.send(INTERACT)).toEqual([READ]);

    advance(game, 239);
    expect(playingView(game).areaText).toBe(CLUE);
    advance(game, 1);
    expect(playingView(game).areaText).toBeNull();
  });
});
