import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { gameContent } from '../src/content';

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

type Pixel = readonly [number, number, number, number];

interface Picture {
  readonly width: number;
  readonly height: number;
  pixel(x: number, y: number): Pixel;
}

function typesOf(areaId: string): string[] {
  const area = gameContent.areas.find((candidate) => candidate.id === areaId);
  if (!area) throw new Error(`the shipped content has no area "${areaId}"`);
  return [...new Set(area.monsters.map((monster) => monster.type))].sort();
}

function fileOf(art: string): string {
  const entry = (ARTWORK as ArtManifest)[art];
  if (entry?.kind !== 'sheet') throw new Error(`"${art}" is not a sheet of the manifest`);
  return entry.file;
}

function bytesOf(file: string): Buffer {
  return readFileSync(new URL(`../public/art/${file}`, import.meta.url));
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) return left;
  return toUp <= toUpLeft ? up : upLeft;
}

/** The pixels of a picture on disk (public/art): the 8-bit RGBA PNGs that compose-art.py saves, unfiltered row by row. */
function readPicture(file: string): Picture {
  const png = bytesOf(file);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  expect([png[24], png[25], png[28]], `the bit depth, colour type and interlacing of ${file}`).toEqual([8, 6, 0]);
  const data: Buffer[] = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    if (png.toString('latin1', at + 4, at + 8) === 'IDAT') data.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * 4;
  const rgba = new Uint8Array(stride * height);
  const byteAt = (bytes: Uint8Array, index: number): number => bytes[index] ?? 0;
  for (let y = 0; y < height; y++) {
    const filter = byteAt(raw, y * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const left = i >= 4 ? byteAt(rgba, y * stride + i - 4) : 0;
      const up = y > 0 ? byteAt(rgba, (y - 1) * stride + i) : 0;
      const upLeft = y > 0 && i >= 4 ? byteAt(rgba, (y - 1) * stride + i - 4) : 0;
      const predicted = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter] ?? 0;
      rgba[y * stride + i] = (byteAt(raw, y * (stride + 1) + 1 + i) + predicted) & 255;
    }
  }
  return {
    width,
    height,
    pixel: (x, y) => [byteAt(rgba, (y * width + x) * 4), byteAt(rgba, (y * width + x) * 4 + 1), byteAt(rgba, (y * width + x) * 4 + 2), byteAt(rgba, (y * width + x) * 4 + 3)],
  };
}

/** The opaque pixels of the cell in this row and column of a sheet, as a map from "x,y" to the pixel. */
function cellOf(sheet: Picture, row: number, column: number): Map<string, Pixel> {
  const cell = new Map<string, Pixel>();
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const pixel = sheet.pixel(column * CELL + x, row * CELL + y);
      if (pixel[3] > 0) cell.set(`${x},${y}`, pixel);
    }
  }
  return cell;
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
