import { STEP_MS } from '../src/core';
import { DRINK_AT_SHARE, fightTheGuardian, type FightResult } from './dodging-bot';
import {
  gameAtTheGuardian,
  type HeroProfile,
  heroAt,
  INTENDED_LEVEL,
  mainRouteHero,
  OPTIONAL_GEAR,
  POTIONS_SPARED,
  SPLITS,
  underLeveledHero,
} from './profile-heroes';

// The Guardian's fight as a table, for docs/balance.md: each hero that the fight is measured with, played the ways that
// a player plays it (dodging-bot.ts). tests/guardian-balance.test.ts pins the relations; the numbers that come out of
// them are not pinned, and this is how they are printed again after a tuning (run that file with --silent=false).

/** A way to play the fight: how long it takes to act on a telegraph, how many go unseen, and the potions in hand. */
export interface Play {
  readonly label: string;
  readonly reactionMs: number;
  /** Every this-many-th telegraph goes unseen: 0 is none, 1 is every one. */
  readonly missEvery: number;
  readonly potions: number;
}

export const PLAYS: readonly Play[] = [
  { label: 'answers in 600 ms', reactionMs: 600, missEvery: 0, potions: 0 },
  { label: 'answers in 700 ms', reactionMs: 700, missEvery: 0, potions: 0 },
  { label: 'answers in 750 ms', reactionMs: 750, missEvery: 0, potions: 0 },
  { label: 'misses 1 in 3, answers in 250 ms', reactionMs: 250, missEvery: 3, potions: POTIONS_SPARED },
  { label: 'misses 1 in 3, answers in 450 ms', reactionMs: 450, missEvery: 3, potions: POTIONS_SPARED },
  { label: 'never answers', reactionMs: 250, missEvery: 1, potions: POTIONS_SPARED },
];

export interface GuardianHero {
  readonly label: string;
  readonly withPotions: (potions: number) => HeroProfile;
}

export const GUARDIAN_HEROES: readonly GuardianHero[] = [
  ...Object.entries(SPLITS).map(([split, points]) => ({
    label: `Level ${INTENDED_LEVEL}, ${split}`,
    withPotions: (potions: number) => mainRouteHero(points, potions),
  })),
  {
    label: `Level ${INTENDED_LEVEL}, balanced, Katana and Long Bow`,
    withPotions: (potions) => heroAt(INTENDED_LEVEL, SPLITS.balanced, OPTIONAL_GEAR, potions),
  },
  { label: 'Level 3, 1/1/0 points', withPotions: underLeveledHero },
];

export interface GuardianRow {
  readonly hero: string;
  readonly play: string;
  readonly potions: number;
  readonly result: FightResult;
  /** All the damage the Guardian's attacks did to the hero, drunk away or not. */
  readonly damage: number;
}

export function guardianTable(): GuardianRow[] {
  return GUARDIAN_HEROES.flatMap((hero) =>
    PLAYS.map((play) => {
      const result = fightTheGuardian(gameAtTheGuardian(hero.withPotions(play.potions)), {
        reactionMs: play.reactionMs,
        missEvery: play.missEvery,
        drinkAtShare: DRINK_AT_SHARE,
      });
      const damage = result.telegraphs.reduce((sum, telegraph) => sum + telegraph.damage, 0);
      return { hero: hero.label, play: play.label, potions: play.potions, result, damage };
    }),
  );
}

/** The table as Markdown, a line to a fight, so that it can be pasted into docs/balance.md. */
export function renderGuardianTable(rows: readonly GuardianRow[]): string {
  const head = ['Hero', 'Plays', 'Potions', 'Outcome', 'Damage taken', 'Potions drunk', 'Blows', 'Seconds'];
  const lines = [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`];
  for (const { hero, play, potions, result, damage } of rows) {
    const seconds = ((result.steps * STEP_MS) / 1000).toFixed(0);
    const cells = [hero, play, potions, result.outcome, damage, result.potionsDrunk, result.blows, seconds];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}
