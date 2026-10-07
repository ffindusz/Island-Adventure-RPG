import type { Content, RangedMonsterType } from './content';
import { expandBox, overlaps } from './geometry';
import type { GameEvent } from './interface';
import { directionToward } from './monster-movement';
import { heroBody, monsterBody } from './state';
import type { MonsterState, PlayState } from './state';

// The ranged attacker: notices the hero, winds up with a flash on its own body, and fires a projectile at where the hero
// stands when the wind-up ends. The projectile is a monster's arrow: it flies in the step order of arrows.ts. The
// noticing distance is measured from the monster's body, as a square around it.

/** One fixed step of a ranged attacker. */
export function stepRanged(
  monster: MonsterState,
  type: RangedMonsterType,
  state: PlayState,
  content: Content,
): GameEvent[] {
  const action = monster.action;
  if (action.type === 'winding-up') {
    action.elapsed += 1;
    return action.elapsed >= action.length ? fire(monster, type, state) : [];
  }
  if (action.type === 'recovering') {
    action.stepsLeft -= 1;
    if (action.stepsLeft > 0) {
      return [];
    }
  }
  const body = monsterBody(monster, content);
  if (!overlaps(heroBody(state, content), expandBox(body, type.noticingDistance))) {
    monster.action = { type: 'idle' };
    return [];
  }
  monster.action = { type: 'winding-up', zone: body, elapsed: 0, length: type.windUpSteps };
  return [];
}

/** The wind-up is over: a projectile leaves the monster's centre toward where the hero stands now, and it rests. */
function fire(monster: MonsterState, type: RangedMonsterType, state: PlayState): GameEvent[] {
  const direction = directionToward(monster.position, state.hero.position);
  state.arrows.push({
    areaId: state.areaId,
    position: { ...monster.position },
    direction,
    rangeLeft: type.projectile.range,
    shotBy: { monsterId: monster.id, monsterType: monster.type },
  });
  monster.action = { type: 'recovering', stepsLeft: type.recoverySteps };
  return [{ type: 'monster-fired', monsterId: monster.id, direction }];
}
