import { describe, expect, it } from 'vitest';
import { ARTWORK, hasFinalArt, monsterArt, neededArt, terrainArt } from '../src/adapter/artwork';
import { manifestLookup, missingArt } from '../src/adapter/asset-manifest';
import { lookOf } from '../src/adapter/terrain-plan';
import { gameContent } from '../src/content';

// The scene draws an Adventure Area with its pictures only once the area is listed as final (FINAL_ART_AREAS), and until
// then it draws flat colours, and the game starts either way. So pictures that are finished and never listed are never
// seen, and nothing says so: these tests pin the list for the mountain and the cave, and that every picture they ask for
// resolves through the manifest. How the pictures look is for the screenshots.

const RAIDERS = ['raider', 'raider-charger', 'raider-archer', 'raider-veteran'];
const CAVE_CREATURES = ['cave-bat', 'cave-lizard', 'cave-eye', 'cave-bear'];

// Both areas are laid out in rock, grass and sand, and in nothing else.
const KINDS = ['rock', 'grass', 'sand'];

describe.each([
  ['the mountain', 'mountain', RAIDERS, ['mountain-cliff', 'mountain-boulders']],
  ['the cave', 'cave', CAVE_CREATURES, ['cave-sand', 'cave-grass', 'cave-cliff']],
])('the Adventure Area of %s', (_name, areaId, monsters, sheetsOfItsOwn) => {
  it('is drawn with its final art, as the coast and the woods are', () => {
    expect(hasFinalArt(areaId)).toBe(true);
  });

  it('asks for the picture of each of its monsters and of each kind of terrain laid out in it', () => {
    const asked = neededArt(gameContent, [areaId]);

    for (const type of monsters) expect(asked).toContain(monsterArt(type));
    for (const kind of KINDS) expect(asked).toContain(terrainArt(kind));
  });

  it('dresses its terrain in the sheets of its own look, and the manifest has every picture it asks for', () => {
    const asked = neededArt(gameContent, [areaId]);
    const sheetsOfItsLook = Object.values(lookOf(areaId));

    expect(sheetsOfItsLook).toEqual(expect.arrayContaining(sheetsOfItsOwn));
    expect(missingArt([...asked, ...sheetsOfItsLook], manifestLookup(ARTWORK))).toEqual([]);
  });
});
