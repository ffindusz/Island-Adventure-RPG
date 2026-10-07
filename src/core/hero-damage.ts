import type { Content } from './content';
import { areaOf } from './content';
import { centerOf } from './geometry';
import type { GameEvent } from './interface';
import type { PlayState } from './state';
import { currentAreaState, freshMonsters } from './state';
import { heroDefense, heroMaxHealth } from './stats';

/**
 * The hero takes a hit of `damage` before Defense. When that is the last of its Health the hero is defeated and returns
 * (see returnHero). Returns what happened, in order.
 */
export function hurtHero(state: PlayState, content: Content, monsterId: string, damage: number): GameEvent[] {
  const received = Math.max(content.minimumDamage, damage - heroDefense(state, content));
  state.hero.health = Math.max(0, state.hero.health - received);
  const events: GameEvent[] = [{ type: 'hero-hit', monsterId, damage: received, health: state.hero.health }];
  if (state.hero.health === 0) {
    events.push({ type: 'hero-defeated' });
    returnHero(state, content);
  }
  return events;
}

/**
 * Defeat sends the hero back to where it came into the Adventure Area it is in, at full Health, and starts that area
 * over: its monsters are all there again, at full Health on their starting tiles. Nothing else changes: the monsters of
 * other areas stay as they are, the hero keeps the way it faces and its attack cooldown, the milestones it has reached
 * stay reached, the chests it has opened stay opened, it keeps all its Gear, and the direction keys the player holds
 * stay held.
 */
function returnHero(state: PlayState, content: Content): void {
  state.hero.position = centerOf(state.arrivedAt);
  state.hero.health = heroMaxHealth(state, content);
  currentAreaState(state).monsters = freshMonsters(areaOf(content, state.areaId), content);
}
