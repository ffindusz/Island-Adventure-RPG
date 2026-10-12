import { describe, expect, it } from 'vitest';
import { AUTOMAP_HINT } from '../src/adapter/automap-page';
import { closePageKeyLabel, PAGE_KEYS } from '../src/adapter/controls';
import { panelFor } from '../src/adapter/overlay';
import { textWidthOf } from '../src/adapter/pixel-font';
import { WINDOW_PADDING } from '../src/adapter/ui-layer';
import { PAGE_IDS } from '../src/core';
import type { PageId } from '../src/core';
import { charactersTheFontLacks } from './drawn-text';
import { newGame, playingView } from './fixtures';

// The hint at the foot of each page says which keys close it: the keys of the page, which toggle it, and Esc. It is
// made from the table of the keys that binds them, and it must be shown whole: the overlay draws a line of text as it
// is given, centred, so a hint that is too long for its window runs over the edges of it instead of being cut.

const FOCUSED = true;

/** The hint of a page as the game draws it, and the room that the window gives a line of text. */
interface ShownHint {
  readonly text: string;
  readonly room: number;
}

/** The hint on a page that the overlay draws: the one line of its panel that says how to close it. */
function hintOnTheOverlay(page: PageId): ShownHint {
  const game = newGame();
  game.send({ type: 'open-page', page });
  const panel = panelFor(playingView(game), FOCUSED, 0);
  const hints = (panel?.rows ?? []).flatMap((row) => (row.kind === 'text' && row.text.endsWith('TO CLOSE') ? [row.text] : []));
  const [text] = hints;
  if (panel === null || text === undefined || hints.length > 1) {
    throw new Error(`The ${page} page does not have one line to say how to close it on the overlay.`);
  }
  return { text, room: panel.width - 2 * WINDOW_PADDING };
}

/** Where each page has its hint. The Automap draws itself, and says what it draws. */
const SHOWN: Readonly<Record<PageId, () => ShownHint>> = {
  stats: () => hintOnTheOverlay('stats'),
  inventory: () => hintOnTheOverlay('inventory'),
  automap: () => AUTOMAP_HINT,
  controls: () => hintOnTheOverlay('controls'),
};

/** What each page's hint reads, worked out by hand, and the room of its window, which is the window less its padding. */
const BY_HAND: Readonly<Record<PageId, { readonly text: string; readonly room: number }>> = {
  stats: { text: 'C/TAB OR ESC TO CLOSE', room: 160 - 2 * 12 },
  inventory: { text: 'I OR ESC TO CLOSE', room: 144 + 8 + 122 },
  automap: { text: 'M OR ESC TO CLOSE', room: 300 - 2 * 12 },
  controls: { text: 'H OR ESC TO CLOSE', room: 83 + 8 + 137 },
};

/** The words and keys of a hint, in order: "C/TAB OR ESC" is C, TAB, OR and ESC. */
function wordsOf(hint: string): string[] {
  return hint.split(/[\s/]+/);
}

describe.each(PAGE_IDS)('the hint of the %s page', (page) => {
  it('reads as it was worked out by hand, in a window of the width worked out by hand', () => {
    expect(SHOWN[page]()).toEqual(BY_HAND[page]);
  });

  it('names every key that is bound to the page, and Esc', () => {
    const words = wordsOf(SHOWN[page]().text);

    for (const { label } of PAGE_KEYS[page]) {
      expect(words, `the key ${label}`).toContain(label);
    }
    expect(words).toContain(closePageKeyLabel());
  });

  it('says OR between the keys of the page and Esc, and TO CLOSE after them', () => {
    const { text } = SHOWN[page]();

    expect(text).toContain(' OR ');
    expect(text.endsWith(' TO CLOSE')).toBe(true);
    expect(text.indexOf(' OR ')).toBeLessThan(text.indexOf(closePageKeyLabel()));
  });

  it('fits the width that its window gives it, so that it is shown whole', () => {
    const { text, room } = SHOWN[page]();

    expect(textWidthOf(text), text).toBeLessThanOrEqual(room);
  });

  it('is made of text the pixel font can draw', () => {
    expect(charactersTheFontLacks(SHOWN[page]().text)).toEqual([]);
  });
});
