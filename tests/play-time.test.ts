import { describe, expect, it } from 'vitest';
import { estimate, type Guesses, type Measured } from './play-time';

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
