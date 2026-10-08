import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { ContentDefinition } from '../src/core';
import { arena, fixedRandom, gameAtTitle, newGame, playingView, throughStorage, walk } from './fixtures';

// The opening is the short card the player reads once, as a new game begins, before the hero can move. The core only
// says what it is: an event with the lines of the content. Holding the game while the card is up is the caller's job.

const OPENING = ['The storm broke the ship.', 'The sea carried you ashore.'];
const WRECK = 'The wreck.';

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

describe('the opening of a new game', () => {
  it('is the first event of the new game, with the lines the content gives, before the text of the first area', () => {
    const game = gameAtTitle(arena({ opening: OPENING, text: WRECK }));

    expect(game.send({ type: 'new-game' })).toEqual([
      { type: 'opening', lines: OPENING },
      { type: 'area-text', areaId: 'arena', text: WRECK },
    ]);
  });

  it('comes with every new game, not only the first one of a run', () => {
    const game = gameAtTitle(arena({ opening: OPENING }));
    game.send({ type: 'new-game' });

    expect(game.send({ type: 'new-game' })).toEqual([{ type: 'opening', lines: OPENING }]);
  });

  it('is not there when the content has none', () => {
    expect(gameAtTitle(arena()).send({ type: 'new-game' })).toEqual([]);
  });

  it('is not there when a saved game is continued', () => {
    const content = arena({ opening: OPENING, text: WRECK });
    const saved = throughStorage(newGame(content).snapshot());

    expect(gameAtTitle(content).send({ type: 'continue', snapshot: saved })).toEqual([]);
  });

  it('changes nothing in the game: no pause and nothing saved, so the hero walks as soon as the caller steps', () => {
    const withOpening = newGame(arena({ opening: OPENING }));
    const without = newGame(arena());

    expect(withOpening.view()).toEqual(without.view());
    expect(withOpening.snapshot()).toEqual(without.snapshot());

    walk(withOpening, 'right', 4);
    expect(playingView(withOpening).hero.position).toEqual({ x: 4, y: 3.5 });
  });
});

describe('the opening in the content', () => {
  it('may be one line, or as many as four', () => {
    expect(() => createGame({ content: arena({ opening: ['One.'] }), random: fixedRandom })).not.toThrow();
    expect(() =>
      createGame({ content: arena({ opening: ['One.', 'Two.', 'Three.', 'Four.'] }), random: fixedRandom }),
    ).not.toThrow();
  });

  it('is refused with no line at all: leave it out for none', () => {
    expectRefused(arena({ opening: [] }), 'The opening has no lines');
  });

  it('is refused with a blank line, and the message says which', () => {
    expectRefused(arena({ opening: ['The storm.', '   '] }), 'The opening: line 2 is blank');
    expectRefused(arena({ opening: ['', 'The storm.'] }), 'The opening: line 1 is blank');
  });

  it('is refused with more lines than the card holds', () => {
    expectRefused(
      arena({ opening: ['One.', 'Two.', 'Three.', 'Four.', 'Five.'] }),
      'The opening has 5 lines, but the card holds at most 4',
    );
  });
});
