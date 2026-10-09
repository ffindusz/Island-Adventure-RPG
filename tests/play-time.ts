// The play time of a first playthrough, for the balance pass: the length of the route and the encounters on it, added
// up with what a person does besides walking and fighting. What the content and the core give is measured or counted
// (`Measured`); what only a playtest can tell is a named guess, with a low, a typical and a high value (`Guesses`).
// Nothing is chosen to land on a target: the estimate is whatever the two come to.

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
      measured.hardFights.reduce((sum, fight) => sum + retry(fight.approachSeconds, fight.fightSeconds), 0),
    Guardian: guesses.guardianAttempts * retry(guardian.approachSeconds, guardian.fightSeconds) + guardian.vesselSeconds,
  };
  return { seconds, total: COMPONENTS.reduce((sum, component) => sum + seconds[component], 0) };
}
