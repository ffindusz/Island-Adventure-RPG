import type {
  ConsumableId,
  ContentDefinition,
  Direction,
  Game,
  GearSlot,
  PlayingView,
  Point,
  Snapshot,
  StatId,
} from '../src/core';
import { gameContent } from '../src/content';
import { gameAtTitle, newGame, playingView } from './fixtures';
import { experienceForLevel, withoutOrdinaryMonsters } from './routes';

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
  return level <= 1 ? 0 : experienceForLevel(gameContent, level);
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

/** A hero of the intended Level, with the best Gear that the route itself gives it. */
export function mainRouteHero(points: Points, potions: number): HeroProfile {
  return heroAt(INTENDED_LEVEL, points, MAIN_ROUTE_GEAR, potions);
}

/** A hero three Levels short of the intended one, with the best Gear that the route gives it. */
export function underLeveledHero(potions: number): HeroProfile {
  return heroAt(3, { health: 1, attack: 1, defense: 0 }, MAIN_ROUTE_GEAR, potions);
}

/** The Guardian's Checkpoint, in the gateway to the arena: where a hero stands before it goes in to the Guardian. */
const GUARDIAN_CHECKPOINT = 'guardian-checkpoint';

/** Where a hero is put: an Adventure Area, the centre of its body and the way it faces. */
export interface Place {
  readonly areaId: string;
  readonly position: Point;
  readonly facing: Direction;
}

const bases = new WeakMap<ContentDefinition, Snapshot>();

/** A copy of the save of a new game of this content, for a test to change as another player's save would differ. */
function savedNewGame(content: ContentDefinition): Snapshot {
  let base = bases.get(content);
  if (base === undefined) {
    base = newGame(content).snapshot();
    bases.set(content, base);
  }
  return structuredClone(base);
}

const NO_POINTS: Points = { health: 0, attack: 0, defense: 0 };

/** What the core says of a hero with this Experience and these Stat Points spent: the view of a game continued from a save of it. */
function viewOfHero(content: ContentDefinition, experience: number, points: Points): PlayingView {
  const snapshot = savedNewGame(content);
  snapshot.state.hero.experience = experience;
  snapshot.state.hero.statPoints = { ...points };
  const game = gameAtTitle(content);
  game.send({ type: 'continue', snapshot });
  return playingView(game);
}

/** The Level of a hero with some Experience, as the core reports it: Level 1 below the first threshold of the content. */
export function levelOf(experience: number, content: ContentDefinition = gameContent): number {
  return viewOfHero(content, experience, NO_POINTS).progress.level;
}

/** The most Health a hero with these Stat Points has, as the core reports it. */
export function maxHealthOf(points: Points, content: ContentDefinition = gameContent): number {
  return viewOfHero(content, 0, points).hero.maxHealth;
}

/**
 * A game of this content with the hero as the profile says, at full Health and in the place: a game continued from a
 * save, which is how a hero of any make is built through the core's own interface. `adjust` changes the save before the
 * game continues from it, for what the core has no command for, such as the Health of a monster.
 */
export function gameWithHero(
  content: ContentDefinition,
  profile: HeroProfile,
  place: Place,
  adjust?: (save: Snapshot) => void,
): Game {
  const snapshot = savedNewGame(content);
  const { hero } = snapshot.state;
  snapshot.state.areaId = place.areaId;
  hero.position = { ...place.position };
  hero.facing = place.facing;
  hero.experience = profile.experience;
  hero.statPoints = { ...profile.points };
  const carried = Object.values(profile.equipped).filter((id): id is string => id !== undefined);
  hero.gear = [...new Set([...hero.gear, ...carried])];
  hero.equipped = { ...profile.equipped };
  hero.activeWeapon = 'melee-weapon';
  hero.consumables = { ...profile.consumables };
  hero.health = maxHealthOf(profile.points, content);
  adjust?.(snapshot);
  const game = gameAtTitle(content);
  game.send({ type: 'continue', snapshot });
  return game;
}

/**
 * The Attack and Defense the core reports for the hero, with the equipped Gear counted in: the inventory page's. The
 * Attack is that of the weapon in hand, so the Ranged Weapon's is read by taking it in hand and putting it away again.
 */
export function statsOf(
  game: Game,
  hand: 'melee-weapon' | 'ranged-weapon' = 'melee-weapon',
): { readonly attack: number; readonly defense: number } {
  if (hand === 'ranged-weapon') {
    game.send({ type: 'switch-weapon' });
  }
  game.send({ type: 'open-page', page: 'inventory' });
  const view = game.view();
  const page = view.phase === 'playing' ? view.page : null;
  const inHand = view.phase === 'playing' ? view.hero.activeWeapon : null;
  game.send({ type: 'close-page', page: 'inventory' });
  if (inHand !== hand) {
    throw new Error(`The hero has no ${hand} to take in hand`);
  }
  if (hand === 'ranged-weapon') {
    game.send({ type: 'switch-weapon' });
  }
  if (page?.id !== 'inventory') {
    throw new Error('The inventory page did not open');
  }
  return { attack: page.attack, defense: page.defense };
}

/**
 * A game of the shipped content, without its ordinary monsters, with the hero as the profile says, at full Health on
 * the Guardian's Checkpoint in the gateway to the arena, facing the arena, and the Guardian waiting where the content
 * puts it.
 */
export function gameAtTheGuardian(profile: HeroProfile): Game {
  const castle = gameContent.areas.find(({ id }) => id === 'castle');
  const checkpoint = castle?.checkpoints?.find(({ id }) => id === GUARDIAN_CHECKPOINT);
  if (checkpoint === undefined) {
    throw new Error('The castle has no Guardian Checkpoint');
  }
  return gameWithHero(QUIET, profile, {
    areaId: 'castle',
    position: { x: checkpoint.tile.col + 0.5, y: checkpoint.tile.row + 0.5 },
    facing: 'right',
  });
}
