import type { Content } from './content';
import { overlaps, zoneInFront } from './geometry';
import type { Box, Direction, Point } from './geometry';
import type { GameEvent, RandomSource } from './interface';
import { hurtMonster } from './monster-damage';
import { livingMonsters, monsterBody } from './state';
import type { PlayState } from './state';
import { heroAttack } from './stats';

/** The hero strikes with the Melee Weapon in the direction it faces. Returns what happened, in order. */
export function heroStrikes(state: PlayState, content: Content, random: RandomSource): GameEvent[] {
  if (state.hero.attackCooldown > 0) {
    return [];
  }
  state.hero.attackCooldown = content.hero.attackCooldownSteps;
  const direction = state.hero.facing;
  const zone = strikeZone(state.hero.position, direction, content);
  const events: GameEvent[] = [{ type: 'hero-attacked', direction, zone }];
  for (const monster of livingMonsters(state)) {
    if (overlaps(zone, monsterBody(monster, content))) {
      events.push(...hurtMonster(state, content, monster, heroAttack(state, content, 'melee-weapon'), random));
    }
  }
  return events;
}

/** Counts one fixed step off the hero's attack cooldown. */
export function coolDownHero(state: PlayState): void {
  state.hero.attackCooldown = Math.max(0, state.hero.attackCooldown - 1);
}

/** What a strike covers: the ground right in front of the hero's body, as far as the weapon reaches and as wide as it sweeps. */
function strikeZone(position: Point, direction: Direction, content: Content): Box {
  const { reach, width } = content.hero.meleeWeapon;
  return zoneInFront(position, content.hero.size, direction, reach, width);
}
