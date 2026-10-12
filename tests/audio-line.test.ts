import { describe, expect, it } from 'vitest';
import { audioLineBox } from '../src/adapter/audio-line';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../src/adapter/config';
import { layoutEnding } from '../src/adapter/ending-pages';
import { TITLE_LINE_CORNER, logoLayout, paintedBounds, windowTop } from '../src/adapter/title-layout';
import { gameContent } from '../src/content';

// Where the line of the audio goes, as a pure rule of the adapter's (the Phaser drawing of it is looked at in the real
// game). A direct test of a pure function of the adapter, as ADR 0005 allows: it imports from src/adapter, not from the
// Game core.

/** Everything the keys of the audio can say: the narrowest line is SOUND ON, and the widest VOLUME 10/10. */
const SAID = ['SOUND OFF', 'SOUND ON', ...Array.from({ length: 11 }, (_, volume) => `VOLUME ${volume}/10`)];

/** The title's window: its rows end 12 pixels above its foot. */
const TITLE_WINDOW_FOOT = 12;

/**
 * The heights of the title's window in each of its states, worked out by hand from the rows the title draws: the lines
 * of the menu are 15 high and the other rows 7, with 4 between rows (none between the lines of the menu) and 4 more
 * either side of a space, and the window has 12 of air above its first row and under its last: 24 in all. The normal
 * state is the three lines of the menu, a space and three hints, the keys of the sound sharing the last (the rows stand
 * 45 + 8 + 29 = 82 high); the question about replacing the saved game is a question, a space and two answers (33); the
 * window that says saving is not available, that the saved game is damaged or that it is from another version has two
 * rows of message and a space round them (45 + 8 + 18 + 8 + 29 = 108). tests/title-window.test.ts has the rows and the
 * boxes themselves.
 */
const TITLE_WINDOW_HEIGHTS = {
  normal: 82 + 24,
  question: 33 + 24,
  'saving not available or saved game damaged': 108 + 24,
  'saved game from another version': 108 + 24,
};

describe('the line of the audio', () => {
  it('sits against the top right corner by default, 4 pixels from both edges, as wide as its words and 6 pixels of air round them', () => {
    // 'SOUND ON' is 8 letters of 5 pixels with 1 between: 47 wide, and 59 with the air; 'VOLUME 10/10' is 12 letters: 71 and 83.
    expect(audioLineBox('SOUND ON')).toEqual({ left: 257, top: 4, width: 59, height: 19 });
    expect(audioLineBox('VOLUME 10/10')).toEqual({ left: 233, top: 4, width: 83, height: 19 });
    expect(audioLineBox('SOUND ON', 'top-right')).toEqual(audioLineBox('SOUND ON'));
  });

  it('sits against the bottom right corner for a screen that asks for it, 4 pixels from both edges', () => {
    expect(audioLineBox('SOUND ON', 'bottom-right')).toEqual({ left: 257, top: 169, width: 59, height: 19 });
    expect(audioLineBox('VOLUME 10/10', 'bottom-right')).toEqual({ left: 233, top: 169, width: 83, height: 19 });
  });

  it('stays inside the screen, whatever the keys say and in whichever corner', () => {
    for (const said of SAID) {
      for (const corner of ['top-right', 'bottom-right'] as const) {
        const box = audioLineBox(said, corner);
        expect(box.left, said).toBeGreaterThanOrEqual(4);
        expect(box.left + box.width, said).toBe(VIEW_WIDTH - 4);
        expect(box.top, said).toBeGreaterThanOrEqual(4);
        expect(box.top + box.height, said).toBeLessThanOrEqual(VIEW_HEIGHT - 4);
      }
    }
  });

  it('stays clear of the name of the game on the title, in the corner the title gives it', () => {
    const name = paintedBounds(logoLayout());
    for (const said of SAID) {
      const box = audioLineBox(said, TITLE_LINE_CORNER);
      expect(box.top, said).toBeGreaterThanOrEqual(name.bottom);
    }
  });

  it('covers no row of the title window in any of its states, in the corner the title gives it', () => {
    for (const [state, height] of Object.entries(TITLE_WINDOW_HEIGHTS)) {
      const rowsEnd = windowTop(height) + height - TITLE_WINDOW_FOOT;
      for (const said of SAID) {
        const box = audioLineBox(said, TITLE_LINE_CORNER);
        expect(box.top, `${said} in the state: ${state}`).toBeGreaterThanOrEqual(rowsEnd);
      }
    }
  });

  it('stays clear of every card of the ending and the credits in the top right corner, which is where they leave room', () => {
    const cards = layoutEnding(gameContent.ending ?? [], gameContent.credits ?? []);
    expect(cards.length).toBeGreaterThan(1);
    for (const said of SAID) {
      const box = audioLineBox(said);
      for (const { window } of cards) {
        expect(window.top, said).toBeGreaterThanOrEqual(box.top + box.height);
      }
    }
  });
});
