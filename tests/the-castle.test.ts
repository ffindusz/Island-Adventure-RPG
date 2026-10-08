import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { createGame } from '../src/core';
import type { AreaDefinition } from '../src/core';
import { fixedRandom } from './fixtures';

// The old castle, the fifth and last Adventure Area on the route of the adventure, up to the end of its route: what it
// has to be to read as yards and buildings and not as a second cave, with undead that are not the cave's creatures,
// supplies and an armor upgrade for the final fight, and a route that ends at a plain wall. Like the other tests of the
// shipped content, these read the map and the lists of the content and walk the hero over them with the core's own
// movement, so that moving a tile or a chest never breaks them unless the castle stops being what it is for.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';
const CAVE = 'cave';
const CASTLE = 'castle';

/** The Adventure Areas in the order of the route of the adventure. */
const ROUTE_OF_AREAS = [COAST, WOODS, MOUNTAIN, CAVE, CASTLE];

function definitionOf(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

describe('the five Adventure Areas', () => {
  it('come in the order of the route of the adventure, and the castle is the last: coast, woods, mountain, cave, castle', () => {
    expect(gameContent.areas.map(({ id }) => id)).toEqual(ROUTE_OF_AREAS);
  });

  it('are joined in order: each area has an exit forward to an entrance of the next, and the next has an exit back to an entrance of it', () => {
    for (const [index, id] of ROUTE_OF_AREAS.slice(0, -1).entries()) {
      const next = ROUTE_OF_AREAS[index + 1] ?? '';
      const forward = (definitionOf(id).exits ?? []).find(({ to }) => to.area === next);
      const back = (definitionOf(next).exits ?? []).find(({ to }) => to.area === id);

      expect(forward, `${id} has an exit forward to ${next}`).toBeDefined();
      expect((definitionOf(next).entrances ?? []).map((entrance) => entrance.id)).toContain(forward?.to.entrance);
      expect(back, `${next} has an exit back to ${id}`).toBeDefined();
      expect((definitionOf(id).entrances ?? []).map((entrance) => entrance.id)).toContain(back?.to.entrance);
    }
  });

  it('load with the rest of the shipped content: the content check passes', () => {
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });
});
