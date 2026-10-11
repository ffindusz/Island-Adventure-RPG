import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { expect } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';

// What the tests of the pictures in public/art share: where a sheet of the manifest is, its pixels, read from the 8-bit
// RGBA PNGs that docs/assets/compose-art.py saves, the colours and shapes that the tests of the monsters' sheets look
// for, and how far apart two colours of the flat palette lie.

export type Pixel = readonly [number, number, number, number];

export interface Picture {
  readonly width: number;
  readonly height: number;
  pixel(x: number, y: number): Pixel;
}

/** The file of a sheet of the manifest, in public/art. */
export function fileOf(art: string): string {
  const entry = (ARTWORK as ArtManifest)[art];
  if (entry?.kind !== 'sheet') throw new Error(`"${art}" is not a sheet of the manifest`);
  return entry.file;
}

export function bytesOf(file: string): Buffer {
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
export function readPicture(file: string): Picture {
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

/** The opaque pixels of the frame in this row and column of a sheet of frames of this size, as a map from "x,y" to the pixel. */
export function frameOf(sheet: Picture, row: number, column: number, width: number, height: number = width): Map<string, Pixel> {
  const frame = new Map<string, Pixel>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = sheet.pixel(column * width + x, row * height + y);
      if (pixel[3] > 0) frame.set(`${x},${y}`, pixel);
    }
  }
  return frame;
}

const OUTLINE = [0x14, 0x1b, 0x1b];

/** The dark outline that compose-art.py draws around a monster. */
export const isOutline = (pixel: Pixel): boolean => OUTLINE.every((channel, index) => channel === pixel[index]);
/** The white that compose-art.py gives the shape of a hit. */
export const isWhite = (pixel: Pixel): boolean => pixel[0] === 255 && pixel[1] === 255 && pixel[2] === 255;
/** The red that compose-art.py gives a wind-up: strong in the red, weak in the green and in the blue. */
export const isRed = (pixel: Pixel): boolean => pixel[0] >= 150 && pixel[1] <= 105 && pixel[2] <= 100;

/** The two frames fill the same pixels, whatever their colours. */
export function sameShape(a: Map<string, Pixel>, b: Map<string, Pixel>): boolean {
  return a.size === b.size && [...a.keys()].every((key) => b.has(key));
}

/** Two colours are set apart when they lie this far from each other, at least, in the cube of red, green and blue (0 to 255 each). */
export const LEAST_COLOUR_GAP = 50;

/** How far apart two colours, given as 0xRRGGBB, lie in the cube of red, green and blue. */
export function colourGap(one: number, other: number): number {
  return Math.hypot(...[16, 8, 0].map((shift) => ((one >> shift) & 0xff) - ((other >> shift) & 0xff)));
}
