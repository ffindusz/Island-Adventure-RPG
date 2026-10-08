import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { gameContent } from '../src/content';
import { bytesOf, fileOf, frameOf, readPicture } from './pictures';
import type { Picture, Pixel } from './pictures';

// The raiders of the mountain and the creatures of the cave are drawn from sheets of their own, the way the monsters of
// the coast and the woods are (src/adapter/monster-sprites.ts): four columns, the way each faces (down, up, left, right),
// the frames of its walk, then a row of a white shape for a hit and a row of a red one for a wind-up. That is the manifest
// check of ADR 0002 and the shape of the sheets: what each one looks like is for the screenshots.

const MOUNTAIN = ['raider', 'raider-charger', 'raider-archer', 'raider-veteran'];
const CAVE = ['cave-bat', 'cave-lizard', 'cave-eye', 'cave-bear'];
const MONSTERS = [...MOUNTAIN, ...CAVE];
const CELL = 16;
const FACINGS = ['down', 'up', 'left', 'right'] as const;
const WALK_FRAMES = 4;
const HIT_ROW = WALK_FRAMES;
const WIND_UP_ROW = WALK_FRAMES + 1;
const OUTLINE = [0x14, 0x1b, 0x1b];

function typesOf(areaId: string): string[] {
  const area = gameContent.areas.find((candidate) => candidate.id === areaId);
  if (!area) throw new Error(`the shipped content has no area "${areaId}"`);
  return [...new Set(area.monsters.map((monster) => monster.type))].sort();
}

/** The opaque pixels of the cell in this row and column of a sheet, as a map from "x,y" to the pixel. */
function cellOf(sheet: Picture, row: number, column: number): Map<string, Pixel> {
  return frameOf(sheet, row, column, CELL);
}

const isOutline = (pixel: Pixel): boolean => OUTLINE.every((channel, index) => channel === pixel[index]);
const isWhite = (pixel: Pixel): boolean => pixel[0] === 255 && pixel[1] === 255 && pixel[2] === 255;
/** The red that compose-art.py gives a wind-up: strong in the red, weak in the green and in the blue. */
const isRed = (pixel: Pixel): boolean => pixel[0] >= 150 && pixel[1] <= 105 && pixel[2] <= 100;

function sameShape(a: Map<string, Pixel>, b: Map<string, Pixel>): boolean {
  return a.size === b.size && [...a.keys()].every((key) => b.has(key));
}

/** The least that the red of a wind-up may change a monster, as the mean distance of its colours (of 441 at most). The pack's red bear is 81 and a red eye 71; the eight monsters are 94 and over. */
const WIND_UP_SHOWS = 88;

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

describe('the monsters of the mountain and the cave', () => {
  it('are the four raiders of the mountain and the four creatures of the cave, as the content places them', () => {
    expect(typesOf('mountain')).toEqual([...MOUNTAIN].sort());
    expect(typesOf('cave')).toEqual([...CAVE].sort());
  });

  describe.each(MONSTERS)('the monster %s', (type) => {
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
    const hashes = MONSTERS.map((type) => createHash('sha1').update(bytesOf(fileOf(`monster-${type}`))).digest('hex'));

    expect(new Set(hashes).size).toBe(MONSTERS.length);
  });
});
