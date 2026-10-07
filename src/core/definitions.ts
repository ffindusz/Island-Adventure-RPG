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
}

/** What every kind of monster has, whatever its behavior. */
export interface MonsterTypeBase {
  readonly health: number;
  /** Width and height of the monster's body, in tiles. */
  readonly size: number;
  /** The Experience the hero earns each time it defeats a monster of this type. */
  readonly experience: number;
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
 * A monster type. Its `behavior` names the rules the monster follows (see behaviors.ts); the other fields are the
 * numbers that behavior needs. Adding a behavior means adding a member here and an entry in the behavior registry.
 */
export type MonsterTypeDefinition = StationaryMonsterDefinition | ChaserMonsterDefinition;

/** One monster standing in an Adventure Area. */
export interface MonsterPlacement {
  /** Unique across all Adventure Areas: events and saves refer to the monster by it. */
  readonly id: string;
  readonly type: string;
  /** The monster starts at the centre of this tile, which must not be solid. */
  readonly tile: Tile;
}

export interface AreaDefinition {
  readonly id: string;
  readonly name: string;
  /** One string per row of tiles, one terrain symbol per tile. Every row has the same length. */
  readonly layout: readonly string[];
  readonly monsters: readonly MonsterPlacement[];
}

export interface ContentDefinition {
  /** The terrain legend: every symbol a layout may use. */
  readonly terrain: Readonly<Record<string, TerrainDefinition>>;
  readonly hero: HeroDefinition;
  /** The least damage a hit does to the hero, however high its Defense. Leave it out for the default of 1. */
  readonly minimumDamage?: number;
  readonly monsterTypes: Readonly<Record<string, MonsterTypeDefinition>>;
  readonly areas: readonly AreaDefinition[];
  /** Where a new game begins: the hero stands at the centre of this tile, which must not be solid. */
  readonly start: { readonly area: string; readonly tile: Tile };
}
