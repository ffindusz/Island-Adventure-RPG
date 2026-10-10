import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { AREA_IDS, areaOf, experienceOnRoute, milestonesOnRoute } from './main-route';
import type { AreaId } from './main-route';
import { levelOf } from './profile-heroes';

// The Experience along the intended route, against the Level thresholds of the content: about five level-ups on the
// way from the shore to the Guardian, with no grinding. The sums read the shipped content, so a monster's worth, a
// milestone or a threshold that moves turns these red until the Levels are right again.

/** The Level a hero who fights what it meets has when it leaves each area: the ticket's own targets. */
const LEVEL_AT_EXIT: Readonly<Record<AreaId, number>> = {
  'shipwreck-coast': 2,
  woods: 3,
  mountain: 4,
  cave: 5,
  castle: 6,
};

/** What the route has earned the hero when it leaves an area: the Experience of every area up to and including it. */
function earnedOnRouteThrough(id: AreaId): number {
  return AREA_IDS.slice(0, AREA_IDS.indexOf(id) + 1).reduce((total, area) => total + experienceOnRoute(area), 0);
}

/** What a hero who clears every ordinary monster of each area and crosses every milestone has earned by the exit. */
function earnedByClearingThrough(id: AreaId): number {
  return AREA_IDS.slice(0, AREA_IDS.indexOf(id) + 1).reduce((total, area) => {
    const { monsters, milestones } = areaOf(area);
    const ordinary = monsters.filter(({ type }) => gameContent.monsterTypes[type]?.behavior !== 'guardian');
    return (
      total +
      ordinary.reduce((sum, { type }) => sum + (gameContent.monsterTypes[type]?.experience ?? 0), 0) +
      (milestones ?? []).reduce((sum, { reward }) => sum + reward.experience, 0)
    );
  }, 0);
}

function levelsAtTheExits(earned: (id: AreaId) => number): Record<string, number> {
  return Object.fromEntries(AREA_IDS.map((id) => [id, levelOf(earned(id))]));
}

describe('the Experience along the intended route', () => {
  it('raises the hero to Level 2 at the exit of the coast, 3 at the woods, 4 at the mountain, 5 at the cave and 6 at the arena', () => {
    expect(levelsAtTheExits(earnedOnRouteThrough)).toEqual(LEVEL_AT_EXIT);
  });

  it('ends at Level 6, the cap, for a hero who earns everything in the game, the Guardian\'s Experience too', () => {
    const everyMonster = gameContent.areas.flatMap(({ monsters }) => monsters);
    const everything =
      everyMonster.reduce((total, { type }) => total + (gameContent.monsterTypes[type]?.experience ?? 0), 0) +
      gameContent.areas.flatMap(({ milestones }) => milestones ?? []).reduce((total, { reward }) => total + reward.experience, 0);

    expect(gameContent.progression.levelThresholds).toHaveLength(5);
    expect(levelOf(everything)).toBe(6);
  });

  it('gives no one a Level ahead of the route by clearing the rest of each area: the optional fights are not needed and not rewarded with a Level', () => {
    expect(levelsAtTheExits(earnedByClearingThrough)).toEqual(LEVEL_AT_EXIT);
  });

  it('puts every milestone on the route, so that none of them can be missed by a hero who keeps to the trail', () => {
    for (const id of AREA_IDS) {
      expect(milestonesOnRoute(id).map(({ id: milestone }) => milestone)).toEqual(
        (areaOf(id).milestones ?? []).map(({ id: milestone }) => milestone),
      );
    }
  });
});
