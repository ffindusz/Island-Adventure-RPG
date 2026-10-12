import { describe, expect, it } from 'vitest';
import { controlsList } from '../src/adapter/controls';
import { layoutControlsList } from '../src/adapter/controls-list';
import { panelFor, panelHeight } from '../src/adapter/overlay';
import type { Panel } from '../src/adapter/overlay';
import { textWidthOf } from '../src/adapter/pixel-font';
import { newGame, playingView } from './fixtures';

// The list of the controls is drawn in two columns, the keys and what they do, by a function of the list alone: the
// Controls page draws it in play, and the title screen can draw it too. Every number is worked out by hand from the
// pixel font: a text of n letters is 6n - 1 pixels wide (5 for each letter and 1 between), and 7 pixels tall.

describe('the layout of a list of controls', () => {
  it('puts the keys right-aligned in a column as wide as the widest, the words 8 pixels after it, and a line every 10 pixels', () => {
    const layout = layoutControlsList([
      { keys: 'W', words: 'WALK' }, // 5 and 23 wide
      { keys: 'SPACE', words: 'ATTACK' }, // 29 and 35
      { keys: 'C/TAB', words: 'STATS PAGE' }, // 29 and 59
    ]);

    // The keys column is 29 wide, so the words start at 29 + 8 = 37, and the widest of them ends at 37 + 59 = 96. Two lines
    // of 10 pixels and the 7 of the last make 27.
    expect(layout).toEqual({
      width: 96,
      height: 27,
      lines: [
        { keys: { text: 'W', left: 24, top: 0 }, words: { text: 'WALK', left: 37, top: 0 } },
        { keys: { text: 'SPACE', left: 0, top: 10 }, words: { text: 'ATTACK', left: 37, top: 10 } },
        { keys: { text: 'C/TAB', left: 0, top: 20 }, words: { text: 'STATS PAGE', left: 37, top: 20 } },
      ],
    });
  });

  describe('of the list of the game', () => {
    const layout = layoutControlsList(controlsList());

    it('is 228 pixels wide and 127 tall: the widest keys are 83 wide and the widest words 137, with 8 between, and 13 lines make 12 of 10 and 7', () => {
      expect(layout.lines).toHaveLength(13);
      expect(layout.width).toBe(83 + 8 + 137);
      expect(layout.height).toBe(12 * 10 + 7);
    });

    it('keeps every line whole within its own width and height', () => {
      for (const { keys, words } of layout.lines) {
        for (const placed of [keys, words]) {
          expect(placed.left, placed.text).toBeGreaterThanOrEqual(0);
          expect(placed.left + textWidthOf(placed.text), placed.text).toBeLessThanOrEqual(layout.width);
          expect(placed.top, placed.text).toBeGreaterThanOrEqual(0);
          expect(placed.top + 7, placed.text).toBeLessThanOrEqual(layout.height);
        }
      }
    });

    it('keeps the keys of a line at least 8 pixels from its words, so that the two never run together', () => {
      for (const { keys, words } of layout.lines) {
        expect(words.left - (keys.left + textWidthOf(keys.text)), keys.text).toBeGreaterThanOrEqual(8);
      }
    });
  });
});

/** The panel that the overlay draws when the Controls page is open, with the game in focus. */
function controlsPanel(): Panel {
  const game = newGame();
  game.send({ type: 'open-page', page: 'controls' });
  const panel = panelFor(playingView(game), true, 0);
  if (panel === null) {
    throw new Error('The overlay draws nothing for the Controls page.');
  }
  return panel;
}

describe('the Controls page on the overlay', () => {
  it('has its title, then the list of the controls laid out, then the hint to close it', () => {
    const { rows } = controlsPanel();

    expect(rows.flatMap((row) => (row.kind === 'text' ? [row.text] : []))).toEqual(['CONTROLS', 'H OR ESC TO CLOSE']);
    expect(rows.map((row) => row.kind)).toEqual(['text', 'space', 'controls', 'space', 'text']);
    expect(rows.filter((row) => row.kind === 'controls')).toEqual([
      { kind: 'controls', layout: layoutControlsList(controlsList()) },
    ]);
  });

  // The screen is 320 wide and 192 tall. The window is as wide as the list and its padding of 12 on each side: 228 + 24.
  it('is in a window as wide as the list needs and no wider than the screen', () => {
    const { width } = controlsPanel();

    expect(width).toBe(228 + 2 * 12);
    expect(width).toBeLessThanOrEqual(320);
  });

  // The window is as tall as its rows and the 4 pixels between them, and the padding of 12 above and below: the title is
  // 7, the list 127 and the hint 7, with a gap of 4 on each side of the two spaces between them, 7 + 4 + 0 + 4 + 127 + 4 +
  // 0 + 4 + 7 = 157, and 157 + 24 = 181. That leaves 11 of the 192 of the screen.
  it('is in a window as tall as the title, the list and the hint need, and no taller than the screen', () => {
    const height = panelHeight(controlsPanel());

    expect(height).toBe(157 + 2 * 12);
    expect(height).toBeLessThanOrEqual(192);
  });
});
