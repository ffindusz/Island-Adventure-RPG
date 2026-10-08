import { describe, expect, it } from 'vitest';
import { ARTWORK, FINAL_ART_AREAS, neededArt } from '../src/adapter/artwork';
import { manifestLookup, missingArt, requireArt } from '../src/adapter/asset-manifest';
import type { ArtManifest } from '../src/adapter/asset-manifest';
import { gameContent } from '../src/content';
import type { AreaDefinition, ContentDefinition } from '../src/core';

// The terrain and the monsters of the areas whose art is final are found by name, `terrain-<kind>` and
// `monster-<type>`, and the game refuses to start while one is missing. Only the areas that are listed as final count: a
// kind or a type that has only a colour (the mountain's, until its art is drawn) must not stop the game from starting.
// This is the manifest check of ADR 0002 and nothing else of the drawing; the look is for the screenshots.

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
});
