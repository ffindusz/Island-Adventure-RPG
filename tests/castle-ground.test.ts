import { describe, expect, it } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { describeStamp, lookOf, planTerrain } from '../src/adapter/terrain-plan';
import type { Stamp } from '../src/adapter/terrain-plan';
import { gameContent } from '../src/content';
import { areaOf } from './main-route';
import { fileOf, readPicture } from './pictures';

// How the ground of the castle is dressed, which is how no other area is: walls of masonry, flagstones in the halls, an
// overgrown courtyard, a pillar where a rock stands alone, a fountain where a block of rock three tiles by three stands
// free, and, at the harbor, grey-green water and weathered planks on the sand beside it. This is the plan of
// terrain-plan.ts, with no Phaser in it; how it looks is for the screenshots. The sheets the look names are checked against
// the files in public/art, and the four earlier areas, on a map with all that the look of the castle dresses in a way of
// its own, are checked to keep their own sheets. The shipped castle gets generic checks only: nothing here says where on
// its map a pillar, the fountain or the quay stands.

const KINDS: Readonly<Record<string, string>> = { '.': 'sand', ',': 'grass', '#': 'rock', '~': 'water' };

function kindsOf(rows: readonly string[]): string[][] {
  return rows.map((row) => [...row].map((letter) => KINDS[letter] ?? letter));
}

/** The plan for a map drawn with the letters above, one string a row, in the look of the area with this id. */
function plan(areaId: string, ...rows: string[]): Stamp[] {
  return planTerrain(kindsOf(rows), lookOf(areaId));
}

function stampsOn(stamps: readonly Stamp[], x: number, y: number): Stamp[] {
  return stamps.filter((stamp) => stamp.x === x && stamp.y === y);
}

/** What is stamped on one tile, in the order it is painted, described the way describeStamp says. */
function onTile(stamps: readonly Stamp[], x: number, y: number): string[] {
  return stampsOn(stamps, x, y).map(describeStamp);
}

function artsOn(stamps: readonly Stamp[], x: number, y: number): string[] {
  return stampsOn(stamps, x, y).map((stamp) => stamp.art);
}

function areaKinds(areaId: string): string[][] {
  return areaOf(areaId).layout.map((row) => [...row].map((symbol) => gameContent.terrain[symbol]?.kind ?? '?'));
}

function framesOnDisk(art: string): number {
  const entry = (ARTWORK as ArtManifest)[art];
  if (entry?.kind !== 'sheet') throw new Error(`"${art}" is not a sheet of the manifest`);
  const picture = readPicture(entry.file);
  return (picture.width / entry.frameWidth) * (picture.height / entry.frameHeight);
}

const PILLAR = /^pillar\.[0-3]$/;
const CASTLE_SHEETS = ['castle-wall', 'castle-floor', 'castle-grass', 'castle-pillars', 'castle-fountain', 'castle-water', 'castle-dock'];
/** A block of rock three tiles by three, standing free in the grass. */
const POOL = [',,,,,', ',###,', ',###,', ',###,', ',,,,,'];

describe('the look of the castle', () => {
  it('names seven sheets of its own, and the manifest has them all', () => {
    expect(lookOf('castle')).toEqual({
      sand: 'castle-floor',
      grass: 'castle-grass',
      rock: 'castle-wall',
      boulders: 'castle-pillars',
      water: 'castle-water',
      dock: 'castle-dock',
      fountain: 'castle-fountain',
    });
    for (const sheet of CASTLE_SHEETS) expect(Object.keys(ARTWORK)).toContain(sheet);
  });

  it('shares no sheet with the look of any other area', () => {
    for (const areaId of ['shipwreck-coast', 'woods', 'mountain', 'cave']) {
      expect(Object.values(lookOf(areaId)).filter((art) => CASTLE_SHEETS.includes(art))).toEqual([]);
    }
  });

  it.each([
    ['castle-wall', 'terrain-rock'],
    ['castle-floor', 'terrain-sand'],
    ['castle-grass', 'terrain-grass'],
    ['castle-water', 'terrain-water'],
    ['castle-pillars', 'mountain-boulders'],
  ])('has in %s the frames of %s, so that a look changes the picture of a frame and never which frame goes where', (castle, standard) => {
    expect(framesOnDisk(castle)).toBe(framesOnDisk(standard));
  });

  it('has the frames the plan counts on in the sheets of the fountain and of the planks', () => {
    expect(framesOnDisk('castle-fountain')).toBe(9);
    expect(framesOnDisk('castle-dock')).toBe(6);
  });
});

describe('the walls, the floors and the pillars of the castle', () => {
  const WALL = ['.....', '.###.', '.###.', '.###.', '.###.', '.....'];

  it('has the face of a masonry wall on a mass of rock, lip, middle and foot', () => {
    const stamps = plan('castle', ...WALL);

    expect(onTile(stamps, 1, 1)).toEqual(['rock.lip.left']);
    expect(onTile(stamps, 2, 1)).toEqual(['rock.lip.mid']);
    expect(onTile(stamps, 3, 3)).toEqual(['rock.middle.right']);
    expect(onTile(stamps, 2, 4)).toEqual(['rock.foot.mid']);
    expect(artsOn(stamps, 2, 2)).toEqual(['castle-wall']);
  });

  it('has flagstones for sand, edged against the moss of the courtyard the way sand is edged against grass', () => {
    const stamps = plan('castle', '..,,', '..,,');

    expect(onTile(stamps, 1, 0)).toEqual(['sand.plain@nw', 'sand.edge.R@ne', 'sand.plain@sw', 'sand.edge.R@se']);
    expect(new Set(artsOn(stamps, 1, 0))).toEqual(new Set(['castle-floor']));
    expect(artsOn(stamps, 3, 1)).toEqual(['castle-grass']);
  });

  it('is a pillar on its flagstones, or on its moss, where a rock has no rock above it and none below it', () => {
    const hall = plan('castle', '.....', '..#..', '.....');
    const court = plan('castle', ',,,,,', ',,#,,', ',,,,,');

    expect(onTile(hall, 2, 1)).toEqual(['sand.plain', expect.stringMatching(PILLAR)]);
    expect(artsOn(hall, 2, 1)).toEqual(['castle-floor', 'castle-pillars']);
    expect(onTile(court, 2, 1)).toEqual(['grass.plain', expect.stringMatching(PILLAR)]);
    expect(artsOn(court, 2, 1)).toEqual(['castle-grass', 'castle-pillars']);
  });

  it('is a pillar for each rock of a row of rocks that is one tile high, and a wall where a rock has rock above it or below it', () => {
    const row = plan('castle', '.....', '.###.', '.....');
    const wall = plan('castle', '.....', '..#..', '..#..', '.....');

    for (const x of [1, 2, 3]) expect(artsOn(row, x, 1), `the rock at ${x}`).toEqual(['castle-floor', 'castle-pillars']);
    expect(onTile(wall, 2, 1)).toEqual(['rock.lip.mid']);
    expect(onTile(wall, 2, 2)).toEqual(['rock.foot.mid']);
    expect(new Set([...artsOn(wall, 2, 1), ...artsOn(wall, 2, 2)])).toEqual(new Set(['castle-wall']));
  });

  it('shows the pillars in all four of their variants, chosen by where each stands and by nothing else', () => {
    const field = ['.'.repeat(40), [...'.'.repeat(40)].map((_, x) => (x % 2 === 0 ? '#' : '.')).join(''), '.'.repeat(40)];
    const frames = (stamps: readonly Stamp[]): number[] =>
      stamps.filter((stamp) => stamp.art === 'castle-pillars').map((stamp) => stamp.frame);

    expect(frames(plan('castle', ...field))).toHaveLength(20);
    expect(new Set(frames(plan('castle', ...field)))).toEqual(new Set([0, 1, 2, 3]));

    const pillarAt = (stamps: readonly Stamp[], x: number, y: number): Stamp | undefined =>
      stampsOn(stamps, x, y).find((stamp) => stamp.art === 'castle-pillars');
    const among = plan('castle', ',,,,,,,', ',.,.,,,', '..#,.,,', '.,,.,,.', ',,,,,,,');
    const alone = plan('castle', '.....', '.....', '..#..', '.....');

    expect(pillarAt(among, 2, 2)).toBeDefined();
    expect(pillarAt(among, 2, 2)?.frame).toBe(pillarAt(alone, 2, 2)?.frame);
  });
});

describe('the fountain of the castle', () => {
  it('is a block of rock three tiles by three that stands free in the grass, drawn in nine pieces on the grass it stands in', () => {
    const stamps = plan('castle', ...POOL);

    expect(onTile(stamps, 1, 1)).toEqual(['grass.plain', 'fountain.0.0']);
    expect(onTile(stamps, 3, 1)).toEqual(['grass.plain', 'fountain.0.2']);
    expect(onTile(stamps, 2, 2)).toEqual(['grass.plain', 'fountain.1.1']);
    expect(onTile(stamps, 1, 3)).toEqual(['grass.plain', 'fountain.2.0']);
    expect(onTile(stamps, 3, 3)).toEqual(['grass.plain', 'fountain.2.2']);
    expect(stamps.filter((stamp) => stamp.art === 'castle-fountain')).toHaveLength(9);
    expect(stamps.filter((stamp) => stamp.art === 'castle-wall' || stamp.art === 'castle-pillars')).toEqual([]);
  });

  it('stands on flagstones when the ground around it is sand', () => {
    const stamps = plan('castle', '.....', '.###.', '.###.', '.###.', '.....');

    expect(onTile(stamps, 2, 2)).toEqual(['sand.plain', 'fountain.1.1']);
  });

  it.each([
    ['a block with rock touching it at a corner', [',,,,,,', ',###,,', ',###,,', ',###,,', ',,,,#,']],
    ['a block with a wall right below it', [',,,,,', ',###,', ',###,', ',###,', '#####']],
    ['a block four tiles high', [',,,,,', ',###,', ',###,', ',###,', ',###,', ',,,,,']],
    ['a block four tiles wide', [',,,,,,', ',####,', ',####,', ',####,', ',,,,,,']],
    ['a block two tiles wide', [',,,,', ',##,', ',##,', ',##,', ',,,,']],
    ['a block of rock three tiles by three with a tile of rock on its side', [',,,,,,', ',###,,', ',####,', ',###,,', ',,,,,,']],
  ])('leaves %s a wall', (_, rows) => {
    const stamps = plan('castle', ...rows);

    expect(stamps.filter((stamp) => stamp.art === 'castle-fountain')).toEqual([]);
    expect(stamps.filter((stamp) => stamp.art === 'castle-wall').length).toBeGreaterThan(5);
  });

  it.each(['shipwreck-coast', 'woods', 'mountain', 'cave', 'no such area'])('is drawn in no other area: such a block is not a fountain in %s', (areaId) => {
    expect(plan(areaId, ...POOL).filter((stamp) => stamp.art === 'castle-fountain')).toEqual([]);
    expect(planTerrain(kindsOf(POOL)).filter((stamp) => stamp.art === 'castle-fountain')).toEqual([]);
  });
});

describe('the harbor of the castle', () => {
  it('lays weathered planks on the sand that is within four tiles of the water, and flagstones on the rest', () => {
    const stamps = plan('castle', '......~~');

    for (const x of [2, 3, 4, 5]) {
      expect(artsOn(stamps, x, 0), `the tile at ${x}`).toEqual(['castle-dock']);
      expect(onTile(stamps, x, 0)[0], `the tile at ${x}`).toMatch(/^dock\.(plain|moss|weeds|split)$/);
    }
    for (const x of [0, 1]) expect(new Set(artsOn(stamps, x, 0)), `the tile at ${x}`).toEqual(new Set(['castle-floor']));
  });

  it('counts the water above and below as near too, four tiles from either', () => {
    const stamps = plan('castle', '~', '.', '.', '.', '.', '.', '.', '.', '.', '.', '~');

    for (const y of [1, 2, 3, 4, 6, 7, 8, 9]) expect(artsOn(stamps, 0, y), `the tile at row ${y}`).toEqual(['castle-dock']);
    expect(new Set(artsOn(stamps, 0, 5))).toEqual(new Set(['castle-floor']));
  });

  it('lays no planks on grass or on rock, though the water is beside them', () => {
    const stamps = plan('castle', '~,.', '~#.', '~#.');
    const planked = stamps.filter((stamp) => stamp.art === 'castle-dock').map((stamp) => `${stamp.x},${stamp.y}`);

    expect(planked.sort()).toEqual(['2,0', '2,1', '2,2']);
  });

  it('lays boards that are mostly plain, with moss, weeds and a split board among them, so that a quay reads as old planking and not as a floor', () => {
    const quay = ['~'.repeat(60), ...Array.from({ length: 4 }, () => '.'.repeat(60)), '~'.repeat(60)];
    const boards = plan('castle', ...quay)
      .filter((stamp) => stamp.art === 'castle-dock')
      .map(describeStamp);
    const count = (board: string): number => boards.filter((one) => one === board).length;

    expect(boards).toHaveLength(240);
    expect(count('dock.plain')).toBeGreaterThan(boards.length / 2);
    for (const board of ['dock.moss', 'dock.weeds', 'dock.split']) expect(count(board), board).toBeGreaterThan(0);
  });

  it('draws the water from the grey-green sheet of the castle, its shore included, and leaves other looks their water', () => {
    const castle = plan('castle', '..~~', '..~~', '..~~');
    const woods = plan('woods', '..~~', '..~~', '..~~');

    expect(onTile(castle, 2, 1)).toEqual(['water.sand.L@nw', 'water.plain@ne', 'water.sand.L@sw', 'water.plain@se']);
    expect(new Set(artsOn(castle, 2, 1))).toEqual(new Set(['castle-water']));
    expect(artsOn(castle, 3, 1)).toEqual(['castle-water']);
    expect(new Set(artsOn(woods, 2, 1))).toEqual(new Set(['terrain-water']));
  });

  it.each(['shipwreck-coast', 'woods', 'mountain', 'cave'])('lays no planks beside the water of %s', (areaId) => {
    const stamps = plan(areaId, '......~~');

    expect(stamps.filter((stamp) => stamp.art === 'castle-dock')).toEqual([]);
    expect(onTile(stamps, 4, 0)[0]).toMatch(/^sand\./);
  });
});

describe('the shipped castle', () => {
  const kinds = areaKinds('castle');
  const stamps = planTerrain(kinds, lookOf('castle'));
  const kindOf = (x: number, y: number): string | undefined => kinds[y]?.[x];
  const STONE = ['castle-wall', 'castle-pillars', 'castle-fountain'];
  const GROUND = ['castle-floor', 'castle-grass', 'castle-dock'];
  const tiles = (kind: string): (readonly [number, number])[] =>
    kinds.flatMap((row, y) => row.flatMap((here, x) => (here === kind ? [[x, y] as const] : [])));

  it('is drawn from the sheets of the castle and from nothing else', () => {
    expect(new Set(stamps.map((stamp) => stamp.art))).toEqual(new Set(CASTLE_SHEETS));
  });

  it('puts stone only on a rock tile and ends every rock tile in stone, so that a wall never reads as floor', () => {
    expect(stamps.filter((stamp) => kindOf(stamp.x, stamp.y) !== 'rock' && STONE.includes(stamp.art))).toEqual([]);
    const rock = tiles('rock');

    expect(rock.length).toBeGreaterThan(0);
    expect(rock.filter(([x, y]) => !STONE.includes(stampsOn(stamps, x, y).at(-1)?.art ?? ''))).toEqual([]);
  });

  it('lays a floor under every tile that can be walked on, and water on every tile of water, and nothing else', () => {
    const walkable = [...tiles('sand'), ...tiles('grass')];

    expect(walkable.length).toBeGreaterThan(0);
    expect(walkable.filter(([x, y]) => !GROUND.includes(stampsOn(stamps, x, y)[0]?.art ?? ''))).toEqual([]);
    expect(tiles('water').filter(([x, y]) => artsOn(stamps, x, y).some((art) => art !== 'castle-water'))).toEqual([]);
    expect(new Set(kinds.flat())).toEqual(new Set(['rock', 'sand', 'grass', 'water']));
  });

  it('has a pillar on every rock with no rock above it and none below it, and on no other, as the map is laid out', () => {
    const lone = tiles('rock').filter(([x, y]) => kindOf(x, y - 1) !== 'rock' && kindOf(x, y + 1) !== 'rock');
    const pillars = stamps.filter((stamp) => stamp.art === 'castle-pillars').map((stamp) => `${stamp.x},${stamp.y}`);

    expect(lone.length).toBeGreaterThan(0);
    expect(pillars.sort()).toEqual(lone.map(([x, y]) => `${x},${y}`).sort());
  });

  it('draws every fountain whole: nine pieces on rock tiles, each the piece that its place in the block of three by three calls for', () => {
    const fountain = stamps.filter((stamp) => stamp.art === 'castle-fountain');
    // The top left tile of the block that a piece belongs to, from the frame it shows: the frames run along the rows of three.
    const corners = fountain.map((stamp) => `${stamp.x - (stamp.frame % 3)},${stamp.y - Math.floor(stamp.frame / 3)}`);
    const piecesOf = (corner: string): number => corners.filter((one) => one === corner).length;

    expect(fountain.length).toBeGreaterThan(0);
    expect(fountain.filter((stamp) => kindOf(stamp.x, stamp.y) !== 'rock')).toEqual([]);
    expect([...new Set(corners)].filter((corner) => piecesOf(corner) !== 9)).toEqual([]);
  });

  it('lays planks only on sand at the water, none on other ground and none inland', () => {
    const planks = stamps.filter((stamp) => stamp.art === 'castle-dock');
    const water = tiles('water');
    const atTheWater = (stamp: Stamp): boolean => water.some(([x, y]) => Math.max(Math.abs(x - stamp.x), Math.abs(y - stamp.y)) <= 4);

    expect(planks.length).toBeGreaterThan(0);
    expect(planks.filter((stamp) => kindOf(stamp.x, stamp.y) !== 'sand')).toEqual([]);
    expect(planks.filter((stamp) => !atTheWater(stamp))).toEqual([]);
  });
  it('keeps every stamp whole on its own tile, so that no art spills over a neighbour, and the stone whole too', () => {
    expect(stamps.filter((stamp) => kindOf(stamp.x, stamp.y) === undefined)).toEqual([]);
    expect(stamps.filter((stamp) => STONE.includes(stamp.art) && stamp.quarter !== undefined)).toEqual([]);
  });

  it('has a frame on disk for every stamp', () => {
    const onDisk = new Map([...new Set(stamps.map((stamp) => stamp.art))].map((art) => [art, framesOnDisk(art)] as const));
    const beyond = stamps.filter((stamp) => stamp.frame >= (onDisk.get(stamp.art) ?? 0));

    expect(beyond.map((stamp) => `${stamp.art} ${describeStamp(stamp)}`)).toEqual([]);
  });

  it('has no gap in any plank, since a gap on a tile to walk on would read as a hole to avoid', () => {
    const sheet = readPicture(fileOf('castle-dock'));
    const entry = (ARTWORK as ArtManifest)['castle-dock'];
    if (entry?.kind !== 'sheet') throw new Error('not a sheet');
    const clear: string[] = [];
    for (let frame = 0; frame < framesOnDisk('castle-dock'); frame++) {
      const column = frame % (sheet.width / entry.frameWidth);
      const row = Math.floor(frame / (sheet.width / entry.frameWidth));
      for (let y = 0; y < entry.frameHeight; y++) {
        for (let x = 0; x < entry.frameWidth; x++) {
          if (sheet.pixel(column * entry.frameWidth + x, row * entry.frameHeight + y)[3] < 255) clear.push(`${frame}:${x},${y}`);
        }
      }
    }

    expect(clear).toEqual([]);
  });
});

describe('the four earlier areas', () => {
  // A map with all that the look of the castle dresses in a way of its own: grass with a block of rock three tiles by three
  // in it and a wall two tiles wide beside it, a rock that stands alone, and sand beside water.
  const EVERYTHING = [
    ',,,,,,,,,,,,',
    ',###,,##,,#,',
    ',###,,##,,,,',
    ',###,,##,,,,',
    ',,,,,,,,,,,,',
    '......~~~~~~',
    '......~~~~~~',
  ];

  it.each([
    ['shipwreck-coast', ['terrain-grass', 'terrain-rock', 'terrain-sand', 'terrain-water']],
    ['woods', ['terrain-grass', 'terrain-rock', 'terrain-sand', 'terrain-water']],
    ['mountain', ['mountain-boulders', 'mountain-cliff', 'terrain-grass', 'terrain-sand', 'terrain-water']],
    ['cave', ['cave-cliff', 'cave-grass', 'cave-sand', 'terrain-water']],
  ])('dress %s in the sheets of its own and in none of the castle: no planks, no fountain, no pillar, no grey-green water', (areaId, sheets) => {
    const used = [...new Set(plan(areaId, ...EVERYTHING).map((stamp) => stamp.art))].sort();

    expect(used).toEqual(sheets);
  });
});
