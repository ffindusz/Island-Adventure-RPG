import { areaOf } from './content';
import type { Checkpoint, Content } from './content';
import { overlaps } from './geometry';
import type { GameEvent } from './interface';
import { heroBody } from './state';
import type { PlayState } from './state';
import { heroMaxHealth } from './stats';

// Checkpoints: the safe places the hero activates by touching them. Loading them is in checkpoint-content.ts.

/** The ids of the Checkpoints of the hero's Adventure Area that its body overlaps now. */
export function touchedCheckpoints(state: PlayState, content: Content): string[] {
  const body = heroBody(state, content);
  return areaOf(content, state.areaId)
    .checkpoints.filter((checkpoint) => overlaps(body, checkpoint.body))
    .map((checkpoint) => checkpoint.id);
}

/**
 * Activates each Checkpoint of the hero's Adventure Area that its body overlaps now and did not at the start of the
 * step (`touchedBefore`): the hero comes onto it, standing on it does nothing more. Returns what happened.
 */
export function activateCheckpoints(state: PlayState, content: Content, touchedBefore: readonly string[]): GameEvent[] {
  const body = heroBody(state, content);
  const events: GameEvent[] = [];
  for (const checkpoint of areaOf(content, state.areaId).checkpoints) {
    if (overlaps(body, checkpoint.body) && !touchedBefore.includes(checkpoint.id)) {
      activate(state, content, checkpoint);
      events.push({ type: 'checkpoint-activated', checkpointId: checkpoint.id });
    }
  }
  return events;
}

/** Defeat now sends the hero back here, and the hero is restored to full Health. */
function activate(state: PlayState, content: Content, checkpoint: Checkpoint): void {
  state.checkpoint = { areaId: state.areaId, tile: { ...checkpoint.tile } };
  state.hero.health = heroMaxHealth(state, content);
}

/** Whether defeat sends the hero back to this Checkpoint of the Adventure Area `areaId`. */
export function isActive(state: PlayState, areaId: string, checkpoint: Checkpoint): boolean {
  return (
    state.checkpoint.areaId === areaId &&
    state.checkpoint.tile.col === checkpoint.tile.col &&
    state.checkpoint.tile.row === checkpoint.tile.row
  );
}
