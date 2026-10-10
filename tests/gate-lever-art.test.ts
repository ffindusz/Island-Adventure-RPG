import { describe, expect, it } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { fileOf, frameOf, readPicture } from './pictures';
import type { Pixel } from './pictures';

// A gate and a lever are each a sheet of two frames, the way a door is (src/adapter/prop-sprites.ts): a gate shut and
// then open, a lever at rest and then pulled. A gate's frame is its arch, which stands over the way and on the rock on
// each side of it, with its bars in the way between its legs; a lever's frame is its whole tile, a niche in the rock.
// That is the manifest check of ADR 0002 and, with the sheets read from disk as ADR 0005 allows, the shape of the frames:
// how they look is for the screenshots.

const GATE = 'prop-gate';
const LEVER = 'prop-lever';
const GATE_WIDTH = 24;
const GATE_HEIGHT = 25;
const TILE = 16;
const SHUT = 0;
const OPEN = 1;
const AT_REST = 0;
const PULLED = 1;
/** The way through a gate: the tile at the foot of its frame, between its two legs of four pixels, under its arch of nine rows. */
const WAY = { left: 4, top: 9, size: TILE };
const LEGS = [
  [0, 3],
  [GATE_WIDTH - 4, GATE_WIDTH - 1],
] as const;

type Frame = Map<string, Pixel>;

const coordinates = (key: string): [number, number] => {
  const [x = 0, y = 0] = key.split(',').map(Number);
  return [x, y];
};
const inWay = (key: string): boolean => {
  const [x, y] = coordinates(key);
  return x >= WAY.left && x < WAY.left + WAY.size && y >= WAY.top && y < WAY.top + WAY.size;
};
const wayOf = (frame: Frame): Frame => new Map([...frame].filter(([key]) => inWay(key)));
const outsideWayOf = (frame: Frame): Frame => new Map([...frame].filter(([key]) => !inWay(key)));
const columnsOf = (frame: Frame): Set<number> => new Set([...frame.keys()].map((key) => coordinates(key)[0]));
const rowsOf = (frame: Frame): Set<number> => new Set([...frame.keys()].map((key) => coordinates(key)[1]));

const sameFrame = (a: Frame, b: Frame): boolean => a.size === b.size && [...a].every(([key, pixel]) => b.get(key)?.join() === pixel.join());

/** The red and the blue of the knob of a lever: strong in one colour and weak in the others. */
const isRed = (pixel: Pixel): boolean => pixel[0] >= 150 && pixel[1] <= 105 && pixel[2] <= 100;
const isBlue = (pixel: Pixel): boolean => pixel[2] >= 180 && pixel[2] - pixel[0] >= 50;

const middleOf = (pixels: Frame): number => [...pixels.keys()].reduce((sum, key) => sum + coordinates(key)[0], 0) / pixels.size;
const where = (frame: Frame, test: (pixel: Pixel) => boolean): Frame => new Map([...frame].filter(([, pixel]) => test(pixel)));

describe('a gate', () => {
  const gate = (frame: number): Frame => frameOf(readPicture(fileOf(GATE)), 0, frame, GATE_WIDTH, GATE_HEIGHT);

  it('has a sheet of its own in the manifest, its frames as wide as the way and its two legs and as high as the way and its arch', () => {
    expect((ARTWORK as ArtManifest)[GATE]).toMatchObject({ kind: 'sheet', file: 'prop-gate.png', frameWidth: GATE_WIDTH, frameHeight: GATE_HEIGHT });
  });

  it('has its sheet on disk as two frames side by side, the gate shut and then the gate open', () => {
    const sheet = readPicture(fileOf(GATE));

    expect(sheet.width).toBe(2 * GATE_WIDTH);
    expect(sheet.height).toBe(GATE_HEIGHT);
  });

  it('stands on both of its legs at the foot of the frame, shut or open', () => {
    for (const frame of [SHUT, OPEN]) {
      const feet = [...gate(frame).keys()].map(coordinates).filter(([, y]) => y === GATE_HEIGHT - 1).map(([x]) => x);

      for (const [first, last] of LEGS) {
        expect(
          feet.some((x) => x >= first && x <= last),
          `the leg from ${first} to ${last} at the foot of frame ${frame}`,
        ).toBe(true);
      }
    }
  });

  it('is the same arch shut or open: only the way between its legs changes', () => {
    expect(sameFrame(outsideWayOf(gate(SHUT)), outsideWayOf(gate(OPEN)))).toBe(true);
    expect(outsideWayOf(gate(OPEN)).size).toBeGreaterThan(0);
  });

  it('leaves the whole way clear when it is open', () => {
    expect(wayOf(gate(OPEN)).size).toBe(0);
  });

  it('bars the way in every column and every row of it when it is shut', () => {
    const way = wayOf(gate(SHUT));

    expect(columnsOf(way).size).toBe(WAY.size);
    expect(rowsOf(way).size).toBe(WAY.size);
  });

  it('is bars with the way showing between them, and not a wall, when it is shut', () => {
    const barred = wayOf(gate(SHUT)).size;
    const tiles = WAY.size * WAY.size;

    expect(barred).toBeGreaterThanOrEqual(tiles / 3);
    expect(barred).toBeLessThanOrEqual((tiles * 9) / 10);
  });
});

describe('a lever', () => {
  const lever = (frame: number): Frame => frameOf(readPicture(fileOf(LEVER)), 0, frame, TILE);

  it('has a sheet of its own in the manifest, of frames one tile wide and one tile high', () => {
    expect((ARTWORK as ArtManifest)[LEVER]).toMatchObject({ kind: 'sheet', file: 'prop-lever.png', frameWidth: TILE, frameHeight: TILE });
  });

  it('has its sheet on disk as two frames side by side, the lever at rest and then the lever pulled', () => {
    const sheet = readPicture(fileOf(LEVER));

    expect(sheet.width).toBe(2 * TILE);
    expect(sheet.height).toBe(TILE);
  });

  it('fills its whole tile, at rest or pulled, so that the floor of the tile never shows round it', () => {
    for (const frame of [AT_REST, PULLED]) {
      expect(lever(frame).size, `frame ${frame}`).toBe(TILE * TILE);
    }
  });

  it('has a red knob on the left of its tile at rest, and a blue one on the right when it is pulled', () => {
    const redAtRest = where(lever(AT_REST), isRed);
    const blueWhenPulled = where(lever(PULLED), isBlue);

    expect(redAtRest.size).toBeGreaterThanOrEqual(8);
    expect(blueWhenPulled.size).toBeGreaterThanOrEqual(8);
    expect(middleOf(redAtRest)).toBeLessThan(TILE / 2);
    expect(middleOf(blueWhenPulled)).toBeGreaterThan(TILE / 2);
    expect(where(lever(AT_REST), isBlue).size).toBe(0);
    expect(where(lever(PULLED), isRed).size).toBe(0);
  });

  it('is set in the same stone, at rest or pulled', () => {
    const stone = (frame: Frame): Frame => new Map([...frame].filter(([key]) => coordinates(key)[1] >= TILE - 4));

    expect(stone(lever(AT_REST)).size).toBeGreaterThan(0);
    expect(sameFrame(stone(lever(AT_REST)), stone(lever(PULLED)))).toBe(true);
  });
});
