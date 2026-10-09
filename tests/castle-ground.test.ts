import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { describeStamp, lookOf, planTerrain } from '../src/adapter/terrain-plan';
import type { Stamp } from '../src/adapter/terrain-plan';
import { gameContent } from '../src/content';
import { fileOf, readPicture } from './pictures';

// How the ground of the castle is dressed, which is how no other area is: walls of masonry, flagstones in the halls, an
// overgrown courtyard, a pillar where a rock stands alone, a fountain where a block of rock three tiles by three stands
// free, and, at the harbor, grey-green water and weathered planks on the sand beside it. This is the plan of
// terrain-plan.ts, with no Phaser in it; how it looks is for the screenshots. The sheets the look names are checked against
// the files in public/art, and the four earlier areas against the plans they had before the castle was dressed.

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
  const area = gameContent.areas.find((candidate) => candidate.id === areaId);
  if (!area) throw new Error(`the shipped content has no area "${areaId}"`);
  return area.layout.map((row) => [...row].map((symbol) => gameContent.terrain[symbol]?.kind ?? '?'));
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

  it('counts the water above and below as near too, and lays no planks on grass or on rock', () => {
    const stamps = plan('castle', '~', '.', '.', '.', '.', '.', ',', '#');

    expect(artsOn(stamps, 0, 4)).toEqual(['castle-dock']);
    expect(new Set(artsOn(stamps, 0, 5))).toEqual(new Set(['castle-floor']));
    expect(stamps.filter((stamp) => stamp.art === 'castle-dock' && stamp.y > 4)).toEqual([]);
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

    expect(rock.length).toBeGreaterThan(1500);
    expect(rock.filter(([x, y]) => !STONE.includes(stampsOn(stamps, x, y).at(-1)?.art ?? ''))).toEqual([]);
  });

  it('lays a floor under every tile that can be walked on, and water on every tile of water, and nothing else', () => {
    const walkable = [...tiles('sand'), ...tiles('grass')];

    expect(walkable.length).toBeGreaterThan(800);
    expect(walkable.filter(([x, y]) => !GROUND.includes(stampsOn(stamps, x, y)[0]?.art ?? ''))).toEqual([]);
    expect(tiles('water').filter(([x, y]) => artsOn(stamps, x, y).some((art) => art !== 'castle-water'))).toEqual([]);
    expect(new Set(kinds.flat())).toEqual(new Set(['rock', 'sand', 'grass', 'water']));
  });

  it('has a pillar on every rock with no rock above it and none below it, and on no other, as the map is laid out', () => {
    const lone = tiles('rock').filter(([x, y]) => kindOf(x, y - 1) !== 'rock' && kindOf(x, y + 1) !== 'rock');
    const pillars = stamps.filter((stamp) => stamp.art === 'castle-pillars').map((stamp) => `${stamp.x},${stamp.y}`);

    expect(pillars.sort()).toEqual(lone.map(([x, y]) => `${x},${y}`).sort());
    // Worked by hand from the layout: the long hall (row 17), the courtyard, the great hall, the arena and the crypt.
    expect(pillars.sort()).toEqual(
      ['12,17', '16,17', '20,17', '24,17', '31,8', '39,8', '31,15', '39,16', '47,6', '53,6', '47,10', '53,10', '72,9', '80,9', '72,13', '80,13', '32,24', '38,24'].sort(),
    );
  });

  it('has the fountain on columns 34 to 36 of rows 11 to 13, and no other', () => {
    const fountain = stamps.filter((stamp) => stamp.art === 'castle-fountain');

    expect(fountain).toHaveLength(9);
    for (const stamp of fountain) {
      expect(stamp.frame, `the piece at ${stamp.x},${stamp.y}`).toBe((stamp.y - 11) * 3 + (stamp.x - 34));
      expect(stamp.x >= 34 && stamp.x <= 36 && stamp.y >= 11 && stamp.y <= 13).toBe(true);
    }
  });

  it('has the planks on the quay, columns 85 to 88 of rows 10 to 12, and on no other tile', () => {
    const planks = stamps.filter((stamp) => stamp.art === 'castle-dock').map((stamp) => `${stamp.x},${stamp.y}`);
    const quay = [85, 86, 87, 88].flatMap((x) => [10, 11, 12].map((y) => `${x},${y}`));

    expect(planks.sort()).toEqual(quay.sort());
    expect(quay.filter((tile) => kindOf(Number(tile.split(',')[0]), Number(tile.split(',')[1])) !== 'sand')).toEqual([]);
  });

  it('has a quay that is mostly plain boards with moss and a split board among them, so that it reads as old planking and not as a floor', () => {
    const boards = stamps.filter((stamp) => stamp.art === 'castle-dock').map(describeStamp);

    expect(boards.filter((board) => board === 'dock.plain').length).toBeGreaterThanOrEqual(6);
    expect(boards.filter((board) => board === 'dock.moss').length).toBeGreaterThanOrEqual(1);
    expect(boards).toContain('dock.split');
  });

  it('keeps every stamp whole on its own tile, so that no art spills over a neighbour, and the stone whole too', () => {
    expect(stamps.filter((stamp) => kindOf(stamp.x, stamp.y) === undefined)).toEqual([]);
    expect(stamps.filter((stamp) => STONE.includes(stamp.art) && stamp.quarter !== undefined)).toEqual([]);
  });

  it('has a frame on disk for every stamp', () => {
    const beyond = stamps.filter((stamp) => stamp.frame >= framesOnDisk(stamp.art));

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
  // The coast, the woods, the mountain and the cave must stay as they are, pixel for pixel: their plans are the same, to the
  // last stamp, as they were before the castle was dressed. These are the hashes of the plans of that day.
  const PLANS: Readonly<Record<string, readonly [number, string]>> = {
    'shipwreck-coast': [962, '89451d359c06bd9d888a0f3b24a8a13596fbd541'],
    woods: [2448, '0aa49fa5cf8698878c54431e3d1599eda586eb19'],
    mountain: [1667, 'd9d72eae0166f322647c1a93e81003b0d923931b'],
    cave: [1662, 'd343cb748195385b6ebebc114f446d329652ba06'],
  };

  it.each(Object.keys(PLANS))('are planned for %s exactly as they were, stamp for stamp', (areaId) => {
    const planned = planTerrain(areaKinds(areaId), lookOf(areaId));
    const text = planned.map((stamp) => `${stamp.art}:${stamp.frame}@${stamp.x},${stamp.y}${stamp.quarter ?? ''}`).join('|');

    expect([planned.length, createHash('sha1').update(text).digest('hex')]).toEqual(PLANS[areaId]);
  });
});
