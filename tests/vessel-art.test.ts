import { describe, expect, it } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { TILE_SIZE } from '../src/adapter/config';
import { vesselFoot } from '../src/adapter/prop-sprites';
import { gameContent } from '../src/content';
import { fileOf, frameOf, readPicture } from './pictures';
import type { Pixel } from './pictures';

// The old vessel of the harbor is a sheet of two frames (src/adapter/prop-sprites.ts): the vessel as it is found, its sail
// furled on the mast, and the vessel prepared, its sail hoisted. A frame is three tiles wide and seven tall: the vessel lies
// in the water beside its own tile, the last of the quay, and its mast and sail stand over the rock above. The vessel's own
// tile is at the left of the fifth row. These tests are the manifest check of ADR 0002 and, with the sheet read from disk
// as ADR 0005 allows, the ties between the picture and the harbor it is made for, so that moving the vessel or the water
// cannot leave it drawn on the wrong tiles. How it looks is for the screenshots.

const VESSEL = 'prop-vessel';
const TILE = 16;
const WIDTH = 3 * TILE;
const HEIGHT = 7 * TILE;
const FURLED = 0;
const HOISTED = 1;
/** The vessel's own tile is in the fifth row of the picture, in its first column. */
const OWN_ROW = 4;
/** The water the picture is made for: the two columns right of the vessel's tile, and five rows, from two above its row to two below. */
const WATER_COLUMNS = [1, 2];
const WATER_ROWS = [-2, -1, 0, 1, 2];
/** The foot of the mast is on row 72 of the picture: from the row below it the two frames are the same. */
const BELOW_THE_MAST = 73;
/** The hull begins at this column of the picture: to the left of it are the post and the line the vessel is moored by. */
const MOORING_REACH = 17;
/** Most of the water of the harbor must stay water round the hull: no more than this share of it is covered. */
const MOST_COVERED = 0.7;
/** The last rows of the picture are water past the stern. */
const BEYOND_THE_STERN = 8;
/** The water of the picture begins at this row of it, two rows above the vessel's own: the rows over it lie over the rock above the harbor. */
const WATER_TOP = (OWN_ROW + Math.min(...WATER_ROWS)) * TILE;
/** Over the rock only the head of the mast and of the sail stand, and a row of them is no wider than this: the hull is wider. */
const HEAD_WIDTH = 8;
/** The most pixels a failure lists. */
const SHOWN = 4;

type Frame = Map<string, Pixel>;

const coordinates = (key: string): [number, number] => {
  const [x = 0, y = 0] = key.split(',').map(Number);
  return [x, y];
};
const where = (frame: Frame, test: (x: number, y: number) => boolean): Frame =>
  new Map([...frame].filter(([key]) => test(...coordinates(key))));
const sameFrame = (a: Frame, b: Frame): boolean => a.size === b.size && [...a].every(([key, pixel]) => b.get(key)?.join() === pixel.join());

const vessels = () =>
  gameContent.areas.flatMap((area) =>
    (area.interactables ?? []).flatMap((item) => (item.kind === 'vessel' ? [{ area, tile: item.tile }] : [])),
  );

const isOnOwnTile = (x: number, y: number): boolean => x < TILE && Math.floor(y / TILE) === OWN_ROW;
const isInWater = (x: number, y: number): boolean =>
  WATER_COLUMNS.includes(Math.floor(x / TILE)) && WATER_ROWS.includes(Math.floor(y / TILE) - OWN_ROW);

describe('the picture of the old vessel', () => {
  const sheet = readPicture(fileOf(VESSEL));
  const frames: readonly Frame[] = [FURLED, HOISTED].map((index) => frameOf(sheet, 0, index, WIDTH, HEIGHT));
  const furled = frames[FURLED] ?? new Map();
  const hoisted = frames[HOISTED] ?? new Map();

  it('has a sheet of its own in the manifest, its frames three tiles wide and seven tall', () => {
    expect((ARTWORK as ArtManifest)[VESSEL]).toMatchObject({ kind: 'sheet', file: 'prop-vessel.png', frameWidth: WIDTH, frameHeight: HEIGHT });
  });

  it('has its sheet on disk as two frames side by side, the sail furled and then hoisted', () => {
    expect(sheet.width).toBe(2 * WIDTH);
    expect(sheet.height).toBe(HEIGHT);
  });

  it('is made for the water of the harbor: the water within the three tiles by seven it covers is the two by five beside the vessel\'s tile', () => {
    expect(vessels()).toHaveLength(1);

    for (const { area, tile } of vessels()) {
      expect(tile.row - OWN_ROW, 'the top of the picture is inside the area').toBeGreaterThanOrEqual(0);
      expect(tile.row + HEIGHT / TILE - OWN_ROW, 'the foot of the picture is inside the area').toBeLessThanOrEqual(area.layout.length);
      for (let column = 0; column < WIDTH / TILE; column++) {
        for (let row = -OWN_ROW; row < HEIGHT / TILE - OWN_ROW; row++) {
          const kind = gameContent.terrain[area.layout[tile.row + row]?.[tile.col + column] ?? '']?.kind;
          const label = `the tile ${column} columns right of the vessel's and ${row} rows down from its row`;

          expect(kind === 'water', label).toBe(WATER_COLUMNS.includes(column) && WATER_ROWS.includes(row));
        }
      }
    }
  });

  it('leaves the quay clear: the column of the vessel\'s own tile is drawn on only in that tile, where the vessel is moored', () => {
    for (const [index, frame] of frames.entries()) {
      const outside = [...where(frame, (x, y) => x < TILE && !isOnOwnTile(x, y)).keys()].slice(0, SHOWN);

      expect(outside, `the first pixels of frame ${index} on the quay beside the vessel`).toEqual([]);
    }
  });

  it('is moored to the quay: something stands on the vessel\'s own tile in either frame', () => {
    for (const [index, frame] of frames.entries()) {
      expect(where(frame, isOnOwnTile).size, `the pixels of frame ${index} on the vessel's own tile`).toBeGreaterThan(0);
    }
  });

  it('leaves water showing round the hull: past the stern the water is clear, and only part of it is covered', () => {
    for (const [index, frame] of frames.entries()) {
      const past = [...where(frame, (_x, y) => y >= HEIGHT - BEYOND_THE_STERN).keys()].slice(0, SHOWN);
      const covered = where(frame, isInWater).size / (WATER_COLUMNS.length * TILE * WATER_ROWS.length * TILE);

      expect(past, `the first pixels of frame ${index} past the stern`).toEqual([]);
      expect(covered, `the share of the water that frame ${index} covers`).toBeLessThan(MOST_COVERED);
    }
  });

  it('keeps the hull in the water: over the rock above the harbor only the head of the mast and of the sail stand', () => {
    for (const [index, frame] of frames.entries()) {
      const widths = new Map<number, number>();
      for (const key of where(frame, (_x, y) => y < WATER_TOP).keys()) {
        const [, y = 0] = coordinates(key);
        widths.set(y, (widths.get(y) ?? 0) + 1);
      }
      const [row = 0, widest = 0] = [...widths].sort(([, a], [, b]) => b - a)[0] ?? [];

      expect(widest, `the widest row of frame ${index} over the rock, row ${row} of the picture`).toBeLessThanOrEqual(HEAD_WIDTH);
    }
  });

  it('is one vessel in two states: the frames are the same from the foot of the mast down and along the mooring, and differ above it', () => {
    const lower = (frame: Frame): Frame => where(frame, (_x, y) => y >= BELOW_THE_MAST);
    const mooring = (frame: Frame): Frame => where(frame, (x) => x < MOORING_REACH);
    const upper = (frame: Frame): Frame => where(frame, (x, y) => y < BELOW_THE_MAST && x >= MOORING_REACH);

    expect(sameFrame(lower(furled), lower(hoisted))).toBe(true);
    expect(sameFrame(mooring(furled), mooring(hoisted))).toBe(true);
    expect(sameFrame(upper(furled), upper(hoisted))).toBe(false);
  });
});

describe('where the picture of the old vessel stands', () => {
  it('has its fifth row on the vessel\'s own tile and its left edge at the tile\'s, so that its water is the water beside the tile', () => {
    for (const { tile } of vessels()) {
      const foot = { left: tile.col * TILE_SIZE, bottom: (tile.row + 1) * TILE_SIZE };

      const placed = vesselFoot(foot);
      const top = placed.bottom - HEIGHT;

      expect(placed.left).toBe(foot.left);
      expect(foot.bottom - TILE_SIZE - top).toBe(OWN_ROW * TILE);
    }
  });
});
