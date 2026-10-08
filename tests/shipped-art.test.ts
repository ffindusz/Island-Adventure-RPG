import { describe, expect, it } from 'vitest';
import { terrainColour } from '../src/adapter/art';
import { ARTWORK, neededArt } from '../src/adapter/artwork';
import { manifestLookup, missingArt } from '../src/adapter/asset-manifest';
import { gameContent } from '../src/content';

// What the shipped content asks the adapter to draw: the pictures that the game refuses to start without, and the
// colours that the terrain is painted in. Whether they look right is for a play check, but one that is missing, which
// the game would otherwise show only when it starts or as a patch of the colour that nothing has, is found here.

describe('the art that the shipped content needs', () => {
  it('has a picture in the asset manifest for each piece of Gear and each consumable', () => {
    expect(missingArt(neededArt(gameContent), manifestLookup(ARTWORK))).toEqual([]);
  });

  it.each(Object.values(gameContent.terrain).map(({ kind }) => kind))('has a colour for the terrain kind %s', (kind) => {
    expect(terrainColour(kind)).not.toBe(terrainColour('a terrain that nobody has drawn'));
  });
});
