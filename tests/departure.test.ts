import { describe, expect, it } from 'vitest';
import type { Game } from '../src/core';
import {
  advance,
  biterAt,
  continuedFrom,
  face,
  gameAtTitle,
  INTERACT,
  interactableViews,
  playingView,
  walk,
  WITH_BOW,
} from './fixtures';
import { askingGame, harborContent, harborGame, preparedGame, VESSEL_ID } from './harbor-fixtures';

// Departing is the game's only point of no return, so the game asks first. Interact on a vessel that the hero has
// prepared opens the question, which is part of the game state as an open page is, and pauses the game in the same way
// until the player answers it. The answers are two commands: to decline, and to sail.

const CANCEL = { type: 'cancel-departure' } as const;
const ASKED_ABOUT_THE_VESSEL = { vesselId: VESSEL_ID };

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

    const continued = continuedFrom(harborContent(), game.snapshot());

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
    return askingGame({
      monsters: [biterAt('biter', 10, 3)],
      hero: { attack: 12, attackCooldownMs: 0, startingGear: WITH_BOW },
    });
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
    ['toggle-page', { type: 'toggle-page', page: 'stats' }],
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

describe('declining to sail home', () => {
  it('closes the question and leaves everything as it was before it was asked: the vessel stays prepared', () => {
    const game = preparedGame();
    const beforeTheQuestion = game.snapshot();
    game.send(INTERACT);

    const events = game.send(CANCEL);

    expect(events).toEqual([]);
    expect(playingView(game).departure).toBeNull();
    expect(game.snapshot()).toEqual(beforeTheQuestion);
    expect(interactableViews(game, 'vessel')).toMatchObject([{ id: VESSEL_ID, prepared: true }]);
  });

  it('lets the game go on: the hero walks away', () => {
    const game = askingGame();
    const before = playingView(game).hero.position;
    game.send(CANCEL);

    walk(game, 'left', 16);

    expect(playingView(game).hero.position.x).toBeLessThan(before.x);
  });

  it('lets the hero ask again at once, and the vessel is not prepared a second time', () => {
    const game = askingGame();
    game.send(CANCEL);
    expect(playingView(game).departure).toBeNull();

    const events = game.send(INTERACT);

    expect(events).toEqual([]);
    expect(playingView(game).departure).toEqual(ASKED_ABOUT_THE_VESSEL);
  });

  it('lets the hero walk away, come back and be asked again', () => {
    const game = askingGame();
    game.send(CANCEL);
    expect(playingView(game).departure).toBeNull();
    walk(game, 'left', 16);
    walk(game, 'right', 60);
    expect(playingView(game).departure).toBeNull();

    const events = game.send(INTERACT);

    expect(events).toEqual([]);
    expect(playingView(game).departure).toEqual(ASKED_ABOUT_THE_VESSEL);
  });

  it('declines the question of a game that was continued with it open', () => {
    const asking = askingGame();
    const continued = continuedFrom(harborContent(), asking.snapshot());

    continued.send(CANCEL);

    expect(playingView(continued).departure).toBeNull();
    expect(advance(continued, 1)).toEqual([]);
  });

  it('is ignored when no question is open: nothing changes, and a vessel not yet prepared is not prepared', () => {
    const prepared = preparedGame();
    const unprepared = harborGame();
    const preparedBefore = prepared.snapshot();
    const unpreparedBefore = unprepared.snapshot();

    expect(prepared.send(CANCEL)).toEqual([]);
    expect(unprepared.send(CANCEL)).toEqual([]);

    expect(prepared.snapshot()).toEqual(preparedBefore);
    expect(unprepared.snapshot()).toEqual(unpreparedBefore);
  });

  it('is ignored at the title', () => {
    const game = gameAtTitle(harborContent());

    expect(game.send(CANCEL)).toEqual([]);
    expect(game.view().phase).toBe('title');
  });
});
