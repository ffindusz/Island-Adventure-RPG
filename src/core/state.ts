import type { Area, Content } from './content';
import { monsterTypeOf } from './content';
import type { Box, Direction, Point } from './geometry';
import { boxAround, centerOf } from './geometry';
import { heroMaxHealth } from './stats';

/** Bumped whenever the shape of a Snapshot changes in a way an older save cannot satisfy. */
export const SNAPSHOT_VERSION = 1;

// The state of a running game, as plain data: numbers, strings, arrays and objects only, so it survives
// JSON.stringify and JSON.parse unchanged. Anything that is not saved belongs elsewhere (see game.ts).

export interface MonsterState {
  readonly id: string;
  readonly type: string;
  position: Point;
  health: number;
  /** What the monster is doing now. Every behavior moves a monster through these same few kinds of action. */
  action: MonsterAction;
}

/** What a monster is doing. Like all state it is plain data, so a wind-up in progress is saved with the game. */
export type MonsterAction =
  /** Standing where it is. */
  | { readonly type: 'idle' }
  /** Has noticed the hero and walks toward it. */
  | { readonly type: 'chasing' }
  /** Telegraphing an attack: it lands on `zone`, which was fixed when the wind-up began, after `length` steps. */
  | { readonly type: 'winding-up'; readonly zone: Box; elapsed: number; readonly length: number }
  /** Resting after an attack, for this many more steps. */
  | { readonly type: 'recovering'; stepsLeft: number };

export interface AreaState {
  /** Every monster placed in the Adventure Area, defeated ones included (at 0 Health), so that they stay defeated. */
  monsters: MonsterState[];
}

export interface HeroState {
  position: Point;
  facing: Direction;
  /** The hero's current Health. It is never above the maximum, and it only goes up when the hero is restored. */
  health: number;
  /** Fixed steps left before the hero can attack again; 0 means ready. */
  attackCooldown: number;
  /** The Experience the hero has earned in all. The Level is worked out from it (see stats.ts). */
  experience: number;
}

export interface PlayState {
  readonly phase: 'playing';
  /** The Adventure Area the hero is in. */
  areaId: string;
  hero: HeroState;
  /** World state is kept per Adventure Area, by area id. */
  areas: Record<string, AreaState>;
}

export interface TitleState {
  readonly phase: 'title';
}

export type GameState = TitleState | PlayState;

/** The state of a game that has just begun: the hero at the start, every monster at full Health. */
export function newPlayState(content: Content): PlayState {
  const areas: Record<string, AreaState> = {};
  for (const area of Object.values(content.areas)) {
    areas[area.id] = { monsters: freshMonsters(area, content) };
  }
  return {
    phase: 'playing',
    areaId: content.start.areaId,
    hero: {
      position: centerOf(content.start.tile),
      facing: 'down',
      health: heroMaxHealth(content),
      attackCooldown: 0,
      experience: 0,
    },
    areas,
  };
}

/** Every monster of an Adventure Area as the content places it: at full Health, on its starting tile, doing nothing. */
export function freshMonsters(area: Area, content: Content): MonsterState[] {
  return area.monsters.map((placement) => ({
    id: placement.id,
    type: placement.type,
    position: centerOf(placement.tile),
    health: monsterTypeOf(content, placement.type).health,
    action: { type: 'idle' },
  }));
}

/**
 * A deep copy. The state is plain data, so a round trip through JSON copies every field there is, and every field
 * that later tickets add, without a copy function that has to be kept in step with the state.
 */
export function copyState(state: PlayState): PlayState {
  return JSON.parse(JSON.stringify(state)) as PlayState;
}

/** The world state of the Adventure Area the hero is in. */
export function currentAreaState(state: PlayState): AreaState {
  const area = state.areas[state.areaId];
  if (area === undefined) {
    throw new Error(`The state has no world for area "${state.areaId}"`);
  }
  return area;
}

/** The monsters of the current Adventure Area that have not been defeated. */
export function livingMonsters(state: PlayState): MonsterState[] {
  return currentAreaState(state).monsters.filter((monster) => monster.health > 0);
}

export function monsterBody(monster: MonsterState, content: Content): Box {
  return boxAround(monster.position, monsterTypeOf(content, monster.type).size);
}

export function heroBody(state: PlayState, content: Content): Box {
  return boxAround(state.hero.position, content.hero.size);
}
