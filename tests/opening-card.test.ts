import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../src/adapter/config';
import { layoutCard, OPENING_HINT } from '../src/adapter/opening-card';
import { drawText, textWidthOf } from '../src/adapter/pixel-font';
import type { Graphics } from '../src/adapter/pixel-font';
import { gameContent } from '../src/content';

// The card of the opening, as it is laid out on the screen. Drawing it is not tested; where its text goes is.

const SHIPPED = gameContent.opening ?? [];
/** A line wider than the card, which breaks into two rows. */
const WIDE_LINE = 'Sea and storm and sand '.repeat(3).trim();
/** The longest opening the core takes: four lines, each wider than the card and longer than the content keeps one. */
const FOUR_LONG_LINES = Array.from({ length: 4 }, (_, at) => `${WIDE_LINE} ${at}`);

/** How many rectangles the pixel font draws for the text: none for a character it does not have. */
function rectanglesDrawnFor(text: string): number {
  let rectangles = 0;
  const graphics = {
    fillStyle: () => graphics,
    fillRect: () => {
      rectangles += 1;
      return graphics;
    },
  } as unknown as Graphics;
  drawText(graphics, text, 0, 0, 0xffffff);
  return rectangles;
}

/** From the top of the first row to the top of the second, for lines that lay out as two rows. */
function stepOfTwoRows(lines: readonly string[]): number {
  const { rows } = layoutCard(lines);
  expect(rows).toHaveLength(2);
  const [first = 0, second = 0] = rows.map((row) => row.top);
  return second - first;
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

  it('has a hint under the lines, and the card holds both', () => {
    const { window, rows, hint } = layoutCard(SHIPPED);

    expect(hint.text).toBe(OPENING_HINT);
    expect(hint.top).toBeGreaterThan(Math.max(...rows.map((row) => row.top)));
    expect(hint.top).toBeLessThan(window.top + window.height);
    expect(hint.left).toBeGreaterThanOrEqual(window.left);
    expect(hint.left + textWidthOf(hint.text)).toBeLessThanOrEqual(window.left + window.width);
  });

  it('holds the hint even when the lines are shorter than it', () => {
    const { window, hint } = layoutCard(['Hi.']);

    expect(hint.left).toBeGreaterThanOrEqual(window.left);
    expect(hint.left + textWidthOf(hint.text)).toBeLessThanOrEqual(window.left + window.width);
  });

  it('puts more air between two lines of the opening than between the two rows of one line that was broken', () => {
    expect(stepOfTwoRows(['A storm.', 'The sea.'])).toBeGreaterThan(stepOfTwoRows([WIDE_LINE]));
  });

  it('centres each row in the card', () => {
    const { window, rows } = layoutCard(SHIPPED);

    for (const row of rows) {
      const room = window.width - textWidthOf(row.text);
      expect(Math.abs((row.left - window.left) * 2 - room)).toBeLessThanOrEqual(1);
    }
  });

  it.each([
    ['the opening the game ships with', SHIPPED],
    ['four long lines', FOUR_LONG_LINES],
    ['one short line', ['A storm.']],
  ])('is whole on the screen, in the middle of it, for %s', (_name, lines) => {
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
      for (const character of line.replaceAll(' ', '')) {
        expect(rectanglesDrawnFor(character), `the pixel font has no '${character}' in "${line}"`).toBeGreaterThan(0);
      }
    }
  });
});
