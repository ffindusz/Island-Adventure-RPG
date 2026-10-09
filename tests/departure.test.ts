import { describe, expect, it } from 'vitest';
import type { Game } from '../src/core';
import { advance, biterAt, face, gameAtTitle, playingView, throughStorage, WITH_BOW } from './fixtures';
import type { ArenaOptions } from './fixtures';
import { harborContent, harborGame, VESSEL_ID } from './harbor-fixtures';

// Departing is the game's only point of no return, so the game asks first. Interact on a vessel that the hero has
// prepared opens the question, which is part of the game state as an open page is, and pauses the game in the same way
// until the player answers it. These tests are about the question; what the answers do is for the tests after it.

const INTERACT = { type: 'interact' } as const;
const ASKED_ABOUT_THE_VESSEL = { vesselId: VESSEL_ID };

/** A game with the hero in front of the vessel, which it has prepared. */
function preparedGame(options: ArenaOptions = {}): Game {
  const game = harborGame(options);
  game.send(INTERACT);
  return game;
}

/** A game that asks whether to sail home: the hero has prepared the vessel and used Interact on it once more. */
function askingGame(options: ArenaOptions = {}): Game {
  const game = preparedGame(options);
  game.send(INTERACT);
  return game;
}

describe('Interact on a vessel that is prepared asks whether to sail home', () => {
  it('asks nothing before the vessel is prepared, nor in the moment that it is', () => {
    const game = harborGame();
    expect(playingView(game).departure).toBeNull();

    game.send(INTERACT);

    expect(playingView(game).departure).toBeNull();
  });

  it('asks on the next Interact, naming the vessel, and says nothing more: the vessel is not prepared again', () => {
    const game = preparedGame();

    const events = game.send(INTERACT);

    expect(events).toEqual([]);
    expect(playingView(game).departure).toEqual(ASKED_ABOUT_THE_VESSEL);
  });

  it('asks nothing of a hero that does not face the vessel', () => {
    const game = preparedGame();
    face(game, 'left');

    const events = game.send(INTERACT);

    expect(events).toEqual([]);
    expect(playingView(game).departure).toBeNull();
  });

  it('is part of the state that is saved, and still open when the game is continued', () => {
    const game = askingGame();

    const continued = gameAtTitle(harborContent());
    continued.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(game.snapshot().state.departure).toBe(VESSEL_ID);
    expect(playingView(continued).departure).toEqual(ASKED_ABOUT_THE_VESSEL);
    expect(continued.snapshot()).toEqual(game.snapshot());
  });

  it('is not in a snapshot taken before it was asked', () => {
    expect(preparedGame().snapshot().state.departure).toBeNull();
  });
});

describe('while the question is open the game is paused', () => {
  /** The asking game with a biter beside the hero, which strikes at once if the game is not paused. */
  function askingGameWithABiter(): Game {
    return askingGame({ monsters: [biterAt('biter', 10, 3)], hero: { attack: 12, attackCooldownMs: 0, startingGear: WITH_BOW } });
  }

  it('stepping advances nothing: the monsters, the hero and the events stay as they were', () => {
    const game = askingGameWithABiter();
    const before = game.snapshot();

    const events = advance(game, 200);

    expect(events).toEqual([]);
    expect(game.snapshot()).toEqual(before);
  });

  it.each([
    ['attack', { type: 'attack' }],
    ['interact', { type: 'interact' }],
    ['switch-weapon', { type: 'switch-weapon' }],
    ['open-page', { type: 'open-page', page: 'stats' }],
    ['use-healing-potion', { type: 'use-healing-potion' }],
  ] as const)('%s does nothing', (_name, command) => {
    const game = askingGameWithABiter();
    const before = game.snapshot();

    const events = game.send(command);

    expect(events).toEqual([]);
    expect(game.snapshot()).toEqual(before);
  });

  it('a key held while it is open does not walk the hero', () => {
    const game = askingGameWithABiter();
    const before = playingView(game).hero.position;

    game.send({ type: 'move', direction: 'up' });
    advance(game, 16);

    expect(playingView(game).hero.position).toEqual(before);
  });
});
