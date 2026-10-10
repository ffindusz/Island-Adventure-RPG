import { describe, expect, it } from 'vitest';
import { SCENE_KEYS, startOfEnding, startOfNewGame } from '../src/adapter/scene-keys';
import type { GameEvent } from '../src/core';

// What the title tells the play screen as it starts it, and what the play screen tells the ending when the game is
// over. The opening and the ending are the core's to give and the screens' to show: the scenes only hand the lines over.

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
