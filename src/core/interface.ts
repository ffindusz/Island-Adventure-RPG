import type { ContentDefinition } from './definitions';
import type { Box, Direction, Point } from './geometry';
import type { PlayState } from './state';

// The Game core's whole public interface, and the only thing tests and the adapter use.
//
//   commands and fixed steps go in       game.send(command), game.step()
//   events come out of those calls       the returned GameEvent[]
//   state is observed                    game.view()
//   state is saved and restored          game.snapshot() and the 'continue' command
//
// Time never arrives from a clock: the caller calls step() once per fixed step (STEP_MS of game time).

/** Returns a number from 0 (inclusive) to 1 (exclusive), like Math.random. */
export type RandomSource = () => number;

export interface GameOptions {
  /** The map, hero and monsters. Checked when the game is created; an invalid definition throws. */
  readonly content: ContentDefinition;
  /** The only source of randomness. No rule uses it yet; monster drops will be the first. */
  readonly random: RandomSource;
}

/** What the player asks for. A command takes effect immediately and returns the events it caused. */
export type Command =
  /** Start a new game from the content's start position. */
  | { readonly type: 'new-game' }
  /** Restore a game from a snapshot taken by game.snapshot(). */
  | { readonly type: 'continue'; readonly snapshot: Snapshot }
  /** A direction key went down: the hero faces that way and walks while it is held. The latest key pressed wins. */
  | { readonly type: 'move'; readonly direction: Direction }
  /** A direction key came up. */
  | { readonly type: 'stop'; readonly direction: Direction }
  /** Strike with the Melee Weapon in the facing direction, unless the attack cooldown is still running. */
  | { readonly type: 'attack' };

/** Something that happened, for the adapter to show or play. Events never carry rules; the state view is the truth. */
export type GameEvent =
  /** The hero swung. `zone` is the area the strike covered. */
  | { readonly type: 'hero-attacked'; readonly direction: Direction; readonly zone: Box }
  /** A monster took damage; `health` is what it has left. */
  | { readonly type: 'monster-hit'; readonly monsterId: string; readonly damage: number; readonly health: number }
  /** A monster's Health reached zero. It is gone from the view. */
  | { readonly type: 'monster-defeated'; readonly monsterId: string }
  /** A monster struck. `zone` is the area its attack covered, whether or not the hero was in it. */
  | { readonly type: 'monster-attacked'; readonly monsterId: string; readonly zone: Box }
  /** The hero took damage, after Defense; `health` is what the hero has left. */
  | { readonly type: 'hero-hit'; readonly monsterId: string; readonly damage: number; readonly health: number }
  /** The hero earned Experience, by defeating a monster. `amount` is what was added to the hero's total. */
  | { readonly type: 'experience-gained'; readonly amount: number }
  /**
   * The hero's Health reached zero. By the time the caller sees this event the hero is back at full Health where
   * defeat sends it, and the monsters of the Adventure Area are back as they began: the view shows the new state.
   */
  | { readonly type: 'hero-defeated' };

export interface HeroView {
  readonly position: Point;
  /** Width and height of the hero's body, in tiles. */
  readonly size: number;
  readonly facing: Direction;
  /** The hero's current Health. */
  readonly health: number;
  /** The hero's maximum Health. */
  readonly maxHealth: number;
}

export interface MonsterView {
  readonly id: string;
  readonly type: string;
  readonly position: Point;
  /** Width and height of the monster's body, in tiles. */
  readonly size: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly action: MonsterActionView;
}

/** What a monster is doing, for the adapter to show. */
export type MonsterActionView =
  /** Standing where it is. */
  | { readonly type: 'idle' }
  /** Has noticed the hero and is walking toward it. */
  | { readonly type: 'chasing' }
  /**
   * The telegraph. The attack lands on `zone` when the wind-up ends: `progress` is the share of the wind-up that has
   * passed, from 0 when it begins up to (but never reaching) 1. `zone` does not change during the wind-up.
   */
  | { readonly type: 'winding-up'; readonly progress: number; readonly zone: Box }
  /** Resting after an attack. */
  | { readonly type: 'recovering' };

export interface AreaView {
  readonly id: string;
  readonly name: string;
  /** Size in tiles. */
  readonly width: number;
  readonly height: number;
  /** The kind of terrain on each tile, indexed [row][col]. Read-only: it is shared between views. */
  readonly terrain: readonly (readonly string[])[];
}

export interface TitleView {
  readonly phase: 'title';
}

/** Everything the player can see while playing. Monsters that are defeated are not listed. */
export interface PlayingView {
  readonly phase: 'playing';
  readonly area: AreaView;
  readonly hero: HeroView;
  readonly monsters: readonly MonsterView[];
}

export type GameView = TitleView | PlayingView;

/**
 * Everything needed to restore a game exactly, as plain data that survives JSON.stringify and JSON.parse.
 * It is not validated when restored: whoever reads one from storage must check it first.
 */
export interface Snapshot {
  readonly version: 1;
  readonly state: PlayState;
}

export interface Game {
  /** Apply a command. Returns the events it caused, in order. */
  send(command: Command): readonly GameEvent[];
  /** Advance the game by one fixed step. Returns the events that happened during it, in order. */
  step(): readonly GameEvent[];
  /** What is on screen now: a fresh copy, so the caller may keep it. */
  view(): GameView;
  /** The state to save: a fresh copy. Throws at the title, where there is nothing to save. */
  snapshot(): Snapshot;
}
