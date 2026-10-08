import { describe, expect, it } from 'vitest';
import { ARTWORK, hasFinalArt, monsterArt, neededArt } from '../src/adapter/artwork';
import { manifestLookup, missingArt } from '../src/adapter/asset-manifest';
import { lookOf } from '../src/adapter/terrain-plan';
import { gameContent } from '../src/content';

// The scene draws an Adventure Area with its pictures only once the area is listed as final (FINAL_ART_AREAS), and until
// then it draws flat colours, and the game starts either way. So pictures that are finished and never listed are never
// seen, and nothing says so: these tests pin the list for the mountain and the cave, and that every picture they ask for
// resolves through the manifest. How the pictures look is for the screenshots.

const RAIDERS = ['raider', 'raider-charger', 'raider-archer', 'raider-veteran'];
const CAVE_CREATURES = ['cave-bat', 'cave-lizard', 'cave-eye', 'cave-bear'];

describe.each([
  ['the mountain', 'mountain', RAIDERS],
  ['the cave', 'cave', CAVE_CREATURES],
])('the Adventure Area of %s', (_name, areaId, monsters) => {
  it('is drawn with its final art, as the coast and the woods are', () => {
    expect(hasFinalArt(areaId)).toBe(true);
  });

  it('asks for the picture of each of its monsters, its kinds of terrain and the sheets of its look, and the manifest has them all', () => {
    const asked = neededArt(gameContent, [areaId]);
    const sheetsOfItsLook = Object.values(lookOf(areaId));

    for (const type of monsters) expect(asked).toContain(monsterArt(type));
    expect(sheetsOfItsLook.length).toBeGreaterThanOrEqual(3);
    expect(missingArt([...asked, ...sheetsOfItsLook], manifestLookup(ARTWORK))).toEqual([]);
  });
});
