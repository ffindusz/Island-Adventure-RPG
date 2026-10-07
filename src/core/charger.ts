import type { Content, ChargerMonsterType } from './content';
import { expandBox, overlaps } from './geometry';
import type { GameEvent } from './interface';
import { laneAhead } from './lanes';
import { directionToward } from './monster-movement';
import { heroBody, monsterBody } from './state';
import type { MonsterState, PlayState } from './state';

// The charger: notices the hero, winds up with the lane of its dash shown, and dashes along that lane. The noticing
// distance is measured from the monster's body, as a square around it.

/** One fixed step of a charger. */
export function stepCharger(
  monster: MonsterState,
  type: ChargerMonsterType,
  state: PlayState,
  content: Content,
): GameEvent[] {
  const action = monster.action;
  if (action.type === 'winding-up') {
    action.elapsed += 1;
    return [];
  }
  const body = monsterBody(monster, content);
  const hero = heroBody(state, content);
  if (!overlaps(hero, expandBox(body, type.noticingDistance))) {
    monster.action = { type: 'idle' };
    return [];
  }
  const direction = directionToward(monster.position, state.hero.position);
  const lane = laneAhead(state, content, monster.position, type.size, direction, type.dashRange);
  if (overlaps(hero, lane)) {
    monster.action = { type: 'winding-up', zone: lane, elapsed: 0, length: type.windUpSteps, direction };
  }
  return [];
}
