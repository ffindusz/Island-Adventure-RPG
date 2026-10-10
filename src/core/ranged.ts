import type { Content, RangedMonsterType } from './content';
import { EPSILON } from './geometry';
import type { Direction } from './geometry';
import type { GameEvent } from './interface';
import { directionToward, noticesHero, stillRecovering, walkMonster, windUpEnds } from './monster-movement';
import { monsterBody } from './state';
import type { MonsterState, PlayState } from './state';

// The ranged attacker: notices the hero, winds up with a flash on its own body, and fires a projectile at where the hero
// stands when the wind-up ends. The projectile is a monster's arrow: it flies in the step order of arrows.ts. The
// noticing distance is measured from the monster's body, as a square around it. A ranged attacker whose type sets a
// distance it keeps walks to that distance from the hero before it winds up.

const OPPOSITE: Readonly<Record<Direction, Direction>> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** One fixed step of a ranged attacker. */
export function stepRanged(
  monster: MonsterState,
  type: RangedMonsterType,
  state: PlayState,
  content: Content,
): GameEvent[] {
  const action = monster.action;
  if (action.type === 'winding-up') {
    return windUpEnds(action) ? fire(monster, type, state) : [];
  }
  if (action.type === 'recovering' && stillRecovering(action)) {
    return [];
  }
  if (!noticesHero(monster, type, state, content)) {
    monster.action = { type: 'idle' };
    return [];
  }
  if (type.keepsDistance !== null && keepDistance(monster, type, type.keepsDistance, state, content)) {
    return [];
  }
  monster.action = { type: 'winding-up', zone: monsterBody(monster, content), elapsed: 0, length: type.windUpSteps };
  return [];
}

/**
 * Walks one step toward the distance the monster keeps from the hero: the gap between their bodies along the axis on
 * which they are farther apart. Toward the hero if the gap is wider, away from it if narrower, and never past the
 * distance. Returns whether the monster is still on its way, and so does not wind up yet. It is not when it is at the
 * distance, or when it is too near and cannot walk away, because it is cornered. A monster that cannot come nearer
 * stays where it is, on its way.
 */
function keepDistance(
  monster: MonsterState,
  type: RangedMonsterType,
  keeps: NonNullable<RangedMonsterType['keepsDistance']>,
  state: PlayState,
  content: Content,
): boolean {
  const hero = state.hero.position;
  const apart = Math.max(Math.abs(hero.x - monster.position.x), Math.abs(hero.y - monster.position.y));
  const gap = Math.max(0, apart - (type.size + content.hero.size) / 2);
  const toGo = gap - keeps.preferredDistance;
  if (Math.abs(toGo) <= EPSILON) {
    return false;
  }
  const toward = directionToward(monster.position, hero);
  const retreating = toGo < 0;
  const { x, y } = monster.position;
  walkMonster(
    monster,
    type.size,
    retreating ? OPPOSITE[toward] : toward,
    Math.min(keeps.speedPerStep, Math.abs(toGo)),
    state,
    content,
  );
  if (retreating && monster.position.x === x && monster.position.y === y) {
    return false;
  }
  monster.action = { type: 'chasing' };
  return true;
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
