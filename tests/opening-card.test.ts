import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../src/adapter/config';
import { openingControlsHint, pageKeyLabel } from '../src/adapter/controls';
import { layoutEnding } from '../src/adapter/ending-pages';
import { CARD_MAX_HEIGHT, layoutCard, OPENING_HINT, SIDE_MARGIN } from '../src/adapter/opening-card';
import type { Placed } from '../src/adapter/opening-card';
import { TEXT_HEIGHT, textWidthOf } from '../src/adapter/pixel-font';
import { gameContent } from '../src/content';
import { charactersTheFontLacks } from './drawn-text';

// The card of the opening, as it is laid out on the screen. Drawing it is not tested; where its text goes is.

const SHIPPED = gameContent.opening ?? [];
/** A line wider than the card, which breaks into two rows. */
const WIDE_LINE = 'Sea and storm and sand '.repeat(3).trim();
/** The longest opening the core takes: four lines, each wider than the card and longer than the content keeps one. */
const FOUR_LONG_LINES = Array.from({ length: 4 }, (_, at) => `${WIDE_LINE} ${at}`);
/** The openings the card is laid out for in the tests that hold for all of them. */
const OPENINGS: readonly (readonly [string, readonly string[]])[] = [
  ['the opening the game ships with', SHIPPED],
  ['four long lines', FOUR_LONG_LINES],
  ['one short line', ['A storm.']],
];

/** From the top of the first row to the top of the second, for lines that lay out as two rows. */
function stepOfTwoRows(lines: readonly string[]): number {
  const { rows } = layoutCard(lines);
  expect(rows).toHaveLength(2);
  const [first = 0, second = 0] = rows.map((row) => row.top);
  return second - first;
}

/** The line of the card that says what H does in play, which the opening has and the ending does not. */
function secondHintOf(lines: readonly string[]): Placed {
  const { secondHint } = layoutCard(lines);
  if (secondHint === undefined) {
    throw new Error('The card of the opening has no second hint.');
  }
  return secondHint;
}

describe('the card of the opening', () => {
  it('breaks a line that is wider than the card into rows that are not', () => {
    const { window, rows } = layoutCard(FOUR_LONG_LINES);

    expect(rows.length).toBeGreaterThan(FOUR_LONG_LINES.length);
    for (const row of rows) {
      expect(row.left).toBeGreaterThanOrEqual(window.left);
      expect(row.left + textWidthOf(row.text)).toBeLessThanOrEqual(window.left + window.width);
    }
  });

  it('keeps every word of every line in the order given, one row under the other', () => {
    const { rows } = layoutCard(FOUR_LONG_LINES);

    expect(rows.map((row) => row.text).join(' ')).toBe(FOUR_LONG_LINES.join(' '));
    const tops = rows.map((row) => row.top);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(new Set(tops).size).toBe(tops.length);
  });

  it('has a hint under the lines', () => {
    const { window, rows, hint } = layoutCard(SHIPPED);

    expect(hint.text).toBe(OPENING_HINT);
    expect(hint.top).toBeGreaterThan(Math.max(...rows.map((row) => row.top)));
    expect(hint.left).toBeGreaterThanOrEqual(window.left);
    expect(hint.left + textWidthOf(hint.text)).toBeLessThanOrEqual(window.left + window.width);
  });

  it('has a second hint under the first that says what H does in play, worked out by hand for the opening the game ships', () => {
    // Four lines of one row each, the widest 43 letters (257 pixels), so the window is 257 + 24 = 281 wide. The rows are
    // 17 apart (7 high and 10 of air), so the last is at 51; the hint is 7 + 14 under it (72) and the second hint 7 + 4
    // under the hint (83), and the window is 83 + 7 + 24 = 114 high, which puts its top at (192 - 114) / 2 = 39 and its
    // left at (320 - 281) / 2 = 19. The text starts 12 inside the window: the second hint at 39 + 12 + 83 = 134, and
    // 19 + (281 - 173) / 2 = 73 from the left, as the hint is at 19 + (281 - 83) / 2 = 118 and 39 + 12 + 72 = 123.
    const { window, hint, secondHint } = layoutCard(SHIPPED);

    expect(window).toEqual({ left: 19, top: 39, width: 281, height: 114 });
    expect(hint).toEqual({ text: 'ENTER TO BEGIN', left: 118, top: 123 });
    expect(secondHint).toEqual({ text: 'IN PLAY, H SHOWS THE CONTROLS', left: 73, top: 134 });
  });

  it('has the words that the controls table makes for it, so that a key that is changed changes the card', () => {
    const { text } = secondHintOf(SHIPPED);

    expect(text).toBe(openingControlsHint());
    expect(` ${text} `).toContain(` ${pageKeyLabel('controls')} `);
  });

  it.each(OPENINGS)('keeps the second hint 11 pixels under the first, a row of text and 4 of air, for %s', (_name, lines) => {
    expect(secondHintOf(lines).top - layoutCard(lines).hint.top).toBe(TEXT_HEIGHT + 4);
  });

  it.each(OPENINGS)('fits the second hint in the window and centres it there, for %s', (_name, lines) => {
    const { window } = layoutCard(lines);
    const secondHint = secondHintOf(lines);

    expect(secondHint.left).toBeGreaterThanOrEqual(window.left);
    expect(secondHint.left + textWidthOf(secondHint.text)).toBeLessThanOrEqual(window.left + window.width);
    const room = window.width - textWidthOf(secondHint.text);
    expect(Math.abs((secondHint.left - window.left) * 2 - room)).toBeLessThanOrEqual(1);
  });

  it.each(OPENINGS)(
    'holds the rows and both hints with as much air below its last line, the second hint, as above its first row, for %s',
    (_name, lines) => {
      const { window, rows } = layoutCard(lines);
      const airAbove = Math.min(...rows.map((row) => row.top)) - window.top;
      const airBelow = window.top + window.height - (secondHintOf(lines).top + TEXT_HEIGHT);

      expect(airBelow).toBe(airAbove);
    },
  );

  it('keeps the tallest card, with the second hint, 158 high: 10 under the most a card may be, and clear of the top and bottom', () => {
    // Eight rows (four lines of two): tops 0, 11, 28, 39, 56, 67, 84, 95. The hint is 7 + 14 under the last (116), the
    // second hint 7 + 4 under that (127), and the window 127 + 7 + 24 = 158 high, at (192 - 158) / 2 = 17 from the top.
    const { window } = layoutCard(FOUR_LONG_LINES);

    expect(layoutCard(FOUR_LONG_LINES).rows).toHaveLength(8);
    expect(window.height).toBe(158);
    expect(window.top).toBe(17);
    expect(CARD_MAX_HEIGHT).toBe(168);
    expect(window.top).toBeGreaterThanOrEqual(SIDE_MARGIN);
    expect(VIEW_HEIGHT - (window.top + window.height)).toBeGreaterThanOrEqual(SIDE_MARGIN);
  });

  it('makes the card as wide as the second hint when the lines are shorter than it', () => {
    // One row of 47 pixels, the hint of 83 and the second hint of 173: the window is 173 + 24 = 197 wide, and 7 + 14 + 7
    // + 4 + 7 + 24 = 63 high, which puts it at (320 - 197) / 2 = 61 and (192 - 63) / 2 = 64, as near the middle as whole pixels go.
    expect(layoutCard(['A storm.']).window).toEqual({ left: 61, top: 64, width: 197, height: 63 });
  });

  it('gives the card of the ending and of the credits no second hint: the line is the opening alone', () => {
    const cards = layoutEnding(gameContent.ending ?? [], gameContent.credits ?? []);

    expect(cards.length).toBeGreaterThan(1);
    for (const card of cards) {
      expect(card).not.toHaveProperty('secondHint');
    }
  });

  it('sets the hint apart from the lines at least as far as two lines of the opening are apart', () => {
    const { rows, hint } = layoutCard(['A storm.', 'The sea.']);

    const [first = 0, second = 0] = rows.map((row) => row.top);
    expect(hint.top - second).toBeGreaterThanOrEqual(second - first);
  });

  it('holds the hint even when the lines are shorter than it', () => {
    const { window, hint } = layoutCard(['Hi.']);

    expect(hint.left).toBeGreaterThanOrEqual(window.left);
    expect(hint.left + textWidthOf(hint.text)).toBeLessThanOrEqual(window.left + window.width);
  });

  it('puts more air between two lines of the opening than between the two rows of one line that was broken', () => {
    expect(stepOfTwoRows(['A storm.', 'The sea.'])).toBeGreaterThan(stepOfTwoRows([WIDE_LINE]));
  });

  it('does not let the two rows of a broken line touch', () => {
    expect(stepOfTwoRows([WIDE_LINE])).toBeGreaterThan(TEXT_HEIGHT);
  });

  it('keeps clear of the sides of the screen when the lines are as wide as they can be', () => {
    const { window } = layoutCard(FOUR_LONG_LINES);

    expect(window.left).toBeGreaterThanOrEqual(8);
  });

  it('centres each row in the card', () => {
    const { window, rows } = layoutCard(SHIPPED);

    for (const row of rows) {
      const room = window.width - textWidthOf(row.text);
      expect(Math.abs((row.left - window.left) * 2 - room)).toBeLessThanOrEqual(1);
    }
  });

  it.each(OPENINGS)('is whole on the screen, in the middle of it, for %s', (_name, lines) => {
    const { window } = layoutCard(lines);

    expect(window.left).toBeGreaterThanOrEqual(0);
    expect(window.top).toBeGreaterThanOrEqual(0);
    expect(window.left + window.width).toBeLessThanOrEqual(VIEW_WIDTH);
    expect(window.top + window.height).toBeLessThanOrEqual(VIEW_HEIGHT);
    expect(Math.abs(window.left * 2 + window.width - VIEW_WIDTH)).toBeLessThanOrEqual(1);
    expect(Math.abs(window.top * 2 + window.height - VIEW_HEIGHT)).toBeLessThanOrEqual(1);
  });

  it('shows every character of the opening the game ships with: the pixel font draws each one', () => {
    for (const line of SHIPPED) {
      expect(charactersTheFontLacks(line), `the pixel font lacks characters of "${line}"`).toEqual([]);
    }
  });
});
