import { describe, expect, it } from 'vitest';
import type { Command } from '../src/core';
import {
  INTERACT,
  arena,
  expectAccepted,
  expectRefused,
  face,
  gameAtTitle,
  newGame,
  playingView,
  throughStorage,
} from './fixtures';
import {
  askingGame,
  harborContent,
  HARBOR_CREDITS,
  HARBOR_ENDING,
  harborGame,
  preparedGame,
  VESSEL_ID,
} from './harbor-fixtures';

// Sailing home is the end of the session. The core says what the hero sails home to, in one event with the lines of
// the ending and of the credits, and is at the title afterwards: there is no postgame, and the core has no storage to
// write to, so what was saved before is as it was. Showing the ending and the credits is the caller's job.

const CONFIRM = { type: 'confirm-departure' } as const;
const ENDED = [{ type: 'ending-reached', ending: HARBOR_ENDING, credits: HARBOR_CREDITS }];

describe('confirming the departure', () => {
  it('ends the game with one event: the ending and the credits of the content, as they are written', () => {
    const game = askingGame();

    expect(game.send(CONFIRM)).toEqual(ENDED);
  });

  it('leaves the game at the title: nothing to see of the hero, nothing to save, nothing that steps', () => {
    const game = askingGame();

    game.send(CONFIRM);

    expect(game.view()).toEqual({ phase: 'title' });
    expect(() => game.snapshot()).toThrow('There is nothing to save at the title');
    expect(game.step()).toEqual([]);
  });

  it.each<[string, Command]>([
    ['move', { type: 'move', direction: 'left' }],
    ['stop', { type: 'stop', direction: 'left' }],
    ['attack', { type: 'attack' }],
    ['interact', { type: 'interact' }],
    ['open-page', { type: 'open-page', page: 'stats' }],
    ['close-page', { type: 'close-page', page: 'stats' }],
    ['toggle-page', { type: 'toggle-page', page: 'stats' }],
    ['assign-stat-point', { type: 'assign-stat-point', stat: 'attack' }],
    ['equip', { type: 'equip', gearId: 'basic-sword' }],
    ['use-healing-potion', { type: 'use-healing-potion' }],
    ['switch-weapon', { type: 'switch-weapon' }],
    ['cancel-departure', { type: 'cancel-departure' }],
    ['confirm-departure', CONFIRM],
  ])('leaves no postgame: %s does nothing afterwards, and the game stays at the title', (_name, command) => {
    const game = askingGame();
    game.send(CONFIRM);

    expect(game.send(command)).toEqual([]);

    expect(game.view()).toEqual({ phase: 'title' });
    expect(game.step()).toEqual([]);
  });

  it('is not given by the hero when the vessel is not prepared, nor when the question is not open', () => {
    for (const game of [harborGame(), preparedGame()]) {
      const before = game.snapshot();

      expect(game.send(CONFIRM)).toEqual([]);

      expect(game.view().phase).toBe('playing');
      expect(game.snapshot()).toEqual(before);
    }
  });

  it('is not given at the title, before a game begins', () => {
    const game = gameAtTitle(harborContent());

    expect(game.send(CONFIRM)).toEqual([]);
    expect(game.view()).toEqual({ phase: 'title' });
  });

  it('is not given again once the question has been declined', () => {
    const game = askingGame();
    game.send({ type: 'cancel-departure' });
    const before = game.snapshot();

    expect(game.send(CONFIRM)).toEqual([]);
    expect(game.snapshot()).toEqual(before);
  });

  it('is nothing the game has to give in content without a vessel: there is nowhere to sail from', () => {
    const game = newGame(arena({ ending: HARBOR_ENDING, credits: HARBOR_CREDITS }));
    const before = game.snapshot();

    expect(game.send(CONFIRM)).toEqual([]);
    expect(game.snapshot()).toEqual(before);
  });
});

describe('after the ending', () => {
  it('a game saved before sailing home continues as it was: the game saved last is untouched', () => {
    const game = askingGame();
    const saved = throughStorage(game.snapshot());
    game.send(CONFIRM);

    game.send({ type: 'continue', snapshot: saved });

    expect(playingView(game).departure).toEqual({ vesselId: VESSEL_ID });
    expect(game.snapshot()).toEqual(saved);
  });

  it('a new game begins as the first one did, with nothing of the one that ended', () => {
    const game = gameAtTitle(harborContent());
    game.send({ type: 'new-game' });
    const first = game.snapshot();
    face(game, 'right');
    game.send(INTERACT);
    game.send(INTERACT);
    game.send(CONFIRM);

    game.send({ type: 'new-game' });

    expect(game.snapshot()).toEqual(first);
    expect(playingView(game).departure).toBeNull();
  });

  it('the hero can sail home again in the next game, and is told the same', () => {
    const game = askingGame();
    game.send(CONFIRM);
    game.send({ type: 'new-game' });
    face(game, 'right');
    game.send(INTERACT);
    game.send(INTERACT);

    expect(game.send(CONFIRM)).toEqual(ENDED);
  });
});

describe('the ending in the content', () => {
  it('may have one line, or as many as four, and the credits as many as they need', () => {
    for (const ending of [['One.'], ['One.', 'Two.', 'Three.', 'Four.']]) {
      expectAccepted(harborContent({ ending }));
    }
    const credits = Array.from({ length: 40 }, (_, index) => `Line ${index + 1}.`);
    expectAccepted(harborContent({ credits }));
  });

  it('is refused with no line at all: leave it out for none', () => {
    expectRefused(harborContent({ ending: [] }), 'The ending has no lines: leave it out for none');
    expectRefused(harborContent({ credits: [] }), 'The credits have no lines: leave them out for none');
  });

  it('is refused with a blank line, and the message says which', () => {
    expectRefused(harborContent({ ending: ['The wind.', '   '] }), 'The ending: line 2 is blank');
    expectRefused(harborContent({ credits: ['', 'Thanks.'] }), 'The credits: line 1 is blank');
  });

  it('is refused with more lines than the card holds, though the credits have no such limit', () => {
    expectRefused(
      harborContent({ ending: ['One.', 'Two.', 'Three.', 'Four.', 'Five.'] }),
      'The ending has 5 lines, but the card holds at most 4',
    );
  });

  it('is given with its credits or not at all', () => {
    expectRefused(arena({ ending: HARBOR_ENDING }), 'The ending needs credits: give both, or leave both out');
    expectRefused(arena({ credits: HARBOR_CREDITS }), 'The credits need an ending: give both, or leave both out');
  });

  it('is needed by a vessel, which the hero sails home on: the message names the vessel', () => {
    expectRefused(
      harborContent({ ending: undefined, credits: undefined }),
      `vessel "${VESSEL_ID}" needs the content to have an ending and credits`,
    );
  });

  it('is not needed by content without a vessel', () => {
    expectAccepted(arena());
    expectAccepted(arena({ ending: HARBOR_ENDING, credits: HARBOR_CREDITS }));
  });
});
