import { terrainArt } from './artwork';

// Which picture goes where on the ground of an Adventure Area. This is pure planning, with no Phaser in it: it turns the
// kinds of terrain on the map into a list of stamps, each a frame of a terrain sheet (see docs/assets/compose-art.py for
// what the frames are) on a tile or on a quarter of one, in the order they are painted. terrain-baker.ts paints them once
// onto a canvas. A kind with no picture here (anything but the six below) gets no stamp, so its colour shows.
//
// The shore, the edge of the sand and the faces of the cliffs are drawn the way a tile map with edge tiles would, but a
// quarter of a tile at a time: each quarter looks at the neighbour beside it, the neighbour above or below it, and the
// one across the corner, so that a bend, a corner and an inlet all join up with thirteen pieces for each.

export type Quarter = 'nw' | 'ne' | 'sw' | 'se';

export interface Stamp {
  /** The name of the sheet in the asset manifest. */
  readonly art: string;
  readonly frame: number;
  /** The tile it is painted on, in tiles. */
  readonly x: number;
  readonly y: number;
  /** The quarter of the tile to paint, with the same quarter of the frame. The whole tile when it is absent. */
  readonly quarter?: Quarter;
}

/** The thirteen pieces of an edge, in the order of a sheet: the middle, four sides, four outer corners, four inner ones. */
const PIECES = ['C', 'T', 'B', 'L', 'R', 'TL', 'TR', 'BL', 'BR', 'INW', 'INE', 'ISW', 'ISE'] as const;
type Piece = (typeof PIECES)[number];
const PIECE_COUNT = PIECES.length;

// The frames of each sheet. A sheet of edges (water, sand) is rows of thirteen.
const WATER = { sand: 0, grass: PIECE_COUNT, plain: 2 * PIECE_COUNT, glint: 2 * PIECE_COUNT + 1 } as const;
const SAND = { edge: 0, plain: PIECE_COUNT, twig: PIECE_COUNT + 1, pebble: PIECE_COUNT + 2 } as const;
const GRASS = { plain: 0, flecks: [4, 6], tufts: [1, 2, 3, 5] } as const;
/** Rock is three rows (the lip, the middle, the foot) of three columns (left, middle, right). */
const ROCK_ROWS = ['lip', 'middle', 'foot'] as const;
const ROCK_COLUMNS = ['left', 'mid', 'right'] as const;
/** Trees are a sheet of eight columns: the forest floor and the small trees on the first row, four big trees under it. */
const TREE_COLUMNS = 8;
const TREE = { floors: [0, 1], small: [2, 3], variants: 4 } as const;

const WATER_ART = terrainArt('water');
const SAND_ART = terrainArt('sand');
const GRASS_ART = terrainArt('grass');
const ROCK_ART = terrainArt('rock');
const TREE_ART = terrainArt('tree');

interface Corner {
  readonly quarter: Quarter;
  /** Which way the neighbours that this quarter looks at lie: across (dx) and up or down (dy). */
  readonly dx: -1 | 1;
  readonly dy: -1 | 1;
  /** The piece when the neighbour above or below, the one beside, both, or only the one across the corner is outside. */
  readonly vertical: Piece;
  readonly horizontal: Piece;
  readonly both: Piece;
  readonly inner: Piece;
}

const CORNERS: readonly Corner[] = [
  { quarter: 'nw', dx: -1, dy: -1, vertical: 'T', horizontal: 'L', both: 'TL', inner: 'INW' },
  { quarter: 'ne', dx: 1, dy: -1, vertical: 'T', horizontal: 'R', both: 'TR', inner: 'INE' },
  { quarter: 'sw', dx: -1, dy: 1, vertical: 'B', horizontal: 'L', both: 'BL', inner: 'ISW' },
  { quarter: 'se', dx: 1, dy: 1, vertical: 'B', horizontal: 'R', both: 'BR', inner: 'ISE' },
];

type KindAt = (x: number, y: number) => string | undefined;

/** A number that depends only on where it is asked for, so that the same map is always dressed the same way. */
function scatter(x: number, y: number, salt: number): number {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(salt + 1, 1103515245);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function whole(art: string, frame: number, x: number, y: number): Stamp {
  return { art, frame, x, y };
}

function quarterOf(art: string, frame: number, x: number, y: number, quarter: Quarter): Stamp {
  return { art, frame, x, y, quarter };
}

/**
 * The piece each quarter of a tile takes, by which of the neighbours it looks at are outside the tile's own ground.
 * `lookAt` says, of the neighbour at an offset, whether it is outside.
 */
function piecesFor(x: number, y: number, outside: (x: number, y: number) => boolean): Piece[] {
  return CORNERS.map((corner) => {
    const vertical = outside(x, y + corner.dy);
    const horizontal = outside(x + corner.dx, y);
    if (vertical && horizontal) return corner.both;
    if (vertical) return corner.vertical;
    if (horizontal) return corner.horizontal;
    return outside(x + corner.dx, y + corner.dy) ? corner.inner : 'C';
  });
}

function isLand(kind: string | undefined): boolean {
  return kind === 'sand' || kind === 'grass';
}

function waterTile(x: number, y: number, kindAt: KindAt): Stamp[] {
  const pieces = piecesFor(x, y, (nx, ny) => isLand(kindAt(nx, ny)));
  if (pieces.every((piece) => piece === 'C')) {
    return [whole(WATER_ART, scatter(x, y, 1) % 7 === 0 ? WATER.glint : WATER.plain, x, y)];
  }
  return CORNERS.map((corner, index) => {
    const piece = pieces[index] ?? 'C';
    if (piece === 'C') return quarterOf(WATER_ART, WATER.plain, x, y, corner.quarter);
    // The shore is sand where any tile this quarter looks at is sand, and grass where it is grass alone.
    const sandy = [kindAt(x, y + corner.dy), kindAt(x + corner.dx, y), kindAt(x + corner.dx, y + corner.dy)].includes('sand');
    return quarterOf(WATER_ART, (sandy ? WATER.sand : WATER.grass) + PIECES.indexOf(piece), x, y, corner.quarter);
  });
}

function sandTile(x: number, y: number, kindAt: KindAt): Stamp[] {
  const pieces = piecesFor(x, y, (nx, ny) => {
    const kind = kindAt(nx, ny);
    return kind === 'grass' || kind === 'tree';
  });
  if (pieces.every((piece) => piece === 'C')) {
    const roll = scatter(x, y, 2) % 20;
    return [whole(SAND_ART, roll === 0 ? SAND.twig : roll < 3 ? SAND.pebble : SAND.plain, x, y)];
  }
  return CORNERS.map((corner, index) => {
    const piece = pieces[index] ?? 'C';
    return quarterOf(SAND_ART, piece === 'C' ? SAND.plain : SAND.edge + PIECES.indexOf(piece), x, y, corner.quarter);
  });
}

function grassFrame(x: number, y: number): number {
  const roll = scatter(x, y, 3) % 20;
  if (roll < 11) return GRASS.plain;
  if (roll < 17) return GRASS.flecks[roll % 2] ?? GRASS.plain;
  return GRASS.tufts[scatter(x, y, 4) % GRASS.tufts.length] ?? GRASS.plain;
}

/** The face of a cliff: its lip on the top of a mass of rock, its foot on the bottom, and outlined at the sides. */
function rockTile(x: number, y: number, kindAt: KindAt): Stamp[] {
  const rock = (nx: number, ny: number): boolean => kindAt(nx, ny) === 'rock';
  const top = !rock(x, y - 1);
  const bottom = !rock(x, y + 1);
  // A wall one tile high has neither a lip nor a foot.
  const row = top && !bottom ? 0 : bottom && !top ? 2 : 1;
  const left = !rock(x - 1, y);
  const right = !rock(x + 1, y);
  const column = left && !right ? 0 : right && !left ? 2 : 1;
  return [whole(ROCK_ART, row * ROCK_COLUMNS.length + column, x, y)];
}

interface TreePart {
  readonly variant: number;
  readonly quarter: Quarter;
}

/** The trees of two by two tiles that the forest is cut into, first from the top left: each tile of one, by its place. */
function findTreeBlocks(terrain: readonly (readonly string[])[]): Map<string, TreePart> {
  const parts = new Map<string, TreePart>();
  const key = (x: number, y: number): string => `${x},${y}`;
  const free = (x: number, y: number): boolean => terrain[y]?.[x] === 'tree' && !parts.has(key(x, y));
  terrain.forEach((row, y) => {
    row.forEach((_, x) => {
      if (!(free(x, y) && free(x + 1, y) && free(x, y + 1) && free(x + 1, y + 1))) return;
      const variant = scatter(x, y, 5) % TREE.variants;
      parts.set(key(x, y), { variant, quarter: 'nw' });
      parts.set(key(x + 1, y), { variant, quarter: 'ne' });
      parts.set(key(x, y + 1), { variant, quarter: 'sw' });
      parts.set(key(x + 1, y + 1), { variant, quarter: 'se' });
    });
  });
  return parts;
}

const QUARTER_OFFSET: Readonly<Record<Quarter, readonly [number, number]>> = {
  nw: [0, 0],
  ne: [1, 0],
  sw: [0, 1],
  se: [1, 1],
};

/**
 * A tile of trees. Every one is on the dark floor of the forest, so that none can be taken for ground to walk on; a block
 * of four is a big tree, and any other is a small one. A tree with no other tree beside it stands in the grass of a
 * glade instead.
 */
function treeTile(x: number, y: number, kindAt: KindAt, part: TreePart | undefined): Stamp[] {
  if (part) {
    const [column, row] = QUARTER_OFFSET[part.quarter];
    return [
      whole(TREE_ART, TREE.floors[scatter(x, y, 7) % TREE.floors.length] ?? 0, x, y),
      whole(TREE_ART, (1 + row) * TREE_COLUMNS + part.variant * 2 + column, x, y),
    ];
  }
  const small = TREE.small[scatter(x, y, 6) % TREE.small.length] ?? TREE.small[0];
  const alone = ![-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => (dx !== 0 || dy !== 0) && kindAt(x + dx, y + dy) === 'tree'));
  const ground = alone ? whole(GRASS_ART, grassFrame(x, y), x, y) : whole(TREE_ART, TREE.floors[scatter(x, y, 7) % TREE.floors.length] ?? 0, x, y);
  return [ground, whole(TREE_ART, small, x, y)];
}

/** The stamps for the ground of a whole map: `terrain[row][column]` holds the kind of terrain of each tile. */
export function planTerrain(terrain: readonly (readonly string[])[]): Stamp[] {
  const kindAt: KindAt = (x, y) => terrain[y]?.[x];
  const treeParts = findTreeBlocks(terrain);
  const stamps: Stamp[] = [];
  terrain.forEach((row, y) => {
    row.forEach((kind, x) => {
      switch (kind) {
        case 'water':
        case 'wreckage':
          stamps.push(...waterTile(x, y, kindAt));
          break;
        case 'sand':
          stamps.push(...sandTile(x, y, kindAt));
          break;
        case 'grass':
          stamps.push(whole(GRASS_ART, grassFrame(x, y), x, y));
          break;
        case 'rock':
          stamps.push(...rockTile(x, y, kindAt));
          break;
        case 'tree':
          stamps.push(...treeTile(x, y, kindAt, treeParts.get(`${x},${y}`)));
          break;
      }
    });
  });
  return stamps;
}

function edgeName(frame: number): string {
  return PIECES[frame % PIECE_COUNT] ?? '?';
}

/** Words for a stamp, such as `water.sand.TL@nw` or `rock.lip.mid`: what it is, for tests and for anyone debugging. */
export function describeStamp(stamp: Stamp): string {
  const { art, frame } = stamp;
  const at = stamp.quarter ? `@${stamp.quarter}` : '';
  switch (art) {
    case WATER_ART:
      if (frame === WATER.plain) return `water.plain${at}`;
      if (frame === WATER.glint) return `water.glint${at}`;
      return `water.${frame < WATER.grass ? 'sand' : 'grass'}.${edgeName(frame)}${at}`;
    case SAND_ART:
      if (frame === SAND.plain) return `sand.plain${at}`;
      if (frame === SAND.twig) return `sand.twig${at}`;
      if (frame === SAND.pebble) return `sand.pebble${at}`;
      return `sand.edge.${edgeName(frame)}${at}`;
    case GRASS_ART:
      return `grass.${(GRASS.flecks as readonly number[]).includes(frame) ? 'flecks' : frame === GRASS.plain ? 'plain' : 'tuft'}${at}`;
    case ROCK_ART:
      return `rock.${ROCK_ROWS[Math.floor(frame / ROCK_COLUMNS.length)]}.${ROCK_COLUMNS[frame % ROCK_COLUMNS.length]}${at}`;
    case TREE_ART: {
      if ((TREE.floors as readonly number[]).includes(frame)) return `tree.floor${at}`;
      if ((TREE.small as readonly number[]).includes(frame)) return `tree.small${at}`;
      const row = Math.floor(frame / TREE_COLUMNS) - 1;
      const column = frame % TREE_COLUMNS;
      return `tree.${Math.floor(column / 2)}.${row === 0 ? 'n' : 's'}${column % 2 === 0 ? 'w' : 'e'}${at}`;
    }
    default:
      return `${art}.${frame}${at}`;
  }
}
