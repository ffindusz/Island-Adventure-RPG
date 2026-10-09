import { areaOf } from './content';
import type { Checkpoint, Content } from './content';
import { calmMonsters, enterArea } from './areas';
import { revealAroundHero } from './automap';
import { recordConsumables, rollBackConsumables } from './consumable-rollback';
import { centerOf, overlaps } from './geometry';
import { renewedMonsters, resetGuardians } from './guardian-reset';
import type { GameEvent } from './interface';
import { currentAreaState, heroBody } from './state';
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

/**
 * Defeat now sends the hero back here, with the consumables it has now (see consumable-rollback.ts), and the hero is
 * restored to full Health.
 */
function activate(state: PlayState, content: Content, checkpoint: Checkpoint): void {
  state.checkpoint = {
    areaId: state.areaId,
    tile: { ...checkpoint.tile },
    ...recordConsumables(state, content),
  };
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

/**
 * Defeat sends the hero back to the Checkpoint it touched last, or to the start of the adventure before it touched
 * any, at full Health. When that is in another Adventure Area the hero goes there. The consumables found since are
 * taken back (see consumable-rollback.ts); everything else the hero has earned stays, what it has revealed on the
 * Automap included, and the terrain around the Checkpoint is revealed once the hero is on it. The monsters of the
 * Checkpoint's area are renewed, and a Guardian that has not fallen is put back wherever it is, one that has fallen stays
 * fallen (see guardian-reset.ts). Called with the hero's Health at 0. Returns what happened: the change of area, if any.
 */
export function recoverHero(state: PlayState, content: Content): GameEvent[] {
  const { areaId, tile } = state.checkpoint;
  const events: GameEvent[] = [];
  if (areaId !== state.areaId) {
    calmMonsters(state);
    state.areaId = areaId;
    events.push({ type: 'area-changed', areaId }, ...enterArea(state, content));
  }
  state.hero.position = centerOf(tile);
  state.hero.health = heroMaxHealth(state, content);
  rollBackConsumables(state, content);
  resetGuardians(state, content);
  const world = currentAreaState(state);
  world.monsters = renewedMonsters(areaOf(content, areaId), world.monsters, content);
  revealAroundHero(state, content);
  return events;
}
