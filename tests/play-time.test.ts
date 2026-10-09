import { beforeAll, describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { STEP_MS } from '../src/core';
import { AREA_IDS, routeOf, wayInOf } from './main-route';
import {
  estimate,
  guardianAttempt,
  type Guesses,
  measureAdventure,
  type Measured,
  offRouteFights,
  routeFights,
  routeSecondsOf,
  wordsIn,
} from './play-time';
import { FIRST_GEAR, gameWithHero, heroAt, QUIET } from './profile-heroes';
import { walkRoute } from './routes';

// A small adventure of round numbers, so that every figure below is worked out by hand and not by the code it checks.
const SMALL: Measured = {
  routeSeconds: 100,
  fightSeconds: 50,
  offRouteFightSeconds: 20,
  nearErrandSeconds: 10,
  farErrandSeconds: 40,
  puzzles: 2,
  levelUps: 5,
  areas: 5,
  nearGear: 2,
  farGear: 2,
  words: 400,
  hardFights: [
    { approachSeconds: 10, fightSeconds: 20 },
    { approachSeconds: 20, fightSeconds: 30 },
  ],
  guardian: { approachSeconds: 4, fightSeconds: 30, vesselSeconds: 6 },
};

const ROUND: Guesses = {
  wandering: 2,
  fightCare: 2,
  sideShare: 0.5,
  puzzleSeconds: 60,
  wordsPerMinute: 200,
  pageSeconds: 10,
  defeatsPerHardFight: 1,
  guardianAttempts: 3,
  setupSeconds: 30,
};

describe('the estimate of the play time', () => {
  const { seconds, total } = estimate(SMALL, ROUND);

  it.each([
    ['setup', 30], // the guess itself
    ['reading', 120], // 400 words at 200 a minute: two minutes
    ['walking', 200], // 100 s of route, doubled for a first visit
    ['fights', 120], // (50 s of plain fights and half of the 20 s off the route), doubled for care
    ['side finds', 30], // the 10 s near the route, and half of the 40 s farther off
    ['puzzles', 60], // half of the 2 puzzles, 60 s each
    ['pages', 130], // 5 level-ups, 5 areas, the 2 near pieces of Gear and half of the 2 far ones: 13 visits of 10 s
    ['defeats', 130], // one defeat in each hard fight: (10 + 2 x 20) and (20 + 2 x 30)
    ['Guardian', 198], // 3 attempts of (4 + 2 x 30), and the 6 s on to the vessel
  ] as const)('%s takes %i seconds', (component, expected) => {
    expect(seconds[component]).toBe(expected);
  });

  it('adds up the parts and leaves nothing out', () => {
    expect(total).toBe(1018);
  });
});

describe('the basis measured from the content', () => {
  let measured: Measured;
  beforeAll(() => {
    measured = measureAdventure();
  }, 60_000);
  const cooldownSeconds = gameContent.hero.attackCooldownMs / 1000;

  it('walks each route in the time that the core takes, to within a tile', () => {
    // A walk ends when the hero crosses into the next area, up to a tile before the centre of the last tile.
    const oneTileSeconds = 1 / gameContent.hero.speedTilesPerSecond;
    for (const id of AREA_IDS) {
      const wayIn = wayInOf(id);
      const hero = heroAt(1, { health: 0, attack: 0, defense: 0 }, FIRST_GEAR, 0);
      const game = gameWithHero(QUIET, hero, {
        areaId: id,
        position: { x: wayIn.col + 0.5, y: wayIn.row + 0.5 },
        facing: 'right',
      });
      let steps = 0;
      walkRoute(game, routeOf(id), () => {
        steps += 1;
        return true;
      });
      expect(Math.abs(routeSecondsOf(id) - (steps * STEP_MS) / 1000), id).toBeLessThanOrEqual(oneTileSeconds);
    }
  });

  it('sums the walk of the five routes', () => {
    expect(measured.routeSeconds).toBeCloseTo(AREA_IDS.reduce((sum, id) => sum + routeSecondsOf(id), 0), 9);
  });

  it('lets a plain fight last at least as long as the blows that win it take', () => {
    const fights = [...routeFights(), ...offRouteFights()];
    expect(fights.length).toBeGreaterThan(0);
    for (const fight of fights) {
      expect(fight.seconds, `${fight.type} in ${fight.area}`).toBeGreaterThanOrEqual(
        (fight.hitsToKill - 1) * cooldownSeconds,
      );
    }
  });

  it('adds up the fights of the route and those off it', () => {
    const seconds = (fights: readonly { readonly seconds: number }[]): number =>
      fights.reduce((sum, fight) => sum + fight.seconds, 0);
    expect(measured.fightSeconds).toBeCloseTo(seconds(routeFights()), 9);
    expect(measured.offRouteFightSeconds).toBeCloseTo(seconds(offRouteFights()), 9);
  });

  it('takes the Guardian as one fight that is won, and lasts as long as its blows take', () => {
    const attempt = guardianAttempt();
    expect(attempt.outcome).toBe('won');
    expect((attempt.steps * STEP_MS) / 1000).toBeGreaterThanOrEqual((attempt.blows - 1) * cooldownSeconds);
    expect(measured.guardian.fightSeconds).toBeCloseTo((attempt.steps * STEP_MS) / 1000, 9);
  });

  it('counts what the content has: the level-ups, the areas, the Gear and the puzzles', () => {
    const interactables = gameContent.areas.flatMap((area) => area.interactables ?? []);
    expect(measured.levelUps).toBe(gameContent.progression.levelThresholds.length);
    expect(measured.areas).toBe(gameContent.areas.length);
    expect(measured.nearGear + measured.farGear).toBe(
      Object.keys(gameContent.gear).length - Object.keys(gameContent.hero.startingGear).length,
    );
    expect(measured.puzzles).toBe(interactables.filter(({ kind }) => kind === 'key' || kind === 'lever').length);
  });

  it('counts the words by their spaces, so that a link is one word', () => {
    expect(wordsIn(['A storm broke the ship.', 'Go on!'])).toBe(7);
    expect(wordsIn(['See https://example.org/a-b now', '  '])).toBe(3);
  });

  it('shows the player some words to read', () => {
    expect(measured.words).toBeGreaterThan(wordsIn(gameContent.opening ?? []) + wordsIn(gameContent.ending ?? []));
  });
});
