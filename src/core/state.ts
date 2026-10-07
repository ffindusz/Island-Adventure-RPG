import type { Content } from './content';
import { monsterTypeOf } from './content';
import type { Box, Direction, Point } from './geometry';
import { boxAround, centerOf } from './geometry';

/** Bumped whenever the shape of a Snapshot changes in a way an older save cannot satisfy. */
export const SNAPSHOT_VERSION = 1;

// The state of a running game, as plain data: numbers, strings, arrays and objects only, so it survives
// JSON.stringify and JSON.parse unchanged. Anything that is not saved belongs elsewhere (see game.ts).

export interface MonsterState {
  readonly id: string;
  readonly type: string;
  position: Point;
  health: number;
}

export interface AreaState {
  /** Every monster placed in the Adventure Area, defeated ones included (at 0 Health), so that they stay defeated. */
  monsters: MonsterState[];
}

export interface HeroState {
  position: Point;
  facing: Direction;
  /** Fixed steps left before the hero can attack again; 0 means ready. */
  attackCooldown: number;
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
    areas[area.id] = {
      monsters: area.monsters.map((placement) => ({
        id: placement.id,
        type: placement.type,
        position: centerOf(placement.tile),
        health: monsterTypeOf(content, placement.type).health,
      })),
    };
  }
  return {
    phase: 'playing',
    areaId: content.start.areaId,
    hero: { position: centerOf(content.start.tile), facing: 'down', attackCooldown: 0 },
    areas,
  };
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
