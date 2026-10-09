import { describe, expect, it } from 'vitest';
import { wrapText } from '../src/adapter/area-banner';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../src/adapter/config';
import {
  breakIntoRows,
  CONTINUE_HINT,
  layoutEnding,
  requireDrawableEnding,
  TITLE_HINT,
  turnPage,
} from '../src/adapter/ending-pages';
import type { EndingPage } from '../src/adapter/ending-pages';
import { CARD_MAX_HEIGHT, CARD_TEXT_WIDTH, SIDE_MARGIN } from '../src/adapter/opening-card';
import { textWidthOf } from '../src/adapter/pixel-font';
import { gameContent } from '../src/content';

// The ending and the credits as the screen sets them out: the lines broken into rows that fit the card, the rows into
// pages that fit the screen, and what the page says under them. Drawing is not tested; where the text goes is.

const ENDING = gameContent.ending ?? [];
const CREDITS = gameContent.credits ?? [];
const LINK = 'https://pixel-boy.itch.io/ninja-adventure-asset-pack';
/** More of the text than a card holds, in short lines. */
const MANY_LINES = Array.from({ length: 30 }, (_, at) => `Line ${at + 1} of the credits.`);
/** One line that alone is taller than the screen: it has spaces, so it breaks into many rows. */
const ENDLESS_LINE = 'Sea and storm and sand '.repeat(120).trim();

/** The text of the rows of a page, with every space left out: a broken link has none to lose, a broken sentence has. */
function squashed(rows: readonly { readonly text: string }[]): string {
  return rows
    .map((row) => row.text)
    .join('')
    .replaceAll(/\s+/g, '');
}

function squashedLines(lines: readonly string[]): string {
  return lines.join('').replaceAll(/\s+/g, '');
}

function textOfPages(pages: readonly EndingPage[]): string {
  return pages.map((page) => squashed(page.rows)).join('');
}

describe('a line of the ending broken into rows', () => {
  it('stays one row when it fits', () => {
    expect(breakIntoRows('Thank you for playing!', CARD_TEXT_WIDTH)).toEqual(['Thank you for playing!']);
  });

  it('breaks at spaces, as the opening does, when every word fits a row', () => {
    const line = 'Sea and storm and sand '.repeat(5).trim();

    expect(breakIntoRows(line, CARD_TEXT_WIDTH)).toEqual(wrapText(line, CARD_TEXT_WIDTH));
    expect(breakIntoRows(line, CARD_TEXT_WIDTH).length).toBeGreaterThan(1);
  });

  it('breaks a word that is wider than a row after a slash, a hyphen or a dot, and every row is narrow enough', () => {
    const rows = breakIntoRows(LINK, CARD_TEXT_WIDTH);

    expect(rows.length).toBeGreaterThan(1);
    expect(rows.join('')).toBe(LINK);
    for (const row of rows) {
      expect(textWidthOf(row), row).toBeLessThanOrEqual(CARD_TEXT_WIDTH);
    }
    for (const row of rows.slice(0, -1)) {
      expect(row, 'a row that is not the last ends where a link may break').toMatch(/[/.-]$/);
    }
  });

  it('keeps the two slashes of "https://" together, even when the row has room for only one of them', () => {
    // Nineteen pieces of two characters fill a row up to the first slash: the second would not fit.
    const rows = breakIntoRows(`${'x.'.repeat(19)}https://abc`, CARD_TEXT_WIDTH);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe('x.'.repeat(19));
    expect(rows[1]).toBe('https://abc');
  });

  it('fills a row before it starts the next when it breaks a word', () => {
    const rows = breakIntoRows(LINK, CARD_TEXT_WIDTH);

    rows.slice(0, -1).forEach((row, at) => {
      const next = rows[at + 1] ?? '';
      const nextPiece = /^[^/.-]*[/.-]+|^[^/.-]+/.exec(next)?.[0] ?? next;
      expect(textWidthOf(row + nextPiece), `${row} could take ${nextPiece}`).toBeGreaterThan(CARD_TEXT_WIDTH);
    });
  });

  it('puts the link of a line on rows of its own, after the words that came before it', () => {
    const rows = breakIntoRows(`Ninja Adventure Asset Pack by Pixel-Boy and AAA (CC0), ${LINK}`, CARD_TEXT_WIDTH);

    expect(rows.slice(0, 2)).toEqual(['Ninja Adventure Asset Pack by Pixel-Boy and', 'AAA (CC0),']);
    expect(rows.slice(2).join('')).toBe(LINK);
  });

  it('cuts a word that has no place to break, by characters, as the last resort', () => {
    const word = 'A'.repeat(200);

    const rows = breakIntoRows(word, CARD_TEXT_WIDTH);

    expect(rows.length).toBeGreaterThan(1);
    expect(rows.join('')).toBe(word);
    for (const row of rows.slice(0, -1)) {
      expect(textWidthOf(`${row}A`)).toBeGreaterThan(CARD_TEXT_WIDTH);
    }
    for (const row of rows) {
      expect(textWidthOf(row)).toBeLessThanOrEqual(CARD_TEXT_WIDTH);
    }
  });

  it('cuts off only what does not fit: a word one character too wide leaves that one character', () => {
    const fullRow = 'A'.repeat(Math.floor((CARD_TEXT_WIDTH + 1) / 6));

    expect(textWidthOf(fullRow)).toBeLessThanOrEqual(CARD_TEXT_WIDTH);
    expect(breakIntoRows(`${fullRow}A`, CARD_TEXT_WIDTH)).toEqual([fullRow, 'A']);
  });

  it('keeps every character in order, whatever it breaks', () => {
    const line = `Before ${LINK} and ${'B'.repeat(90)} after.`;

    expect(squashedLines(breakIntoRows(line, CARD_TEXT_WIDTH))).toBe(squashedLines([line]));
  });

  it('does not break a word that fits a row, even when it holds a slash', () => {
    expect(breakIntoRows('a/b-c.d and e', CARD_TEXT_WIDTH)).toEqual(['a/b-c.d and e']);
  });
});

describe('the ending and the credits as pages', () => {
  it('are two pages for the game as it ships: the ending, then the credits', () => {
    const pages = layoutEnding(ENDING, CREDITS);

    expect(pages).toHaveLength(2);
    expect(squashed(pages[0]?.rows ?? [])).toBe(squashedLines(ENDING));
    expect(squashed(pages[1]?.rows ?? [])).toBe(squashedLines(CREDITS));
  });

  it('keep the ending and the credits apart even when both are short enough for one card', () => {
    expect(layoutEnding(['The end.'], ['Thanks.'])).toHaveLength(2);
  });

  it('tell the player to go on under every page but the last, and what the last does under it', () => {
    const pages = layoutEnding(ENDING, MANY_LINES);

    expect(pages.length).toBeGreaterThan(2);
    for (const page of pages.slice(0, -1)) {
      expect(page.hint.text).toBe(CONTINUE_HINT);
    }
    expect(pages.at(-1)?.hint.text).toBe(TITLE_HINT);
    expect(CONTINUE_HINT).not.toBe(TITLE_HINT);
  });

  it('say that the last page leads to the title', () => {
    expect(TITLE_HINT).toMatch(/TITLE/);
    expect(layoutEnding(ENDING, CREDITS).at(-1)?.hint.text).toBe(TITLE_HINT);
  });

  it('keep every character of the text, in order, however long it is', () => {
    for (const credits of [CREDITS, MANY_LINES, [ENDLESS_LINE], [LINK]]) {
      const pages = layoutEnding(ENDING, credits);

      expect(textOfPages(pages)).toBe(squashedLines([...ENDING, ...credits]));
    }
  });

  it('show the whole link of the credits the game ships with', () => {
    const link = CREDITS.join(' ').match(/https:\/\/\S+/)?.[0];
    const credits = layoutEnding(ENDING, CREDITS).at(-1);

    expect(link).toBeDefined();
    expect(squashed(credits?.rows ?? [])).toContain(link);
  });

  it.each([
    ['the ending and the credits the game ships with', ENDING, CREDITS],
    ['thirty lines of credits', ENDING, MANY_LINES],
    ['one line of credits taller than the screen', ENDING, [ENDLESS_LINE]],
    ['an ending of four such lines', [ENDLESS_LINE, ENDLESS_LINE, ENDLESS_LINE, ENDLESS_LINE], CREDITS],
    ['a link and a word without a place to break', ['a'], [LINK, 'W'.repeat(300)]],
  ])('are whole on the screen, for %s', (_name, ending, credits) => {
    for (const { window, rows, hint } of layoutEnding(ending, credits)) {
      expect(window.left).toBeGreaterThanOrEqual(SIDE_MARGIN);
      expect(window.top).toBeGreaterThanOrEqual(SIDE_MARGIN);
      expect(window.left + window.width).toBeLessThanOrEqual(VIEW_WIDTH - SIDE_MARGIN);
      expect(window.top + window.height).toBeLessThanOrEqual(VIEW_HEIGHT - SIDE_MARGIN);
      expect(window.height).toBeLessThanOrEqual(CARD_MAX_HEIGHT);
      for (const placed of [...rows, hint]) {
        expect(placed.left, placed.text).toBeGreaterThanOrEqual(window.left);
        expect(placed.left + textWidthOf(placed.text), placed.text).toBeLessThanOrEqual(window.left + window.width);
        expect(placed.top, placed.text).toBeGreaterThanOrEqual(window.top);
      }
    }
  });

  it('hold as many lines as fit a page, so that thirty short lines are not thirty pages', () => {
    const pages = layoutEnding(ENDING, MANY_LINES);

    expect(pages.length).toBeGreaterThan(2);
    expect(pages.length).toBeLessThan(2 + 10);
  });

  it('keep the rows of a line together on one page when they fit one', () => {
    const lines = Array.from({ length: 9 }, (_, at) => `Line ${at + 1}: ${'Sea and storm and sand '.repeat(4).trim()}`);

    const pages = layoutEnding(['a'], lines);

    expect(pages.length).toBeGreaterThan(2);
    for (const line of lines) {
      const whole = pages.filter((page) => squashed(page.rows).includes(squashedLines([line])));
      expect(whole, line).toHaveLength(1);
    }
  });

  it('go over more pages when one line alone is taller than the screen', () => {
    const pages = layoutEnding(ENDING, [ENDLESS_LINE]);

    expect(pages.length).toBeGreaterThan(3);
  });

  it('are in the middle of the screen, whatever they hold', () => {
    for (const { window } of layoutEnding(ENDING, CREDITS)) {
      expect(Math.abs(window.left * 2 + window.width - VIEW_WIDTH)).toBeLessThanOrEqual(1);
      expect(Math.abs(window.top * 2 + window.height - VIEW_HEIGHT)).toBeLessThanOrEqual(1);
    }
  });
});

describe('the ending and the credits that the pixel font cannot draw', () => {
  it('are refused, naming each character and where it is', () => {
    expect(() => requireDrawableEnding({ ending: ['Fine.', 'A storm; a calm.'], credits: ['Fine.'] })).toThrow(
      /";" \(U\+003B\) in line 2 of the ending/,
    );
    expect(() => requireDrawableEnding({ ending: ['Fine.'], credits: ['Fine.', 'Fine.', 'Tom & Jerry'] })).toThrow(
      /"&" \(U\+0026\) in line 3 of the credits/,
    );
  });

  it('are refused for every one of them at once, a character once for each line it is in', () => {
    let message = '';
    try {
      requireDrawableEnding({ ending: ['a;;b;'], credits: ['é', '"é"'] });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message.match(/U\+003B/g)).toHaveLength(1);
    expect(message.match(/U\+00E9/g)).toHaveLength(2);
    expect(message).toContain('in line 1 of the ending');
    expect(message).toContain('in line 1 of the credits');
    expect(message).toContain('in line 2 of the credits');
    expect(message).toContain('(U+0022)');
  });

  it('are not found in the game as it ships', () => {
    expect(() => requireDrawableEnding(gameContent)).not.toThrow();
  });

  it('are not looked for when there is no ending or credits', () => {
    expect(() => requireDrawableEnding({})).not.toThrow();
  });
});

describe('Enter on the pages of the ending', () => {
  it('turns to the next page, one page at a time', () => {
    expect(turnPage(0, 3, true)).toEqual({ page: 1, done: false });
    expect(turnPage(1, 3, true)).toEqual({ page: 2, done: false });
  });

  it('leaves for the title from the last page, and from no page before it', () => {
    expect(turnPage(2, 3, true)).toEqual({ page: 2, done: true });
    expect(turnPage(1, 3, true).done).toBe(false);
    expect(turnPage(0, 3, true).done).toBe(false);
  });

  it('does nothing when Enter was not pressed, on any page', () => {
    for (const page of [0, 1, 2]) {
      expect(turnPage(page, 3, false)).toEqual({ page, done: false });
    }
  });

  it('leaves at once from a single page', () => {
    expect(turnPage(0, 1, true)).toEqual({ page: 0, done: true });
  });

  it('leaves rather than wait for a page that is not there', () => {
    expect(turnPage(0, 0, true).done).toBe(true);
  });

  it('shows every page of the game as it ships once, in order, and leaves with the Enter after the last', () => {
    const pageCount = layoutEnding(ENDING, CREDITS).length;
    const shown = [0];
    let reading = { page: 0, done: false };
    let presses = 0;
    while (!reading.done && presses < 100) {
      reading = turnPage(reading.page, pageCount, true);
      presses += 1;
      if (!reading.done) {
        shown.push(reading.page);
      }
    }

    expect(shown).toEqual(Array.from({ length: pageCount }, (_, at) => at));
    expect(presses).toBe(pageCount);
  });
});
