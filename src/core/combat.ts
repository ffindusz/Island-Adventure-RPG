import type { Content } from './content';
import { monsterTypeOf } from './content';
import { overlaps, zoneInFront } from './geometry';
import type { Box, Direction, Point } from './geometry';
import type { GameEvent } from './interface';
import { gainExperience } from './progression';
import { livingMonsters, monsterBody } from './state';
import type { PlayState } from './state';
import { heroAttack } from './stats';

/** The hero strikes with the Melee Weapon in the direction it faces. Returns what happened, in order. */
export function heroStrikes(state: PlayState, content: Content): GameEvent[] {
  if (state.hero.attackCooldown > 0) {
    return [];
  }
  state.hero.attackCooldown = content.hero.attackCooldownSteps;
  const direction = state.hero.facing;
  const zone = strikeZone(state.hero.position, direction, content);
  const events: GameEvent[] = [{ type: 'hero-attacked', direction, zone }];
  for (const monster of livingMonsters(state)) {
    if (overlaps(zone, monsterBody(monster, content))) {
      const damage = heroAttack(state, content);
      monster.health = Math.max(0, monster.health - damage);
      events.push({ type: 'monster-hit', monsterId: monster.id, damage, health: monster.health });
      if (monster.health === 0) {
        events.push({ type: 'monster-defeated', monsterId: monster.id });
        events.push(...gainExperience(state, content, monsterTypeOf(content, monster.type).experience));
      }
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
