import { terrainArt } from './artwork';

// Which picture goes where on the ground of an Adventure Area. This is pure planning, with no Phaser in it: it turns the
// kinds of terrain on the map into a list of stamps, each a frame of a terrain sheet (see docs/assets/compose-art.py for
// what the frames are) on a tile or on a quarter of one, in the order they are painted. terrain-baker.ts paints them once
// onto a canvas. A kind with no picture here (anything but the six below) gets no stamp, so its colour shows.
//
// The shore, the edge of the sand and the faces of the cliffs are drawn the way a tile map with edge tiles would, but a
// quarter of a tile at a time: each quarter looks at the neighbour beside it, the neighbour above or below it, and the
// one across the corner, so that a bend, a corner and an inlet all join up with thirteen pieces for each.
//
// Sand, grass and rock are drawn in the look of the area (TerrainLook): the coast and the woods have the standard sheets,
// the mountain and the cave sheets of their own, with the same frames. The castle has sheets of its own too, and a look
// may add what the others do not have: water of its own, planks for the sand beside the water, and a fountain for a block
// of rock of the right shape. Each of those is switched on by a field that only the look of the castle has.

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
const WRECK_ART = terrainArt('wreckage');

/** The boulders are a sheet of four frames, one tile each. */
const BOULDER_VARIANTS = 4;
/** The planks of a quay are a sheet of six frames: two plain, two with moss in their seams, one with weeds, one split. */
const DOCK = { plain: [0, 1], moss: [2, 3], weeds: 4, split: 5 } as const;
/** Sand within this many tiles of water, in a look with planks, is planks: the quay of a harbor, and nothing further inland. */
const DOCK_REACH = 4;
/** A fountain is a block of rock this many tiles on a side, and a sheet of that many pieces by that many. */
const FOUNTAIN_SIDE = 3;

/**
 * The sheets that dress the sand, the grass and the rock of an Adventure Area. Each is laid out like the standard one of
 * its kind, so the frames are the same: a look changes the picture of a frame and never which frame goes where.
 */
export interface TerrainLook {
  readonly sand: string;
  readonly grass: string;
  readonly rock: string;
  /**
   * The sheet of boulders. When there is one, a rock with no rock above it and none below it is a boulder, not the face of
   * a cliff; when there is none, it is a cliff like any other.
   */
  readonly boulders?: string;
  /** The sheet of water, laid out like the standard one; the standard water when there is none. */
  readonly water?: string;
  /**
   * The sheet of weathered planks. When there is one, sand within DOCK_REACH tiles of water is a quay of planks. The
   * planks have no gap in them: a gap on a tile to walk on would read as a hole to avoid.
   */
  readonly dock?: string;
  /**
   * The sheet of a fountain, three pieces by three. When there is one, a block of rock exactly three tiles by three with
   * no rock in the ring of tiles around it is a fountain, not a wall.
   */
  readonly fountain?: string;
}

/** The look of the coast and of the woods, and of every area that has no look of its own. */
export const STANDARD_LOOK: TerrainLook = { sand: SAND_ART, grass: GRASS_ART, rock: ROCK_ART };
/** Cliffs of slate, and boulders; the sand of the trail and the grass of the ledges are the standard ones. */
const MOUNTAIN_LOOK: TerrainLook = { ...STANDARD_LOOK, rock: 'mountain-cliff', boulders: 'mountain-boulders' };
/** Dark stone, and a floor of sand and grass in dim colours, so that the cave is dark in the ground and nowhere else. */
const CAVE_LOOK: TerrainLook = { sand: 'cave-sand', grass: 'cave-grass', rock: 'cave-cliff' };
/**
 * Walls of masonry, flagstones in the halls and moss in the courtyards; a pillar where a rock stands alone and a fountain
 * where a block of rock stands free; and at the harbor water of grey-green and weathered planks on the sand beside it.
 */
const CASTLE_LOOK: TerrainLook = {
  sand: 'castle-floor',
  grass: 'castle-grass',
  rock: 'castle-wall',
  boulders: 'castle-pillars',
  water: 'castle-water',
  dock: 'castle-dock',
  fountain: 'castle-fountain',
};
const LOOKS: readonly TerrainLook[] = [STANDARD_LOOK, MOUNTAIN_LOOK, CAVE_LOOK, CASTLE_LOOK];

/** The look of the Adventure Area with this id: the standard one, unless it is the mountain, the cave or the castle. */
export function lookOf(areaId: string): TerrainLook {
  switch (areaId) {
    case 'mountain':
      return MOUNTAIN_LOOK;
    case 'cave':
      return CAVE_LOOK;
    case 'castle':
      return CASTLE_LOOK;
    default:
      return STANDARD_LOOK;
  }
}

/**
 * The sheet of the wreck is rows of thirteen: the deck as an edge on the first row; on the second its plain planks, a
 * hole and its cargo; then the mast, three columns by three rows from the frame named, and the two halves of the debris.
 */
const WRECK_CARGO = ['barrel', 'sack', 'rope', 'bones', 'planks'] as const;
const WRECK = {
  deck: 0,
  plain: [PIECE_COUNT, PIECE_COUNT + 1],
  hole: PIECE_COUNT + 2,
  cargo: PIECE_COUNT + 3,
  mast: 2 * PIECE_COUNT,
  debris: [2 * PIECE_COUNT + 4, 2 * PIECE_COUNT + 5],
} as const;
const MAST_SIDE = 3;
/** A wreck of fewer tiles than this is a few boards on the shore, not a hull with a deck. */
const DECK_MIN_TILES = 6;

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

function waterTile(x: number, y: number, kindAt: KindAt, art: string = WATER_ART): Stamp[] {
  const pieces = piecesFor(x, y, (nx, ny) => isLand(kindAt(nx, ny)));
  if (pieces.every((piece) => piece === 'C')) {
    return [whole(art, scatter(x, y, 1) % 7 === 0 ? WATER.glint : WATER.plain, x, y)];
  }
  return CORNERS.map((corner, index) => {
    const piece = pieces[index] ?? 'C';
    if (piece === 'C') return quarterOf(art, WATER.plain, x, y, corner.quarter);
    // The shore is sand where any tile this quarter looks at is sand, and grass where it is grass alone.
    const sandy = [kindAt(x, y + corner.dy), kindAt(x + corner.dx, y), kindAt(x + corner.dx, y + corner.dy)].includes('sand');
    return quarterOf(art, (sandy ? WATER.sand : WATER.grass) + PIECES.indexOf(piece), x, y, corner.quarter);
  });
}

/** Whether there is water within DOCK_REACH tiles of this one, in any direction. */
function nearWater(x: number, y: number, kindAt: KindAt): boolean {
  for (let dy = -DOCK_REACH; dy <= DOCK_REACH; dy += 1) {
    for (let dx = -DOCK_REACH; dx <= DOCK_REACH; dx += 1) {
      if (kindAt(x + dx, y + dy) === 'water') return true;
    }
  }
  return false;
}

/** A plank tile of a quay: plain boards for the most part, with moss, weeds and a split board now and then, by where it is. */
function dockFrame(x: number, y: number): number {
  const roll = scatter(x, y, 10) % 12;
  if (roll === 0) return DOCK.weeds;
  if (roll === 1) return DOCK.split;
  if (roll < 5) return DOCK.moss[roll % DOCK.moss.length] ?? DOCK.moss[0];
  return DOCK.plain[scatter(x, y, 11) % DOCK.plain.length] ?? DOCK.plain[0];
}

function sandTile(x: number, y: number, kindAt: KindAt, art: string = SAND_ART): Stamp[] {
  const pieces = piecesFor(x, y, (nx, ny) => {
    const kind = kindAt(nx, ny);
    return kind === 'grass' || kind === 'tree';
  });
  if (pieces.every((piece) => piece === 'C')) {
    const roll = scatter(x, y, 2) % 20;
    return [whole(art, roll === 0 ? SAND.twig : roll < 3 ? SAND.pebble : SAND.plain, x, y)];
  }
  return CORNERS.map((corner, index) => {
    const piece = pieces[index] ?? 'C';
    return quarterOf(art, piece === 'C' ? SAND.plain : SAND.edge + PIECES.indexOf(piece), x, y, corner.quarter);
  });
}

function grassFrame(x: number, y: number): number {
  const roll = scatter(x, y, 3) % 20;
  if (roll < 11) return GRASS.plain;
  if (roll < 17) return GRASS.flecks[roll % 2] ?? GRASS.plain;
  return GRASS.tufts[scatter(x, y, 4) % GRASS.tufts.length] ?? GRASS.plain;
}

/**
 * A boulder: a rock that stands alone, on the ground that most of the tiles around it are (the grass, when there is no
 * more sand than grass). Its variant is by where it stands, and the ground under it is always the plain one.
 */
function boulderTile(x: number, y: number, kindAt: KindAt, look: TerrainLook, boulders: string): Stamp[] {
  const around = AROUND.map(([dx, dy]) => kindAt(x + dx, y + dy));
  const sandy = around.filter((kind) => kind === 'sand').length > around.filter((kind) => kind === 'grass').length;
  const ground = sandy ? whole(look.sand, SAND.plain, x, y) : whole(look.grass, GRASS.plain, x, y);
  return [ground, whole(boulders, scatter(x, y, 9) % BOULDER_VARIANTS, x, y)];
}

/**
 * The face of a cliff: its lip on the top of a mass of rock, its foot on the bottom, and outlined at the sides. In a look
 * with boulders, a rock with no rock above it and none below it is a boulder instead.
 */
function rockTile(x: number, y: number, kindAt: KindAt, look: TerrainLook): Stamp[] {
  const rock = (nx: number, ny: number): boolean => kindAt(nx, ny) === 'rock';
  const alone = (nx: number, ny: number): boolean => look.boulders !== undefined && rock(nx, ny) && !rock(nx, ny - 1) && !rock(nx, ny + 1);
  if (look.boulders !== undefined && alone(x, y)) return boulderTile(x, y, kindAt, look, look.boulders);
  const top = !rock(x, y - 1);
  const bottom = !rock(x, y + 1);
  // A wall one tile high has neither a lip nor a foot.
  const row = top && !bottom ? 0 : bottom && !top ? 2 : 1;
  // A boulder beside the cliff is ground to it, so the cliff is outlined on that side.
  const left = !rock(x - 1, y) || alone(x - 1, y);
  const right = !rock(x + 1, y) || alone(x + 1, y);
  const column = left && !right ? 0 : right && !left ? 2 : 1;
  return [whole(look.rock, row * ROCK_COLUMNS.length + column, x, y)];
}

interface FountainPart {
  readonly column: number;
  readonly row: number;
  /** Whether more of the ring of tiles around the fountain is sand than grass: the ground it stands on. */
  readonly sandy: boolean;
}

/**
 * The fountains of a map: each block of rock exactly three tiles by three with no rock in the ring of tiles around it (the
 * tiles beyond the edge of the map are not rock), each tile of it by its place in the block.
 */
function findFountains(terrain: readonly (readonly string[])[]): Map<string, FountainPart> {
  const parts = new Map<string, FountainPart>();
  const rock = (x: number, y: number): boolean => terrain[y]?.[x] === 'rock';
  terrain.forEach((row, y) => {
    row.forEach((_, x) => {
      const ring: string[] = [];
      for (let dy = -1; dy <= FOUNTAIN_SIDE; dy += 1) {
        for (let dx = -1; dx <= FOUNTAIN_SIDE; dx += 1) {
          const inside = dx >= 0 && dx < FOUNTAIN_SIDE && dy >= 0 && dy < FOUNTAIN_SIDE;
          if (inside ? !rock(x + dx, y + dy) : rock(x + dx, y + dy)) return;
          if (!inside) ring.push(terrain[y + dy]?.[x + dx] ?? '');
        }
      }
      const sandy = ring.filter((kind) => kind === 'sand').length > ring.filter((kind) => kind === 'grass').length;
      for (let row = 0; row < FOUNTAIN_SIDE; row += 1) {
        for (let column = 0; column < FOUNTAIN_SIDE; column += 1) parts.set(`${x + column},${y + row}`, { column, row, sandy });
      }
    });
  });
  return parts;
}

/** A tile of a fountain: its piece of the picture, on the ground it stands on. */
function fountainTile(x: number, y: number, look: TerrainLook, fountain: string, part: FountainPart): Stamp[] {
  const ground = part.sandy ? whole(look.sand, SAND.plain, x, y) : whole(look.grass, GRASS.plain, x, y);
  return [ground, whole(fountain, part.row * FOUNTAIN_SIDE + part.column, x, y)];
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

/** One wreck: a group of wreckage tiles that touch, and whether it lies in the water or on the shore. */
interface Wreck {
  readonly tiles: readonly (readonly [number, number])[];
  readonly inWater: boolean;
  readonly hasDeck: boolean;
  /** The tile the mast stands on, when there is a deck to stand it on. */
  readonly mastBase?: readonly [number, number];
}

const AROUND = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy] as const)).filter(([dx, dy]) => dx !== 0 || dy !== 0);

/** The wrecks of a map, found by walking from each wreckage tile to the ones that touch it, left to right and top down. */
function findWrecks(terrain: readonly (readonly string[])[], kindAt: KindAt): Map<string, Wreck> {
  const wrecks = new Map<string, Wreck>();
  const key = (x: number, y: number): string => `${x},${y}`;
  terrain.forEach((row, y) => {
    row.forEach((kind, x) => {
      if (kind !== 'wreckage' || wrecks.has(key(x, y))) return;
      const tiles: [number, number][] = [];
      const pending: [number, number][] = [[x, y]];
      const seen = new Set<string>([key(x, y)]);
      let inWater = false;
      for (let next = pending.pop(); next; next = pending.pop()) {
        const [tx, ty] = next;
        tiles.push(next);
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
          const kindThere = kindAt(tx + dx, ty + dy);
          inWater ||= kindThere === 'water';
          if (kindThere === 'wreckage' && !seen.has(key(tx + dx, ty + dy))) {
            seen.add(key(tx + dx, ty + dy));
            pending.push([tx + dx, ty + dy]);
          }
        }
      }
      const hasDeck = tiles.length >= DECK_MIN_TILES;
      const wreck: Wreck = { tiles, inWater, hasDeck, mastBase: hasDeck ? mastBaseOf(tiles, kindAt) : undefined };
      for (const [tx, ty] of tiles) wrecks.set(key(tx, ty), wreck);
    });
  });
  return wrecks;
}

/** The mast stands on the last tile, on the top row of the tiles that have the wreck all around them, that has any. */
function mastBaseOf(tiles: readonly (readonly [number, number])[], kindAt: KindAt): readonly [number, number] | undefined {
  const deep = tiles.filter(([x, y]) => AROUND.every(([dx, dy]) => [undefined, 'wreckage'].includes(kindAt(x + dx, y + dy))));
  const top = Math.min(...deep.map(([, y]) => y));
  const base = deep.filter(([, y]) => y === top).sort((a, b) => b[0] - a[0])[0];
  return base;
}

/** A tile with no edge: plain planks, but a hole or a piece of cargo now and then, by where it is. */
function deckFrame(x: number, y: number, underMast: boolean): number {
  const roll = scatter(x, y, 8) % 12;
  if (underMast || roll >= 8) return WRECK.plain[0];
  if (roll >= 6) return WRECK.plain[1];
  return roll === 0 ? WRECK.hole : WRECK.cargo + roll - 1;
}

/**
 * A tile of a wreck. Under it is what the wreck lies on, water or the sand of the shore; on that, for a hull, the deck
 * drawn as an edge of the wreck, and for a few boards on the shore, one of the two halves of a picture.
 */
function wreckTile(x: number, y: number, kindAt: KindAt, wreck: Wreck): Stamp[] {
  const ground = wreck.inWater ? waterTile(x, y, kindAt) : sandTile(x, y, kindAt);
  if (!wreck.hasDeck) {
    return [...ground, whole(WRECK_ART, WRECK.debris[kindAt(x - 1, y) === 'wreckage' ? 1 : 0] ?? WRECK.debris[0], x, y)];
  }
  const pieces = piecesFor(x, y, (nx, ny) => {
    const kind = kindAt(nx, ny);
    return kind !== undefined && kind !== 'wreckage';
  });
  if (pieces.some((piece) => piece !== 'C')) {
    return [
      ...ground,
      ...CORNERS.map((corner, index) => quarterOf(WRECK_ART, WRECK.deck + PIECES.indexOf(pieces[index] ?? 'C'), x, y, corner.quarter)),
    ];
  }
  const [bx, by] = wreck.mastBase ?? [Number.NaN, Number.NaN];
  const underMast = by === y && Math.abs(bx - x) <= 1;
  return [...ground, whole(WRECK_ART, deckFrame(x, y, underMast), x, y)];
}

/** The mast: three tiles by three, its foot on the deck and its top and its sail over the water, never over ground to walk on. */
function mastStamps(wreck: Wreck, kindAt: KindAt): Stamp[] {
  if (!wreck.mastBase) return [];
  const [bx, by] = wreck.mastBase;
  const stamps: Stamp[] = [];
  for (let row = 0; row < MAST_SIDE; row += 1) {
    for (let column = 0; column < MAST_SIDE; column += 1) {
      const x = bx - 1 + column;
      const y = by - (MAST_SIDE - 1) + row;
      const kind = kindAt(x, y);
      if (kind !== undefined && !isLand(kind)) stamps.push(whole(WRECK_ART, WRECK.mast + row * PIECE_COUNT + column, x, y));
    }
  }
  return stamps;
}

/** The stamps for the ground of a whole map: `terrain[row][column]` holds the kind of terrain of each tile. */
export function planTerrain(terrain: readonly (readonly string[])[], look: TerrainLook = STANDARD_LOOK): Stamp[] {
  const kindAt: KindAt = (x, y) => terrain[y]?.[x];
  const treeParts = findTreeBlocks(terrain);
  const wrecks = findWrecks(terrain, kindAt);
  const fountains = look.fountain === undefined ? new Map<string, FountainPart>() : findFountains(terrain);
  const stamps: Stamp[] = [];
  terrain.forEach((row, y) => {
    row.forEach((kind, x) => {
      switch (kind) {
        case 'water':
          stamps.push(...waterTile(x, y, kindAt, look.water));
          break;
        case 'wreckage': {
          const wreck = wrecks.get(`${x},${y}`);
          if (wreck) stamps.push(...wreckTile(x, y, kindAt, wreck));
          break;
        }
        case 'sand':
          if (look.dock !== undefined && nearWater(x, y, kindAt)) stamps.push(whole(look.dock, dockFrame(x, y), x, y));
          else stamps.push(...sandTile(x, y, kindAt, look.sand));
          break;
        case 'grass':
          stamps.push(whole(look.grass, grassFrame(x, y), x, y));
          break;
        case 'rock': {
          const part = fountains.get(`${x},${y}`);
          if (part && look.fountain !== undefined) stamps.push(...fountainTile(x, y, look, look.fountain, part));
          else stamps.push(...rockTile(x, y, kindAt, look));
          break;
        }
        case 'tree':
          stamps.push(...treeTile(x, y, kindAt, treeParts.get(`${x},${y}`)));
          break;
      }
    });
  });
  for (const wreck of new Set(wrecks.values())) stamps.push(...mastStamps(wreck, kindAt));
  return stamps;
}

function edgeName(frame: number): string {
  return PIECES[frame % PIECE_COUNT] ?? '?';
}

/** Words for a stamp, such as `water.sand.TL@nw` or `rock.lip.mid`: what it is, for tests and for anyone debugging. */
export function describeStamp(stamp: Stamp): string {
  const { art, frame } = stamp;
  const at = stamp.quarter ? `@${stamp.quarter}` : '';
  // A sheet of the mountain or of the cave is named for what it holds, as the standard sheet of it is.
  const dresses = (family: 'sand' | 'grass' | 'rock'): boolean => LOOKS.some((look) => look[family] === art);
  if (dresses('sand')) {
    if (frame === SAND.plain) return `sand.plain${at}`;
    if (frame === SAND.twig) return `sand.twig${at}`;
    if (frame === SAND.pebble) return `sand.pebble${at}`;
    return `sand.edge.${edgeName(frame)}${at}`;
  }
  if (dresses('grass')) {
    return `grass.${(GRASS.flecks as readonly number[]).includes(frame) ? 'flecks' : frame === GRASS.plain ? 'plain' : 'tuft'}${at}`;
  }
  if (dresses('rock')) {
    return `rock.${ROCK_ROWS[Math.floor(frame / ROCK_COLUMNS.length)]}.${ROCK_COLUMNS[frame % ROCK_COLUMNS.length]}${at}`;
  }
  if (art === CASTLE_LOOK.boulders) return `pillar.${frame}${at}`;
  if (LOOKS.some((look) => look.boulders === art)) return `boulder.${frame}${at}`;
  if (LOOKS.some((look) => look.fountain === art)) return `fountain.${Math.floor(frame / FOUNTAIN_SIDE)}.${frame % FOUNTAIN_SIDE}${at}`;
  if (LOOKS.some((look) => look.dock === art)) {
    const kind = (DOCK.plain as readonly number[]).includes(frame) ? 'plain' : (DOCK.moss as readonly number[]).includes(frame) ? 'moss' : frame === DOCK.weeds ? 'weeds' : 'split';
    return `dock.${kind}${at}`;
  }
  if (art === WATER_ART || LOOKS.some((look) => look.water === art)) {
    if (frame === WATER.plain) return `water.plain${at}`;
    if (frame === WATER.glint) return `water.glint${at}`;
    return `water.${frame < WATER.grass ? 'sand' : 'grass'}.${edgeName(frame)}${at}`;
  }
  switch (art) {
    case TREE_ART: {
      if ((TREE.floors as readonly number[]).includes(frame)) return `tree.floor${at}`;
      if ((TREE.small as readonly number[]).includes(frame)) return `tree.small${at}`;
      const row = Math.floor(frame / TREE_COLUMNS) - 1;
      const column = frame % TREE_COLUMNS;
      return `tree.${Math.floor(column / 2)}.${row === 0 ? 'n' : 's'}${column % 2 === 0 ? 'w' : 'e'}${at}`;
    }
    case WRECK_ART: {
      if (frame < WRECK.plain[0]) return `wreck.deck.${edgeName(frame)}${at}`;
      if ((WRECK.plain as readonly number[]).includes(frame)) return `wreck.deck.plain${at}`;
      if (frame === WRECK.hole) return `wreck.hole${at}`;
      if (frame >= WRECK.cargo && frame < WRECK.cargo + WRECK_CARGO.length) return `wreck.cargo.${WRECK_CARGO[frame - WRECK.cargo]}${at}`;
      if (frame === WRECK.debris[0]) return `wreck.debris.left${at}`;
      if (frame === WRECK.debris[1]) return `wreck.debris.right${at}`;
      const offset = frame - WRECK.mast;
      return `wreck.mast.${offset % PIECE_COUNT}.${Math.floor(offset / PIECE_COUNT)}${at}`;
    }
    default:
      return `${art}.${frame}${at}`;
  }
}
