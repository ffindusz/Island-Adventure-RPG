import { describe, expect, it } from 'vitest';
import { ARTWORK, FINAL_ART_AREAS, hasFinalArt, monsterArt, neededArt, terrainArt } from '../src/adapter/artwork';
import { manifestLookup, missingArt } from '../src/adapter/asset-manifest';
import { lookOf } from '../src/adapter/terrain-plan';
import { gameContent } from '../src/content';

// The scene draws an Adventure Area with its pictures only once the area is listed as final (FINAL_ART_AREAS), and until
// then it draws flat colours, and the game starts either way. So the castle's masonry, flagstones, undead and Guardian are
// never seen while it is not listed, and nothing says so: these tests pin the list for the castle, that all five areas of
// the game are on it, and that every picture the castle asks for resolves through the manifest. How the pictures look is for
// the screenshots.

const CASTLE_MONSTERS = ['castle-skeleton', 'castle-ghoul', 'castle-wraith', 'castle-knight', 'castle-guardian'];

describe('the Adventure Area of the castle', () => {
  it('is drawn with its final art, as the coast, the woods, the mountain and the cave are', () => {
    expect(hasFinalArt('castle')).toBe(true);
    expect([...FINAL_ART_AREAS].sort()).toEqual(['castle', 'cave', 'mountain', 'shipwreck-coast', 'woods']);
  });

  it('is every area that the game has, so that no ground and no monster of it is drawn in flat colours', () => {
    expect(gameContent.areas.map((area) => area.id).filter((id) => !hasFinalArt(id))).toEqual([]);
  });

  it('asks for the picture of each of its monsters, its kinds of terrain and the sheets of its look, and the manifest has them all', () => {
    const asked = neededArt(gameContent, ['castle']);
    const sheetsOfItsLook = Object.values(lookOf('castle'));

    for (const type of CASTLE_MONSTERS) expect(asked).toContain(monsterArt(type));
    for (const kind of ['rock', 'sand', 'grass', 'water']) expect(asked).toContain(terrainArt(kind));
    expect(sheetsOfItsLook.length).toBeGreaterThanOrEqual(3);
    expect(missingArt([...asked, ...sheetsOfItsLook], manifestLookup(ARTWORK))).toEqual([]);
  });
});
