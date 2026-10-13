import { describe, expect, it } from 'vitest';
import type { Game, GameEvent, PlayingView } from '../src/core';
import {
  ATTACK,
  CLOSE_STATS,
  INTERACT,
  OPEN_STATS,
  advance,
  arena,
  continuedFrom,
  face,
  gameAtTitle,
  newGame,
  playingView,
  prizes,
  signAt,
  walk,
} from './fixtures';
import { world } from './cellar-fixtures';
import { askingGame } from './harbor-fixtures';

// The command dismiss-area-text puts away the text of an Adventure Area or of a sign that shows: the view's `areaText`
// is null afterwards, and the command tells nothing. The adapter sends it when the player presses a key, so the core
// does not ask what the key was. The text is the game's state, which is why this is the core's: a text hidden by the
// adapter alone would come back when a page closes, or in a game continued from a save.
//
// The test arena is fixtures.ts's own: the hero stands at (3.5, 3.5) facing down, and text stays 4 seconds, which are
// 240 steps, unless the content says otherwise.

const DISMISS = { type: 'dismiss-area-text' } as const;
const TEXT = 'A quiet arena.';
const CELLAR_TEXT = 'A damp cellar.';
const CLUE = 'The lever hides behind the old well.';
const READ = { type: 'sign-read', signId: 'sign-1', text: CLUE } as const;

/** The arena with a sign right above the hero. */
function signAbove(options: { text?: string } = {}) {
  return arena({ ...options, interactables: [signAt('sign-1', 3, 2, CLUE)] });
}

/** The hero turns to the sign above it and presses Interact. Returns what happened. */
function readSign(game: Game): GameEvent[] {
  face(game, 'up');
  return [...game.send(INTERACT)];
}

describe('dismissing the text of an area', () => {
  it('ends the text of the first visit to an area, and tells nothing', () => {
    const game = newGame(arena({ text: TEXT }));
    expect(playingView(game).areaText).toBe(TEXT);

    expect(game.send(DISMISS)).toEqual([]);

    expect(playingView(game).areaText).toBeNull();
  });
});

describe('dismissing the text while the game waits', () => {
  // The text shows in the view of a game that waits, frozen: the adapter hides it behind the page, the Stat Point or the
  // question, and it is back when they are gone. So the key that is pressed meanwhile has to be able to end it.
  const WAITS: readonly {
    readonly wait: string;
    readonly game: () => Game;
    readonly waits: (view: PlayingView) => boolean;
    readonly end: (game: Game) => void;
  }[] = [
    {
      wait: 'a page is open',
      game: () => {
        const game = newGame(arena({ text: TEXT }));
        game.send(OPEN_STATS);
        return game;
      },
      waits: (view) => view.page !== null,
      end: (game) => game.send(CLOSE_STATS),
    },
    {
      wait: 'a Stat Point waits to be assigned',
      game: () => {
        // The first prize is below the hero, where it faces, and its 10 Experience raise the hero to Level 2.
        const game = newGame(arena({ ...prizes(10), text: TEXT }));
        game.send(ATTACK);
        return game;
      },
      waits: (view) => view.levelUp !== null,
      end: (game) => game.send({ type: 'assign-stat-point', stat: 'attack' }),
    },
    {
      wait: 'the question whether to sail home is open',
      game: () => askingGame({ text: TEXT }),
      waits: (view) => view.departure !== null,
      end: (game) => game.send({ type: 'cancel-departure' }),
    },
  ];

  it.each(WAITS)('ends the text while $wait, and the end of the wait does not bring it back', (wait) => {
    const game = wait.game();
    const before = playingView(game);
    expect(wait.waits(before)).toBe(true);
    expect(before.areaText).toBe(TEXT);

    expect(game.send(DISMISS)).toEqual([]);

    // The rest of the game is as it was: the hero's place and Health, and the page, the Stat Point or the question.
    expect(playingView(game)).toEqual({ ...before, areaText: null });
    wait.end(game);
    advance(game, 10);
    expect(playingView(game).areaText).toBeNull();
  });
});

describe('dismissing the text of an area the hero walked into', () => {
  it('ends the text, and the visit still counts: the text is not shown again when the hero comes back', () => {
    const game = newGame(world({}, { text: CELLAR_TEXT }));
    walk(game, 'right', 11);
    expect(playingView(game).areaText).toBe(CELLAR_TEXT);

    expect(game.send(DISMISS)).toEqual([]);
    expect(playingView(game).areaText).toBeNull();

    walk(game, 'left', 3);
    const events = walk(game, 'right', 3);
    expect(events).toContainEqual({ type: 'area-changed', areaId: 'cellar' });
    expect(events.map((event) => event.type)).not.toContain('area-text');
    expect(playingView(game).areaText).toBeNull();
  });

  it('leaves the text of the next area to show: only the text on the screen is put away', () => {
    const game = newGame(world({ text: TEXT }, { text: CELLAR_TEXT }));
    game.send(DISMISS);

    walk(game, 'right', 11);

    expect(playingView(game).areaText).toBe(CELLAR_TEXT);
  });
});

describe('dismissing the text of a sign', () => {
  it('ends the text, and tells nothing', () => {
    const game = newGame(signAbove());
    readSign(game);
    expect(playingView(game).areaText).toBe(CLUE);

    expect(game.send(DISMISS)).toEqual([]);

    expect(playingView(game).areaText).toBeNull();
  });

  it('ends the text of a sign that replaced the text of the area, and the text of the area does not come back', () => {
    const game = newGame(signAbove({ text: TEXT }));
    expect(readSign(game)).toEqual([READ]);
    expect(playingView(game).areaText).toBe(CLUE);

    game.send(DISMISS);

    expect(playingView(game).areaText).toBeNull();
    advance(game, 300);
    expect(playingView(game).areaText).toBeNull();
  });

  it('lets the sign be read again, and the text gets its whole time, not the time that was left', () => {
    const game = newGame(signAbove());
    readSign(game);
    advance(game, 100);
    game.send(DISMISS);

    expect(readSign(game)).toEqual([READ]);

    advance(game, 239);
    expect(playingView(game).areaText).toBe(CLUE);
    advance(game, 1);
    expect(playingView(game).areaText).toBeNull();
  });
});

describe('dismissing when there is no text', () => {
  it('does nothing in an area that has none: no event, and the saved game is as it was', () => {
    const game = newGame(arena());
    advance(game, 20);
    const before = game.snapshot();

    expect(game.send(DISMISS)).toEqual([]);

    expect(game.snapshot()).toEqual(before);
  });

  it('does nothing once the text has gone by itself', () => {
    const game = newGame(arena({ text: TEXT }));
    advance(game, 240);
    expect(playingView(game).areaText).toBeNull();
    const before = game.snapshot();

    expect(game.send(DISMISS)).toEqual([]);

    expect(game.snapshot()).toEqual(before);
  });

  it('does nothing the second time: the text is put away once', () => {
    const game = newGame(arena({ text: TEXT }));
    game.send(DISMISS);
    const before = game.snapshot();

    expect(game.send(DISMISS)).toEqual([]);

    expect(game.snapshot()).toEqual(before);
  });

  it('is ignored at the title, where no game has begun: a new game shows the text of its start area as ever', () => {
    const game = gameAtTitle(arena({ text: TEXT }));

    expect(game.send(DISMISS)).toEqual([]);

    expect(game.view()).toEqual({ phase: 'title' });
    expect(game.send({ type: 'new-game' })).toEqual([{ type: 'area-text', areaId: 'arena', text: TEXT }]);
    expect(playingView(game).areaText).toBe(TEXT);
  });
});

describe('dismissing the text and then playing on', () => {
  it('changes nothing but the text: the saved game is the same otherwise', () => {
    const game = newGame(arena({ text: TEXT }));
    game.send({ type: 'move', direction: 'right' });
    advance(game, 20);
    const before = game.snapshot();
    expect(before.state.areaText).not.toBeNull();

    game.send(DISMISS);

    expect(game.snapshot().state).toEqual({ ...before.state, areaText: null });
  });

  it('lets the steps that follow run as they do in an area that has no text, and none of them throws', () => {
    const game = newGame(arena({ text: TEXT }));
    const withoutText = newGame(arena());
    game.send(DISMISS);

    advance(game, 300);
    advance(withoutText, 300);

    expect(game.snapshot()).toEqual(withoutText.snapshot());
  });
});

describe('dismissing the text and saving the game', () => {
  const content = arena({ text: TEXT });

  it('leaves a saved game that holds no text, and a game continued from it shows none', () => {
    const game = newGame(content);
    advance(game, 100);
    game.send(DISMISS);

    const snapshot = game.snapshot();
    expect(snapshot.state.areaText).toBeNull();
    const resumed = continuedFrom(content, snapshot);

    expect(playingView(resumed).areaText).toBeNull();
    advance(resumed, 300);
    expect(playingView(resumed).areaText).toBeNull();
  });

  it('puts away the text of a game that was continued with one on show, and the save of it holds none', () => {
    const game = newGame(content);
    advance(game, 100);
    const resumed = continuedFrom(content, game.snapshot());
    expect(playingView(resumed).areaText).toBe(TEXT);

    expect(resumed.send(DISMISS)).toEqual([]);

    expect(playingView(resumed).areaText).toBeNull();
    expect(resumed.snapshot().state.areaText).toBeNull();
  });
});
