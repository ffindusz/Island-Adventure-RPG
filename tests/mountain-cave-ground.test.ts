import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARTWORK } from '../src/adapter/artwork';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { describeStamp, lookOf, planTerrain, STANDARD_LOOK } from '../src/adapter/terrain-plan';
import type { Stamp, TerrainLook } from '../src/adapter/terrain-plan';
import { gameContent } from '../src/content';
import { areaOf } from './main-route';

// How the ground of the mountain and of the cave is dressed, which is not how the coast and the woods are: the mountain
// has cliffs of slate and boulders where a rock stands alone, the cave has cliffs of a darker stone and a floor of sand and
// grass in dim colours that is part of the ground itself. This is the plan of terrain-plan.ts, with no Phaser in it; how it
// looks is for the screenshots. The sheets the looks name are checked against the files in public/art.

const KINDS: Readonly<Record<string, string>> = { '.': 'sand', ',': 'grass', '#': 'rock' };

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

function areaKinds(areaId: string): string[][] {
  return areaOf(areaId).layout.map((row) => [...row].map((symbol) => gameContent.terrain[symbol]?.kind ?? '?'));
}

function sizeOnDisk(file: string): { width: number; height: number } {
  const png = readFileSync(new URL(`../public/art/${file}`, import.meta.url));
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function framesOnDisk(art: string): number {
  const entry = (ARTWORK as ArtManifest)[art];
  if (entry?.kind !== 'sheet') throw new Error(`"${art}" is not a sheet of the manifest`);
  const { width, height } = sizeOnDisk(entry.file);
  return (width / entry.frameWidth) * (height / entry.frameHeight);
}

const BOULDER = /^boulder\.[0-3]$/;

describe('the ground of the mountain', () => {
  const CLIFF = ['.....', '.###.', '.###.', '.###.', '.....'];

  it('has the face of a cliff from the slate sheet of the mountain on a mass of rock, lip, middle and foot', () => {
    const stamps = plan('mountain', ...CLIFF);

    expect(onTile(stamps, 1, 1)).toEqual(['rock.lip.left']);
    expect(onTile(stamps, 2, 1)).toEqual(['rock.lip.mid']);
    expect(onTile(stamps, 3, 2)).toEqual(['rock.middle.right']);
    expect(onTile(stamps, 2, 3)).toEqual(['rock.foot.mid']);
    expect(stampsOn(stamps, 2, 2).map((stamp) => stamp.art)).toEqual(['mountain-cliff']);
  });

  it('is a boulder on its ground where a rock has no rock above it and none below it', () => {
    const stamps = plan('mountain', '.....', '..#..', '.....');

    expect(onTile(stamps, 2, 1)).toEqual(['sand.plain', expect.stringMatching(BOULDER)]);
    expect(stampsOn(stamps, 2, 1).map((stamp) => stamp.art)).toEqual(['terrain-sand', 'mountain-boulders']);
  });

  it('is a boulder for each rock of a row of rocks that is one tile high, and for a pair', () => {
    const stamps = plan('mountain', '......', '.##...', '......');

    expect(onTile(stamps, 1, 1)).toEqual(['sand.plain', expect.stringMatching(BOULDER)]);
    expect(onTile(stamps, 2, 1)).toEqual(['sand.plain', expect.stringMatching(BOULDER)]);
  });

  it('is a cliff, not a boulder, where a rock has rock above it or below it', () => {
    const stamps = plan('mountain', '.....', '..#..', '..#..', '.....');

    expect(onTile(stamps, 2, 1)).toEqual(['rock.lip.mid']);
    expect(onTile(stamps, 2, 2)).toEqual(['rock.foot.mid']);
  });

  it('puts a boulder on grass in the grass, and on sand in the sand', () => {
    const inGrass = plan('mountain', ',,,,,', ',,#,,', ',,,,,');
    const inSand = plan('mountain', '.....', '..#..', '.....');

    expect(onTile(inGrass, 2, 1)[0]).toMatch(/^grass\./);
    expect(onTile(inSand, 2, 1)[0]).toBe('sand.plain');
  });

  it('puts a boulder on the ground that most of the eight tiles around it are, grass when there is no more sand', () => {
    const trail = plan('mountain', ',,,,,', ',.#,,', ',,,,,');
    const ford = plan('mountain', '.....', '..#,.', '.....');
    const split = plan('mountain', '.,.', ',#,', '.,.');

    expect(onTile(trail, 2, 1)[0]).toMatch(/^grass\./);
    expect(onTile(ford, 2, 1)[0]).toBe('sand.plain');
    expect(onTile(split, 1, 1)[0]).toMatch(/^grass\./);
  });

  it('shows the boulders in all four of their variants, chosen by where each stands and by nothing else', () => {
    const field = ['.'.repeat(40), [...'.'.repeat(40)].map((_, x) => (x % 2 === 0 ? '#' : '.')).join(''), '.'.repeat(40)];
    const frames = (stamps: readonly Stamp[]): number[] =>
      stamps.filter((stamp) => stamp.art === 'mountain-boulders').map((stamp) => stamp.frame);

    expect(frames(plan('mountain', ...field))).toHaveLength(20);
    expect(new Set(frames(plan('mountain', ...field)))).toEqual(new Set([0, 1, 2, 3]));

    const boulderAt = (stamps: readonly Stamp[], x: number, y: number): Stamp | undefined =>
      stampsOn(stamps, x, y).find((stamp) => stamp.art === 'mountain-boulders');
    const among = plan('mountain', ',,,,,,,', ',.,.,,,', '..#,.,,', '.,,.,,.', ',,,,,,,');
    const alone = plan('mountain', '.....', '.....', '..#..', '.....');

    expect(boulderAt(among, 2, 2)).toBeDefined();
    expect(boulderAt(among, 2, 2)?.frame).toBe(boulderAt(alone, 2, 2)?.frame);
  });

  it('outlines a cliff on the side of a boulder beside it, since that is open ground to the cliff', () => {
    const rows = ['.....', '.##..', '..#..', '.....'];

    expect(onTile(plan('mountain', ...rows), 1, 1)).toEqual(['sand.plain', expect.stringMatching(BOULDER)]);
    expect(onTile(plan('mountain', ...rows), 2, 1)).toEqual(['rock.lip.mid']);
    expect(onTile(plan('woods', ...rows), 2, 1)).toEqual(['rock.lip.right']);
  });

  it('dresses the sand of the trail and the grass of the ledges as the coast and the woods are dressed', () => {
    const stamps = plan('mountain', '..,,', '..,,');

    expect(onTile(stamps, 1, 0)).toEqual(['sand.plain@nw', 'sand.edge.R@ne', 'sand.plain@sw', 'sand.edge.R@se']);
    expect(new Set(stamps.map((stamp) => stamp.art))).toEqual(new Set(['terrain-sand', 'terrain-grass']));
  });

  describe('as the shipped Adventure Area', () => {
    const kinds = areaKinds('mountain');
    const stamps = planTerrain(kinds, lookOf('mountain'));
    const kindOf = (stamp: Stamp): string | undefined => kinds[stamp.y]?.[stamp.x];
    const STONE = ['mountain-cliff', 'mountain-boulders'];

    it('puts a boulder only on a rock tile', () => {
      const boulders = stamps.filter((stamp) => stamp.art === 'mountain-boulders');

      expect(boulders.length).toBeGreaterThan(0);
      expect(boulders.filter((stamp) => kindOf(stamp) !== 'rock')).toEqual([]);
    });

    it('has a boulder on every rock with no rock above it and none below it, and on no other, as the map is laid out', () => {
      const rock = (x: number, y: number): boolean => kinds[y]?.[x] === 'rock';
      const lone = kinds.flatMap((row, y) => row.flatMap((_, x) => (rock(x, y) && !rock(x, y - 1) && !rock(x, y + 1) ? [`${x},${y}`] : [])));
      const boulders = stamps.filter((stamp) => stamp.art === 'mountain-boulders').map((stamp) => `${stamp.x},${stamp.y}`);

      expect(boulders.sort()).toEqual(lone.sort());
      // Worked by hand from the layout: the pair at 12 and 13 of row 14, the one at 34 of it, and the pair at 5 and 6 of row 23.
      expect(boulders).toEqual(expect.arrayContaining(['12,14', '13,14', '34,14', '5,23', '6,23']));
    });

    it('draws no stone on any tile that can be walked on, and ends every rock tile in stone, so a wall never reads as floor', () => {
      expect(stamps.filter((stamp) => kindOf(stamp) !== 'rock' && STONE.includes(stamp.art))).toEqual([]);
      const rockTiles = kinds.flatMap((row, y) => row.flatMap((kind, x) => (kind === 'rock' ? [[x, y] as const] : [])));
      const ending = rockTiles.map(([x, y]) => stampsOn(stamps, x, y).at(-1)?.art);

      expect(rockTiles.length).toBeGreaterThan(100);
      expect(ending.filter((art) => art === undefined || !STONE.includes(art))).toEqual([]);
    });

    it('keeps every stamp whole on its own tile, so that no art spills over a neighbour', () => {
      const outside = stamps.filter((stamp) => kinds[stamp.y]?.[stamp.x] === undefined);
      const rock = stamps.filter((stamp) => STONE.includes(stamp.art));

      expect(outside).toEqual([]);
      expect(rock.filter((stamp) => stamp.quarter !== undefined)).toEqual([]);
    });

    it('is drawn from the sheets of the mountain and the standard sand and grass, and from nothing of the cave', () => {
      expect(new Set(stamps.map((stamp) => stamp.art))).toEqual(
        new Set(['terrain-sand', 'terrain-grass', 'mountain-cliff', 'mountain-boulders']),
      );
    });

    it('has a frame on disk for every stamp', () => {
      const beyond = stamps.filter((stamp) => stamp.frame >= framesOnDisk(stamp.art));

      expect(beyond.map((stamp) => `${stamp.art} ${describeStamp(stamp)}`)).toEqual([]);
    });
  });
});

describe('the ground of the cave', () => {
  it('is a cliff of the dark stone on every rock, a lone rock too, since a boulder would read as a floor to walk on', () => {
    const stamps = plan('cave', '...', '.#.', '...');

    expect(onTile(stamps, 1, 1)).toEqual(['rock.middle.mid']);
    expect(stampsOn(stamps, 1, 1).map((stamp) => stamp.art)).toEqual(['cave-cliff']);
  });

  it('has a floor of sand and grass from the dim sheets, edged the way the sand of the coast is', () => {
    const stamps = plan('cave', '..,,', '..,,');

    expect(onTile(stamps, 1, 0)).toEqual(['sand.plain@nw', 'sand.edge.R@ne', 'sand.plain@sw', 'sand.edge.R@se']);
    expect(new Set(stampsOn(stamps, 1, 0).map((stamp) => stamp.art))).toEqual(new Set(['cave-sand']));
    expect(stampsOn(stamps, 3, 1).map((stamp) => stamp.art)).toEqual(['cave-grass']);
  });

  describe('as the shipped Adventure Area', () => {
    const kinds = areaKinds('cave');
    const stamps = planTerrain(kinds, lookOf('cave'));

    it('is drawn only from the sheets of the cave, nothing of the bright ground or of the mountain', () => {
      expect(new Set(stamps.map((stamp) => stamp.art))).toEqual(new Set(['cave-sand', 'cave-grass', 'cave-cliff']));
    });

    it('ends every rock tile in a cliff and puts no cliff on any other tile, so a wall never reads as floor', () => {
      const kindOf = (stamp: Stamp): string | undefined => kinds[stamp.y]?.[stamp.x];
      const rockTiles = kinds.flatMap((row, y) => row.flatMap((kind, x) => (kind === 'rock' ? [[x, y] as const] : [])));

      expect(stamps.filter((stamp) => stamp.art === 'cave-cliff' && kindOf(stamp) !== 'rock')).toEqual([]);
      expect(rockTiles.filter(([x, y]) => stampsOn(stamps, x, y).at(-1)?.art !== 'cave-cliff')).toEqual([]);
      expect(rockTiles.length).toBeGreaterThan(500);
    });

    it('has a frame on disk for every stamp', () => {
      const beyond = stamps.filter((stamp) => stamp.frame >= framesOnDisk(stamp.art));

      expect(beyond.map((stamp) => `${stamp.art} ${describeStamp(stamp)}`)).toEqual([]);
    });
  });
});

describe('the looks of the Adventure Areas', () => {
  it.each(['shipwreck-coast', 'woods'])('leave %s dressed as it always was, the same as with no look at all', (areaId) => {
    const kinds = areaKinds(areaId);

    expect(lookOf(areaId)).toEqual(STANDARD_LOOK);
    expect(planTerrain(kinds, lookOf(areaId))).toEqual(planTerrain(kinds));
  });

  it('leave an Adventure Area that has no look of its own dressed that way too', () => {
    expect(lookOf('no such area')).toEqual(STANDARD_LOOK);
  });

  it.each(['mountain', 'cave'])('name sheets of the manifest only, for %s', (areaId) => {
    const look: TerrainLook = lookOf(areaId);

    for (const art of Object.values(look)) expect(Object.keys(ARTWORK)).toContain(art);
  });

  it('give the mountain and the cave a look of their own, and the cave no boulders', () => {
    expect(lookOf('mountain')).not.toEqual(lookOf('woods'));
    expect(lookOf('cave')).not.toEqual(lookOf('mountain'));
    expect(lookOf('mountain').boulders).toBeDefined();
    expect(lookOf('cave').boulders).toBeUndefined();
  });
});
