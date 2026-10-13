import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../src/core';
import { pausesTheGame, stopsBeforePausing } from '../src/adapter/pausing';
import type { PauseFrame } from '../src/adapter/pausing';
import {
  arena,
  biterAt,
  defeatPrize,
  gameAtTitle,
  gameWithPrizes,
  newGame,
  newGameWithMonsters,
  playingView,
  untilDefeated,
} from './fixtures';
import { askingGame, preparedGame } from './harbor-fixtures';

// pausing.ts says when Esc puts the game away for the start screen. It is a pure rule of the frame: the press of Esc
// that PlayerInput found, the view at the start of the frame and at its end, and the events the frame made. The views
// here are the Game core's own, taken before and after the commands that make the frame.

/** The press of a key that went down fresh: not the repeat of a key held down, and with no Ctrl or Cmd. */
const FRESH = { repeat: false, ctrlKey: false, metaKey: false };

/** A frame in which Esc went down fresh and the game ran, with what a test changes of it. */
function frame(changes: Partial<PauseFrame> = {}): PauseFrame {
  const view = playingView(newGame());
  return { esc: FRESH, before: view, after: view, events: [], ...changes };
}

describe('the stops that go before the pause', () => {
  it.each([
    ['up', ['down', 'left', 'right', 'up']],
    ['down', ['up', 'left', 'right', 'down']],
    ['left', ['up', 'down', 'right', 'left']],
    ['right', ['up', 'down', 'left', 'right']],
  ] as const)('for a hero that faces %s, stop the other three directions in order and then the one it faces: %j', (facing, order) => {
    expect(stopsBeforePausing(facing)).toEqual(order.map((direction) => ({ type: 'stop', direction })));
  });

  it('leave the hero standing and facing where it faced, whatever keys were held, so that nothing walks it on', () => {
    const game = newGame();
    game.send({ type: 'move', direction: 'up' });
    game.send({ type: 'move', direction: 'right' });
    const beforeStops = game.snapshot();
    const { facing, position } = playingView(game).hero;
    expect(facing).toBe('right');

    for (const command of stopsBeforePausing(facing)) {
      game.send(command);
    }

    expect(playingView(game).hero.facing).toBe('right');
    expect(game.snapshot()).toEqual(beforeStops);
    game.step();
    expect(playingView(game).hero.position).toEqual(position);
  });

  it('turn the hero to the direction still held when the stop of the direction it faces comes first, which is why it goes last', () => {
    const game = newGame();
    game.send({ type: 'move', direction: 'up' });
    game.send({ type: 'move', direction: 'right' });

    for (const command of [...stopsBeforePausing('right')].reverse()) {
      game.send(command);
    }

    expect(playingView(game).hero.facing).toBe('up');
  });
});

describe('when Esc pauses the game', () => {
  it('pauses when a fresh Esc went down in a frame of the game that ran', () => {
    expect(pausesTheGame(frame())).toBe(true);
  });

  it('pauses while the hero walks', () => {
    const game = newGame();
    const before = playingView(game);
    game.send({ type: 'move', direction: 'right' });
    game.step();
    game.step();
    const after = playingView(game);

    expect(after.hero.position).not.toEqual(before.hero.position);
    expect(pausesTheGame(frame({ before, after }))).toBe(true);
  });

  it('pauses while the text of an area is on the screen: it is not something that is open', () => {
    const shown = playingView(newGame(arena({ text: 'A quiet arena.' })));

    expect(shown.areaText).toBe('A quiet arena.');
    expect(pausesTheGame(frame({ before: shown, after: shown }))).toBe(true);
  });

  it('pauses in a frame that made other events, such as a Checkpoint touched, whose save the frame still makes', () => {
    const events: GameEvent[] = [
      { type: 'hero-hit', monsterId: 'biter', damage: 5, health: 5 },
      { type: 'checkpoint-activated', checkpointId: 'first' },
    ];

    expect(pausesTheGame(frame({ events }))).toBe(true);
  });
});

describe('when Esc does not pause the game', () => {
  it('does not pause when no Esc went down', () => {
    expect(pausesTheGame(frame({ esc: null }))).toBe(false);
  });

  it('does not pause for the repeat of an Esc that is held down: a screen that has just begun takes it for a press', () => {
    expect(pausesTheGame(frame({ esc: { ...FRESH, repeat: true } }))).toBe(false);
  });

  it('does not pause for an Esc pressed with Ctrl, which is the browser\'s', () => {
    expect(pausesTheGame(frame({ esc: { ...FRESH, ctrlKey: true } }))).toBe(false);
  });

  it('does not pause for an Esc pressed with Meta, which is the browser\'s', () => {
    expect(pausesTheGame(frame({ esc: { ...FRESH, metaKey: true } }))).toBe(false);
  });

  it('does not pause when a page was open at the start of the frame: the Esc closes it', () => {
    const game = newGame();
    game.send({ type: 'open-page', page: 'inventory' });
    const before = playingView(game);
    game.send({ type: 'close-page', page: 'inventory' });
    const after = playingView(game);

    expect(before.page).not.toBeNull();
    expect(after.page).toBeNull();
    expect(pausesTheGame(frame({ before, after }))).toBe(false);
  });

  it('does not pause when the question whether to sail home was open at the start of the frame: the Esc declines it', () => {
    const game = askingGame();
    const before = playingView(game);
    game.send({ type: 'cancel-departure' });
    const after = playingView(game);

    expect(before.departure).not.toBeNull();
    expect(after.departure).toBeNull();
    expect(pausesTheGame(frame({ before, after }))).toBe(false);
  });

  it('does not pause when a Stat Point waited at the start of the frame: the Esc does nothing to it', () => {
    const game = gameWithPrizes(10);
    defeatPrize(game, 1);
    const waiting = playingView(game);

    expect(waiting.levelUp).not.toBeNull();
    expect(pausesTheGame(frame({ before: waiting, after: waiting }))).toBe(false);
  });

  it('does not pause when a page is open at the end of the frame though it was not at the start: a page key was pressed', () => {
    const game = newGame();
    const before = playingView(game);
    game.send({ type: 'toggle-page', page: 'stats' });
    const after = playingView(game);

    expect(before.page).toBeNull();
    expect(after.page).not.toBeNull();
    expect(pausesTheGame(frame({ before, after }))).toBe(false);
  });

  it('does not pause when a Stat Point waits at the end of the frame though it did not at the start: a monster fell and raised the Level', () => {
    const game = gameWithPrizes(10);
    const before = playingView(game);
    defeatPrize(game, 1);
    const after = playingView(game);

    expect(before.levelUp).toBeNull();
    expect(after.levelUp).not.toBeNull();
    expect(pausesTheGame(frame({ before, after }))).toBe(false);
  });

  it('does not pause when the question whether to sail home is open at the end of the frame though it was not at the start', () => {
    const game = preparedGame();
    const before = playingView(game);
    game.send({ type: 'interact' });
    const after = playingView(game);

    expect(before.departure).toBeNull();
    expect(after.departure).not.toBeNull();
    expect(pausesTheGame(frame({ before, after }))).toBe(false);
  });

  it('does not pause in the frame of a defeat, though both views show a game that runs: the fall is about to be shown', () => {
    const game = newGameWithMonsters(biterAt('biter', 4, 3));
    const before = playingView(game);
    const events = untilDefeated(game, 200);
    const after = playingView(game);

    expect(events.some((event) => event.type === 'hero-defeated')).toBe(true);
    expect(after.page).toBeNull();
    expect(pausesTheGame(frame({ before, after, events }))).toBe(false);
  });

  it('does not pause when the view at the start of the frame is not of a game in play', () => {
    const title = gameAtTitle().view();

    expect(title.phase).toBe('title');
    expect(pausesTheGame(frame({ before: title }))).toBe(false);
  });

  it('does not pause when the view at the end of the frame is not of a game in play: the game went back to the title', () => {
    const title = gameAtTitle().view();

    expect(title.phase).toBe('title');
    expect(pausesTheGame(frame({ after: title }))).toBe(false);
  });
});
