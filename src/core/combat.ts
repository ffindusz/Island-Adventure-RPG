import type { Content } from './content';
import { boxAround, overlaps } from './geometry';
import type { Box, Direction, Point } from './geometry';
import type { GameEvent } from './interface';
import { livingMonsters, monsterBody } from './state';
import type { PlayState } from './state';

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
      const damage = content.hero.attack;
      monster.health = Math.max(0, monster.health - damage);
      events.push({ type: 'monster-hit', monsterId: monster.id, damage, health: monster.health });
      if (monster.health === 0) {
        events.push({ type: 'monster-defeated', monsterId: monster.id });
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
  const body = boxAround(position, content.hero.size);
  const { reach, width } = content.hero.meleeWeapon;
  const halfWidth = width / 2;
  switch (direction) {
    case 'right':
      return { minX: body.maxX, minY: position.y - halfWidth, maxX: body.maxX + reach, maxY: position.y + halfWidth };
    case 'left':
      return { minX: body.minX - reach, minY: position.y - halfWidth, maxX: body.minX, maxY: position.y + halfWidth };
    case 'down':
      return { minX: position.x - halfWidth, minY: body.maxY, maxX: position.x + halfWidth, maxY: body.maxY + reach };
    case 'up':
      return { minX: position.x - halfWidth, minY: body.minY - reach, maxX: position.x + halfWidth, maxY: body.minY };
  }
}
