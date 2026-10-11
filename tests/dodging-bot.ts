import type {
  Box,
  ContentDefinition,
  Direction,
  Game,
  GameEvent,
  HeroView,
  MeleeWeaponDefinition,
  PlayingView,
  Point,
  Tile,
} from '../src/core';
import { STEP_MS } from '../src/core';
import { gameContent } from '../src/content';
import { CLOSE_INVENTORY, OPEN_INVENTORY } from './fixtures';
import { openTilesOf } from './routes';

// A player of the Guardian's fight, as a program: it reads the view and sends the commands that a player's keys send,
// and nothing else, so what it finds out is what a player who plays this way would find out. It strikes the Guardian
// whenever its blow would land, and walks up to it to do it. When it has noticed a telegraph and the hero stands in the
// zone that it shows, it takes the shortest way out, with one key, and stays out until the attack is over. It drinks a
// Healing Potion when its Health is low. It does not shoot: a player who also does gets more out of every rest.
//
// What it is not: it does not choose when to be bold, it never steps in to strike while a telegraph runs, and it knows
// no more of the Guardian than the view shows. Its two settings are what a person is and a program is not: how long it
// takes to act on a telegraph, and how often it misses one altogether.

export interface BotSettings {
  /** How long after a telegraph appears the bot acts on it. */
  readonly reactionMs: number;
  /** Every this-many-th telegraph goes unseen. Zero: none does. The bot goes on striking, and takes what lands. */
  readonly missEvery: number;
  /** It drinks a Healing Potion when its Health is this share of its most, or less. */
  readonly drinkAtShare: number;
}

/** The share of its Health at or under which a player of the fights drinks a Healing Potion, if it has one. */
export const DRINK_AT_SHARE = 0.5;

/** A telegraph of the fight, and what became of the hero under it. */
export interface Telegraph {
  /** The kind of pattern, by how long it wound up. */
  readonly pattern: string;
  /** Whether the bot saw it, and so tried to leave the zone. */
  readonly seen: boolean;
  /** The damage the hero took from it: zero when it stepped aside in time. */
  readonly damage: number;
}

export interface FightResult {
  readonly outcome: 'won' | 'defeated' | 'timed-out';
  readonly steps: number;
  readonly healthLeft: number;
  readonly lowestHealth: number;
  readonly potionsDrunk: number;
  /** The blows that landed on the Guardian. */
  readonly blows: number;
  readonly telegraphs: readonly Telegraph[];
}

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];
const VECTORS: Readonly<Record<Direction, Point>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const EPSILON = 1e-9;
/** How far outside a zone the bot wants to be before it stops. */
const CLEARANCE = 0.02;
/** How far short of its reach the bot lets a blow fall on the Guardian's body, and how far off its middle it strikes. */
const REACH_MARGIN = 0.075;
const ASIDE_MARGIN = 0.3;
/** The longest way out that the bot looks for, in steps: five tiles. */
const LONGEST_WAY_OUT_STEPS = 60;
const LIMIT_SECONDS = 300;

export function boxAround({ x, y }: Point, size: number): Box {
  const half = size / 2;
  return { minX: x - half, minY: y - half, maxX: x + half, maxY: y + half };
}

function expandBox(box: Box, by: number): Box {
  return { minX: box.minX - by, minY: box.minY - by, maxX: box.maxX + by, maxY: box.maxY + by };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.minX < b.maxX - EPSILON && a.maxX > b.minX + EPSILON && a.minY < b.maxY - EPSILON && a.maxY > b.minY + EPSILON;
}

/** The tiles a body covers all lie on open ground. */
function fitsOn(open: (tile: Tile) => boolean, box: Box): boolean {
  for (let row = Math.floor(box.minY + EPSILON); row <= Math.floor(box.maxY - EPSILON); row += 1) {
    for (let col = Math.floor(box.minX + EPSILON); col <= Math.floor(box.maxX - EPSILON); col += 1) {
      if (!open({ col, row })) {
        return false;
      }
    }
  }
  return true;
}

/** The area in front of a hero that its blow covers, as the weapon's reach and width give it. */
export function strikeZone(
  hero: Point,
  size: number,
  direction: Direction,
  { reach, width }: MeleeWeaponDefinition,
): Box {
  const half = size / 2;
  const side = width / 2;
  switch (direction) {
    case 'right':
      return { minX: hero.x + half, minY: hero.y - side, maxX: hero.x + half + reach, maxY: hero.y + side };
    case 'left':
      return { minX: hero.x - half - reach, minY: hero.y - side, maxX: hero.x - half, maxY: hero.y + side };
    case 'down':
      return { minX: hero.x - side, minY: hero.y + half, maxX: hero.x + side, maxY: hero.y + half + reach };
    case 'up':
      return { minX: hero.x - side, minY: hero.y - half - reach, maxX: hero.x + side, maxY: hero.y - half };
  }
}

/**
 * The key to hold to get out of a zone by the shortest straight run, or null when no run of five tiles or less does.
 * The runs go no further than the ground and the Guardian's body let the hero.
 */
function shortestWayOut(
  from: Point,
  size: number,
  zone: Box,
  blockers: readonly Box[],
  open: (tile: Tile) => boolean,
  stepLength: number,
): Direction | null {
  const outside = expandBox(zone, CLEARANCE);
  let best: { direction: Direction; steps: number } | null = null;
  for (const direction of DIRECTIONS) {
    const vector = VECTORS[direction];
    for (let steps = 1; steps <= LONGEST_WAY_OUT_STEPS; steps += 1) {
      const body = boxAround({ x: from.x + vector.x * stepLength * steps, y: from.y + vector.y * stepLength * steps }, size);
      if (!fitsOn(open, body) || blockers.some((blocker) => overlaps(body, blocker))) {
        break;
      }
      if (!overlaps(body, outside)) {
        if (best === null || steps < best.steps) {
          best = { direction, steps };
        }
        break;
      }
    }
  }
  return best?.direction ?? null;
}

interface Running {
  readonly seenAt: number;
  readonly seen: boolean;
  windUpSteps: number;
  damage: number;
  readonly zone: Box;
}

/** The counts of the fight, which the events add to. */
type Tally = { -readonly [K in keyof Omit<FightResult, 'steps' | 'telegraphs'>]: FightResult[K] };

/** What the bot does to get the hero to where its blow lands: the key to hold, or null to stand and strike. */
export function wayToStrike(
  view: PlayingView,
  guardian: { readonly position: Point; readonly size: number },
  { reach, width }: MeleeWeaponDefinition,
): Direction | null {
  const { hero } = view;
  const dx = guardian.position.x - hero.position.x;
  const dy = guardian.position.y - hero.position.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const toward: Direction = horizontal ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  const along = horizontal ? Math.abs(dx) : Math.abs(dy);
  const aside = horizontal ? dy : dx;
  const asideLimit = guardian.size / 2 + width / 2 - ASIDE_MARGIN;
  if (Math.abs(aside) > asideLimit) {
    return horizontal ? (aside > 0 ? 'down' : 'up') : aside > 0 ? 'right' : 'left';
  }
  if (along > guardian.size / 2 + hero.size / 2 + reach - REACH_MARGIN) {
    return toward;
  }
  return hero.facing === toward ? null : toward;
}

/** The keys of a player who holds one direction at a time: the key let go and the key pressed are sent when it changes. */
export function keyHolder(game: Game): (direction: Direction | null) => void {
  let held: Direction | null = null;
  return (direction) => {
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
}

/** Whether a player drinks a Healing Potion now: it has one, and its Health is `share` of its most or less. */
export function wantsAPotion(hero: HeroView, share: number): boolean {
  return hero.health <= Math.ceil(hero.maxHealth * share) && hero.consumables['healing-potion'] > 0;
}

/** A player drinks a Healing Potion by its keys: the inventory is opened, the potion used, the inventory closed. */
export function drinkHealingPotion(game: Game): readonly GameEvent[] {
  game.send(OPEN_INVENTORY);
  const events = game.send({ type: 'use-healing-potion' });
  game.send(CLOSE_INVENTORY);
  return events;
}

/**
 * Plays the Guardian's fight from where the game stands, with the Guardian's arena the hero's to walk, until the hero
 * wins, is defeated or the time is up. The hero should stand in the gateway to the arena, at full Health.
 */
export function fightTheGuardian(
  game: Game,
  settings: BotSettings,
  content: ContentDefinition = gameContent,
): FightResult {
  const castle = content.areas.find(({ id }) => id === 'castle');
  const guardianEntry = Object.entries(content.monsterTypes).find(([, type]) => type.behavior === 'guardian');
  const guardianDefinition = guardianEntry?.[1];
  if (castle === undefined || guardianEntry === undefined || guardianDefinition?.behavior !== 'guardian') {
    throw new Error('The content has no castle or no Guardian');
  }
  const guardianTypeId = guardianEntry[0];
  const { patterns } = guardianDefinition;
  const open = openTilesOf(content, castle);
  const { size: heroSize, speedTilesPerSecond, meleeWeapon } = content.hero;
  const stepLength = (speedTilesPerSecond * STEP_MS) / 1000;
  const reactionSteps = Math.round(settings.reactionMs / STEP_MS);
  const windUps = patterns.map(({ kind, windUpMs }) => ({ kind, steps: Math.round(windUpMs / STEP_MS) }));
  const patternOf = (steps: number): string =>
    windUps.reduce((best, candidate) => (Math.abs(candidate.steps - steps) < Math.abs(best.steps - steps) ? candidate : best))
      .kind;

  const telegraphs: Telegraph[] = [];
  const tally: Tally = { outcome: 'timed-out', healthLeft: 0, lowestHealth: Infinity, potionsDrunk: 0, blows: 0 };
  let running: Running | null = null;
  let shown = 0;
  let wayOut: Direction | null = null;
  let step = 0;

  const hold = keyHolder(game);
  const finish = (): void => {
    if (running !== null) {
      telegraphs.push({ pattern: patternOf(running.windUpSteps), seen: running.seen, damage: running.damage });
      running = null;
    }
  };
  const take = (events: readonly GameEvent[]): void => {
    for (const event of events) {
      if (event.type === 'hero-hit') {
        tally.lowestHealth = Math.min(tally.lowestHealth, event.health);
        tally.healthLeft = event.health;
        if (running !== null) {
          running.damage += event.damage;
        }
      } else if (event.type === 'monster-hit') {
        tally.blows += 1;
      } else if (event.type === 'healing-potion-used') {
        tally.potionsDrunk += 1;
      } else if (event.type === 'guardian-defeated') {
        tally.outcome = 'won';
      } else if (event.type === 'hero-defeated') {
        tally.outcome = 'defeated';
        tally.healthLeft = 0;
        tally.lowestHealth = 0;
      }
    }
  };

  for (; step < LIMIT_SECONDS * 60 && tally.outcome === 'timed-out'; step += 1) {
    const view = game.view();
    if (view.phase !== 'playing') {
      throw new Error('The fight is played in the game');
    }
    const guardian = view.monsters.find(({ type }) => type === guardianTypeId);
    if (guardian === undefined) {
      break;
    }
    const { hero } = view;
    tally.healthLeft = hero.health;
    tally.lowestHealth = Math.min(tally.lowestHealth, hero.health);

    const { action } = guardian;
    if (action.type === 'winding-up') {
      if (running === null) {
        shown += 1;
        running = {
          seenAt: step,
          seen: settings.missEvery === 0 || shown % settings.missEvery !== 0,
          windUpSteps: 0,
          damage: 0,
          zone: action.zone,
        };
      }
      running.windUpSteps += 1;
    } else if (action.type !== 'dashing') {
      finish();
    }

    if (wantsAPotion(hero, settings.drinkAtShare)) {
      take(drinkHealingPotion(game));
    }

    const body = boxAround(hero.position, hero.size);
    const guardianBody = boxAround(guardian.position, guardian.size);
    const heeded = running !== null && running.seen && step - running.seenAt >= reactionSteps;
    if (heeded && running !== null) {
      if (overlaps(body, expandBox(running.zone, CLEARANCE))) {
        wayOut ??= shortestWayOut(hero.position, heroSize, running.zone, [guardianBody], open, stepLength);
        hold(wayOut);
      } else {
        wayOut = null;
        hold(null);
      }
    } else {
      wayOut = null;
      hold(wayToStrike(view, guardian, meleeWeapon));
    }

    const blow = strikeZone(hero.position, hero.size, hero.facing, meleeWeapon);
    if (overlaps(blow, guardianBody)) {
      take(game.send({ type: 'attack' }));
    }
    take(game.step());
  }
  finish();
  hold(null);
  const last = game.view();
  if (tally.outcome === 'won' && last.phase === 'playing') {
    tally.healthLeft = last.hero.health;
  }
  return { ...tally, steps: step, telegraphs };
}
