import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { areaOf } from './main-route';
import { bytesOf, fileOf, frameOf, isOutline, isRed, isWhite, readPicture, sameShape } from './pictures';
import type { Picture, Pixel } from './pictures';

// The skeleton, the ghoul, the wraith and the knight of the castle are drawn from sheets of their own, the way the other
// monsters are (src/adapter/monster-sprites.ts): four columns, the way each faces (down, up, left, right), the frames of
// its walk, then a row of a white shape for a hit and a row of a red one for a wind-up. That is the manifest check of ADR
// 0002 and, with the sheets read from disk as ADR 0005 allows, their shape, and that the four can be told apart by their
// outlines as well as by their colours: what each one looks like is for the screenshots. The Guardian has a sheet of its
// own, in tests/castle-guardian-art.test.ts.

const UNDEAD = ['castle-skeleton', 'castle-ghoul', 'castle-wraith', 'castle-knight'];
const CELL = 16;
const FACINGS = ['down', 'up', 'left', 'right'] as const;
const WALK_FRAMES = 4;
const HIT_ROW = WALK_FRAMES;
const WIND_UP_ROW = WALK_FRAMES + 1;

function typesOf(areaId: string): string[] {
  return [...new Set(areaOf(areaId).monsters.map((monster) => monster.type))].sort();
}

/** The opaque pixels of the cell in this row and column of a sheet, as a map from "x,y" to the pixel. */
function cellOf(sheet: Picture, row: number, column: number): Map<string, Pixel> {
  return frameOf(sheet, row, column, CELL);
}

/** How many pixels are in one of the two shapes and not in the other. */
function shapesDiffer(a: Map<string, Pixel>, b: Map<string, Pixel>): number {
  return [...a.keys()].filter((key) => !b.has(key)).length + [...b.keys()].filter((key) => !a.has(key)).length;
}

/** The least that the red of a wind-up may change a monster, as the mean distance of its colours (of 441 at most): as for the monsters of the mountain and the cave. The four undead are 105 and over. */
const WIND_UP_SHOWS = 88;

/** The least that two of the undead differ in their outlines, in pixels, in every way they face. The nearest two (the skeleton and the knight) are 22 apart. */
const OUTLINES_DIFFER = 18;

/** How far, on average, the colours of the monster facing this way (its outline left out) are from the red of its wind-up. */
function windUpShift(sheet: Picture, facing: number): number {
  const windUp = cellOf(sheet, WIND_UP_ROW, facing);
  const body = [...cellOf(sheet, 0, facing)].filter(([, pixel]) => !isOutline(pixel));
  const total = body.reduce((sum, [key, pixel]) => {
    const red = windUp.get(key) ?? pixel;
    return sum + Math.hypot(pixel[0] - red[0], pixel[1] - red[1], pixel[2] - red[2]);
  }, 0);
  return total / body.length;
}

describe('the undead of the castle', () => {
  it('are the skeleton, the ghoul, the wraith and the knight, with the Guardian, as the content places them', () => {
    expect(typesOf('castle')).toEqual([...UNDEAD, 'castle-guardian'].sort());
  });

  describe.each(UNDEAD)('the monster %s', (type) => {
    const art = `monster-${type}`;

    it('has a sheet of its own in the manifest, of frames one tile wide and one tile high', () => {
      const entry = (ARTWORK as ArtManifest)[art];

      expect(entry).toMatchObject({ kind: 'sheet', file: `${art}.png`, frameWidth: CELL, frameHeight: CELL });
    });

    it('has its sheet on disk as four facings by four frames of a walk, a row of a hit and a row of a wind-up', () => {
      const sheet = readPicture(fileOf(art));

      expect(sheet.width).toBe(FACINGS.length * CELL);
      expect(sheet.height).toBe((WALK_FRAMES + 2) * CELL);
    });

    it('shows a monster in every frame of its walk, and a different one for each of the four ways it faces', () => {
      const sheet = readPicture(fileOf(art));

      for (let frame = 0; frame < WALK_FRAMES; frame++) {
        for (let facing = 0; facing < FACINGS.length; facing++) {
          expect(cellOf(sheet, frame, facing).size, `${FACINGS[facing]}, frame ${frame}`).toBeGreaterThan(40);
        }
      }
      const facings = FACINGS.map((_, facing) => [...cellOf(sheet, 0, facing)].map(([key, pixel]) => `${key}:${pixel.join()}`).join(';'));
      expect(new Set(facings).size).toBe(FACINGS.length);
    });

    it('is drawn as a white shape of itself when it is hit, in the way it faces', () => {
      const sheet = readPicture(fileOf(art));

      for (let facing = 0; facing < FACINGS.length; facing++) {
        const body = cellOf(sheet, 0, facing);
        const hit = cellOf(sheet, HIT_ROW, facing);
        expect(sameShape(hit, body), `the shape facing ${FACINGS[facing]}`).toBe(true);
        expect([...hit.values()].every(isWhite), `the white facing ${FACINGS[facing]}`).toBe(true);
      }
    });

    it('is drawn as a red shape of itself when it winds up, with the dark outline of the others, in the way it faces', () => {
      const sheet = readPicture(fileOf(art));

      for (let facing = 0; facing < FACINGS.length; facing++) {
        const body = cellOf(sheet, 0, facing);
        const windUp = cellOf(sheet, WIND_UP_ROW, facing);
        expect(sameShape(windUp, body), `the shape facing ${FACINGS[facing]}`).toBe(true);
        expect([...windUp.values()].every((pixel) => isOutline(pixel) || isRed(pixel)), `the red facing ${FACINGS[facing]}`).toBe(true);
        expect([...windUp.values()].some(isRed), `some red facing ${FACINGS[facing]}`).toBe(true);
      }
    });

    it('shows its wind-up, the red of it a clear change from the colours it walks in, in each way it faces', () => {
      const sheet = readPicture(fileOf(art));

      for (let facing = 0; facing < FACINGS.length; facing++) {
        expect(windUpShift(sheet, facing), `the change facing ${FACINGS[facing]}`).toBeGreaterThanOrEqual(WIND_UP_SHOWS);
      }
    });
  });

  it('each have a picture of their own, and none is a copy of another', () => {
    const hashes = UNDEAD.map((type) => createHash('sha1').update(bytesOf(fileOf(`monster-${type}`))).digest('hex'));

    expect(new Set(hashes).size).toBe(UNDEAD.length);
  });

  it('are told apart by their outlines and not only by their colours, in every way they face', () => {
    const sheets = UNDEAD.map((type) => readPicture(fileOf(`monster-${type}`)));

    for (let one = 0; one < UNDEAD.length; one++) {
      for (let other = one + 1; other < UNDEAD.length; other++) {
        for (let facing = 0; facing < FACINGS.length; facing++) {
          const apart = shapesDiffer(cellOf(sheets[one] as Picture, 0, facing), cellOf(sheets[other] as Picture, 0, facing));
          expect(apart, `${UNDEAD[one]} and ${UNDEAD[other]} facing ${FACINGS[facing]}`).toBeGreaterThanOrEqual(OUTLINES_DIFFER);
        }
      }
    }
  });
});
