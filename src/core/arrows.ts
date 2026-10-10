import { areaOf, monsterTypeOf } from './content';
import type { Area, Content, MonsterProjectile } from './content';
import { boxAround, EPSILON, overlaps } from './geometry';
import type { Box, Direction, Point } from './geometry';
import { hurtHero } from './hero-damage';
import { interactableObstacles } from './interactables';
import type { GameEvent, RandomSource } from './interface';
import { hurtMonster } from './monster-damage';
import { gapAhead, moveBody } from './movement';
import { heroBody, livingMonsters, monsterBody } from './state';
import type { ArrowState, MonsterState, PlayState } from './state';
import { heroAttack } from './stats';
import { sweepToward } from './sweep';

/**
 * The hero shoots with the Ranged Weapon: an arrow leaves the hero's centre in the direction it faces, and costs one
 * Ammunition. Without any, the hero is told so and nothing else happens: no arrow, and no cooldown either. Like a
 * strike, a shot waits for the attack cooldown, and starts it.
 */
export function heroShoots(state: PlayState, content: Content): GameEvent[] {
  if (state.hero.attackCooldown > 0) {
    return [];
  }
  if (state.hero.consumables.ammunition < 1) {
    return [{ type: 'out-of-ammunition' }];
  }
  state.hero.consumables.ammunition -= 1;
  state.hero.attackCooldown = content.hero.attackCooldownSteps;
  const direction = state.hero.facing;
  state.arrows.push({
    areaId: state.areaId,
    position: { ...state.hero.position },
    direction,
    rangeLeft: content.hero.rangedWeapon.range,
  });
  return [{ type: 'hero-shot', direction }];
}

/** What one fixed step of flight did to an arrow: what happened, and whether it flies on. */
interface Flight {
  readonly events: GameEvent[];
  readonly flying: boolean;
}

/**
 * Flies every arrow one fixed step, the hero's and the projectiles of monsters alike. An arrow of the hero hurts the
 * first monster it reaches on the way and is gone. A projectile of a monster hurts the hero if it reaches it, with
 * Defense and defeat as in any hit, and passes through the monsters. Otherwise it flies on until solid terrain or a
 * chest stops it, or its range is spent, and then it is gone. Arrows of an Adventure Area the hero has left are gone
 * too: an arrow only flies in the area it was shot in, and the hero is in one. A projectile that defeats the hero
 * takes the arrows in the air with it, like any defeat.
 */
export function flyArrows(state: PlayState, content: Content, random: RandomSource): GameEvent[] {
  const area = areaOf(content, state.areaId);
  const obstacles = interactableObstacles(state, content);
  const events: GameEvent[] = [];
  const stillFlying: ArrowState[] = [];
  for (const arrow of state.arrows) {
    if (arrow.areaId !== state.areaId) {
      continue;
    }
    const flight =
      arrow.shotBy === undefined
        ? flyHeroArrow(state, content, arrow, area, obstacles, random)
        : flyProjectile(state, content, arrow, arrow.shotBy, area, obstacles);
    events.push(...flight.events);
    if (flight.events.some((event) => event.type === 'hero-defeated')) {
      // The defeat took the arrows in the air (see recoverHero): there is nothing left to put back.
      return events;
    }
    if (flight.flying) {
      stillFlying.push(arrow);
    }
  }
  state.arrows = stillFlying;
  return events;
}

/** The size an arrow is drawn at: the hero's arrows are as big as its Ranged Weapon says, a projectile as its type says. */
export function arrowSizeOf(arrow: ArrowState, content: Content): number {
  return arrow.shotBy === undefined ? content.hero.rangedWeapon.arrowSize : projectileOf(arrow.shotBy, content).size;
}

function projectileOf(shotBy: NonNullable<ArrowState['shotBy']>, content: Content): MonsterProjectile {
  const type = monsterTypeOf(content, shotBy.monsterType);
  if (type.behavior !== 'ranged') {
    throw new Error(`A projectile of "${shotBy.monsterId}" is in flight, but its type "${shotBy.monsterType}" shoots none`);
  }
  return type.projectile;
}

function flyHeroArrow(
  state: PlayState,
  content: Content,
  arrow: ArrowState,
  area: Area,
  obstacles: readonly Box[],
  random: RandomSource,
): Flight {
  const { arrowSpeedPerStep, arrowSize } = content.hero.rangedWeapon;
  const distance = Math.min(arrowSpeedPerStep, arrow.rangeLeft);
  const end = moveBody(area, arrow.position, arrowSize, arrow.direction, distance, obstacles);
  const travelled = Math.abs(end.x - arrow.position.x) + Math.abs(end.y - arrow.position.y);
  const body = boxAround(arrow.position, arrowSize);
  const target = firstMonsterReached(state, content, body, arrow.direction, travelled);
  if (target !== undefined) {
    const damage = heroAttack(state, content, 'ranged-weapon');
    return { events: hurtMonster(state, content, target, damage, random), flying: false };
  }
  return { events: [], flying: land(arrow, end, travelled, distance) };
}

function flyProjectile(
  state: PlayState,
  content: Content,
  arrow: ArrowState,
  shotBy: NonNullable<ArrowState['shotBy']>,
  area: Area,
  obstacles: readonly Box[],
): Flight {
  const projectile = projectileOf(shotBy, content);
  const distance = Math.min(projectile.speedPerStep, arrow.rangeLeft);
  const sweep = sweepToward(
    area,
    arrow.position,
    projectile.size,
    arrow.direction,
    distance,
    obstacles,
    heroBody(state, content),
  );
  if (sweep.reachedTarget) {
    return { events: hurtHero(state, content, shotBy.monsterId, projectile.damage), flying: false };
  }
  return { events: [], flying: land(arrow, sweep.end, sweep.travelled, distance) };
}

/** The arrow flies on to `end`. It keeps flying unless something stopped it short of `distance`, or its range is spent. */
function land(arrow: ArrowState, end: Point, travelled: number, distance: number): boolean {
  arrow.position = end;
  arrow.rangeLeft -= travelled;
  const stopped = travelled < distance - EPSILON;
  return !stopped && arrow.rangeLeft > EPSILON;
}

/**
 * The living monster that an arrow with this body reaches first when it flies `reach` in its direction: the one it
 * already touches, or else the nearest one ahead of it. A monster can walk into the arrow, so touching counts.
 */
function firstMonsterReached(
  state: PlayState,
  content: Content,
  body: Box,
  direction: Direction,
  reach: number,
): MonsterState | undefined {
  let first: MonsterState | undefined;
  let firstGap = Infinity;
  for (const monster of livingMonsters(state)) {
    const target = monsterBody(monster, content);
    const gap = overlaps(body, target) ? 0 : gapAhead(body, direction, target);
    if (gap !== undefined && gap <= reach + EPSILON && gap < firstGap) {
      first = monster;
      firstGap = gap;
    }
  }
  return first;
}
