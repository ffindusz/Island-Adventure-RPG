import { describe, expect, it } from 'vitest';
import {
  SCENE_KEYS,
  keptByPause,
  keptByResume,
  startOfEnding,
  startOfNewGame,
  startOfResume,
  startOfTitle,
} from '../src/adapter/scene-keys';
import type { KeptOfPlay, PlayStart, TitleStart } from '../src/adapter/scene-keys';
import type { GameEvent } from '../src/core';

// What the title tells the play screen as it starts it, and what the play screen tells the ending when the game is
// over. The opening and the ending are the core's to give and the screens' to show: the scenes only hand the lines over.
// And what the play screen tells the title when it puts a game away on Esc, and the title tells the play screen when the
// game is brought back: Phaser keeps the data of the last start of a scene that is started with none, so each start gives
// its data whole and a word of a pause can never be left over in the next start.

const LINES = ['The storm broke the ship.', 'The sea carried you ashore.'];
const WRECK: GameEvent = { type: 'area-text', areaId: 'coast', text: 'The wreck.' };

describe('the start of a new game', () => {
  it('carries the lines of the opening the core gave, wherever among its events, and saves at once', () => {
    expect(startOfNewGame([{ type: 'opening', lines: LINES }, WRECK])).toEqual({ saveAtOnce: true, opening: LINES });
    expect(startOfNewGame([WRECK, { type: 'opening', lines: LINES }])).toEqual({ saveAtOnce: true, opening: LINES });
  });

  it('carries no opening when the core gave none, and still saves at once', () => {
    expect(startOfNewGame([WRECK])).toEqual({ saveAtOnce: true });
    expect(startOfNewGame([])).toEqual({ saveAtOnce: true });
  });
});

describe('the start of the ending', () => {
  const ENDING = ['The old vessel carries you from the island.'];
  const CREDITS = ['ISLAND ADVENTURE', 'Thank you for playing!'];
  const REACHED: GameEvent = { type: 'ending-reached', ending: ENDING, credits: CREDITS };

  it('carries the ending and the credits the core gave, wherever among its events', () => {
    expect(startOfEnding([REACHED, WRECK])).toEqual({ ending: ENDING, credits: CREDITS });
    expect(startOfEnding([WRECK, REACHED])).toEqual({ ending: ENDING, credits: CREDITS });
  });

  it('is none when the core did not give the ending: the play screen goes to the title alone', () => {
    expect(startOfEnding([WRECK])).toBeNull();
    expect(startOfEnding([])).toBeNull();
  });
});

describe('the scenes', () => {
  it('are known by a key each, and the ending is not the title nor the play screen', () => {
    const keys = Object.values(SCENE_KEYS);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

/** What the play screen keeps of a game it puts away: the fight with the Guardian is on, and 2.5 seconds of the line are left. */
const KEPT: KeptOfPlay = { fight: true, controlsLineMs: 2500 };

describe('the start of the title', () => {
  it('says that the title is paused when the play screen puts a game away, and carries what it keeps of the game', () => {
    expect(startOfTitle(true, KEPT)).toEqual({ paused: true, kept: KEPT });
  });

  it('says that the title is not paused, in words, so that the word of an earlier pause does not stay', () => {
    expect(startOfTitle(false)).toEqual({ paused: false });
    expect(startOfTitle(false, KEPT)).toEqual({ paused: false });
  });

  it('keeps nothing of a game that it is not told about: no fight on, and no line that says H FOR CONTROLS', () => {
    expect(startOfTitle(true)).toEqual({ paused: true, kept: { fight: false, controlsLineMs: 0 } });
  });
});

describe('what the paused title keeps for the resume', () => {
  it('is what the play screen kept, when the data says that the title is paused', () => {
    expect(keptByPause(startOfTitle(true, KEPT))).toEqual(KEPT);
  });

  it('is nothing, as the title is not paused, when the data says that it is not', () => {
    expect(keptByPause(startOfTitle(false))).toBeNull();
    expect(keptByPause(startOfTitle(false, KEPT))).toBeNull();
  });

  it('is nothing when the title is started with no data, with empty data or with data that has no word of a pause', () => {
    const empty: TitleStart = {};

    expect(keptByPause(undefined)).toBeNull();
    expect(keptByPause(empty)).toBeNull();
    expect(keptByPause({ kept: KEPT })).toBeNull();
  });
});

describe('the start of a resume', () => {
  it('carries what the title kept, and saves nothing at once: the game is as it was and its save is the old one', () => {
    expect(startOfResume(KEPT)).toEqual({ saveAtOnce: false, resumed: KEPT });
  });

  it('has no opening, though the game it brings back began with one: the card ended long ago', () => {
    const opening = startOfNewGame([{ type: 'opening', lines: LINES }]);

    expect(opening.opening).toEqual(LINES);
    expect(startOfResume(KEPT)).not.toHaveProperty('opening');
  });
});

describe('what a start of the play screen brings back', () => {
  const CONTINUE: PlayStart = { saveAtOnce: false };

  it('is what the title kept, when the data is that of a resume', () => {
    expect(keptByResume(startOfResume(KEPT))).toEqual(KEPT);
  });

  it('is nothing for every other start: a New Game with its opening or without, a Continue, no data and empty data', () => {
    expect(keptByResume(startOfNewGame([{ type: 'opening', lines: LINES }]))).toBeNull();
    expect(keptByResume(startOfNewGame([]))).toBeNull();
    expect(keptByResume(CONTINUE)).toBeNull();
    expect(keptByResume({})).toBeNull();
    expect(keptByResume(undefined)).toBeNull();
  });
});
