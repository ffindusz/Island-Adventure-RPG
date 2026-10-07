import type { Area, Content, Interactable } from './content';
import { monsterTypeOf } from './content';
import { GEAR_SLOTS } from './definitions';
import type { ConsumableId, GearSlot, StatId, WeaponSlot } from './definitions';
import type { Box, Direction, Point, Tile } from './geometry';
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

/**
 * What changes about a chest: whether it has been opened. An opened chest stays opened, defeat included, unless it holds
 * a consumable and the hero opened it after the Checkpoint defeat sends it back to (see consumable-rollback.ts).
 */
export interface ChestState {
  readonly kind: 'chest';
  opened: boolean;
}

/**
 * What changes about a pickup: whether the hero has taken it. A pickup that was taken stays taken, unless the hero took
 * it after the Checkpoint defeat sends it back to (see consumable-rollback.ts).
 */
export interface PickupState {
  readonly kind: 'pickup';
  collected: boolean;
}

/** What changes about an interactable during the game, one member for each kind. */
export type InteractableState = ChestState | PickupState;

export interface AreaState {
  /** Every monster placed in the Adventure Area, defeated ones included (at 0 Health), so that they stay defeated. */
  monsters: MonsterState[];
  /** The ids of the milestones of this Adventure Area that the hero has reached. They stay reached, defeat included. */
  reachedMilestones: string[];
  /** Whether the hero has been in this Adventure Area. Its text is shown the first time only. */
  visited: boolean;
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
  /** How many of each consumable the hero has. There is no limit to how much it can carry. */
  consumables: Record<ConsumableId, number>;
}

/** The pages that can be open over the game, one at a time. A new page is one more id here and one more view. */
export const PAGE_IDS = ['stats', 'inventory'] as const;
export type PageId = (typeof PAGE_IDS)[number];

/** An arrow in flight. Like all state it is plain data, so the arrows in the air are saved with the game. */
export interface ArrowState {
  /** The Adventure Area it was shot in: it flies and hits only there. */
  readonly areaId: string;
  /** The centre of its body. */
  position: Point;
  /** The way it flies, fixed when it was shot. */
  readonly direction: Direction;
  /** How far it can still fly before it falls, in tiles. */
  rangeLeft: number;
}

/** The text of an Adventure Area while it is shown, and for how many more fixed steps. */
export interface AreaTextState {
  readonly text: string;
  stepsLeft: number;
}

/**
 * The Checkpoint that defeat sends the hero back to: the last one it touched, or the start of the adventure before it
 * has touched any. It is a place, not a Checkpoint of the content, since the start need not be one. It also records
 * the consumables the hero had when it touched the Checkpoint, which defeat gives back (see consumable-rollback.ts).
 */
export interface CheckpointState {
  readonly areaId: string;
  readonly tile: Tile;
  /** How many of each consumable the hero had then. */
  readonly consumables: Readonly<Record<ConsumableId, number>>;
  /** The ids of the pickups and of the chests of consumables that had been taken then, in all Adventure Areas. */
  readonly collected: readonly string[];
}

export interface PlayState {
  readonly phase: 'playing';
  /** The Adventure Area the hero is in. */
  areaId: string;
  /** Where defeat sends the hero. It does not change until the hero touches a Checkpoint (see checkpoints.ts). */
  checkpoint: CheckpointState;
  /** The text of the Adventure Area that is shown now, if any. It runs down while the game is not paused. */
  areaText: AreaTextState | null;
  hero: HeroState;
  /**
   * The arrows in flight, in the order they were shot. No damage is kept with an arrow: it does the hero's Attack as
   * it is when the arrow hits.
   */
  arrows: ArrowState[];
  /** The page that is open over the game, if any. While one is open the game is paused (see pages.ts). */
  page: PageId | null;
  /** World state is kept per Adventure Area, by area id. */
  areas: Record<string, AreaState>;
}

export interface TitleState {
  readonly phase: 'title';
}

export type GameState = TitleState | PlayState;

/** What the hero has of each consumable when the adventure begins: none. */
const NO_CONSUMABLES: Readonly<Record<ConsumableId, number>> = { ammunition: 0, 'healing-potion': 0 };

/** The state of a game that has just begun: the hero at the start with its starting Gear, every monster unhurt. */
export function newPlayState(content: Content): PlayState {
  const areas: Record<string, AreaState> = {};
  for (const area of Object.values(content.areas)) {
    areas[area.id] = {
      monsters: freshMonsters(area, content),
      reachedMilestones: [],
      visited: false,
      interactables: freshInteractables(area),
    };
  }
  const state: PlayState = {
    phase: 'playing',
    areaId: content.start.areaId,
    checkpoint: {
      areaId: content.start.areaId,
      tile: { ...content.start.tile },
      consumables: { ...NO_CONSUMABLES },
      collected: [],
    },
    areaText: null,
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
      consumables: { ...NO_CONSUMABLES },
    },
    arrows: [],
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

/** Every interactable of an Adventure Area as the content places it: nothing opened, taken or used yet. */
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
    case 'pickup':
      return { kind: 'pickup', collected: false };
  }
}

/**
 * A deep copy. The state is plain data, so a round trip through JSON copies every field there is, and every field
 * that later tickets add, without a copy function that has to be kept in step with the state.
 */
export function copyState(state: PlayState): PlayState {
  return JSON.parse(JSON.stringify(state)) as PlayState;
}

/** The world state of the Adventure Area `areaId`. */
export function areaStateOf(state: PlayState, areaId: string): AreaState {
  const area = state.areas[areaId];
  if (area === undefined) {
    throw new Error(`The state has no world for area "${areaId}"`);
  }
  return area;
}

/** The world state of the Adventure Area the hero is in. */
export function currentAreaState(state: PlayState): AreaState {
  return areaStateOf(state, state.areaId);
}

/**
 * The state of an interactable of the Adventure Area `areaId`, of the kind that interactable is. It fails loudly for a
 * snapshot the content does not fit.
 */
export function interactableStateIn<T extends Interactable>(
  state: PlayState,
  areaId: string,
  interactable: T,
): Extract<InteractableState, { kind: T['kind'] }> {
  const found = areaStateOf(state, areaId).interactables[interactable.id];
  if (found === undefined) {
    throw new Error(`The state has no interactable "${interactable.id}" in area "${areaId}"`);
  }
  if (found.kind !== interactable.kind) {
    throw new Error(
      `The state of interactable "${interactable.id}" is that of a ${found.kind}, not a ${interactable.kind}`,
    );
  }
  // The kinds match, so this is the state that was made for this kind.
  return found as Extract<InteractableState, { kind: T['kind'] }>;
}

/** The state of an interactable of the current Adventure Area, of the kind that interactable is. */
export function interactableStateOf<T extends Interactable>(
  state: PlayState,
  interactable: T,
): Extract<InteractableState, { kind: T['kind'] }> {
  return interactableStateIn(state, state.areaId, interactable);
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
