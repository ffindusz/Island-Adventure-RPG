import { describe, expect, it } from 'vitest';
import { terrainColour } from '../src/adapter/art';
import { automapColour, automapPalette, EXIT_COLOUR, MAP_COLOUR } from '../src/adapter/automap-palette';
import { gameContent } from '../src/content';

// The colours of the maps on the Automap page (automap-palette.ts): one for each kind of terrain in every area, from the
// pack's own colours, each told apart from the ones it must not be taken for. Not tested: how the page looks with them.

/** The 53 colours of the pack's `Palette.png`, the list the pack's artists drew with. The file is not in the repository. */
const PACK_PALETTE: readonly number[] = [
  0xd78b4a, 0xffad5d, 0xffbc75, 0xd2b37d, 0xf1c471, 0xffcb8d, 0xeecf9b, 0xffe18d, 0xfce2ca, 0xffffff, 0x965340, 0x9c6546,
  0xa3754e, 0xbd7959, 0xd3865f, 0xc8966b, 0xf2ad7d, 0xffcba9, 0xd14b34, 0xe46d3a, 0xef914f, 0xff9554, 0xe0394c, 0xcf736d,
  0xef9597, 0x4a5270, 0x2d697b, 0x548789, 0x79b8ce, 0x71ddee, 0x8feff1, 0xb8dce5, 0xf2eaf1, 0x56864c, 0x74a334, 0xa8a129,
  0xadbc3a, 0x3b3643, 0x543c52, 0x8f3e56, 0xa5608b, 0xd3a2c0, 0x345a52, 0x5f7160, 0x8d977f, 0xabc2bc, 0x141b1b, 0x4e484a,
  0x695953, 0x816855, 0x90775e, 0x8e7c73, 0xb3957f,
];

// How far apart, in CIE76 distance (about 2 is the least an eye can tell, 50 is plainly another colour), colours must be.
/** A solid kind from a kind that is walked on: a wall must never be taken for floor, nor water for sand. */
const SOLID_FROM_WALKABLE = 30;
/** Any kind from the ground a map shows where the hero has not looked yet, and from the mark of an exit. */
const FROM_GROUND = 25;
const FROM_EXIT = 30;
/** Any two kinds of one area from each other, so that no kind is a copy of another. */
const KINDS_APART = 15;

function lab(colour: number): readonly [number, number, number] {
  const linear = (shift: number): number => {
    const value = ((colour >> shift) & 0xff) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [linear(16), linear(8), linear(0)] as const;
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function distance(a: number, b: number): number {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

const LEGEND = Object.values(gameContent.terrain);
const KINDS = [...new Set(LEGEND.map(({ kind }) => kind))];
const SOLID_KINDS = KINDS.filter((kind) => LEGEND.some((entry) => entry.kind === kind && entry.solid));
const WALKABLE_KINDS = KINDS.filter((kind) => !SOLID_KINDS.includes(kind));
const AREA_IDS = gameContent.areas.map((area) => area.id);

function colourOf(areaId: string, kind: string): number {
  const colour = automapPalette(areaId)[kind];
  if (colour === undefined) {
    throw new Error(`The palette of ${areaId} has no colour for ${kind}`);
  }
  return colour;
}

describe('the colours of the Automap', () => {
  it('knows the kinds of the legend and the areas of the game it is tested against', () => {
    expect(SOLID_KINDS.length).toBeGreaterThan(0);
    expect(WALKABLE_KINDS.length).toBeGreaterThan(0);
    expect(AREA_IDS).toEqual(expect.arrayContaining(['shipwreck-coast', 'woods', 'mountain', 'cave', 'castle']));
  });

  it('has a colour for every kind of terrain in every area, so that none falls back to a flat one', () => {
    for (const areaId of AREA_IDS) {
      for (const kind of KINDS) {
        expect(automapPalette(areaId)[kind], `${areaId}: ${kind}`).toBeDefined();
      }
    }
  });

  it('takes every colour from the pack', () => {
    for (const areaId of AREA_IDS) {
      for (const kind of KINDS) {
        const colour = colourOf(areaId, kind);
        expect(PACK_PALETTE, `${areaId}: ${kind} is #${colour.toString(16).padStart(6, '0')}`).toContain(colour);
      }
    }
    expect(PACK_PALETTE).toHaveLength(53);
    expect(PACK_PALETTE).toContain(MAP_COLOUR);
  });

  it('never lets a solid kind be taken for one that is walked on', () => {
    for (const areaId of AREA_IDS) {
      for (const solid of SOLID_KINDS) {
        for (const walkable of WALKABLE_KINDS) {
          const apart = distance(colourOf(areaId, solid), colourOf(areaId, walkable));
          expect(apart, `${areaId}: ${solid} from ${walkable}`).toBeGreaterThanOrEqual(SOLID_FROM_WALKABLE);
        }
      }
    }
  });

  it('keeps every kind clear of the ground of a map where the hero has not looked, and of the exits', () => {
    for (const areaId of AREA_IDS) {
      for (const kind of KINDS) {
        const colour = colourOf(areaId, kind);
        expect(distance(colour, MAP_COLOUR), `${areaId}: ${kind} from the ground`).toBeGreaterThanOrEqual(FROM_GROUND);
        expect(distance(colour, EXIT_COLOUR), `${areaId}: ${kind} from the exits`).toBeGreaterThanOrEqual(FROM_EXIT);
      }
    }
  });

  it('tells the kinds of an area apart, so that none is a copy of another', () => {
    for (const areaId of AREA_IDS) {
      for (const [index, kind] of KINDS.entries()) {
        for (const other of KINDS.slice(index + 1)) {
          const apart = distance(colourOf(areaId, kind), colourOf(areaId, other));
          expect(apart, `${areaId}: ${kind} from ${other}`).toBeGreaterThanOrEqual(KINDS_APART);
        }
      }
    }
  });

  it('gives the mountain, the cave and the castle a palette of their own, and the woods the coast’s', () => {
    const coast = automapPalette('shipwreck-coast');
    expect(automapPalette('woods')).toBe(coast);
    for (const areaId of ['mountain', 'cave', 'castle']) {
      expect(automapPalette(areaId), areaId).not.toBe(coast);
    }
    expect(colourOf('castle', 'water')).not.toBe(colourOf('shipwreck-coast', 'water'));
    expect(colourOf('mountain', 'rock')).not.toBe(colourOf('shipwreck-coast', 'rock'));
    expect(colourOf('cave', 'sand')).not.toBe(colourOf('shipwreck-coast', 'sand'));
  });

  it('gives an area it has no palette for the coast’s', () => {
    expect(automapPalette('an-area-added-later')).toBe(automapPalette('shipwreck-coast'));
  });

  it('colours a tile by the palette of its area, and leaves what it has no colour for to the flat art', () => {
    for (const areaId of AREA_IDS) {
      for (const kind of KINDS) {
        expect(automapColour(areaId, kind)).toBe(colourOf(areaId, kind));
      }
    }
    expect(automapColour('castle', 'lava')).toBe(terrainColour('lava'));
  });
});
