import type { Area, Content, Interactable } from './content';
import { monsterTypeOf } from './content';
import { GEAR_SLOTS } from './definitions';
import type { GearSlot, StatId, WeaponSlot } from './definitions';
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

/** What changes about a chest: whether it has been opened. An opened chest stays opened, defeat included. */
export interface ChestState {
  readonly kind: 'chest';
  opened: boolean;
}

/** What changes about an interactable during the game, one member for each kind. */
export type InteractableState = ChestState;

export interface AreaState {
  /** Every monster placed in the Adventure Area, defeated ones included (at 0 Health), so that they stay defeated. */
  monsters: MonsterState[];
  /** The ids of the milestones of this Adventure Area that the hero has reached. They stay reached, defeat included. */
  reachedMilestones: string[];
  /** The state of every interactable placed in the Adventure Area, by id. */
  interactables: Record<string, InteractableState>;
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
  /** The Stat Points the hero has assigned to each stat. The ones it has still to assign are worked out (stats.ts). */
  statPoints: Record<StatId, number>;
  /** The ids of the Gear the hero carries, in the order it found them. There is no limit to how much it can carry. */
  gear: string[];
  /** The id of the carried Gear that is equipped in each slot. A slot that has none is left out. */
  equipped: Partial<Record<GearSlot, string>>;
  /** The weapon in hand, named by its slot: attack uses it, and the pages show its Attack. */
  activeWeapon: WeaponSlot;
}

/** The pages that can be open over the game, one at a time. A new page is one more id here and one more view. */
export const PAGE_IDS = ['stats', 'inventory'] as const;
export type PageId = (typeof PAGE_IDS)[number];

export interface PlayState {
  readonly phase: 'playing';
  /** The Adventure Area the hero is in. */
  areaId: string;
  hero: HeroState;
  /** The page that is open over the game, if any. While one is open the game is paused (see pages.ts). */
  page: PageId | null;
  /** World state is kept per Adventure Area, by area id. */
  areas: Record<string, AreaState>;
}

export interface TitleState {
  readonly phase: 'title';
}

export type GameState = TitleState | PlayState;

/** The state of a game that has just begun: the hero at the start with its starting Gear, every monster unhurt. */
export function newPlayState(content: Content): PlayState {
  const areas: Record<string, AreaState> = {};
  for (const area of Object.values(content.areas)) {
    areas[area.id] = {
      monsters: freshMonsters(area, content),
      reachedMilestones: [],
      interactables: freshInteractables(area),
    };
  }
  const state: PlayState = {
    phase: 'playing',
    areaId: content.start.areaId,
    hero: {
      position: centerOf(content.start.tile),
      facing: 'down',
      health: 0,
      attackCooldown: 0,
      experience: 0,
      statPoints: { health: 0, attack: 0, defense: 0 },
      gear: GEAR_SLOTS.flatMap((slot) => content.hero.startingGear[slot] ?? []),
      equipped: { ...content.hero.startingGear },
      activeWeapon: 'melee-weapon',
    },
    page: null,
    areas,
  };
  // The most Health there is can only be worked out from the state, which is why it is set once the state exists.
  state.hero.health = heroMaxHealth(state, content);
  return state;
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

/** Every interactable of an Adventure Area as the content places it: nothing opened or used yet. */
export function freshInteractables(area: Area): Record<string, InteractableState> {
  const fresh: Record<string, InteractableState> = {};
  for (const interactable of area.interactables) {
    fresh[interactable.id] = freshInteractable(interactable);
  }
  return fresh;
}

function freshInteractable(interactable: Interactable): InteractableState {
  switch (interactable.kind) {
    case 'chest':
      return { kind: 'chest', opened: false };
  }
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

/** The state of an interactable of the current Adventure Area. It fails loudly for a snapshot the content does not fit. */
export function interactableStateOf(state: PlayState, interactableId: string): InteractableState {
  const found = currentAreaState(state).interactables[interactableId];
  if (found === undefined) {
    throw new Error(`The state has no interactable "${interactableId}" in area "${state.areaId}"`);
  }
  return found;
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
