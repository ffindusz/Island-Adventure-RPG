import { terrainColour } from './art';

/** What a map shows where the hero has not looked yet. */
export const MAP_COLOUR = 0x141b1b;
/** The mark of an exit on a map. */
export const EXIT_COLOUR = 0xbfeaff;

/** The colour of each kind of terrain on the map of one area. */
type Palette = Readonly<Record<string, number>>;

// Every colour is one of the pack's own, the ones its ground is drawn with, so that a map is a small picture of the ground
// it stands for: the coast and the woods in sand, lime grass and dark sea; the mountain with its slate rock; the cave
// dark and violet; the castle in grey-green water, wall brown and flagstone. Each kind is kept clear of the kinds it
// must not be taken for (a wall for floor, water for sand), of the ground of an unexplored map and of the exits
// (tests/automap-palette.test.ts).
const STANDARD: Palette = {
  water: 0x2d697b,
  rock: 0x695953,
  sand: 0xffcb8d,
  grass: 0xadbc3a,
  wreckage: 0x965340,
  tree: 0x56864c,
};

const MOUNTAIN: Palette = { ...STANDARD, rock: 0x4a5270 };

// The water of the cave is the standard one.
const CAVE: Palette = {
  ...STANDARD,
  rock: 0x543c52,
  sand: 0xc8966b,
  grass: 0x56864c,
  wreckage: 0x695953,
  tree: 0x345a52,
};

// The castle's walls and its flagstones are the brown stone and the paler stone of its ground. The harbor's planks and
// its quay share the flagstone: the page knows kinds of terrain, not which of the sand is the dock.
const CASTLE: Palette = { ...STANDARD, water: 0x548789, sand: 0xd2b37d };

const PALETTES: ReadonlyMap<string, Palette> = new Map([
  ['mountain', MOUNTAIN],
  ['cave', CAVE],
  ['castle', CASTLE],
]);

/** The palette of the map of an area. An area that has none of its own, the coast and the woods among them, has the standard one. */
export function automapPalette(areaId: string): Palette {
  return PALETTES.get(areaId) ?? STANDARD;
}

/** The colour of a tile on the map of an area. A kind its palette has no colour for is the flat colour the ground has. */
export function automapColour(areaId: string, kind: string): number {
  return automapPalette(areaId)[kind] ?? terrainColour(kind);
}
