import { areaOf } from './content';
import type { Area, Content, Entrance } from './content';
import { centerOf, overlaps } from './geometry';
import type { GameEvent } from './interface';
import { heroBody, livingMonsters } from './state';
import type { PlayState } from './state';

// Moving between Adventure Areas: the hero walks into an exit and arrives at the entrance that exit leads to.

/**
 * Takes the hero through an exit when its body overlaps one, to the entrance the exit leads to. When it overlaps several
 * at once the first one listed takes it. Returns what happened: nothing when the hero is not in an exit.
 */
export function crossExits(state: PlayState, content: Content): GameEvent[] {
  const body = heroBody(state, content);
  const exit = areaOf(content, state.areaId).exits.find((candidate) => overlaps(body, candidate.zone));
  if (exit === undefined) {
    return [];
  }
  const destination = areaOf(content, exit.to.areaId);
  // Monsters only act in the area the hero is in, so one left mid wind-up would finish it on the hero's return.
  for (const monster of livingMonsters(state)) {
    monster.action = { type: 'idle' };
  }
  state.areaId = destination.id;
  const entrance = entranceOf(destination, exit.to.entranceId);
  state.arrivedAt = { ...entrance.tile };
  state.hero.position = centerOf(entrance.tile);
  return [{ type: 'area-changed', areaId: destination.id }];
}

/** Cannot fail for content that loaded: loading checks that every exit leads to an entrance that exists. */
function entranceOf(area: Area, entranceId: string): Entrance {
  const entrance = area.entrances.find((candidate) => candidate.id === entranceId);
  if (entrance === undefined) {
    throw new Error(`Area "${area.id}" has no entrance "${entranceId}"`);
  }
  return entrance;
}
