import type { Tile } from './geometry';

// The shapes of the data the game is made from. Everything a designer may want to tune or add lives in
// ContentDefinition; the Game core holds the rules, never the numbers. Durations are in milliseconds and speeds in
// tiles per second so the data reads naturally; loadContent converts them to fixed steps.

/** What the symbol of a layout stands for. */
export interface TerrainDefinition {
  /** Names the terrain for drawing: the adapter chooses its art by this. */
  readonly kind: string;
  /** Solid terrain blocks the hero and monsters. */
  readonly solid: boolean;
}

/** The hero's Melee Weapon: where its strike lands. */
export interface MeleeWeaponDefinition {
  /** How far the strike reaches beyond the hero's body, in tiles. */
  readonly reach: number;
  /** How wide the strike is, centred on the hero, in tiles. */
  readonly width: number;
}

/**
 * The hero's Ranged Weapon: how its arrows fly. A bow only adds to Attack (see GearDefinition), so the arrows fly the
 * same whichever bow the hero has equipped.
 */
export interface RangedWeaponDefinition {
  /** How fast an arrow flies, in tiles per second. Must be more than 0. */
  readonly arrowSpeedTilesPerSecond: number;
  /** How far an arrow flies from the hero's centre before it falls, in tiles. Must be more than 0. */
  readonly range: number;
  /** Width and height of an arrow's body, in tiles. Must be more than 0, and at most the hero's own size. */
  readonly arrowSize: number;
}

/**
 * Where Gear is equipped: the hero carries as many pieces as it finds and has one equipped in each slot. The list is
 * open: a new slot is one more entry here and in GEAR_SLOT_STAT.
 */
export const GEAR_SLOTS = ['melee-weapon', 'ranged-weapon', 'armor'] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

/**
 * The slots that hold a weapon. The hero has one weapon in hand at a time, and a weapon's bonus counts only for the
 * attacks made with it: a bow's for arrows, a sword's for strikes.
 */
export const WEAPON_SLOTS = ['melee-weapon', 'ranged-weapon'] as const satisfies readonly GearSlot[];
export type WeaponSlot = (typeof WEAPON_SLOTS)[number];

/** The stats Gear can raise. It never changes anything else. */
export type GearStat = Extract<StatId, 'attack' | 'defense'>;

/** The stat each slot raises: a weapon only ever adds to Attack, and armor only to Defense. */
export const GEAR_SLOT_STAT: Readonly<Record<GearSlot, GearStat>> = {
  'melee-weapon': 'attack',
  'ranged-weapon': 'attack',
  armor: 'defense',
};

/** A piece of Gear. The content names each piece by an id, and the hero carries each piece at most once. */
export interface GearDefinition {
  /** What the player reads in the inventory. */
  readonly name: string;
  readonly slot: GearSlot;
  /** What the Gear adds to the stat of its slot while it is equipped, 0 or more. */
  readonly bonus: number;
}

export interface HeroDefinition {
  /** Width and height of the hero's body, in tiles. */
  readonly size: number;
  readonly speedTilesPerSecond: number;
  /** The hero's base Health: the most Health the hero can have. */
  readonly health: number;
  /** The hero's base Defense: how much it takes off the damage of every hit the hero receives. */
  readonly defense: number;
  /** The hero's base Attack: the damage of one strike. */
  readonly attack: number;
  readonly attackCooldownMs: number;
  readonly meleeWeapon: MeleeWeaponDefinition;
  readonly rangedWeapon: RangedWeaponDefinition;
  /**
   * How far the hero reaches beyond its body, in tiles, to interact with something in front of it, such as a chest.
   * It is as wide as the hero's body. Must be more than 0.
   */
  readonly interactionReach: number;
  /** The Gear the hero begins the game with, carried and equipped: the id of the piece for each slot, if any. */
  readonly startingGear: Readonly<Partial<Record<GearSlot, string>>>;
}

/**
 * One chance, in a monster type's drop table, that a defeated monster leaves some of a consumable behind. The hero
 * takes what it leaves at once. Each entry is rolled on its own, so a table can leave several things.
 */
export interface DropDefinition {
  readonly consumable: ConsumableId;
  /** From 0 (never) to 1 (always): the chance of this drop. It is left when the roll is below it. */
  readonly chance: number;
  /** How much of the consumable the hero takes when the drop is left: a whole number of 1 or more. */
  readonly amount: number;
}

/** What every kind of monster has, whatever its behavior. */
export interface MonsterTypeBase {
  readonly health: number;
  /** Width and height of the monster's body, in tiles. */
  readonly size: number;
  /** The Experience the hero earns each time it defeats a monster of this type. */
  readonly experience: number;
  /**
   * What the hero may find when it defeats a monster of this type. Every entry is rolled once, in order, each time a
   * monster of the type is defeated. Without a table nothing is left, and no roll is made.
   */
  readonly drops?: readonly DropDefinition[];
}

/** A monster that stays where it was placed and never attacks. */
export interface StationaryMonsterDefinition extends MonsterTypeBase {
  readonly behavior: 'stationary';
}

/**
 * A monster that notices the hero, walks up to it and attacks. The attack is telegraphed: the monster winds up first,
 * and only then does the damage land, on whatever is within its reach of the monster's body at that moment.
 */
export interface ChaserMonsterDefinition extends MonsterTypeBase {
  readonly behavior: 'chaser';
  /** The damage of one hit, before the hero's Defense reduces it. */
  readonly damage: number;
  readonly speedTilesPerSecond: number;
  /** How near the hero must come to the monster's body, in tiles, for the monster to notice it and approach. */
  readonly noticingDistance: number;
  /** How far the attack reaches beyond the monster's body, in every direction, in tiles. */
  readonly reach: number;
  /** How long the monster winds up before the damage lands: the time the player has to avoid the attack. */
  readonly windUpMs: number;
  /** How long the monster rests after its attack before it may wind up again. */
  readonly recoveryMs: number;
}

/**
 * A monster that notices the hero, lines up with it, winds up and then dashes in a straight line. The wind-up
 * telegraphs the lane the dash will follow: the strip, as wide as the monster, from its body to the first solid terrain
 * or chest in that direction, or as far as the dash reaches. The lane is fixed when the wind-up begins. The dash hurts
 * the hero only if the hero is in its way, and stops at whatever is: solid terrain, a chest, another monster, the hero.
 * Afterwards the monster rests, and it can be hit like any other.
 */
export interface ChargerMonsterDefinition extends MonsterTypeBase {
  readonly behavior: 'charger';
  /** The damage of the hit when the dash reaches the hero, before the hero's Defense reduces it. */
  readonly damage: number;
  /** How fast the monster walks to line up with the hero. 0 makes it stand still until the hero is in its line. */
  readonly speedTilesPerSecond: number;
  /** How near the hero must come to the monster's body, in tiles, for the monster to notice it and line up. */
  readonly noticingDistance: number;
  /** How long the monster winds up before it dashes: the time the player has to leave the lane. */
  readonly windUpMs: number;
  /** How fast the monster dashes. */
  readonly dashSpeedTilesPerSecond: number;
  /** The farthest the dash goes, in tiles, if nothing stops it before. */
  readonly dashRange: number;
  /** How long the monster rests after its dash before it may wind up again: the time the hero can hit it freely. */
  readonly recoveryMs: number;
}

/**
 * A monster type. Its `behavior` names the rules the monster follows (see behaviors.ts); the other fields are the
 * numbers that behavior needs. Adding a behavior means adding a member here and an entry in the behavior registry.
 */
export type MonsterTypeDefinition = StationaryMonsterDefinition | ChaserMonsterDefinition | ChargerMonsterDefinition;

/** One monster standing in an Adventure Area. */
export interface MonsterPlacement {
  /** Unique across all Adventure Areas: events and saves refer to the monster by it. */
  readonly id: string;
  readonly type: string;
  /** The monster starts at the centre of this tile, which must not be solid. */
  readonly tile: Tile;
}

/** A block of whole tiles in an Adventure Area, counted from the top-left corner of its map. */
export interface TileRect {
  readonly col: number;
  readonly row: number;
  /** How many tiles wide, at least 1. */
  readonly width: number;
  /** How many tiles high, at least 1. */
  readonly height: number;
}

/** What reaching a milestone gives the hero. Kept apart from the trigger, so later rewards can sit beside Experience. */
export interface MilestoneReward {
  /** The Experience the hero earns, 0 or more. */
  readonly experience: number;
}

/** Ground that rewards the hero the first time its body overlaps it. The reward is given once for the whole game. */
export interface MilestoneDefinition {
  /** Unique across all Adventure Areas: events and saves refer to the milestone by it. */
  readonly id: string;
  /** The tiles that trigger it, which must lie within the map. */
  readonly zone: TileRect;
  readonly reward: MilestoneReward;
}

/**
 * What the hero carries in counts and spends: it has none until it finds some. The list is open: a new consumable is
 * one more id here and one more count in the hero's state.
 */
export const CONSUMABLE_IDS = ['ammunition', 'healing-potion'] as const;
export type ConsumableId = (typeof CONSUMABLE_IDS)[number];

/** The Healing Potion: what the hero gets from using one. */
export interface HealingPotionDefinition {
  /** The Health it restores, never above the hero's maximum Health. Must be more than 0. */
  readonly restores: number;
}

/**
 * What a chest holds: a piece of Gear, or an amount of a consumable (an Ammunition cache is a chest like that). A
 * new kind of contents is one more member here, one more case in loadChestContents, takeContents and the chest view.
 */
export type ChestContents =
  | { readonly kind: 'gear'; readonly gear: string }
  | { readonly kind: 'consumable'; readonly consumable: ConsumableId; readonly amount: number };

/** A chest: the hero opens it once by interacting with it and takes what is inside. It fills one tile and is solid. */
export interface ChestDefinition {
  readonly kind: 'chest';
  /** Unique across all interactables of all Adventure Areas: events and saves refer to the chest by it. */
  readonly id: string;
  /** The tile the chest fills. It must not be solid, nor where the hero or a monster starts. */
  readonly tile: Tile;
  readonly contents: ChestContents;
}

/**
 * Some of a consumable lying on a tile: the hero takes all of it by walking onto it, with no key to press, and it is
 * gone for good. It is not solid: the hero, the monsters and the arrows pass over it.
 */
export interface PickupDefinition {
  readonly kind: 'pickup';
  /** Unique across all interactables of all Adventure Areas: saves refer to the pickup by it. */
  readonly id: string;
  /** The tile it lies on. It must not be solid, nor where the hero or a monster starts. */
  readonly tile: Tile;
  readonly consumable: ConsumableId;
  /** How many the hero takes: a whole number of 1 or more. */
  readonly amount: number;
}

/**
 * Something in an Adventure Area that the hero acts on with Interact, or takes by walking onto it (a pickup). Its
 * `kind` names the rules it follows (see interactables.ts); the other fields are what that kind needs. Adding a kind
 * means adding a member here and the cases the recipe in interactables.ts lists.
 */
export type InteractableDefinition = ChestDefinition | PickupDefinition;

/** Where the hero stands when it comes into an Adventure Area through an exit of another. */
export interface EntranceDefinition {
  /** Unique within its Adventure Area: an exit of another area names the entrance it leads to by this id. */
  readonly id: string;
  /** The hero arrives at the centre of this tile, which must not be solid, nor inside an exit of the same area. */
  readonly tile: Tile;
}

/** Where an exit leads: one entrance of one Adventure Area. */
export interface ExitDestination {
  readonly area: string;
  readonly entrance: string;
}

/** Ground that takes the hero to another Adventure Area as soon as its body overlaps it. */
export interface ExitDefinition {
  /** Unique within its Adventure Area. */
  readonly id: string;
  /** The tiles that trigger it, which must lie within the map. */
  readonly zone: TileRect;
  readonly to: ExitDestination;
}

export interface AreaDefinition {
  readonly id: string;
  readonly name: string;
  /** One string per row of tiles, one terrain symbol per tile. Every row has the same length. */
  readonly layout: readonly string[];
  readonly monsters: readonly MonsterPlacement[];
  /** The milestones of this Adventure Area. Leave it out for none. */
  readonly milestones?: readonly MilestoneDefinition[];
  /** The interactables of this Adventure Area, such as chests and pickups. Leave it out for none. */
  readonly interactables?: readonly InteractableDefinition[];
  /** Where the hero can arrive in this Adventure Area. Every area needs at least one: it is how the hero comes in. */
  readonly entrances?: readonly EntranceDefinition[];
  /** The exits of this Adventure Area. Each leads to an entrance of an area that has an exit back. Leave out for none. */
  readonly exits?: readonly ExitDefinition[];
  /** A short text shown the first time the hero enters this Adventure Area. Leave it out for none. */
  readonly text?: string;
}

/** The stats a Stat Point can be spent on. */
export const STAT_IDS = ['health', 'attack', 'defense'] as const;
export type StatId = (typeof STAT_IDS)[number];

/** How the hero grows, as data a designer can tune. */
export interface ProgressionDefinition {
  /**
   * The total Experience that raises the hero to each Level above 1: the first number is for Level 2, the second for
   * Level 3, and so on. Each is more than the one before. The last is the cap: the hero's highest Level is one more
   * than the number of thresholds, and Experience beyond the last threshold changes nothing.
   */
  readonly levelThresholds: readonly number[];
  /** What each Stat Point adds to the stat it is spent on. Each is more than 0. */
  readonly statPointValue: Readonly<Record<StatId, number>>;
}

export interface ContentDefinition {
  /** The terrain legend: every symbol a layout may use. */
  readonly terrain: Readonly<Record<string, TerrainDefinition>>;
  readonly hero: HeroDefinition;
  /** How the hero's Levels are reached, and what they are worth. */
  readonly progression: ProgressionDefinition;
  /** The least damage a hit does to the hero, however high its Defense. Leave it out for the default of 1. */
  readonly minimumDamage?: number;
  /** What a Healing Potion does when the hero uses it. */
  readonly healingPotion: HealingPotionDefinition;
  /** Every piece of Gear in the game, by id: what the hero starts with, and what is waiting to be found. */
  readonly gear: Readonly<Record<string, GearDefinition>>;
  readonly monsterTypes: Readonly<Record<string, MonsterTypeDefinition>>;
  /** How long the text of an Adventure Area stays on screen, in milliseconds. Leave it out for the default of 4000. */
  readonly areaTextMs?: number;
  readonly areas: readonly AreaDefinition[];
  /** Where a new game begins: the hero stands at the centre of this tile, which must not be solid. */
  readonly start: { readonly area: string; readonly tile: Tile };
}
