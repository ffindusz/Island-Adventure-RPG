import { gameContent } from '../src/content';
import type { ContentDefinition, Direction, Game, GameEvent, MonsterTypeDefinition } from '../src/core';
import { boxAround, overlaps, strikeZone, wayToStrike } from './dodging-bot';
import { arena } from './fixtures';
import { gameWithHero, type HeroProfile, maxHealthOf, statsOf } from './profile-heroes';

// A fight of the hero against one monster of the shipped content, as a player plays it who does not dodge: it walks up
// to the monster and strikes it whenever the blow would land, and takes whatever the monster does. It is the cost of the
// fight at its plainest, what the potions are for; a player who dodges pays less, and one who shoots first pays less
// again. The hero and the monster are the shipped ones, put in an empty room: nothing else is there to help or hinder.

const DUELIST = 'duelist';
const HERO_TILE = { col: 3, row: 4 };
/** How many tiles of ground lie behind the monster, so that one that keeps its distance backs into a wall soon. */
const GROUND_BEHIND = 2;
const LIMIT_SECONDS = 60;

export interface DuelResult {
  readonly outcome: 'won' | 'defeated' | 'timed-out';
  /** The Health the fight took, after Defense: all of it when the hero was defeated and had no potion to drink. */
  readonly healthLost: number;
  readonly maxHealth: number;
  /** The Attack and Defense the hero has, as the core reports them. */
  readonly attack: number;
  readonly defense: number;
  /** The Healing Potions the hero drank: it drinks one when it is at half its Health or less. */
  readonly potionsUsed: number;
  /** The hits of the monster that landed on the hero, as the core reports them. */
  readonly hits: number;
  /** The blows of the hero that hit the monster, as the core reports them: all that the fight took when the hero won. */
  readonly blows: number;
  readonly steps: number;
}

/** The share of its Health at or under which the hero drinks a Healing Potion, if it has one: as the Guardian's bot does. */
const DRINK_AT_SHARE = 0.5;

/** The room of the duel: the hero on the left of the middle row and the monster a number of tiles on, at its wall. */
function roomOf(monsterType: string, apart: number): ContentDefinition {
  const columns = HERO_TILE.col + apart + GROUND_BEHIND + 2;
  const wall = '#'.repeat(columns);
  const floor = `#${'.'.repeat(columns - 2)}#`;
  return arena({
    layout: [wall, floor, floor, floor, floor, floor, floor, floor, wall],
    start: { area: 'arena', tile: HERO_TILE },
    monsters: [{ id: DUELIST, type: monsterType, tile: { col: HERO_TILE.col + apart, row: HERO_TILE.row } }],
    hero: gameContent.hero,
    progression: gameContent.progression,
    gear: gameContent.gear,
    healingPotion: gameContent.healingPotion,
    minimumDamage: gameContent.minimumDamage,
    monsterTypes: gameContent.monsterTypes,
  });
}

/** How far the monster is put from the hero: well inside the distance it notices from, as a hero who walks up is. */
function apartFor(type: MonsterTypeDefinition): number {
  const noticing = 'noticingDistance' in type ? type.noticingDistance : 4;
  return Math.max(2, Math.floor(noticing) - 1);
}

/** The room of a duel with the hero of the profile at its place in it and a monster of the type a few tiles off. */
function startDuel(monsterType: string, profile: HeroProfile): { readonly game: Game; readonly content: ContentDefinition } {
  const type = gameContent.monsterTypes[monsterType];
  if (type === undefined) {
    throw new Error(`The content has no monster type "${monsterType}"`);
  }
  const content = roomOf(monsterType, apartFor(type));
  const game = gameWithHero(content, profile, {
    areaId: 'arena',
    position: { x: HERO_TILE.col + 0.5, y: HERO_TILE.row + 0.5 },
    facing: 'right',
  });
  return { game, content };
}

/**
 * What one hit of the monster takes from the hero of the profile, after Defense: the hero stands where it is put and
 * does nothing, and the damage of the first hit that lands is read from the core's event. A monster has one hit.
 */
export function hitOf(monsterType: string, profile: HeroProfile): number {
  const { game } = startDuel(monsterType, profile);
  for (let step = 0; step < LIMIT_SECONDS * 60; step += 1) {
    for (const event of game.step()) {
      if (event.type === 'hero-hit') {
        return event.damage;
      }
    }
  }
  throw new Error(`A ${monsterType} does not hit a hero who stands and waits, in ${LIMIT_SECONDS} seconds`);
}

/** The hero of the profile against one monster of the shipped content, until one of them falls or a minute is up. */
export function duel(monsterType: string, profile: HeroProfile): DuelResult {
  const { game, content } = startDuel(monsterType, profile);
  const { attack, defense } = statsOf(game);
  const maxHealth = maxHealthOf(profile.points, content);
  const { reach, width } = content.hero.meleeWeapon;

  const tally: { outcome: DuelResult['outcome']; healthLost: number; potionsUsed: number; hits: number; blows: number } = {
    outcome: 'timed-out',
    healthLost: 0,
    potionsUsed: 0,
    hits: 0,
    blows: 0,
  };
  let held: Direction | null = null;
  const hold = (direction: Direction | null): void => {
    if (direction === held) {
      return;
    }
    if (held !== null) {
      game.send({ type: 'stop', direction: held });
    }
    if (direction !== null) {
      game.send({ type: 'move', direction });
    }
    held = direction;
  };
  const take = (events: readonly GameEvent[]): void => {
    for (const event of events) {
      if (event.type === 'hero-hit') {
        tally.healthLost += event.damage;
        tally.hits += 1;
      } else if (event.type === 'monster-hit') {
        tally.blows += 1;
      } else if (event.type === 'monster-defeated') {
        tally.outcome = 'won';
      } else if (event.type === 'hero-defeated') {
        tally.outcome = 'defeated';
        tally.healthLost = Math.max(tally.healthLost, maxHealth);
      }
    }
  };

  let step = 0;
  for (; step < LIMIT_SECONDS * 60 && tally.outcome === 'timed-out'; step += 1) {
    const view = game.view();
    if (view.phase !== 'playing') {
      throw new Error('The duel is played in the game');
    }
    const monster = view.monsters.find(({ id }) => id === DUELIST);
    if (monster === undefined) {
      tally.outcome = 'won';
      break;
    }
    hold(wayToStrike(view, monster, reach, width));
    if (view.hero.health <= Math.ceil(view.hero.maxHealth * DRINK_AT_SHARE) && view.hero.consumables['healing-potion'] > 0) {
      game.send({ type: 'open-page', page: 'inventory' });
      game.send({ type: 'use-healing-potion' });
      game.send({ type: 'close-page', page: 'inventory' });
      tally.potionsUsed += 1;
    }
    const blow = strikeZone(view.hero.position, view.hero.size, view.hero.facing, reach, width);
    if (overlaps(blow, boxAround(monster.position, monster.size))) {
      take(game.send({ type: 'attack' }));
    }
    take(game.step());
  }
  hold(null);
  return { ...tally, maxHealth, attack, defense, steps: step };
}
