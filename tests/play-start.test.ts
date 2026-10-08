import { describe, expect, it } from 'vitest';
import { startOfNewGame } from '../src/adapter/scene-keys';
import type { GameEvent } from '../src/core';

// What the title tells the play screen as it starts it. The opening is the core's to give and the play screen's to
// show: the title only hands the lines over.

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
