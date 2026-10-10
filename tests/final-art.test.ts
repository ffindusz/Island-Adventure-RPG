import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARTWORK, FINAL_ART_AREAS, frameSize, hasFinalArt, neededArt } from '../src/adapter/artwork';
import { manifestLookup, missingArt, requireArt } from '../src/adapter/asset-manifest';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { SHEET_COLUMNS } from '../src/adapter/config';
import { describeStamp, planTerrain } from '../src/adapter/terrain-plan';
import { gameContent } from '../src/content';
import type { AreaDefinition, ContentDefinition } from '../src/core';

// The terrain and the monsters of the areas whose art is final are found by name, `terrain-<kind>` and
// `monster-<type>`, and the game refuses to start while one is missing. Only the areas that are listed as final count: a
// kind or a type that has only a colour (the mountain's, until its art is drawn) must not stop the game from starting.
// This is the manifest check of ADR 0002, and with it the files of public/art read from disk as ADR 0005 allows, and
// nothing else of the drawing: the names, and that each picture a manifest entry points at is a file of the right shape.
// The look is for the screenshots.

const terrainOrMonster = (name: string): boolean => name.startsWith('terrain-') || name.startsWith('monster-');

const withoutArt = (name: string): ArtManifest =>
  Object.fromEntries(Object.entries(ARTWORK).filter(([key]) => key !== name));

/** The shipped content with `area` in it as well, or in place of the area that has its id. */
function withArea(area: AreaDefinition): ContentDefinition {
  const lizard = gameContent.monsterTypes['crab'];
  if (!lizard) throw new Error('the shipped content has no crab to copy');
  const known = gameContent.areas.some((candidate) => candidate.id === area.id);
  return {
    ...gameContent,
    terrain: { ...gameContent.terrain, '^': { kind: 'lava', solid: true } },
    monsterTypes: { ...gameContent.monsterTypes, lizard },
    areas: known
      ? gameContent.areas.map((candidate) => (candidate.id === area.id ? area : candidate))
      : [...gameContent.areas, area],
  };
}

/** The area with a tile of a new kind (`^`, lava) in its first row, and a monster of a new type (a lizard) placed in it. */
function withLavaAndALizard(area: AreaDefinition, id: string = area.id): AreaDefinition {
  return {
    ...area,
    id,
    layout: area.layout.map((row, index) => (index === 0 ? `^${row.slice(1)}` : row)),
    monsters: [...area.monsters, { id: `${id}-lizard`, type: 'lizard', tile: { col: 5, row: 9 } }],
  };
}

function shippedArea(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (!area) throw new Error(`the shipped content has no area "${id}"`);
  return area;
}

describe('the art of the areas whose art is final', () => {
  const finalAreas = gameContent.areas.filter((area) => FINAL_ART_AREAS.includes(area.id));
  const kinds = new Set(
    finalAreas.flatMap((area) => [...area.layout.join('')].map((symbol) => gameContent.terrain[symbol]?.kind ?? '?')),
  );
  const types = new Set(finalAreas.flatMap((area) => area.monsters.map((monster) => monster.type)));

  it('is listed only for areas that the shipped content has', () => {
    expect(finalAreas.map((area) => area.id).sort()).toEqual([...FINAL_ART_AREAS].sort());
  });

  it('is named for every kind of terrain laid out in them and every type of monster placed in them, and for no more', () => {
    const needed = neededArt(gameContent);

    expect(kinds.size).toBeGreaterThan(1);
    expect(types.size).toBeGreaterThan(1);
    for (const kind of kinds) expect(needed).toContain(`terrain-${kind}`);
    for (const type of types) expect(needed).toContain(`monster-${type}`);
    expect(needed.filter(terrainOrMonster)).toHaveLength(kinds.size + types.size);
  });

  it('is in the asset manifest, every picture of it', () => {
    expect(missingArt(neededArt(gameContent).filter(terrainOrMonster), manifestLookup(ARTWORK))).toEqual([]);
  });

  it.each(neededArt(gameContent).filter(terrainOrMonster))(
    'stops the game from starting, naming it, when the picture %s is missing',
    (name) => {
      const manifest = manifestLookup(withoutArt(name));

      expect(missingArt(neededArt(gameContent), manifest)).toEqual([name]);
      expect(() => requireArt(neededArt(gameContent), manifest, 'The game needs art that is not registered')).toThrow(
        `The game needs art that is not registered: "${name}"`,
      );
    },
  );

  it('is asked for as well when a listed area gets a kind of terrain and a type of monster that have no art yet', () => {
    const content = withArea(withLavaAndALizard(shippedArea('shipwreck-coast')));

    expect(missingArt(neededArt(content), manifestLookup(ARTWORK))).toEqual(['terrain-lava', 'monster-lizard']);
  });

  it('is not asked for a kind or a type that only an area outside the list uses, which keeps its colour', () => {
    const content = withArea(withLavaAndALizard(shippedArea('woods'), 'unfinished-area'));

    expect(FINAL_ART_AREAS).not.toContain('unfinished-area');
    expect(neededArt(content)).toEqual(neededArt(gameContent));
    expect(missingArt(neededArt(content), manifestLookup(ARTWORK))).toEqual([]);
  });

  it('is refused for a listed area that the content does not have', () => {
    expect(() => neededArt(gameContent, ['shipwreck-coast', 'nowhere'])).toThrow('"nowhere"');
  });

  it('is what the scene draws for the coast and the woods, while any other area keeps its colours', () => {
    expect(hasFinalArt('shipwreck-coast')).toBe(true);
    expect(hasFinalArt('woods')).toBe(true);
    expect(hasFinalArt('unfinished-area')).toBe(false);
  });
});

/** The size in pixels of a picture on disk (public/art), read from the header of the PNG. */
function sizeOnDisk(file: string): { width: number; height: number } {
  const png = readFileSync(new URL(`../public/art/${file}`, import.meta.url));
  expect(png.subarray(1, 4).toString('latin1'), `the signature of ${file}`).toBe('PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** How many frames the picture on disk (public/art) holds, by the size in its header and the frame size of the manifest. */
function framesOnDisk(art: string): number {
  const entry = (ARTWORK as ArtManifest)[art];
  if (entry?.kind !== 'sheet') throw new Error(`"${art}" is not a sheet of the manifest`);
  const { width, height } = sizeOnDisk(entry.file);
  expect(width % entry.frameWidth, `the width of ${entry.file}`).toBe(0);
  expect(height % entry.frameHeight, `the height of ${entry.file}`).toBe(0);
  return (width / entry.frameWidth) * (height / entry.frameHeight);
}

describe('the pictures of the manifest on disk', () => {
  const filed = Object.entries(ARTWORK as ArtManifest).flatMap(([art, entry]) => (entry.kind === 'drawn' ? [] : [art]));

  it('are most of the manifest, sheets among them', () => {
    const kinds = new Set(filed.map((art) => (ARTWORK as ArtManifest)[art]?.kind));

    expect(filed.length).toBeGreaterThan(20);
    expect(kinds).toEqual(new Set(['image', 'sheet']));
  });

  it.each(filed)('%s has its file in public/art, and a sheet of it is whole frames', (art) => {
    const entry = (ARTWORK as ArtManifest)[art];
    if (entry?.kind === 'sheet') expect(framesOnDisk(art)).toBeGreaterThan(0);
    else if (entry?.kind === 'image') expect(sizeOnDisk(entry.file).width).toBeGreaterThan(0);
    else throw new Error(`"${art}" is not a picture of the manifest`);
  });

  it('has the sheet of the hero and of every monster as wide as the ways a character faces (SHEET_COLUMNS)', () => {
    const characters = filed.filter((art) => art === 'hero' || art.startsWith('monster-'));

    expect(characters.length).toBeGreaterThan(15);
    for (const art of characters) {
      const entry = (ARTWORK as ArtManifest)[art];
      if (entry?.kind !== 'sheet') throw new Error(`"${art}" is not a sheet of the manifest`);
      expect(sizeOnDisk(entry.file).width, `the width of ${entry.file}`).toBe(SHEET_COLUMNS * entry.frameWidth);
    }
  });
});

describe('the size of a frame of a sheet', () => {
  it('is the one in the manifest, square unless the sheet says otherwise', () => {
    expect(frameSize('hero')).toEqual({ width: 16, height: 16 });
    expect(frameSize('fx-puff')).toEqual({ width: 32, height: 32 });
    expect(frameSize('monster-wolf')).toEqual({ width: 18, height: 17 });
    expect(frameSize('prop-gate')).toEqual({ width: 24, height: 25 });
  });

  it('is refused for a picture that is not a sheet, naming it', () => {
    expect(() => frameSize('sword-held')).toThrow('"sword-held" is not a sheet');
    expect(() => frameSize('gear-chain-mail')).toThrow('"gear-chain-mail" is not a sheet');
  });
});

describe('the sheets of the terrain on disk', () => {
  it.each(FINAL_ART_AREAS)('hold a frame for every stamp planned for %s', (areaId) => {
    const area = shippedArea(areaId);
    const kinds = area.layout.map((row) => [...row].map((symbol) => gameContent.terrain[symbol]?.kind ?? '?'));
    const stamps = planTerrain(kinds);
    const frames = new Map<string, number>();
    for (const stamp of stamps) if (!frames.has(stamp.art)) frames.set(stamp.art, framesOnDisk(stamp.art));

    expect(stamps.length).toBeGreaterThan(0);
    const beyond = stamps.filter((stamp) => stamp.frame >= (frames.get(stamp.art) ?? 0));
    expect([...new Set(beyond.map((stamp) => `${stamp.art} ${describeStamp(stamp)}`))]).toEqual([]);
  });
});
