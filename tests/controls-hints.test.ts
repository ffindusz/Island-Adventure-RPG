import { describe, expect, it } from 'vitest';
import { AUTOMAP_HINT } from '../src/adapter/automap-page';
import { controlsLineText, openingControlsHint, pageCloseHint, pageKeyLabel } from '../src/adapter/controls';
import { panelFor } from '../src/adapter/overlay';
import { textWidthOf } from '../src/adapter/pixel-font';
import { PAGE_IDS } from '../src/core';
import type { PageId } from '../src/core';
import { charactersTheFontLacks } from './drawn-text';
import { newGame, playingView } from './fixtures';

// The two places where the game tells the player in play that H shows the controls: the card of the opening has a line
// of its own for it under ENTER TO BEGIN, and a short line says it for a few seconds when play begins. Both are made
// from the table of the keys, so that a key that is changed changes the words, and neither is at the foot of a page.

/** Whether the key is one of the words of the text, as the key of a page is in the hint at its foot. */
function hasAsAWord(text: string, key: string): boolean {
  return ` ${text} `.includes(` ${key} `);
}

describe('the line that says what H is for, when play begins', () => {
  it('reads H FOR CONTROLS, as it was worked out by hand: 14 letters of 6 pixels, less the 1 after the last', () => {
    const text = controlsLineText();

    expect(text).toBe('H FOR CONTROLS');
    expect(textWidthOf(text)).toBe(83);
  });

  it('names the key of the Controls page as the table of the keys has it', () => {
    expect(hasAsAWord(controlsLineText(), pageKeyLabel('controls'))).toBe(true);
  });

  it('is made of text the pixel font can draw', () => {
    expect(charactersTheFontLacks(controlsLineText())).toEqual([]);
  });
});

describe('the line of the card of the opening that says what H does in play', () => {
  it('reads IN PLAY, H SHOWS THE CONTROLS, as it was worked out by hand: 29 letters of 6 pixels, less the 1 after the last', () => {
    const text = openingControlsHint();

    expect(text).toBe('IN PLAY, H SHOWS THE CONTROLS');
    expect(textWidthOf(text)).toBe(173);
  });

  it('names the key of the Controls page as the table of the keys has it', () => {
    expect(hasAsAWord(openingControlsHint(), pageKeyLabel('controls'))).toBe(true);
  });

  it('says what H does in play, because the card holds the game and H does nothing at it', () => {
    expect(openingControlsHint().startsWith('IN PLAY')).toBe(true);
  });

  it('is made of text the pixel font can draw', () => {
    expect(charactersTheFontLacks(openingControlsHint())).toEqual([]);
  });
});

const FOCUSED = true;

/** Every line at the foot of the page that the game draws to say how to close it: the overlay's, or the Automap's own. */
function feetOf(page: PageId): string[] {
  if (page === 'automap') {
    return [AUTOMAP_HINT.text, pageCloseHint(page)];
  }
  const game = newGame();
  game.send({ type: 'open-page', page });
  const rows = panelFor(playingView(game), FOCUSED, 0)?.rows ?? [];
  const drawn = rows.flatMap((row) => (row.kind === 'text' && row.text.endsWith('TO CLOSE') ? [row.text] : []));
  return [...drawn, pageCloseHint(page)];
}

// While a page is open the key of another page does nothing (the pause rule), so a foot that said H FOR CONTROLS
// would name a key that does not work on that page.
describe.each(PAGE_IDS)('the foot of the %s page', (page) => {
  it('has a foot to look at, and it does not say what H is for', () => {
    const feet = feetOf(page);

    expect(feet.length).toBeGreaterThanOrEqual(2);
    for (const foot of feet) {
      expect(foot).not.toContain(controlsLineText());
      expect(foot).not.toContain(openingControlsHint());
      expect(foot).not.toContain('FOR CONTROLS');
    }
  });
});
