import type { ConsumableId, Game, GearSlot, Snapshot, StatId } from '../src/core';
import { gameContent } from '../src/content';
import { gameAtTitle, newGame } from './fixtures';
import { withoutOrdinaryMonsters } from './routes';

// Heroes of a given make for the tests of the balance pass: what a player has when it reaches a place, put into the
// shipped content the way a save would put it there, so that every number is the core's own and nothing is worked out
// by hand. The shipped content with every ordinary monster taken out is the world of the Guardian's fight.

export const QUIET = { ...gameContent, areas: withoutOrdinaryMonsters(gameContent) };

export type Points = Readonly<Record<StatId, number>>;

/** What a hero is, as far as a fight goes: its Experience, the Stat Points it has spent, its Gear and what it carries. */
export interface HeroProfile {
  readonly experience: number;
  /** The Stat Points spent on each stat: as many as the Level has earned. */
  readonly points: Points;
  /** The Gear in hand in each slot. Every piece named is carried. */
  readonly equipped: Readonly<Partial<Record<GearSlot, string>>>;
  readonly consumables: Readonly<Record<ConsumableId, number>>;
}

/** The Level of the hero that has gone the whole route: the highest there is. */
export const INTENDED_LEVEL = gameContent.progression.levelThresholds.length + 1;

/**
 * The Gear on or beside the route: the Plate Armor lies three tiles off the trail and the Knight Mail two, so the Knight
 * Mail, the best armor, is the armor of a hero who kept to the route, and the Short Bow is on the trail. The hero has
 * no better Melee Weapon than the one it began with: the Steel Sword and the Katana lie on side paths.
 */
export const MAIN_ROUTE_GEAR = { 'melee-weapon': 'basic-sword', armor: 'knight-mail', 'ranged-weapon': 'short-bow' };

/** The same hero with the best of the side paths: the Katana and the Long Bow. The Knight Mail is the best armor there is. */
export const OPTIONAL_GEAR = { 'melee-weapon': 'katana', armor: 'knight-mail', 'ranged-weapon': 'long-bow' };

/** What the hero begins with, which is all that a hero that found nothing has. */
export const FIRST_GEAR = { 'melee-weapon': 'basic-sword', armor: 'basic-armor' };

/**
 * The Healing Potions that the route spares for the Guardian: the route holds eleven or twelve within a few tiles of
 * the trail, and a hero that has met every monster of it has drunk about half.
 */
export const POTIONS_SPARED = 6;

/** Ways to spend five Stat Points, from the one that puts all of them in Attack to the ones that put all in one other stat. */
export const SPLITS = {
  'all in Attack': { health: 0, attack: 5, defense: 0 },
  'mostly Attack': { health: 1, attack: 3, defense: 1 },
  balanced: { health: 2, attack: 2, defense: 1 },
  'all in Health': { health: 5, attack: 0, defense: 0 },
  'all in Defense': { health: 0, attack: 0, defense: 5 },
} as const satisfies Record<string, Points>;

/** The Experience a hero has on reaching this Level, the least it can have. */
export function experienceAt(level: number): number {
  return level <= 1 ? 0 : (gameContent.progression.levelThresholds[level - 2] ?? Infinity);
}

/** A hero of this Level, who has spent the Stat Points that it has earned, and is as the profile says. */
export function heroAt(
  level: number,
  points: Points,
  equipped: HeroProfile['equipped'],
  healingPotions: number,
): HeroProfile {
  const spent = points.health + points.attack + points.defense;
  if (spent !== level - 1) {
    throw new Error(`A hero of Level ${level} has ${level - 1} Stat Points to spend, not ${spent}`);
  }
  return {
    experience: experienceAt(level),
    points,
    equipped,
    consumables: { ammunition: 0, 'healing-potion': healingPotions },
  };
}

/** The Guardian's Checkpoint, in the gateway to the arena: where a hero stands before it goes in to the Guardian. */
const GUARDIAN_CHECKPOINT = 'guardian-checkpoint';

let base: Snapshot | undefined;

/** The most Health a hero with these Stat Points has: the base Health and what the points spent on Health add. */
export function maxHealthOf(points: Points): number {
  return gameContent.hero.health + points.health * gameContent.progression.statPointValue.health;
}

/**
 * A game of the shipped content with the hero as the profile says, at full Health on the Guardian's Checkpoint in the
 * gateway to the arena, facing the arena, and the Guardian waiting where the content puts it.
 */
export function gameAtTheGuardian(profile: HeroProfile): Game {
  const castle = gameContent.areas.find(({ id }) => id === 'castle');
  const checkpoint = castle?.checkpoints?.find(({ id }) => id === GUARDIAN_CHECKPOINT);
  if (checkpoint === undefined) {
    throw new Error('The castle has no Guardian Checkpoint');
  }
  base ??= newGame(QUIET).snapshot();
  const snapshot = structuredClone(base);
  const { hero } = snapshot.state;
  snapshot.state.areaId = 'castle';
  hero.position = { x: checkpoint.tile.col + 0.5, y: checkpoint.tile.row + 0.5 };
  hero.facing = 'right';
  hero.experience = profile.experience;
  hero.statPoints = { ...profile.points };
  const carried = Object.values(profile.equipped).filter((id): id is string => id !== undefined);
  hero.gear = [...new Set([...hero.gear, ...carried])];
  hero.equipped = { ...profile.equipped };
  hero.activeWeapon = 'melee-weapon';
  hero.consumables = { ...profile.consumables };
  hero.health = maxHealthOf(profile.points);
  const game = gameAtTitle(QUIET);
  game.send({ type: 'continue', snapshot });
  return game;
}
