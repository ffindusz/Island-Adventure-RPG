import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { bytesOf, fileOf, frameOf, isOutline, isRed, isWhite, readPicture, sameShape } from './pictures';
import type { Picture, Pixel } from './pictures';

// The Guardian of the castle is drawn from a sheet of its own like the other monsters (src/adapter/monster-sprites.ts), but
// the picture is 96 pixels square, for it stands four tiles and a half wide: four columns for the way it faces (down, up,
// left, right), six rows of its walk (the monster walks, and stands still, through the same frames), a row of a white
// shape for a hit and a row of a red one for a wind-up. The picture is set on the monster's middle, so what these tests
// guard is that every frame of it keeps the body where the monster stands, and that the wind-up and the hit can be seen.
// What the Guardian looks like is for the screenshots.

const ART = 'monster-castle-guardian';
const CELL = 96;
const FACINGS = ['down', 'up', 'left', 'right'] as const;
const WALK_ROWS = 6;
const HIT_ROW = WALK_ROWS;
const WIND_UP_ROW = WALK_ROWS + 1;
/** The colours of the pack's Giant Blue Samurai that the Guardian is not drawn in: its blue, its grey-green and its dark, its gold, its orange, its pink and its red. */
const PACK_COLOURS: readonly (readonly number[])[] = [
  [0x79, 0xb8, 0xce],
  [0x5f, 0x71, 0x60],
  [0x3b, 0x36, 0x43],
  [0xf1, 0xc4, 0x71],
  [0xef, 0x91, 0x4f],
  [0xd3, 0xa2, 0xc0],
  [0xd1, 0x4b, 0x34],
];

/** A frame with less in it than this is not the Guardian: the frames of the walk have about 1100 pixels. */
const GUARDIAN_AT_LEAST = 800;
/** How far the middle of the body may be from the middle of the cell, in pixels: across (the frames lean and sway, up to 6) and down (up to 3, where the lunge of a wind-up raises a blade). */
const MIDDLE_ACROSS = 8;
const MIDDLE_DOWN = 4;
/** The least that the red of a wind-up may change the colour of the monster, as the distance of the average colours (of 441 at most). The Guardian's is over 150. */
const WIND_UP_SHOWS = 88;

function cellOf(sheet: Picture, row: number, column: number): Map<string, Pixel> {
  return frameOf(sheet, row, column, CELL);
}

/** The middle of the opaque pixels of a frame. */
function middleOf(frame: Map<string, Pixel>): { x: number; y: number } {
  const points = [...frame.keys()].map((key) => key.split(',').map(Number) as [number, number]);
  return {
    x: points.reduce((sum, [x]) => sum + x, 0) / points.length,
    y: points.reduce((sum, [, y]) => sum + y, 0) / points.length,
  };
}

/** The average colour of a frame without its outline. */
function averageColour(frame: Map<string, Pixel>): readonly [number, number, number] {
  const body = [...frame.values()].filter((pixel) => !isOutline(pixel));
  const mean = (channel: number): number => body.reduce((sum, pixel) => sum + (pixel[channel] ?? 0), 0) / body.length;
  return [mean(0), mean(1), mean(2)];
}

describe('the Guardian of the castle', () => {
  it('has a sheet of its own in the manifest, of frames 96 pixels wide and 96 high', () => {
    const entry = (ARTWORK as ArtManifest)[ART];

    expect(entry).toMatchObject({ kind: 'sheet', file: `${ART}.png`, frameWidth: CELL, frameHeight: CELL });
  });

  it('has its sheet on disk as four facings by six frames of a walk, a row of a hit and a row of a wind-up', () => {
    const sheet = readPicture(fileOf(ART));

    expect(sheet.width).toBe(FACINGS.length * CELL);
    expect(sheet.height).toBe((WALK_ROWS + 2) * CELL);
  });

  it('shows the Guardian in every frame of its walk, and not the same one in every way it faces', () => {
    const sheet = readPicture(fileOf(ART));

    for (let row = 0; row < WALK_ROWS; row++) {
      for (let facing = 0; facing < FACINGS.length; facing++) {
        expect(cellOf(sheet, row, facing).size, `${FACINGS[facing]}, frame ${row}`).toBeGreaterThan(GUARDIAN_AT_LEAST);
      }
    }
    const facings = FACINGS.map((_, facing) => [...cellOf(sheet, 0, facing)].map(([key, pixel]) => `${key}:${pixel.join()}`).join(';'));
    expect(new Set(facings).size).toBe(FACINGS.length);
  });

  it('keeps the middle of its body on the middle of the cell, the monster standing there, in every frame', () => {
    const sheet = readPicture(fileOf(ART));
    const middle = CELL / 2;

    for (let row = 0; row < WALK_ROWS + 2; row++) {
      for (let facing = 0; facing < FACINGS.length; facing++) {
        const at = middleOf(cellOf(sheet, row, facing));
        expect(Math.abs(at.x - middle), `across, ${FACINGS[facing]}, row ${row}`).toBeLessThanOrEqual(MIDDLE_ACROSS);
        expect(Math.abs(at.y - middle), `down, ${FACINGS[facing]}, row ${row}`).toBeLessThanOrEqual(MIDDLE_DOWN);
      }
    }
  });

  it('is drawn in colours of its own and not in the pack\'s, and never in the red of a wind-up, as it walks', () => {
    const sheet = readPicture(fileOf(ART));

    for (let row = 0; row < WALK_ROWS; row++) {
      for (let facing = 0; facing < FACINGS.length; facing++) {
        for (const [key, pixel] of cellOf(sheet, row, facing)) {
          expect(PACK_COLOURS.some((colour) => colour.every((channel, index) => channel === pixel[index])), `${key} of ${FACINGS[facing]}, frame ${row}`).toBe(false);
          expect(isRed(pixel), `${key} of ${FACINGS[facing]}, frame ${row}`).toBe(false);
        }
      }
    }
  });

  it('is drawn as a white shape of itself when it is hit, in the way it faces', () => {
    const sheet = readPicture(fileOf(ART));

    for (let facing = 0; facing < FACINGS.length; facing++) {
      const body = cellOf(sheet, 0, facing);
      const hit = cellOf(sheet, HIT_ROW, facing);
      expect(sameShape(hit, body), `the shape facing ${FACINGS[facing]}`).toBe(true);
      expect([...hit.values()].every(isWhite), `the white facing ${FACINGS[facing]}`).toBe(true);
    }
  });

  it('is drawn in red, with the dark outline of the others, when it winds up, in each way it faces', () => {
    const sheet = readPicture(fileOf(ART));

    for (let facing = 0; facing < FACINGS.length; facing++) {
      const windUp = cellOf(sheet, WIND_UP_ROW, facing);
      expect(windUp.size, `the figure facing ${FACINGS[facing]}`).toBeGreaterThan(GUARDIAN_AT_LEAST);
      expect([...windUp.values()].every((pixel) => isOutline(pixel) || isRed(pixel)), `the red facing ${FACINGS[facing]}`).toBe(true);
      expect([...windUp.values()].some(isRed), `some red facing ${FACINGS[facing]}`).toBe(true);
    }
  });

  it('shows its wind-up, the red of it a clear change from the colours it walks in, in each way it faces', () => {
    const sheet = readPicture(fileOf(ART));

    for (let facing = 0; facing < FACINGS.length; facing++) {
      const walking = averageColour(cellOf(sheet, 0, facing));
      const winding = averageColour(cellOf(sheet, WIND_UP_ROW, facing));
      const shift = Math.hypot(walking[0] - winding[0], walking[1] - winding[1], walking[2] - winding[2]);
      expect(shift, `the change facing ${FACINGS[facing]}`).toBeGreaterThanOrEqual(WIND_UP_SHOWS);
    }
  });

  it('is not a copy of the picture of any other monster', () => {
    const hashOf = (file: string): string => createHash('sha1').update(bytesOf(file)).digest('hex');
    const monsters = Object.entries(ARTWORK as ArtManifest).filter(([art, entry]) => art.startsWith('monster-') && entry.kind === 'sheet');
    const hashes = monsters.map(([, entry]) => (entry.kind === 'sheet' ? hashOf(entry.file) : ''));

    expect(monsters.map(([art]) => art)).toContain(ART);
    expect(monsters.length).toBeGreaterThan(1);
    expect(new Set(hashes).size).toBe(monsters.length);
  });
});
