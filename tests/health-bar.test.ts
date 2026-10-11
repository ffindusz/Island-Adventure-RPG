import { describe, expect, it } from 'vitest';
import { scrollFor } from '../src/adapter/camera';
import { VIEW_HEIGHT } from '../src/adapter/config';
import { healthBarBox } from '../src/adapter/monster-sprites';

// Where a monster's Health bar goes, as a pure rule of the adapter's (the Phaser drawing of it is looked at in the real
// game). A direct test of a pure function of the adapter, as ADR 0005 allows: it imports from src/adapter, not from the
// Game core.

/** A map taller than the screen, so that the camera follows the hero up and down in every row the tests use. */
const MAP_SIZE = { width: 40, height: 30 };
const BAR_HEIGHT = 4;
/** The castle Guardian's picture, 96 by 96, and its body, 1.6 tiles across: 26 pixels. */
const GUARDIAN_PICTURE = { width: 96, height: 96 };
const GUARDIAN_BODY = 26;

/** The top of the screen, in the map's pixels, with the hero at this row. */
const screenTopWith = (heroRow: number): number => scrollFor({ x: 20, y: heroRow }, MAP_SIZE).y;

describe("a monster's Health bar", () => {
  it('goes just above its picture, as wide as its body and in the middle of the picture', () => {
    expect(healthBarBox({ x: 100, y: 50 }, { width: 32, height: 32 }, 12, 0)).toEqual({
      left: 110,
      top: 45,
      width: 12,
      height: BAR_HEIGHT,
    });
  });

  it('stays at the top of the screen, as long as any of the picture shows, when the picture reaches above it', () => {
    // The Guardian against the arena's north wall: row 7.8 is 124.8 pixels, which is 125 rounded, and half of its 96
    // is 48, so its picture starts at 77. The hero at row 12.5 puts the screen's top at 200 - 96 = 104.
    expect(screenTopWith(12.5)).toBe(104);
    const box = healthBarBox({ x: 1168, y: 77 }, GUARDIAN_PICTURE, GUARDIAN_BODY, 104);
    expect(box).toEqual({ left: 1168 + 35, top: 104, width: GUARDIAN_BODY, height: BAR_HEIGHT });
  });

  // Worked by hand. The screen is 192 pixels high and its top is the hero's row in pixels less 96: row 7.8 is 124.8,
  // so 29, and row 15.2 is 243.2, so 147. The Guardian's picture starts at its row in pixels, rounded, less 48: row 7.8
  // is 125 - 48 = 77, row 12.4 is 198 - 48 = 150, row 12.5 is 200 - 48 = 152, row 12.6 is 202 - 48 = 154 and row 15.2 is
  // 243 - 48 = 195. The bar is 5 pixels above the picture (4 high and one of air), unless that is above the screen.
  it.each([
    [7.8, 29, 77, 72],
    [7.8, 29, 195, 190],
    [15.2, 147, 77, 147],
    [15.2, 147, 150, 147],
    [15.2, 147, 152, 147],
    [15.2, 147, 154, 149],
    [15.2, 147, 195, 190],
  ])(
    "with the hero at row %s, the screen at %s and the Guardian's picture at %s, puts the bar at %s",
    (heroRow, screenTop, pictureTop, barTop) => {
      expect(screenTopWith(heroRow)).toBe(screenTop);
      expect(healthBarBox({ x: 1168, y: pictureTop }, GUARDIAN_PICTURE, GUARDIAN_BODY, screenTop)?.top).toBe(barTop);
    },
  );

  it('is clamped from the first pixel that would put it above the screen, and not before', () => {
    const picture = { width: 32, height: 32 };
    // Just room for the bar and a pixel of air between it and the picture, with the bar's top row at the screen's top row: where it always was.
    expect(healthBarBox({ x: 0, y: 105 }, picture, 12, 100)?.top).toBe(100);
    expect(healthBarBox({ x: 0, y: 106 }, picture, 12, 100)?.top).toBe(101);
    // One pixel less and the bar would be above the screen: it is at the top instead.
    expect(healthBarBox({ x: 0, y: 104 }, picture, 12, 100)?.top).toBe(100);
    expect(healthBarBox({ x: 0, y: 90 }, picture, 12, 100)?.top).toBe(100);
  });

  it('is not drawn at all once the whole picture is above the screen', () => {
    const picture = { width: 32, height: 32 };
    expect(healthBarBox({ x: 0, y: 68 }, picture, 12, 100)).toBeNull();
    expect(healthBarBox({ x: 0, y: 69 }, picture, 12, 100)).not.toBeNull();
  });

  it('stays inside the screen, at its own place or at the top of it, for the Guardian anywhere in the arena and the hero anywhere in it', () => {
    // Worked by hand (see the table above): the hero anywhere from row 7.8 to row 15.2 puts the screen's top anywhere
    // from 29 to 147, and the Guardian anywhere from row 7.8 to row 15.2 puts the top of its 96 pixel picture anywhere
    // from 77 to 195. At the least, the picture ends at 77 + 96 = 173, below the 147 where the lowest screen starts, and
    // at the most it starts at 195, above the 29 + 192 = 221 where the highest screen ends. So the picture shows in
    // every one of these 119 by 119 places, and the bar must be drawn in every one of them.
    const misplaced: string[] = [];
    let checked = 0;
    for (let screenTop = 29; screenTop <= 147; screenTop += 1) {
      for (let pictureTop = 77; pictureTop <= 195; pictureTop += 1) {
        const box = healthBarBox({ x: 1168, y: pictureTop }, GUARDIAN_PICTURE, GUARDIAN_BODY, screenTop);
        const wellPlaced =
          box !== null &&
          [pictureTop - BAR_HEIGHT - 1, screenTop].includes(box.top) &&
          box.top >= screenTop &&
          box.top + BAR_HEIGHT <= screenTop + VIEW_HEIGHT;
        if (!wellPlaced) {
          misplaced.push(`screen at ${screenTop}, picture at ${pictureTop}: bar at ${box?.top ?? 'nowhere'}`);
        }
        checked += 1;
      }
    }

    expect(misplaced).toEqual([]);
    expect(checked).toBe(119 * 119);
  });
});
