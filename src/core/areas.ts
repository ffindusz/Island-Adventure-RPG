import { revealAroundHero } from './automap';
import { areaOf } from './content';
import type { Area, Content, Entrance } from './content';
import { centerOf, overlaps } from './geometry';
import { resetGuardians } from './guardian-reset';
import type { GameEvent } from './interface';
import { currentAreaState, heroBody, livingMonsters } from './state';
import type { PlayState } from './state';

// Moving between Adventure Areas: the hero walks into an exit and arrives at the entrance that exit leads to.

/**
 * Takes the hero through an exit when its body overlaps one, to the entrance the exit leads to. When it overlaps
 * several at once the first one listed takes it. A Guardian that has not fallen is put back as the hero leaves its area
 * (see guardian-reset.ts). Returns what happened: nothing when the hero is not in an exit.
 */
export function crossExits(state: PlayState, content: Content): GameEvent[] {
  const body = heroBody(state, content);
  const exit = areaOf(content, state.areaId).exits.find((candidate) => overlaps(body, candidate.zone));
  if (exit === undefined) {
    return [];
  }
  const destination = areaOf(content, exit.to.areaId);
  calmMonsters(state);
  resetGuardians(state, content);
  // The arrows in the air were shot in the area the hero leaves, and an arrow flies only in its own area.
  state.arrows = [];
  state.areaId = destination.id;
  const entrance = entranceOf(destination, exit.to.entranceId);
  state.hero.position = centerOf(entrance.tile);
  revealAroundHero(state, content);
  return [{ type: 'area-changed', areaId: destination.id }, ...enterArea(state, content)];
}

/**
 * The living monsters of the area the hero is in stop what they are doing. Called as the hero leaves the area: monsters
 * only act in the area the hero is in, so one left mid wind-up would finish it on the hero's return.
 */
export function calmMonsters(state: PlayState): void {
  for (const monster of livingMonsters(state)) {
    monster.action = { type: 'idle' };
  }
}

/**
 * The hero is now in the Adventure Area `state.areaId`, whether it began the game there or walked in. What was shown
 * of the area it left goes, and the first time the hero is in an area its text is shown. Returns what happened.
 */
export function enterArea(state: PlayState, content: Content): GameEvent[] {
  const area = areaOf(content, state.areaId);
  const world = currentAreaState(state);
  state.areaText = null;
  if (world.visited) {
    return [];
  }
  world.visited = true;
  if (area.text === null) {
    return [];
  }
  state.areaText = { text: area.text, stepsLeft: content.areaTextSteps };
  return [{ type: 'area-text', areaId: area.id, text: area.text }];
}

/** One fixed step of the time the text of an Adventure Area stays on the screen. It does not stop the game. */
export function ageAreaText(state: PlayState): void {
  if (state.areaText === null) {
    return;
  }
  state.areaText.stepsLeft -= 1;
  if (state.areaText.stepsLeft <= 0) {
    state.areaText = null;
  }
}

/**
 * The text of an Adventure Area or of a sign goes at once, whatever time it had left. Nothing of that time is kept: a sign
 * read again shows its text for the whole time, and the area that had the text has had its visit all the same.
 */
export function dismissAreaText(state: PlayState): void {
  state.areaText = null;
}

/** Cannot fail for content that loaded: loading checks that every exit leads to an entrance that exists. */
function entranceOf(area: Area, entranceId: string): Entrance {
  const entrance = area.entrances.find((candidate) => candidate.id === entranceId);
  if (entrance === undefined) {
    throw new Error(`Area "${area.id}" has no entrance "${entranceId}"`);
  }
  return entrance;
}
