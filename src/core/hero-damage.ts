import type { Content } from './content';
import { areaOf } from './content';
import { centerOf } from './geometry';
import type { GameEvent } from './interface';
import type { PlayState } from './state';
import { freshMonsters } from './state';
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
 * Defeat sends the hero back at full Health and starts the Adventure Area it returns to over: its monsters are all
 * there again, at full Health on their starting tiles. Nothing else changes: the hero keeps the way it faces and its
 * attack cooldown, the milestones it has reached stay reached, the chests it has opened stay opened, it keeps all its
 * Gear, and the direction keys the player holds stay held.
 */
function returnHero(state: PlayState, content: Content): void {
  // Until Adventure Areas have entrances and Checkpoints, the one place to return to is where the adventure began.
  const { areaId, tile } = content.start;
  state.areaId = areaId;
  state.hero.position = centerOf(tile);
  state.hero.health = heroMaxHealth(state, content);
  const area = state.areas[areaId];
  if (area === undefined) {
    throw new Error(`The state has no world for area "${areaId}"`);
  }
  area.monsters = freshMonsters(areaOf(content, areaId), content);
}
