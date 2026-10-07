import type { Content } from './content';
import { recoverHero } from './checkpoints';
import type { GameEvent } from './interface';
import type { PlayState } from './state';
import { heroDefense } from './stats';

/**
 * The hero takes a hit of `damage` before Defense. When that is the last of its Health the hero is defeated and goes
 * back to a Checkpoint (see recoverHero in checkpoints.ts). Returns what happened, in order.
 */
export function hurtHero(state: PlayState, content: Content, monsterId: string, damage: number): GameEvent[] {
  const received = Math.max(content.minimumDamage, damage - heroDefense(state, content));
  state.hero.health = Math.max(0, state.hero.health - received);
  const events: GameEvent[] = [{ type: 'hero-hit', monsterId, damage: received, health: state.hero.health }];
  if (state.hero.health === 0) {
    events.push({ type: 'hero-defeated' }, ...recoverHero(state, content));
  }
  return events;
}
