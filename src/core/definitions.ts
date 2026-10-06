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
  /** The hero's base Attack: the damage of one strike. */
  readonly attack: number;
  readonly attackCooldownMs: number;
  readonly meleeWeapon: MeleeWeaponDefinition;
}

export interface MonsterTypeDefinition {
  readonly health: number;
  /** Width and height of the monster's body, in tiles. */
  readonly size: number;
}

/** One monster standing in an Adventure Area. */
export interface MonsterPlacement {
  /** Unique across all Adventure Areas: events and saves refer to the monster by it. */
  readonly id: string;
  readonly type: string;
  /** The monster starts at the centre of this tile. */
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
  readonly monsterTypes: Readonly<Record<string, MonsterTypeDefinition>>;
  readonly areas: readonly AreaDefinition[];
  /** Where a new game begins: the hero stands at the centre of this tile. */
  readonly start: { readonly area: string; readonly tile: Tile };
}
