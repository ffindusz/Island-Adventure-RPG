import { describe, expect, it } from 'vitest';
import { BANNER_TOP } from '../src/adapter/area-banner';
import { audioLineBox } from '../src/adapter/audio-line';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../src/adapter/config';
import { ControlsLineTime, controlsLineBox } from '../src/adapter/controls-line';
import { controlsLineText } from '../src/adapter/controls';
import { HUD_BOTTOM, HUD_RIGHT } from '../src/adapter/hud';
import type { Rect } from '../src/adapter/pixel-font';

// The short line that says H FOR CONTROLS when play begins: where it sits and how long it stays, as pure rules of the
// adapter's (the Phaser drawing of it, and the play screen's use of it, are looked at in the real game). The time is the
// frames' and not a timer's: a frame counts only while the player watches and the game runs, so the numbers below are the
// milliseconds of the frames given, worked out by hand against four seconds, 4000 milliseconds.

/** A frame of the game running with the player watching, which counts. */
const RUNNING = { watching: true, waiting: false };
/** A frame in which a page is open, a Stat Point is to be assigned or the question whether to sail home is asked. */
const WAITING = { watching: true, waiting: true };
/** A frame of a tab or window that nobody is looking at. */
const UNWATCHED = { watching: false, waiting: false };

/** How many frames of the given length the line is on in, counting from a fresh time; a line that never goes stops at the bound. */
const framesOn = (frameMs: number): number => {
  const time = new ControlsLineTime();
  let frames = 0;
  while (frames < 10_000 && time.frame(frameMs, RUNNING)) {
    frames += 1;
  }
  return frames;
};

describe('the time of the line that says what H is for', () => {
  it('has the line on in the first frame', () => {
    expect(new ControlsLineTime().frame(16, RUNNING)).toBe(true);
  });

  it('still has it on in the frame that leaves one millisecond of the four seconds', () => {
    expect(new ControlsLineTime().frame(3999, RUNNING)).toBe(true);
  });

  it('has it gone in the frame that spends the last millisecond', () => {
    const time = new ControlsLineTime();
    time.frame(3999, RUNNING);

    expect(time.frame(1, RUNNING)).toBe(false);
  });

  it('adds the frames up: on for 249 frames of 16 milliseconds and gone in the 250th, which makes four seconds', () => {
    expect(framesOn(16)).toBe(249);
  });

  it('adds the frames up: on for 39 frames of 100 milliseconds and gone in the 40th', () => {
    expect(framesOn(100)).toBe(39);
  });

  it('does not bring it back once it has gone', () => {
    const time = new ControlsLineTime();
    time.frame(4000, RUNNING);

    expect([time.frame(16, RUNNING), time.frame(16, WAITING), time.frame(16, UNWATCHED), time.frame(16, RUNNING)]).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  describe('while a page is open, a Stat Point is to be assigned or the question whether to sail home is asked', () => {
    it('has the line off, even in the first frame of play', () => {
      expect(new ControlsLineTime().frame(16, WAITING)).toBe(false);
    });

    it('takes nothing from the four seconds, however long the game waits', () => {
      const time = new ControlsLineTime();
      time.frame(1000, RUNNING);
      time.frame(60_000, WAITING);
      time.frame(60_000, WAITING);

      expect(time.frame(2999, RUNNING)).toBe(true);
      expect(time.frame(1, RUNNING)).toBe(false);
    });

    it('brings the line back with the time it had left when the game runs again', () => {
      const time = new ControlsLineTime();
      time.frame(3000, RUNNING);
      time.frame(16, WAITING);

      expect([time.frame(1, RUNNING), time.frame(998, RUNNING), time.frame(1, RUNNING)]).toEqual([true, true, false]);
    });
  });

  describe('while nobody is looking at the game', () => {
    it('keeps the line on, for it is there when the player is back', () => {
      const time = new ControlsLineTime();
      time.frame(1000, RUNNING);

      expect(time.frame(16, UNWATCHED)).toBe(true);
    });

    it('takes nothing from the four seconds, however long nobody looks', () => {
      const time = new ControlsLineTime();
      time.frame(1000, RUNNING);
      time.frame(60_000, UNWATCHED);
      time.frame(60_000, UNWATCHED);

      expect(time.frame(2999, RUNNING)).toBe(true);
      expect(time.frame(1, RUNNING)).toBe(false);
    });

    it('takes nothing from a frame in which a page is open and nobody looks either', () => {
      const time = new ControlsLineTime();
      time.frame(60_000, { watching: false, waiting: true });

      expect(time.frame(3999, RUNNING)).toBe(true);
    });
  });

  describe('when the player opens the Controls page', () => {
    it('ends the line at once, before the four seconds are over', () => {
      const time = new ControlsLineTime();
      time.frame(1000, RUNNING);
      time.dismiss();

      expect(time.frame(16, RUNNING)).toBe(false);
    });

    it('ends it for good, so that it is not back when the page is closed', () => {
      const time = new ControlsLineTime();
      time.frame(1000, RUNNING);
      time.dismiss();

      expect([time.frame(16, WAITING), time.frame(16, WAITING), time.frame(16, RUNNING), time.frame(16, UNWATCHED)]).toEqual([
        false,
        false,
        false,
        false,
      ]);
    });
  });

  it('starts every game afresh, with the whole of the four seconds and the line on, as a new time does', () => {
    const spent = new ControlsLineTime();
    spent.frame(4000, RUNNING);
    const dismissed = new ControlsLineTime();
    dismissed.dismiss();

    expect(new ControlsLineTime().frame(3999, RUNNING)).toBe(true);
  });
});

/** Whether two boxes share a pixel: boxes that only touch along an edge do not. */
function meets(one: Rect, other: Rect): boolean {
  return (
    one.left < other.left + other.width &&
    other.left < one.left + one.width &&
    one.top < other.top + other.height &&
    other.top < one.top + one.height
  );
}

/** What the HUD covers: the top left corner of the screen, as far as the edges it declares. */
const HUD: Rect = { left: 0, top: 0, width: HUD_RIGHT, height: HUD_BOTTOM };

/** The widest line of the audio, which reaches furthest from the corner it sits in. */
const WIDEST_AUDIO_LINE = 'VOLUME 10/10';

describe('the place of the line that says what H is for', () => {
  /** The box of the words as the table of the keys makes them, so that these hold for whichever key the table has. */
  const boxOfTheLine = (): Rect => controlsLineBox(controlsLineText());

  it('is in the top row, in the middle from side to side, as wide as its words with 6 pixels of air round them', () => {
    // 'H FOR CONTROLS' is 14 letters of 5 pixels with 1 between: 83 wide, and 95 with the air; the panel is 7 + 12 = 19
    // high, 4 from the top edge, as the audio line's. (320 - 95) / 2 is 112 and a half: the half pixel is left over.
    expect(controlsLineBox('H FOR CONTROLS')).toEqual({ left: 112, top: 4, width: 95, height: 19 });
  });

  it('is whole on the screen', () => {
    const box = boxOfTheLine();
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.left + box.width).toBeLessThanOrEqual(VIEW_WIDTH);
    expect(box.top + box.height).toBeLessThanOrEqual(VIEW_HEIGHT);
  });

  it('is in the middle from side to side, with the same air at both sides give or take the half pixel of an odd width', () => {
    const box = boxOfTheLine();
    const airAtTheRight = VIEW_WIDTH - box.left - box.width;
    expect(Math.abs(box.left - airAtTheRight)).toBeLessThanOrEqual(1);
  });

  it('is clear of the HUD in the top left corner', () => {
    expect(meets(boxOfTheLine(), HUD)).toBe(false);
  });

  it('is clear of the text of an area, which starts under the HUD', () => {
    const box = boxOfTheLine();
    expect(box.top + box.height).toBeLessThanOrEqual(BANNER_TOP);
  });

  it.each(['top-right', 'bottom-right'] as const)('is clear of the audio line in the %s corner, at its widest text', (corner) => {
    expect(meets(boxOfTheLine(), audioLineBox(WIDEST_AUDIO_LINE, corner))).toBe(false);
  });
});
