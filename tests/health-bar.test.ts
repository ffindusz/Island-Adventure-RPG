import { describe, expect, it } from 'vitest';
import { scrollFor } from '../src/adapter/camera';
import { TILE_SIZE, VIEW_HEIGHT } from '../src/adapter/config';
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

/** The top of the Guardian's picture with it at this row: its middle is rounded to a pixel, then half the picture is taken off. */
const pictureTopAt = (row: number): number => Math.round(row * TILE_SIZE) - GUARDIAN_PICTURE.height / 2;

describe("a monster's Health bar", () => {
  it('goes just above its picture, as wide as its body and in the middle of the picture', () => {
    expect(healthBarBox({ x: 100, y: 50 }, { width: 32, height: 32 }, 12, 0)).toEqual({
      x: 110,
      y: 45,
      width: 12,
      height: BAR_HEIGHT,
    });
  });

  it('stays at the top of the screen, as long as any of the picture shows, when the picture reaches above it', () => {
    // The Guardian against the arena's north wall (row 7.8) and the hero at row 12.5: the screen's top is at 104 and its picture at 77.
    expect(screenTopWith(12.5)).toBe(104);
    expect(pictureTopAt(7.8)).toBe(77);
    const box = healthBarBox({ x: 1168, y: 77 }, GUARDIAN_PICTURE, GUARDIAN_BODY, 104);
    expect(box).toEqual({ x: 1168 + 35, y: 104, width: GUARDIAN_BODY, height: BAR_HEIGHT });
  });

  it('is clamped from the first pixel that would put it above the screen, and not before', () => {
    const picture = { width: 32, height: 32 };
    // Just room for the bar and a pixel of air between it and the picture, with the bar's top row at the screen's top row: where it always was.
    expect(healthBarBox({ x: 0, y: 105 }, picture, 12, 100)?.y).toBe(100);
    expect(healthBarBox({ x: 0, y: 106 }, picture, 12, 100)?.y).toBe(101);
    // One pixel less and the bar would be above the screen: it is at the top instead.
    expect(healthBarBox({ x: 0, y: 104 }, picture, 12, 100)?.y).toBe(100);
    expect(healthBarBox({ x: 0, y: 90 }, picture, 12, 100)?.y).toBe(100);
  });

  it('is not drawn at all once the whole picture is above the screen', () => {
    const picture = { width: 32, height: 32 };
    expect(healthBarBox({ x: 0, y: 68 }, picture, 12, 100)).toBeNull();
    expect(healthBarBox({ x: 0, y: 69 }, picture, 12, 100)).not.toBeNull();
  });

  it('stays inside the screen for the Guardian anywhere in the arena and the hero anywhere in it, as long as the picture shows', () => {
    const rows: number[] = [];
    for (let row = 7.8; row <= 15.2; row += 0.1) {
      rows.push(Math.round(row * 10) / 10);
    }
    let shown = 0;
    for (const heroRow of rows) {
      const top = screenTopWith(heroRow);
      for (const guardianRow of rows) {
        const pictureTop = pictureTopAt(guardianRow);
        const visible = pictureTop + GUARDIAN_PICTURE.height > top && pictureTop < top + VIEW_HEIGHT;
        const box = healthBarBox({ x: 1168, y: pictureTop }, GUARDIAN_PICTURE, GUARDIAN_BODY, top);
        if (!visible) {
          continue;
        }
        shown += 1;
        expect(box, `hero ${heroRow}, Guardian ${guardianRow}`).not.toBeNull();
        expect(box?.y ?? -1, `hero ${heroRow}, Guardian ${guardianRow}`).toBeGreaterThanOrEqual(top);
        expect((box?.y ?? 0) + BAR_HEIGHT, `hero ${heroRow}, Guardian ${guardianRow}`).toBeLessThanOrEqual(top + VIEW_HEIGHT);
      }
    }
    expect(shown).toBeGreaterThan(4000);
  });
});
