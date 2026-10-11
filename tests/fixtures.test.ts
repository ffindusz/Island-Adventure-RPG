import { describe, expect, it } from 'vitest';
import {
  arena,
  biterAt,
  continuedFrom,
  eventsUntilDefeated,
  expectAccepted,
  expectRefused,
  newGame,
  playingView,
  untilDefeated,
  walk,
} from './fixtures';

// Dozens of tests lean on these helpers to fail when the game does not do what they expect: a helper that let
// everything pass would leave all of them green whatever the game did.

describe('expectRefused', () => {
  it('passes for content the game refuses with that message', () => {
    expectRefused(arena({ opening: [] }), 'The opening has no lines');
  });

  it('fails for content the game accepts', () => {
    expect(() => expectRefused(arena(), 'The opening has no lines')).toThrow();
  });

  it('fails for content the game refuses with another message', () => {
    expect(() => expectRefused(arena({ opening: [] }), 'The ending has no lines')).toThrow();
  });
});

describe('expectAccepted', () => {
  it('passes for content the game accepts', () => {
    expectAccepted(arena());
  });

  it('fails for content the game refuses', () => {
    expect(() => expectAccepted(arena({ opening: [] }))).toThrow();
  });
});

describe('untilDefeated and eventsUntilDefeated', () => {
  // The biter on the tile (4, 3), beside the hero, starts its wind-up in step 1 and bites for 5 in step 31, which
  // defeats a hero with 5 Health. A hero with 10 Health is bitten twice, and defeated by the second bite.
  const biterBeside = (health: number) => newGame(arena({ monsters: [biterAt('biter', 4, 3)], hero: { health } }));
  const types = (events: readonly { readonly type: string }[]) => events.map((event) => event.type);

  it('return the events of the step in which the hero is defeated, or of all steps up to it', () => {
    expect(types(untilDefeated(biterBeside(10), 200))).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated']);
    expect(types(eventsUntilDefeated(biterBeside(10), 200))).toEqual([
      'monster-attacked',
      'hero-hit',
      'monster-attacked',
      'hero-hit',
      'hero-defeated',
    ]);
  });

  it('count the steps: a defeat in step 31 is within 31 steps, and not within 30', () => {
    expect(types(untilDefeated(biterBeside(5), 31))).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated']);
    expect(types(eventsUntilDefeated(biterBeside(5), 31))).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated']);
    expect(() => untilDefeated(biterBeside(5), 30)).toThrow('The hero was not defeated within 30 steps');
    expect(() => eventsUntilDefeated(biterBeside(5), 30)).toThrow('The hero was not defeated within 30 steps');
  });

  it('give up after 300 steps when they are not given a number', () => {
    expect(() => untilDefeated(newGame())).toThrow('within 300 steps');
    expect(() => eventsUntilDefeated(newGame())).toThrow('within 300 steps');
  });
});

describe('continuedFrom', () => {
  const walkedRight = () => {
    const game = newGame();
    walk(game, 'right', 3);
    return game;
  };

  it('gives a game in play that shows what the snapshot holds', () => {
    const played = walkedRight();

    expect(playingView(played)).not.toEqual(playingView(newGame()));
    expect(playingView(continuedFrom(arena(), played.snapshot()))).toEqual(playingView(played));
  });

  it('gives the game the snapshot as storage gives it back: its text, not the object', () => {
    const played = walkedRight();
    // JSON.stringify asks an object for its toJSON: this one stands in for the text of the played game's snapshot
    const standIn = { ...newGame().snapshot(), toJSON: () => played.snapshot() };

    expect(playingView(continuedFrom(arena(), standIn))).toEqual(playingView(played));
  });
});
