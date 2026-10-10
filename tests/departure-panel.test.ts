import { describe, expect, it } from 'vitest';
import { PADDING, panelFor } from '../src/adapter/overlay';
import type { Panel } from '../src/adapter/overlay';
import { textWidthOf } from '../src/adapter/pixel-font';
import { charactersTheFontLacks } from './drawn-text';
import { playingView } from './fixtures';
import { askingGame, harborGame, preparedGame, VESSEL_ID } from './harbor-fixtures';

// The question whether to sail home, as the overlay shows it: the game is paused behind it, as it is behind a page.

const FOCUSED = true;

/** The lines of text of a panel, from the top down. */
function textsOf(panel: Panel | null): string[] {
  return (panel?.rows ?? []).flatMap((row) => (row.kind === 'text' ? [row.text] : []));
}

describe('the question whether to sail home, on the overlay', () => {
  const question = panelFor(playingView(askingGame()), FOCUSED, 0);

  it('asks it, says that the adventure ends, and tells the key to sail and the key to stay', () => {
    expect(textsOf(question)).toEqual(['SAIL HOME?', 'THE ADVENTURE ENDS.', 'ENTER TO SAIL', 'ESC TO STAY']);
  });

  it('is made of text the pixel font can draw', () => {
    expect(textsOf(question).length).toBeGreaterThan(0);
    for (const text of textsOf(question)) {
      expect(charactersTheFontLacks(text), text).toEqual([]);
    }
  });

  it('is made of lines that fit its window', () => {
    expect(question).not.toBeNull();
    for (const text of textsOf(question)) {
      expect(textWidthOf(text), text).toBeLessThanOrEqual((question?.width ?? 0) - 2 * PADDING);
    }
  });

  it('is shown over the notice that the window lost focus', () => {
    expect(textsOf(panelFor(playingView(askingGame()), !FOCUSED, 0))).toEqual(textsOf(question));
  });

  it('is shown for as long as it is open, wherever the cursor of the inventory was', () => {
    expect(textsOf(panelFor(playingView(askingGame()), FOCUSED, 3))).toEqual(textsOf(question));
  });

  it('is not shown before it is asked, nor for a vessel that is only prepared', () => {
    expect(panelFor(playingView(harborGame()), FOCUSED, 0)).toBeNull();
    expect(panelFor(playingView(preparedGame()), FOCUSED, 0)).toBeNull();
  });

  it('is not shown once it is answered: the game is back as it was', () => {
    const game = askingGame();
    game.send({ type: 'cancel-departure' });

    expect(panelFor(playingView(game), FOCUSED, 0)).toBeNull();
  });

  it('gives way to a page that is in front of it, which is what the player answers', () => {
    const withPage = harborGame();
    withPage.send({ type: 'open-page', page: 'stats' });
    const behindPage = { ...playingView(withPage), departure: { vesselId: VESSEL_ID } };

    expect(textsOf(panelFor(behindPage, FOCUSED, 0))[0]).toBe('STATS');
  });

  it('gives way to a Stat Point that waits, which is what the player answers', () => {
    const behindStatPoint = { ...playingView(askingGame()), levelUp: { level: 2, points: 1, options: [] } };

    expect(textsOf(panelFor(behindStatPoint, FOCUSED, 0))[0]).toBe('LEVEL UP!');
  });
});
