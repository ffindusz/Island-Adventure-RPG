import type { ConsumableId, ContentDefinition, GearSlot, GearStat, StatId, WeaponSlot } from './definitions';
import type { Box, Direction, Point } from './geometry';
import type { PageId, PlayState } from './state';

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
  /**
   * The only source of randomness. The rules use it for one thing: when a monster is defeated, each entry of the drop
   * table of its type is rolled once. Nothing else in the rules is random.
   */
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
  /**
   * Attack with the weapon in hand, unless the attack cooldown is still running: strike with the Melee Weapon in the
   * facing direction, or shoot an arrow that way from the Ranged Weapon, which costs one Ammunition. With the Ranged
   * Weapon in hand and no Ammunition nothing is fired and the cooldown does not start: the hero is told instead.
   */
  | { readonly type: 'attack' }
  /**
   * Interact with what is in front of the hero within its reach, such as opening a chest. When several interactables
   * are in reach, the one nearest the hero is the one. Ignored while the game is paused, like attack.
   */
  | { readonly type: 'interact' }
  /**
   * Open a page over the game, such as the stat page. Ignored at the title and while the game is paused already: a
   * page is open, or a Stat Point waits to be assigned. While the game is paused step() advances nothing and attack
   * does nothing; move and stop still keep track of the keys that are down.
   */
  | { readonly type: 'open-page'; readonly page: PageId }
  /** Close the page, if it is the one that is open. */
  | { readonly type: 'close-page'; readonly page: PageId }
  /**
   * Spend a Stat Point on a stat, for good: there is no taking it back. Ignored when no Stat Point waits to be
   * assigned. Until every Stat Point has been assigned the game is paused.
   */
  | { readonly type: 'assign-stat-point'; readonly stat: StatId }
  /**
   * Equip a piece of Gear the hero carries, in place of the one equipped in its slot, which stays carried. Ignored
   * unless the inventory page is open, and for Gear the hero does not carry or has equipped already. There is no
   * taking Gear off: equipping another piece in its slot is how it is swapped.
   */
  | { readonly type: 'equip'; readonly gearId: string }
  /**
   * Use a Healing Potion: the hero gets back the Health the content says, up to its maximum, and the potion is used
   * up even when less than that fits. Ignored unless the inventory page is open, when the hero has no potion, and at
   * full Health, where it would be wasted: then the hero keeps the potion.
   */
  | { readonly type: 'use-healing-potion' }
  /**
   * Take the other weapon in hand: from the Melee Weapon to the Ranged Weapon, if the hero has one equipped, and from
   * the Ranged Weapon back to the Melee Weapon. It takes no time: the attack cooldown is neither started nor waited
   * for. Ignored at the title and while the game is paused, like attack.
   */
  | { readonly type: 'switch-weapon' };

/** Something that happened, for the adapter to show or play. Events never carry rules; the state view is the truth. */
export type GameEvent =
  /** The hero swung. `zone` is the area the strike covered. */
  | { readonly type: 'hero-attacked'; readonly direction: Direction; readonly zone: Box }
  /** The hero loosed an arrow in this direction, spending one Ammunition. The arrow flies on in the view. */
  | { readonly type: 'hero-shot'; readonly direction: Direction }
  /** The hero tried to shoot with no Ammunition. Nothing was fired, and the attack cooldown did not start. */
  | { readonly type: 'out-of-ammunition' }
  /** A monster took damage, from a strike or an arrow; `health` is what it has left. */
  | { readonly type: 'monster-hit'; readonly monsterId: string; readonly damage: number; readonly health: number }
  /** A monster's Health reached zero. It is gone from the view. */
  | { readonly type: 'monster-defeated'; readonly monsterId: string }
  /** A monster struck, or a charger launched its dash. `zone` is the area its attack covered, whether or not the hero was in it. */
  | { readonly type: 'monster-attacked'; readonly monsterId: string; readonly zone: Box }
  /** A ranged attacker fired. Its projectile flies on in the view, from the monster's centre, in `direction`. */
  | { readonly type: 'monster-fired'; readonly monsterId: string; readonly direction: Direction }
  /** The hero took damage, after Defense, from a strike, a dash or a projectile of this monster; `health` is what the hero has left. */
  | { readonly type: 'hero-hit'; readonly monsterId: string; readonly damage: number; readonly health: number }
  /** The hero earned Experience, by defeating a monster or reaching a milestone. `amount` is what was added to it. */
  | { readonly type: 'experience-gained'; readonly amount: number }
  /** The hero reached this Level. When one gain of Experience raises it several Levels, there is one event for each. */
  | { readonly type: 'level-up'; readonly level: number }
  /** The hero's body first overlapped the zone of this milestone, and the reward follows. It happens once per game. */
  | { readonly type: 'milestone-reached'; readonly milestoneId: string }
  /**
   * The hero walked into an exit and is now in this Adventure Area, standing at the entrance the exit leads to. Also
   * after a defeat that sent the hero to a Checkpoint of another area, where it follows `hero-defeated`.
   */
  | { readonly type: 'area-changed'; readonly areaId: string }
  /** The hero came into this Adventure Area for the first time: its short text is shown for a few seconds. */
  | { readonly type: 'area-text'; readonly areaId: string; readonly text: string }
  /** The hero opened this chest. What was inside follows as a pickup. A chest opens once. */
  | { readonly type: 'chest-opened'; readonly chestId: string }
  /**
   * The hero used Interact on a door that is shut, while it holds no key that fits: nothing happened. `keyName` is the
   * name of the key the door needs, which the player is told so that it knows what to look for.
   */
  | { readonly type: 'door-locked'; readonly doorId: string; readonly keyName: string }
  /** The hero opened this door with the key `keyName`, which the door took. The door stays open for good. */
  | { readonly type: 'door-opened'; readonly doorId: string; readonly keyName: string }
  /**
   * The hero used Interact on a lever. `pulled` is where the lever is now: true when the hero pulled it, false when it put
   * it back. Every door and gate the lever names was moved the other way: one that was shut is open, and one that was
   * open is shut.
   */
  | { readonly type: 'lever-toggled'; readonly leverId: string; readonly pulled: boolean }
  /**
   * The hero read this sign: `text` is the clue, which now shows as the text of an Adventure Area does, in place of any
   * that was showing. The game does not pause. Reading the sign again shows it again.
   */
  | { readonly type: 'sign-read'; readonly signId: string; readonly text: string }
  /** The hero took an item and now has it. */
  | { readonly type: 'pickup'; readonly item: PickedUpItem }
  /** The hero equipped this Gear in its slot, in place of the piece there. */
  | { readonly type: 'gear-equipped'; readonly gearId: string; readonly slot: GearSlot }
  /** The hero used a Healing Potion. `restored` is the Health it got back, after the cap; `health` is what it has. */
  | { readonly type: 'healing-potion-used'; readonly restored: number; readonly health: number }
  /** The hero took this weapon in hand. */
  | { readonly type: 'weapon-switched'; readonly weapon: WeaponSlot }
  /**
   * The hero came onto this Checkpoint. It is the one defeat sends the hero back to now, and the hero's Health is
   * restored to full. Nothing else changes: the Ammunition and the Healing Potions the hero has stay as they are, and
   * they are what defeat gives back later, along with the pickups and the caches taken so far.
   */
  | { readonly type: 'checkpoint-activated'; readonly checkpointId: string }
  /**
   * The hero's Health reached zero. By the time the caller sees this event the hero is back at full Health at the
   * Checkpoint it touched last (the start of the adventure before it touched any), and the monsters of that Adventure
   * Area are back as they began: the view shows the new state. When that Checkpoint is in another area, `area-changed`
   * follows this event. The monsters of other Adventure Areas keep their Health, defeated ones stay defeated, and the
   * ones that were after the hero stop. The Ammunition and the Healing Potions are as many as they were at that
   * Checkpoint, and the pickups and the caches taken since are there again, in every area; the Level, the Experience,
   * the Stat Points, the Gear and the chests of Gear that were opened stay.
   */
  | { readonly type: 'hero-defeated' };

/** What the hero took, as the player is told about it: one member for each kind of item. */
export type PickedUpItem = PickedUpGear | PickedUpConsumable | PickedUpKey;

/** A piece of Gear the hero took. It is carried, not equipped: the player equips it in the inventory. */
export interface PickedUpGear extends GearInfo {
  readonly kind: 'gear';
}

/** Some of a consumable the hero took, such as the Ammunition of a cache or the potions lying on the ground. */
export interface PickedUpConsumable {
  readonly kind: 'consumable';
  readonly id: ConsumableId;
  /** How many were added, 1 or more. */
  readonly amount: number;
}

/** A key the hero took. It is carried until a locked door takes it, and it is no Gear and no consumable. */
export interface PickedUpKey extends KeyInfo {
  readonly kind: 'key';
}

export interface HeroView {
  readonly position: Point;
  /** Width and height of the hero's body, in tiles. */
  readonly size: number;
  readonly facing: Direction;
  /** The hero's current Health. */
  readonly health: number;
  /** The hero's maximum Health. */
  readonly maxHealth: number;
  /** The weapon in hand, named by its slot. */
  readonly activeWeapon: WeaponSlot;
  /** How many of each consumable the hero has. */
  readonly consumables: Readonly<Record<ConsumableId, number>>;
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
  /**
   * Has noticed the hero and is on the move: walking toward it, or, to keep its distance, away from it, or across to
   * line up with it.
   */
  | { readonly type: 'chasing' }
  /**
   * The telegraph. The attack lands on `zone` when the wind-up ends: `progress` is the share of the wind-up that has
   * passed, from 0 when it begins up to (but never reaching) 1. `zone` does not change during the wind-up. A ranged
   * attacker has no zone to show, since it aims when it fires: its `zone` is its own body, which flashes.
   */
  | { readonly type: 'winding-up'; readonly progress: number; readonly zone: Box }
  /** Dashing in `direction`, along the lane that its wind-up showed. */
  | { readonly type: 'dashing'; readonly direction: Direction }
  /** Resting after an attack. */
  | { readonly type: 'recovering' };

/** An arrow or a projectile in flight, for the adapter to draw. */
export interface ArrowView {
  /** The centre of the arrow. */
  readonly position: Point;
  /** The way it flies. */
  readonly direction: Direction;
  /** Width and height of the arrow's body, in tiles. */
  readonly size: number;
  /** Who shot it: the hero's arrows hurt monsters, and the projectiles of monsters hurt the hero. */
  readonly shooter: 'hero' | 'monster';
}

/** A chest, for the adapter to draw. It stays where it is once opened. */
export interface ChestView {
  readonly kind: 'chest';
  readonly id: string;
  /** The centre of the chest. */
  readonly position: Point;
  /** Width and height of the chest's body, in tiles. */
  readonly size: number;
  readonly opened: boolean;
  /**
   * What kind of thing it holds, so that it can be drawn marked: 'gear' for a chest of Gear, or the consumable that a
   * cache holds. It never says which piece or how many, and it is the same once the chest is opened.
   */
  readonly holds: 'gear' | ConsumableId;
}

/** Something placed in the Adventure Area, for the adapter to draw: one member for each kind. */
export type InteractableView = ChestView | PickupView | KeyView | DoorView | GateView | LeverView | SignView;

/** A pickup lying on the ground, for the adapter to draw. One that the hero has taken is not listed any more. */
export interface PickupView {
  readonly kind: 'pickup';
  readonly id: string;
  /** The centre of the tile it lies on. */
  readonly position: Point;
  /** Width and height of the tile it lies on, in tiles. */
  readonly size: number;
  /** What kind of consumable it is, so that it can be drawn as that. It never says how many. */
  readonly consumable: ConsumableId;
}

/** A key lying on the ground, for the adapter to draw. One that the hero has taken is not listed any more. */
export interface KeyView {
  readonly kind: 'key';
  readonly id: string;
  /** The centre of the tile it lies on. */
  readonly position: Point;
  /** Width and height of the tile it lies on, in tiles. */
  readonly size: number;
}

/** A key as the player reads about it. */
export interface KeyInfo {
  readonly id: string;
  /** What the content calls it, such as "Rusty Key". */
  readonly name: string;
}

/** A door, for the adapter to draw. It stays where it is once opened, and the hero walks through it then. */
export interface DoorView {
  readonly kind: 'door';
  readonly id: string;
  /** The centre of the tile it fills. */
  readonly position: Point;
  /** Width and height of the tile it fills, in tiles. */
  readonly size: number;
  readonly open: boolean;
}

/** A gate, for the adapter to draw. It stays where it is once open, and the hero walks through it then. */
export interface GateView {
  readonly kind: 'gate';
  readonly id: string;
  /** The centre of the tile it fills. */
  readonly position: Point;
  /** Width and height of the tile it fills, in tiles. */
  readonly size: number;
  readonly open: boolean;
}

/** A lever, for the adapter to draw. It is solid, whether the hero has pulled it or not. */
export interface LeverView {
  readonly kind: 'lever';
  readonly id: string;
  /** The centre of the tile it fills. */
  readonly position: Point;
  /** Width and height of the tile it fills, in tiles. */
  readonly size: number;
  readonly pulled: boolean;
}

/**
 * A sign, for the adapter to draw. It says nothing of what is written on it: the text comes with the event when the hero
 * reads it, and shows as the text of the area does.
 */
export interface SignView {
  readonly kind: 'sign';
  readonly id: string;
  /** The centre of the tile it fills. */
  readonly position: Point;
  /** Width and height of the tile it fills, in tiles. */
  readonly size: number;
}

export interface AreaView {
  readonly id: string;
  readonly name: string;
  /** Size in tiles. */
  readonly width: number;
  readonly height: number;
  /** The kind of terrain on each tile, indexed [row][col]. Read-only: it is shared between views. */
  readonly terrain: readonly (readonly string[])[];
}

/** An exit of the Adventure Area the hero is in. Its zone is a box in tile units, so that it can be drawn. */
export interface ExitView {
  readonly id: string;
  readonly zone: Box;
}

/** A Checkpoint of the Adventure Area the hero is in, for the adapter to draw. */
export interface CheckpointView {
  readonly id: string;
  /** The centre of the tile it stands on. */
  readonly position: Point;
  /** Width and height of the tile it stands on, in tiles. */
  readonly size: number;
  /** Whether defeat sends the hero back here now: it is the last one the hero touched, or the start of the adventure. */
  readonly active: boolean;
}

export interface TitleView {
  readonly phase: 'title';
}

/** The stat page: what the hero has become. */
export interface StatPageView {
  readonly id: 'stats';
  readonly level: number;
  /** The highest Level the hero can reach. */
  readonly maxLevel: number;
  /** Progress toward the next Level: `earned` of the `needed` Experience since the last. Null at the highest Level. */
  readonly experience: { readonly earned: number; readonly needed: number } | null;
  /** The hero's current Health. */
  readonly health: number;
  readonly maxHealth: number;
  readonly attack: number;
  readonly defense: number;
}

/** A page that is open over the game. One kind for each page id; `id` says which. */
export type PageView = StatPageView | InventoryPageView | AutomapPageView;

/** A piece of Gear as the player reads about it. */
export interface GearInfo {
  readonly id: string;
  readonly name: string;
  readonly slot: GearSlot;
  /** The stat the Gear adds to, which its slot decides: a Melee Weapon adds to Attack, armor to Defense. */
  readonly stat: GearStat;
  readonly bonus: number;
}

/** A piece of Gear the hero carries. */
export interface GearView extends GearInfo {
  /** Whether it is the Gear equipped in its slot. */
  readonly equipped: boolean;
}

/** The inventory page: everything the hero carries, and what the Gear makes of its Attack and Defense. */
export interface InventoryPageView {
  readonly id: 'inventory';
  /** The Gear the hero carries, equipped or not: by slot in the order of the slots, then in the order found. */
  readonly gear: readonly GearView[];
  /** How many of each consumable the hero has. */
  readonly consumables: Readonly<Record<ConsumableId, number>>;
  /** The keys the hero holds, in the order it took them. A door takes the one it opens with. */
  readonly keys: readonly KeyInfo[];
  /** The hero's Attack and Defense, with the equipped Gear counted in. The Attack is that of the weapon in hand. */
  readonly attack: number;
  readonly defense: number;
}

/**
 * The Automap page: the whole route, with as much of each Adventure Area as the hero has explored. It is built only
 * while the page is open.
 */
export interface AutomapPageView {
  readonly id: 'automap';
  /** Every Adventure Area of the content, in the order the content lists them: the order of the route. */
  readonly areas: readonly AutomapAreaView[];
}

/** An Adventure Area on the Automap. */
export interface AutomapAreaView {
  readonly id: string;
  /** What it is called, or null while the hero has not been in it: the route shows the area, but not what it is. */
  readonly name: string | null;
  /** Size in tiles. */
  readonly width: number;
  readonly height: number;
  /** Whether the hero is in this area now. */
  readonly current: boolean;
  /** Whether the hero has been in this area, so that it has explored some of it. */
  readonly discovered: boolean;
  /** The ids of the areas that its exits lead to, each once, in the order of its exits. The route shows them all along. */
  readonly connections: readonly string[];
  /** Where the hero is in this area, in tile units, if it is in this area now. */
  readonly hero: Point | null;
  /** The exits of this area that the hero has found: the ones it has revealed a tile of. */
  readonly exits: readonly ExitView[];
  /** The kind of terrain on each tile the hero has explored, indexed [row][col]; null on a tile it has not. */
  readonly terrain: readonly (readonly (string | null)[])[];
}

/** One place a Stat Point can go. */
export interface StatChoiceView {
  readonly stat: StatId;
  /** What the stat is now: for Health, the maximum Health. */
  readonly value: number;
  /** What the Stat Point adds to it. */
  readonly gain: number;
}

/** The hero has Stat Points to assign, and the game waits until they are all assigned. */
export interface LevelUpView {
  /** The Level this choice is for. Several Levels reached at once ask one choice after another, the lowest first. */
  readonly level: number;
  /** The Stat Points still to assign, this one included. */
  readonly points: number;
  /** Where the point can go, in a fixed order. */
  readonly options: readonly StatChoiceView[];
}

/** How far the hero has come, for the in-play HUD: the same Level and Experience progress the stat page shows. */
export interface ProgressView {
  readonly level: number;
  /** Progress toward the next Level: `earned` of the `needed` Experience since the last. Null at the highest Level. */
  readonly experience: { readonly earned: number; readonly needed: number } | null;
}

/** Everything the player can see while playing. Monsters that are defeated are not listed. */
export interface PlayingView {
  readonly phase: 'playing';
  readonly area: AreaView;
  /** The exits of the Adventure Area the hero is in. */
  readonly exits: readonly ExitView[];
  /** The Checkpoints of the Adventure Area the hero is in, in the order the content places them. */
  readonly checkpoints: readonly CheckpointView[];
  /** The short text of the Adventure Area while it is shown: for a few seconds after the hero first comes in. */
  readonly areaText: string | null;
  readonly hero: HeroView;
  /** The hero's Level and Experience progress, so that they can be shown without opening the stat page. */
  readonly progress: ProgressView;
  readonly monsters: readonly MonsterView[];
  /** The arrows and projectiles in flight in the Adventure Area the hero is in, in the order they were shot. */
  readonly arrows: readonly ArrowView[];
  /** The interactables of the Adventure Area the hero is in: chests, opened ones included, and the pickups left. */
  readonly interactables: readonly InteractableView[];
  /** The page that is open over the game, if any. While one is open the game is paused. */
  readonly page: PageView | null;
  /** The Stat Point the hero has to assign, if any. While one waits the game is paused. */
  readonly levelUp: LevelUpView | null;
}

export type GameView = TitleView | PlayingView;

/**
 * Everything needed to restore a game exactly, as plain data that survives JSON.stringify and JSON.parse.
 * It is not validated when restored: whoever reads one from storage must check it first.
 */
export interface Snapshot {
  readonly version: 2;
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
