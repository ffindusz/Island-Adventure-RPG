import { gameContent } from '../src/content';
import { type MonsterPlacement, STEP_MS } from '../src/core';
import { type FightResult, fightTheGuardian } from './dodging-bot';
import { buildAt, fightTable } from './fight-table';
import { AREA_IDS, type AreaId, areaOf, detourTo, MOST_NEARBY, monstersOnRoute, routeOf } from './main-route';
import { gameAtTheGuardian, mainRouteHero, POTIONS_SPARED, SPLITS } from './profile-heroes';
import { distanceBetween, noticingOf } from './routes';

// The play time of a first playthrough, for the balance pass: the length of the route and the encounters on it, added
// up with what a person does besides walking and fighting. What the content and the core give is measured or counted
// (`Measured`); what only a playtest can tell is a named guess, with a low, a typical and a high value (`Guesses`).
// Nothing is chosen to land on a target: the estimate is whatever the two come to.

const sum = (numbers: readonly number[]): number => numbers.reduce((total, number) => total + number, 0);

/** What the content and the core give, in seconds or in counts. */
export interface Measured {
  /** The time to walk the whole route, from the first way in to the Guardian's Checkpoint, never stopping. */
  readonly routeSeconds: number;
  /** What a plain fight takes, added up over every monster the route meets. */
  readonly fightSeconds: number;
  /** The same over the ordinary monsters that stand off the route. */
  readonly offRouteFightSeconds: number;
  /** The walk there and back to what lies near the route (chests, potions, keys and levers), and to what lies farther. */
  readonly nearErrandSeconds: number;
  readonly farErrandSeconds: number;
  /** The keys and levers: a puzzle to work out each. */
  readonly puzzles: number;
  readonly levelUps: number;
  readonly areas: number;
  /** The pieces of Gear within reach of the route, and the ones farther off or behind a door. */
  readonly nearGear: number;
  readonly farGear: number;
  /** Every word the player is shown to read: the opening, the area texts, the signs, the ending and the credits. */
  readonly words: number;
  /** The demanding fights of the route: the walk back from the last Checkpoint, and the plain fight. */
  readonly hardFights: readonly { readonly approachSeconds: number; readonly fightSeconds: number }[];
  /** The Guardian: the walk from its Checkpoint, one won fight, and the walk on to the vessel after it. */
  readonly guardian: {
    readonly approachSeconds: number;
    readonly fightSeconds: number;
    readonly vesselSeconds: number;
  };
}

/** What only a playtest can tell: how a first-time player spends its time. */
export interface Guesses {
  /** How many times the route a first visit walks: the way is marked, but not known. */
  readonly wandering: number;
  /** How many times a plain fight a player takes: it dodges, backs off, shoots and picks up what is dropped. */
  readonly fightCare: number;
  /** The share of the side finds, the puzzles and the monsters off the route that a player goes to. */
  readonly sideShare: number;
  readonly puzzleSeconds: number;
  readonly wordsPerMinute: number;
  /** One look at the inventory, the Stat Points or the Automap. */
  readonly pageSeconds: number;
  readonly defeatsPerHardFight: number;
  readonly guardianAttempts: number;
  /** The title, the controls and a first look round. */
  readonly setupSeconds: number;
}

export const COMPONENTS = [
  'setup',
  'reading',
  'walking',
  'fights',
  'side finds',
  'puzzles',
  'pages',
  'defeats',
  'Guardian',
] as const;
export type Component = (typeof COMPONENTS)[number];

export interface Estimate {
  readonly seconds: Readonly<Record<Component, number>>;
  readonly total: number;
}

/** The play time of an adventure of this make, for a player of this make, part by part. */
export function estimate(measured: Measured, guesses: Guesses): Estimate {
  const { sideShare, fightCare } = guesses;
  const retry = (approachSeconds: number, fightSeconds: number): number => approachSeconds + fightSeconds * fightCare;
  const { guardian } = measured;
  const seconds: Record<Component, number> = {
    setup: guesses.setupSeconds,
    reading: (measured.words / guesses.wordsPerMinute) * 60,
    walking: measured.routeSeconds * guesses.wandering,
    fights: (measured.fightSeconds + sideShare * measured.offRouteFightSeconds) * fightCare,
    'side finds': measured.nearErrandSeconds + sideShare * measured.farErrandSeconds,
    puzzles: sideShare * measured.puzzles * guesses.puzzleSeconds,
    pages:
      (measured.levelUps + measured.areas + measured.nearGear + sideShare * measured.farGear) * guesses.pageSeconds,
    defeats:
      guesses.defeatsPerHardFight *
      sum(measured.hardFights.map((fight) => retry(fight.approachSeconds, fight.fightSeconds))),
    Guardian: guesses.guardianAttempts * retry(guardian.approachSeconds, guardian.fightSeconds) + guardian.vesselSeconds,
  };
  return { seconds, total: sum(COMPONENTS.map((component) => seconds[component])) };
}

// What the content and the core give. Every figure is read from the shipped content or measured through the core.

const SPEED = gameContent.hero.speedTilesPerSecond;

/** The build of a typical player: its Stat Points split over the three stats, as the fight tables take it. */
const TYPICAL_BUILD = 'split';

const secondsOf = (steps: number): number => (steps * STEP_MS) / 1000;
const walkingSeconds = (tiles: number): number => tiles / SPEED;

/** The time to walk the route of an Adventure Area from its way in to its way on, never stopping. */
export function routeSecondsOf(id: AreaId): number {
  return walkingSeconds(routeOf(id).length - 1);
}

/** A plain fight of the typical build against a monster, from the area where it stands: see tests/duel.ts. */
export interface Fight {
  readonly area: AreaId;
  readonly type: string;
  readonly seconds: number;
  readonly hitsToKill: number;
}

function fightWith(area: AreaId, placement: MonsterPlacement): Fight {
  const build = buildAt(placement.type, area, TYPICAL_BUILD);
  return { area, type: placement.type, seconds: secondsOf(build.fightSteps), hitsToKill: build.hitsToKill };
}

/** The plain fights with the monsters that a hero who walks the route meets, area by area. */
export function routeFights(): Fight[] {
  return AREA_IDS.flatMap((area) => monstersOnRoute(area).map((placement) => fightWith(area, placement)));
}

/** The plain fights with the ordinary monsters that stand off the route, where a player who looks around meets them. */
export function offRouteFights(): Fight[] {
  return AREA_IDS.flatMap((area) => {
    const met = monstersOnRoute(area);
    return areaOf(area)
      .monsters.filter(
        (placement) => !met.includes(placement) && gameContent.monsterTypes[placement.type]?.behavior !== 'guardian',
      )
      .map((placement) => fightWith(area, placement));
  });
}

/** What a player goes off the route for. */
const ERRAND_KINDS: readonly string[] = ['chest', 'pickup', 'key', 'lever'];

/** What lies off the route in an area: the walk there and back, with every door open, for the near and the far. */
export function errandsOf(area: AreaId): {
  readonly nearSeconds: number;
  readonly farSeconds: number;
  readonly puzzles: number;
  readonly nearGear: number;
  readonly farGear: number;
} {
  const found = { nearSeconds: 0, farSeconds: 0, puzzles: 0, nearGear: 0, farGear: 0 };
  for (const interactable of areaOf(area).interactables ?? []) {
    if (!ERRAND_KINDS.includes(interactable.kind)) {
      continue;
    }
    const shut = detourTo(area, interactable.tile);
    const open = detourTo(area, interactable.tile, true);
    if (open === undefined) {
      throw new Error(`${interactable.id} in ${area} cannot be reached even with every door open`);
    }
    const isNear = shut !== undefined && shut <= MOST_NEARBY;
    const there = walkingSeconds(2 * open);
    found[isNear ? 'nearSeconds' : 'farSeconds'] += there;
    if (interactable.kind === 'key' || interactable.kind === 'lever') {
      found.puzzles += 1;
    }
    if (interactable.kind === 'chest' && interactable.contents.kind === 'gear') {
      found[isNear ? 'nearGear' : 'farGear'] += 1;
    }
  }
  return found;
}

/** How many words there are in lines of text, counted by their spaces: a link is one word. */
export function wordsIn(lines: readonly string[]): number {
  return sum(lines.map((line) => line.split(/\s+/).filter((word) => word !== '').length));
}

/** Every word that the game shows to be read from the title to the credits. */
function wordsShown(): number {
  const areaTexts = gameContent.areas.flatMap((area) => (area.text === undefined ? [] : [area.text]));
  const signs = gameContent.areas.flatMap((area) =>
    (area.interactables ?? []).flatMap((interactable) => (interactable.kind === 'sign' ? [interactable.text] : [])),
  );
  return wordsIn([
    ...(gameContent.opening ?? []),
    ...areaTexts,
    ...signs,
    ...(gameContent.ending ?? []),
    ...(gameContent.credits ?? []),
  ]);
}

/** The retry of each demanding fight on the route: the walk from the way in of its area to where it notices the hero. */
function hardFights(): Measured['hardFights'] {
  const demanding = new Set(fightTable().flatMap((row) => (row.demanding ? [row.type] : [])));
  return AREA_IDS.flatMap((area) =>
    monstersOnRoute(area)
      .filter((placement) => demanding.has(placement.type))
      .map((placement) => {
        const noticedAt = routeOf(area).findIndex(
          (tile) => distanceBetween(tile, placement.tile) <= noticingOf(gameContent, placement),
        );
        return { approachSeconds: walkingSeconds(noticedAt), fightSeconds: fightWith(area, placement).seconds };
      }),
  );
}

/** How a first-time player plays the Guardian's fight: one telegraph in three goes unseen, the rest are answered late. */
const PLAY_OF_THE_GUARDIAN = { reactionMs: 450, missEvery: 3, drinkAtShare: 0.5 };

let attempt: FightResult | undefined;

/** One fight with the Guardian as that player plays it, for a hero of the main route that has the potions it spares. */
export function guardianAttempt(): FightResult {
  if (attempt === undefined) {
    const hero = mainRouteHero(SPLITS.balanced, POTIONS_SPARED);
    const result = fightTheGuardian(gameAtTheGuardian(hero), PLAY_OF_THE_GUARDIAN);
    if (result.outcome !== 'won') {
      throw new Error(`The attempt at the Guardian is ${result.outcome}: the estimate needs a fight that is won`);
    }
    attempt = result;
  }
  return attempt;
}

function guardianLeg(): Measured['guardian'] {
  const castle = areaOf('castle');
  const guardian = castle.monsters.find(
    (placement) => gameContent.monsterTypes[placement.type]?.behavior === 'guardian',
  );
  const vessel = (castle.interactables ?? []).find((interactable) => interactable.kind === 'vessel');
  const checkpoint = routeOf('castle').at(-1);
  if (guardian === undefined || vessel === undefined || checkpoint === undefined) {
    throw new Error('The castle has no Guardian, no vessel or no end to its route');
  }
  return {
    approachSeconds: walkingSeconds(distanceBetween(checkpoint, guardian.tile)),
    fightSeconds: secondsOf(guardianAttempt().steps),
    vesselSeconds: walkingSeconds(distanceBetween(guardian.tile, vessel.tile)),
  };
}

let measuredAdventure: Measured | undefined;

/** The adventure of the shipped content, measured: the first call plays the fights, and the result is kept. */
export function measureAdventure(): Measured {
  if (measuredAdventure === undefined) {
    const errands = AREA_IDS.map(errandsOf);
    measuredAdventure = {
      routeSeconds: sum(AREA_IDS.map(routeSecondsOf)),
      fightSeconds: sum(routeFights().map((fight) => fight.seconds)),
      offRouteFightSeconds: sum(offRouteFights().map((fight) => fight.seconds)),
      nearErrandSeconds: sum(errands.map((one) => one.nearSeconds)),
      farErrandSeconds: sum(errands.map((one) => one.farSeconds)),
      puzzles: sum(errands.map((one) => one.puzzles)),
      levelUps: gameContent.progression.levelThresholds.length,
      areas: AREA_IDS.length,
      nearGear: sum(errands.map((one) => one.nearGear)),
      farGear: sum(errands.map((one) => one.farGear)),
      words: wordsShown(),
      hardFights: hardFights(),
      guardian: guardianLeg(),
    };
  }
  return measuredAdventure;
}
