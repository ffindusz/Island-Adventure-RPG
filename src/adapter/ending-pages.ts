import type { ContentDefinition } from '../core';
import { wrapText } from './area-banner';
import { CARD_MAX_HEIGHT, CARD_TEXT_WIDTH, layoutRows } from './opening-card';
import type { CardLayout } from './opening-card';
import { textWidthOf, undrawableIn } from './pixel-font';

// The ending and the credits as the screen shows them: cards one after another, the ending first. The Game core gives
// both as lines of text and says nothing of the screen, so this breaks the lines into rows that fit a card and the
// rows into as many cards as the screen needs, and says what Enter does among the cards. It is worked out apart from
// the drawing, so that it can be tested (ending-scene.ts draws and flips the pages).

/** What the card tells the player under a page that another follows, and under the last page. */
export const CONTINUE_HINT = 'ENTER TO CONTINUE';
export const TITLE_HINT = 'ENTER FOR THE TITLE';

/** One card of the ending or the credits: where its window, its rows and its hint go. */
export type EndingPage = CardLayout;

/**
 * The places where a word too wide for a row may break: after a slash, a hyphen or a dot, or after a run of them, so
 * that the two slashes of "https://" stay together. What follows the last of them is a piece too.
 */
const PIECE = /[^/.-]*[/.-]+|[^/.-]+/g;

/**
 * Breaks a line into rows no wider than `widest` canvas pixels: at spaces, as the opening does, and a word that is
 * still too wide, such as a link, after a slash, a hyphen or a dot. A word that has none of those is cut by characters
 * as the last resort, because a row that sticks out of the card cannot be read.
 */
export function breakIntoRows(line: string, widest: number): string[] {
  // A row of `wrapText` is too wide only when it is one word, which has a row to itself.
  return wrapText(line, widest).flatMap((row) => (textWidthOf(row) > widest ? breakWord(row, widest) : [row]));
}

function breakWord(word: string, widest: number): string[] {
  const rows: string[] = [];
  let row = '';
  for (const piece of word.match(PIECE) ?? [word]) {
    for (const part of cutToFit(piece, widest)) {
      if (row !== '' && textWidthOf(row + part) > widest) {
        rows.push(row);
        row = part;
      } else {
        row += part;
      }
    }
  }
  if (row !== '') {
    rows.push(row);
  }
  return rows;
}

/** The text in as many parts as it takes for each to be no wider than `widest`, each as long as it can be. */
function cutToFit(text: string, widest: number): string[] {
  const parts: string[] = [];
  let rest = [...text];
  while (textWidthOf(rest.join('')) > widest) {
    let length = rest.length - 1;
    while (length > 1 && textWidthOf(rest.slice(0, length).join('')) > widest) {
      length -= 1;
    }
    parts.push(rest.slice(0, length).join(''));
    rest = rest.slice(length);
  }
  parts.push(rest.join(''));
  return parts;
}

/**
 * Sets lines out over as many cards as the screen needs. A card holds whole lines, as many as fit; a line that is
 * taller than a card by itself goes over cards a row at a time.
 */
function paginate(lines: readonly string[]): (readonly string[])[][] {
  const fits = (card: readonly (readonly string[])[]): boolean =>
    layoutRows(card, CONTINUE_HINT).window.height <= CARD_MAX_HEIGHT;
  const pages: (readonly string[])[][] = [];
  let page: (readonly string[])[] = [];
  for (const line of lines) {
    const rows = breakIntoRows(line, CARD_TEXT_WIDTH);
    for (const piece of fits([rows]) ? [rows] : rows.map((row) => [row])) {
      // A piece fits a card by itself, so a card that has to make room for one is never empty.
      if (!fits([...page, piece])) {
        pages.push(page);
        page = [];
      }
      page.push(piece);
    }
  }
  if (page.length > 0) {
    pages.push(page);
  }
  return pages;
}

/**
 * The cards of the ending and then of the credits, in the order the player reads them. The ending and the credits never
 * share a card. Every card but the last says to go on, and the last says that it leads to the title.
 */
export function layoutEnding(ending: readonly string[], credits: readonly string[]): EndingPage[] {
  const cards = [...paginate(ending), ...paginate(credits)];
  return cards.map((card, at) => layoutRows(card, at === cards.length - 1 ? TITLE_HINT : CONTINUE_HINT));
}

/** Where the player is among the pages, and whether the reading is over: Enter on the last page. */
export interface Reading {
  readonly page: number;
  readonly done: boolean;
}

/**
 * What Enter does among the pages: it turns to the next, one at a time, and from the last it ends the reading, after
 * which the game goes on to the title. No other key does either, so that nothing skips a page the player has not read.
 */
export function turnPage(page: number, pageCount: number, confirm: boolean): Reading {
  if (!confirm) {
    return { page, done: false };
  }
  return page >= pageCount - 1 ? { page, done: true } : { page: page + 1, done: false };
}

/** What the ending and credits of the content lack in the pixel font, as the player would see the gaps: where each is. */
function lacksIn(name: string, lines: readonly string[]): string[] {
  return lines.flatMap((line, at) =>
    [...new Set(undrawableIn(line))].map((character) => {
      const code = (character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0');
      return `${JSON.stringify(character)} (U+${code}) in line ${at + 1} of ${name}`;
    }),
  );
}

/**
 * Throws, naming each one and where it is, when the ending or the credits has a character the pixel font cannot draw.
 * The font leaves such a character blank, so the player would read a word with a gap in it: that is worth refusing to
 * start for, as it is for a picture that is missing.
 */
export function requireDrawableEnding(content: Pick<ContentDefinition, 'ending' | 'credits'>): void {
  const lacks = [...lacksIn('the ending', content.ending ?? []), ...lacksIn('the credits', content.credits ?? [])];
  if (lacks.length > 0) {
    throw new Error(`The pixel font cannot draw the text of the ending and the credits: ${lacks.join(', ')}`);
  }
}
