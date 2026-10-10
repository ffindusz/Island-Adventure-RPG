import { describe, expect, it } from 'vitest';
import { DASH_TRAIL_ALPHAS, warnsNow } from '../src/adapter/monster-look';

// What a monster does in motion that its flat shapes (art.ts) and its pictures (monster-sprites.ts) share, as pure rules
// of the adapter's (the drawing of them is looked at in the real game). A direct test of pure functions of the adapter,
// as ADR 0005 allows: it imports from src/adapter, not from the Game core.

describe('the red of a monster that winds up', () => {
  // Worked by hand. A wind-up is cut into seven equal parts, which end at 1/7 = 0.1429, 2/7 = 0.2857, 3/7 = 0.4286,
  // 4/7 = 0.5714, 5/7 = 0.7143 and 6/7 = 0.8571. The red shows in the first part, hides in the second, shows in the
  // third and so on, so that it shows in the seventh, which is the last: the wind-up ends on. The values here are a
  // hundredth either side of each end, and the one before the wind-up is over (the core's progress never reaches 1).
  it.each([
    [0, true],
    [0.14, true],
    [0.15, false],
    [0.28, false],
    [0.29, true],
    [0.42, true],
    [0.43, false],
    [0.57, false],
    [0.58, true],
    [0.71, true],
    [0.72, false],
    [0.85, false],
    [0.86, true],
    [0.999, true],
  ])('shows when the wind-up is %s of the way through: %s', (progress, shows) => {
    expect(warnsNow(progress)).toBe(shows);
  });
});

describe('the faded copies of a monster that dashes', () => {
  it('fade from the nearest to the farthest, each fainter than the one before and than the monster itself', () => {
    expect(DASH_TRAIL_ALPHAS.length).toBeGreaterThan(0);
    DASH_TRAIL_ALPHAS.forEach((alpha, index) => {
      expect(alpha, `copy ${index + 1} shows`).toBeGreaterThan(0);
      expect(alpha, `copy ${index + 1} is fainter than the one before`).toBeLessThan(DASH_TRAIL_ALPHAS[index - 1] ?? 1);
    });
  });
});
